"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  FileText,
  Image as ImageIcon,
  Bell,
  Activity,
  Calendar,
  DollarSign,
  Target,
  Clock,
  Plus,
  Share2
} from "lucide-react";
import type { Trade } from "@/app/trades/types";
import ShareTradeCard from "./ShareTradeCard";

interface TradeDetailProps {
  trade: Trade | null;
  open: boolean;
  onClose: () => void;
  onAddNote?: () => void;
  onAddScreenshot?: () => void;
  onAddAlert?: () => void;
}

export default function TradeDetail({
  trade,
  open,
  onClose,
  onAddNote,
  onAddScreenshot,
  onAddAlert
}: TradeDetailProps) {
  const [showShareCard, setShowShareCard] = useState(false);

  if (!trade) return null;

  const tradeType = trade.planType === "long" ? "做多" : "做空";
  const TradeIcon = trade.planType === "long" ? TrendingUp : TrendingDown;
  const tradeTypeColor = trade.planType === "long" ? "text-green-600" : "text-red-600";

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

  // 格式化日期时间
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("zh-CN");
  };

  // 计算盈亏颜色
  const getPnlColor = (pnl?: number) => {
    if (!pnl) return "text-gray-500";
    return pnl > 0 ? "text-green-600" : pnl < 0 ? "text-red-600" : "text-gray-500";
  };

  return (
  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-center pr-8">
              <DialogTitle className="flex items-center gap-2">
                <TradeIcon className={`w-5 h-5 ${tradeTypeColor}`} />
                <span>{trade.symbol} - {trade.stockName}</span>
                <Badge>{tradeType}</Badge>
              </DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowShareCard(true)}
                className="gap-2"
              >
                <Share2 className="w-4 h-4" />
                分享交易
              </Button>
            </div>
          </DialogHeader>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">概览</TabsTrigger>
              <TabsTrigger value="notes">笔记</TabsTrigger>
              <TabsTrigger value="screenshots">截图</TabsTrigger>
              <TabsTrigger value="alerts">提醒</TabsTrigger>
              <TabsTrigger value="timeline">时间线</TabsTrigger>
            </TabsList>

            {/* 概览标签页 */}
            <TabsContent value="overview" className="space-y-4">
              {/* 持仓概览 */}
              {trade.status === "active" && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    持仓概览
                  </h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">入场价格</p>
                      <p className="text-xl font-bold">{formatPrice(trade.entryPrice)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">当前价格</p>
                      <p className="text-xl font-bold">{formatPrice(trade.currentPrice)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">持仓数量</p>
                      <p className="text-xl font-bold">{trade.currentQuantity}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">浮动盈亏</p>
                      <p className={`text-xl font-bold ${getPnlColor(trade.unrealizedPnl)}`}>
                        {formatPrice(trade.unrealizedPnl)}
                      </p>
                      <p className={`text-sm ${getPnlColor(trade.unrealizedPnl)}`}>
                        {formatPct(trade.unrealizedPnlPct)}
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* 计划信息 */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  交易计划
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">计划入场价</p>
                      <p className="font-semibold">{formatPrice(trade.planEntryPrice)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">入场价格区间</p>
                      <p className="font-semibold">
                        {formatPrice(trade.planEntryPriceRangeLow)} - {formatPrice(trade.planEntryPriceRangeHigh)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">计划数量</p>
                      <p className="font-semibold">{trade.planQuantity || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">计划创建时间</p>
                      <p className="font-semibold">{formatDateTime(trade.planCreatedAt)}</p>
                    </div>
                  </div>

                  {trade.planStrategy && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">交易策略</p>
                      <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded">
                        {trade.planStrategy}
                      </p>
                    </div>
                  )}

                  {trade.planNotes && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">计划笔记</p>
                      <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded">
                        {trade.planNotes}
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {/* 止损止盈 */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  止损止盈
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">计划止损</p>
                    <p className="font-semibold text-red-600">{formatPrice(trade.planStopLoss)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">当前止损</p>
                    <p className="font-semibold text-red-600">{formatPrice(trade.stopLossPrice)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">计划止盈</p>
                    <p className="font-semibold text-green-600">{formatPrice(trade.planTakeProfit)}</p>
                  </div>
                </div>
                {trade.stopLossUpdatedAt && (
                  <p className="text-xs text-gray-500 mt-2">
                    最后更新: {formatDateTime(trade.stopLossUpdatedAt)}
                  </p>
                )}
              </Card>

              {/* 执行信息 */}
              {trade.entryTime && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    执行信息
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">入场时间</p>
                      <p className="font-semibold">{formatDateTime(trade.entryTime)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">入场价格</p>
                      <p className="font-semibold">{formatPrice(trade.entryPrice)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">入场数量</p>
                      <p className="font-semibold">{trade.entryQuantity}</p>
                    </div>
                  </div>
                  {trade.entryNotes && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-500 mb-1">入场笔记</p>
                      <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded">
                        {trade.entryNotes}
                      </p>
                    </div>
                  )}
                </Card>
              )}

              {/* 平仓信息 */}
              {trade.status === "closed" && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    平仓信息
                  </h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">平仓时间</p>
                      <p className="font-semibold">{formatDateTime(trade.exitTime)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">平仓价格</p>
                      <p className="font-semibold">{formatPrice(trade.exitPrice)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">平仓数量</p>
                      <p className="font-semibold">{trade.exitQuantity}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">净盈亏</p>
                      <p className={`font-semibold ${getPnlColor(trade.netPnl)}`}>
                        {formatPrice(trade.netPnl)} ({formatPct(trade.realizedPnlPct)})
                      </p>
                    </div>
                  </div>
                  {trade.exitNotes && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-500 mb-1">平仓笔记</p>
                      <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded">
                        {trade.exitNotes}
                      </p>
                    </div>
                  )}
                </Card>
              )}
            </TabsContent>

            {/* 笔记标签页 */}
            <TabsContent value="notes" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">暂无笔记</p>
                {onAddNote && (
                  <Button onClick={onAddNote}>
                    <Plus className="w-4 h-4 mr-2" />
                    添加笔记
                  </Button>
                )}
              </div>
            </TabsContent>

            {/* 截图标签页 */}
            <TabsContent value="screenshots" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">暂无截图</p>
                {onAddScreenshot && (
                  <Button onClick={onAddScreenshot}>
                    <Plus className="w-4 h-4 mr-2" />
                    上传截图
                  </Button>
                )}
              </div>
            </TabsContent>

            {/* 提醒标签页 */}
            <TabsContent value="alerts" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">暂无提醒</p>
                {onAddAlert && (
                  <Button onClick={onAddAlert}>
                    <Plus className="w-4 h-4 mr-2" />
                    创建提醒
                  </Button>
                )}
              </div>
            </TabsContent>

            {/* 时间线标签页 */}
            <TabsContent value="timeline" className="space-y-4">
              <div className="space-y-3">
                {trade.planCreatedAt && (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 w-px bg-gray-200 dark:bg-gray-700 mt-2"></div>
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-semibold">创建交易计划</p>
                      <p className="text-sm text-gray-500">{formatDateTime(trade.planCreatedAt)}</p>
                    </div>
                  </div>
                )}

                {trade.entryTime && (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      </div>
                      {trade.status !== "closed" && (
                        <div className="flex-1 w-px bg-gray-200 dark:bg-gray-700 mt-2"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-semibold">开仓入场</p>
                      <p className="text-sm text-gray-500">{formatDateTime(trade.entryTime)}</p>
                      <p className="text-sm">价格: {formatPrice(trade.entryPrice)} | 数量: {trade.entryQuantity}</p>
                    </div>
                  </div>
                )}

                {trade.exitTime && (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-purple-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">平仓离场</p>
                      <p className="text-sm text-gray-500">{formatDateTime(trade.exitTime)}</p>
                      <p className="text-sm">价格: {formatPrice(trade.exitPrice)} | 盈亏: {formatPrice(trade.netPnl)}</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* 分享卡片弹窗 */}
      <Dialog open={showShareCard} onOpenChange={setShowShareCard}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-transparent border-none shadow-none">
          {trade && <ShareTradeCard trade={trade} onClose={() => setShowShareCard(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
