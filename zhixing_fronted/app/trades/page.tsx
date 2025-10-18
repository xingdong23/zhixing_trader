"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";
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
  const [trades, setTrades] = useState<Trade[]>(mockTrades);
  const [filters, setFilters] = useState<TradeFiltersType>({});
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "pending" | "history">("active");

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">我的交易</h1>
          <p className="text-gray-500 mt-1">管理你的交易计划、持仓和历史记录</p>
        </div>
        <Button onClick={() => setShowPlanForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          创建交易计划
        </Button>
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
    </div>
  );
}

