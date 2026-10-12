import { APP_NAME } from "@/lib/const";

export const metadata = { title: "隐私政策" };

export default function PrivacyPage() {
  return (
    <div className="animate-fade-in py-12">
      <div className="container mx-auto max-w-3xl px-4">
        <h1 className="text-3xl font-bold mb-6">隐私政策</h1>
        <p className="text-muted text-sm mb-6">最后更新：2026 年 10 月 12 日</p>

        <div className="prose prose-slate space-y-6 text-muted">
          <p className="leading-relaxed">
            {APP_NAME} 是一个纯静态的四六级真题与在线做题网站。本站不需要注册，也没有账号系统，
            <strong className="text-foreground">不投放广告、不接入第三方统计分析、不设置追踪 Cookie</strong>。
            除做题记录保存在您自己的浏览器里以外，本站不收集您的个人信息。
          </p>

          <h2 className="text-xl font-bold text-foreground mt-8 mb-3">1. 本站不收集的信息</h2>
          <ul className="list-disc pl-6 space-y-2 leading-relaxed">
            <li>不要求您提交姓名、手机号、邮箱或任何身份信息；</li>
            <li>不接入 Google Analytics、Google AdSense 或其他广告、统计、用户画像服务；</li>
            <li>不使用 Cookie 追踪您的浏览行为，也不会跨站识别您；</li>
            <li>不会把您的做题记录、错题本上传或共享给任何人。</li>
          </ul>

          <h2 className="text-xl font-bold text-foreground mt-8 mb-3">2. 保存在您本机浏览器的数据</h2>
          <p className="leading-relaxed">
            为了记住您的使用状态，本站使用浏览器的本地存储（localStorage）在<strong className="text-foreground">您的设备上</strong>保存少量数据，
            这些数据不会发送到服务器：
          </p>
          <ul className="list-disc pl-6 space-y-2 leading-relaxed">
            <li><code className="rounded bg-surface px-1.5 py-0.5 text-sm">theme</code>：深色 / 浅色主题偏好；</li>
            <li><code className="rounded bg-surface px-1.5 py-0.5 text-sm">cet-practice:progress:v1</code>：每套试卷的作答进度、用时与标记；</li>
            <li><code className="rounded bg-surface px-1.5 py-0.5 text-sm">cet-practice:history:v1</code>：最近 200 次交卷记录（得分、正确率等）；</li>
            <li><code className="rounded bg-surface px-1.5 py-0.5 text-sm">cet-practice:mistakes:v1</code>：错题本条目（题目、您的答案、答错次数）。</li>
          </ul>
          <p className="leading-relaxed">
            这些记录只对当前这台设备上的这个浏览器可见：换设备、换浏览器或使用无痕模式都不会同步。
            您随时可以自行清除——浏览器设置里清除网站数据，或在「错题本」页点「清空」，记录即被删除且无法恢复。
          </p>

          <h2 className="text-xl font-bold text-foreground mt-8 mb-3">3. 网站托管与访问日志</h2>
          <p className="leading-relaxed">
            本站页面与真题文件部署在 GitHub Pages 上，由 GitHub 提供静态托管服务。
            作为托管方，GitHub 可能记录基本的访问日志（例如 IP 地址、访问时间、请求的文件），
            这些日志由 GitHub 按其自身政策处理，本站不接触也不存储这些日志。
            详情请参阅
            <a href="https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages#data-collection" className="text-primary-strong underline">GitHub Pages 数据收集说明</a>。
          </p>

          <h2 className="text-xl font-bold text-foreground mt-8 mb-3">4. 真题与听力文件</h2>
          <p className="leading-relaxed">
            真题 PDF 与听力音频都由本站直接提供，通过浏览器原生方式打开或播放，
            不经过第三方播放器、网盘或统计服务，播放与下载行为不会被本站记录。
          </p>

          <h2 className="text-xl font-bold text-foreground mt-8 mb-3">5. 外部链接</h2>
          <p className="leading-relaxed">
            本站可能包含指向外部网站的链接（例如项目仓库、Issues 页面）。
            一旦离开本站，您所访问站点的隐私政策由其自行负责，本站无法控制也不承担责任。
          </p>

          <h2 className="text-xl font-bold text-foreground mt-8 mb-3">6. 政策更新</h2>
          <p className="leading-relaxed">
            如果本站功能发生变化（例如将来加入需要联网保存的功能），本政策会在本页同步更新，并修改上方的「最后更新」日期。
          </p>

          <h2 className="text-xl font-bold text-foreground mt-8 mb-3">7. 联系我们</h2>
          <p className="leading-relaxed">如有隐私相关问题，欢迎通过项目仓库的 Issues 反馈。</p>
        </div>
      </div>
    </div>
  );
}
