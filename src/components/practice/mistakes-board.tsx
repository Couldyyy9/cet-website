"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BookX, Check, ChevronDown, Loader2, RotateCcw, Trash2, Undo2 } from "lucide-react";
import { SECTIONS, examKey, loadExamBank, type BankQuestion, type ExamBank, type Level } from "@/lib/bank";
import {
  clearMistakes,
  removeMistake,
  setMastered,
  useMistakes,
  type MistakeRecord,
} from "@/lib/practice-store";
import { QuestionCard } from "@/components/practice/question-card";
import { normText } from "@/components/practice/passages";
import { cn } from "@/lib/utils";

type LevelFilter = "all" | Level;
type StatusFilter = "all" | "todo" | "mastered";

const LEVEL_TABS: { value: LevelFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "cet4", label: "四级" },
  { value: "cet6", label: "六级" },
];

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "todo", label: "未掌握" },
  { value: "mastered", label: "已掌握" },
];

/** 取选词填空空位前后的原文片段，便于复习上下文。 */
function clozeContext(bank: ExamBank, no: number): string | null {
  const raw = bank.passages.cloze?.text;
  if (!raw) return null;
  const text = normText(raw);
  const re = new RegExp(`_{2,}\\s*${no}\\s*_{2,}`);
  const m = re.exec(text);
  if (!m) return null;
  const start = Math.max(0, m.index - 130);
  const end = Math.min(text.length, m.index + m[0].length + 130);
  return `${start > 0 ? "…" : ""}${text.slice(start, m.index)}______${text.slice(m.index + m[0].length, end)}${end < text.length ? "…" : ""}`;
}

function sectionLabelOf(q: BankQuestion | undefined): string {
  if (!q) return "其他";
  if (q.part === "listening") return "听力";
  const key = q.kind === "cloze" ? "cloze" : q.kind === "matching" ? "matching" : (q.passage ?? "passage1");
  return SECTIONS.find((s) => s.key === key)?.short ?? "阅读";
}

