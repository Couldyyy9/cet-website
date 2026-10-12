"use client";

import { Languages, PenLine } from "lucide-react";
import type { PaperTranslation, PaperWriting } from "@/lib/bank";

/* ------------------------------------------------------------------ *
 * 主观题（写作 / 翻译）：只提供题目，不判分、不给范文
 * ------------------------------------------------------------------ */

function Head({
  part,
  title,
  minutes,
  icon,
}: {
  part: string;
  title: string;
  minutes?: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
        {icon}
      </span>
      <h2 className="text-lg font-bold text-foreground">
        <span className="mr-1.5 text-xs font-semibold text-primary-strong">{part}</span>
        {title}
      </h2>
      <span className="inline-flex items-center rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-semibold text-primary-strong">
        {minutes ? `${minutes} 分钟 · ` : ""}不计分 · 仅提供题目
      </span>
    </div>
  );
}

export function WritingCard({ data }: { data: PaperWriting }) {
  return (
    <section
      id="part-writing"
      className="scroll-mt-24 rounded-3xl border border-border bg-white p-5 shadow-sm dark:bg-[#211c14] sm:p-6"
    >
      <Head part="Part I" title="写作" minutes={data.minutes ?? 30} icon={<PenLine className="h-5 w-5" />} />
      <p className="text-[15px] leading-8 text-foreground">{data.directions}</p>
      {data.sentence ? (
        <p className="mt-4 rounded-2xl border border-primary/40 bg-[#fffaf0] px-4 py-3 text-sm leading-7 text-foreground dark:bg-[#2a2318]">
          <span className="mr-1.5 rounded bg-primary-soft px-1.5 py-0.5 text-[11px] font-semibold text-primary-strong">
            开头句
          </span>
          作文必须以这句话开头：<b className="font-semibold">“{data.sentence}”</b>
        </p>
      ) : null}
      <p className="mt-4 text-xs leading-6 text-muted">
        主观题不参与自动判分，交卷后不会计入得分；写作范文与点评请查看该套试卷的答案 PDF。
      </p>
    </section>
  );
}

export function TranslationCard({ data }: { data: PaperTranslation }) {
  return (
    <section
      id="part-translation"
      className="scroll-mt-24 rounded-3xl border border-border bg-white p-5 shadow-sm dark:bg-[#211c14] sm:p-6"
    >
      <Head
        part="Part IV"
        title="翻译"
        minutes={data.minutes ?? 30}
        icon={<Languages className="h-5 w-5" />}
      />
      <p className="mb-3 text-sm leading-7 text-foreground">
        把下面这段中文译成英文，答案写在答题卡 2 上。
      </p>
      <div className="rounded-2xl border border-primary/30 bg-[#fffaf0] px-4 py-3.5 text-[15px] leading-8 text-foreground dark:bg-[#2a2318]">
        {data.text}
      </div>
      <p className="mt-4 text-xs leading-6 text-muted">
        主观题不参与自动判分，交卷后不会计入得分；参考译文请查看该套试卷的答案 PDF。
      </p>
    </section>
  );
}
