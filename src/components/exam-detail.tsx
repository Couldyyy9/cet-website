import Link from "next/link";
import { ArrowLeft, Headphones, Download, FileText, BookOpen, Music, Sparkles } from "lucide-react";

// ─── Types ───────────────────────────────────────────────

interface ExamInfo {
  label: string;
  year: number;
  month: number;
  setLabel: string;
  hasAudio: boolean;
}

interface ExamDetailProps {
  exam: ExamInfo;
  level: "cet4" | "cet6";
  levelLabel: string;
  testPdf: string;
  answerPdf: string;
  audioMp3: string | null;
  /** 若该卷已收录在线题库，则显示「在线做题」入口 */
  practice?: { href: string; total: number; listening: number } | null;
}

// ─── Helpers ─────────────────────────────────────────────

function downloadName(
  level: "cet4" | "cet6",
  year: number,
  month: number,
  setLabel: string,
  type: "真题" | "答案解析" | "听力"
): string {
  const levelName = level === "cet4" ? "CET4" : "CET6";
  const ext = type === "听力" ? "mp3" : "pdf";
  return `${levelName}_${year}年${month}月_第${setLabel}套_${type}.${ext}`;
}

// ─── Color themes ────────────────────────────────────────

const themes = {
  gold: {
    border: "border-[#ffcd68]/60 dark:border-[#8a6f2a]/60",
    bg: "from-[#fffaf0] to-[#fff3d8] dark:from-[#2a2214]/60 dark:to-[#33280f]/60",
    iconBg: "bg-[#ffcd68] text-[#3a2c0a]",
    iconRing: "ring-[#ffcd68]/30 dark:ring-[#8a6f2a]/40",
    btn: "bg-[#ffcd68] text-[#3a2c0a] hover:bg-[#ffbe3d] focus:ring-[#ffcd68]",
    textGradient: "from-[#d9930c] to-[#b8790a] dark:from-[#ffd97d] dark:to-[#ffb63d]",
    accent: "bg-[#ffcd68]",
    softBg: "bg-[#fff6e3] dark:bg-[#33280f]/40",
  },
  orange: {
    border: "border-[#ffb63d]/70 dark:border-[#8a6f2a]/60",
    bg: "from-[#fff7e6] to-[#ffeec9] dark:from-[#2a2214]/60 dark:to-[#3d2f12]/60",
    iconBg: "bg-[#ffb63d] text-[#3a2c0a]",
    iconRing: "ring-[#ffb63d]/35 dark:ring-[#8a6f2a]/40",
    btn: "bg-[#ffb63d] text-[#3a2c0a] hover:bg-[#f5a623] focus:ring-[#ffb63d]",
    textGradient: "from-[#c97f06] to-[#a8700f] dark:from-[#ffd97d] dark:to-[#ffb63d]",
    accent: "bg-[#ffb63d]",
    softBg: "bg-[#fff3d8] dark:bg-[#3d2f12]/40",
  },
  deep: {
    border: "border-[#f08c00]/60 dark:border-[#8a5f14]/60",
    bg: "from-[#fff4e0] to-[#ffe9c9] dark:from-[#2a2214]/60 dark:to-[#3a2a10]/60",
    iconBg: "bg-[#f08c00] text-white",
    iconRing: "ring-[#f08c00]/30 dark:ring-[#8a5f14]/40",
    btn: "bg-[#f08c00] text-white hover:bg-[#d97d00] focus:ring-[#f08c00]",
    textGradient: "from-[#c46f00] to-[#a15c00] dark:from-[#ffc46b] dark:to-[#ff9f2e]",
    accent: "bg-[#f08c00]",
    softBg: "bg-[#fff4e0] dark:bg-[#3a2a10]/40",
  },
};

// ─── Main Component ──────────────────────────────────────

