"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ListChecks,
  Loader2,
  RotateCcw,
  Send,
  Trophy,
  X,
} from "lucide-react";
import { withBasePath } from "@/lib/base-path";
import {
  examKey,
  gradeExam,
  loadExamBank,
  sectionsOf,
  type BankQuestion,
  type ExamBank,
  type ExamMeta,
  type ScoreBreakdown,
  type SectionDef,
} from "@/lib/bank";
import { addAttempt, addMistakes, clearProgress, getProgress, saveProgress } from "@/lib/practice-store";
import { QuestionCard, type ReviewState } from "@/components/practice/question-card";
import { ClozePanel, MatchingPanel, ReadingPanel } from "@/components/practice/passages";
import { cn } from "@/lib/utils";

type Answers = Record<string, string>;

function fmtTime(sec: number): string {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(r)}` : `${pad(m)}:${pad(r)}`;
}

export default function QuizRunner({ meta }: { meta: ExamMeta }) {
  const id = examKey(meta.level, meta.id);
  const [bank, setBank] = useState<ExamBank | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [flagged, setFlagged] = useState<number[]>([]);
  const [graded, setGraded] = useState(false);
  const [restored, setRestored] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  const startRef = useRef(Date.now());
  const baseRef = useRef(0);

  useEffect(() => {
    let alive = true;
    loadExamBank(meta.level, meta.id)
      .then((b) => {
        if (alive) setBank(b);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      alive = false;
    };
  }, [meta.level, meta.id]);

  useEffect(() => {
    const p = getProgress(id);
    if (p) {
      setAnswers(p.answers ?? {});
      setFlagged(p.flagged ?? []);
      setGraded(!!p.graded);
      baseRef.current = p.elapsedMs ? Math.floor(p.elapsedMs / 1000) : 0;
    }
    startRef.current = Date.now();
    setRestored(true);
  }, [id]);

  const liveElapsed = useCallback(
    () => baseRef.current + Math.floor((Date.now() - startRef.current) / 1000),
    []
  );

  useEffect(() => {
    if (graded || !restored) return;
    const t = window.setInterval(() => setElapsed(liveElapsed()), 1000);
    return () => window.clearInterval(t);
  }, [graded, restored, liveElapsed]);

  useEffect(() => {
    if (!restored) return;
    const secs = graded ? elapsed : liveElapsed();
    saveProgress(id, {
      answers,
      flagged,
      startedAt: startRef.current,
      updatedAt: Date.now(),
      elapsedMs: secs * 1000,
      graded,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, flagged, graded, id, restored]);

  const sections = useMemo(() => (bank ? sectionsOf(bank) : []), [bank]);

  const review = useMemo(() => {
    if (!bank || !graded) return null;
    const m = new Map<number, ReviewState>();
    for (const q of bank.questions) {
      const my = answers[String(q.no)];
      m.set(q.no, { my, correct: !!my && my.toUpperCase() === q.answer.toUpperCase() });
    }
    return m;
  }, [bank, graded, answers]);

  const breakdown = useMemo<ScoreBreakdown | null>(
    () => (bank && graded ? gradeExam(bank, answers) : null),
    [bank, graded, answers]
  );

  const answeredCount = bank ? bank.questions.filter((q) => answers[String(q.no)]).length : 0;
  const total = bank?.questions.length ?? 0;

  function pick(no: number, letter: string) {
    if (graded) return;
    setAnswers((prev) => {
      const next = { ...prev };
      if (!letter) delete next[String(no)];
      else next[String(no)] = letter;
      return next;
    });
  }

  function toggleFlag(no: number) {
    setFlagged((prev) => (prev.includes(no) ? prev.filter((n) => n !== no) : [...prev, no]));
  }

  function submit() {
    if (!bank || graded) return;
    const res = gradeExam(bank, answers);
    const wrong = bank.questions
      .filter((q) => {
        const my = answers[String(q.no)];
        return !!my && my.toUpperCase() !== q.answer.toUpperCase();
      })
      .map((q) => ({ no: q.no, my: answers[String(q.no)] }));
    addMistakes(bank.level, bank.id, wrong);
    addAttempt({
      key: id,
      level: bank.level,
      testId: bank.id,
      title: meta.title,
      at: Date.now(),
      correct: res.correct,
      answered: res.answered,
      total: res.total,
      score: res.score,
      max: res.max,
      durationMs: liveElapsed() * 1000,
      mistakes: wrong.map((w) => w.no),
    });
    setElapsed(liveElapsed());
    setGraded(true);
    setSheetOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function redo() {
    setAnswers({});
    setFlagged([]);
    setGraded(false);
    baseRef.current = 0;
    startRef.current = Date.now();
    setElapsed(0);
    clearProgress(id);
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-danger/40 bg-danger/5 p-6 text-sm text-danger">
        <AlertCircle className="mb-2 h-5 w-5" />
        <p>题库加载失败：{error}</p>
        <p className="mt-2 text-muted">请确认 {withBasePath(`/bank/${id}.json`)} 可以正常访问，然后刷新页面重试。</p>
      </div>
    );
  }

  if (!bank) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-white p-10 text-sm text-muted dark:bg-slate-800">
        <Loader2 className="h-4 w-4 animate-spin" /> 正在载入题库…
      </div>
    );
  }

  const audioSrc = meta.hasAudio ? withBasePath(`/library/${meta.level}/${meta.id}/listening.mp3`) : null;

  return (
    <div className="pb-24 lg:pb-0">
      {/* 顶栏 */}
      <div className="sticky top-16 z-30 -mx-4 mb-4 border-b border-border bg-white/85 px-4 py-2 backdrop-blur dark:bg-slate-900/85">
        <div className="container mx-auto flex max-w-7xl items-center gap-3">
          <Link href="/practice" className="rounded-lg p-1.5 text-muted hover:text-foreground" title="返回题库">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {meta.level === "cet4" ? "四级" : "六级"} · {meta.title}
              {meta.readingOnly ? "（阅读部分）" : ""}
            </p>
            <p className="text-xs text-muted">
              已答 {answeredCount}/{total}
              {flagged.length > 0 ? ` · 标记 ${flagged.length}` : ""}
            </p>
          </div>
          <span className="hidden items-center gap-1 text-sm text-muted sm:flex">
            <Clock className="h-4 w-4" /> {fmtTime(elapsed)}
          </span>
          {!graded ? (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground lg:hidden"
            >
              答题卡
            </button>
          ) : (
            <button
              type="button"
              onClick={redo}
              className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground"
            >
              <RotateCcw className="h-4 w-4" /> 重做
            </button>
          )}
          {!graded && (
            <button
              type="button"
              onClick={submit}
              className="btn-press hidden items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover lg:flex"
            >
              <Send className="h-4 w-4" /> 交卷
            </button>
          )}
        </div>
      </div>

      <div className="container mx-auto flex max-w-7xl gap-6 px-4">
        <div className="min-w-0 flex-1 space-y-8">
          {breakdown && (
            <ScorePanel
              meta={meta}
              breakdown={breakdown}
              bank={bank}
              answers={answers}
              elapsed={elapsed}
              onRedo={redo}
            />
          )}

          {sections.map((s) => (
            <SectionBlock
              key={s.key}
              section={s}
              bank={bank}
              answers={answers}
              onPick={pick}
              review={review}
              flagged={flagged}
              onToggleFlag={toggleFlag}
              audioSrc={s.key === "listening" ? audioSrc : null}
              graded={graded}
            />
          ))}

          {!graded && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-white p-6 dark:bg-slate-800">
              <p className="text-sm text-muted">
                已答 {answeredCount}/{total} 题。交卷后可以查看得分、逐题解析，错题会自动进入错题本。
              </p>
              <button
                type="button"
                onClick={submit}
                className="btn-press flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 font-medium text-white hover:bg-primary-hover"
              >
                <Send className="h-4 w-4" /> 交卷并查看结果
              </button>
            </div>
          )}
        </div>

        {/* 桌面答题卡 */}
        <aside className="hidden w-72 shrink-0 lg:block">
          <AnswerSheet
            bank={bank}
            sections={sections}
            answers={answers}
            flagged={flagged}
            review={review}
            elapsed={elapsed}
            onSubmit={submit}
            onRedo={redo}
            graded={graded}
          />
        </aside>
      </div>

      {/* 移动端答题卡抽屉 */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="flex-1 bg-black/40" onClick={() => setSheetOpen(false)} />
          <div className="w-80 max-w-[85%] overflow-y-auto bg-background p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold text-foreground">答题卡</span>
              <button type="button" onClick={() => setSheetOpen(false)} className="p-1 text-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <AnswerSheet
              bank={bank}
              sections={sections}
              answers={answers}
              flagged={flagged}
              review={review}
              elapsed={elapsed}
              onSubmit={submit}
              onRedo={redo}
              graded={graded}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SectionBlock({
  section,
  bank,
  answers,
  onPick,
  review,
  flagged,
  onToggleFlag,
  audioSrc,
  graded,
}: {
  section: SectionDef;
  bank: ExamBank;
  answers: Answers;
  onPick: (no: number, letter: string) => void;
  review: Map<number, ReviewState> | null;
  flagged: number[];
  onToggleFlag: (no: number) => void;
  audioSrc: string | null;
  graded: boolean;
}) {
  const qs = bank.questions.filter((q) => q.no >= section.from && q.no <= section.to);
  if (!qs.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
        <h2 className="text-lg font-bold text-foreground">{section.label}</h2>
        <span className="text-xs text-muted">
          第 {section.from}-{section.to} 题
        </span>
      </div>
      {section.hint && <p className="text-xs text-muted">{section.hint}</p>}

      {audioSrc && (
        <div className="rounded-2xl border border-border bg-white p-4 dark:bg-slate-800">
          <p className="mb-2 text-sm font-medium text-foreground">听力音频（点击播放，可拖动进度条反复听）</p>
          <audio controls preload="none" className="w-full" src={audioSrc} />
        </div>
      )}

      {section.key === "cloze" && bank.passages.cloze && (
        <ClozePanel passage={bank.passages.cloze} answers={answers} onPick={onPick} review={review} />
      )}

      {section.key === "matching" && bank.passages.matching && (
        <MatchingPanel
          passage={bank.passages.matching}
          questions={qs}
          answers={answers}
          onPick={onPick}
          review={review}
        />
      )}

      {(section.key === "passage1" || section.key === "passage2") && bank.passages[section.key] && (
        <ReadingPanel title={section.label} text={bank.passages[section.key]!.text} />
      )}

      {/* 听力：按题组说明分组 */}
      {section.key === "listening" && <ListeningGroups questions={qs} answers={answers} onPick={onPick} review={review} flagged={flagged} onToggleFlag={onToggleFlag} />}

      {/* 仔细阅读：逐题 */}
      {(section.key === "passage1" || section.key === "passage2") &&
        qs.map((q) => (
          <QuestionCard
            key={q.no}
            q={q}
            value={answers[String(q.no)]}
            onChange={(l) => onPick(q.no, l)}
            review={review?.get(q.no) ?? null}
            flagged={flagged.includes(q.no)}
            onToggleFlag={() => onToggleFlag(q.no)}
          />
        ))}

      {/* 选词填空：交卷后逐空展示正解 */}
      {section.key === "cloze" && graded && (
        <div className="space-y-2">
          {qs.map((q) => (
            <QuestionCard
              key={q.no}
              q={q}
              value={answers[String(q.no)]}
              review={review?.get(q.no) ?? null}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ListeningGroups({
  questions,
  answers,
  onPick,
  review,
  flagged,
  onToggleFlag,
}: {
  questions: BankQuestion[];
  answers: Answers;
  onPick: (no: number, letter: string) => void;
  review: Map<number, ReviewState> | null;
  flagged: number[];
  onToggleFlag: (no: number) => void;
}) {
  const groups: { note: string; items: BankQuestion[] }[] = [];
  for (const q of questions) {
    const note = q.groupNote ?? "";
    const last = groups[groups.length - 1];
    if (last && last.note === note) last.items.push(q);
    else groups.push({ note, items: [q] });
  }

  return (
    <div className="space-y-4">
      {groups.map((g, i) => (
        <div key={i} className="space-y-3">
          {g.note && (
            <p className="rounded-xl bg-primary-soft/60 px-3 py-2 text-xs text-primary">
              {g.note.replace(/\.$/, "")}
            </p>
          )}
          {g.items.map((q) => (
            <QuestionCard
              key={q.no}
              q={q}
              value={answers[String(q.no)]}
              onChange={(l) => onPick(q.no, l)}
              review={review?.get(q.no) ?? null}
              flagged={flagged.includes(q.no)}
              onToggleFlag={() => onToggleFlag(q.no)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function AnswerSheet({
  bank,
  sections,
  answers,
  flagged,
  review,
  elapsed,
  onSubmit,
  onRedo,
  graded,
}: {
  bank: ExamBank;
  sections: SectionDef[];
  answers: Answers;
  flagged: number[];
  review: Map<number, ReviewState> | null;
  elapsed: number;
  onSubmit: () => void;
  onRedo: () => void;
  graded: boolean;
}) {
  const answered = bank.questions.filter((q) => answers[String(q.no)]).length;
  const pct = bank.questions.length ? Math.round((answered / bank.questions.length) * 100) : 0;

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-white p-4 dark:bg-slate-800 lg:sticky lg:top-32">
      <div>
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-semibold text-foreground">答题卡</span>
          <span className="text-muted">
            {answered}/{bank.questions.length}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted">
          <Clock className="h-3 w-3" /> 用时 {fmtTime(elapsed)}
        </p>
      </div>

      {sections.map((s) => {
        const qs = bank.questions.filter((q) => q.no >= s.from && q.no <= s.to);
        if (!qs.length) return null;
        return (
          <div key={s.key}>
            <p className="mb-1.5 text-xs font-medium text-muted">{s.short}</p>
            <div className="grid grid-cols-7 gap-1.5">
              {qs.map((q) => {
                const st = review?.get(q.no);
                const done = !!answers[String(q.no)];
                return (
                  <a
                    key={q.no}
                    href={`#q${q.no}`}
                    className={cn(
                      "flex h-7 items-center justify-center rounded-md text-xs font-medium transition-colors",
                      st
                        ? st.correct
                          ? "bg-success/15 text-success"
                          : done
                            ? "bg-danger/15 text-danger"
                            : "bg-slate-100 text-muted dark:bg-slate-700"
                        : done
                          ? "bg-primary text-white"
                          : "bg-slate-100 text-muted hover:bg-primary-soft dark:bg-slate-700",
                      flagged.includes(q.no) && "ring-2 ring-amber-400"
                    )}
                  >
                    {q.no}
                  </a>
                );
              })}
            </div>
          </div>
        );
      })}

      {!graded ? (
        <button
          type="button"
          onClick={onSubmit}
          className="btn-press flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-medium text-white hover:bg-primary-hover"
        >
          <Send className="h-4 w-4" /> 交卷
        </button>
      ) : (
        <button
          type="button"
          onClick={onRedo}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 font-medium text-foreground hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <RotateCcw className="h-4 w-4" /> 重新作答
        </button>
      )}
      <p className="flex items-start gap-1.5 text-xs text-muted">
        <ListChecks className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        答题进度自动保存在本机浏览器，关闭页面后回来可以继续。
      </p>
    </div>
  );
}

