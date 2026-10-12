# 决战四六级 · 四六级真题（在线做题版）

> 完全免费、开源的四六级复习网站：**真题 PDF 下载 + 在线做题 + 错题本**
> 纯静态站点（`output: "export"`），无后端、无数据库、无登录

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)

🌐 本项目线上地址：<https://couldyyy9.github.io/cet-website/>
🌐 上游原始项目：[whoamiARC/cet-website](https://github.com/whoamiARC/cet-website) · <https://cettong.cn>

## 🆕 本版做了什么

在原始站点（只有真题 PDF / 听力 MP3 下载）的基础上：

| 改动 | 说明 |
| --- | --- |
| ✅ 新增**在线做题** | `/practice`，24 套真题、1119 道客观题在线作答：听力（含 MP3 播放）、选词填空、长篇匹配、仔细阅读；带答题卡、标记、计时、交卷自动判分与逐题解析 |
| ✅ 新增**错题本** | `/mistakes`，交卷后自动收录错题，可按级别 / 题型 / 掌握状态筛选，支持标记「已掌握」、移除、跳回原题 |
| ✅ 六级新增**写作与翻译 + 逐题翻译解析** | 答题页补上 Part I 写作与 Part IV 翻译（只给题目、不计分）；六级交卷后的错题回顾与错题本里，每题可展开折叠的「翻译与解析」（题干翻译 / 选项翻译 / 解析，取自官方答案册扫描件 OCR）。四级与 2019–2023 的卷子没有对应数据，模块自动隐藏 |
| 🗑 删除页面 | 移除了「关于我们」`/about` 与「常见问题」`/faq` 两个页面，以及导航栏、页脚、站点地图里的相应入口；联系页里指向常见问题的卡片也一并去掉 |
| 🗑 移除打赏 | 顶栏菜单、手机端菜单、页脚、首页「关于本站 + 支持作者」整块（含爱发电打赏、原作者 GitHub 与联系信息）全部清掉 |
| 🔒 关掉第三方脚本 | 原站的 Google Analytics 与 AdSense 属于原作者，本版改成环境变量开关（`NEXT_PUBLIC_GA_ID` / `NEXT_PUBLIC_ADSENSE_CLIENT`），不设置就完全不加载；`public/CNAME`、`public/ads.txt` 已删除 |

## 🎯 功能一览

| 页面 | 地址 | 说明 |
| --- | --- | --- |
| 首页 | `/` | 站点介绍、考试级别入口、在线做题入口 |
| 在线做题 | `/practice` | 24 套卷子列表（2024 年 6 月 – 2025 年 12 月，四级 / 六级各 12 套） |
| 答题页 | `/practice/cet4/2024_12_1` 等 | 55 张题卡（`*_3` 套为阅读册子，26–55 题）、答题卡跳转、标记、计时、交卷估分、逐题解析；**六级**另有 Part I 写作与 Part IV 翻译（只给题目、不计分），每题可展开「翻译与解析」 |
| 错题本 | `/mistakes` | 错题按试卷分组、去重计数、标记掌握、回到原题、清空；六级错题可展开「翻译与解析」 |
| 真题下载 | `/library/cet4`、`/library/cet6` | 93 套真题 PDF + 58 套听力 MP3（与上游一致，未改动），有题库的卷子会显示「在线做题」入口 |
| 其他 | `/contact`、`/terms`、`/privacy` | 联系、条款、隐私 |

- **数据存储**：全部在浏览器 `localStorage`（前缀 `cet-practice:` —— 错题 `mistakes:v1`、做题记录 `history:v1`、作答进度 `progress:v1`），不上传服务器；清理浏览器数据会一并清除。
- **题库来源**：脚本从真题 PDF 的**文字层**提取题目，答案取自卷尾的 `KEYS` 速查表（`tools/extract_all_text.py` → `tools/build_bank.py` → `tools/export_bank.py` → `tools/validate_bank.py`），产物在 `public/bank/`（`manifest.json` + `<level>_<id>.json`）。
- **覆盖范围**：只收录有文字层且带答案表的 24 套（2024 年 6 月起）。2019–2023 年的卷子是扫描版、卷面没有答案表，因此**不做在线判分**，这些卷子在详情页不会出现做题入口。
- **判分规则**：只判客观题（听力 25 题 + 阅读 30 题）。权重按真题分值折算（听力前 15 题各 7.1 分、16–25 题各 14.2 分、选词填空各 3.55 分、匹配与阅读各 14.2 分），四级满分 497 分（阅读册子 248.5 分）。写作与翻译是主观题，不计入自动判分。
- **六级写作/翻译与逐题解析**：写作与翻译**题目**从 `test.pdf` 的文字层抽取；逐题的**题干翻译、选项翻译与解析**只存在于 `answer.pdf`，而它是纯扫描图，因此由 `tools/ocr_answers.py`（rapidocr-onnxruntime）逐页 OCR 后解析成 `public/bank/extra/cet6_*.json`。前端读不到该文件就返回 `null`，模块自动隐藏——所以四级页面天然没有这两块。

## 💻 本地运行

```bash
npm install                 # 安装依赖（国内网络可加 --registry=https://registry.npmmirror.com）
npm run dev                 # 开发模式：http://localhost:3000

npm run build               # 静态导出到 out/（133 个页面 + 题库 JSON + 真题资源）
node serve-static.cjs 3000  # 零依赖静态服务器：clean URL、Range 请求、监听 0.0.0.0
```

Windows 下直接双击 `start-site.cmd` 也行（缺少 `out/` 时会自动先构建）。

> 注意：本机环境若设了 `NODE_ENV=production`，`npm install` 会跳过 devDependencies（Tailwind / TypeScript 会缺失），安装时加 `--include=dev`。

### 题库再生成（可选）

`tools/` 保留了生成题库的 Python 脚本，需要 `pypdf`；脚本里的绝对路径请按本机情况调整：

```bash
python tools/extract_all_text.py     # 抽取所有真题 PDF 的文字层到文本文件
python tools/build_bank.py           # 解析题目、选项与 KEYS 答案
python tools/export_bank.py          # 导出 public/bank/*.json 与 manifest.json
python tools/validate_bank.py        # 校验题库里有没有残留噪声
```

## 🚀 部署（GitHub Pages 项目站）

| 项目 | 值 |
| --- | --- |
| 仓库 | `Couldyyy9/cet-website`（fork 自 `whoamiARC/cet-website`） |
| 线上地址 | <https://couldyyy9.github.io/cet-website/> |
| 分支 | 源码在 `master`，构建产物发布到 `gh-pages` |
| 工作流 | `.github/workflows/deploy.yml`：Node 22 → `npm ci` → 解析前缀 → `npm run build` → 发布 `out/` 到 `gh-pages` |

- **子路径前缀自动推导**：CI 里的 `Resolve deployment URL` 步骤按仓库名算出 `PAGES_BASE_PATH=/cet-website` 与 `PAGES_SITE_URL`，所以仓库里**不需要配置任何变量**；本地构建默认是根路径（`http://localhost:3000`）。
- **日常更新**：改完代码 `git add -A && git commit -m "..." && git push`，Action 会自动重新构建并发布（约 2–5 分钟）。
- **换成自己的域名**：在仓库 *Settings → Secrets and variables → Actions → Variables* 加 `PAGES_BASE_PATH=/` 与 `PAGES_SITE_URL=https://你的域名`，然后重跑一次 Action（路径前缀是构建时写死的）；同时把 `deploy.yml` 里注释掉的 `cname:` 改成你的域名。
- **只改文档/不装 git 的场景**：可以直接在 GitHub 网页上编辑或上传文件，但**必须把 `public`、`src`、`tools` 等文件夹整个上传**，否则会出现"根目录文件更新了、文件夹没更新"的情况。

详细步骤、Pages 设置与常见坑见 [DEPLOY-GITHUB.md](./DEPLOY-GITHUB.md)。

## 🛠 技术栈（真实情况）

> 本仓库是**纯静态 Next.js**：没有 `prisma/`、没有 API 路由、没有 `.env.example`，不需要数据库 / 鉴权 / Vercel。
> 上游 README 里关于 Prisma / Turso / JWT / Vercel 的说明属于旧版方案，本版代码里不存在。

- **框架**：[Next.js 16](https://nextjs.org)（App Router，`output: "export"`）+ React 19
- **样式**：[Tailwind CSS 4](https://tailwindcss.com)（`@tailwindcss/postcss`）
- **语言**：TypeScript 5
- **图标**：[lucide-react](https://lucide.dev)
- **数据**：题库 JSON 静态文件 + 浏览器 `localStorage`
- **部署**：GitHub Pages（`gh-pages` 分支）

## 🗂 项目结构

```
cet-website/                         # 仓库根目录（本地文件夹名叫 cet做题）
├── .github/workflows/deploy.yml     # GitHub Pages 自动部署
├── public/
│   ├── bank/                        # 题库：manifest.json + 24 套 <level>_<id>.json（本次新增）
│   ├── bank/extra/                  # 六级写作/翻译题目与逐题翻译解析（12 套，可选数据）
│   ├── library/                     # 真题资源：241 个文件 / 667MB（cet4、cet6 各考次 PDF 与 MP3）
│   └── .nojekyll                    # 保证 _next/ 目录被 Pages 正常提供
├── src/
│   ├── app/
│   │   ├── page.tsx                 # 首页
│   │   ├── library/                 # 真题列表与详情（cet4 / cet6 / [testId]）
│   │   ├── practice/                # 在线做题：列表页 + [level]/[testId] 答题页（新增）
│   │   ├── mistakes/page.tsx        # 错题本（新增）
│   │   ├── contact/ terms/ privacy/ # 联系、条款、隐私
│   │   ├── layout.tsx               # 全局布局（GA / AdSense 默认关闭）
│   │   ├── sitemap.ts robots.ts manifest.ts
│   │   └── globals.css
│   ├── components/
│   │   ├── layout/header.tsx        # 导航（首页 / 在线做题 / 四级真题 / 六级真题 / 错题本）
│   │   ├── layout/footer.tsx        # 页脚（只保留功能链接）
│   │   ├── practice/                # quiz-runner、question-card、passages、practice-home、mistakes-board（新增）
│   │   ├── exam-detail.tsx          # 真题详情页（含「开始做题」入口）
│   │   ├── reveal.tsx theme-toggle.tsx liquid-background.tsx
│   ├── lib/
│   │   ├── bank.ts                  # 题库加载、题型分组、判分与权重（新增）
│   │   ├── practice-store.ts        # localStorage：错题 / 记录 / 进度（新增）
│   │   ├── base-path.ts             # 部署子路径前缀（新增）
│   │   ├── library.ts               # 93 套真题的硬编码索引
│   │   ├── const.ts utils.ts
├── tools/                           # 题库生成脚本（Python）
├── serve-static.cjs start-site.cmd  # 本地静态预览
└── next.config.ts DEPLOY-GITHUB.md README.md
```

## 📄 License 与说明

源代码遵循 [MIT](./LICENSE)；真题题目、解析与音频的版权归各自权利人，**仅供个人学习使用**，请勿用于商业用途或大规模传播。

## 🙏 致谢

- 上游项目：[whoamiARC/cet-website](https://github.com/whoamiARC/cet-website)（真题资源与站点基础）
- [Next.js](https://nextjs.org) · [Tailwind CSS](https://tailwindcss.com) · [lucide](https://lucide.dev)

---

**祝每一位四六级考生一次过线** 🎓
