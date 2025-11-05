"use client";

import React, { useEffect, useRef } from "react";
import { createChart, ColorType, CandlestickSeriesPartialOptions } from "lightweight-charts";

interface Candle { time: string | number; open: number; high: number; low: number; close: number }

interface LightweightChartProps {
  candles: Candle[];
  height?: number;
}

export default function LightweightChart({ candles, height = 560 }: LightweightChartProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = createChart(ref.current, {
      width: ref.current.clientWidth,
      height,
      layout: { background: { type: ColorType.Solid, color: "#ffffff" }, textColor: "#222" },
      grid: { vertLines: { color: "#eee" }, horzLines: { color: "#eee" } },
      timeScale: { borderColor: "#ccc" },
      rightPriceScale: { borderColor: "#ccc" },
    });

    const seriesOptions: CandlestickSeriesPartialOptions = {
      upColor: "#26a69a",
      downColor: "#ef5350",
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      borderVisible: false,
    };

    const candle = chart.addCandlestickSeries(seriesOptions);
    candle.setData(candles);

    const resize = () => {
      if (!ref.current) return;
      chart.applyOptions({ width: ref.current.clientWidth });
    };
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      chart.remove();
    };
  }, [candles, height]);

  return <div ref={ref} style={{ width: "100%", height }} />;
}


