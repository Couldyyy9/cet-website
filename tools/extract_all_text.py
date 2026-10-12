"""把每套真题的 test.pdf（有文字层）抽成 UTF-8 文本，供后续结构化解析。

输出: <outdir>/<level>_<id>.txt
"""
import sys
from pathlib import Path

from pypdf import PdfReader

lib_root = Path(sys.argv[1])
outdir = Path(sys.argv[2])
outdir.mkdir(parents=True, exist_ok=True)

ok = 0
fail = []
for pdf in sorted(lib_root.glob("*/*/test.pdf")):
    level = pdf.parent.parent.name
    exam = pdf.parent.name
    try:
        reader = PdfReader(str(pdf))
        parts = []
        for page in reader.pages:
            parts.append(page.extract_text() or "")
        text = "\n\f\n".join(parts)
        # pypdf 在 ToUnicode 映射不全时会吐出孤立代理项，写文件前替换掉
        text = text.encode("utf-8", "replace").decode("utf-8").encode(
            "utf-8", "replace").decode("utf-8")
        text = "".join("\ufffd" if 0xD800 <= ord(ch) <= 0xDFFF else ch for ch in text)
    except Exception as exc:  # noqa: BLE001
        fail.append((level, exam, repr(exc)))
        continue
    (outdir / ("%s_%s.txt" % (level, exam))).write_text(text, encoding="utf-8")
    ok += 1

print("extracted:", ok)
print("failed:", len(fail))
for f in fail[:10]:
    print("  ", f)
