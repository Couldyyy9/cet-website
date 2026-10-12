# 仓库内副本（与本地生成数据时使用的脚本一致）。依赖：pip install pypdf pillow rapidocr-onnxruntime onnxruntime
# 路径按脚本所在目录推导：OCR 中间产物写 tools/ocr_cache，解析结果写 tools/parsed。
"""从 test.pdf 文字层抽取「写作题目」与「翻译题目」，并与 OCR 解析合并，
生成 决战四六级/public/bank/extra/<key>.json（仅六级 12 套；文件不存在 => 前端不显示该功能）。

用法: python build_paper.py [--only cet6] [--show cet6_2024_12_1]
"""
import argparse
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
TEXT = HERE / "text"
PARSED = HERE / "parsed"
BANK = HERE.parent / "public" / "bank"
OUT = BANK / "extra"

WRITE_H = re.compile(r"^Part\s*I\s+Writing", re.I)
NEXT_H = re.compile(r"^Part\s*(II|III|IV|V|VI)\b", re.I)
TRANS_H = re.compile(r"^Part\s*(IV|V)\s+Translation", re.I)
STOP_H = re.compile(r"^(KEYS|Part\s*V\b|【?答案)", re.I)
CJK = re.compile(r"[\u3400-\u9fff]")


def clean(s):
    s = s.replace("Y ou", "You").replace("y ou", "you")
    s = re.sub(r"\bpar t\b", "part", s)
    s = re.sub(r"\bexperienc es\b", "experiences", s)
    s = re.sub(r"[ \t]+", " ", s)
    return s.strip()


def extract(key):
    f = TEXT / (key + ".txt")
    if not f.exists():
        return None
    raw = f.read_text(encoding="utf-8", errors="replace")
    lines = [ln.rstrip() for ln in raw.splitlines()]

    def block(start_re, stop_re):
        out, on = [], False
        for ln in lines:
            if not on:
                if start_re.match(ln.strip()):
                    on = True
                continue
            if stop_re.match(ln.strip()):
                break
            if ln.strip():
                out.append(ln.strip())
        return out

    wlines = block(WRITE_H, NEXT_H)
    tlines = block(TRANS_H, STOP_H)
    if not wlines and not tlines:
        return None

    wtext = clean(" ".join(wlines))
    wtext = re.sub(r"^Directions:\s*", "", wtext)
    m = re.search(r"begins with the sentence\s*[“\"](.+?)[”\"]", wtext)
    sentence = clean(m.group(1)) if m else ""
    wdir = re.sub(r"\s+", " ", wtext).strip(" ;，,")

    # 翻译：跳过 Directions 到第一个中文段落
    tjoined = clean(" ".join(tlines))
    tjoined = re.sub(r"^Directions:.*?(?=[\u3400-\u9fff])", "", tjoined, flags=re.S)
    tjoined = re.sub(r"\s+", "", tjoined)  # 中文段落：去掉换行产生的空格
    tjoined = tjoined.split("【")[0].strip()

    out = {"writing": {"minutes": 30, "directions": wdir, "sentence": sentence},
           "translation": {"minutes": 30, "text": tjoined}}
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="cet6")
    ap.add_argument("--show", default="")
    args = ap.parse_args()
    manifest = json.loads((BANK / "manifest.json").read_text(encoding="utf-8"))
    keys = [e["level"] + "_" + e["id"] for e in manifest["exams"]]
    if args.only:
        keys = [k for k in keys if k.startswith(args.only)]
    OUT.mkdir(parents=True, exist_ok=True)
    for key in keys:
        data = extract(key)
        if not data:
            print("%-16s 无文字层，跳过" % key)
            continue
        pf = PARSED / (key + ".json")
        explain = {}
        if pf.exists():
            explain = json.loads(pf.read_text(encoding="utf-8"))
        data["level"] = key.split("_")[0]
        data["id"] = key.split("_", 1)[1]
        data["explain"] = explain
        (OUT / (key + ".json")).write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        n_zh = sum(1 for q in explain.values() if q.get("zh"))
        n_ex = sum(1 for q in explain.values() if len(q.get("explain", "")) >= 20)
        print("%-16s 写作 %3d 字 | 翻译 %3d 字 | 解析 %2d 题（有译文 %2d / 有解析 %2d）" % (
            key, len(data["writing"]["directions"]), len(data["translation"]["text"]), len(explain), n_zh, n_ex))
        if args.show == key:
            print("   写作: ", data["writing"]["directions"][:400])
            print("   首句: ", data["writing"]["sentence"][:200])
            print("   翻译: ", data["translation"]["text"][:400])


if __name__ == "__main__":
    main()
