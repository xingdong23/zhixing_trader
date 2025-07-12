// 【知行交易】新建交易计划 - 参谋部作业流程
// 这是系统的核心功能，通过仪式感的流程确保计划质量

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  TradingPlan, 
  TradingEmotion, 
  InformationSource, 
  TradeStatus,
  TradingPlaybook,
  PlanQualityResponse 
} from '@/types';
import { calculatePlanQualityScore, calculateRiskRewardRatio } from '@/utils/calculations';
import { 
  Target, 
  Shield, 
  Brain, 
  Camera, 
  Lock, 
  Unlock, 
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

interface PlanningFormProps {
  playbooks: TradingPlaybook[];
  onSubmit: (plan: TradingPlan) => void;
  onCancel: () => void;
}

export function PlanningForm({ playbooks, onSubmit, onCancel }: PlanningFormProps) {
  const [formData, setFormData] = useState<Partial<TradingPlan>>({
    symbol: '',
    symbolName: '',
    plannedEntryPrice: 0,
    positionSize: 0,
    buyingLogic: {
      technical: '',
      fundamental: '',
      news: ''
    },
    stopLoss: 0,
    takeProfit: 0,
    riskRewardRatio: 0,
    emotion: undefined,
    informationSource: undefined,
    disciplineLocked: false,
    chartSnapshot: '',
    playbookId: '',
    status: TradeStatus.PLANNING
  });

  const [qualityScore, setQualityScore] = useState<PlanQualityResponse>({
    score: 0,
    breakdown: {
      basicInfo: 0,
      riskManagement: 0,
      logicClarity: 0,
      chartEvidence: 0,
      emotionalState: 0
    },
    suggestions: []
  });

  const [selectedPlaybook, setSelectedPlaybook] = useState<TradingPlaybook | null>(null);

  // 实时计算计划质量分
  useEffect(() => {
    const score = calculatePlanQualityScore(formData);
    setQualityScore(score);
  }, [formData]);

  // 实时计算风险收益比
  useEffect(() => {
    if (formData.plannedEntryPrice && formData.stopLoss && formData.takeProfit) {
      const ratio = calculateRiskRewardRatio(
        formData.plannedEntryPrice,
        formData.stopLoss,
        formData.takeProfit
      );
      setFormData(prev => ({ ...prev, riskRewardRatio: ratio }));
    }
  }, [formData.plannedEntryPrice, formData.stopLoss, formData.takeProfit]);

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as any),
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handlePlaybookSelect = (playbookId: string) => {
    const playbook = playbooks.find(p => p.id === playbookId);
    if (playbook) {
      setSelectedPlaybook(playbook);
      setFormData(prev => ({
        ...prev,
        playbookId,
        buyingLogic: {
          technical: playbook.template.buyingLogicTemplate.technical,
          fundamental: playbook.template.buyingLogicTemplate.fundamental,
          news: playbook.template.buyingLogicTemplate.news
        },
        emotion: playbook.template.recommendedEmotion,
        informationSource: playbook.template.recommendedSource,
        // 根据剧本模板计算止损止盈
        stopLoss: prev.plannedEntryPrice ? 
          prev.plannedEntryPrice * (1 - playbook.template.riskManagementTemplate.stopLossRatio) : 0,
        takeProfit: prev.plannedEntryPrice ? 
          prev.plannedEntryPrice * (1 + playbook.template.riskManagementTemplate.takeProfitRatio) : 0
      }));
    }
  };

  const handleSubmit = () => {
    if (qualityScore.score < 80) {
      alert('计划质量分不足80分，请完善后再提交');
      return;
    }

    const plan: TradingPlan = {
      id: `plan_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      symbol: formData.symbol!,
      symbolName: formData.symbolName!,
      plannedEntryPrice: formData.plannedEntryPrice!,
      positionSize: formData.positionSize!,
      buyingLogic: formData.buyingLogic!,
      stopLoss: formData.stopLoss!,
      takeProfit: formData.takeProfit!,
      riskRewardRatio: formData.riskRewardRatio!,
      emotion: formData.emotion!,
      informationSource: formData.informationSource!,
      disciplineLocked: formData.disciplineLocked!,
      planQualityScore: qualityScore.score,
      chartSnapshot: formData.chartSnapshot,
      playbookId: formData.playbookId,
      status: TradeStatus.PLANNING
    };

    onSubmit(plan);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-6 h-6 text-green-500" />;
    if (score >= 60) return <Info className="w-6 h-6 text-yellow-500" />;
    return <AlertTriangle className="w-6 h-6 text-red-500" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">新建交易计划</h1>
          <p className="text-gray-600">参谋部作业流程 - 制定高质量的交易计划</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：表单区域 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 剧本选择 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="w-5 h-5 mr-2 text-blue-500" />
                  选择交易剧本（可选）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <select
                  value={formData.playbookId || ''}
                  onChange={(e) => handlePlaybookSelect(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">从空白开始</option>
                  {playbooks.map(playbook => (
                    <option key={playbook.id} value={playbook.id}>
                      {playbook.name} - 胜率{(playbook.performance.winRate * 100).toFixed(1)}%
                    </option>
                  ))}
                </select>
                {selectedPlaybook && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">{selectedPlaybook.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 基础信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="w-5 h-5 mr-2 text-green-500" />
                  基础信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      股票代码 *
                    </label>
                    <input
                      type="text"
                      value={formData.symbol || ''}
                      onChange={(e) => handleInputChange('symbol', e.target.value.toUpperCase())}
                      placeholder="如：000001"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      股票名称 *
                    </label>
                    <input
                      type="text"
                      value={formData.symbolName || ''}
                      onChange={(e) => handleInputChange('symbolName', e.target.value)}
                      placeholder="如：平安银行"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      计划买入价 *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.plannedEntryPrice || ''}
                      onChange={(e) => handleInputChange('plannedEntryPrice', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      仓位大小 *
                    </label>
                    <input
                      type="number"
                      value={formData.positionSize || ''}
                      onChange={(e) => handleInputChange('positionSize', parseInt(e.target.value) || 0)}
                      placeholder="股数"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 买入逻辑 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="w-5 h-5 mr-2 text-purple-500" />
                  买入逻辑分析
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    技术面分析 *
                  </label>
                  <textarea
                    value={formData.buyingLogic?.technical || ''}
                    onChange={(e) => handleInputChange('buyingLogic.technical', e.target.value)}
                    placeholder="描述技术指标、图形形态、支撑阻力等..."
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    基本面分析
                  </label>
                  <textarea
                    value={formData.buyingLogic?.fundamental || ''}
                    onChange={(e) => handleInputChange('buyingLogic.fundamental', e.target.value)}
                    placeholder="描述公司基本面、行业状况、财务指标等..."
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    消息面分析
                  </label>
                  <textarea
                    value={formData.buyingLogic?.news || ''}
                    onChange={(e) => handleInputChange('buyingLogic.news', e.target.value)}
                    placeholder="描述相关新闻、政策、事件等..."
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 风险管理 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-red-500" />
                  风险管理预案
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      止损价 *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.stopLoss || ''}
                      onChange={(e) => handleInputChange('stopLoss', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      止盈价 *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.takeProfit || ''}
                      onChange={(e) => handleInputChange('takeProfit', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                {formData.riskRewardRatio > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      风险收益比: <span className={`font-semibold ${
                        formData.riskRewardRatio >= 2 ? 'text-green-600' : 
                        formData.riskRewardRatio >= 1.5 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {formData.riskRewardRatio.toFixed(2)}:1
                      </span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 情绪与来源 */}
            <Card>
              <CardHeader>
                <CardTitle>交易心理状态</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      当前情绪 *
                    </label>
                    <select
                      value={formData.emotion || ''}
                      onChange={(e) => handleInputChange('emotion', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">请选择</option>
                      <option value={TradingEmotion.CALM}>冷静分析</option>
                      <option value={TradingEmotion.CONFIDENT}>自信</option>
                      <option value={TradingEmotion.UNCERTAIN}>不确定</option>
                      <option value={TradingEmotion.FOMO}>害怕错过</option>
                      <option value={TradingEmotion.FEAR}>恐惧</option>
                      <option value={TradingEmotion.GREED}>贪婪</option>
                      <option value={TradingEmotion.REVENGE}>报复性交易</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      信息来源 *
                    </label>
                    <select
                      value={formData.informationSource || ''}
                      onChange={(e) => handleInputChange('informationSource', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">请选择</option>
                      <option value={InformationSource.SELF_ANALYSIS}>自己分析</option>
                      <option value={InformationSource.PROFESSIONAL_REPORT}>专业报告</option>
                      <option value={InformationSource.TECHNICAL_SIGNAL}>技术信号</option>
                      <option value={InformationSource.NEWS_MEDIA}>新闻媒体</option>
                      <option value={InformationSource.FRIEND_RECOMMEND}>朋友推荐</option>
                      <option value={InformationSource.SOCIAL_MEDIA}>社交媒体</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 决策快照 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Camera className="w-5 h-5 mr-2 text-indigo-500" />
                  决策快照
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    K线图快照 (推荐上传)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          handleInputChange('chartSnapshot', e.target?.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    上传K线图可以提高计划质量分，帮助后续复盘分析
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 纪律锁定 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {formData.disciplineLocked ? (
                    <Lock className="w-5 h-5 mr-2 text-red-500" />
                  ) : (
                    <Unlock className="w-5 h-5 mr-2 text-gray-500" />
                  )}
                  纪律锁定模式
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="disciplineLock"
                    checked={formData.disciplineLocked}
                    onChange={(e) => handleInputChange('disciplineLocked', e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="disciplineLock" className="text-sm font-medium text-gray-700">
                    开启纪律锁定
                  </label>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  开启后，修改止损价需要经过30分钟冷静期确认，帮助避免情绪化决策
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：质量评分和建议 */}
          <div className="space-y-6">
            {/* 计划质量分 */}
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>计划质量分</span>
                  {getScoreIcon(qualityScore.score)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className={`text-4xl font-bold ${getScoreColor(qualityScore.score)}`}>
                    {qualityScore.score}
                  </div>
                  <div className="text-gray-500 text-sm">/ 100</div>
                </div>

                {/* 分项评分 */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">基础信息</span>
                    <span className="font-semibold">{qualityScore.breakdown.basicInfo}/25</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">风险管理</span>
                    <span className="font-semibold">{qualityScore.breakdown.riskManagement}/25</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">逻辑清晰</span>
                    <span className="font-semibold">{qualityScore.breakdown.logicClarity}/20</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">图表证据</span>
                    <span className="font-semibold">{qualityScore.breakdown.chartEvidence}/15</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">情绪状态</span>
                    <span className="font-semibold">{qualityScore.breakdown.emotionalState}/15</span>
                  </div>
                </div>

                {/* 建议 */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-900 text-sm">改进建议:</h4>
                  {qualityScore.suggestions.map((suggestion, index) => (
                    <div key={index} className="text-sm text-gray-600 flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>{suggestion}</span>
                    </div>
                  ))}
                </div>

                {/* 操作按钮 */}
                <div className="mt-6 space-y-3">
                  <button
                    onClick={handleSubmit}
                    disabled={qualityScore.score < 80}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                      qualityScore.score >= 80
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {qualityScore.score >= 80 ? '✓ 启动计划' : '完善计划 (需80分以上)'}
                  </button>
                  <button
                    onClick={onCancel}
                    className="w-full py-3 px-4 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
