// 【知行交易】智能复盘模块
// 现代化复盘分析、洞察实验室、剧本管理功能

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import {
  Brain,
  BookOpen,
  BarChart3,
  FileText,
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  Lightbulb,
  ArrowLeft
} from 'lucide-react';

interface IntelligentReviewProps {
  tradingStats: TradingStats;
  completedPlans: TradingPlan[];
  completedRecords: TradeRecord[];
  insights: InsightCard[];
  playbooks: TradingPlaybook[];
  onAddPlaybook: (playbook: Omit<TradingPlaybook, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDeletePlaybook: (id: string) => void;
}

export function IntelligentReview({
  tradingStats,
  completedPlans,
  completedRecords,
  insights,
  playbooks,
  onAddPlaybook,
  onDeletePlaybook
}: IntelligentReviewProps) {
  const [currentTab, setCurrentTab] = useState<'overview' | 'review' | 'insights' | 'playbooks'>('overview');
  const [selectedPlan, setSelectedPlan] = useState<TradingPlan | null>(null);

  // 统计数据 - 增强版
  const totalPnL = completedRecords.reduce((sum, r) => sum + r.totalPnL, 0);
  const stats = {
    totalTrades: completedRecords.length,
    winRate: completedRecords.length > 0 ? 
      (completedRecords.filter(r => r.totalPnL > 0).length / completedRecords.length * 100) : 0,
    totalPnL,
    avgDiscipline: completedRecords.length > 0 ?
      (completedRecords.reduce((sum, r) => {
        const rating = r.disciplineRating === 'perfect' ? 4 :
                      r.disciplineRating === 'good' ? 3 :
                      r.disciplineRating === 'partial' ? 2 : 1;
        return sum + rating;
      }, 0) / completedRecords.length) : 0,
    totalInsights: insights.length,
    totalPlaybooks: playbooks.length,
    avgReturn: completedRecords.length > 0 ? 
      (totalPnL / completedRecords.length).toFixed(0) : '0'
  };

  const tabs = [
    { id: 'overview', label: '复盘概览', icon: BarChart3, description: '整体复盘数据' },
    { id: 'review', label: '交易复盘', icon: FileText, count: completedPlans.length, description: '详细交易分析' },
    { id: 'insights', label: '洞察实验室', icon: Brain, count: insights.length, description: '智能分析洞察' },
    { id: 'playbooks', label: '剧本管理', icon: BookOpen, count: playbooks.length, description: '交易策略剧本' }
  ];

  // 如果选中了特定计划进行复盘
  if (selectedPlan) {
    const relatedRecord = completedRecords.find(r => r.planId === selectedPlan.id);
    if (relatedRecord) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedPlan(null)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回复盘分析
            </Button>
            <h1 className="text-2xl font-bold">交易复盘 - {selectedPlan.symbolName}</h1>
          </div>
          <TradeReview
            plan={selectedPlan}
            onSubmitReview={(record, saveAsPlaybook) => {
              if (saveAsPlaybook) {
                // 这里应该从record创建playbook，暂时跳过
              }
              setSelectedPlan(null);
            }}
            onCancel={() => setSelectedPlan(null)}
          />
        </div>
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">智能复盘</h1>
          <p className="text-text-secondary mt-1">交易分析、经验总结与策略优化</p>
        </div>
      </div>

      {/* 统计卡片 - 全新设计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <Card variant="gradient" className="group hover:scale-105 transition-transform duration-200">
          <CardContent padding="md">
            <div className="text-center">
              <FileText className="w-8 h-8 text-text-secondary mx-auto mb-2 group-hover:text-primary transition-colors" />
              <p className="text-sm text-text-secondary mb-1">总交易数</p>
              <p className="text-2xl font-bold number">{stats.totalTrades}</p>
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient" className="group hover:scale-105 transition-transform duration-200">
          <CardContent padding="md">
            <div className="text-center">
              <Target className="w-8 h-8 text-success mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm text-text-secondary mb-1">胜率</p>
              <p className="text-2xl font-bold number status-success">{stats.winRate.toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient" className="group hover:scale-105 transition-transform duration-200">
          <CardContent padding="md">
            <div className="text-center">
              {stats.totalPnL >= 0 ? (
                <TrendingUp className="w-8 h-8 text-success mx-auto mb-2 group-hover:scale-110 transition-transform" />
              ) : (
                <TrendingDown className="w-8 h-8 text-danger mx-auto mb-2 group-hover:scale-110 transition-transform" />
              )}
              <p className="text-sm text-text-secondary mb-1">总盈亏</p>
              <p className={cn(
                'text-2xl font-bold number',
                stats.totalPnL >= 0 ? 'status-success' : 'status-danger'
              )}>
                {stats.totalPnL >= 0 && '+'}￥{Math.abs(stats.totalPnL).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient" className="group hover:scale-105 transition-transform duration-200">
          <CardContent padding="md">
            <div className="text-center">
              <Award className="w-8 h-8 text-warning mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm text-text-secondary mb-1">纪律分</p>
              <p className="text-2xl font-bold number text-warning">{stats.avgDiscipline.toFixed(1)}</p>
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient" className="group hover:scale-105 transition-transform duration-200">
          <CardContent padding="md">
            <div className="text-center">
              <Lightbulb className="w-8 h-8 text-info mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm text-text-secondary mb-1">洞察卡片</p>
              <p className="text-2xl font-bold number text-info">{stats.totalInsights}</p>
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient" className="group hover:scale-105 transition-transform duration-200">
          <CardContent padding="md">
            <div className="text-center">
              <BookOpen className="w-8 h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm text-text-secondary mb-1">交易剧本</p>
              <p className="text-2xl font-bold number text-primary">{stats.totalPlaybooks}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 标签页导航 - 现代化设计 */}
      <div className="bg-bg-secondary rounded-xl p-1 border border-border-secondary">
        <div className="flex space-x-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id as any)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                  'text-sm font-medium relative',
                  isActive
                    ? 'bg-primary text-bg-primary shadow-lg'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:block">{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    isActive 
                      ? 'bg-bg-primary/20 text-bg-primary'
                      : 'bg-primary/10 text-primary'
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 标签页内容 */}
      <div className="mt-6">
        {currentTab === 'overview' && (
          <ReviewOverview
            stats={tradingStats}
            recentPlans={completedPlans.slice(0, 5)}
            recentInsights={insights.slice(0, 3)}
            onSelectPlan={setSelectedPlan}
          />
        )}

        {currentTab === 'review' && (
          <TradeReviewList
            plans={completedPlans}
            records={completedRecords}
            onSelectPlan={setSelectedPlan}
          />
        )}

        {currentTab === 'insights' && (
          <InsightsLab
            stats={tradingStats}
            records={completedRecords}
            onBack={() => {}}
          />
        )}

        {currentTab === 'playbooks' && (
          <PlaybookManager
            playbooks={playbooks}
            onCreatePlaybook={onAddPlaybook}
            onUpdatePlaybook={(id, updates) => {}}
            onDeletePlaybook={onDeletePlaybook}
            onBack={() => {}}
          />
        )}
      </div>
    </div>
  );
}

