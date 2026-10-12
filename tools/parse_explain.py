# 仓库内副本（与本地生成数据时使用的脚本一致）。依赖：pip install pypdf pillow rapidocr-onnxruntime onnxruntime
# 路径按脚本所在目录推导：OCR 中间产物写 tools/ocr_cache，解析结果写 tools/parsed。
"""把 OCR 后的答案详解页解析成「每题：中文翻译(zh) / 选项中文翻译(options) / 解析(explain)」。

输入: _cet_dl/ocr2/<key>/page_XX.json   +   决战四六级/public/bank/<key>.json(取题型)
输出: _cet_dl/parsed/<key>.json  (_cet_dl/parsed/<key>.txt 供人眼抽查)

用法: python parse_explain.py [--only cet4_2024_12_1] [--show cet4_2024_12_1]
"""
import argparse
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
OCR = HERE / "ocr_cache"
OUT = HERE / "parsed"
BANK = HERE.parent / "public" / "bank"

DROP = {"解", "析", "口", "?", "？", "·", "□", "①", "②", "③", "■", "◎", "0", "O", "o", "Q", "|"}
# 答案详解标签：出现后才允许解析题目（避免把写作/翻译部分的编号句当成题目）
ANSWER_LABELS = ("答案详解", "答案解析", "答案与解析")
# 非解析内容：遇到就停止累积当前题的解析
SKIP_LABELS = (
    "听力原文", "参考译文", "篇章导读", "亮点词汇", "写作句型",
    "审题", "参考范文", "范文译文", "老师说", "词汇", "句型",
)
QSTART = re.compile(r"^(\d{1,2})\s*[.．、](?![0-9])\s*(\S.*)$")
OPTMARK = re.compile(r"([A-D])\s*[)）.、]\s*")
ANSWER_ROW = re.compile(r"^答案(解析|详解)\s*[A-O]")
CJK = re.compile(r"[\u3400-\u9fff]")
LATIN = re.compile(r"[A-Za-z]")
FOOTER = re.compile(r"(四级|六级)\s*\d{4}\s*[.．]\s*\d{1,2}|^\d{1,2}(四级|六级)|解析册[·・]")
PASSAGE_LABEL = re.compile(r"^Passage\s*(One|Two|Three|Four)\b", re.I)
# 竖排小标签会粘在正文行首，逐条剥掉
PREFIX = (
    "题干译文", "题干翻译", "参考译文", "答案解析", "答案详解", "定位", "错项分析",
    "干扰项分析", "语法判断", "语义判断", "考点", "参考范文", "审题",
)


def is_label(t):
    s = t.strip()
    if s.startswith("·") and s.endswith("·"):
        return True
    if len(s) <= 12 and any(l in s for l in ANSWER_LABELS + SKIP_LABELS):
        return True
    return False


def strip_prefix(t):
    s = t.strip()
    changed = True
    while changed:
        changed = False
        for p in PREFIX:
            if s.startswith(p) and len(s) > len(p) + 1:
                s = s[len(p):].lstrip("：: 　")
                changed = True
    # 竖排“解析”标签的首字常常粘在解析行首
    if s.startswith("解") and len(s) > 3 and CJK.match(s[1]):
        s = s[1:]
    return s.strip()


def split_options(t):
    """一行里可能并排识别出两个选项（左右分栏），拆成 [(letter, text), ...]。"""
    marks = list(OPTMARK.finditer(t))
    if not marks:
        return []
    out = []
    for i, m in enumerate(marks):
        end = marks[i + 1].start() if i + 1 < len(marks) else len(t)
        txt = t[m.end():end].strip(" 　")
        if txt:
            out.append((m.group(1), txt))
    return out


def split_en_zh(text):
    m = CJK.search(text)
    if not m:
        return text.strip(), ""
    return text[: m.start()].strip(" 　?"), text[m.start():].strip()


