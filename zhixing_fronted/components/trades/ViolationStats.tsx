"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, TrendingDown } from "lucide-react";
import type { Trade } from "@/app/trades/types";
import { getViolationLabel, getViolationColor } from "@/lib/violations";

interface ViolationStatsProps {
  trades: Trade[];
}

export default function ViolationStats({ trades }: ViolationStatsProps) {
  // 统计所有违规
  const allViolations = trades.flatMap(t => t.violations || []);
  const totalViolationCost = trades.reduce((sum, t) => sum + (t.violationCost || 0), 0);
  
  // 按类型分组统计
  const violationsByType = allViolations.reduce((acc, v) => {
    acc[v.type] = (acc[v.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 按严重程度统计
  const violationsBySeverity = {
    high: allViolations.filter(v => v.severity === "high").length,
    medium: allViolations.filter(v => v.severity === "medium").length,
    low: allViolations.filter(v => v.severity === "low").length,
  };

  // 计算遵守率
  const closedTrades = trades.filter(t => t.status === "closed").length;
  const tradesWithViolations = trades.filter(t => t.violations && t.violations.length > 0).length;
  const complianceRate = closedTrades > 0 
    ? ((closedTrades - tradesWithViolations) / closedTrades * 100) 
    : 100;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          规则遵守统计
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 总体统计 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {complianceRate.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">规则遵守率</p>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{allViolations.length}</p>
            <p className="text-xs text-gray-500 mt-1">总违规次数</p>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-2xl font-bold text-green-600">
              {closedTrades - tradesWithViolations}
            </p>
            <p className="text-xs text-gray-500 mt-1">完美执行</p>
          </div>
          <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <p className="text-2xl font-bold text-orange-600">
              ${totalViolationCost.toFixed(0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">违规成本</p>
          </div>
        </div>

        {/* 按严重程度 */}
        <div>
          <p className="text-sm font-semibold mb-2">按严重程度</p>
          <div className="flex gap-2">
            <Badge className="bg-red-500 hover:bg-red-600">
              高危: {violationsBySeverity.high}
            </Badge>
            <Badge className="bg-orange-500 hover:bg-orange-600">
              中等: {violationsBySeverity.medium}
            </Badge>
            <Badge className="bg-yellow-500 hover:bg-yellow-600">
              轻微: {violationsBySeverity.low}
            </Badge>
          </div>
        </div>

        {/* 按类型统计 */}
        {Object.keys(violationsByType).length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-2">常见违规类型</p>
            <div className="space-y-2">
              {Object.entries(violationsByType)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {getViolationLabel(type as any)}
                    </span>
                    <Badge variant="outline">{count}次</Badge>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 改进提示 */}
        {allViolations.length === 0 ? (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-700 dark:text-green-400">
              太棒了！所有交易都完美遵守了计划 🎉
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <TrendingDown className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 mb-1">
                改进建议
              </p>
              <ul className="text-xs text-yellow-600 dark:text-yellow-500 space-y-1">
                {violationsBySeverity.high > 0 && (
                  <li>• 重点关注高危违规，这些可能导致重大损失</li>
                )}
                {violationsByType["stop_loss"] && (
                  <li>• 加强止损纪律，严格按计划设置止损</li>
                )}
                {violationsByType["entry_price"] && (
                  <li>• 提高入场精确度，耐心等待理想价格</li>
                )}
                {violationsByType["position_size"] && (
                  <li>• 严格控制仓位大小，避免过度交易</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

