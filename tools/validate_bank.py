# -*- coding: utf-8 -*-
"""体检导出的题库：找残留噪声、超长文本、缺失答案、空选项。"""
import json
import re
import sys
from pathlib import Path

BANK_DIR = Path(r"C:\Users\15963\Desktop\deepseek h\cet做题\public\bank")
SUSPECT = re.compile(
    r"(Questions?\s+\d+\s+(?:and|to)\s+\d+|Directions:|Section\s+[ABC]\b|Part\s+(?:II|III|IV)\b|"
    r"Answer Sheet|KEYS|Passage\s+(?:One|Two))"
)

def main():
    files = sorted(p for p in BANK_DIR.glob("*.json") if p.name != "manifest.json")
    total = 0
    issues = []
    newlines = []
    for f in files:
        b = json.loads(f.read_text(encoding="utf-8"))
        total += len(b["questions"])
        for q in b["questions"]:
            for letter, text in list(q.get("options", {}).items()) + [("stem", q.get("stem") or "")]:
                if SUSPECT.search(text):
                    issues.append((f.stem, q["no"], letter, text[-120:]))
                if len(text) > 300:
                    issues.append((f.stem, q["no"], letter, "LONG(%d): %s" % (len(text), text[-80:])))
            if not q.get("answer"):
                issues.append((f.stem, q["no"], "-", "NO ANSWER"))
        for key, psg in b["passages"].items():
            if key in ("cloze", "passage1", "passage2"):
                t = psg.get("text") or ""
                newlines.append((f.stem, key, t.count("\n\n"), len(t)))
                if SUSPECT.search(t):
                    issues.append((f.stem, 0, key, t[-120:]))
            if key == "cloze":
                for letter, word in psg["wordBank"].items():
                    if SUSPECT.search(word):
                        issues.append((f.stem, 0, "bank " + letter, word))
    print("exams=%d questions=%d issues=%d" % (len(files), total, len(issues)))
    for it in issues[:40]:
        print("  ", it)
    odd = [n for n in newlines if n[2] > 0]
    print("passages with blank lines: %d / %d" % (len(odd), len(newlines)))
    for n in odd[:5]:
        print("   ", n)

if __name__ == "__main__":
    main()
