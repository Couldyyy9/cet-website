# -*- coding: utf-8 -*-
"""把 _cet_dl/text/*.txt 解析成题库 JSON，输出到 cet做题/public/bank/。

用法: python export_bank.py [--site <目录>] [--min-questions 24]
"""
import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from build_bank import parse_exam  # noqa: E402

RAW_RE = re.compile(
    r'\{\s*level:\s*"(cet4|cet6)",\s*id:\s*"([0-9_]+)",\s*hasAudio:\s*(true|false)\s*\}'
)


def read_library(site: Path):
    src = (site / "src" / "lib" / "library.ts").read_text(encoding="utf-8")
    out = []
    for lvl, eid, audio in RAW_RE.findall(src):
        out.append({"level": lvl, "id": eid, "hasAudio": audio == "true"})
    return out


def counts_of(questions):
    c = {"total": len(questions), "listening": 0, "cloze": 0, "matching": 0, "reading": 0}
    for q in questions:
        p = q.get("part")
        if p == "listening":
            c["listening"] += 1
        elif q.get("kind") == "cloze":
            c["cloze"] += 1
        elif q.get("kind") == "matching":
            c["matching"] += 1
        else:
            c["reading"] += 1
    return c


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", default=str(HERE.parent / "cet做题"))
    ap.add_argument("--min-questions", type=int, default=24)
    args = ap.parse_args()

    site = Path(args.site)
    bank_dir = site / "public" / "bank"
    bank_dir.mkdir(parents=True, exist_ok=True)
    text_dir = HERE / "text"

    papers = read_library(site)
    exams, total = [], 0
    skipped = []
    for paper in papers:
        f = text_dir / f"{paper['level']}_{paper['id']}.txt"
        if not f.exists():
            skipped.append((paper["level"] + "_" + paper["id"], "no-text"))
            continue
        try:
            bank = parse_exam(f.stem, f.read_text(encoding="utf-8"))
        except Exception as exc:  # noqa: BLE001
            skipped.append((f.stem, "parse-error: %s" % exc))
            continue
        qs = bank["questions"]
        if len(qs) < args.min_questions or not bank["answers"]:
            skipped.append((f.stem, "q=%d key=%d" % (len(qs), len(bank["answers"]))))
            continue

        year, month, set_no = (paper["id"].split("_") + [""])[:3]
        only = min(q["no"] for q in qs) > 25
        counts = counts_of(qs)
        title = "%s年%s月 第%s套" % (year, int(month), set_no)
        exam = {
            "level": paper["level"],
            "id": paper["id"],
            "title": title,
            "year": int(year),
            "month": int(month),
            "set": set_no,
            "hasAudio": paper["hasAudio"],
            "readingOnly": only,
            "counts": counts,
            "questions": qs,
            "passages": bank["passages"],
            "warnings": bank["warnings"],
        }
        out = bank_dir / f"{paper['level']}_{paper['id']}.json"
        out.write_text(json.dumps(exam, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        exams.append({
            "level": paper["level"],
            "id": paper["id"],
            "title": title,
            "year": int(year),
            "month": int(month),
            "set": set_no,
            "hasAudio": paper["hasAudio"],
            "readingOnly": only,
            "counts": counts,
            "file": out.name,
        })
        total += len(qs)

    exams.sort(key=lambda e: (e["level"], -e["year"], -e["month"], e["set"]))
    manifest = {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "totalQuestions": total,
        "examCount": len(exams),
        "exams": exams,
    }
    (bank_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )

    print("exams: %d, questions: %d -> %s" % (len(exams), total, bank_dir))
    print("skipped: %d (%s)" % (len(skipped), ", ".join("%s %s" % s for s in skipped[:6])))
    sample = json.loads((bank_dir / exams[0]["file"]).read_text(encoding="utf-8"))
    print("cloze wordBank sample:", json.dumps(sample["passages"]["cloze"].get("wordBank"), ensure_ascii=False)[:300])
    print("matching letters:", sample["passages"]["matching"].get("letters"))
    print("cloze blanks:", json.dumps(sample["passages"]["cloze"].get("blanks"), ensure_ascii=False)[:300])
    sizes = sum(p.stat().st_size for p in bank_dir.glob("*.json"))
    print("bank size: %.1f KB" % (sizes / 1024))


if __name__ == "__main__":
    main()
