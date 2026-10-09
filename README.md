# CET通 · 四六级真题（在线做题改进版）

> 一个完全免费、开源的四六级英语考试复习网站
> 海量真题 · 模拟考试 · 智能错题本 · 一次过四六级

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

🌐 本项目线上地址：<https://couldyyy9.github.io/webbbb/>（GitHub Pages 项目站，部署见 [DEPLOY-GITHUB.md](./DEPLOY-GITHUB.md)）
🌐 原始项目：<https://cettong.cn>

## 🆕 本版新增：在线做题 + 错题本（本地改进版）

在原始站点（真题 PDF 下载）的基础上新增了两个功能，依旧是**纯静态导出、无后端、无数据库**：

| 功能 | 地址 | 说明 |
| --- | --- | --- |
| 在线做题 | `/practice` | 24 套四六级真题（2024 年 6 月 – 2025 年 12 月，共 1119 道客观题）在线作答：听力（含 MP3 播放）、选词填空、长篇匹配、仔细阅读；带答题卡、标记、计时、交卷自动判分（客观题 710 分制估分）与逐题解析 |
| 错题本 | `/mistakes` | 交卷后自动收录错题，可按级别 / 题型 / 掌握状态筛选，支持标记「已掌握」、移除、跳回原题、重做全卷 |

- **数据存储**：全部存在浏览器 `localStorage`（前缀 `cet-practice:` —— 错题 `mistakes:v1`、做题记录 `history:v1`、作答进度 `progress:v1`），不上传服务器；清除浏览器数据会一并清除。
- **题库来源**：脚本从真题 PDF 的文字层提取题目，并解析卷尾 `KEYS` 答案速查表得到答案（`tools/build_bank.py` → `tools/export_bank.py`），产物在 `public/bank/`（`manifest.json` + `<level>_<id>.json`）。
- **覆盖范围**：只收录有文字层且带答案表的 2024 年 6 月起共 24 套（四级 / 六级各 12 套）。2019–2023 年的卷子是扫描版、卷面没有答案表，因此不做在线判分，页面上会如实说明。`*_3` 套在原仓库里只有阅读部分，题库也只有第 26–55 题。
- **判分规则**：只判客观题（听力 25 题 + 阅读 30 题）；写作与翻译为主观题，不计入自动判分。

### 本地运行（静态版）

```bash
npm install                 # 安装依赖（网络受限时加 --registry=https://registry.npmmirror.com）
npm run dev                 # 开发模式：http://localhost:3000

npm run build               # 构建静态站点（产出 out/：静态 HTML + 题库 JSON + 真题资源）
node serve-static.cjs 3000  # 零依赖静态服务器：clean URL、Range 请求、0.0.0.0 监听
```

Windows 下直接双击 `start-site.cmd` 也可以（缺少 `out/` 时会自动先执行构建）。

### 题库再生成（可选）

`tools/` 保留了生成题库的 Python 脚本：`extract_all_text.py`（抽取 PDF 文字层）→ `build_bank.py`（解析题目与答案）→ `export_bank.py`（导出 JSON）→ `validate_bank.py`（校验残留噪声）。脚本内的绝对路径需按本机情况调整。

### 部署（GitHub Pages 项目站）

部署在 `https://couldyyy9.github.io/webbbb/`，靠 `.github/workflows/deploy.yml` 自动构建并发布到 `gh-pages` 分支。

- **子路径前缀自动推导**：CI 里 `Resolve deployment URL` 这一步按仓库名算出 `PAGES_BASE_PATH=/webbbb` 与 `PAGES_SITE_URL`，所以仓库里**不需要配置任何变量**。本地构建默认是根路径（`http://localhost:3000`）。
- **想换成自己的域名**：在仓库 Variables 里加 `PAGES_BASE_PATH=/` 与 `PAGES_SITE_URL=https://你的域名`，再重新跑一次 Action（静态产物里的路径前缀是构建时写死的）。
- **统计与广告默认关闭**：原站的 GA / AdSense ID 属于原作者，已改成环境变量开关（`NEXT_PUBLIC_GA_ID` / `NEXT_PUBLIC_ADSENSE_CLIENT`），不设就完全不加载；`public/CNAME`、`public/ads.txt` 也已删除。

详细步骤、Pages 设置与常见坑见 [DEPLOY-GITHUB.md](./DEPLOY-GITHUB.md)。

## ✨ 特色

- 📚 **覆盖 CET-4 / CET-6 双级别**：听力 / 阅读 / 翻译 / 写作 / 词汇 5 大模块
- 🎯 **历年真题 + 模拟题**：2010-2025 完整题库
- 🧠 **智能错题本**：自动归类，薄弱点精准突破
- 📊 **真实考场模拟**：估分准确
- 💻 **全平台响应式**：手机 / 平板 / 电脑都能用
- 🆓 **永久免费**：所有功能对所有用户开放，**无套路、无广告、无会员**