def looks_like_stem_zh(t):
    """OCR 有时会漏掉「题号 + 英文题干」，只剩中文题干翻译。
    特征：全中文、以问号结尾、长度适中。"""
    s = t.strip()
    if not (4 <= len(s) <= 80):
        return False
    if LATIN.search(s) or not CJK.search(s):
        return False
    if not s.endswith(("？", "?")):
        return False
    # 解析里常见的「…项？」「…吗？」句式排除
    return not any(k in s for k in ("选项", "正确", "排除", "可知", "答案为", "解析"))


MARK = re.compile(r"\[\s*\d+\s*\]")
MENTION = re.compile(r"(【精析】|【避错】|【定位】|项中|答案为|解析册)")


def real_options(t):
    """取真正的选项行；剔除「D）项中的 recognition 属…」这类解析里提到选项字母的假选项。"""
    if MENTION.search(t):
        return []
    out = []
    for L, txt in split_options(t):
        s = txt.strip()
        if not s or s.startswith(("项", "中的")):
            continue
        out.append((L, s))
    return out


def scrub_explain(exp):
    """清理解析文本：去掉听力原文残留的 [1] 题号标记，丢掉整段纯英文（录音原文）片段。"""
    exp = MARK.sub("", exp)
    kept = []
    for seg in re.split(r"(?<=[。！？.!?])\s+", exp):
        s = seg.strip()
        if not s:
            continue
        letters = sum(1 for c in s if c.isascii() and c.isalpha())
        if len(s) > 40 and letters / max(1, len(s)) > 0.6:
            continue
        kept.append(s)
    return re.sub(r"\s+", " ", " ".join(kept)).strip()


def find_gutter(rows, width):
    """找「中缝」x 坐标：用「有多少行横跨该竖线」来打分，取跨线最少的候选。

    只统计非通栏行（通栏段落/标题对每个候选都横跨，会掩盖真正的中缝）；
    若最少跨线数仍偏多（说明是单栏排版）或两侧行数太少，返回 None。
    """
    narrow = [r for r in rows if r[2] - r[1] < width * 0.72]
    if len(narrow) < 6:
        return None
    tol = width * 0.02
    best, best_cross = None, None
    for g in range(int(width * 0.35), int(width * 0.65) + 1, 4):
        cross = sum(1 for r in narrow if r[1] < g - tol and r[2] > g + tol)
        left = sum(1 for r in narrow if r[2] <= g + tol)
        right = sum(1 for r in narrow if r[1] >= g - tol)
        if left < 5 or right < 5:
            continue
        if best_cross is None or cross < best_cross:
            best, best_cross = g, cross
    if best is None or best_cross > max(2, len(narrow) * 0.06):
        return None
    return best


def order_page(rows, width):
    """把一页的行按阅读顺序排好。rows = [(y,x,x2,text)]。

    答案册常见版式是「通栏段落 + 双栏答案详解」混排（如 cet6 2024.12）：
    先找中缝，再用「是否跨中缝」把整页切成若干「带」；带内左右两侧都有
    足够多的行时按「先左栏后右栏」读，否则按 (y,x) 读。
    """
    gutter = find_gutter(rows, width)
    if gutter is None:
        return sorted(rows, key=lambda r: (r[0], r[1]))

    tol = width * 0.02
    tol_left = width * 0.05

    def spans(r):
        # 从明显偏左的位置起、又越过中缝的行 = 通栏行（段落/小节标题），用作分带边界
        return r[1] < gutter - tol_left and r[2] > gutter

    out, band = [], []

    def spill():
        if not band:
            return
        left = [r for r in band if r[2] <= gutter + tol]
        right = [r for r in band if r[1] >= gutter - tol]
        if len(left) >= 3 and len(right) >= 3:
            band.sort(key=lambda r: (0 if r[2] <= gutter + tol else 1, r[0], r[1]))
        else:
            band.sort(key=lambda r: (r[0], r[1]))
        out.extend(band)
        band.clear()

    for r in sorted(rows, key=lambda r: (r[0], r[1])):
        if spans(r):
            spill()
            out.append(r)
        else:
            band.append(r)
    spill()
    return out


