// 【知行交易】主仪表盘 - 交易司令部
// 这是用户的交易控制中心，体现专业、冷静、信息聚焦的设计理念

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { TrendingUp, TrendingDown, Target, Brain, Plus, BookOpen, Activity, Settings } from 'lucide-react';
import { TradingStats, TradingPlan, TradingPlaybook } from '@/types';

interface DashboardProps {
  stats: TradingStats;
  activePlans: TradingPlan[];
  playbooks: TradingPlaybook[];
  onNewPlan: () => void;
  onViewPlan: (planId: string) => void;
  onViewPlaybook: (playbookId: string) => void;
  onViewMarket: () => void;
  onViewInsights: () => void;
  onViewSettings: () => void;
}

export function Dashboard({
  stats,
  activePlans,
  playbooks,
  onNewPlan,
  onViewPlan,
  onViewPlaybook,
  onViewMarket,
  onViewInsights,
  onViewSettings
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'playbooks'>('active');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">知行交易</h1>
        <p className="text-gray-600">计划你的交易，交易你的计划</p>
      </div>

      {/* 核心KPI区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* 个人纪律分 - 最重要的指标 */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-1">个人纪律分</p>
                <div className="flex items-center">
                  <span className="text-3xl font-bold text-blue-900">{stats.disciplineScore}</span>
                  <span className="text-lg text-blue-700 ml-1">/100</span>
                </div>
                <div className="flex items-center mt-2">
                  {stats.disciplineScore >= 80 ? (
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  ) : stats.disciplineScore >= 60 ? (
                    <Activity className="w-4 h-4 text-yellow-500 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <span className="text-sm text-gray-600">
                    {stats.disciplineScore >= 80 ? '优秀' : 
                     stats.disciplineScore >= 60 ? '良好' : '需改进'}
                  </span>
                </div>
              </div>
              <Brain className="w-12 h-12 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* 总盈亏 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">总盈亏</p>
                <div className="flex items-center">
                  <span className={`text-2xl font-bold ${
                    stats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stats.totalPnL >= 0 ? '+' : ''}{stats.totalPnL.toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">元</span>
                </div>
                <p className={`text-sm ${
                  stats.totalPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stats.totalPnLPercent >= 0 ? '+' : ''}{stats.totalPnLPercent.toFixed(2)}%
                </p>
              </div>
              <Target className="w-10 h-10 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        {/* 胜率 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">胜率</p>
                <div className="flex items-center">
                  <span className="text-2xl font-bold text-gray-900">
                    {(stats.winRate * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {stats.winningTrades}胜 / {stats.totalTrades}笔
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 font-bold">W</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 平均盈亏比 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">平均盈亏比</p>
                <div className="flex items-center">
                  <span className="text-2xl font-bold text-gray-900">
                    {stats.avgRiskRewardRatio.toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">:1</span>
                </div>
                <p className="text-sm text-gray-500">
                  {stats.avgRiskRewardRatio >= 2 ? '优秀' : 
                   stats.avgRiskRewardRatio >= 1.5 ? '良好' : '需改进'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-purple-600 font-bold">R</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 操作按钮区域 */}
      <div className="mb-8 flex flex-col md:flex-row gap-4">
        <button
          onClick={onNewPlan}
          className="flex-1 md:flex-none bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-3"
        >
          <Plus className="w-6 h-6" />
          <span className="text-lg">新建交易计划</span>
        </button>

        <button
          onClick={onViewMarket}
          className="flex-1 md:flex-none bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-3"
        >
          <BarChart3 className="w-5 h-5" />
          <span>股票市场</span>
        </button>

        <button
          onClick={onViewInsights}
          className="flex-1 md:flex-none bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-3"
        >
          <Brain className="w-5 h-5" />
          <span>智能复盘研究院</span>
        </button>

        <button
          onClick={onViewSettings}
          className="flex-1 md:flex-none bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-3"
        >
          <Settings className="w-5 h-5" />
          <span>系统设置</span>
        </button>
      </div>

      {/* 主内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左侧：追踪中的交易和剧本库 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>交易管理</CardTitle>
                <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'active'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    追踪中 ({activePlans.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('playbooks')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'playbooks'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    我的剧本 ({playbooks.length})
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {activeTab === 'active' ? (
                <ActiveTradesSection 
                  activePlans={activePlans} 
                  onViewPlan={onViewPlan} 
                />
              ) : (
                <PlaybooksSection 
                  playbooks={playbooks} 
                  onViewPlaybook={onViewPlaybook} 
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧：快速统计和洞察 */}
        <div className="space-y-6">
          {/* 纪律统计 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="w-5 h-5 mr-2 text-blue-500" />
                纪律统计
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">完美执行</span>
                  <span className="font-semibold text-green-600">
                    {stats.perfectExecutions}次
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">执行不佳</span>
                  <span className="font-semibold text-red-600">
                    {stats.poorExecutions}次
                  </span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">纪律率</span>
                    <span className="font-bold text-blue-600">
                      {stats.totalTrades > 0 
                        ? ((stats.perfectExecutions / stats.totalTrades) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 交易概览 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2 text-green-500" />
                交易概览
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">总交易数</span>
                  <span className="font-semibold">{stats.totalTrades}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">平均持仓</span>
                  <span className="font-semibold">
                    {stats.avgHoldingDays.toFixed(1)}天
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">平均盈利</span>
                  <span className="font-semibold text-green-600">
                    +{stats.avgWinPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">平均亏损</span>
                  <span className="font-semibold text-red-600">
                    -{stats.avgLossPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// 追踪中交易组件
function ActiveTradesSection({ 
  activePlans, 
  onViewPlan 
}: { 
  activePlans: TradingPlan[]; 
  onViewPlan: (planId: string) => void; 
}) {
  if (activePlans.length === 0) {
    return (
      <div className="text-center py-12">
        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-2">暂无追踪中的交易</p>
        <p className="text-sm text-gray-400">创建您的第一个交易计划开始交易之旅</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activePlans.map((plan) => (
        <div
          key={plan.id}
          onClick={() => onViewPlan(plan.id)}
          className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="font-semibold text-gray-900">{plan.symbolName}</h4>
              <p className="text-sm text-gray-500">{plan.symbol}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">计划价格</p>
              <p className="font-semibold">¥{plan.plannedEntryPrice.toFixed(2)}</p>
            </div>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">
              止损: ¥{plan.stopLoss.toFixed(2)} | 止盈: ¥{plan.takeProfit.toFixed(2)}
            </span>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
              {plan.status === 'planning' ? '计划中' : '执行中'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// 剧本库组件
function PlaybooksSection({ 
  playbooks, 
  onViewPlaybook 
}: { 
  playbooks: TradingPlaybook[]; 
  onViewPlaybook: (playbookId: string) => void; 
}) {
  if (playbooks.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-2">暂无交易剧本</p>
        <p className="text-sm text-gray-400">完成成功的交易后可以保存为剧本</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {playbooks.map((playbook) => (
        <div
          key={playbook.id}
          onClick={() => onViewPlaybook(playbook.id)}
          className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
        >
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-semibold text-gray-900 text-sm">{playbook.name}</h4>
            {playbook.isSystemDefault && (
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                系统
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 mb-3 line-clamp-2">{playbook.description}</p>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500">
              胜率: {(playbook.performance.winRate * 100).toFixed(1)}%
            </span>
            <span className="text-gray-500">
              {playbook.performance.totalTrades}笔交易
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
