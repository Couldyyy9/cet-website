import type { Metadata } from "next";
import MistakesBoard from "@/components/practice/mistakes-board";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "错题本",
  description: "自动收集在线做题答错的题目，支持按题型筛选、标记已掌握、回到原卷重做。记录保存在本机浏览器。",
};

export default function MistakesPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-10">
      <MistakesBoard />
    </div>
  );
}
