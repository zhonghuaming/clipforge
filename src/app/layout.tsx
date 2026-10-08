import type { Metadata } from "next";
// self-hosted Geist via the official npm package (same --font-geist-* variables) — a build-time fetch
// from Google Fonts is a network dependency that intermittently breaks CI release builds
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { LocaleInitializer } from "@/components/locale-initializer";
import { AppShell } from "@/components/app-shell";
import { ThemeInitializer } from "@/components/theme-controls";
import { APP_NAME } from "@/lib/brand";

const geistSans = GeistSans;
const geistMono = GeistMono;

export const metadata: Metadata = {
  title: `${APP_NAME} | 电商视频工作台`,
  applicationName: APP_NAME,
  description:
    "商品素材、视频镜头与多语言成片的本地制作工作台。A local workspace for product video production, review and export.",
  keywords: [
    "AI 短视频",
    "带货短视频",
    "AI 视频生成",
    "抖音",
    "快手",
    "小红书",
    "TikTok",
    "text to video",
    "faceless video",
    "AI video generator",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{var m=JSON.parse(localStorage.getItem('clipforge-theme')||'{}').state?.mode;document.documentElement.classList.toggle('dark',m==='dark'||(m==='system'&&matchMedia('(prefers-color-scheme: dark)').matches))}catch{}" }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeInitializer />
        <LocaleInitializer />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
