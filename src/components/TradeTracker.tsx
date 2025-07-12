// 【知行交易】交易追踪系统 - 纪律执行驾驶舱
// 实现生命周期可视化、盘中观察日志等核心功能

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  TradingPlan, 
  TradeRecord, 
  LiveJournal, 
  TradingEmotion,
  TradeStatus 
} from '@/types';
import { calculateLifecyclePosition, calculatePriceChangePercent } from '@/utils/calculations';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Shield, 
  Edit3, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Lock,
  Activity,
  Eye,
  DollarSign
} from 'lucide-react';

interface TradeTrackerProps {
  activePlans: TradingPlan[];
  activeRecords: TradeRecord[];
  onUpdatePlan: (planId: string, updates: Partial<TradingPlan>) => void;
  onCloseTrade: (planId: string) => void;
  onAddJournal: (tradeId: string, journal: Omit<LiveJournal, 'id'>) => void;
  onBack: () => void;
}

export function TradeTracker({ 
  activePlans, 
  activeRecords, 
  onUpdatePlan, 
  onCloseTrade, 
  onAddJournal, 
  onBack 
}: TradeTrackerProps) {
  const [selectedPlan, setSelectedPlan] = useState<TradingPlan | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [journalText, setJournalText] = useState<string>('');
  const [journalEmotion, setJournalEmotion] = useState<TradingEmotion>(TradingEmotion.CALM);

  // 模拟实时价格更新
  useEffect(() => {
    if (selectedPlan) {
      // 模拟价格波动
      const basePrice = selectedPlan.plannedEntryPrice;
      const volatility = 0.02; // 2%波动
      const randomChange = (Math.random() - 0.5) * volatility;
      setCurrentPrice(basePrice * (1 + randomChange));
    }
  }, [selectedPlan]);

  const handleAddJournal = () => {
    if (!selectedPlan || !journalText.trim()) return;

    const journal: Omit<LiveJournal, 'id'> = {
      tradeId: selectedPlan.id,
      timestamp: new Date(),
      currentPrice,
      observation: journalText,
      emotion: journalEmotion,
      consideringAdjustment: false
    };

    onAddJournal(selectedPlan.id, journal);
    setJournalText('');
    setJournalEmotion(TradingEmotion.CALM);
  };

  const getLifecyclePosition = (plan: TradingPlan) => {
    return calculateLifecyclePosition(
      currentPrice || plan.plannedEntryPrice,
      plan.plannedEntryPrice,
      plan.stopLoss,
      plan.takeProfit
    );
  };

  const getPnLPercent = (plan: TradingPlan) => {
    return calculatePriceChangePercent(plan.plannedEntryPrice, currentPrice || plan.plannedEntryPrice);
  };

  const getStatusColor = (pnlPercent: number) => {
    if (pnlPercent > 0) return 'text-green-600';
    if (pnlPercent < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getLifecycleColor = (position: number) => {
    if (position < 20) return 'bg-red-500';
    if (position < 40) return 'bg-orange-500';
    if (position < 60) return 'bg-yellow-500';
    if (position < 80) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">交易追踪</h1>
            <p className="text-gray-600">纪律执行驾驶舱 - 实时监控交易进展</p>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            返回仪表盘
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：交易列表 */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-blue-500" />
                  追踪中的交易 ({activePlans.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activePlans.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">暂无追踪中的交易</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activePlans.map((plan) => {
                      const pnlPercent = getPnLPercent(plan);
                      const lifecyclePos = getLifecyclePosition(plan);
                      
                      return (
                        <div
                          key={plan.id}
                          onClick={() => setSelectedPlan(plan)}
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            selectedPlan?.id === plan.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-semibold text-gray-900">{plan.symbolName}</h4>
                              <p className="text-sm text-gray-500">{plan.symbol}</p>
                            </div>
                            <div className="text-right">
                              <p className={`font-semibold ${getStatusColor(pnlPercent)}`}>
                                {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                              </p>
                              <p className="text-xs text-gray-500">
                                ¥{(currentPrice || plan.plannedEntryPrice).toFixed(2)}
                              </p>
                            </div>
                          </div>
                          
                          {/* 生命周期进度条 */}
                          <div className="mb-2">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>止损 ¥{plan.stopLoss.toFixed(2)}</span>
                              <span>止盈 ¥{plan.takeProfit.toFixed(2)}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${getLifecycleColor(lifecyclePos)}`}
                                style={{ width: `${Math.max(5, Math.min(95, lifecyclePos))}%` }}
                              />
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500">
                              计划: ¥{plan.plannedEntryPrice.toFixed(2)}
                            </span>
                            {plan.disciplineLocked && (
                              <Lock className="w-3 h-3 text-red-500" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 右侧：详细信息和操作 */}
          <div className="lg:col-span-2">
            {selectedPlan ? (
              <div className="space-y-6">
                {/* 交易详情卡片 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{selectedPlan.symbolName} ({selectedPlan.symbol})</span>
                      <div className="flex items-center space-x-2">
                        {selectedPlan.disciplineLocked && (
                          <div className="flex items-center text-red-600">
                            <Lock className="w-4 h-4 mr-1" />
                            <span className="text-sm">纪律锁定</span>
                          </div>
                        )}
                        <span className={`text-lg font-bold ${getStatusColor(getPnLPercent(selectedPlan))}`}>
                          {getPnLPercent(selectedPlan) >= 0 ? '+' : ''}{getPnLPercent(selectedPlan).toFixed(2)}%
                        </span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center">
                        <p className="text-sm text-gray-500">当前价格</p>
                        <p className="text-lg font-semibold">
                          ¥{(currentPrice || selectedPlan.plannedEntryPrice).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500">计划价格</p>
                        <p className="text-lg font-semibold">¥{selectedPlan.plannedEntryPrice.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500">止损价</p>
                        <p className="text-lg font-semibold text-red-600">¥{selectedPlan.stopLoss.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500">止盈价</p>
                        <p className="text-lg font-semibold text-green-600">¥{selectedPlan.takeProfit.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* 生命周期可视化 */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 mb-3">交易生命周期</h4>
                      <div className="relative">
                        <div className="flex justify-between text-sm text-gray-500 mb-2">
                          <span>止损区</span>
                          <span>安全区</span>
                          <span>盈利区</span>
                          <span>目标区</span>
                        </div>
                        <div className="w-full bg-gradient-to-r from-red-200 via-yellow-200 via-blue-200 to-green-200 rounded-full h-4 relative">
                          <div
                            className="absolute top-0 w-4 h-4 bg-white border-2 border-gray-800 rounded-full transform -translate-x-2"
                            style={{ left: `${Math.max(0, Math.min(100, getLifecyclePosition(selectedPlan)))}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                          <span>¥{selectedPlan.stopLoss.toFixed(2)}</span>
                          <span>¥{selectedPlan.plannedEntryPrice.toFixed(2)}</span>
                          <span>¥{selectedPlan.takeProfit.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* 风险收益信息 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-gray-50 p-3 rounded-lg text-center">
                        <p className="text-sm text-gray-500">风险收益比</p>
                        <p className="text-lg font-semibold">{selectedPlan.riskRewardRatio.toFixed(2)}:1</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg text-center">
                        <p className="text-sm text-gray-500">仓位大小</p>
                        <p className="text-lg font-semibold">{selectedPlan.positionSize}股</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg text-center">
                        <p className="text-sm text-gray-500">计划质量分</p>
                        <p className="text-lg font-semibold text-blue-600">{selectedPlan.planQualityScore}/100</p>
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex space-x-3">
                      <button
                        onClick={() => onCloseTrade(selectedPlan.id)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors"
                      >
                        平仓并复盘
                      </button>
                      <button
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        disabled={selectedPlan.disciplineLocked}
                      >
                        {selectedPlan.disciplineLocked ? '已锁定' : '修改计划'}
                      </button>
                    </div>
                  </CardContent>
                </Card>

                {/* 盘中观察日志 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Edit3 className="w-5 h-5 mr-2 text-green-500" />
                      盘中观察日志
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* 添加新观察 */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3">记录当前观察</h4>
                      <div className="space-y-3">
                        <textarea
                          value={journalText}
                          onChange={(e) => setJournalText(e.target.value)}
                          placeholder="记录您当前的想法、市场观察、情绪变化等..."
                          rows={3}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="flex items-center justify-between">
                          <select
                            value={journalEmotion}
                            onChange={(e) => setJournalEmotion(e.target.value as TradingEmotion)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value={TradingEmotion.CALM}>冷静</option>
                            <option value={TradingEmotion.CONFIDENT}>自信</option>
                            <option value={TradingEmotion.UNCERTAIN}>不确定</option>
                            <option value={TradingEmotion.FEAR}>恐惧</option>
                            <option value={TradingEmotion.GREED}>贪婪</option>
                            <option value={TradingEmotion.FOMO}>FOMO</option>
                          </select>
                          <button
                            onClick={handleAddJournal}
                            disabled={!journalText.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                          >
                            添加观察
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 历史观察记录 */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">历史观察记录</h4>
                      <div className="space-y-3">
                        {/* 这里应该显示实际的观察记录，目前显示示例 */}
                        <div className="border border-gray-200 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm text-gray-500">
                              {new Date().toLocaleString()}
                            </span>
                            <span className="text-sm font-medium text-blue-600">冷静</span>
                          </div>
                          <p className="text-sm text-gray-700">
                            股价按预期在支撑位获得支撑，成交量有所放大，技术形态良好。
                          </p>
                          <div className="mt-2 text-xs text-gray-500">
                            当时价格: ¥{(currentPrice || selectedPlan.plannedEntryPrice).toFixed(2)}
                          </div>
                        </div>
                        
                        <div className="text-center py-4 text-gray-500 text-sm">
                          暂无更多观察记录
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 买入逻辑回顾 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Eye className="w-5 h-5 mr-2 text-purple-500" />
                      原始买入逻辑
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">技术面分析</h4>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                          {selectedPlan.buyingLogic.technical || '未填写'}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">基本面分析</h4>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                          {selectedPlan.buyingLogic.fundamental || '未填写'}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">消息面分析</h4>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                          {selectedPlan.buyingLogic.news || '未填写'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">选择一个交易进行追踪</h3>
                  <p className="text-gray-500">从左侧列表中选择一个交易来查看详细信息和进行操作</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
