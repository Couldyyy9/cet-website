import manifestJson from "../../public/bank/manifest.json";
import { withBasePath } from "./base-path";

export type Level = "cet4" | "cet6";
export type QuestionKind = "mcq" | "cloze" | "matching";
export type PassageKey = "cloze" | "matching" | "passage1" | "passage2";

export interface BankQuestion {
  no: number;
  part: "listening" | "reading";
  kind: QuestionKind;
  stem: string;
  options: Record<string, string>;
  answer: string;
  answerText?: string;
  passage?: PassageKey;
  groupNote?: string;
}

export interface ClozePassage {
  kind: "cloze";
  text: string;
  wordBank: Record<string, string>;
  blanks: number[];
}

export interface MatchingPassage {
  kind: "matching";
  paragraphs: Record<string, string>;
  letters: string[];
}

export interface TextPassage {
  kind: "passage";
  text: string;
}

export interface BankPassages {
  cloze?: ClozePassage;
  matching?: MatchingPassage;
  passage1?: TextPassage;
  passage2?: TextPassage;
}

export interface ExamCounts {
  total: number;
  listening: number;
  cloze: number;
  matching: number;
  reading: number;
}

export interface ExamMeta {
  level: Level;
  id: string;
  title: string;
  year: number;
  month: number;
  set: string;
  hasAudio: boolean;
  readingOnly: boolean;
  counts: ExamCounts;
  file: string;
}

export interface ExamBank extends ExamMeta {
  questions: BankQuestion[];
  passages: BankPassages;
  warnings: string[];
}

export const BANK_MANIFEST = manifestJson as unknown as {
  generatedAt: string;
  totalQuestions: number;
  examCount: number;
  exams: ExamMeta[];
};

export const ALL_BANK_EXAMS: ExamMeta[] = BANK_MANIFEST.exams;

export function bankExamsByLevel(level: Level): ExamMeta[] {
  return ALL_BANK_EXAMS.filter((e) => e.level === level);
}

export function findBankExam(level: string, id: string): ExamMeta | undefined {
  return ALL_BANK_EXAMS.find((e) => e.level === level && e.id === id);
}

export function examKey(level: string, id: string): string {
  return `${level}_${id}`;
}

/* ------------------------------------------------------------------ *
 * 分节定义：四级/六级客观题部分（听力 1-25、阅读 26-55）
 * ------------------------------------------------------------------ */

export interface SectionDef {
  key: PassageKey | "listening";
  label: string;
  short: string;
  from: number;
  to: number;
  kind: QuestionKind;
  passage?: PassageKey;
  hint?: string;
}

export const SECTIONS: SectionDef[] = [
  {
    key: "listening",
    label: "Part II 听力理解",
    short: "听力",
    from: 1,
    to: 25,
    kind: "mcq",
    hint: "题干只在录音中朗读，卷面给出四个选项。",
  },
  {
    key: "cloze",
    label: "Part III Section A 选词填空",
    short: "选词填空",
    from: 26,
    to: 35,
    kind: "cloze",
    passage: "cloze",
    hint: "从 A-O 词库中为每个空选一个词，每个词只能用一次。",
  },
  {
    key: "matching",
    label: "Part III Section B 长篇匹配",
    short: "长篇匹配",
    from: 36,
    to: 45,
    kind: "matching",
    passage: "matching",
    hint: "为每条陈述匹配所属段落，段落可以重复使用。",
  },
  {
    key: "passage1",
    label: "Part III Section C 仔细阅读（Passage One）",
    short: "仔细阅读一",
    from: 46,
    to: 50,
    kind: "mcq",
    passage: "passage1",
  },
  {
    key: "passage2",
    label: "Part III Section C 仔细阅读（Passage Two）",
    short: "仔细阅读二",
    from: 51,
    to: 55,
    kind: "mcq",
    passage: "passage2",
  },
];

export function sectionsOf(bank: Pick<ExamBank, "questions">): SectionDef[] {
  const nos = new Set(bank.questions.map((q) => q.no));
  return SECTIONS.filter((s) => {
    for (let n = s.from; n <= s.to; n += 1) if (nos.has(n)) return true;
    return false;
  });
}

/* ------------------------------------------------------------------ *
 * 官方分值（710 分制；主观题不计入自动判分）
 * ------------------------------------------------------------------ */

export function questionWeight(level: Level, q: BankQuestion): number {
  if (q.part === "listening") {
    // 四级：短篇新闻 7 题 + 长对话 8 题（各 7.1 分/题）、听力篇章 10 题（14.2 分/题）
    // 六级：长对话 8 题 + 听力篇章 7 题（各 7.1 分/题）、讲座 10 题（14.2 分/题）
    return q.no <= 15 ? 7.1 : 14.2;
  }
  if (q.kind === "cloze") return 3.55;
  if (q.kind === "matching") return 7.1;
  return 14.2;
}

export interface ScoreBreakdown {
  score: number;
  max: number;
  correct: number;
  answered: number;
  total: number;
  bySection: { key: string; label: string; correct: number; total: number; score: number; max: number }[];
}

export function gradeExam(
  bank: Pick<ExamBank, "level" | "questions">,
  answers: Record<string, string>
): ScoreBreakdown {
  let score = 0;
  let max = 0;
  let correct = 0;
  let answered = 0;
  const bySection = new Map<string, { key: string; label: string; correct: number; total: number; score: number; max: number }>();

  for (const q of bank.questions) {
    const w = questionWeight(bank.level, q);
    const s = SECTIONS.find((x) => x.key === (q.part === "listening" ? "listening" : q.passage ?? "passage1"));
    const bucketKey = s?.key ?? "other";
    let bucket = bySection.get(bucketKey);
    if (!bucket) {
      bucket = { key: bucketKey, label: s?.short ?? "其他", correct: 0, total: 0, score: 0, max: 0 };
      bySection.set(bucketKey, bucket);
    }
    max += w;
    bucket.max += w;
    bucket.total += 1;
    const my = answers[String(q.no)];
    if (my) answered += 1;
    if (my && my.toUpperCase() === q.answer.toUpperCase()) {
      score += w;
      correct += 1;
      bucket.correct += 1;
      bucket.score += w;
    }
  }

  return {
    score: Math.round(score * 10) / 10,
    max: Math.round(max * 10) / 10,
    correct,
    answered,
    total: bank.questions.length,
    bySection: SECTIONS.map((s) => bySection.get(s.key)).filter(Boolean) as ScoreBreakdown["bySection"],
  };
}

/* ------------------------------------------------------------------ *
 * 题库加载（静态 JSON，客户端按需取）
 * ------------------------------------------------------------------ */

const cache = new Map<string, Promise<ExamBank>>();

export function loadExamBank(level: string, id: string): Promise<ExamBank> {
  const key = examKey(level, id);
  const hit = cache.get(key);
  if (hit) return hit;
  const p = fetch(withBasePath(`/bank/${key}.json`), { cache: "force-cache" }).then((res) => {
    if (!res.ok) throw new Error(`题库加载失败（HTTP ${res.status}）`);
    return res.json() as Promise<ExamBank>;
  });
  cache.set(key, p);
  return p;
}

export function sortedOptions(options: Record<string, string>): [string, string][] {
  return Object.entries(options).sort((a, b) => a[0].localeCompare(b[0]));
}
