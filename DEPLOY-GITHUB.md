# 部署与更新：Couldyyy9/cet-website（GitHub Pages 项目站）

| 项目 | 值 |
| --- | --- |
| 仓库 | <https://github.com/Couldyyy9/cet-website>（fork 自 `whoamiARC/cet-website`） |
| 线上地址 | <https://couldyyy9.github.io/cet-website/> |
| 源码分支 | `master` |
| 发布分支 | `gh-pages`（由 Action 自动生成，不要手改） |
| 工作流 | `.github/workflows/deploy.yml` |

站点是**项目站**，所以所有资源都带 `/cet-website` 前缀（例如 `/cet-website/_next/...`、`/cet-website/bank/manifest.json`）。这个前缀由 CI 自动推导，**仓库里不需要配置任何变量**。

---

## 1. 日常更新（推荐，已在本机配好 git）

```powershell
cd "C:\Users\15963\Desktop\deepseek h\cet做题"
git add -A
git commit -m "描述这次改了什么"
git push          # 触发 Action，2–5 分钟后线上生效
```

- Action 日志里会打印一行 `部署地址：https://couldyyy9.github.io/cet-website/（路径前缀：/cet-website）`。
- 查看进度：仓库 **Actions** 标签 → *Deploy to GitHub Pages*。
- 不要推送 `out/`、`node_modules/`、`.next/`（`.gitignore` 已排除）。

## 2. 备选：纯网页上传改动文件（不装 git）

> ⚠️ **最容易踩的坑**：GitHub 网页上传时如果只拖了最外层的松散文件，`public/`、`src/`、`tools/` 文件夹会**整包丢失**——页面能打开但内容是旧版（本仓库 2026-10-09 就发生过一次：只有 5 个根文件进了仓库，导致线上没有「在线做题」）。

1. 打开 <https://github.com/Couldyyy9/cet-website> → **Add file → Upload files**。
2. 从 `C:\Users\15963\Desktop\deepseek h\push-to-github\` 里**把 `public`、`src`、`tools` 三个文件夹整个拖进去**（不是只拖里面的文件），再把 `next.config.ts`、`README.md`、`DEPLOY-GITHUB.md`、`.gitignore`、`serve-static.cjs`、`start-site.cmd` 一起拖进去。Commit。
3. 上传完在仓库里逐个点开核对是否真的存在：
   - `src/lib/bank.ts`、`src/lib/base-path.ts`、`src/lib/practice-store.ts`
   - `src/components/practice/quiz-runner.tsx`（以及 mistakes-board / passages / practice-home / question-card）
   - `src/app/practice/page.tsx`、`src/app/practice/[level]/[testId]/page.tsx`、`src/app/mistakes/page.tsx`
   - `public/bank/manifest.json` 与 `public/bank/cet4_2024_12_1.json` 等 24 个题库文件
   - `tools/build_bank.py` 等 4 个脚本
   - `.github/workflows/deploy.yml`（若不是新版，点开 → 铅笔 → 全选粘贴新版内容）
4. 这些文件必须是**已删除**状态：`public/CNAME`、`public/ads.txt`（已处理 ✅）。留着 `CNAME` 会让 Pages 一直尝试绑定 `www.cettong.cn`（那不是你的域名）。

## 3. Pages 设置（一次性）

仓库 → **Settings → Pages**：

- **Source**：*Deploy from a branch*
- **Branch**：`gh-pages` / `/ (root)`
- Custom domain **留空**

## 4. 上线自检

| 地址 | 期望 |
| --- | --- |
| `https://couldyyy9.github.io/cet-website/` | 首页样式正常，导航为「首页 / 在线做题 / 四级真题 / 六级真题 / 错题本」 |
| `https://couldyyy9.github.io/cet-website/practice` | 24 套卷子列表 |
| `https://couldyyy9.github.io/cet-website/practice/cet4/2024_12_1` | 55 张题卡、听力能播放、交卷有估分 |
| `https://couldyyy9.github.io/cet-website/mistakes` | 错题本页面 |
| `https://couldyyy9.github.io/cet-website/bank/manifest.json` | JSON：`"exams": 24`、`"totalQuestions": 1119` |
| `https://couldyyy9.github.io/cet-website/library/cet4/2024_12_1/test.pdf` | PDF 能打开 / 下载 |
| `https://couldyyy9.github.io/cet-website/about`、`/faq` | **404**（这两个页面已按要求删除） |

## 5. 以后换成自己的域名

1. Pages 设置里填 **Custom domain**，域名服务商加一条 CNAME 指向 `couldyyy9.github.io`，勾上 **Enforce HTTPS**。
2. 仓库 → *Settings → Secrets and variables → Actions → Variables* 新增：`PAGES_BASE_PATH=/`、`PAGES_SITE_URL=https://你的域名`。
3. 把 `deploy.yml` 里注释掉的 `# cname: example.com` 改成你的域名并取消注释。
4. **重跑一次 Action**（静态产物里的路径前缀是构建时写死的，换域名必须重新构建）。

## 6. 常见坑

| 现象 | 原因 / 处理 |
| --- | --- |
| 页面能打开但功能是旧版（没有在线做题） | `src/` 文件夹没上传成功。见上面第 2 节，务必拖**文件夹** |
| `/bank/*.json` 404 | 同样：`public/bank/` 没进仓库，或构建时没带 `/cet-website` 前缀 |
| 打开是 GitHub 404 页面 | Pages 的 Source/Branch 没选成 `gh-pages`，或 Action 还没跑完 |
| 样式全丢（白板） | 用的是根路径构建（本地不带 `PAGES_BASE_PATH` 的 `out/` 被推上去了）。线上必须由 Action 构建 |
| `_next/` 资源 404 | 仓库缺 `public/.nojekyll`（Jekyll 会吞掉下划线开头的目录），本仓库已带 |
| Action 在 `npm ci` 失败 | lockfile 里如果是 `registry.npmmirror.com`，workflow 会先 `sed` 换回官方源；手改过 workflow 要保留这一步 |
| 自定义域名证书一直 pending | 域名没解析好；`public/CNAME` 与 Pages 里的 Custom domain 必须一致 |
| 本地预览 | `npm run build`（默认根路径）后双击 `start-site.cmd`，或 `node serve-static.cjs 3000` → <http://localhost:3000> |

## 附：本版相对上游的改动

- **新增**：`src/lib/{bank,practice-store,base-path}.ts`、`src/components/practice/*`、`src/app/{practice,mistakes}/**`、`public/bank/*`（24 套题库）、`tools/*.py`、`serve-static.cjs`、`start-site.cmd`、`DEPLOY-GITHUB.md`
- **修改**：`.github/workflows/deploy.yml`、`.gitignore`、`next.config.ts`、`README.md`、`src/app/page.tsx`、`src/app/layout.tsx`、`src/app/sitemap.ts`、`src/lib/const.ts`、`src/components/layout/{header,footer}.tsx`、`src/app/library/**`（4 个真题页）、`src/app/contact/page.tsx`
- **删除**：`public/CNAME`、`public/ads.txt`、`src/app/about/`、`src/app/faq/`
- **未改动**：`public/library/**`（667MB 真题媒体）、`package.json` / `package-lock.json`（没有新增依赖）
