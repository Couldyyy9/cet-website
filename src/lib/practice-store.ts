"use client";

import { useSyncExternalStore } from "react";
import type { Level } from "@/lib/bank";

/* ------------------------------------------------------------------ *
 * 本地存储（纯前端，无后端）：错题本 / 做题记录 / 作答进度
 * ------------------------------------------------------------------ */

const MISTAKES_KEY = "cet-practice:mistakes:v1";
const HISTORY_KEY = "cet-practice:history:v1";
const PROGRESS_KEY = "cet-practice:progress:v1";

export interface MistakeRecord {
  /** `${level}_${testId}:${no}` */
  key: string;
  level: Level;
  testId: string;
  no: number;
  /** 我选错的答案 */
  my: string;
  /** 累计答错次数 */
  count: number;
  /** 最近一次答错时间 */
  at: number;
  /** 已重做答对，标记掌握 */
  mastered: boolean;
}

export interface AttemptRecord {
  /** `${level}_${testId}` */
  key: string;
  level: Level;
  testId: string;
  title: string;
  at: number;
  correct: number;
  answered: number;
  total: number;
  score: number;
  max: number;
  durationMs: number;
  mistakes: number[];
}

export interface ExamProgress {
  answers: Record<string, string>;
  flagged: number[];
  startedAt: number;
  updatedAt: number;
  elapsedMs: number;
  /** 已经交卷（用于重开后直接看结果） */
  graded?: boolean;
}

export function recordKey(level: string, testId: string, no: number): string {
  return `${level}_${testId}:${no}`;
}

/* ------------------------------ 底层读写 ------------------------------ */

const listeners = new Set<() => void>();
const EMPTY: never[] = [];

let mistakesCache: MistakeRecord[] | null = null;
let historyCache: AttemptRecord[] | null = null;

function available(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

function read<T>(key: string, fallback: T): T {
  if (!available()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (!available()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    mistakesCache = null;
    historyCache = null;
    listeners.forEach((fn) => fn());
  } catch {
    /* 配额不足等异常：忽略，不阻塞答题 */
  }
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key.startsWith("cet-practice:")) {
      mistakesCache = null;
      historyCache = null;
      fn();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

/* ------------------------------ 错题本 ------------------------------ */

export function getMistakes(): MistakeRecord[] {
  if (!mistakesCache) {
    const raw = read<MistakeRecord[]>(MISTAKES_KEY, []);
    mistakesCache = Array.isArray(raw) ? raw.filter((m) => m && m.key) : [];
  }
  return mistakesCache;
}

export function useMistakes(): MistakeRecord[] {
  return useSyncExternalStore(subscribe, getMistakes, () => EMPTY as unknown as MistakeRecord[]);
}

/** 记录一批错题：同一题重复答错只累加次数。 */
export function addMistakes(
  level: Level,
  testId: string,
  wrong: { no: number; my: string }[]
): void {
  if (!wrong.length) return;
  const now = Date.now();
  const map = new Map(getMistakes().map((m) => [m.key, m]));
  for (const w of wrong) {
    const key = recordKey(level, testId, w.no);
    const prev = map.get(key);
    if (prev) {
      map.set(key, { ...prev, my: w.my, count: prev.count + 1, at: now, mastered: false });
    } else {
      map.set(key, { key, level, testId, no: w.no, my: w.my, count: 1, at: now, mastered: false });
    }
  }
  const next = Array.from(map.values()).sort((a, b) => b.at - a.at);
  write(MISTAKES_KEY, next);
}

export function removeMistake(key: string): void {
  write(MISTAKES_KEY, getMistakes().filter((m) => m.key !== key));
}

export function setMastered(key: string, mastered: boolean): void {
  write(
    MISTAKES_KEY,
    getMistakes().map((m) => (m.key === key ? { ...m, mastered } : m))
  );
}

export function clearMistakes(): void {
  write(MISTAKES_KEY, []);
}

/* ------------------------------ 做题记录 ------------------------------ */

export function getHistory(): AttemptRecord[] {
  if (!historyCache) {
    const raw = read<AttemptRecord[]>(HISTORY_KEY, []);
    historyCache = Array.isArray(raw) ? raw.filter((h) => h && h.key) : [];
  }
  return historyCache;
}

export function useHistory(): AttemptRecord[] {
  return useSyncExternalStore(subscribe, getHistory, () => EMPTY as unknown as AttemptRecord[]);
}

export function addAttempt(record: AttemptRecord): void {
  const rest = getHistory().filter((h) => h.key !== record.key);
  write(HISTORY_KEY, [record, ...rest].slice(0, 200));
}

export function findAttempt(key: string): AttemptRecord | undefined {
  return getHistory().find((h) => h.key === key);
}

/* ------------------------------ 作答进度 ------------------------------ */

export function getProgress(examId: string): ExamProgress | null {
  const all = read<Record<string, ExamProgress>>(PROGRESS_KEY, {});
  return all[examId] ?? null;
}

export function saveProgress(examId: string, progress: ExamProgress): void {
  const all = read<Record<string, ExamProgress>>(PROGRESS_KEY, {});
  all[examId] = progress;
  if (!available()) return;
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function clearProgress(examId: string): void {
  const all = read<Record<string, ExamProgress>>(PROGRESS_KEY, {});
  delete all[examId];
  if (!available()) return;
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
    mistakesCache = null;
    listeners.forEach((fn) => fn());
  } catch {
    /* ignore */
  }
}

/* ------------------------------ 统计 ------------------------------ */

export interface PracticeStats {
  attempts: number;
  answeredExams: number;
  mistakes: number;
  mastered: number;
  byLevel: { level: Level; attempts: number; mistakes: number; mastered: number }[];
}

export function usePracticeStats(): PracticeStats {
  const history = useHistory();
  const mistakes = useMistakes();
  const levels: Level[] = ["cet4", "cet6"];
  return {
    attempts: history.length,
    answeredExams: new Set(history.map((h) => h.key)).size,
    mistakes: mistakes.length,
    mastered: mistakes.filter((m) => m.mastered).length,
    byLevel: levels.map((level) => ({
      level,
      attempts: history.filter((h) => h.level === level).length,
      mistakes: mistakes.filter((m) => m.level === level).length,
      mastered: mistakes.filter((m) => m.level === level && m.mastered).length,
    })),
  };
}
