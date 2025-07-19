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
  Info,
  Copy,
  X
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
      technical: '', // 简化为单一买入理由
      fundamental: '',
      news: ''
    },
    stopLoss: 0,
    takeProfit: 0,
    riskRewardRatio: 0,
    emotion: TradingEmotion.CALM, // 默认冷静
    informationSource: InformationSource.SELF_ANALYSIS, // 默认自主分析
    disciplineLocked: false,
    chartSnapshot: '',
    playbookId: '',
    status: TradeStatus.PLANNING
  });

  const [useTrailingStop, setUseTrailingStop] = useState(false); // 移动止盈开关

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

  // 全局粘贴事件监听器
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // 只在决策快照区域获得焦点时处理
      const target = e.target as HTMLElement;
      if (target?.getAttribute('data-paste-target') === 'true') {
        e.preventDefault();
        console.log('全局粘贴事件触发');

        const items = e.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
              const file = items[i].getAsFile();
              if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                  handleInputChange('chartSnapshot', e.target?.result as string);
                };
                reader.readAsDataURL(file);
              }
              break;
            }
          }
        }
      }
    };

    document.addEventListener('paste', handleGlobalPaste);
    return () => {
      document.removeEventListener('paste', handleGlobalPaste);
    };
  }, []);

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
    // 简化验证 - 只检查必填字段
    if (!formData.symbol || !formData.symbolName || !formData.plannedEntryPrice ||
        !formData.stopLoss || !formData.takeProfit || !formData.buyingLogic?.technical) {
      alert('请填写所有必填字段（股票信息、价格设置、买入理由）');
      return;
    }

    const plan: TradingPlan = {
      id: `plan_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      symbol: formData.symbol!,
      symbolName: formData.symbolName!,
      plannedEntryPrice: formData.plannedEntryPrice!,
      positionSize: formData.positionSize || 100, // 默认100股
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
          <p className="text-gray-600">记录您的技术分析图表和交易决策</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：简化表单区域 */}
          <div className="lg:col-span-2 space-y-6">

            {/* 股票信息 - 简化版 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="w-5 h-5 mr-2 text-blue-500" />
                  股票信息
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">股票代码</label>
                    <input
                      type="text"
                      value={formData.symbol || ''}
                      onChange={(e) => handleInputChange('symbol', e.target.value)}
                      placeholder="如: 000001"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">股票名称</label>
                    <input
                      type="text"
                      value={formData.symbolName || ''}
                      onChange={(e) => handleInputChange('symbolName', e.target.value)}
                      placeholder="如: 平安银行"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 价格设置 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="w-5 h-5 mr-2 text-green-500" />
                  价格设置
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">计划买入价 *</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">止损价 *</label>
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
                      {useTrailingStop ? '初始止盈价' : '止盈价'} *
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

                {/* 移动止盈选项 */}
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="trailingStop"
                    checked={useTrailingStop}
                    onChange={(e) => setUseTrailingStop(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="trailingStop" className="text-sm font-medium text-gray-700">
                    启用移动止盈（盈利后动态调整止盈价）
                  </label>
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

            {/* 买入理由 - 简化版 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="w-5 h-5 mr-2 text-purple-500" />
                  买入理由
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    为什么现在买入这只股票？ *
                  </label>
                  <textarea
                    value={formData.buyingLogic?.technical || ''}
                    onChange={(e) => handleInputChange('buyingLogic.technical', e.target.value)}
                    placeholder="简单描述您的买入理由，比如：突破关键阻力位、回踩支撑位反弹、技术指标金叉等..."
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
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
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      K线图快照 (推荐上传)
                    </label>

                    {/* 图片上传区域 */}
                    <div
                      className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition-colors focus:border-blue-500 focus:outline-none"
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files[0];
                        if (file && file.type.startsWith('image/')) {
                          const reader = new FileReader();
                          reader.onload = (e) => {
                            handleInputChange('chartSnapshot', e.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onPaste={(e) => {
                        e.preventDefault();
                        console.log('粘贴事件触发', e.clipboardData);

                        const items = e.clipboardData?.items;
                        if (items) {
                          console.log('剪贴板项目数量:', items.length);
                          for (let i = 0; i < items.length; i++) {
                            console.log(`项目 ${i}:`, items[i].type, items[i].kind);
                            if (items[i].type.indexOf('image') !== -1) {
                              console.log('找到图片项目');
                              const file = items[i].getAsFile();
                              if (file) {
                                console.log('获取到文件:', file.name, file.size);
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                  console.log('文件读取完成');
                                  handleInputChange('chartSnapshot', e.target?.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                              break;
                            }
                          }
                        } else {
                          console.log('没有剪贴板数据');
                        }
                      }}
                      onClick={() => {
                        // 确保元素获得焦点以接收粘贴事件
                        (document.activeElement as HTMLElement)?.blur();
                        setTimeout(() => {
                          const element = document.querySelector('[data-paste-target]') as HTMLElement;
                          element?.focus();
                        }, 0);
                      }}
                      tabIndex={0}
                      data-paste-target="true"
                    >
                      {formData.chartSnapshot ? (
                        <div className="relative">
                          <img
                            src={formData.chartSnapshot}
                            alt="K线图快照"
                            className="max-w-full h-auto rounded-lg shadow-sm"
                          />
                          <div className="absolute top-2 right-2 flex space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.write([
                                  new ClipboardItem({
                                    'image/png': fetch(formData.chartSnapshot).then(r => r.blob())
                                  })
                                ]).then(() => {
                                  alert('图片已复制到剪贴板');
                                }).catch(() => {
                                  alert('复制失败，请手动复制');
                                });
                              }}
                              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              title="复制图片"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInputChange('chartSnapshot', '')}
                              className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                              title="删除图片"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <div className="space-y-2">
                            <p className="text-gray-600">拖拽图片到此处，或点击上传</p>
                            <p className="text-sm text-blue-600 font-medium">📋 点击此区域后按 Ctrl+V 粘贴截图</p>
                            <p className="text-xs text-gray-400">支持从任何截图工具直接粘贴</p>
                          </div>
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
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-gray-500 mt-2">
                      上传K线图可以提高计划质量分，帮助后续复盘分析。支持拖拽、粘贴截图或点击上传。
                    </p>
                  </div>
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