export default function ExamDetail({
  exam,
  level,
  levelLabel,
  testPdf,
  answerPdf,
  audioMp3,
  practice,
}: ExamDetailProps) {
  const listHref = level === "cet4" ? "/library/cet4" : "/library/cet6";
  const levelName = level === "cet4" ? "四级" : "六级";

  const testDlName = downloadName(level, exam.year, exam.month, exam.setLabel, "真题");
  const answerDlName = downloadName(level, exam.year, exam.month, exam.setLabel, "答案解析");
  const audioDlName = audioMp3
    ? downloadName(level, exam.year, exam.month, exam.setLabel, "听力")
    : null;

  return (
    <div className="animate-fade-in py-8 md:py-12">
      <div className="container mx-auto max-w-2xl px-4">
        {/* ── 返回链接 ── */}
        <Link
          href={listHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary-strong mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          返回{levelName}真题列表
        </Link>

        {/* ── 标题区 ── */}
        <header className="mb-10 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-3">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-soft text-primary-strong text-xs font-semibold rounded-full">
              {levelLabel}
            </span>
            {exam.hasAudio && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#fff1d6] text-[#a8700f] dark:bg-[#33280f] dark:text-[#ffd97d] text-xs font-semibold rounded-full">
                <Headphones className="h-3 w-3" />
                含听力
              </span>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {exam.label}
          </h1>
          <p className="text-muted mt-2 text-sm">
            {exam.year} 年 {exam.month} 月 · 大学英语{levelName}考试
          </p>
        </header>

        {/* ── 主体内容 ── */}
        <div className="space-y-8">
          {/* ▸ 在线做题入口 */}
          {practice && (
            <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary-soft/80 to-white dark:to-slate-900 overflow-hidden shadow-md">
              <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg ring-4 ring-primary/20">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold">在线做题</h2>
                  <p className="text-xs text-muted">
                    共 {practice.total} 道客观题（听力 {practice.listening} 题 + 阅读 {practice.total - practice.listening} 题）
                    · 在线作答 · 交卷自动判分 · 错题自动收录到错题本
                  </p>
                </div>
                <Link
                  href={practice.href}
                  className="btn-press inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary-hover active:scale-[0.97]"
                >
                  <Sparkles className="h-4 w-4" />
                  开始做题
                </Link>
              </div>
            </section>
          )}

          {/* ▸ 听力音频 */}
          {audioMp3 && audioDlName && (
            <AudioCard
              audioMp3={audioMp3}
              audioDlName={audioDlName}
              levelName={levelName}
              exam={exam}
              theme={themes.gold}
            />
          )}

          {/* ▸ 真题试卷 */}
          <DownloadCard
            type="exam"
            levelName={levelName}
            exam={exam}
            pdf={testPdf}
            downloadName={testDlName}
            theme={themes.orange}
          />

          {/* ▸ 对称分隔 */}
          <Divider />

          {/* ▸ 答案解析 */}
          <DownloadCard
            type="answer"
            levelName={levelName}
            exam={exam}
            pdf={answerPdf}
            downloadName={answerDlName}
            theme={themes.deep}
          />
        </div>

        {/* ── 底部 ── */}
        <footer className="mt-12 text-center">
          <p className="text-xs text-muted">
            所有资料完全免费，仅供个人学习使用
          </p>
        </footer>
      </div>
    </div>
  );
}

// ─── 听力卡片 ────────────────────────────────────────────

function AudioCard({
  audioMp3,
  audioDlName,
  levelName,
  exam,
  theme,
}: {
  audioMp3: string;
  audioDlName: string;
  levelName: string;
  exam: ExamInfo;
  theme: (typeof themes)["gold"];
}) {
  return (
    <section
      className={`rounded-3xl border ${theme.border} bg-gradient-to-br ${theme.bg} overflow-hidden shadow-md`}
    >
      {/* 头部 */}
      <div className={`px-6 py-5 border-b ${theme.border} flex items-center gap-4`}>
        <div
          className={`flex-shrink-0 w-12 h-12 rounded-2xl ${theme.iconBg} flex items-center justify-center shadow-lg ring-4 ${theme.iconRing}`}
        >
          <Music className="h-6 w-6" />
        </div>
        <div>
          <h2 className="font-bold text-lg">听力音频</h2>
          <p className="text-xs text-muted">
            在线试听 · {levelName} · {exam.year}年{exam.month}月 · 第{exam.setLabel}套
          </p>
        </div>
      </div>

      {/* 播放器 */}
      <div className="px-6 py-5">
        <audio controls className="w-full" preload="metadata">
          <source src={audioMp3} type="audio/mpeg" />
        </audio>
      </div>

      {/* 下载 */}
      <div className={`px-6 pb-6 flex flex-col sm:flex-row sm:items-center gap-3`}>
        <a
          href={audioMp3}
          download={audioDlName}
          className={`inline-flex items-center justify-center gap-2.5 px-6 py-3 ${theme.btn} rounded-2xl text-sm font-semibold transition-all shadow-lg shadow-[#ffcd68]/45 dark:shadow-black/30 hover:shadow-xl active:scale-[0.97]`}
        >
          <Download className="h-4 w-4" />
          下载 MP3
        </a>
        <span className="text-[11px] text-muted font-mono break-all leading-relaxed">
          {audioDlName}
        </span>
      </div>
    </section>
  );
}

// ─── 真题 / 答案解析 下载卡片 ─────────────────────────────

function DownloadCard({
  type,
  levelName,
  exam,
  pdf,
  downloadName,
  theme,
}: {
  type: "exam" | "answer";
  levelName: string;
  exam: ExamInfo;
  pdf: string;
  downloadName: string;
  theme: (typeof themes)["orange"];
}) {
  const isExam = type === "exam";
  const titleLabel = isExam ? "真题试卷" : "答案解析";
  const subtitle = isExam
    ? `${exam.year}年${exam.month}月 · 第${exam.setLabel}套 · 大学英语${levelName}真题`
    : `${exam.year}年${exam.month}月 · 第${exam.setLabel}套 · 大学英语${levelName}解析`;
  const iconEl = isExam ? (
    <FileText className="h-6 w-6" />
  ) : (
    <BookOpen className="h-6 w-6" />
  );

  return (
    <section
      className={`rounded-3xl border ${theme.border} bg-gradient-to-br ${theme.bg} overflow-hidden shadow-md`}
    >
      {/* ── 艺术字标题区 ── */}
      <div className="relative px-6 pt-8 pb-4 text-center overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <span
            className={`text-[8rem] md:text-[10rem] font-black opacity-[0.03] dark:opacity-[0.05] tracking-widest`}
            style={{ fontFamily: "serif" }}
          >
            {isExam ? "EXAM" : "ANSWER"}
          </span>
        </div>

        {/* 主标题 — 艺术字效果 */}
        <h2 className="relative">
          <span
            className={`
              inline-block text-4xl md:text-5xl font-black tracking-[0.3em]
              bg-gradient-to-r ${theme.textGradient} bg-clip-text text-transparent
              drop-shadow-sm
            `}
            style={{
              textShadow: isExam
                ? "0 2px 4px rgba(217,147,12,0.16)"
                : "0 2px 4px rgba(240,140,0,0.18)",
            }}
          >
            {titleLabel}
          </span>
        </h2>

        {/* 副标题 */}
        <p className="relative mt-2 text-xs text-muted tracking-wide">
          {subtitle}
        </p>

        {/* 装饰线 */}
        <div className="relative mt-4 flex items-center justify-center gap-2">
          <div className={`h-0.5 w-8 rounded-full ${theme.accent} opacity-40`} />
          <div className={`h-1.5 w-1.5 rounded-full ${theme.accent}`} />
          <div className={`h-0.5 w-8 rounded-full ${theme.accent} opacity-40`} />
        </div>
      </div>

      {/* ── 下载操作区 ── */}
      <div className="px-6 pb-7 flex flex-col items-center gap-4">
        {/* 下载按钮 */}
        <a
          href={pdf}
          download={downloadName}
          className={`
            inline-flex items-center justify-center gap-3 px-8 py-4
            ${theme.btn} rounded-2xl
            text-base font-bold
            transition-all shadow-lg active:scale-[0.97]
            hover:shadow-xl
            ${isExam ? "shadow-[#ffcd68]/45 dark:shadow-black/30" : "shadow-[#f08c00]/30 dark:shadow-black/30"}
          `}
        >
          <Download className="h-5 w-5" />
          下载{titleLabel} PDF
        </a>

        {/* 文件名 */}
        <span className="text-[11px] text-muted font-mono text-center break-all leading-relaxed max-w-full">
          {downloadName}
        </span>
      </div>
    </section>
  );
}

// ─── 对称分隔线 ───────────────────────────────────────────

function Divider() {
  return (
    <div className="flex items-center justify-center gap-3 py-3 select-none">
      <div className="h-px flex-1 bg-border" />
      <div className="flex items-center gap-2">
        <div className="h-1 w-1 rounded-full bg-[#ffe9b8] dark:bg-[#4a3d22]" />
        <div className="h-1.5 w-1.5 rounded-full bg-[#ffcd68] dark:bg-[#8a6f2a]" />
        <div className="h-1 w-1 rounded-full bg-[#ffe9b8] dark:bg-[#4a3d22]" />
      </div>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
