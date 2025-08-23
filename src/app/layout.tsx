// 【知行交易】全新现代化根布局组件
// 简洁优雅的系统布局

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "知行交易 - 现代化智能交易系统",
    template: "%s | 知行交易"
  },
  description: "专业的股票投资分析与交易管理平台，采用现代化设计，助您在投资路上知行合一。",
  keywords: ["股票交易", "量化投资", "智能选股", "交易系统", "投资管理", "现代化设计"],
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
    { media: '(prefers-color-scheme: light)', color: '#8b5cf6' },
    { media: '(prefers-color-scheme: dark)', color: '#7c3aed' },
  ],
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="antialiased">
      <body className="font-sans bg-bg-primary text-text-primary overflow-x-hidden">
        {/* 主内容区域 */}
        <div className="relative z-10 min-h-screen">
          {children}
        </div>
        
        {/* 全局提示/通知容器 */}
        <div id="toast-root" className="fixed top-4 right-4 z-[2000] space-y-2" />
        
        {/* 全局模态框容器 */}
        <div id="modal-root" />
        
        {/* 页面加载指示器 */}
        <div id="loading-indicator" className="fixed top-0 left-0 right-0 z-[1999] h-1">
          <div className="h-full bg-gradient-to-r from-primary to-secondary opacity-0 transition-opacity duration-300" />
        </div>
      </body>
    </html>
  );
}