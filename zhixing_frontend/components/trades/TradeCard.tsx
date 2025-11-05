"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target, 
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Bell,
  Edit,
  Eye,
  Plus,
  Camera,
  StickyNote,
  AlertTriangle,
  DollarSign,
  ArrowRight
} from "lucide-react";
import type { Trade } from "@/app/trades/types";
import { getViolationColor, getViolationLabel } from "@/lib/violations";

interface TradeCardProps {
  trade: Trade;
}

// 状态配置
const statusConfig = {
  planned: { label: "计划中", color: "bg-gray-500" },
  pending: { label: "等待执行", color: "bg-yellow-500" },
  active: { label: "持仓中", color: "bg-blue-500" },
  closed: { label: "已平仓", color: "bg-green-500" },
  cancelled: { label: "已取消", color: "bg-red-500" },
};

// 交易类型配置
const tradeTypeConfig = {
  long: { label: "做多", color: "text-green-600", icon: TrendingUp },
  short: { label: "做空", color: "text-red-600", icon: TrendingDown },
};

export default function TradeCard({ trade }: TradeCardProps) {
  const router = useRouter();
  const status = statusConfig[trade.status];
  const tradeType = tradeTypeConfig[trade.planType];
  const TradeIcon = tradeType.icon;

  // 计算盈亏颜色
  const getPnlColor = (pnl?: number) => {
    if (!pnl) return "text-gray-500";
    return pnl > 0 ? "text-green-600" : pnl < 0 ? "text-red-600" : "text-gray-500";
  };

  // 格式化价格
  const formatPrice = (price?: number) => {
    return price ? `$${price.toFixed(2)}` : "-";
  };

  // 格式化百分比
  const formatPct = (pct?: number) => {
    if (!pct) return "-";
    const sign = pct > 0 ? "+" : "";
    return `${sign}${pct.toFixed(2)}%`;
  };

  // 计算持仓天数
  const getHoldingDays = () => {
    if (!trade.entryTime) return null;
    const entryDate = new Date(trade.entryTime);
    const now = new Date();
    const days = Math.floor((now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <Card 
      className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => router.push(`/trade/${trade.id}`)}
    >
      <div className="space-y-3">
        {/* 头部：股票信息和状态 */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <TradeIcon className={`w-5 h-5 ${tradeType.color}`} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{trade.symbol}</span>
                <Badge className={status.color}>{status.label}</Badge>
                <Badge variant="outline">{tradeType.label}</Badge>
              </div>
              <p className="text-sm text-gray-500">{trade.stockName}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/trade/${trade.id}`);
            }}
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {/* 价格信息 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {trade.status === "planned" || trade.status === "pending" ? (
            <>
              <div>
                <p className="text-xs text-gray-500">计划入场</p>
                <p className="font-semibold">{formatPrice(trade.planEntryPrice)}</p>
                {trade.planEntryPriceRangeHigh && trade.planEntryPriceRangeHigh !== trade.planEntryPrice && (
                  <p className="text-xs text-gray-400">~{formatPrice(trade.planEntryPriceRangeHigh)}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500">计划数量</p>
                <p className="font-semibold">{trade.planQuantity || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">止损价</p>
                <p className="font-semibold text-red-600">{formatPrice(trade.planStopLoss)}</p>
                {trade.planEntryPrice && trade.planStopLoss && (
                  <p className="text-xs text-red-500">
                    {(((trade.planStopLoss - trade.planEntryPrice) / trade.planEntryPrice) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500">止盈价</p>
                <p className="font-semibold text-green-600">{formatPrice(trade.planTakeProfit)}</p>
                {trade.planEntryPrice && trade.planTakeProfit && (
                  <p className="text-xs text-green-500">
                    +{(((trade.planTakeProfit - trade.planEntryPrice) / trade.planEntryPrice) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
            </>
          ) : trade.status === "active" ? (
            <>
              <div>
                <p className="text-xs text-gray-500">入场价</p>
                <p className="font-semibold">{formatPrice(trade.entryPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">当前价</p>
                <p className="font-semibold">{formatPrice(trade.currentPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">持仓数量</p>
                <p className="font-semibold">{trade.currentQuantity || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">浮动盈亏</p>
                <p className={`font-semibold ${getPnlColor(trade.unrealizedPnl)}`}>
                  {formatPrice(trade.unrealizedPnl)} ({formatPct(trade.unrealizedPnlPct)})
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-xs text-gray-500">入场价</p>
                <p className="font-semibold">{formatPrice(trade.entryPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">平仓价</p>
                <p className="font-semibold">{formatPrice(trade.exitPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">交易数量</p>
                <p className="font-semibold">{trade.exitQuantity || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">净盈亏</p>
                <p className={`font-semibold ${getPnlColor(trade.netPnl)}`}>
                  {formatPrice(trade.netPnl)} ({formatPct(trade.realizedPnlPct)})
                </p>
              </div>
            </>
          )}
        </div>

        {/* 买入理由（仅计划阶段显示） */}
        {(trade.status === "planned" || trade.status === "pending") && trade.planNotes && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">💡 买入理由</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line line-clamp-3">
              {trade.planNotes}
            </p>
          </div>
        )}

        {/* 策略和标签 */}
        {(trade.planStrategy || (trade.strategyTags && trade.strategyTags.length > 0)) && (
          <div className="text-sm text-gray-600 flex items-center gap-2 flex-wrap">
            {trade.planStrategy && (
              <span><span className="font-medium">策略：</span>{trade.planStrategy}</span>
            )}
            {trade.strategyTags && trade.strategyTags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {trade.strategyTags.map((t, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 违规标记 */}
        {trade.violations && trade.violations.length > 0 && (
          <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-md">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">
                检测到 {trade.violations.length} 项违规
              </p>
              <div className="flex flex-wrap gap-1">
                {trade.violations.slice(0, 3).map((v, i) => (
                  <Badge 
                    key={i} 
                    variant="outline" 
                    className={`text-xs ${getViolationColor(v.severity)}`}
                  >
                    {getViolationLabel(v.type)}
                  </Badge>
                ))}
                {trade.violations.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{trade.violations.length - 3}
                  </Badge>
                )}
              </div>
              {trade.violationCost && trade.violationCost > 0 && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  预估损失: ${trade.violationCost.toFixed(2)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* 底部：统计和操作 */}
        <div className="space-y-2 pt-2 border-t">
          {/* 统计信息行 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {trade.status === "active" && getHoldingDays() !== null && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{getHoldingDays()}天</span>
                </div>
              )}
              {(trade.status === "planned" || trade.status === "pending") && trade.planEntryPrice && trade.planStopLoss && trade.planTakeProfit && (
                <>
                  <div className="flex items-center gap-1">
                    <Target className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">
                      风险收益比: 1:{
                        Math.abs((trade.planTakeProfit - trade.planEntryPrice) / (trade.planEntryPrice - trade.planStopLoss)).toFixed(2)
                      }
                    </span>
                  </div>
                  {trade.planQuantity && (
                    <div className="flex items-center gap-1 text-green-600">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-medium">
                        预期收益: ${((trade.planTakeProfit - trade.planEntryPrice) * trade.planQuantity).toFixed(2)}
                      </span>
                    </div>
                  )}
                </>
              )}
              {trade.noteCount !== undefined && trade.noteCount > 0 && (
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  <span>{trade.noteCount}</span>
                </div>
              )}
              {trade.screenshotCount !== undefined && trade.screenshotCount > 0 && (
                <div className="flex items-center gap-1">
                  <ImageIcon className="w-4 h-4" />
                  <span>{trade.screenshotCount}</span>
                </div>
              )}
              {trade.alertCount !== undefined && trade.alertCount > 0 && (
                <div className="flex items-center gap-1">
                  <Bell className="w-4 h-4" />
                  <span>{trade.alertCount}</span>
                </div>
              )}
            </div>
            
            {trade.status === "active" && (
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1 text-gray-500">
                  <Target className="w-3 h-3" />
                  <span>止损: {formatPrice(trade.stopLossPrice)}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <Target className="w-3 h-3" />
                  <span>止盈: {formatPrice(trade.takeProfitPrice)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

