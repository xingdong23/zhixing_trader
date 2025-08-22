// 【知行交易】交易管理模块
// 现代化交易计划、追踪、持仓管理功能

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { UnifiedTradingPlan } from './UnifiedTradingPlan';
import { TradeTracker } from './TradeTracker';
import { PositionTracker } from './PositionTracker';
import { TradingPlan, TradeRecord, LiveJournal, TradingPlaybook, Stock, TradeStatus } from '@/types';
import { cn } from '@/utils/cn';
import {
  Plus,
  BarChart3,
  Activity,
  Target,
  FileText,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  ArrowLeft
} from 'lucide-react';

interface TradingManagementProps {
  activePlans: TradingPlan[];
  activeRecords: TradeRecord[];
  playbooks: TradingPlaybook[];
  createPlanAction: () => void;
  updatePlanAction: (id: string, plan: Partial<TradingPlan>) => void;
  addRecordAction: (record: Omit<TradeRecord, 'id' | 'createdAt' | 'updatedAt'>) => void;
  selectedStock?: Stock; // 从股票市场传入的股票
}

export function TradingManagement({
  activePlans,
  activeRecords,
  playbooks,
  createPlanAction,
  updatePlanAction,
  addRecordAction,
  selectedStock
}: TradingManagementProps) {
  const [currentTab, setCurrentTab] = useState<'overview' | 'plans' | 'tracking' | 'positions'>('overview');
  const [selectedPlan, setSelectedPlan] = useState<TradingPlan | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<TradeRecord | null>(null);
  const [showCreatePlan, setShowCreatePlan] = useState(false);

  // 统计数据 - 增强版
  const stats = {
    totalPlans: activePlans.length,
    activeTrades: activeRecords.filter(r => r.status === 'active').length,
    totalValue: activeRecords.reduce((sum, r) => sum + (r.currentPosition * (r.positionDetails?.[0]?.currentPrice || 0)), 0),
    totalPnL: activeRecords.reduce((sum, r) => sum + r.unrealizedPnL, 0),
    winRate: activeRecords.length > 0 
      ? (activeRecords.filter(r => r.unrealizedPnL > 0).length / activeRecords.length * 100).toFixed(1)
      : '0.0'
  };

  const handleCreatePlan = () => {
    setShowCreatePlan(true);
  };

  const handlePlanSubmit = (plan: any) => {
    // 这里应该调用父组件的添加计划方法
    setShowCreatePlan(false);
  };

  const handlePlanCancel = () => {
    setShowCreatePlan(false);
  };

  const tabs = [
    { id: 'overview', label: '交易概览', icon: BarChart3, description: '整体情况一览' },
    { id: 'plans', label: '交易计划', icon: FileText, count: stats.totalPlans, description: '策略计划管理' },
    { id: 'tracking', label: '交易追踪', icon: Activity, count: stats.activeTrades, description: '实时交易监控' },
    { id: 'positions', label: '持仓管理', icon: Target, description: '持仓组合管理' }
  ];

  // 如果显示创建计划表单
  if (showCreatePlan) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handlePlanCancel}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回交易管理
          </Button>
        </div>
        <UnifiedTradingPlan
          playbooks={playbooks}
          saveAction={handlePlanSubmit}
          cancelAction={handlePlanCancel}

        />
      </div>
    );
  }

  // 如果选中了特定计划进行追踪
  if (selectedPlan) {
    return (
      <TradeTracker
        activePlans={[selectedPlan]}
        activeRecords={activeRecords.filter(r => r.planId === selectedPlan.id)}
        liveJournals={[]} // 暂时使用空数组，后续可以从props传入
        updatePlanAction={updatePlanAction}
        closeTradeAction={(planId) => {
          // 关闭交易的逻辑
          setSelectedPlan(null);
        }}
        addJournalAction={(tradeId, journal) => {}} // 暂时使用空函数，后续可以从props传入
        backAction={() => setSelectedPlan(null)}
      />
    );
  }

  // 如果选中了特定记录进行持仓管理
  if (selectedRecord) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedRecord(null)}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            ← 返回交易管理
          </button>
        </div>
        <PositionTracker
          tradeRecord={selectedRecord}
          onUpdateRecord={(id, updates) => {
            // 更新记录的逻辑
          }}
          onAddPlannedAction={(action) => {
            // 添加预定动作的逻辑
          }}
          onUpdatePlannedAction={(actionId, updates) => {
            // 更新预定动作的逻辑
          }}
          onDeletePlannedAction={(actionId) => {
            // 删除预定动作的逻辑
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">交易管理</h1>
          <p className="text-text-secondary mt-1">交易计划、执行追踪与持仓管理</p>
        </div>
        
        <Button 
          variant="primary" 
          onClick={handleCreatePlan}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          新建交易计划
        </Button>
      </div>

      {/* 统计卡片 - 全新设计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card variant="gradient" className="group hover:scale-105 transition-transform duration-200">
          <CardContent padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary mb-1">交易计划</p>
                <p className="text-2xl font-bold number">{stats.totalPlans}</p>
                <p className="text-xs text-text-tertiary mt-1">已制定计划</p>
              </div>
              <FileText className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient" className="group hover:scale-105 transition-transform duration-200">
          <CardContent padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary mb-1">活跃交易</p>
                <p className="text-2xl font-bold number status-success">{stats.activeTrades}</p>
                <p className="text-xs text-text-tertiary mt-1">正在执行</p>
              </div>
              <Activity className="w-8 h-8 text-success group-hover:scale-110 transition-transform" />
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient" className="group hover:scale-105 transition-transform duration-200">
          <CardContent padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary mb-1">总市值</p>
                <p className="text-2xl font-bold number">￥{stats.totalValue.toLocaleString()}</p>
                <p className="text-xs text-text-tertiary mt-1">持仓总值</p>
              </div>
              <DollarSign className="w-8 h-8 text-warning group-hover:scale-110 transition-transform" />
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient" className="group hover:scale-105 transition-transform duration-200">
          <CardContent padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary mb-1">总盈亏</p>
                <p className={cn(
                  'text-2xl font-bold number',
                  stats.totalPnL >= 0 ? 'status-success' : 'status-danger'
                )}>
                  {stats.totalPnL >= 0 && '+'}￥{stats.totalPnL.toLocaleString()}
                </p>
                <p className="text-xs text-text-tertiary mt-1">胜率 {stats.winRate}%</p>
              </div>
              {stats.totalPnL >= 0 ? (
                <TrendingUp className="w-8 h-8 text-success group-hover:scale-110 transition-transform" />
              ) : (
                <TrendingDown className="w-8 h-8 text-danger group-hover:scale-110 transition-transform" />
              )}
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
          <TradingOverview
            activePlans={activePlans}
            activeRecords={activeRecords}
            selectPlanAction={setSelectedPlan}
            selectRecordAction={setSelectedRecord}
          />
        )}

        {currentTab === 'plans' && (
          <TradingPlans
            plans={activePlans}
            selectPlanAction={setSelectedPlan}
            createPlanAction={handleCreatePlan}
          />
        )}

        {currentTab === 'tracking' && (
          <TradingTracking
            records={activeRecords}
            selectRecordAction={setSelectedRecord}
          />
        )}

        {currentTab === 'positions' && (
          <PositionManagement
            records={activeRecords}
            selectRecordAction={setSelectedRecord}
          />
        )}
      </div>
    </div>
  );
}

// 交易概览组件
function TradingOverview({
  activePlans,
  activeRecords,
  selectPlanAction,
  selectRecordAction
}: {
  activePlans: TradingPlan[];
  activeRecords: TradeRecord[];
  selectPlanAction: (plan: TradingPlan) => void;
  selectRecordAction: (record: TradeRecord) => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 最近计划 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2 text-blue-500" />
            最近计划
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activePlans.slice(0, 3).map(plan => (
              <div
                key={plan.id}
                onClick={() => selectPlanAction(plan)}
                className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-900">{plan.symbolName}</h4>
                    <p className="text-sm text-gray-600">{plan.strategyType}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    plan.status === TradeStatus.ACTIVE ? 'bg-green-100 text-green-800' :
                    plan.status === TradeStatus.PLANNING ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {plan.status === TradeStatus.ACTIVE ? '执行中' :
                     plan.status === TradeStatus.PLANNING ? '待执行' : '已完成'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 活跃交易 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2 text-green-500" />
            活跃交易
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeRecords.filter(r => r.status === 'active').slice(0, 3).map(record => (
              <div
                key={record.id}
                onClick={() => selectRecordAction(record)}
                className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-900">持仓 {record.currentPosition}</h4>
                    <p className="text-sm text-gray-600">成本 ${record.averageEntryPrice}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${
                      record.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {record.unrealizedPnL >= 0 ? '+' : ''}${record.unrealizedPnL.toFixed(0)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {record.totalPnLPercent >= 0 ? '+' : ''}{record.totalPnLPercent.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 交易计划列表组件
function TradingPlans({
  plans,
  selectPlanAction,
  createPlanAction
}: {
  plans: TradingPlan[];
  selectPlanAction: (plan: TradingPlan) => void;
  createPlanAction: () => void;
}) {
  return (
    <div className="space-y-4">
      {plans.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">暂无交易计划</p>
            <button
              onClick={createPlanAction}
              className="text-blue-600 hover:text-blue-700"
            >
              创建第一个交易计划
            </button>
          </CardContent>
        </Card>
      ) : (
        plans.map(plan => (
          <Card key={plan.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => selectPlanAction(plan)}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{plan.symbolName}</h3>
                  <p className="text-gray-600 mt-1">{plan.strategyType}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span>创建时间: {plan.createdAt.toLocaleDateString()}</span>
                    <span>质量分: {plan.planQualityScore}/100</span>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  plan.status === TradeStatus.ACTIVE ? 'bg-green-100 text-green-800' :
                  plan.status === TradeStatus.PLANNING ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {plan.status === TradeStatus.ACTIVE ? '执行中' :
                   plan.status === TradeStatus.PLANNING ? '待执行' : '已完成'}
                </span>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// 交易追踪组件
function TradingTracking({
  records,
  selectRecordAction
}: {
  records: TradeRecord[];
  selectRecordAction: (record: TradeRecord) => void;
}) {
  const activeRecords = records.filter(r => r.status === 'active');

  return (
    <div className="space-y-4">
      {activeRecords.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">暂无活跃交易</p>
          </CardContent>
        </Card>
      ) : (
        activeRecords.map(record => (
          <Card key={record.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => selectRecordAction(record)}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">持仓 {record.currentPosition} 股</h3>
                  <p className="text-gray-600 mt-1">平均成本: ${record.averageEntryPrice.toFixed(2)}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span>总投入: ${record.totalInvested.toFixed(0)}</span>
                    <span>纪律分: {record.disciplineRating}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-bold ${
                    record.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {record.unrealizedPnL >= 0 ? '+' : ''}${record.unrealizedPnL.toFixed(0)}
                  </p>
                  <p className={`text-sm ${
                    record.totalPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {record.totalPnLPercent >= 0 ? '+' : ''}{record.totalPnLPercent.toFixed(2)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// 持仓管理组件
function PositionManagement({
  records,
  selectRecordAction
}: {
  records: TradeRecord[];
  selectRecordAction: (record: TradeRecord) => void;
}) {
  return (
    <div className="space-y-4">
      {records.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">暂无持仓记录</p>
          </CardContent>
        </Card>
      ) : (
        records.map(record => (
          <Card key={record.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => selectRecordAction(record)}>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">持仓数量</p>
                  <p className="text-lg font-semibold text-gray-900">{record.currentPosition}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">平均成本</p>
                  <p className="text-lg font-semibold text-gray-900">${record.averageEntryPrice.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">当前市值</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ${(record.currentPosition * (record.positionDetails?.[0]?.currentPrice || 0)).toFixed(0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">浮动盈亏</p>
                  <p className={`text-lg font-semibold ${
                    record.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {record.unrealizedPnL >= 0 ? '+' : ''}${record.unrealizedPnL.toFixed(0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
