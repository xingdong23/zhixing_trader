// 【知行交易】主布局组件
// 专业金融系统根布局

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "知行交易 - 智能量化交易系统",
    template: "%s | 知行交易"
  },
  description: "专业的股票投资分析与交易管理平台，采用智能量化策略，助您在投资路上知行合一。",
  keywords: ["股票交易", "量化投资", "智能选股", "交易系统", "投资管理"],
  authors: [{ name: "知行交易团队" }],
  creator: "知行交易",
  publisher: "知行交易",
  robots: {
    index: true,
    follow: true,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0f1419' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1419' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="font-sans antialiased bg-bg-primary text-text-primary overflow-x-hidden">
        {/* 全局背景装饰 */}
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-primary opacity-50" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-success/5 rounded-full blur-3xl" />
        </div>
        
        {/* 主内容 */}
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
