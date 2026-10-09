# 部署到 GitHub Pages：Couldyyy9/webbbb

目标地址：**https://couldyyy9.github.io/webbbb/**（GitHub 项目站，不需要自己的域名）

改好的源码在 `C:\Users\15963\Desktop\deepseek h\cet做题\`；要推到仓库里的 57 个文件已经打包成 `cet做题-改动包.zip`（另有解压好的 `push-to-github\` 目录），清单见 `FILELIST.txt`。

---

## 0. 先建仓库（**不要手动上传那 667 MB 的真题媒体**）

原仓库里的 `public/library` 有 241 个 PDF/MP3、共 667 MB，这次一个字节都没改。用下面任一种方式拿到它，都是 GitHub 服务端复制，你的网络不用传 667 MB：

**方式一：Import（推荐，得到干净的新仓库）**
1. 打开 <https://github.com/new/import>
2. **Your old repository's clone URL** 填 `https://github.com/whoamiARC/cet-website`
3. Owner 选 `Couldyyy9`，Repository name 填 **webbbb**，Public；Begin import，等 2–5 分钟。

**方式二：Fork 后改名**
1. 打开 <https://github.com/whoamiARC/cet-website> → Fork
2. 进自己的 fork → **Settings** → 最下面 **Rename** → `webbbb`

> ⚠️ 用 Fork 的话，仓库页会显示 "forked from …"，并且 **Actions 默认是关的**：进 Actions 标签点 *"I understand my workflows, go ahead and enable them"*。Import 出来的仓库没有这个问题。

---

## 1. 上传 57 个改动文件（约 835 KB）

解压 `cet做题-改动包.zip`，在仓库根目录点 **Add file → Upload files**，把 `public`、`src`、`tools` 文件夹和 `next.config.ts`、`README.md`、`serve-static.cjs`、`start-site.cmd`、`DEPLOY-GITHUB.md` 一起拖进去 → **Commit changes**。目录结构会自动保留。

（`FILELIST.txt` 只是清单，不用上传。）

## 2. 替换 / 删除这几个文件（**关键**，拖拽最容易漏掉点开头的和删除操作）

| 操作 | 文件 | 为什么 |
| --- | --- | --- |
| **替换** | `.github/workflows/deploy.yml` | 点开 → 铅笔 → 全选删除 → 粘贴 `push-to-github\.github\workflows\deploy.yml` 的内容。新版把 Node 20 换成 22、把 lockfile 里的国内镜像源在 CI 里换回官方源，并**自动按仓库名算出 `/webbbb` 前缀**，所以你不需要在仓库里配任何变量 |
| **删除** | `public/CNAME` | 打开 → 右上垃圾桶 → Commit。里面写的是 `www.cettong.cn`，不删的话 GitHub Pages 会一直以为你的站要绑这个域名（域名不是你的，会一直显示"域名未验证 / 证书 pending"） |
| **删除** | `public/ads.txt` | 原站作者的 Google AdSense 凭据，跟你的站无关 |
| 可选 | `.gitignore` | 末尾加一行 `/.banktest/`（本地自测目录） |

## 3. 打开 Pages

仓库 → **Settings → Pages** → **Source** 选 *Deploy from a branch* → **Branch** 选 **`gh-pages`** / **`/ (root)`** → Save。

> 顺序：先让第 4 步的 Action 跑完（它才会创建 `gh-pages` 分支），再回来选这个分支。

## 4. 等 Action 跑完

**Actions** 标签 → *Deploy to GitHub Pages* → 约 2–5 分钟（要构建 133 个静态页面，再把 682 MB 产物发布到 `gh-pages`）。日志里会打印一行 `部署地址：https://couldyyy9.github.io/webbbb/（路径前缀：/webbbb）`。

以后每次改代码推到 `main`/`master` 都会自动重新部署。

## 5. 上线后自检这 6 个地址

| 地址 | 期望 |
| --- | --- |
| `https://couldyyy9.github.io/webbbb/` | 首页，样式正常（不是白板） |
| `https://couldyyy9.github.io/webbbb/practice` | 在线做题：24 套卷子列表 |
| `https://couldyyy9.github.io/webbbb/practice/cet4/2024_12_1` | 55 张题卡、听力能播放、交卷有估分 |
| `https://couldyyy9.github.io/webbbb/mistakes` | 错题本页面 |
| `https://couldyyy9.github.io/webbbb/bank/manifest.json` | JSON：`"exams": 24`、`"totalQuestions": 1119` |
| `https://couldyyy9.github.io/webbbb/library/cet4/2024_12_1/test.pdf` | PDF 能打开/下载 |

## 6. 以后想换成自己的域名

1. 在 Pages 设置里把 **Custom domain** 填成你的域名，域名服务商加一条 CNAME 指向 `couldyyy9.github.io`，勾上 Enforce HTTPS。
2. 仓库 → **Settings → Secrets and variables → Actions → Variables** 加两个变量：`PAGES_BASE_PATH=/`（根路径）和 `PAGES_SITE_URL=https://你的域名`。
3. **重新跑一次 Action**（静态产物里的路径前缀是构建时写死的，改域名必须重新构建）。
4. 此时才需要 `cname:`：把 `.github/workflows/deploy.yml` 里被注释掉的 `# cname: example.com` 改成你的域名并取消注释。

## 7. 常见坑

| 现象 | 原因 / 处理 |
| --- | --- |
| 线上样式全丢、`/bank/*.json` 404 | 构建时用了根路径但站点在 `/<仓库名>/` 子路径。用本仓库的 `deploy.yml` 会自动算对；若你手动 `npm run build` 后上传 `out/`，必须先设 `PAGES_BASE_PATH=/webbbb` |
| 打开是 GitHub 404 页面 | Pages 的 Source/Branch 没选成 `gh-pages`，或 Action 还没跑完 |
| 页面里 `_next/` 资源 404 | 仓库里缺 `public/.nojekyll`（Jekyll 会吞掉下划线开头的目录）；本仓库已带此文件 |
| Action 在 `npm ci` 失败 | lockfile 里是 `registry.npmmirror.com`；新版 workflow 会先 `sed` 换回官方源。若手工改过 workflow，记得保留这一步 |
| Action 一直 pending / 报 Node 版本 | 用 workflow 里的 Node 22；Next.js 16 需要 Node ≥ 20.9 |
| 自定义域名证书一直 pending | 域名不是你的，或 DNS 没生效；`public/CNAME` 与 Pages 里的 Custom domain 两处必须一致 |
| 想预览本地构建 | 本地默认构建是根路径：`npm run build` 后双击 `start-site.cmd`（或 `node serve-static.cjs 3000`），访问 <http://localhost:3000>；开发用 `npm run dev` |

## 附：本版相对原站的改动范围

- 新增：`src/lib/{bank,practice-store,base-path}.ts`、`src/components/practice/*`、`src/app/{practice,mistakes}/**`、`public/bank/*`（24 套题库）、`tools/*.py`、`DEPLOY-GITHUB.md`、`serve-static.cjs`、`start-site.cmd`
- 修改：`.github/workflows/deploy.yml`、`.gitignore`、`README.md`、`next.config.ts`、`src/app/page.tsx`、`src/app/sitemap.ts`、`src/app/layout.tsx`、`src/lib/const.ts`、`src/app/library/**`（4 个真题页加做题入口）
- 删除：`public/CNAME`（原站域名）、`public/ads.txt`（原站 AdSense）
- 未改动：`public/library/**`（667 MB 真题媒体）、`package.json` / `package-lock.json`（没有新增依赖）
