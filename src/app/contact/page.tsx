import { MessageSquare, Star } from "lucide-react";

export const metadata = { title: "联系我们" };

export default function ContactPage() {
  return (
    <div className="animate-fade-in py-12">
      <div className="container mx-auto max-w-2xl px-4">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">联系我们</h1>
          <p className="text-muted">本站提供四六级真题下载与在线做题，欢迎反馈问题与建议</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="https://github.com/Couldyyy9/cet-website/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white dark:bg-[#211c14] rounded-xl border border-border p-6 hover:shadow-md transition-shadow text-center"
          >
            <div className="inline-flex w-12 h-12 rounded-xl bg-[#fff6e3] text-[#a8700f] items-center justify-center mb-3">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h3 className="font-semibold mb-1">问题反馈</h3>
            <p className="text-primary-strong">提交 Issue</p>
            <p className="text-xs text-muted mt-2">题目、题库、页面显示有问题都可以在这里提</p>
          </a>

          <a
            href="https://github.com/Couldyyy9/cet-website"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white dark:bg-[#211c14] rounded-xl border border-border p-6 hover:shadow-md transition-shadow text-center"
          >
            <div className="inline-flex w-12 h-12 rounded-xl bg-[#fff1d6] text-[#c97f06] items-center justify-center mb-3">
              <Star className="h-6 w-6" />
            </div>
            <h3 className="font-semibold mb-1">项目主页</h3>
            <p className="text-primary-strong break-all">github.com/Couldyyy9/cet-website</p>
            <p className="text-xs text-muted mt-2">源码与更新记录都在这里</p>
          </a>
        </div>

        <p className="text-xs text-muted text-center mt-8">
          本站为个人学习用途的非商业项目，真题与听力材料版权归原出处所有
        </p>
      </div>
    </div>
  );
}
