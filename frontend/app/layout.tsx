import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "知行交易系统 - 仪表盘",
  description: "专业的股票交易系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
      </body>
    </html>
  );
}
