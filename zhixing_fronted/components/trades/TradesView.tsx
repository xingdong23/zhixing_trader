"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, TrendingUp, TrendingDown, DollarSign, Target, Upload } from "lucide-react";
import TradeCard from "@/components/trades/TradeCard";
import TradeFilters from "@/components/trades/TradeFilters";
import TradePlanForm from "@/components/trades/TradePlanForm";
import TradeDetail from "@/components/trades/TradeDetail";
import type { Trade, TradeFilters as TradeFiltersType, TradeStatistics } from "@/app/trades/types";
import ForcedTradePlanForm from "@/components/tradePlan/ForcedTradePlanForm";
import type { TradePlan } from "@/lib/tradePlan";

// Mock 数据
import { mockTrades, mockStatistics } from "@/app/trades/mockData";

export default function TradesView() {
  const router = useRouter();
  const [trades, setTrades] = useState<Trade[]>(mockTrades);
  const [filters, setFilters] = useState<TradeFiltersType>({});
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  // 强制计划表单（演示）
  const [showForcedPlanForm, setShowForcedPlanForm] = useState(false);
  const demoStock = { symbol: "AAPL", name: "苹果公司", price: 182.3 };
  const [activeTab, setActiveTab] = useState<"active" | "pending" | "history">("active");
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [screenshotDialogOpen, setScreenshotDialogOpen] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [currentTrade, setCurrentTrade] = useState<Trade | null>(null);

  // 筛选交易
  const filteredTrades = useMemo(() => {
    let result = trades;

    // 按标签页筛选
    if (activeTab === "active") {
      result = result.filter(t => t.status === "active");
    } else if (activeTab === "pending") {
      result = result.filter(t => t.status === "pending" || t.status === "planned");
    } else {
      result = result.filter(t => t.status === "closed" || t.status === "cancelled");
    }

    // 按筛选条件
    if (filters.symbol) {
      result = result.filter(t => t.symbol.toLowerCase().includes(filters.symbol!.toLowerCase()));
    }
    if (filters.status && filters.status.length > 0) {
      result = result.filter(t => filters.status!.includes(t.status));
    }
    if (filters.tradeType) {
      result = result.filter(t => t.planType === filters.tradeType);
    }
    if (filters.startDate) {
      result = result.filter(t => new Date(t.createdAt) >= new Date(filters.startDate!));
    }
    if (filters.endDate) {
      result = result.filter(t => new Date(t.createdAt) <= new Date(filters.endDate!));
    }

    return result;
  }, [trades, filters, activeTab]);

  // 计算当前标签页的统计数据
  const currentStats = useMemo(() => {
    if (activeTab === "active") {
      const activeTrades = filteredTrades;
      const totalUnrealizedPnl = activeTrades.reduce((sum, t) => sum + (t.unrealizedPnl || 0), 0);
      return {
        count: activeTrades.length,
        totalPnl: totalUnrealizedPnl,
        profitCount: activeTrades.filter(t => (t.unrealizedPnl || 0) > 0).length,
        lossCount: activeTrades.filter(t => (t.unrealizedPnl || 0) < 0).length,
      };
    } else if (activeTab === "pending") {
      return {
        count: filteredTrades.length,
      };
    } else {
      const totalRealizedPnl = filteredTrades.reduce((sum, t) => sum + (t.netPnl || 0), 0);
      const profitCount = filteredTrades.filter(t => (t.netPnl || 0) > 0).length;
      const lossCount = filteredTrades.filter(t => (t.netPnl || 0) < 0).length;
      const winRate = filteredTrades.length > 0 ? (profitCount / filteredTrades.length * 100) : 0;
      return {
        count: filteredTrades.length,
        totalPnl: totalRealizedPnl,
        profitCount,
        lossCount,
        winRate,
      };
    }
  }, [filteredTrades, activeTab]);

  // 处理创建/更新交易计划
  const handleSavePlan = (tradeData: Partial<Trade>) => {
    if (editingTrade) {
      // 更新
      setTrades(prev => prev.map(t => t.id === editingTrade.id ? { ...t, ...tradeData, updatedAt: new Date().toISOString() } : t));
    } else {
      // 创建
      const newTrade: Trade = {
        ...tradeData,
        id: Math.max(...trades.map(t => t.id)) + 1,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        planCreatedAt: new Date().toISOString(),
      } as Trade;
      setTrades(prev => [newTrade, ...prev]);
    }
    setShowPlanForm(false);
    setEditingTrade(null);
  };

  // 重置筛选
  const handleResetFilters = () => {
    setFilters({});
  };

  // 添加笔记
  const handleAddNote = (trade: Trade) => {
    setCurrentTrade(trade);
    setNoteDialogOpen(true);
  };

  // 上传截图
  const handleAddScreenshot = (trade: Trade) => {
    setCurrentTrade(trade);
    setScreenshotDialogOpen(true);
  };

  // 设置提醒
  const handleAddAlert = (trade: Trade) => {
    setCurrentTrade(trade);
    setAlertDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">总交易数</p>
              <p className="text-2xl font-bold">{mockStatistics.totalTrades}</p>
            </div>
            <Target className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">持仓中</p>
              <p className="text-2xl font-bold">{mockStatistics.activeTrades}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">胜率</p>
              <p className="text-2xl font-bold">{mockStatistics.winRate.toFixed(1)}%</p>
            </div>
            <Target className="w-8 h-8 text-purple-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">总盈亏</p>
              <p className={`text-2xl font-bold ${mockStatistics.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${mockStatistics.totalPnl.toFixed(2)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-yellow-500" />
          </div>
        </Card>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-between items-center">
        <div></div>
        <Button onClick={() => setShowForcedPlanForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          创建强制交易计划（AAPL演示）
        </Button>
      </div>

      {/* 标签页切换 */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === "active" ? "default" : "ghost"}
          onClick={() => setActiveTab("active")}
          className="rounded-b-none"
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          正在交易 ({mockStatistics.activeTrades})
        </Button>
        <Button
          variant={activeTab === "pending" ? "default" : "ghost"}
          onClick={() => setActiveTab("pending")}
          className="rounded-b-none"
        >
          <Target className="w-4 h-4 mr-2" />
          等待执行 ({mockStatistics.pendingTrades})
        </Button>
        <Button
          variant={activeTab === "history" ? "default" : "ghost"}
          onClick={() => setActiveTab("history")}
          className="rounded-b-none"
        >
          <DollarSign className="w-4 h-4 mr-2" />
          历史记录 ({mockStatistics.closedTrades})
        </Button>
      </div>

      {/* 当前标签页统计 */}
      <Card className="p-4">
        <div className="flex items-center gap-8">
          <div>
            <p className="text-sm text-gray-500">数量</p>
            <p className="text-xl font-bold">{currentStats.count}</p>
          </div>
          {currentStats.totalPnl !== undefined && (
            <div>
              <p className="text-sm text-gray-500">{activeTab === "active" ? "浮动盈亏" : "已实现盈亏"}</p>
              <p className={`text-xl font-bold ${currentStats.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${currentStats.totalPnl.toFixed(2)}
              </p>
            </div>
          )}
          {currentStats.profitCount !== undefined && (
            <>
              <div>
                <p className="text-sm text-gray-500">盈利</p>
                <p className="text-xl font-bold text-green-600">{currentStats.profitCount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">亏损</p>
                <p className="text-xl font-bold text-red-600">{currentStats.lossCount}</p>
              </div>
            </>
          )}
          {currentStats.winRate !== undefined && (
            <div>
              <p className="text-sm text-gray-500">胜率</p>
              <p className="text-xl font-bold">{currentStats.winRate.toFixed(1)}%</p>
            </div>
          )}
        </div>
      </Card>

      {/* 筛选器 */}
      <TradeFilters
        filters={filters}
        onFilterChange={setFilters}
        onReset={handleResetFilters}
      />

      {/* 交易列表 */}
      <div className="space-y-4">
        {filteredTrades.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-gray-500">暂无交易记录</p>
            <Button className="mt-4" onClick={() => setShowPlanForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              创建第一个交易计划
            </Button>
          </Card>
        ) : (
          filteredTrades.map(trade => (
            <TradeCard
              key={trade.id}
              trade={trade}
              onViewDetails={setSelectedTrade}
              onEdit={(t) => {
                setEditingTrade(t);
                setShowPlanForm(true);
              }}
              onAddNote={handleAddNote}
              onAddScreenshot={handleAddScreenshot}
              onAddAlert={handleAddAlert}
            />
          ))
        )}
      </div>

      {/* 交易计划表单（普通） */}
      <TradePlanForm
        trade={editingTrade}
        open={showPlanForm}
        onClose={() => {
          setShowPlanForm(false);
          setEditingTrade(null);
        }}
        onSave={handleSavePlan}
      />

      {/* 强制交易计划表单（演示专用） */}
      <Dialog open={showForcedPlanForm} onOpenChange={setShowForcedPlanForm}>
        <DialogContent className="max-w-[96vw] min-w-[1100px] w-[1400px] h-[90vh] flex flex-col p-0">
          <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b px-6 py-4">
            <DialogHeader>
              <DialogTitle className="text-2xl">💪 创建强制交易计划 - {demoStock.symbol} ({demoStock.name})</DialogTitle>
            </DialogHeader>
          </div>
          <div className="flex-1 overflow-hidden min-h-0">
            <ForcedTradePlanForm
              symbol={demoStock.symbol}
              name={demoStock.name}
              currentPrice={demoStock.price}
              onSubmit={(plan: TradePlan) => {
                const id = `${plan.symbol}-${Date.now()}`
                setShowForcedPlanForm(false)
                router.push(`/plan/${id}`)
              }}
              onCancel={() => setShowForcedPlanForm(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* 交易详情 */}
      {selectedTrade && (
        <TradeDetail
          trade={selectedTrade}
          open={!!selectedTrade}
          onClose={() => setSelectedTrade(null)}
        />
      )}

      {/* 添加笔记对话框 */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加交易笔记</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>笔记内容</Label>
              <Textarea placeholder="记录你的交易想法..." rows={6} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>取消</Button>
            <Button onClick={() => setNoteDialogOpen(false)}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 上传截图对话框 */}
      <Dialog open={screenshotDialogOpen} onOpenChange={setScreenshotDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>上传K线截图</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">点击或拖拽图片到这里</p>
              <Input type="file" accept="image/*" className="hidden" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScreenshotDialogOpen(false)}>取消</Button>
            <Button onClick={() => setScreenshotDialogOpen(false)}>上传</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 设置提醒对话框 */}
      <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>设置提醒</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>提醒类型</Label>
              <Input placeholder="如：价格到达目标、止损提醒等" />
            </div>
            <div>
              <Label>提醒条件</Label>
              <Input placeholder="如：价格 >= $100" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlertDialogOpen(false)}>取消</Button>
            <Button onClick={() => setAlertDialogOpen(false)}>设置</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

