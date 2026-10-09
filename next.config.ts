import path from "node:path";
import type { NextConfig } from "next";

/**
 * GitHub Pages 项目站（https://<用户名>.github.io/<仓库名>/）需要子路径前缀：
 *   Windows:  $env:PAGES_BASE_PATH='/cet-website'; npm run build
 *   Linux/Mac: PAGES_BASE_PATH=/cet-website npm run build
 * 自定义域名或用户站（根路径）留空即可，本地开发也不用设。
 */
const rawBasePath = process.env.PAGES_BASE_PATH ?? "";
const basePath = rawBasePath ? "/" + rawBasePath.replace(/^\/+|\/+$/g, "") : "";

/**
 * 站点的对外地址（sitemap / robots / OpenGraph / JSON-LD 用它）。
 * 默认 = 本仓库的 GitHub Pages 项目站地址；以后换自己的域名就设 PAGES_SITE_URL。
 */
const siteUrl = (process.env.PAGES_SITE_URL ?? "https://couldyyy9.github.io/webbbb").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  output: "export",
  ...(basePath ? { basePath } : {}),
  // 传给客户端代码（src/lib/base-path.ts 里的 withBasePath 用它拼题库/PDF/MP3 的地址）
  env: { NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_APP_URL: siteUrl },
  allowedDevOrigins: ["192.168.1.46", "127.0.0.1", "localhost"],
  images: {
    unoptimized: true,
  },
  // 本机存在多个 lockfile 时 Next 会把 workspace root 推断到用户目录，这里固定为本项目目录
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