// 复盘概览组件
function ReviewOverview({
  stats,
  recentPlans,
  recentInsights,
  onSelectPlan
}: {
  stats: TradingStats;
  recentPlans: TradingPlan[];
  recentInsights: InsightCard[];
  onSelectPlan: (plan: TradingPlan) => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 最近复盘 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2 text-blue-500" />
            最近复盘
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentPlans.length === 0 ? (
              <p className="text-gray-500 text-center py-4">暂无已完成的交易</p>
            ) : (
              recentPlans.map(plan => (
                <div
                  key={plan.id}
                  onClick={() => onSelectPlan(plan)}
                  className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-gray-900">{plan.symbolName}</h4>
                      <p className="text-sm text-gray-600">{plan.buyingLogic.technical.slice(0, 50)}...</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {plan.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                      已完成
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 最新洞察 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lightbulb className="w-5 h-5 mr-2 text-orange-500" />
            最新洞察
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentInsights.length === 0 ? (
              <p className="text-gray-500 text-center py-4">暂无洞察卡片</p>
            ) : (
              recentInsights.map(insight => (
                <div key={insight.id} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-1">{insight.title}</h4>
                  <p className="text-sm text-gray-600 mb-2">{insight.content}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{insight.type}</span>
                    <span>{insight.createdAt.toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 交易复盘列表组件
function TradeReviewList({
  plans,
  records,
  onSelectPlan
}: {
  plans: TradingPlan[];
  records: TradeRecord[];
  onSelectPlan: (plan: TradingPlan) => void;
}) {
  return (
    <div className="space-y-4">
      {plans.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">暂无已完成的交易可供复盘</p>
          </CardContent>
        </Card>
      ) : (
        plans.map(plan => {
          const record = records.find(r => r.planId === plan.id);
          return (
            <Card key={plan.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelectPlan(plan)}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{plan.symbolName}</h3>
                    <p className="text-gray-600 mt-1">{plan.strategyType}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span>交易时间: {plan.createdAt.toLocaleDateString()}</span>
                      <span>质量分: {plan.planQualityScore}/100</span>
                      {record && (
                        <span>纪律分: {record.disciplineRating}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {record && (
                      <>
                        <p className={`text-xl font-bold ${
                          record.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {record.totalPnL >= 0 ? '+' : ''}${record.totalPnL.toFixed(0)}
                        </p>
                        <p className={`text-sm ${
                          record.totalPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {record.totalPnLPercent >= 0 ? '+' : ''}{record.totalPnLPercent.toFixed(2)}%
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
