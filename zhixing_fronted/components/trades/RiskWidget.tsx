"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Trade } from "@/app/trades/types";
import { computeEquityCurve, computeDailyReturns, computeMaxDrawdown, computeSharpe } from "@/lib/metrics";

interface RiskWidgetProps {
  trades: Trade[];
}

export default function RiskWidget({ trades }: RiskWidgetProps) {
  const { maxDD, sharpe } = useMemo(() => {
    const curve = computeEquityCurve(trades, 100000, "day");
    const dd = computeMaxDrawdown(curve);
    const ret = computeDailyReturns(curve);
    const sh = computeSharpe(ret);
    return { maxDD: Number(dd.toFixed(2)), sharpe: Number(sh.toFixed(2)) };
  }, [trades]);

  return (
    <Card className="p-4">
      <CardHeader className="p-0 mb-2"><CardTitle>风险指标</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded border bg-muted/30">
            <div className="text-xs text-muted-foreground">最大回撤</div>
            <div className={`text-2xl font-bold ${maxDD >= 20 ? 'text-red-600' : maxDD >=10 ? 'text-yellow-600' : 'text-green-600'}`}>{maxDD}%</div>
          </div>
          <div className="p-3 rounded border bg-muted/30">
            <div className="text-xs text-muted-foreground">夏普比率</div>
            <div className={`text-2xl font-bold ${sharpe >= 1.5 ? 'text-green-600' : sharpe >= 1 ? 'text-yellow-600' : 'text-red-600'}`}>{sharpe}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