export default function MistakesBoard() {
  const mistakes = useMistakes();
  const [level, setLevel] = useState<LevelFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [section, setSection] = useState<string>("all");
  const [banks, setBanks] = useState<Record<string, ExamBank | null>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const requested = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const m of mistakes) {
      const key = examKey(m.level, m.testId);
      if (requested.current.has(key)) continue;
      requested.current.add(key);
      loadExamBank(m.level, m.testId)
        .then((b) => setBanks((prev) => ({ ...prev, [key]: b })))
        .catch(() => setBanks((prev) => ({ ...prev, [key]: null })));
    }
  }, [mistakes]);

  const rows = useMemo(() => {
    return mistakes
      .map((m) => {
        const key = examKey(m.level, m.testId);
        const bank = banks[key] ?? undefined;
        const q = bank?.questions.find((x) => x.no === m.no);
        return { m, bank, q, key };
      })
      .filter((r) => (level === "all" ? true : r.m.level === level))
      .filter((r) => (status === "all" ? true : status === "mastered" ? r.m.mastered : !r.m.mastered))
      .filter((r) => (section === "all" ? true : sectionLabelOf(r.q) === section));
  }, [mistakes, banks, level, status, section]);

  const grouped = useMemo(() => {
    const map = new Map<string, { key: string; m: MistakeRecord; bank?: ExamBank; q?: BankQuestion }[]>();
    for (const r of rows) {
      const list = map.get(r.key) ?? [];
      list.push(r);
      map.set(r.key, list);
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      bank: items[0]?.bank,
      meta: items[0]?.m,
      items,
    }));
  }, [rows]);

  const todo = mistakes.filter((m) => !m.mastered).length;
  const done = mistakes.length - todo;
  const loading = mistakes.length > 0 && Object.keys(banks).length === 0;

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">错题本</h1>
        <p className="text-muted">
          自动收集在线做题时答错的题目。记录保存在本机浏览器，可以标记「已掌握」、移除单题，或回到原卷重做。
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="错题总数" value={`${mistakes.length} 题`} />
          <Stat label="未掌握" value={`${todo} 题`} />
          <Stat label="已掌握" value={`${done} 题`} />
          <Stat label="涉及试卷" value={`${new Set(mistakes.map((m) => examKey(m.level, m.testId))).size} 套`} />
        </div>
      </header>

      {mistakes.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <TabGroup tabs={LEVEL_TABS} value={level} onChange={(v) => setLevel(v as LevelFilter)} />
          <TabGroup tabs={STATUS_TABS} value={status} onChange={(v) => setStatus(v as StatusFilter)} />
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="h-9 rounded-xl border border-border bg-white px-2 text-sm text-foreground dark:bg-slate-800"
          >
            <option value="all">全部题型</option>
            {SECTIONS.map((s) => (
              <option key={s.key} value={s.short}>
                {s.short}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("确定要清空全部错题记录吗？该操作不可撤销。")) clearMistakes();
            }}
            className="ml-auto flex items-center gap-1 rounded-xl border border-danger/40 px-3 py-1.5 text-sm text-danger hover:bg-danger/5"
          >
            <Trash2 className="h-4 w-4" /> 清空
          </button>
        </div>
      )}

      {mistakes.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-white p-10 text-center dark:bg-slate-800">
          <BookX className="h-10 w-10 text-muted" />
          <p className="text-foreground">还没有错题记录</p>
          <p className="text-sm text-muted">去「在线做题」完成一套真题，答错的题目会自动出现在这里。</p>
          <Link
            href="/practice"
            className="btn-press mt-1 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
          >
            开始做题
          </Link>
        </div>
      )}

      {loading && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> 正在载入题目…
        </p>
      )}

      {!loading && mistakes.length > 0 && rows.length === 0 && (
        <p className="rounded-2xl border border-border bg-white p-6 text-sm text-muted dark:bg-slate-800">
          当前筛选条件下没有错题。
        </p>
      )}

      {grouped.map((g) => {
        const isCollapsed = collapsed[g.key];
        const title = g.bank?.title ?? `${g.meta.level === "cet4" ? "四级" : "六级"} · ${g.meta.testId}`;
        return (
          <section key={g.key} className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
              <button
                type="button"
                onClick={() => setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] }))}
                className="flex items-center gap-1.5 text-base font-semibold text-foreground"
              >
                <ChevronDown className={cn("h-4 w-4 transition-transform", isCollapsed && "-rotate-90")} />
                {g.meta.level === "cet4" ? "四级" : "六级"} · {title}
              </button>
              <span className="text-xs text-muted">{g.items.length} 题错题</span>
              <Link
                href={`/practice/${g.meta.level}/${g.meta.testId}`}
                className="ml-auto flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                <RotateCcw className="h-3.5 w-3.5" /> 重做本卷
              </Link>
            </div>

            {!isCollapsed &&
              g.items.map(({ m, bank, q }) => {
                const context = bank && q?.kind === "cloze" ? clozeContext(bank, q.no) : null;
                return (
                  <div key={m.key} className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 pl-1 text-xs text-muted">
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 dark:bg-slate-700">
                        {sectionLabelOf(q)}
                      </span>
                      <span>答错 {m.count} 次</span>
                      <span>最近：{new Date(m.at).toLocaleDateString("zh-CN")}</span>
                      {m.mastered && (
                        <span className="rounded-md bg-success/15 px-1.5 py-0.5 text-success">已掌握</span>
                      )}
                      <span className="ml-auto flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setMastered(m.key, !m.mastered)}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          {m.mastered ? (
                            <>
                              <Undo2 className="h-3.5 w-3.5" /> 取消掌握
                            </>
                          ) : (
                            <>
                              <Check className="h-3.5 w-3.5" /> 标记已掌握
                            </>
                          )}
                        </button>
                        <Link
                          href={`/practice/${m.level}/${m.testId}#q${m.no}`}
                          className="hover:text-foreground hover:underline"
                        >
                          回到原题
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeMistake(m.key)}
                          className="hover:text-danger hover:underline"
                        >
                          移除
                        </button>
                      </span>
                    </div>

                    {context && (
                      <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-6 text-muted dark:bg-slate-900">
                        {context}
                      </p>
                    )}

                    {q ? (
                      <QuestionCard q={q} value={m.my} review={{ my: m.my, correct: false }} />
                    ) : (
                      <div className="rounded-2xl border border-border bg-white p-4 text-sm text-muted dark:bg-slate-800">
                        <p className="text-foreground">
                          第 {m.no} 题 · 你的答案 <b className="text-danger">{m.my || "未答"}</b>
                        </p>
                        <p className="mt-1 text-xs">题目原文正在载入，或该题来自其它题库。</p>
                      </div>
                    )}
                  </div>
                );
              })}
          </section>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-3 dark:bg-slate-800">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function TabGroup({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-white p-1 dark:bg-slate-800">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={cn(
            "rounded-lg px-3 py-1 text-sm transition-colors",
            value === t.value ? "bg-primary text-white" : "text-muted hover:text-foreground"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