def parse_set(key):
    bank = json.loads((BANK / (key + ".json")).read_text(encoding="utf-8"))
    kinds = {q["no"]: q["kind"] for q in bank["questions"]}
    valid = set(kinds)

    pages = sorted((OCR / key).glob("page_*.json"))
    tokens = []
    for pi, p in enumerate(pages):
        rows = []
        for r in json.loads(p.read_text(encoding="utf-8")):
            t = r["t"].replace("\u00ad", "").strip()
            if not t or t in DROP or FOOTER.search(t) or PASSAGE_LABEL.match(t):
                continue
            if len(t) <= 2 and not CJK.match(t) and not t.isdigit():
                continue
            rows.append((r["y"], r["x"], r["x2"], t))
        if not rows:
            continue
        width = max(r[2] for r in rows)
        for y, x, x2, t in order_page(rows, width):
            tokens.append((pi, y, x, t))
    # 注意：不要按 (页, y, x) 重新排序 —— 那会把 order_page 算出的双栏阅读顺序冲掉，
    # 页内顺序必须保持 order_page 的结果（页与页之间本来就是按文件名升序追加的）。

    questions = {}
    cur, mode, armed = None, "idle", False
    last_no = 0
    stem, explain, opts = [], [], {}

    def flush():
        nonlocal cur, stem, explain, opts
        if cur is None:
            return
        head = strip_prefix(" ".join(stem).strip())
        head = re.sub(r"\s+", " ", head)
        en, zh = split_en_zh(head)
        exp = re.sub(r"\s+", " ", strip_prefix(" ".join(explain).strip()))
        prev = questions.get(cur)
        if prev:
            zh = zh or prev["zh"]
            en = en or prev["en"]
            exp = (prev["explain"] + (" " + exp if exp else "")).strip()
            o = dict(prev["options"])
            o.update(opts)
        else:
            o = dict(opts)
        questions[cur] = {"en": en, "zh": zh, "options": o, "explain": exp, "kind": kinds.get(cur, "")}
        stem, explain, opts = [], [], {}

    for pi, y, x, t in tokens:
        if is_label(t):
            if any(l in t for l in ANSWER_LABELS):
                flush()
                armed = True
                mode = "idle"
                continue
            if any(l in t for l in SKIP_LABELS):
                flush()
                cur = None
                mode = "skip"
                continue
            continue
        if armed and mode != "skip":
            m = QSTART.match(t)
            if m and int(m.group(1)) in valid:
                flush()
                cur = int(m.group(1))
                last_no = cur
                stem, explain, opts = [m.group(2)], [], {}
                mode = "stem"
                continue
            # OCR 漏掉题号+英文题干时，用「下一题」+ 中文题干特征补回
            nxt = last_no + 1
            if mode in ("explain", "idle") and nxt in valid and looks_like_stem_zh(t):
                flush()
                cur = nxt
                last_no = nxt
                stem, explain, opts = [t], [], {}
                mode = "stem"
                continue
            # 更狠的情况：题号、英文题干、中文题干全被 OCR 漏掉，
            # 只在上一题的解析后面（或「答案详解」标题之后）留下「A)…B)…C)…D)…」这份中文选项块。
            if (mode in ("explain", "idle") and nxt in valid and kinds.get(cur) == "mcq"
                    and kinds.get(nxt) == "mcq"):
                found = real_options(t)
                if found and found[0][0] == "A":
                    flush()
                    cur = nxt
                    last_no = nxt
                    stem, explain, opts = [], [], {}
                    for L, txt in found:
                        opts[L] = txt
                    mode = "options"
                    continue
            # 匹配/选词填空：靠「答案解析 X。」这种成对标记断题（题干被 OCR 漏掉时）
            if (mode == "explain" and nxt in valid and kinds.get(cur) in ("matching", "cloze")
                    and kinds.get(nxt) in ("matching", "cloze")
                    and ANSWER_ROW.match(t) and any(ANSWER_ROW.match(s) for s in explain)):
                flush()
                cur = nxt
                last_no = nxt
                stem, explain, opts = [], [t], {}
                mode = "explain"
                continue
        if mode == "skip":
            continue
        if mode in ("stem", "options"):
            found = real_options(t)
            if not found and MENTION.search(t) and split_options(t):
                # 「D）【精析】细节辨认题。…」这类只是解析里提到选项字母，按解析收，不要当选项
                mode = "explain"
                explain.append(t)
                continue
            if found and kinds.get(cur) == "mcq":
                for L, txt in found:
                    opts[L] = txt
                mode = "options"
                continue
            if found and kinds.get(cur) in ("cloze", "matching") and mode == "options":
                for L, txt in found:
                    opts[L] = txt
                continue
            if mode == "stem":
                if kinds.get(cur) in ("cloze", "matching"):
                    # 选词填空/匹配没有选项：首行是词义/题干译文，其余都是解析
                    mode = "explain"
                    explain.append(t)
                else:
                    stem.append(t)
            else:
                mode = "explain"
                explain.append(t)
        elif mode == "explain":
            explain.append(t)
    flush()
    for q in questions.values():
        q["explain"] = scrub_explain(q["explain"])
        if len(q["options"]) < 2:      # 只识别出 1 个选项的，多半是解析误判，宁可不显示
            q["options"] = {}
        if q["zh"] and not CJK.search(q["zh"]):
            q["zh"] = ""
    return questions


