"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Calendar,
  Activity,
  FileText,
  Image as ImageIcon,
  Bell,
  Plus,
  Edit,
  AlertTriangle,
  TrendingDown as TrendingDownIcon
} from "lucide-react";
import type { Trade } from "@/app/trades/types";
import { mockTrades } from "@/app/trades/mockData";
import UnifiedNoteDialog from "@/components/notes/UnifiedNoteDialog";
import ImageManager from "@/components/trades/ImageManager";
import AlertConfigDialog, { AlertConfig } from "@/components/trades/AlertConfigDialog";
import ForcedTradePlanForm from "@/components/tradePlan/ForcedTradePlanForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getViolationColor, getViolationLabel } from "@/lib/violations";
import { toast } from "sonner";



export default function TradeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tradeId = parseInt(params.id as string);

  const [trade, setTrade] = useState<Trade | null>(null);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [imageManagerOpen, setImageManagerOpen] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [editPlanOpen, setEditPlanOpen] = useState(false);

  // 加载交易数据
  useEffect(() => {
    // 从 localStorage 或 mock 数据加载
    const loadTrade = () => {
      try {
        const stored = localStorage.getItem("trades");
        if (stored) {
          const trades: Trade[] = JSON.parse(stored);
          const found = trades.find(t => t.id === tradeId);
          if (found) {
            setTrade(found);
            return;
          }
        }
      } catch (err) {
        console.error("加载交易失败:", err);
      }

      // 从 mock 数据加载
      const found = mockTrades.find(t => t.id === tradeId);
      if (found) {
        setTrade(found);
      } else {
        toast.error("交易不存在");
        router.push("/");
      }
    };

    loadTrade();
  }, [tradeId, router]);

  if (!trade) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  const tradeType = trade.planType === "long" ? "做多" : "做空";
  const TradeIcon = trade.planType === "long" ? TrendingUp : TrendingDown;
  const tradeTypeColor = trade.planType === "long" ? "text-green-600" : "text-red-600";

  // 状态配置
  const statusConfig: Record<string, { label: string; color: string }> = {
    planned: { label: "计划中", color: "bg-gray-500" },
    pending: { label: "等待执行", color: "bg-yellow-500" },
    active: { label: "持仓中", color: "bg-blue-500" },
    closed: { label: "已平仓", color: "bg-green-500" },
    cancelled: { label: "已取消", color: "bg-red-500" },
  };

  const status = statusConfig[trade.status] || statusConfig.pending;

  // 格式化函数
  const formatPrice = (price?: number) => price ? `$${price.toFixed(2)}` : "-";
  const formatPct = (pct?: number) => {
    if (!pct) return "-";
    const sign = pct > 0 ? "+" : "";
    return `${sign}${pct.toFixed(2)}%`;
  };
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("zh-CN");
  };
  const getPnlColor = (pnl?: number) => {
    if (!pnl) return "text-gray-500";
    return pnl > 0 ? "text-green-600" : pnl < 0 ? "text-red-600" : "text-gray-500";
  };

  const diff = (plan?: number, actual?: number) => {
    if (plan == null || actual == null) return { d: 0, pct: 0, has: false };
    const d = actual - plan;
    const pct = plan !== 0 ? (d / plan) * 100 : 0;
    return { d, pct, has: true };
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 顶部导航 */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // 返回到交易列表（主页的交易菜单）
            router.push("/#trades");
          }}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回交易列表
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <TradeIcon className={`w-6 h-6 ${tradeTypeColor}`} />
            <h1 className="text-2xl font-bold">
              {trade.symbol} - {trade.stockName}
            </h1>
            <Badge className={status.color}>{status.label}</Badge>
            <Badge variant="outline">{tradeType}</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            交易 ID: #{trade.id} | 创建于 {formatDateTime(trade.planCreatedAt || trade.createdAt)}
          </p>
        </div>
        {(trade.status === "planned" || trade.status === "pending") && (
          <Button onClick={() => setEditPlanOpen(true)}>
            <Edit className="w-4 h-4 mr-2" />
            编辑计划
          </Button>
        )}
      </div>

      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：核心数据 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 持仓概览 */}
          {trade.status === "active" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  持仓概览
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">入场价格</p>
                    <p className="text-2xl font-bold">{formatPrice(trade.entryPrice)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">当前价格</p>
                    <p className="text-2xl font-bold">{formatPrice(trade.currentPrice)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">持仓数量</p>
                    <p className="text-2xl font-bold">{trade.currentQuantity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">浮动盈亏</p>
                    <p className={`text-2xl font-bold ${getPnlColor(trade.unrealizedPnl)}`}>
                      {formatPrice(trade.unrealizedPnl)}
                    </p>
                    <p className={`text-sm ${getPnlColor(trade.unrealizedPnl)}`}>
                      {formatPct(trade.unrealizedPnlPct)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 计划信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                交易计划
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">计划入场价</p>
                  <p className="font-semibold text-lg">{formatPrice(trade.planEntryPrice)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">入场价格区间</p>
                  <p className="font-semibold text-lg">
                    {formatPrice(trade.planEntryPriceRangeLow)} - {formatPrice(trade.planEntryPriceRangeHigh)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">计划数量</p>
                  <p className="font-semibold text-lg">{trade.planQuantity || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">计划创建时间</p>
                  <p className="font-semibold text-lg">{formatDateTime(trade.planCreatedAt)}</p>
                </div>
              </div>

              {/* 策略标签 */}
              {trade.strategyTags && trade.strategyTags.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">策略标签</p>
                  <div className="flex flex-wrap gap-2">
                    {trade.strategyTags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {trade.planStrategy && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">交易策略</p>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{trade.planStrategy}</p>
                  </div>
                </div>
              )}

              {trade.planNotes && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">计划笔记</p>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{trade.planNotes}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 止损止盈 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                止损止盈
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">计划止损</p>
                  <p className="font-semibold text-lg text-red-600">{formatPrice(trade.planStopLoss)}</p>
                  {trade.planStopLoss && trade.planEntryPrice && (
                    <p className="text-xs text-gray-500">
                      {((trade.planStopLoss - trade.planEntryPrice) / trade.planEntryPrice * 100).toFixed(2)}%
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">当前止损</p>
                  <p className="font-semibold text-lg text-red-600">{formatPrice(trade.stopLossPrice)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">计划止盈</p>
                  <p className="font-semibold text-lg text-green-600">{formatPrice(trade.planTakeProfit)}</p>
                  {trade.planTakeProfit && trade.planEntryPrice && (
                    <p className="text-xs text-gray-500">
                      {((trade.planTakeProfit - trade.planEntryPrice) / trade.planEntryPrice * 100).toFixed(2)}%
                    </p>
                  )}
                </div>
              </div>
              {trade.stopLossUpdatedAt && (
                <p className="text-xs text-gray-500 mt-3">
                  最后更新: {formatDateTime(trade.stopLossUpdatedAt)}
                </p>
              )}
            </CardContent>
          </Card>

          {/* 执行信息 */}
          {trade.entryTime && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  执行信息
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">入场时间</p>
                    <p className="font-semibold">{formatDateTime(trade.entryTime)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">入场价格</p>
                    <p className="font-semibold text-lg">{formatPrice(trade.entryPrice)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">入场数量</p>
                    <p className="font-semibold text-lg">{trade.entryQuantity}</p>
                  </div>
                </div>
                {trade.entryNotes && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-2">入场笔记</p>
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                      <p className="text-sm">{trade.entryNotes}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 计划 vs 实际对比 */}
          {(trade.entryPrice || trade.stopLossPrice || trade.takeProfitPrice) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  计划 vs 实际对比
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border bg-white dark:bg-gray-900">
                    <div className="text-sm text-gray-500 mb-2">入场价格</div>
                    <div className="space-y-1">
                      <div className="text-sm">计划: {formatPrice(trade.planEntryPrice)}</div>
                      <div className="text-sm">实际: {formatPrice(trade.entryPrice)}</div>
                      {(() => {
                        const r = diff(trade.planEntryPrice, trade.entryPrice);
                        return r.has ? (
                          <div className={`text-sm font-semibold ${r.d > 0 ? 'text-red-600' : r.d < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                            偏差: {r.d.toFixed(2)} ({r.pct.toFixed(2)}%)
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border bg-white dark:bg-gray-900">
                    <div className="text-sm text-gray-500 mb-2">止损价格</div>
                    <div className="space-y-1">
                      <div className="text-sm">计划: {formatPrice(trade.planStopLoss)}</div>
                      <div className="text-sm">实际: {formatPrice(trade.stopLossPrice)}</div>
                      {(() => {
                        const r = diff(trade.planStopLoss, trade.stopLossPrice);
                        return r.has ? (
                          <div className={`text-sm font-semibold ${r.d < 0 ? 'text-red-600' : r.d > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                            调整: {r.d.toFixed(2)} ({r.pct.toFixed(2)}%)
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border bg-white dark:bg-gray-900">
                    <div className="text-sm text-gray-500 mb-2">止盈价格</div>
                    <div className="space-y-1">
                      <div className="text-sm">计划: {formatPrice(trade.planTakeProfit)}</div>
                      <div className="text-sm">实际: {formatPrice(trade.takeProfitPrice)}</div>
                      {(() => {
                        const r = diff(trade.planTakeProfit, trade.takeProfitPrice);
                        return r.has ? (
                          <div className={`text-sm font-semibold ${r.d > 0 ? 'text-green-600' : r.d < 0 ? 'text-yellow-600' : 'text-gray-500'}`}>
                            调整: {r.d.toFixed(2)} ({r.pct.toFixed(2)}%)
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 平仓信息 */}
          {trade.status === "closed" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  平仓信息
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">平仓时间</p>
                    <p className="font-semibold">{formatDateTime(trade.exitTime)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">平仓价格</p>
                    <p className="font-semibold text-lg">{formatPrice(trade.exitPrice)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">平仓数量</p>
                    <p className="font-semibold text-lg">{trade.exitQuantity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">净盈亏</p>
                    <p className={`font-semibold text-lg ${getPnlColor(trade.netPnl)}`}>
                      {formatPrice(trade.netPnl)}
                    </p>
                    <p className={`text-sm ${getPnlColor(trade.netPnl)}`}>
                      {formatPct(trade.realizedPnlPct)}
                    </p>
                  </div>
                </div>
                {trade.exitNotes && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-2">平仓笔记</p>
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                      <p className="text-sm">{trade.exitNotes}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 违规记录 */}
          {trade.violations && trade.violations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  违规记录
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {trade.violations.map((v, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                      <AlertTriangle className={`w-5 h-5 mt-0.5 text-orange-500`} />
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{v.type}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{v.description}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          严重程度: {v.severity}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {trade.violationCost && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">总违规成本</span>
                      <span className="text-lg font-bold text-red-600">
                        ${trade.violationCost.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧：操作区域 */}
        <div className="space-y-6">
          {/* 快速操作 */}
          <Card>
            <CardHeader>
              <CardTitle>快速操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => setNoteDialogOpen(true)}
              >
                <FileText className="w-4 h-4 mr-2" />
                添加笔记
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => setImageManagerOpen(true)}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                管理图片
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => setAlertDialogOpen(true)}
              >
                <Bell className="w-4 h-4 mr-2" />
                设置提醒
              </Button>
            </CardContent>
          </Card>

          {/* 时间线 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                时间线
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trade.planCreatedAt && (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-blue-600" />
                      </div>
                      {(trade.entryTime || trade.exitTime) && (
                        <div className="flex-1 w-px bg-gray-200 dark:bg-gray-700 mt-2"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-semibold text-sm">创建交易计划</p>
                      <p className="text-xs text-gray-500">{formatDateTime(trade.planCreatedAt)}</p>
                    </div>
                  </div>
                )}

                {trade.entryTime && (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      </div>
                      {trade.exitTime && (
                        <div className="flex-1 w-px bg-gray-200 dark:bg-gray-700 mt-2"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-semibold text-sm">开仓入场</p>
                      <p className="text-xs text-gray-500">{formatDateTime(trade.entryTime)}</p>
                      <p className="text-xs text-gray-600">
                        价格: {formatPrice(trade.entryPrice)} | 数量: {trade.entryQuantity}
                      </p>
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
                      <p className="font-semibold text-sm">平仓离场</p>
                      <p className="text-xs text-gray-500">{formatDateTime(trade.exitTime)}</p>
                      <p className="text-xs text-gray-600">
                        价格: {formatPrice(trade.exitPrice)} | 盈亏: {formatPrice(trade.netPnl)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 统一笔记弹框 */}
      <UnifiedNoteDialog
        open={noteDialogOpen}
        onClose={() => setNoteDialogOpen(false)}
        preset={{
          symbol: trade.symbol,
          symbolName: trade.stockName,
          relatedType: 'trade',
        }}
        locks={{ symbol: true }}
        onSave={() => {
          toast.success("笔记已保存");
          setNoteDialogOpen(false);
        }}
      />

      {/* 图片管理弹框 */}
      <ImageManager
        open={imageManagerOpen}
        onClose={() => setImageManagerOpen(false)}
        tradeId={trade.id}
      />

      {/* 提醒配置弹框 */}
      <AlertConfigDialog
        open={alertDialogOpen}
        onClose={() => setAlertDialogOpen(false)}
        initial={{}}
        onSave={(cfg) => {
          console.log("保存提醒配置:", cfg);
          toast.success("提醒设置已保存");
          setAlertDialogOpen(false);
        }}
      />

      {/* 编辑计划弹框 */}
      {(trade.status === "planned" || trade.status === "pending") && (
        <Dialog open={editPlanOpen} onOpenChange={setEditPlanOpen}>
          <DialogContent className="max-w-[96vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑交易计划</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <ForcedTradePlanForm
                symbol={trade.symbol}
                name={trade.stockName}
                currentPrice={trade.currentPrice || trade.planEntryPrice || 0}
                onSubmit={(plan) => {
                  // 更新交易计划逻辑
                  console.log("更新计划:", plan);
                  toast.success("交易计划已更新");
                  setEditPlanOpen(false);
                  // TODO: 实际更新到 localStorage 或后端
                }}
                onCancel={() => setEditPlanOpen(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

