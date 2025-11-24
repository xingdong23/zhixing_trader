"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";
import TradeCard from "@/components/trades/TradeCard";
import TradeFilters from "@/components/trades/TradeFilters";
import TradePlanForm from "@/components/trades/TradePlanForm";
import type { Trade, TradeFilters as TradeFiltersType, TradeStatistics } from "@/app/trades/types";
import ForcedTradePlanForm from "@/components/tradePlan/ForcedTradePlanForm";
import type { TradePlan } from "@/lib/tradePlan";
import ManualTradeDialog from "@/components/trades/ManualTradeDialog";
import PnlChartCard from "@/components/trades/PnlChartCard";
import RiskWidget from "@/components/trades/RiskWidget";
import SavedFiltersMenu from "@/components/trades/SavedFiltersMenu";
import AlertConfigDialog, { AlertConfig } from "@/components/trades/AlertConfigDialog";
import ViolationStats from "@/components/trades/ViolationStats";
import GoalProgressCard from "@/components/trades/GoalProgressCard";
import { computeEquityCurve, computeMaxDrawdown } from "@/lib/metrics";
import { detectViolations, calculateViolationCost } from "@/lib/violations";
import { toast } from "sonner";
import TradingDisciplineReminder from "@/components/trading/TradingDisciplineReminder";
import PreTradeChecklist from "@/components/trading/PreTradeChecklist";

import { useLiveQuery } from "dexie-react-hooks";
import { db, migrateFromLocalStorage } from "@/lib/db";

// Mock 数据 (仅用于初始化或fallback)
import { mockTrades, mockStatistics } from "@/app/trades/mockData";

