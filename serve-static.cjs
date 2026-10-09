#!/usr/bin/env node
/*
 * 零依赖静态服务器，用于本地运行 `next build`（output: "export"）产出的 out/ 目录。
 *
 * 用法:
 *   node serve-static.cjs                 # 端口 3000，根目录 ./out
 *   node serve-static.cjs 8080            # 自定义端口
 *   node serve-static.cjs 8080 out        # 自定义端口 + 根目录
 *
 * 特性:
 *   - clean URL: /library/cet4/2019_06_1 -> 2019_06_1.html（静态导出不会生成 index.html）
 *   - Range 请求: 支持 PDF / MP3 拖动进度、分片加载
 *   - 正确的 Content-Type（pdf / mp3 / webmanifest / txt RSC 负载等）
 *   - /_next/static/* 长缓存（文件名带 hash），HTML 不缓存
 */
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const PORT = Number(process.argv[2] || 3000);
const ROOT = path.resolve(__dirname, process.argv[3] || "out");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".zip": "application/zip",
};

const EMPTY_MIME = "application/octet-stream";

function contentType(file) {
  return MIME[path.extname(file).toLowerCase()] || EMPTY_MIME;
}

function cacheControl(pathname) {
  if (pathname.startsWith("/_next/static/")) return "public, max-age=31536000, immutable";
  if (/\.(pdf|mp3|mp4|png|jpg|jpeg|webp|avif|svg|ico|woff2?)$/i.test(pathname))
    return "public, max-age=604800";
  return "no-cache";
}

/** 把请求路径解析成磁盘文件；找不到返回 null。 */
function resolveFile(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;

  const target = path.join(ROOT, path.normalize(decoded));
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) return null; // 目录穿越防护

  const candidates = decoded.endsWith("/")
    ? [path.join(target, "index.html")]
    : [target, target + ".html", path.join(target, "index.html")];

  for (const candidate of candidates) {
    try {
      const stat = fs.statSync(candidate);
      if (stat.isFile()) return { file: candidate, size: stat.size };
    } catch {
      /* 试下一个候选 */
    }
  }
  return null;
}

/** 解析 Range 头，返回 {start,end} 或 "invalid" 或 null。 */
function parseRange(header, size) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return "invalid";
  const [, rawStart, rawEnd] = match;
  if (rawStart === "" && rawEnd === "") return "invalid";

  let start;
  let end;
  if (rawStart === "") {
    // bytes=-N  → 最后 N 字节
    const suffix = Number(rawEnd);
    if (suffix === 0) return "invalid";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? size - 1 : Math.min(Number(rawEnd), size - 1);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) return "invalid";
  return { start, end };
}

function respond(req, res) {
  const pathname = new URL(req.url, "http://localhost").pathname;
  const found = resolveFile(pathname);

  if (!found) {
    const notFound = path.join(ROOT, "404.html");
    if (fs.existsSync(notFound)) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      fs.createReadStream(notFound).pipe(res);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
    }
    return;
  }

  const { file, size } = found;
  const headers = {
    "Content-Type": contentType(file),
    "Cache-Control": cacheControl(pathname),
    "Accept-Ranges": "bytes",
  };

  if (req.method === "HEAD") {
    res.writeHead(200, { ...headers, "Content-Length": size });
    res.end();
    return;
  }

  const range = parseRange(req.headers.range, size);
  if (range === "invalid") {
    res.writeHead(416, { ...headers, "Content-Range": `bytes */${size}` });
    res.end();
    return;
  }

  if (range) {
    const { start, end } = range;
    res.writeHead(206, {
      ...headers,
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": end - start + 1,
    });
    fs.createReadStream(file, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, { ...headers, "Content-Length": size });
  fs.createReadStream(file).pipe(res);
}

if (!fs.existsSync(path.join(ROOT, "index.html"))) {
  console.error(`[错误] ${ROOT} 里没有 index.html，请先运行: npm run build`);
  process.exit(1);
}

http
  .createServer((req, res) => {
    try {
      respond(req, res);
    } catch (err) {
      console.error(err);
      if (!res.headersSent) res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("500 Internal Server Error");
    }
  })
  .listen(PORT, "0.0.0.0", () => {
    const lan = Object.values(os.networkInterfaces())
      .flat()
      .filter((i) => i && i.family === "IPv4" && !i.internal)
      .map((i) => i.address);
    console.log(`CET通 本地站点已启动（静态导出模式）`);
    console.log(`  根目录: ${ROOT}`);
    console.log(`  本机:   http://localhost:${PORT}`);
    for (const address of lan) console.log(`  局域网: http://${address}:${PORT}`);
  });
