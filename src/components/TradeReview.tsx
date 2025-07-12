// 【知行交易】平仓复盘模块 - 战后复盘会议
// 这是交易完成后的核心反思环节，帮助用户从每笔交易中学习和成长

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  TradingPlan, 
  TradeRecord, 
  DisciplineRating, 
  TradingPlaybook,
  TradeStatus 
} from '@/types';
import { calculatePriceChangePercent } from '@/utils/calculations';
import { 
  Target, 
  Brain, 
  BookOpen, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  AlertTriangle,
  Star,
  Save,
  ArrowLeft
} from 'lucide-react';

interface TradeReviewProps {
  plan: TradingPlan;
  onSubmitReview: (record: TradeRecord, saveAsPlaybook?: boolean) => void;
  onCancel: () => void;
}

export function TradeReview({ plan, onSubmitReview, onCancel }: TradeReviewProps) {
  const [formData, setFormData] = useState({
    actualExitPrice: 0,
    disciplineRating: DisciplineRating.GOOD,
    disciplineNotes: '',
    tradingSummary: '',
    lessonsLearned: '',
    saveAsPlaybook: false,
    playbookName: '',
    playbookDescription: ''
  });

  const [calculatedResults, setCalculatedResults] = useState({
    realizedPnL: 0,
    realizedPnLPercent: 0,
    disciplineScoreImpact: 0
  });

  // 实时计算盈亏和纪律分影响
  useEffect(() => {
    if (formData.actualExitPrice > 0) {
      const pnlPercent = calculatePriceChangePercent(plan.plannedEntryPrice, formData.actualExitPrice);
      const pnlAmount = (formData.actualExitPrice - plan.plannedEntryPrice) * plan.positionSize;
      
      // 计算纪律分影响
      let disciplineImpact = 0;
      switch (formData.disciplineRating) {
        case DisciplineRating.PERFECT:
          disciplineImpact = pnlPercent > 0 ? 10 : 5; // 完美执行，盈利+10分，亏损+5分
          break;
        case DisciplineRating.GOOD:
          disciplineImpact = pnlPercent > 0 ? 5 : 2;
          break;
        case DisciplineRating.PARTIAL:
          disciplineImpact = pnlPercent > 0 ? 0 : -3;
          break;
        case DisciplineRating.POOR:
          disciplineImpact = pnlPercent > 0 ? -5 : -10; // 执行不佳，即使盈利也扣分
          break;
      }

      setCalculatedResults({
        realizedPnL: pnlAmount,
        realizedPnLPercent: pnlPercent,
        disciplineScoreImpact: disciplineImpact
      });
    }
  }, [formData.actualExitPrice, formData.disciplineRating, plan]);

  // 根据盈亏和执行情况判断是否建议保存为剧本
  useEffect(() => {
    const shouldSuggestPlaybook = 
      calculatedResults.realizedPnLPercent > 5 && // 盈利超过5%
      (formData.disciplineRating === DisciplineRating.PERFECT || formData.disciplineRating === DisciplineRating.GOOD);
    
    if (shouldSuggestPlaybook && !formData.playbookName) {
      setFormData(prev => ({
        ...prev,
        saveAsPlaybook: true,
        playbookName: `${plan.symbolName}成功模式`,
        playbookDescription: `基于${plan.symbolName}的成功交易经验总结`
      }));
    }
  }, [calculatedResults.realizedPnLPercent, formData.disciplineRating, plan.symbolName]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.actualExitPrice || formData.actualExitPrice <= 0) {
      alert('请输入有效的平仓价格');
      return;
    }

    if (!formData.tradingSummary.trim()) {
      alert('请填写交易总结');
      return;
    }

    const record: TradeRecord = {
      id: `record_${Date.now()}`,
      planId: plan.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      actualEntryPrice: plan.plannedEntryPrice,
      actualExitPrice: formData.actualExitPrice,
      actualPositionSize: plan.positionSize,
      realizedPnL: calculatedResults.realizedPnL,
      realizedPnLPercent: calculatedResults.realizedPnLPercent,
      entryTime: plan.createdAt,
      exitTime: new Date(),
      disciplineRating: formData.disciplineRating,
      disciplineNotes: formData.disciplineNotes,
      tradingSummary: formData.tradingSummary,
      lessonsLearned: formData.lessonsLearned,
      status: TradeStatus.CLOSED
    };

    onSubmitReview(record, formData.saveAsPlaybook);
  };

  const getDisciplineColor = (rating: DisciplineRating) => {
    switch (rating) {
      case DisciplineRating.PERFECT: return 'text-green-600';
      case DisciplineRating.GOOD: return 'text-blue-600';
      case DisciplineRating.PARTIAL: return 'text-yellow-600';
      case DisciplineRating.POOR: return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getDisciplineDescription = (rating: DisciplineRating) => {
    switch (rating) {
      case DisciplineRating.PERFECT: return '完美执行了原定计划，没有任何偏差';
      case DisciplineRating.GOOD: return '基本执行了原定计划，有轻微调整但合理';
      case DisciplineRating.PARTIAL: return '部分执行了原定计划，有一些不必要的调整';
      case DisciplineRating.POOR: return '未能执行原定计划，存在明显的纪律问题';
      default: return '';
    }
  };

  const getPnLColor = (pnl: number) => {
    return pnl >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getScoreImpactColor = (impact: number) => {
    if (impact > 0) return 'text-green-600';
    if (impact < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">交易复盘</h1>
            <p className="text-gray-600">战后复盘会议 - 从交易中学习和成长</p>
          </div>
          <button
            onClick={onCancel}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：复盘表单 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 交易概览 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="w-5 h-5 mr-2 text-blue-500" />
                  交易概览
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">股票</p>
                    <p className="font-semibold">{plan.symbolName} ({plan.symbol})</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">仓位</p>
                    <p className="font-semibold">{plan.positionSize}股</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">计划买入价</p>
                    <p className="font-semibold">¥{plan.plannedEntryPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">风险收益比</p>
                    <p className="font-semibold">{plan.riskRewardRatio.toFixed(2)}:1</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">止损价</p>
                    <p className="font-semibold text-red-600">¥{plan.stopLoss.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">止盈价</p>
                    <p className="font-semibold text-green-600">¥{plan.takeProfit.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 结果确认 */}
            <Card>
              <CardHeader>
                <CardTitle>结果确认</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      实际平仓价格 *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.actualExitPrice || ''}
                      onChange={(e) => handleInputChange('actualExitPrice', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  {calculatedResults.realizedPnL !== 0 && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">实际盈亏</p>
                          <p className={`text-lg font-bold ${getPnLColor(calculatedResults.realizedPnL)}`}>
                            {calculatedResults.realizedPnL >= 0 ? '+' : ''}¥{calculatedResults.realizedPnL.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">盈亏百分比</p>
                          <p className={`text-lg font-bold ${getPnLColor(calculatedResults.realizedPnLPercent)}`}>
                            {calculatedResults.realizedPnLPercent >= 0 ? '+' : ''}{calculatedResults.realizedPnLPercent.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 纪律审视 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="w-5 h-5 mr-2 text-purple-500" />
                  纪律审视
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      我是否严格执行了原定计划？ *
                    </label>
                    <div className="space-y-3">
                      {Object.values(DisciplineRating).map((rating) => (
                        <label key={rating} className="flex items-start space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            name="disciplineRating"
                            value={rating}
                            checked={formData.disciplineRating === rating}
                            onChange={(e) => handleInputChange('disciplineRating', e.target.value)}
                            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <div>
                            <span className={`font-medium ${getDisciplineColor(rating)}`}>
                              {rating === DisciplineRating.PERFECT && '完美执行'}
                              {rating === DisciplineRating.GOOD && '基本执行'}
                              {rating === DisciplineRating.PARTIAL && '部分执行'}
                              {rating === DisciplineRating.POOR && '执行不佳'}
                            </span>
                            <p className="text-sm text-gray-500 mt-1">
                              {getDisciplineDescription(rating)}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      纪律执行说明
                    </label>
                    <textarea
                      value={formData.disciplineNotes}
                      onChange={(e) => handleInputChange('disciplineNotes', e.target.value)}
                      placeholder="详细说明执行过程中的情况，包括是否按计划买入、是否修改过止损止盈、是否受情绪影响等..."
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 交易总结 */}
            <Card>
              <CardHeader>
                <CardTitle>交易总结</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      交易亮点与不足 *
                    </label>
                    <textarea
                      value={formData.tradingSummary}
                      onChange={(e) => handleInputChange('tradingSummary', e.target.value)}
                      placeholder="总结这笔交易的亮点和不足，包括分析是否准确、时机是否合适、执行是否到位等..."
                      rows={4}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      经验教训
                    </label>
                    <textarea
                      value={formData.lessonsLearned}
                      onChange={(e) => handleInputChange('lessonsLearned', e.target.value)}
                      placeholder="从这笔交易中学到了什么？下次如何改进？有什么值得注意的地方？"
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 保存为剧本 */}
            {(calculatedResults.realizedPnLPercent > 0 && 
              (formData.disciplineRating === DisciplineRating.PERFECT || formData.disciplineRating === DisciplineRating.GOOD)) && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center text-green-800">
                    <Star className="w-5 h-5 mr-2" />
                    升华为交易剧本
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="saveAsPlaybook"
                        checked={formData.saveAsPlaybook}
                        onChange={(e) => handleInputChange('saveAsPlaybook', e.target.checked)}
                        className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <label htmlFor="saveAsPlaybook" className="text-sm font-medium text-green-800">
                        将此次成功交易保存为剧本模板
                      </label>
                    </div>
                    
                    {formData.saveAsPlaybook && (
                      <div className="space-y-3 pl-8">
                        <div>
                          <label className="block text-sm font-medium text-green-700 mb-1">
                            剧本名称
                          </label>
                          <input
                            type="text"
                            value={formData.playbookName}
                            onChange={(e) => handleInputChange('playbookName', e.target.value)}
                            placeholder="为这个成功模式起个名字"
                            className="w-full p-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-green-700 mb-1">
                            剧本描述
                          </label>
                          <textarea
                            value={formData.playbookDescription}
                            onChange={(e) => handleInputChange('playbookDescription', e.target.value)}
                            placeholder="描述这个剧本的适用场景和关键要素"
                            rows={2}
                            className="w-full p-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="text-sm text-green-700 bg-green-100 p-3 rounded-lg">
                      <p className="font-medium mb-1">💡 建议保存为剧本的原因：</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>交易盈利超过5%</li>
                        <li>严格执行了交易纪律</li>
                        <li>可以作为未来类似情况的参考模板</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 右侧：影响预览 */}
          <div className="space-y-6">
            {/* 纪律分影响 */}
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="w-5 h-5 mr-2 text-blue-500" />
                  纪律分影响
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className={`text-3xl font-bold ${getScoreImpactColor(calculatedResults.disciplineScoreImpact)}`}>
                    {calculatedResults.disciplineScoreImpact > 0 ? '+' : ''}{calculatedResults.disciplineScoreImpact}
                  </div>
                  <div className="text-sm text-gray-500">分数变化</div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">执行评级</span>
                    <span className={`font-semibold ${getDisciplineColor(formData.disciplineRating)}`}>
                      {formData.disciplineRating === DisciplineRating.PERFECT && '完美'}
                      {formData.disciplineRating === DisciplineRating.GOOD && '良好'}
                      {formData.disciplineRating === DisciplineRating.PARTIAL && '一般'}
                      {formData.disciplineRating === DisciplineRating.POOR && '较差'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">交易结果</span>
                    <span className={`font-semibold ${getPnLColor(calculatedResults.realizedPnLPercent)}`}>
                      {calculatedResults.realizedPnLPercent >= 0 ? '盈利' : '亏损'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">
                    纪律分计算规则：完美执行获得最高分，执行不佳即使盈利也会扣分。
                    纪律比盈利更重要！
                  </p>
                </div>

                {/* 操作按钮 */}
                <div className="mt-6 space-y-3">
                  <button
                    onClick={handleSubmit}
                    disabled={!formData.actualExitPrice || !formData.tradingSummary.trim()}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center ${
                      formData.actualExitPrice && formData.tradingSummary.trim()
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    完成复盘
                  </button>
                  
                  {formData.saveAsPlaybook && (
                    <div className="flex items-center justify-center text-sm text-green-600">
                      <Save className="w-4 h-4 mr-1" />
                      将同时保存为剧本
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 原始计划回顾 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">原始买入逻辑</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-xs">
                  <div>
                    <p className="font-medium text-gray-700 mb-1">技术面</p>
                    <p className="text-gray-600 line-clamp-2">{plan.buyingLogic.technical || '未填写'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700 mb-1">基本面</p>
                    <p className="text-gray-600 line-clamp-2">{plan.buyingLogic.fundamental || '未填写'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700 mb-1">消息面</p>
                    <p className="text-gray-600 line-clamp-2">{plan.buyingLogic.news || '未填写'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
