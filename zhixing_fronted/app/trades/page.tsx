"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, TrendingUp, TrendingDown, DollarSign, Target, Upload, X, ArrowLeft } from "lucide-react";
import TradeCard from "@/components/trades/TradeCard";
import TradeFilters from "@/components/trades/TradeFilters";
import TradePlanForm from "@/components/trades/TradePlanForm";
import TradeDetail from "@/components/trades/TradeDetail";
import type { Trade, TradeFilters as TradeFiltersType, TradeStatistics } from "./types";
 

// Mock 数据
const mockTrades: Trade[] = [
  {
    id: 1,
    symbol: "AAPL",
    stockName: "Apple Inc.",
    status: "active",
    planType: "long",
    planEntryPrice: 180.50,
    planEntryPriceRangeLow: 179.00,
    planEntryPriceRangeHigh: 182.00,
    planQuantity: 100,
    planStopLoss: 175.00,
    planTakeProfit: 190.00,
    planNotes: "突破月线阻力位，成交量放大",
    planStrategy: "技术面突破+基本面支撑，iPhone销量超预期",
    planCreatedAt: "2024-10-15T10:00:00Z",
    entryPrice: 180.80,
    entryTime: "2024-10-15T14:30:00Z",
    entryQuantity: 100,
    entryNotes: "按计划入场，突破后回踩确认支撑",
    currentPrice: 185.20,
    currentQuantity: 100,
    unrealizedPnl: 440.00,
    unrealizedPnlPct: 2.43,
    stopLossPrice: 177.00,
    takeProfitPrice: 190.00,
    createdAt: "2024-10-15T10:00:00Z",
    updatedAt: "2024-10-18T09:00:00Z",
    noteCount: 3,
    screenshotCount: 2,
    alertCount: 2,
  },
  {
    id: 2,
    symbol: "TSLA",
    stockName: "Tesla Inc.",
    status: "active",
    planType: "long",
    planEntryPrice: 220.00,
    planQuantity: 50,
    planStopLoss: 210.00,
    planTakeProfit: 240.00,
    planStrategy: "新能源板块轮动，关注交付数据",
    planCreatedAt: "2024-10-12T09:00:00Z",
    entryPrice: 221.50,
    entryTime: "2024-10-13T10:30:00Z",
    entryQuantity: 50,
    currentPrice: 215.80,
    currentQuantity: 50,
    unrealizedPnl: -285.00,
    unrealizedPnlPct: -2.57,
    stopLossPrice: 210.00,
    takeProfitPrice: 240.00,
    createdAt: "2024-10-12T09:00:00Z",
    updatedAt: "2024-10-18T09:00:00Z",
    noteCount: 2,
    screenshotCount: 1,
    alertCount: 1,
  },
  {
    id: 3,
    symbol: "NVDA",
    stockName: "NVIDIA Corporation",
    status: "pending",
    planType: "long",
    planEntryPrice: 450.00,
    planEntryPriceRangeLow: 445.00,
    planEntryPriceRangeHigh: 455.00,
    planQuantity: 20,
    planStopLoss: 430.00,
    planTakeProfit: 480.00,
    planStrategy: "AI芯片需求强劲，等待回调入场",
    planNotes: "关注财报日期，注意市场情绪",
    planCreatedAt: "2024-10-17T15:00:00Z",
    createdAt: "2024-10-17T15:00:00Z",
    updatedAt: "2024-10-17T15:00:00Z",
    noteCount: 1,
    alertCount: 1,
  },
  {
    id: 4,
    symbol: "MSFT",
    stockName: "Microsoft Corporation",
    status: "closed",
    planType: "long",
    planEntryPrice: 340.00,
    planQuantity: 30,
    planStopLoss: 330.00,
    planTakeProfit: 360.00,
    planStrategy: "云服务增长稳定，AI业务加持",
    planCreatedAt: "2024-10-01T10:00:00Z",
    entryPrice: 341.20,
    entryTime: "2024-10-02T11:00:00Z",
    entryQuantity: 30,
    exitPrice: 355.80,
    exitTime: "2024-10-10T15:00:00Z",
    exitQuantity: 30,
    realizedPnl: 438.00,
    realizedPnlPct: 4.28,
    commission: 10.00,
    netPnl: 428.00,
    createdAt: "2024-10-01T10:00:00Z",
    updatedAt: "2024-10-10T15:00:00Z",
    reviewRating: 5,
    reviewNotes: "完美执行，达到止盈目标",
    noteCount: 4,
    screenshotCount: 3,
  },
  {
    id: 5,
    symbol: "GOOGL",
    stockName: "Alphabet Inc.",
    status: "closed",
    planType: "long",
    planEntryPrice: 140.00,
    planQuantity: 50,
    planStopLoss: 135.00,
    planTakeProfit: 150.00,
    planCreatedAt: "2024-09-20T10:00:00Z",
    entryPrice: 139.80,
    entryTime: "2024-09-21T10:00:00Z",
    entryQuantity: 50,
    exitPrice: 136.50,
    exitTime: "2024-09-28T14:00:00Z",
    exitQuantity: 50,
    realizedPnl: -165.00,
    realizedPnlPct: -2.36,
    commission: 10.00,
    netPnl: -175.00,
    createdAt: "2024-09-20T10:00:00Z",
    updatedAt: "2024-09-28T14:00:00Z",
    reviewRating: 3,
    reviewNotes: "止损出局，市场环境转差",
    reviewLessons: "应该更早关注大盘走势",
    noteCount: 3,
    screenshotCount: 2,
  },
  {
    id: 6,
    symbol: "META",
    stockName: "Meta Platforms Inc.",
    status: "pending",
    planType: "long",
    planEntryPrice: 320.00,
    planEntryPriceRangeLow: 315.00,
    planEntryPriceRangeHigh: 325.00,
    planQuantity: 25,
    planStopLoss: 305.00,
    planTakeProfit: 345.00,
    planStrategy: "VR/AR业务转折点，广告收入恢复",
    planNotes: "等待Q3财报，关注用户增长数据",
    planCreatedAt: "2024-10-18T08:00:00Z",
    createdAt: "2024-10-18T08:00:00Z",
    updatedAt: "2024-10-18T08:00:00Z",
    noteCount: 1,
  },
];