export default function TradesView() {
  const router = useRouter();

  // 使用 Dexie 的 useLiveQuery 实时获取数据
  const rawTrades = useLiveQuery(() => db.trades.orderBy('createdAt').reverse().toArray()) || [];

  // 自动检测违规 (Computed)
  const trades = useMemo(() => {
    return rawTrades.map(trade => {
      const violations = detectViolations(trade);
      const violationCost = calculateViolationCost({ ...trade, violations });
      return { ...trade, violations, violationCost };
    });
  }, [rawTrades]);

  const [filters, setFilters] = useState<TradeFiltersType>({});
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  // 强制计划表单（演示）
  const [showForcedPlanForm, setShowForcedPlanForm] = useState(false);
  const [selectedStockForPlan, setSelectedStockForPlan] = useState<{ symbol: string, name: string, price: number } | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "pending" | "history">("active");
  const fileInputRef = React.useRef<HTMLInputElement>(null as any);
  const [importMessage, setImportMessage] = useState<string>("");
  const [manualOpen, setManualOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertCfg, setAlertCfg] = useState<AlertConfig>({});
  // 加载配置
  React.useEffect(() => {
    db.settings.get('alertConfig').then(item => {
      if (item) setAlertCfg(item.value);
    });
  }, []);
  const [goalTriggered, setGoalTriggered] = useState(false);
  const [ddTriggered, setDdTriggered] = useState(false);
  const [highlightTradeId, setHighlightTradeId] = useState<number | null>(null);

  // 交易前检查清单状态
  const [showPreTradeChecklist, setShowPreTradeChecklist] = useState(false);
  const [pendingTradeAction, setPendingTradeAction] = useState<'create_plan' | 'manual_entry' | null>(null);

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

  // 自动检测违规逻辑已移至 useMemo
  // React.useEffect(() => { ... }, [trades]);

  // 迁移数据（仅一次）
  React.useEffect(() => {
    migrateFromLocalStorage();
  }, []);

  // 移除旧的 LocalStorage 同步逻辑
  // React.useEffect(() => { ... }, [trades]);

  // 提醒触发检查
  React.useEffect(() => {
    const totalPnl = trades.reduce((s, t) => s + (t.netPnl || t.realizedPnl || 0), 0);
    const curve = computeEquityCurve(trades, 100000, "day");
    const dd = computeMaxDrawdown(curve);
    if (alertCfg?.targetTotalPnl != null && totalPnl >= (alertCfg.targetTotalPnl || 0)) {
      if (!goalTriggered) {
        toast.success(`🎯 盈利目标已达成：$${totalPnl.toFixed(2)}`);
        setGoalTriggered(true);
      }
    } else {
      setGoalTriggered(false);
    }
    if (alertCfg?.maxDrawdownPct != null && dd >= (alertCfg.maxDrawdownPct || 0)) {
      if (!ddTriggered) {
        toast.warning(`⚠️ 最大回撤达到 ${dd.toFixed(2)}%`);
        setDdTriggered(true);
      }
    } else {
      setDdTriggered(false);
    }
  }, [trades, alertCfg]);

  // CSV 导入/导出（轻量实现）
  const triggerPickCsv = () => fileInputRef.current?.click();

  const parseCsv = (text: string): Array<Record<string, string>> => {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return [];
    const header = lines[0];
    const columns = header.split(",").map((c) => c.trim());
    const rows: Array<Record<string, string>> = [];
    for (let i = 1; i < lines.length; i++) {
      const raw = lines[i];
      // 简易CSV解析（不支持复杂嵌套逗号场景），MVP足够
      const parts = raw
        .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/) // 处理引号包含逗号
        .map((s) => s.replace(/^"|"$/g, "").trim());
      if (parts.length !== columns.length) continue;
      const obj: Record<string, string> = {};
      columns.forEach((c, idx) => (obj[c] = parts[idx] ?? ""));
      rows.push(obj);
    }
    return rows;
  };

  const handleCsvPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const rows = parseCsv(text);
        if (rows.length === 0) {
          setImportMessage("CSV为空或格式不正确");
          return;
        }
        let added = 0;
        const now = new Date().toISOString();
        const nextIdBase = trades.length > 0 ? Math.max(...trades.map((t) => t.id)) + 1 : 1;
        let idCursor = nextIdBase;
        const existingKey = new Set(trades.map((t) => `${t.symbol}|${t.createdAt}`));
        const newOnes: Trade[] = [];
        rows.forEach((r) => {
          const symbol = r.symbol || r.Symbol || r.SYMBOL;
          const stockName = r.name || r.stockName || "";
          const date = r.date || r.createdAt || r.time || now;
          const side = (r.side || r.action || "").toLowerCase();
          const qty = Number(r.quantity || r.qty || r.shares || 0) || undefined;
          const price = Number(r.price || r.entryPrice || r.planEntryPrice || 0) || undefined;
          if (!symbol || !price) return; // 基本校验
          const key = `${symbol}|${date}`;
          if (existingKey.has(key)) return; // 简易去重
          const trade: Trade = {
            id: idCursor++,
            symbol,
            stockName,
            status: "pending",
            planType: side === "short" ? "short" : "long",
            entryPrice: price,
            entryQuantity: qty,
            createdAt: date,
            updatedAt: now,
          } as Trade;
          newOnes.push(trade);
          added++;
        });
        if (newOnes.length > 0) {
          db.trades.bulkAdd(newOnes).catch(err => toast.error("导入失败: " + err.message));
        }
        setImportMessage(`导入完成：新增 ${added} 条，重复 ${rows.length - added} 条`);
      } catch (err) {
        setImportMessage("解析失败，请检查CSV格式");
      }
    };
    reader.readAsText(file);
    // 清空选择
    e.target.value = "";
  };

  const exportCsv = () => {
    const cols = [
      "id",
      "symbol",
      "stockName",
      "status",
      "planType",
      "entryPrice",
      "entryQuantity",
      "createdAt",
      "updatedAt",
    ];
    const lines = [cols.join(",")];
    filteredTrades.forEach((t) => {
      const row = cols
        .map((c) => {
          const v: any = (t as any)[c];
          const s = v == null ? "" : String(v);
          return s.includes(",") ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",");
      lines.push(row);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trades-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 处理创建/更新交易计划
  const handleSavePlan = async (tradeData: Partial<Trade>) => {
    if (editingTrade) {
      // 更新
      await db.trades.update(editingTrade.id, { ...tradeData, updatedAt: new Date().toISOString() });
    } else {
      // 创建
      const maxIdTrade = await db.trades.orderBy('id').last();
      const nextId = (maxIdTrade?.id || 0) + 1;

      const newTrade: Trade = {
        ...tradeData,
        id: nextId,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        planCreatedAt: new Date().toISOString(),
      } as Trade;
      await db.trades.add(newTrade);
    }
    setShowPlanForm(false);
    setEditingTrade(null);
  };

  // 重置筛选
  const handleResetFilters = () => {
    setFilters({});
  };

  return (
    <div className="space-y-4">
      {/* 6步交易体系说明卡片 */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-2 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="bg-blue-600 text-white rounded-full p-2 flex-shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base md:text-lg truncate">6步交易体系 - 系统化交易流程</h3>
                <p className="text-xs md:text-sm text-muted-foreground truncate md:whitespace-normal">
                  分辨趋势 → 找关键位 → 入场时机 → 制定计划 → 严格执行 → 复盘总结
                </p>
              </div>
            </div>
            <Button
              onClick={() => {
                console.log('按钮被点击了！');
                router.push('/plan/create');
              }}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 whitespace-nowrap flex-shrink-0 w-full md:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              开始6步向导创建
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 交易纪律提醒 - 在交易页面顶部突出显示 */}
      <TradingDisciplineReminder
        variant="card"
        dismissible={false}
        autoRotate={true}
        rotateInterval={12}
      />

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

      {/* 盈亏曲线 + 风险指标 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2"><PnlChartCard trades={trades} /></div>
        <RiskWidget trades={trades} />
      </div>

      {/* 违规统计 + 目标进度 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ViolationStats trades={trades} />
        <GoalProgressCard trades={trades} />
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvPicked} />
          <Button variant="outline" size="sm" onClick={triggerPickCsv}>导入CSV</Button>
          <Button variant="outline" size="sm" onClick={exportCsv} className="whitespace-nowrap">导出CSV</Button>
          <SavedFiltersMenu current={filters} onApply={setFilters} />
          <Button variant="outline" size="sm" onClick={() => setAlertOpen(true)}>配置提醒</Button>
          <Button variant="outline" size="sm" onClick={() => {
            // MVP优化：直接打开录入弹窗，跳过繁琐检查
            setManualOpen(true);
          }}>手动录入</Button>
          {importMessage && <span className="text-xs text-muted-foreground ml-2">{importMessage}</span>}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            // 快速录入：先检查清单，后创建
            setSelectedStockForPlan({ symbol: "AAPL", name: "苹果公司", price: 182.3 });
            setPendingTradeAction('create_plan');
            setShowPreTradeChecklist(true);
          }} className="whitespace-nowrap">
            <Plus className="w-4 h-4 mr-2" />
            快速录入计划
          </Button>
          <Button size="sm" onClick={() => router.push('/plan/create')} className="whitespace-nowrap">
            <Plus className="w-4 h-4 mr-2" />
            6步向导创建
          </Button>
        </div>
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
          交易计划 ({mockStatistics.pendingTrades})
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
            <div
              key={trade.id}
              className={`transition-all duration-500 ${highlightTradeId === trade.id
                ? 'ring-4 ring-green-400 ring-opacity-50 rounded-lg scale-105'
                : ''
                }`}
            >
              <TradeCard trade={trade} />
            </div>
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

      {/* 强制交易计划表单 */}
      <Dialog open={showForcedPlanForm} onOpenChange={setShowForcedPlanForm}>
        <DialogContent className="max-w-[96vw] min-w-[1100px] w-[1400px] h-[90vh] flex flex-col p-0">
          <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b px-6 py-4">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                💪 创建交易计划 - {selectedStockForPlan?.symbol} ({selectedStockForPlan?.name})
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="flex-1 overflow-hidden min-h-0">
            <ForcedTradePlanForm
              symbol={selectedStockForPlan?.symbol || ""}
              name={selectedStockForPlan?.name || ""}
              currentPrice={selectedStockForPlan?.price || 0}
              onSubmit={async (plan: TradePlan) => {
                // 将计划转换为交易记录并添加到列表
                const maxIdTrade = await db.trades.orderBy('id').last();
                const nextId = (maxIdTrade?.id || 0) + 1;

                const newTrade: Trade = {
                  id: nextId,
                  symbol: plan.symbol,
                  stockName: plan.name,
                  status: "planned",
                  planType: "long",
                  planEntryPrice: plan.targetBuyPrice,
                  planEntryPriceRangeLow: plan.targetBuyPrice,
                  planEntryPriceRangeHigh: plan.maxBuyPrice,
                  planQuantity: plan.shares,
                  planStopLoss: plan.stopLoss.price,
                  planTakeProfit: plan.stopProfit.target3.price,
                  planNotes: `${plan.buyReason.technical}\n${plan.buyReason.fundamental}\n${plan.buyReason.catalyst}`,
                  planStrategy: plan.tradeType,
                  strategyTags: [plan.tradeType],
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  planCreatedAt: new Date().toISOString(),
                } as Trade;

                await db.trades.add(newTrade);

                // 关闭对话框
                setShowForcedPlanForm(false);

                // 自动切换到"等待执行"标签页
                setActiveTab("pending");

                // 高亮显示新创建的计划（3秒后恢复）
                setHighlightTradeId(newTrade.id);
                setTimeout(() => setHighlightTradeId(null), 3000);

                // 显示成功提示，并提供查看详情的按钮
                const scoreValue = typeof plan.score === 'number' ? plan.score : 0;
                toast.success(`✅ 强制交易计划创建成功！`, {
                  description: `${plan.symbol} - 评分: ${scoreValue}分 | 已添加到"交易计划"`,
                  duration: 4000,
                  action: {
                    label: "查看详情",
                    onClick: () => router.push(`/plan/${plan.symbol}-${newTrade.id}`)
                  }
                });
              }}
              onCancel={() => setShowForcedPlanForm(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
      {/* 手动录入弹窗 */}
      <ManualTradeDialog
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        nextId={(trades.length > 0 ? Math.max(...trades.map(t => t.id)) + 1 : 1)}
        onSave={async (t) => {
          await db.trades.add(t);
          setManualOpen(false);
        }}
      />

      {/* 提醒配置 */}
      <AlertConfigDialog
        open={alertOpen}
        onClose={() => setAlertOpen(false)}
        initial={alertCfg}
        onSave={(cfg) => {
          setAlertCfg(cfg);
          db.settings.put({ key: 'alertConfig', value: cfg });
        }}
      />

      {/* 交易前强制检查清单 */}
      <PreTradeChecklist
        open={showPreTradeChecklist}
        onClose={() => {
          setShowPreTradeChecklist(false);
          setPendingTradeAction(null);
        }}
        onApprove={() => {
          setShowPreTradeChecklist(false);
          // 根据待处理的操作执行相应动作
          if (pendingTradeAction === 'create_plan') {
            setShowForcedPlanForm(true);
          } else if (pendingTradeAction === 'manual_entry') {
            setManualOpen(true);
          }
          setPendingTradeAction(null);
          toast.success('交易前检查通过！');
        }}
        stockSymbol={selectedStockForPlan?.symbol || ""}
        stockName={selectedStockForPlan?.name || ""}
        action="buy"
      />
    </div>
  );
}