function ScorePanel({
  meta,
  breakdown,
  bank,
  answers,
  elapsed,
  onRedo,
}: {
  meta: ExamMeta;
  breakdown: ScoreBreakdown;
  bank: ExamBank;
  answers: Answers;
  elapsed: number;
  onRedo: () => void;
}) {
  const wrong = bank.questions.filter((q) => {
    const my = answers[String(q.no)];
    return !my || my.toUpperCase() !== q.answer.toUpperCase();
  });
  const rate = breakdown.total ? Math.round((breakdown.correct / breakdown.total) * 100) : 0;

  return (
    <div className="animate-fade-in-up space-y-4 rounded-2xl border border-primary/30 bg-primary-soft/40 p-5">
      <div className="flex flex-wrap items-center gap-4">
        <Trophy className="h-8 w-8 text-primary" />
        <div>
          <p className="text-sm text-muted">{meta.level === "cet4" ? "四级" : "六级"} · {meta.title}</p>
          <p className="text-2xl font-bold text-foreground">
            {breakdown.score}
            <span className="text-base font-normal text-muted"> / {breakdown.max} 分</span>
          </p>
          <p className="text-xs text-muted">客观题估分（写作与翻译为主观题，不计入自动判分）</p>
        </div>
        <div className="ml-auto grid grid-cols-3 gap-4 text-center">
          <Stat label="正确率" value={`${rate}%`} />
          <Stat label="答对" value={`${breakdown.correct}/${breakdown.total}`} />
          <Stat label="用时" value={fmtTime(elapsed)} />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {breakdown.bySection.map((s) => (
          <div key={s.key} className="rounded-xl border border-border bg-white p-3 dark:bg-slate-800">
            <p className="text-xs text-muted">{s.label}</p>
            <p className="text-lg font-semibold text-foreground">
              {s.correct}
              <span className="text-sm font-normal text-muted">/{s.total}</span>
            </p>
            <p className="text-xs text-muted">
              {s.score} / {s.max} 分
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1 text-sm text-foreground">
          <CheckCircle2 className="h-4 w-4 text-success" /> 错题已自动收录到错题本
        </span>
        <Link href="/mistakes" className="text-sm font-medium text-primary hover:underline">
          去错题本查看 →
        </Link>
        <button type="button" onClick={onRedo} className="ml-auto text-sm text-muted hover:text-foreground">
          重做本卷
        </button>
      </div>

      {wrong.length > 0 && (
        <details className="rounded-xl border border-border bg-white p-3 dark:bg-slate-800">
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            本次答错/未答的 {wrong.length} 题
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {wrong.map((q) => (
              <a
                key={q.no}
                href={`#q${q.no}`}
                className="rounded-md bg-danger/10 px-2 py-1 text-xs text-danger hover:bg-danger/20"
              >
                {q.no}（你的：{answers[String(q.no)] ?? "未答"} / 正确：{q.answer}）
              </a>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
