"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { BankQuestion, ClozePassage, MatchingPassage } from "@/lib/bank";
import { stripNumber, type ReviewState } from "@/components/practice/question-card";

/** PDF 文字层是硬换行抽出来的：合并软换行，压缩多余空格。 */
export function normText(text: string): string {
  return (text || "").replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ").trim();
}

export interface PanelHandlers {
  answers: Record<string, string>;
  onPick: (no: number, letter: string) => void;
  review?: Map<number, ReviewState> | null;
}

type Token = { t: "text"; v: string } | { t: "blank"; no: number };

function splitBlanks(text: string): Token[] {
  const re = /_{2,}\s*(\d{1,2})\s*_{2,}/g;
  const parts: Token[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ t: "text", v: text.slice(last, m.index) });
    parts.push({ t: "blank", no: Number(m[1]) });
    last = re.lastIndex;
  }
  if (last < text.length) parts.push({ t: "text", v: text.slice(last) });
  return parts;
}

/** 选词填空：原文内联空格 + 词库点选 */
export function ClozePanel({ passage, answers, onPick, review }: { passage: ClozePassage } & PanelHandlers) {
  const [active, setActive] = useState<number | null>(null);
  const tokens = useMemo(() => splitBlanks(normText(passage.text)), [passage.text]);
  const blanks = passage.blanks.length ? passage.blanks : tokens.filter((t) => t.t === "blank").map((t) => (t as { no: number }).no);
  const bankLetters = Object.keys(passage.wordBank).sort();

  const usedBy = new Map<string, number>();
  for (const no of blanks) {
    const letter = answers[String(no)];
    if (letter) usedBy.set(letter, no);
  }

  function pickWord(letter: string) {
    const target = active ?? blanks.find((no) => !answers[String(no)]);
    if (target === undefined) return;
    onPick(target, letter);
    const rest = blanks.filter((no) => no !== target && !answers[String(no)]);
    setActive(rest.length ? rest[0] : null);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-white p-4 text-[15px] leading-8 dark:bg-[#211c14] sm:p-5">
        {tokens.map((tk, i) =>
          tk.t === "text" ? (
            <span key={i}>{tk.v}</span>
          ) : (
            <Blanker
              key={i}
              no={tk.no}
              value={answers[String(tk.no)]}
              review={review?.get(tk.no)}
              active={active === tk.no}
              onClick={() => {
                if (review) return;
                if (answers[String(tk.no)]) onPick(tk.no, "");
                setActive(active === tk.no ? null : tk.no);
              }}
            />
          )
        )}
      </div>

      <div className="rounded-2xl border border-border bg-white p-4 dark:bg-[#211c14]">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">词库（A-O，每个词只用一次）</h3>
          <span className="text-xs text-muted">
            {active ? `正在填第 ${active} 空` : "先点原文空格，再点单词"}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {bankLetters.map((letter) => {
            const no = usedBy.get(letter);
            const word = passage.wordBank[letter];
            const isAnswer = review ? reviewOfCloze(review, letter, passage, answers) : false;
            return (
              <button
                key={letter}
                type="button"
                disabled={!!review}
                onClick={() => pickWord(letter)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                  no
                    ? "border-primary/50 bg-primary-soft/60 text-foreground"
                    : "border-border text-foreground hover:border-primary/60 hover:bg-primary-soft/40",
                  isAnswer && "border-success bg-success/10"
                )}
              >
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  {letter}
                </span>
                <span className="flex-1">{word}</span>
                {no ? <span className="text-xs text-muted">→ {no}</span> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function reviewOfCloze(
  review: Map<number, ReviewState>,
  letter: string,
  passage: ClozePassage,
  answers: Record<string, string>
): boolean {
  for (const no of passage.blanks) {
    const st = review.get(no);
    if (st && answers[String(no)] === letter && st.correct) return true;
  }
  return false;
}

function Blanker({
  no,
  value,
  review,
  active,
  onClick,
}: {
  no: number;
  value?: string;
  review?: ReviewState;
  active: boolean;
  onClick: () => void;
}) {
  const state = review
    ? review.correct
      ? "ok"
      : value
        ? "bad"
        : "empty"
    : value
      ? "filled"
      : "empty";
  return (
    <button
      type="button"
      id={`q${no}`}
      onClick={onClick}
      title={review ? `第 ${no} 空` : `点击选择第 ${no} 空`}
      className={cn(
        "mx-1 inline-flex h-7 min-w-11 scroll-mt-24 items-center justify-center rounded-lg border px-2 align-middle text-sm font-semibold transition-colors",
        state === "ok" && "border-success bg-success/15 text-success",
        state === "bad" && "border-danger bg-danger/15 text-danger",
        state === "filled" && "border-primary bg-primary-soft text-primary-strong",
        state === "empty" && "border-dashed border-slate-300 text-muted hover:border-primary dark:border-slate-600",
        active && "ring-2 ring-primary/50"
      )}
    >
      {value ? value : no}
    </button>
  );
}

/** 长篇匹配：段落列表 + 陈述选择段落字母 */
export function MatchingPanel({
  passage,
  questions,
  answers,
  onPick,
  review,
}: { passage: MatchingPassage; questions: BankQuestion[] } & PanelHandlers) {
  const [open, setOpen] = useState(true);
  const letters = passage.letters.length ? passage.letters : Object.keys(passage.paragraphs).sort();

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-white dark:bg-[#211c14]">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-foreground"
        >
          <span>段落原文（{letters.length} 段）</span>
          <span className="text-xs text-muted">{open ? "收起 ▲" : "展开 ▼"}</span>
        </button>
        {open && (
          <div className="max-h-[26rem] space-y-3 overflow-y-auto border-t border-border px-4 py-4">
            {letters.map((letter) => (
              <div key={letter} className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary-soft text-xs font-bold text-primary-strong">
                  {letter}
                </span>
                <p className="text-sm leading-7 text-foreground">{normText(passage.paragraphs[letter] ?? "")}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {questions.map((q) => {
          const value = answers[String(q.no)] ?? "";
          const st = review?.get(q.no);
          return (
            <div
              key={q.no}
              id={`q${q.no}`}
              className="flex scroll-mt-24 items-start gap-3 rounded-2xl border border-border bg-white p-4 dark:bg-[#211c14]"
            >
              <span className="mt-0.5 inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft px-2 text-sm font-semibold text-primary-strong">
                {q.no}
              </span>
              <p className="flex-1 text-sm leading-7 text-foreground">{normText(stripNumber(q.stem))}</p>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <select
                  value={value}
                  disabled={!!review}
                  onChange={(e) => onPick(q.no, e.target.value)}
                  className={cn(
                    "h-9 w-24 rounded-lg border bg-white px-2 text-sm dark:bg-[#191510]",
                    st ? (st.correct ? "border-success text-success" : "border-danger text-danger") : "border-border"
                  )}
                >
                  <option value="">未选</option>
                  {letters.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
                {st && !st.correct && (
                  <span className="text-xs text-muted">
                    应为 <b className="text-success">{q.answer}</b>
                  </span>
                )}
                {st && st.correct && <span className="text-xs text-success">✔ 正确</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 仔细阅读文章 */
export function ReadingPanel({ title, text }: { title: string; text: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl border border-border bg-white dark:bg-[#211c14]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-foreground"
      >
        <span>{title}</span>
        <span className="text-xs text-muted">{open ? "收起 ▲" : "展开 ▼"}</span>
      </button>
      {open && (
        <div className="max-h-[30rem] overflow-y-auto border-t border-border px-4 py-4">
          <p className="text-sm leading-8 text-foreground">{normText(text)}</p>
        </div>
      )}
    </div>
  );
}
