import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QuizRunner from "@/components/practice/quiz-runner";
import { ALL_BANK_EXAMS, bankExamsByLevel, findBankExam, type Level } from "@/lib/bank";

export const dynamic = "force-static";

export function generateStaticParams() {
  return ALL_BANK_EXAMS.map((e) => ({ level: e.level, testId: e.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ level: string; testId: string }>;
}): Promise<Metadata> {
  const { level, testId } = await params;
  const meta = findBankExam(level, testId);
  if (!meta) return { title: "在线做题" };
  return {
    title: `${meta.level === "cet4" ? "四级" : "六级"} ${meta.title} 在线做题`,
    description: `${meta.title}在线练习：共 ${meta.counts.total} 题，含听力音频、自动判分与错题记录。`,
  };
}

export default async function PracticeExamPage({
  params,
}: {
  params: Promise<{ level: string; testId: string }>;
}) {
  const { level, testId } = await params;
  const meta = findBankExam(level, testId);
  if (!meta) notFound();
  if (!bankExamsByLevel(level as Level).length) notFound();

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <QuizRunner meta={meta} />
    </div>
  );
}
