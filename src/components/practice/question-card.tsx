"use client";

import { BookOpenText, ChevronDown, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { hasExplain, sortedOptions, type BankQuestion, type QuestionExplain } from "@/lib/bank";

export function stripNumber(text: string): string {
  return (text || "").replace(/^\s*\d{1,2}\s*[.、]?\s*/, "").trim();
}

export interface ReviewState {
  my?: string;
  correct: boolean;
}

interface Props {
  q: BankQuestion;
  value?: string;
  onChange?: (letter: string) => void;
  review?: ReviewState | null;
  flagged?: boolean;
  onToggleFlag?: () => void;
  anchorId?: string;
  /** 逐题中文翻译与解析（折叠展示） */
  explain?: QuestionExplain | null;
}

export function QuestionCard({ q, value, onChange, review, flagged, onToggleFlag, anchorId, explain }: Props) {
  const stem = stripNumber(q.stem);
  const isListening = q.part === "listening";
  const options = sortedOptions(q.options);

  return (
    <div
      id={anchorId ?? `q${q.no}`}
      className="scroll-mt-24 rounded-2xl border border-border bg-white p-4 shadow-sm dark:bg-[#211c14] sm:p-5"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft px-2 text-sm font-semibold text-primary-strong">
            {q.no}
          </span>
          <p className="text-[15px] leading-7 text-foreground">
            {stem ||
              (isListening ? (
                <span className="text-muted">题干在听力录音中，请根据听到的内容选择答案。</span>
              ) : (
                <span className="text-muted">（本题题干未收录）</span>
              ))}
          </p>
        </div>
        {onToggleFlag && (
          <button
            type="button"
            onClick={onToggleFlag}
            title={flagged ? "取消标记" : "标记本题"}
            className={cn(
              "rounded-lg p-1.5 transition-colors",
              flagged ? "text-[#e08a00] bg-[#fff6e3] dark:bg-[#3a2a10]/50" : "text-muted hover:text-[#e08a00]"
            )}
          >
            <Flag className="h-4 w-4" fill={flagged ? "currentColor" : "none"} />
          </button>
        )}
      </div>

      {options.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map(([letter, text]) => {
            const chosen = value === letter;
            const isAnswer = review ? q.answer === letter : false;
            const isWrongPick = review ? chosen && !review.correct : false;
            return (
              <button
                key={letter}
                type="button"
                disabled={!!review}
                onClick={() => onChange?.(letter)}
                className={cn(
                  "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm leading-6 transition-colors",
                  review
                    ? isAnswer
                      ? "border-success bg-success/10 text-foreground"
                      : isWrongPick
                        ? "border-danger bg-danger/10 text-foreground"
                        : "border-border text-muted"
                    : chosen
                      ? "border-primary bg-primary-soft text-foreground"
                      : "border-border text-foreground hover:border-primary/60 hover:bg-primary-soft/40"
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                    review
                      ? isAnswer
                        ? "bg-success text-white"
                        : isWrongPick
                          ? "bg-danger text-white"
                          : "bg-[#fff1d6] text-muted dark:bg-[#3a3122]"
                      : chosen
                        ? "bg-primary text-primary-foreground"
                        : "bg-[#fff1d6] text-muted dark:bg-[#3a3122]"
                  )}
                >
                  {letter}
                </span>
                <span>{text}</span>
              </button>
            );
          })}
        </div>
      )}

      {(q.kind === "cloze" || q.kind === "matching") && (
        <div className="text-sm text-muted">
          {review ? (
            <span>
              正确答案：<b className="text-success">{q.answer}</b>
              {q.answerText ? <span className="ml-1">（{q.answerText}）</span> : null}
              {review.my ? <span className="ml-2">你的答案：<b className="text-danger">{review.my}</b></span> : null}
              {!review.my ? <span className="ml-2">未作答</span> : null}
            </span>
          ) : (
            <span>
              {q.kind === "cloze"
                ? "在原文空格处或下方答题卡中选择 A-O 的选项。"
                : "在下方为该条陈述选择所属段落字母。"}
            </span>
          )}
        </div>
      )}

      {review && hasExplain(explain) && <ExplainPanel q={q} e={explain!} />}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 折叠的「翻译与解析」：题干中文翻译 + 选项中文翻译 + 解析
 * ------------------------------------------------------------------ */

const TAG = "mr-1.5 inline-block rounded bg-primary-soft px-1.5 py-0.5 text-[11px] font-semibold text-primary-strong align-[1px]";

function ExplainPanel({ q, e }: { q: BankQuestion; e: QuestionExplain }) {
  const opts = sortedOptions(e.options ?? {});
  const showOpts = q.kind === "mcq" && opts.length > 0;
  return (
    <details className="group mt-3 overflow-hidden rounded-xl border border-border bg-[#fffdf5] dark:bg-[#241d13]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-xs font-semibold text-primary-strong transition-colors hover:bg-primary-soft/60">
        <span className="inline-flex items-center gap-1.5">
          <BookOpenText className="h-3.5 w-3.5" />
          翻译与解析
        </span>
        <span className="inline-flex items-center gap-1 text-muted">
          <span className="group-open:hidden">点击展开</span>
          <span className="hidden group-open:inline">收起</span>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="space-y-3 border-t border-border px-3 py-3 text-sm leading-7">
        {e.zh ? (
          <p className="text-foreground">
            <span className={TAG}>题干翻译</span>
            {e.zh}
          </p>
        ) : null}

        {showOpts ? (
          <div className="text-foreground">
            <span className={TAG}>选项翻译</span>
            <ul className="mt-1.5 space-y-1">
              {opts.map(([letter, text]) => (
                <li key={letter} className="flex gap-2">
                  <b className={cn("shrink-0 font-semibold", letter === q.answer ? "text-success" : "text-muted")}>
                    {letter}.
                  </b>
                  <span className={letter === q.answer ? "text-foreground" : "text-muted"}>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {e.explain ? (
          <p className="text-foreground">
            <span className={TAG}>解析</span>
            {e.explain}
          </p>
        ) : null}
      </div>
    </details>
  );
}
