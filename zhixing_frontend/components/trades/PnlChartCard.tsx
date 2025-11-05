"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { computeEquityCurve } from "@/lib/metrics";
import type { Trade } from "@/app/trades/types";

interface PnlChartCardProps {
  trades: Trade[];
}

export default function PnlChartCard({ trades }: PnlChartCardProps) {
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");
  const data = useMemo(() => computeEquityCurve(trades, 100000, granularity).map(p => ({ date: p.date, equity: Number(p.equity.toFixed(2)) })), [trades, granularity]);

  return (
    <Card className="p-4">
      <CardHeader className="flex flex-row items-center justify-between p-0 mb-2">
        <CardTitle>盈亏曲线</CardTitle>
        <Select value={granularity} onValueChange={(v: any) => setGranularity(v)}>
          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="day">按日</SelectItem>
            <SelectItem value="week">按周</SelectItem>
            <SelectItem value="month">按月</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-0" style={{ height: 260 }}>
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">暂无数据</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={["auto", "auto"]} />
              <Tooltip formatter={(v: any) => [`$${Number(v).toFixed(2)}`, "净值"]} labelFormatter={(l) => `日期: ${l}`} />
              <Line type="monotone" dataKey="equity" stroke="#2563eb" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}


