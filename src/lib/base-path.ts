/**
 * 部署路径前缀。
 *
 * - 自定义域名 / 用户站（https://example.com、https://user.github.io）：留空，URL 就是 `/xxx`
 * - 项目站（https://user.github.io/repo/）：构建时设 `PAGES_BASE_PATH=/repo`，URL 变成 `/repo/xxx`
 *   本仓库部署在 https://couldyyy9.github.io/cet-website/，走的就是这一种（CI 自动推导前缀）。
 *
 * next/link 与 `/_next/...` 资源由 Next 自动加前缀；但运行时才拼出来的绝对路径
 * （题库 JSON 的 fetch、PDF/MP3 的 src）必须自己走 withBasePath()。
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBasePath(pathname: string): string {
  if (!pathname.startsWith("/")) return pathname;
  return BASE_PATH + pathname;
}