## 🛠 技术栈

> 说明：本改进版的代码是**纯静态 Next.js**（`output: "export"`），仓库里没有 `prisma/`、API 路由或 `.env.example`，
> 下面列出的数据库 / 鉴权 / Vercel 流程属于旧版说明，实际不需要配置。

- **框架**：[Next.js 16](https://nextjs.org) (App Router) + React 19
- **样式**：TailwindCSS 4
- **数据库**：SQLite / libSQL (Turso) via [Prisma 7](https://prisma.io)
- **鉴权**：JWT (HTTP-Only Cookie)
- **部署**：[Vercel](https://vercel.com) (全球 CDN + Edge)

## 🚀 快速开始

### 本地开发

```bash
# 1. 克隆仓库
git clone https://github.com/whoamiARC/cet-website.git
cd cet-website

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，至少设置 JWT_SECRET

# 4. 初始化数据库 + 种子数据
npx prisma migrate dev
npx prisma db seed

# 5. 启动开发服务器
npm run dev
```

打开 <http://localhost:3000> 访问。

### 管理员注册

注册时使用 `.env` 中 `ADMIN_OPEN_CODE` 配置的万能验证码（默认 `888888`），可注册为管理员账号。

## 📦 部署

完整部署文档：

- [DEPLOYMENT.md](./DEPLOYMENT.md) — 方案对比与原理
- [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md) — 一步一步照着做

**简要流程**：Vercel（部署）+ Turso（数据库）+ 域名（cettong.cn）= **0 月费**

## 💖 支持作者

这是一个 **完全免费** 的开源项目，**不强制打赏、不与功能挂钩**。

如果觉得有帮助，可以：

- ☕ [请我喝杯咖啡](./public/donate/)（微信/支付宝扫码）
- ⭐ 给项目点个 Star
- 🐛 提 Issue / 提交 PR
- 📢 推荐给身边的同学

你的支持是我持续更新的最大动力 ❤️

## 🗂 项目结构

```
cet-website/
├── prisma/                  # 数据库 schema 与迁移
│   ├── schema.prisma        # 数据模型
│   ├── migrations/          # 迁移历史
│   └── seed.ts              # 种子数据（题库分类、会员套餐）
├── public/
│   ├── donate/              # 收款码图片（自己上传）
│   ├── favicon.svg          # 站点图标
│   └── og-image.png         # 社交分享预览图
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/             # API 路由
│   │   ├── admin/           # 管理后台（鉴权保护）
│   │   ├── about/           # 关于我们
│   │   ├── contact/         # 联系客服
│   │   ├── dashboard/       # 用户中心
│   │   ├── exam/            # 模拟考试
│   │   ├── faq/             # 常见问题
│   │   ├── library/         # 真题库
│   │   ├── login/           # 登录
│   │   ├── practice/        # 题库练习
│   │   ├── privacy/         # 隐私政策
│   │   ├── register/        # 注册
│   │   ├── support/         # 支持作者（打赏）
│   │   ├── terms/           # 服务条款
│   │   └── wrong/           # 错题本
│   ├── components/          # 通用组件
│   ├── hooks/               # React hooks
│   ├── lib/                 # 业务工具
│   │   ├── prisma.ts        # Prisma client 单例
│   │   ├── auth.ts          # JWT 鉴权
│   │   ├── sms.ts           # 短信服务（mock）
│   │   └── utils.ts
│   └── generated/prisma/    # Prisma 生成的客户端（自动生成）
├── next.config.ts
├── vercel.json              # Vercel 部署配置
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## 🤝 贡献

欢迎各种形式的贡献：

- 🐛 报告 Bug / 提出功能建议 → [Issues](../../issues)
- 🔧 提交代码 → [Pull Requests](../../pulls)
- 📝 完善文档
- 🎨 设计改进
- ➕ 补充真题

## 📄 License

源代码遵循 [MIT](./LICENSE) 协议 —— 你可以自由使用、修改、分发。

平台内容（题目、解析、音频）仅供个人学习，请勿用于商业用途或大规模传播。

## 🙏 致谢

- [Next.js](https://nextjs.org) - 强大的 React 框架
- [Vercel](https://vercel.com) - 部署平台
- [Turso](https://turso.com) - 边缘 SQLite 数据库
- [Prisma](https://prisma.io) - 类型安全的 ORM
- [Tailwind CSS](https://tailwindcss.com) - CSS 框架
- [lucide](https://lucide.dev) - 图标库

---

**让每一位四六级考生都能一次过线** 🎓
