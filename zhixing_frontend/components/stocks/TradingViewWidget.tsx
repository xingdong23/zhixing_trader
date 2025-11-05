"use client";

import React, { useEffect, useRef, useState } from "react";

interface TradingViewWidgetProps {
  symbol: string; // 例如 NASDAQ:AAPL 或 AAPL
  interval?: "1" | "3" | "5" | "15" | "30" | "60" | "120" | "180" | "240" | "D" | "W" | "M";
  theme?: "light" | "dark";
  locale?: string;
  autosize?: boolean; // 默认为 false，避免父容器无高度导致空白
  studies?: string[]; // TV 的内置指标ID，如 RSI@tv-basicstudies
  height?: number;
}

export default function TradingViewWidget({
  symbol,
  interval = "D",
  theme = "light",
  locale = "zh_CN",
  autosize = false,
  studies = ["RSI@tv-basicstudies", "MACD@tv-basicstudies"],
  height,
}: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const idRef = useRef<string>(`tv_container_${Math.random().toString(36).slice(2)}`);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!containerRef.current) return;

    // 避免重复注入
    const ensureScript = () =>
      new Promise<void>((resolve) => {
        if (document.querySelector("script[src='https://s3.tradingview.com/tv.js']")) {
          resolve();
          return;
        }
        const s = document.createElement("script");
        s.src = "https://s3.tradingview.com/tv.js";
        s.onload = () => resolve();
        s.onerror = () => setStatus("error");
        document.body.appendChild(s);
      });

    let widget: any;
    let disposed = false;

    ensureScript().then(() => {
      if (disposed) return;
      // @ts-ignore
      const TV = (window as any).TradingView;
      if (!TV || !containerRef.current) return;
      widget = new TV.widget({
        container_id: idRef.current, // 使用 container_id 传入ID字符串
        autosize,
        width: autosize ? undefined : "100%",
        height: autosize ? undefined : height || 520,
        symbol: symbol.includes(":") ? symbol : `NASDAQ:${symbol}`,
        interval,
        timezone: "Etc/UTC",
        theme,
        style: 1,
        locale,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        studies,
      });
      // 简单认为创建成功
      setTimeout(() => setStatus("ready"), 500);
    });

    return () => {
      disposed = true;
      // TradingView 小部件无统一销毁API，这里仅移除容器内容
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [symbol, interval, theme, locale, autosize, height, studies]);

  return (
    <div style={{ width: "100%", height: height || 520, position: "relative" }}>
      <div id={idRef.current} ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {status !== "ready" && (
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',color:'#777',fontSize:14}}>
          {status === 'loading' ? '正在加载 TradingView 图表…' : 'TradingView 加载失败'}
        </div>
      )}
    </div>
  );
}


