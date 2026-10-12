import type { Metadata } from "next";
import PracticeHome from "@/components/practice/practice-home";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "在线做题",
  description:
    "四六级真题在线练习：听力、选词填空、长篇匹配、仔细阅读均可在线作答，交卷自动判分并记录错题，进度保存在本机浏览器。",
};

export default function PracticePage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-10">
      <PracticeHome />
    </div>
  );
}
