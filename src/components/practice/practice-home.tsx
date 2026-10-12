"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AudioLines, BookOpenCheck, CheckCircle2, ClipboardList, FileText, Play, RotateCw } from "lucide-react";
import { ALL_BANK_EXAMS, examKey, type ExamMeta, type Level } from "@/lib/bank";
import { useHistory, usePracticeStats } from "@/lib/practice-store";
import { cn } from "@/lib/utils";

const LEVELS: { value: Level; label: string; desc: string }[] = [
  { value: "cet4", label: "英语四级 CET-4", desc: "2024年6月 – 2025年12月" },
  { value: "cet6", label: "英语六级 CET-6", desc: "2024年6月 – 2025年12月" },
];

export default function PracticeHome() {
  const [level, setLevel] = useState<Level>("cet4");
  const history = useHistory();
  const stats = usePracticeStats();

  const exams = useMemo(
    () =>
      ALL_BANK_EXAMS.filter((e) => e.level === level).sort(
        (a, b) => b.year - a.year || b.month - a.month || a.set.localeCompare(b.set)
      ),
    [level]
  );

  const attemptOf = (e: ExamMeta) => history.find((h) => h.key === examKey(e.level, e.id));

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">在线做题</h1>
        <p className="text-muted">
          覆盖 2024 年 6 月 – 2025 年 12 月的四六级真题（共 {ALL_BANK_EXAMS.length} 套、
          {ALL_BANK_EXAMS.reduce((n, e) => n + e.counts.total, 0)} 道客观题）：听力、选词填空、长篇匹配、仔细阅读都能在线作答，
          交卷后自动判分、逐题解析，错题自动进入错题本。
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<ClipboardList className="h-4 w-4" />} label="题库套数" value={`${ALL_BANK_EXAMS.length} 套`} />
          <StatCard
            icon={<BookOpenCheck className="h-4 w-4" />}
            label="题目总数"
            value={`${ALL_BANK_EXAMS.reduce((n, e) => n + e.counts.total, 0)} 题`}
          />
          <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="已完成" value={`${stats.answeredExams} 套`} />
          <StatCard icon={<FileText className="h-4 w-4" />} label="错题本" value={`${stats.mistakes} 题`} />
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        {LEVELS.map((l) => (
          <button
            key={l.value}
            type="button"
            onClick={() => setLevel(l.value)}
            className={cn(
              "rounded-xl border px-4 py-2 text-left transition-colors",
              level === l.value
                ? "border-primary bg-primary-soft text-foreground"
                : "border-border bg-white text-muted hover:border-primary/50 dark:bg-[#211c14]"
            )}
          >
            <span className="block text-sm font-semibold">{l.label}</span>
            <span className="block text-xs text-muted">{l.desc}</span>
          </button>
        ))}
        <Link href="/mistakes" className="ml-auto text-sm font-medium text-primary-strong hover:underline">
          查看错题本（{stats.mistakes}）→
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {exams.map((e) => {
          const a = attemptOf(e);
          return (
            <div
              key={examKey(e.level, e.id)}
              className="flex flex-col rounded-2xl border border-border bg-white p-4 transition-shadow hover:shadow-md dark:bg-[#211c14]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-foreground">{e.title}</h2>
                  <p className="mt-0.5 text-xs text-muted">
                    {e.counts.total} 题 · 听力 {e.counts.listening || "—"} · 阅读 {e.counts.total - e.counts.listening}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {e.hasAudio && (
                    <span className="flex items-center gap-1 rounded-md bg-primary-soft px-1.5 py-0.5 text-[11px] text-primary-strong">
                      <AudioLines className="h-3 w-3" /> 含音频
                    </span>
                  )}
                  {e.readingOnly && (
                    <span className="rounded-md bg-[#fff1d6] px-1.5 py-0.5 text-[11px] text-[#a8700f] dark:bg-[#3a2a10]/60 dark:text-[#ffd97d]">
                      阅读部分
                    </span>
                  )}
                </div>
              </div>

              {a && (
                <p className="mt-3 rounded-lg bg-[#fffaf0] px-2 py-1.5 text-xs text-muted dark:bg-[#191510]">
                  上次：{a.correct}/{a.total} 题 · {a.score}/{a.max} 分
                  {" · "}
                  {new Date(a.at).toLocaleDateString("zh-CN")}
                </p>
              )}

              <div className="mt-4 flex items-center gap-2">
                <Link
                  href={`/practice/${e.level}/${e.id}`}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium",
                    a
                      ? "border border-[#ffcd68]/60 bg-[#fff6e3] text-[#a8700f] hover:bg-[#ffedc4]"
                      : "bg-primary text-primary-foreground hover:bg-primary-hover"
                  )}
                >
                  {a ? <RotateCw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {a ? "再练一次" : "开始做题"}
                </Link>
                <Link
                  href={`/library/${e.level}/${e.id}`}
                  className="rounded-xl border border-border px-3 py-2 text-sm text-muted hover:text-foreground"
                  title="查看原卷 PDF 与答案"
                >
                  原卷
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <p className="rounded-2xl border border-border bg-white p-4 text-xs leading-6 text-muted dark:bg-[#211c14]">
        说明：在线题库只收录能可靠提取答案表的试卷（2024 年 6 月起）。2019–2023 年的真题为扫描版、卷面没有答案速查表，
        暂不提供在线判分，仍可在「四级真题 / 六级真题」中下载 PDF 与答案自行练习。所有答题进度与错题记录都保存在本机浏览器
        （localStorage），不上传服务器；清除浏览器数据会一并清除记录。
      </p>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-3 dark:bg-[#211c14]">
      <p className="flex items-center gap-1.5 text-xs text-muted">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
