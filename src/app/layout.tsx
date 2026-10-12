import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { LiquidBackground } from "@/components/liquid-background";
import { APP_NAME, APP_URL } from "@/lib/const";

// 统计 / 广告默认关闭：原来的 GA 与 AdSense ID 都属于原站作者，
// 想给自己的站加统计就在部署环境里设 NEXT_PUBLIC_GA_ID / NEXT_PUBLIC_ADSENSE_CLIENT。
const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `${APP_NAME} - 四六级真题在线做题 | 完全免费`,
    template: `%s | ${APP_NAME}`,
  },
  description: "决战四六级 - 四六级真题在线做题平台。93 套历年真题 PDF 与听力音频在线试听，24 套支持在线作答、自动判分与错题本。完全免费，无需注册。",
  keywords: ["英语四级", "英语六级", "CET4", "CET6", "四六级备考", "四六级真题", "在线做题", "错题本", "决战四六级", "免费"],
  authors: [{ name: APP_NAME }],
  creator: APP_NAME,
  other: {
    ...(ADSENSE_CLIENT ? { "google-adsense-account": ADSENSE_CLIENT } : {}),
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: APP_URL,
    siteName: APP_NAME,
    title: `${APP_NAME} - 四六级真题在线做题平台`,
    description: "完全免费的四六级真题平台：真题 PDF、听力音频、在线做题与错题本，助你一次过级！",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: APP_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} - 四六级真题在线做题`,
    description: "完全免费的四六级真题与在线做题平台",
    images: ["/og-image.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#191510" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem("theme");if(t==="dark"){document.documentElement.classList.add("dark")}})()`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add('js')`,
          }}
        />
        {ADSENSE_CLIENT ? (
          <Script
            id="adsense-bootstrap"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `(function () {
              if (document.querySelector('script[data-adsense]')) return;
              var script = document.createElement('script');
              script.async = true;
              script.crossOrigin = 'anonymous';
              script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}';
              script.setAttribute('data-adsense', 'true');
              document.head.appendChild(script);
            })();`,
            }}
          />
        ) : null}
        {GA_ID ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script
              id="google-analytics"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}');
            `,
              }}
            />
          </>
        ) : null}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "EducationalOrganization",
              name: APP_NAME,
              description: "四六级真题与在线做题平台",
              url: APP_URL,
              sameAs: [],
              address: {
                "@type": "PostalAddress",
                addressCountry: "CN",
              },
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground relative">
        <LiquidBackground />
        <Header />
        <main className="flex-1 relative">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
