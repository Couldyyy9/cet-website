# 仓库内副本（与本地生成数据时使用的脚本一致）。依赖：pip install pypdf pillow rapidocr-onnxruntime onnxruntime
# 路径按脚本所在目录推导：OCR 中间产物写 tools/ocr_cache，解析结果写 tools/parsed。
"""OCR 24 套可做题试卷的官方答案解析扫描件。

产出: _cet_dl/ocr2/<level>_<id>/page_XX.jpg   (扫描页图片)
      _cet_dl/ocr2/<level>_<id>/page_XX.json  (每行 {y,x,x2,text,score})

用法: python ocr_answers.py [--workers 8] [--only cet4_2024_12_1] [--force]
"""
import argparse
import json
import os
import re
import sys
import time
import zlib
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
LIB = HERE.parent / "public" / "library"
BANK = HERE.parent / "public" / "bank"
OUT = HERE / "ocr_cache"

_engine = None

LOGF = None


def log(msg=""):
    """同时写 stdout 与日志文件（UTF-8、逐行 flush，避免看起来像卡住）。"""
    line = str(msg) + "\n"
    if LOGF is not None:
        LOGF.write(line)
        LOGF.flush()
    try:
        sys.stdout.write(line)
        sys.stdout.flush()
    except Exception:
        pass


def get_engine():
    global _engine
    if _engine is None:
        from rapidocr_onnxruntime import RapidOCR

        _engine = RapidOCR(intra_op_num_threads=int(os.environ.get("OCR_THREADS", "4")))
    return _engine


def jpegs_in(blob):
    out = []
    pos = 0
    while True:
        start = blob.find(b"\xff\xd8\xff", pos)
        if start < 0:
            return out
        end = blob.find(b"\xff\xd9", start)
        if end < 0:
            return out
        out.append(blob[start:end + 2])
        pos = end + 2


def extract_pages(pdf: Path, outdir: Path, force=False) -> int:
    """把扫描页图片写到 outdir，返回页数。"""
    existing = sorted(outdir.glob("page_*.jpg"))
    if existing and not force:
        return len(existing)
    data = pdf.read_bytes()
    chunks = list(jpegs_in(data))
    for s in re.findall(rb"stream\r?\n(.*?)endstream", data, re.S):
        try:
            chunks.append(zlib.decompress(s))
        except Exception:
            pass
    blobs = []
    for c in chunks:
        blobs.extend(jpegs_in(c))
    n = 0
    for i, blob in enumerate(blobs, 1):
        if len(blob) < 20000:
            continue
        (outdir / ("page_%02d.jpg" % i)).write_bytes(blob)
        n += 1
    return n


def bad_images(outdir: Path):
    """返回无法解码的 jpg（被 kill 打断时可能只写了一半）。"""
    from PIL import Image

    bad = []
    for p in sorted(outdir.glob("page_*.jpg")):
        try:
            with Image.open(p) as im:
                im.load()
        except Exception:
            bad.append(p)
    return bad


def ocr_one(task):
    key, page_path, force = task
    page_path = Path(page_path)
    out = page_path.with_suffix(".json")
    if out.exists() and not force:
        return (key, page_path.name, "cached", 0.0, len(json.loads(out.read_text(encoding="utf-8"))))
    t0 = time.time()
    try:
        result, _ = get_engine()(str(page_path))
    except Exception as e:  # 单页坏图/解码失败不能让整轮跑挂掉
        return (key, page_path.name, "error:" + type(e).__name__, round(time.time() - t0, 1), 0)
    rows = []
    for box, text, score in result or []:
        xs = [p[0] for p in box]
        ys = [p[1] for p in box]
        rows.append(
            {"y": round(min(ys)), "x": round(min(xs)), "x2": round(max(xs)), "t": text, "s": round(float(score), 2)}
        )
    rows.sort(key=lambda r: (r["y"], r["x"]))
    out.write_text(json.dumps(rows, ensure_ascii=False), encoding="utf-8")
    return (key, page_path.name, "ocr", round(time.time() - t0, 1), len(rows))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--only", default="")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--log", default=str(HERE / "ocr_run.log"))
    ap.add_argument("--fix-images", action="store_true", help="校验已导出的 jpg，坏图整套重新导出")
    args = ap.parse_args()

    global LOGF
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    LOGF = open(args.log, "a", encoding="utf-8")
    log("")
    log("===== 运行开始 %s | only=%s workers=%d =====" % (time.strftime("%Y-%m-%d %H:%M:%S"), args.only or "全部", args.workers))

    manifest = json.loads((BANK / "manifest.json").read_text(encoding="utf-8"))
    keys = [e["level"] + "_" + e["id"] for e in manifest["exams"]]
    if args.only:
        keys = [k for k in keys if k == args.only or k.startswith(args.only + "_")]

    tasks = []
    for key in keys:
        level, _, eid = key.partition("_")
        pdf = LIB / level / (level + "_" + eid) / "answer.pdf"
        if not pdf.exists():
            pdf = LIB / level / eid / "answer.pdf"
        outdir = OUT / key
        outdir.mkdir(parents=True, exist_ok=True)
        if args.fix_images:
            bad = bad_images(outdir)
            if bad:
                log("%-16s 发现 %d 张坏图，整套重新导出：%s" % (key, len(bad), ", ".join(sorted(p.name for p in bad))))
                for p in outdir.glob("page_*.jpg"):
                    p.unlink()
        n = extract_pages(pdf, outdir, force=args.force)
        pages = sorted(outdir.glob("page_*.jpg"))
        cached = 0 if args.force else sum(1 for p in pages if p.with_suffix(".json").exists())
        log("%-16s %2d 页（已缓存 %d）" % (key, n, cached))
        tasks.extend((key, p, args.force) for p in pages)

    total = len(tasks)
    pending = sum(1 for (_k, p, _f) in tasks if _f or not p.with_suffix(".json").exists())
    log("总页数 %d，已缓存 %d，本次需 OCR %d，workers %d" % (total, total - pending, pending, args.workers))
    if pending == 0:
        log("没有需要 OCR 的页，直接结束。")
        return
    t0 = time.time()
    done = 0
    ocr_done = 0
    errors = 0
    with ProcessPoolExecutor(max_workers=args.workers) as ex:
        for key, name, how, dt, rows in ex.map(ocr_one, tasks, chunksize=1):
            done += 1
            if how == "ocr":
                ocr_done += 1
                rate = (time.time() - t0) / ocr_done
                eta = max(0.0, (pending - ocr_done) * rate / 60)
                log("  [%3d/%3d] %-16s %s %5.1fs %3d 行 | OCR 进度 %d/%d，剩余约 %.1f 分钟"
                    % (done, total, key, name, dt, rows, ocr_done, pending, eta))
            elif how.startswith("error"):
                errors += 1
                log("  [!] %-16s %s 识别失败 %s（用 --fix-images 重跑）" % (key, name, how))
    log("完成：本次 OCR %d 页（含缓存共 %d 页），失败 %d 页，用时 %.1f 分钟"
        % (ocr_done, total, errors, (time.time() - t0) / 60))


if __name__ == "__main__":
    main()