const mockStatistics: TradeStatistics = {
  totalTrades: 6,
  activeTrades: 2,
  pendingTrades: 2,
  closedTrades: 2,
  winCount: 1,
  lossCount: 1,
  winRate: 50.0,
  totalPnl: 253.00,
  avgPnl: 126.50,
  maxProfit: 428.00,
  maxLoss: -175.00,
  maxConsecutiveWins: 1,
  maxConsecutiveLosses: 1,
};

export default function TradesPage() {
  const router = useRouter();
  const [trades, setTrades] = useState<Trade[]>(mockTrades);
  const [filters, setFilters] = useState<TradeFiltersType>({});
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
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
    <div className="container mx-auto p-6 space-y-6">
      
      {/* 标题和操作 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/")}
            className="hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">我的交易</h1>
            <p className="text-gray-500 mt-1">管理你的交易计划、持仓和历史记录</p>
          </div>
        </div>
      </div>

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

      {/* 交易计划表单 */}
      <TradePlanForm
        trade={editingTrade}
        open={showPlanForm}
        onClose={() => {
          setShowPlanForm(false);
          setEditingTrade(null);
        }}
        onSave={handleSavePlan}
      />

      

      {/* 交易详情 */}
      <TradeDetail
        trade={selectedTrade}
        open={!!selectedTrade}
        onClose={() => setSelectedTrade(null)}
      />

      {/* 添加笔记对话框 */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              添加笔记 - {currentTrade?.symbol} {currentTrade?.stockName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="note-title">笔记标题</Label>
              <Input
                id="note-title"
                placeholder="例如：入场观察、持仓分析、平仓总结..."
              />
            </div>
            <div>
              <Label htmlFor="note-content">笔记内容</Label>
              <Textarea
                id="note-content"
                placeholder="记录你对这次交易的想法、观察、分析..."
                rows={8}
              />
            </div>
            <div className="text-sm text-gray-500">
              💡 提示：你可以记录K线形态、技术指标、市场情绪、新闻事件等任何与交易相关的内容
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={() => {
              // TODO: 保存笔记
              alert("笔记已保存（演示模式）");
              setNoteDialogOpen(false);
            }}>
              保存笔记
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 上传截图对话框 */}
      <Dialog open={screenshotDialogOpen} onOpenChange={setScreenshotDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              上传截图 - {currentTrade?.symbol} {currentTrade?.stockName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-sm text-gray-600 mb-2">
                点击上传或拖拽图片到这里
              </p>
              <p className="text-xs text-gray-400">
                支持 JPG、PNG、GIF 格式，最大 10MB
              </p>
              <Input
                type="file"
                accept="image/*"
                className="mt-4"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    alert(`已选择文件：${e.target.files[0].name}（演示模式）`);
                  }
                }}
              />
            </div>
            <div>
              <Label htmlFor="screenshot-desc">截图说明</Label>
              <Textarea
                id="screenshot-desc"
                placeholder="描述这张截图的内容和重要性..."
                rows={3}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm">K线图</Button>
              <Button variant="outline" size="sm">入场点</Button>
              <Button variant="outline" size="sm">平仓点</Button>
              <Button variant="outline" size="sm">技术指标</Button>
              <Button variant="outline" size="sm">其他</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScreenshotDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={() => {
              // TODO: 上传截图
              alert("截图已上传（演示模式）");
              setScreenshotDialogOpen(false);
            }}>
              上传
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 设置提醒对话框 */}
      <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              设置提醒 - {currentTrade?.symbol} {currentTrade?.stockName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="alert-type">提醒类型</Label>
              <select className="w-full border rounded-md p-2" id="alert-type">
                <option value="price">价格提醒</option>
                <option value="pnl">盈亏提醒</option>
                <option value="time">时间提醒</option>
              </select>
            </div>
            <div>
              <Label htmlFor="alert-price">触发价格</Label>
              <Input
                id="alert-price"
                type="number"
                step="0.01"
                placeholder="例如：190.00"
              />
            </div>
            <div>
              <Label htmlFor="alert-message">提醒内容</Label>
              <Textarea
                id="alert-message"
                placeholder="价格突破目标位，考虑止盈..."
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="notify-browser" className="rounded" defaultChecked />
              <Label htmlFor="notify-browser" className="cursor-pointer">浏览器通知</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlertDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={() => {
              // TODO: 保存提醒
              alert("提醒已设置（演示模式）");
              setAlertDialogOpen(false);
            }}>
              设置提醒
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

