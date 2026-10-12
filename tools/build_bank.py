"""从 test.pdf 抽取的文字生成结构化题库 JSON。

卷面结构（CET4/CET6 通用）:
  Part II  Listening  1-25   (Section A 新闻/对话, B 长对话, C 短文)  四选一
  Part III Reading
      Section A 26-35  选词填空（15 个词的词库 A-O，10 个空）
      Section B 36-45  长篇匹配（段落 A-O，10 条陈述）
      Section C 46-55  仔细阅读（两篇，四选一）
  Part IV  Translation（主观题，不入题库）
答案来自卷尾 KEYS 速查表（纯文本，无需 OCR）。
"""

import argparse
import json
import re
from pathlib import Path

TEXT_DIR = Path(r"C:\Users\15963\Desktop\deepseek h\_cet_dl\text")
OUT_DIR = Path(r"C:\Users\15963\Desktop\deepseek h\_cet_dl\bank")

QSTART = re.compile(r"""(?m)^[ \t]*(\d{1,2})(?:\.(?![0-9])|[ \t]+(?=[A-Z“"']))""")
OPT_MARK = re.compile(r"(?<![A-Za-z0-9])([A-D])\)\s*")
OPT_MARK_WIDE = re.compile(r"(?<![A-Za-z0-9])([A-Z])\)\s*")
BANK_MARK = re.compile(r"(?<![A-Za-z0-9])([A-O])\)\s*")
BANK_MARK_WIDE = re.compile(r"(?<![A-Za-z0-9])([A-Z])\)\s*")
NUM_LINE = re.compile(r"^\s*((?:\d{1,2}\s+)*\d{1,2})\s*$")
LET_LINE = re.compile(r"^\s*((?:[A-Z]\s+)*[A-Z])\s*$")
BLANK = re.compile(r"_{2,}\s*(\d{1,2})\s*_{2,}")
BASED_ON = re.compile(r"Questions?\s+(\d{1,2})\s+(?:and|to)\s+(\d{1,2})\s+are based on[^\n]*")
# 题块末尾常粘上下一个题组的说明（"Questions 3 and 4 are based on ..."），选项里必须剪掉
TRAIL_NOTE = re.compile(r"\s*Questions?\s+\d{1,2}\s+(?:and|to)\s+\d{1,2}\s+(?:are|is)\s+based on.*$", re.S)
SECTION_HEAD = re.compile(r"(?m)^[ \t]*Section\s*([ABC])\b[ \t]*$")
# 有些 PDF 把罗马数字写成 Unicode Ⅱ/Ⅲ，或排版成 "Part ]["；统一成 ASCII 再匹配
ROMAN_MAP = {"Ⅱ": "II", "Ⅲ": "III", "Ⅳ": "IV", "Ⅰ": "I", "][": "II", "[": "I"}


def normalize(text):
    for bad, good in ROMAN_MAP.items():
        text = text.replace(bad, good)
    return text


