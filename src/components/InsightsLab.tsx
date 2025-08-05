// 【知行交易】智能复盘研究院 - 个人数据科学家
// 通过数据分析为用户提供个性化的交易洞察和改进建议

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { 
  TradingStats, 
  TradeRecord, 
  InsightCard, 
  TradingEmotion,
  InformationSource,
  DisciplineRating 
} from '@/types';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  Heart,
  Users,
  Clock,
  BarChart3,
  Lightbulb,
  ArrowLeft,
  Eye,
  EyeOff
} from 'lucide-react';

interface InsightsLabProps {
  stats: TradingStats;
  records: TradeRecord[];
  onBack: () => void;
}

export function InsightsLab({ stats, records, onBack }: InsightsLabProps) {
  const [insights, setInsights] = useState<InsightCard[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'emotion' | 'discipline' | 'performance'>('all');

  // 生成智能洞察
  useEffect(() => {
    const generatedInsights = generateInsights(stats, records);
    setInsights(generatedInsights);
  }, [stats, records]);

  const filteredInsights = insights.filter(insight => 
    selectedCategory === 'all' || 
    (selectedCategory === 'emotion' && insight.type === 'emotion') ||
    (selectedCategory === 'discipline' && insight.type === 'discipline') ||
    (selectedCategory === 'performance' && (insight.type === 'source' || insight.type === 'timing'))
  );

  const getInsightIcon = (type: InsightCard['type']) => {
    switch (type) {
      case 'emotion': return <Heart className="w-5 h-5" />;
      case 'discipline': return <Brain className="w-5 h-5" />;
      case 'source': return <Users className="w-5 h-5" />;
      case 'timing': return <Clock className="w-5 h-5" />;
      default: return <Lightbulb className="w-5 h-5" />;
    }
  };

  const getInsightColor = (severity: InsightCard['severity']) => {
    switch (severity) {
      case 'success': return 'border-green-200 bg-green-50 text-green-800';
      case 'warning': return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'error': return 'border-red-200 bg-red-50 text-red-800';
      default: return 'border-blue-200 bg-blue-50 text-blue-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">智能复盘研究院</h1>
            <p className="text-gray-600">您的个人数据科学家 - 发现交易模式，优化决策过程</p>
          </div>
          <button
            onClick={onBack}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回仪表盘
          </button>
        </div>

        {/* 核心指标概览 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <Brain className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.disciplineScore}</div>
              <div className="text-sm text-gray-500">纪律分</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <Target className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{(stats.winRate * 100).toFixed(1)}%</div>
              <div className="text-sm text-gray-500">胜率</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <BarChart3 className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.avgRiskRewardRatio.toFixed(2)}</div>
              <div className="text-sm text-gray-500">平均盈亏比</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <TrendingUp className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
              <div className={`text-2xl font-bold ${stats.totalPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.totalPnLPercent >= 0 ? '+' : ''}{stats.totalPnLPercent.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">总收益率</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：洞察卡片 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                    智能洞察 ({filteredInsights.length})
                  </CardTitle>
                  <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        selectedCategory === 'all'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      全部
                    </button>
                    <button
                      onClick={() => setSelectedCategory('emotion')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        selectedCategory === 'emotion'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      情绪
                    </button>
                    <button
                      onClick={() => setSelectedCategory('discipline')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        selectedCategory === 'discipline'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      纪律
                    </button>
                    <button
                      onClick={() => setSelectedCategory('performance')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        selectedCategory === 'performance'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      表现
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredInsights.length === 0 ? (
                  <div className="text-center py-12">
                    <Brain className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">暂无洞察数据</p>
                    <p className="text-sm text-gray-400">完成更多交易后将生成个性化洞察</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredInsights.map((insight) => (
                      <div
                        key={insight.id}
                        className={`p-4 border rounded-lg ${getInsightColor(insight.severity)}`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {getInsightIcon(insight.type)}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold mb-2">{insight.title}</h4>
                            <p className="text-sm leading-relaxed">{insight.content}</p>
                            <div className="mt-3 flex items-center justify-between">
                              <span className="text-xs opacity-75">
                                {new Date(insight.createdAt).toLocaleDateString()}
                              </span>
                              <div className="flex items-center space-x-2">
                                {insight.severity === 'error' && (
                                  <AlertTriangle className="w-4 h-4" />
                                )}
                                {insight.severity === 'warning' && (
                                  <AlertTriangle className="w-4 h-4" />
                                )}
                                {insight.severity === 'success' && (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 右侧：统计分析 */}
          <div className="space-y-6">
            {/* 情绪分析 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Heart className="w-5 h-5 mr-2 text-red-500" />
                  情绪分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(getEmotionStats(records)).map(([emotion, count]) => (
                    <div key={emotion} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 capitalize">
                        {getEmotionLabel(emotion as TradingEmotion)}
                      </span>
                      <span className="font-semibold">{count}次</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 信息源分析 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2 text-blue-500" />
                  信息源分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(getSourceStats(records)).map(([source, data]) => (
                    <div key={source} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          {getSourceLabel(source as InformationSource)}
                        </span>
                        <span className="font-semibold">{data.count}次</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">平均收益</span>
                        <span className={`font-medium ${data.avgReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {data.avgReturn >= 0 ? '+' : ''}{data.avgReturn.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 纪律表现 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="w-5 h-5 mr-2 text-purple-500" />
                  纪律表现
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(getDisciplineStats(records)).map(([rating, count]) => (
                    <div key={rating} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        {getDisciplineLabel(rating as DisciplineRating)}
                      </span>
                      <span className="font-semibold">{count}次</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">纪律率</span>
                    <span className="font-bold text-blue-600">
                      {stats.totalTrades > 0 
                        ? ((stats.perfectExecutions / stats.totalTrades) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 时间分析 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-green-500" />
                  时间分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">平均持仓</span>
                    <span className="font-semibold">{stats.avgHoldingDays.toFixed(1)}天</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">总交易数</span>
                    <span className="font-semibold">{stats.totalTrades}笔</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">最后更新</span>
                    <span className="text-sm text-gray-500">
                      {new Date(stats.lastUpdated).toLocaleDateString()}
                    </span>
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

// 生成智能洞察的核心算法
function generateInsights(stats: TradingStats, records: TradeRecord[]): InsightCard[] {
  const insights: InsightCard[] = [];
  
  if (records.length === 0) return insights;

  // 情绪洞察
  const emotionStats = getEmotionStats(records);
  const fomoTrades = emotionStats[TradingEmotion.FOMO] || 0;
  if (fomoTrades > 0) {
    const fomoRecords = records.filter(r => r.planId && fomoTrades > 0); // 简化处理
    const fomoAvgReturn = fomoRecords.length > 0 
      ? fomoRecords.reduce((sum, r) => sum + (r.totalPnLPercent || 0), 0) / fomoRecords.length
      : 0;
    
    insights.push({
      id: 'emotion_fomo',
      type: 'emotion',
      title: 'FOMO情绪警告',
      content: `您在FOMO情绪下进行了${fomoTrades}次交易，平均收益为${fomoAvgReturn.toFixed(1)}%。建议在感到FOMO时暂停交易，冷静分析。`,
      severity: fomoAvgReturn < -5 ? 'error' : 'warning',
      createdAt: new Date(),
      isRead: false
    });
  }

  // 纪律洞察
  const disciplineRate = stats.totalTrades > 0 ? (stats.perfectExecutions / stats.totalTrades) : 0;
  if (disciplineRate < 0.6) {
    insights.push({
      id: 'discipline_low',
      type: 'discipline',
      title: '纪律执行需要改进',
      content: `您的纪律执行率为${(disciplineRate * 100).toFixed(1)}%，低于建议的60%。严格执行交易计划是成功的关键。`,
      severity: 'warning',
      createdAt: new Date(),
      isRead: false
    });
  } else if (disciplineRate > 0.8) {
    insights.push({
      id: 'discipline_good',
      type: 'discipline',
      title: '纪律执行优秀',
      content: `恭喜！您的纪律执行率达到${(disciplineRate * 100).toFixed(1)}%，保持这种严格的执行标准。`,
      severity: 'success',
      createdAt: new Date(),
      isRead: false
    });
  }

  // 信息源洞察
  const sourceStats = getSourceStats(records);
  const bestSource = Object.entries(sourceStats).reduce((best, [source, data]) => 
    data.avgReturn > best.avgReturn ? { source, avgReturn: data.avgReturn } : best
  , { source: '', avgReturn: -Infinity });

  if (bestSource.source) {
    insights.push({
      id: 'source_best',
      type: 'source',
      title: '最佳信息源发现',
      content: `数据显示，当信息来源为"${getSourceLabel(bestSource.source as InformationSource)}"时，您的平均收益最高，达到${bestSource.avgReturn.toFixed(1)}%。`,
      severity: 'success',
      createdAt: new Date(),
      isRead: false
    });
  }

  return insights;
}

// 辅助函数
function getEmotionStats(records: TradeRecord[]) {
  const stats: Record<string, number> = {};
  // 简化实现，实际应该从计划中获取情绪数据
  return stats;
}

function getSourceStats(records: TradeRecord[]) {
  const stats: Record<string, { count: number; avgReturn: number }> = {};
  // 简化实现，实际应该从计划中获取信息源数据
  return stats;
}

function getDisciplineStats(records: TradeRecord[]) {
  const stats: Record<string, number> = {};
  records.forEach(record => {
    stats[record.disciplineRating] = (stats[record.disciplineRating] || 0) + 1;
  });
  return stats;
}

function getEmotionLabel(emotion: TradingEmotion): string {
  const labels = {
    [TradingEmotion.CALM]: '冷静',
    [TradingEmotion.CONFIDENT]: '自信',
    [TradingEmotion.UNCERTAIN]: '不确定',
    [TradingEmotion.FOMO]: 'FOMO',
    [TradingEmotion.FEAR]: '恐惧',
    [TradingEmotion.GREED]: '贪婪',
    [TradingEmotion.REVENGE]: '报复'
  };
  return labels[emotion] || emotion;
}

function getSourceLabel(source: InformationSource): string {
  const labels = {
    [InformationSource.SELF_ANALYSIS]: '自己分析',
    [InformationSource.PROFESSIONAL_REPORT]: '专业报告',
    [InformationSource.TECHNICAL_SIGNAL]: '技术信号',
    [InformationSource.NEWS_MEDIA]: '新闻媒体',
    [InformationSource.FRIEND_RECOMMEND]: '朋友推荐',
    [InformationSource.SOCIAL_MEDIA]: '社交媒体'
  };
  return labels[source] || source;
}

function getDisciplineLabel(rating: DisciplineRating): string {
  const labels = {
    [DisciplineRating.PERFECT]: '完美执行',
    [DisciplineRating.GOOD]: '基本执行',
    [DisciplineRating.PARTIAL]: '部分执行',
    [DisciplineRating.POOR]: '执行不佳'
  };
  return labels[rating] || rating;
}