def dump_report(keys, show=""):
    print("%-16s %5s %7s %7s %7s %7s" % ("set", "题数", "有zh", "有4选项", "有解析", "缺解析"))
    for key in keys:
        f = OUT / (key + ".json")
        if not f.exists():
            continue
        qs = json.loads(f.read_text(encoding="utf-8"))
        bank = json.loads((BANK / (key + ".json")).read_text(encoding="utf-8"))
        mcq = {q["no"] for q in bank["questions"] if q["kind"] == "mcq"}
        miss = [n for n in sorted(map(int, qs), key=int) if len(qs[str(n)]["explain"]) < 20]
        print(
            "%-16s %5d %7d %7d %7d %7d" % (
                key, len(qs),
                sum(1 for q in qs.values() if q["zh"]),
                sum(1 for q in qs.values() if len(q["options"]) >= 4),
                sum(1 for q in qs.values() if len(q["explain"]) >= 20),
                len(miss),
            )
        )
        if show == key and miss:
            print("   缺解析的题:", miss)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    ap.add_argument("--show", default="")
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((BANK / "manifest.json").read_text(encoding="utf-8"))
    keys = [e["level"] + "_" + e["id"] for e in manifest["exams"]]
    if args.only:
        keys = [k for k in keys if k == args.only or k.startswith(args.only + "_")]
    for key in keys:
        if not (OCR / key).exists():
            continue
        qs = parse_set(key)
        (OUT / (key + ".json")).write_text(json.dumps(qs, ensure_ascii=False, indent=1), encoding="utf-8")
        lines = []
        for n in sorted(qs, key=int):
            q = qs[n]
            lines.append("### %s [%s] %s" % (n, q["kind"], q["zh"] or q["en"][:80]))
            for L in "ABCD":
                if q["options"].get(L):
                    lines.append("   %s) %s" % (L, q["options"][L]))
            lines.append("   解析: " + q["explain"][:500])
        (OUT / (key + ".txt")).write_text("\n".join(lines), encoding="utf-8")
    dump_report(keys, args.show)


if __name__ == "__main__":
    main()