def clean(text):
    text = text.replace("\f", " ")
    text = text.replace("\u00ad", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\s*\n\s*", " ", text)
    text = re.sub(r"\s{2,}", " ", text)
    return text.strip(" \n\t.·")


def parse_keys(text):
    """卷尾 KEYS 速查表：数字行 + 紧跟的字母行。"""
    idx = text.rfind("KEYS")
    if idx < 0:
        return {}
    lines = [line.rstrip() for line in text[idx:].split("\n")]
    answers = {}
    i = 0
    while i < len(lines) - 1:
        nums = NUM_LINE.match(lines[i])
        lets = LET_LINE.match(lines[i + 1])
        if nums and lets:
            numbers = [int(x) for x in nums.group(1).split()]
            letters = lets.group(1).split()
            if len(numbers) == len(letters) and len(numbers) >= 2:
                for number, letter in zip(numbers, letters):
                    answers[number] = letter
                i += 2
                continue
        i += 1
    return answers


TAIL_CUT = re.compile(r"(?m)^[ \t]*(?:Section\s+[ABC]\b|Directions:|Part\s+(?:I{1,3}|IV)\b)")


def numbered_blocks(region):
    """按 "12. " 切出题块，返回 [(题号, 起始, 文本)]。

    题块在下一个题号、下一个 Section/Directions/Part 标题处结束——否则最后一题会把
    下一节的 Directions 里 "A), B), C) and D)" 也吞进选项（曾导致第 7、15 题解析失败）。
    """
    cuts = sorted(m.start() for m in TAIL_CUT.finditer(region))
    marks = [m for m in QSTART.finditer(region) if 1 <= int(m.group(1)) <= 55]
    blocks = []
    for i, m in enumerate(marks):
        end = marks[i + 1].start() if i + 1 < len(marks) else len(region)
        for cut in cuts:
            if cut > m.start():
                end = min(end, cut)
                break
        blocks.append((int(m.group(1)), m.start(), region[m.start():end]))
    return blocks


def opt_text(raw):
    """选项文本：清理空白，并剪掉尾部粘上的下一组题说明。"""
    return TRAIL_NOTE.sub("", clean(raw)).strip()


def mcq_from_block(block_text):
    """题块 -> (题干, 选项字典)；选项不完整返回 None。

    少数 PDF 的文字层把选项字母映射错（例如 C 变成 O），所以除了严格 A/B/C/D 之外，
    还在"恰好 4 个标记"时按出现顺序兜底为 A/B/C/D。
    """
    marks = list(OPT_MARK.finditer(block_text))
    if len({m.group(1) for m in marks}) < 4:
        wide = list(OPT_MARK_WIDE.finditer(block_text))
        if len(wide) == 4:
            marks = wide
    if len(marks) < 4:
        return None
    stem = clean(block_text[: marks[0].start()])
    options = {}
    for i, m in enumerate(marks):
        end = marks[i + 1].start() if i + 1 < len(marks) else len(block_text)
        options.setdefault(m.group(1), opt_text(block_text[m.end():end]))
    if sorted(options) != ["A", "B", "C", "D"]:
        if len(marks) == 4:
            options = {}
            for i, m in enumerate(marks):
                end = marks[i + 1].start() if i + 1 < len(marks) else len(block_text)
                options["ABCD"[i]] = opt_text(block_text[m.end():end])
        else:
            return None
    if any(not options[k] for k in options):
        return None
    return stem, options


def region_by_names(text, start_name, end_name):
    """按小节名字切区域（比 'Part II' 稳，罗马数字排版经常被 PDF 弄坏）。"""
    start = re.search(start_name, text, re.I)
    if not start:
        return ""
    rest = text[start.end():]
    end = re.search(end_name, rest, re.I)
    return rest[: end.start()] if end else rest


def section_headers(region):
    """返回 [(字母, 位置)]"""
    heads = []
    for m in SECTION_HEAD.finditer(region):
        heads.append((m.group(1), m.start()))
    return heads


def notes_for(region):
    """'Questions 1 and 2 are based on ...' -> [(1,2,'...')]"""
    return [(int(m.group(1)), int(m.group(2)), clean(m.group(0)))
            for m in BASED_ON.finditer(region)]


def parse_exam(stem_name, text):
    """stem_name 形如 cet4_2025_12_1"""
    level, exam_id = stem_name.split("_", 1)
    warnings = []
    text = normalize(text)
    answers = parse_keys(text)
    if not answers:
        warnings.append("KEYS 未解析到")
    key_cut = text.rfind("KEYS")
    body = text[:key_cut] if key_cut > 0 else text

    part2 = region_by_names(body, r"Listening\s+Comprehension", r"Reading\s+Comprehension")
    part3 = region_by_names(body, r"Reading\s+Comprehension", r"Part\s+IV|Translation")
    if not part2:
        warnings.append("听力部分未定位")
    if not part3:
        warnings.append("阅读部分未定位")

    questions = []
    passages = {}

    # ---------- 听力 ----------
    for number, _, block in numbered_blocks(part2):
        parsed = mcq_from_block(block)
        if not parsed:
            if number <= 25:
                warnings.append("听力第 %d 题选项解析失败" % number)
            continue
        questions.append({
            "no": number, "part": "listening", "kind": "mcq",
            "stem": parsed[0] or "", "options": parsed[1],
            "answer": answers.get(str(number)) or answers.get(number),
        })

    # ---------- 阅读 ----------
    heads = section_headers(part3)
    sec = {}
    for i, (letter, pos) in enumerate(heads):
        end = heads[i + 1][1] if i + 1 < len(heads) else len(part3)
        sec[letter] = part3[pos:end]

    # Section A 选词填空
    if "A" in sec:
        sec_a = sec["A"]
        bank_marks = list(BANK_MARK.finditer(sec_a))
        if len({m.group(1) for m in bank_marks}) < 10:
            bank_marks = list(BANK_MARK_WIDE.finditer(sec_a))
        word_bank = {}
        bank_start = None
        for i, m in enumerate(bank_marks):
            end = bank_marks[i + 1].start() if i + 1 < len(bank_marks) else len(sec_a)
            word = clean(sec_a[m.end():end])
            letter = m.group(1)
            if letter in word_bank:
                continue
            word_bank[letter] = word
            if bank_start is None:
                bank_start = m.start()
        passage_text = sec_a[:bank_start] if bank_start is not None else sec_a
        passage_text = re.sub(r"Directions:.*?once\.", "", passage_text, flags=re.S)
        passage_text = re.sub(r"(?m)^[ \t]*Section\s+A\s*$", "", passage_text)
        blanks = [int(m.group(1)) for m in BLANK.finditer(passage_text)]
        passages["cloze"] = {"kind": "cloze", "text": passage_text.strip(),
                             "wordBank": word_bank, "blanks": blanks}
        for number in blanks:
            letter = answers.get(str(number)) or answers.get(number)
            questions.append({
                "no": number, "part": "reading", "kind": "cloze",
                "stem": "第 %d 空" % number, "options": {},
                "answer": letter, "answerText": word_bank.get(letter, ""),
                "passage": "cloze",
            })
        if not word_bank:
            warnings.append("选词填空词库为空")

    # Section B 长篇匹配
    if "B" in sec:
        sec_b = sec["B"]
        blocks = numbered_blocks(sec_b)
        blocks = [(n, s, t) for n, s, t in blocks if 36 <= n <= 45]
        statements_end = blocks[0][1] if blocks else len(sec_b)
        para_marks = [m for m in re.finditer(r"(?m)^[ \t]*([A-Z])\)\s*", sec_b[:statements_end])]
        paragraphs = {}
        for i, m in enumerate(para_marks):
            end = para_marks[i + 1].start() if i + 1 < len(para_marks) else statements_end
            paragraphs[m.group(1)] = clean(sec_b[m.end():end])
        passages["matching"] = {"kind": "matching", "paragraphs": paragraphs,
                                "letters": sorted(paragraphs)}
        for number, _, block in blocks:
            letter = answers.get(str(number)) or answers.get(number)
            questions.append({
                "no": number, "part": "reading", "kind": "matching",
                "stem": TRAIL_NOTE.sub("", clean(block)).strip(), "options": {}, "answer": letter,
                "passage": "matching",
            })
        if len(paragraphs) < 5:
            warnings.append("匹配段落仅解析到 %d 段" % len(paragraphs))

    # Section C 仔细阅读
    if "C" in sec:
        sec_c = sec["C"]
        split = re.search(r"(?m)^[ \t]*Passage\s+Two\s*$", sec_c)
        p1 = sec_c[: split.start()] if split else sec_c
        p2 = sec_c[split.end():] if split else ""
        for pid, region in (("passage1", p1), ("passage2", p2)):
            blocks = [(n, s, t) for n, s, t in numbered_blocks(region) if 46 <= n <= 55]
            if not blocks:
                continue
            first = blocks[0][1]
            text_only = region[:first]
            text_only = re.sub(r"Directions:.*?centre\.", "", text_only, flags=re.S)
            text_only = re.sub(r"(?m)^[ \t]*(Passage\s+\w+|Section\s+C|Questions?\s+\d+\s+to\s+\d+.*)\s*$", "", text_only)
            body_text = re.sub(r"\n{2,}", "\n\n", text_only).strip()
            passages[pid] = {"kind": "passage", "text": body_text}
            for number, _, block in blocks:
                parsed = mcq_from_block(block)
                if not parsed:
                    warnings.append("阅读第 %d 题选项解析失败" % number)
                    continue
                questions.append({
                    "no": number, "part": "reading", "kind": "mcq",
                    "stem": parsed[0] or "", "options": parsed[1],
                    "answer": answers.get(str(number)) or answers.get(number),
                    "passage": pid,
                })

    # 组卷说明（Questions X to Y are based on ...）
    group_notes = notes_for(part2) + notes_for(part3)
    for q in questions:
        for lo, hi, note in group_notes:
            if lo <= q["no"] <= hi:
                q["groupNote"] = note.replace("Questions", "Questions").strip()
                break

    questions.sort(key=lambda q: q["no"])
    missing = [q["no"] for q in questions if not q.get("answer")]
    if missing:
        warnings.append("缺答案: %s" % missing)
    return {
        "level": level, "id": exam_id,
        "questions": questions,
        "passages": passages,
        "answers": {str(k): v for k, v in sorted(answers.items(), key=lambda kv: int(kv[0]))},
        "warnings": warnings,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=None)
    parser.add_argument("--exam", default=None)
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    files = sorted(TEXT_DIR.glob("*.txt"))
    if args.exam:
        files = [f for f in files if f.stem == args.exam]

    outdir = Path(args.out) if args.out else None
    if outdir:
        outdir.mkdir(parents=True, exist_ok=True)

    total_q = 0
    bad = []
    for path in files:
        text = path.read_text(encoding="utf-8")
        bank = parse_exam(path.stem, text)
        counts = {}
        for q in bank["questions"]:
            counts[q["kind"]] = counts.get(q["kind"], 0) + 1
        total_q += len(bank["questions"])
        if not args.quiet:
            print("%-18s q=%-3d key=%-3d %s %s" % (
                path.stem, len(bank["questions"]), len(bank["answers"]),
                counts or "-", ("!! " + "; ".join(bank["warnings"])) if bank["warnings"] else ""))
        if bank["warnings"]:
            bad.append((path.stem, bank["warnings"]))
        if outdir:
            (outdir / (path.stem + ".json")).write_text(
                json.dumps(bank, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    print("\n合计: %d 套, %d 题, %d 套有告警" % (len(files), total_q, len(bad)))
    for stem, warns in bad[:20]:
        print("  ", stem, warns)


if __name__ == "__main__":
    main()
