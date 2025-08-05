// 【知行交易】持仓跟踪器
// 详细记录和跟踪所有持仓操作和预定动作

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { 
  TradeRecord, 
  PlannedAction, 
  PlannedActionType, 
  PlannedActionStatus,
  PositionDetail,
  RiskManagementRecord 
} from '@/types';
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Target,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Edit3,
  Trash2,
  DollarSign,
  BarChart3,
  Activity,
  Bell,
  Calendar,
  Zap
} from 'lucide-react';

interface PositionTrackerProps {
  tradeRecord: TradeRecord;
  onUpdateRecord: (id: string, updates: Partial<TradeRecord>) => void;
  onAddPlannedAction: (action: Omit<PlannedAction, 'id' | 'createdAt'>) => void;
  onUpdatePlannedAction: (actionId: string, updates: Partial<PlannedAction>) => void;
  onDeletePlannedAction: (actionId: string) => void;
}

export function PositionTracker({
  tradeRecord,
  onUpdateRecord,
  onAddPlannedAction,
  onUpdatePlannedAction,
  onDeletePlannedAction
}: PositionTrackerProps) {
  const [currentTab, setCurrentTab] = useState<'overview' | 'planned' | 'history' | 'risk'>('overview');
  const [showAddActionForm, setShowAddActionForm] = useState(false);

  // 计算统计数据
  const stats = useMemo(() => {
    const pendingActions = tradeRecord.plannedActions?.filter(a => a.status === PlannedActionStatus.PENDING).length || 0;
    const triggeredActions = tradeRecord.plannedActions?.filter(a => a.status === PlannedActionStatus.TRIGGERED).length || 0;
    const riskAlerts = tradeRecord.riskManagement?.riskAlerts?.filter(a => !a.acknowledged).length || 0;
    
    return {
      currentValue: tradeRecord.currentPosition * (tradeRecord.positionDetails?.[0]?.currentPrice || 0),
      totalInvested: tradeRecord.totalInvested,
      unrealizedPnL: tradeRecord.unrealizedPnL,
      unrealizedPnLPercent: tradeRecord.totalPnLPercent,
      pendingActions,
      triggeredActions,
      riskAlerts
    };
  }, [tradeRecord]);

  const getActionTypeIcon = (type: PlannedActionType) => {
    switch (type) {
      case PlannedActionType.BUY: return <TrendingUp className="w-4 h-4 text-green-500" />;
      case PlannedActionType.SELL: return <TrendingDown className="w-4 h-4 text-red-500" />;
      case PlannedActionType.STOP_LOSS: return <Shield className="w-4 h-4 text-red-500" />;
      case PlannedActionType.TAKE_PROFIT: return <Target className="w-4 h-4 text-green-500" />;
      case PlannedActionType.ADD_POSITION: return <Plus className="w-4 h-4 text-blue-500" />;
      case PlannedActionType.REDUCE_POSITION: return <TrendingDown className="w-4 h-4 text-orange-500" />;
      case PlannedActionType.ADJUST_STOP: return <Edit3 className="w-4 h-4 text-purple-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActionTypeLabel = (type: PlannedActionType) => {
    switch (type) {
      case PlannedActionType.BUY: return '买入';
      case PlannedActionType.SELL: return '卖出';
      case PlannedActionType.STOP_LOSS: return '止损';
      case PlannedActionType.TAKE_PROFIT: return '止盈';
      case PlannedActionType.ADD_POSITION: return '加仓';
      case PlannedActionType.REDUCE_POSITION: return '减仓';
      case PlannedActionType.ADJUST_STOP: return '调整止损';
      default: return type;
    }
  };
  const getStatusLabel = (status: PlannedActionStatus) => {
    switch (status) {
      case PlannedActionStatus.PENDING: return '待执行';
      case PlannedActionStatus.TRIGGERED: return '已触发';
      case PlannedActionStatus.EXECUTED: return '已执行';
      case PlannedActionStatus.CANCELLED: return '已取消';
      case PlannedActionStatus.EXPIRED: return '已过期';
      default: return status;
    }
  };

  const getStatusColor = (status: PlannedActionStatus) => {
    switch (status) {
      case PlannedActionStatus.PENDING: return 'bg-yellow-100 text-yellow-800';
      case PlannedActionStatus.TRIGGERED: return 'bg-orange-100 text-orange-800';
      case PlannedActionStatus.EXECUTED: return 'bg-green-100 text-green-800';
      case PlannedActionStatus.CANCELLED: return 'bg-gray-100 text-gray-800';
      case PlannedActionStatus.EXPIRED: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const tabs = [
    { id: 'overview', label: '持仓概览', icon: BarChart3 },
    { id: 'planned', label: '预定操作', icon: Calendar, count: stats.pendingActions },
    { id: 'history', label: '操作历史', icon: Activity },
    { id: 'risk', label: '风险管理', icon: Shield, count: stats.riskAlerts }
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">持仓跟踪</h2>
          <p className="text-gray-600 mt-1">详细跟踪持仓状态和预定操作</p>
        </div>
        <button
          onClick={() => setShowAddActionForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          添加预定操作
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">当前市值</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${stats.currentValue.toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">浮动盈亏</p>
                <p className={`text-2xl font-bold ${
                  stats.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stats.unrealizedPnL >= 0 ? '+' : ''}${stats.unrealizedPnL.toFixed(2)}
                </p>
                <p className={`text-sm ${
                  stats.unrealizedPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stats.unrealizedPnLPercent >= 0 ? '+' : ''}{stats.unrealizedPnLPercent.toFixed(2)}%
                </p>
              </div>
              {stats.unrealizedPnL >= 0 ? 
                <TrendingUp className="w-8 h-8 text-green-500" /> :
                <TrendingDown className="w-8 h-8 text-red-500" />
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">待执行操作</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pendingActions}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">风险警报</p>
                <p className="text-2xl font-bold text-red-600">{stats.riskAlerts}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 标签页导航 */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  currentTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-2 bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 标签页内容 */}
      <div className="mt-6">
        {currentTab === 'overview' && (
          <PositionOverview tradeRecord={tradeRecord} />
        )}

        {currentTab === 'planned' && (
          <PlannedActions
            actions={tradeRecord.plannedActions || []}
            onUpdate={onUpdatePlannedAction}
            onDelete={onDeletePlannedAction}
          />
        )}

        {currentTab === 'history' && (
          <OperationHistory tradeRecord={tradeRecord} />
        )}

        {currentTab === 'risk' && (
          <RiskManagement riskRecord={tradeRecord.riskManagement} />
        )}
      </div>
    </div>
  );
}

// 持仓概览组件
function PositionOverview({ tradeRecord }: { tradeRecord: TradeRecord }) {
  const currentDetail = tradeRecord.positionDetails?.[0];

  return (
    <div className="space-y-6">
      {/* 当前持仓状态 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
            当前持仓状态
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">持仓信息</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">持仓数量:</span>
                  <span className="font-medium">{tradeRecord.currentPosition}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">平均成本:</span>
                  <span className="font-medium">${tradeRecord.averageEntryPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">当前价格:</span>
                  <span className="font-medium">${currentDetail?.currentPrice.toFixed(2) || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">市值:</span>
                  <span className="font-medium">${currentDetail?.marketValue.toFixed(2) || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">盈亏情况</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">浮动盈亏:</span>
                  <span className={`font-medium ${
                    tradeRecord.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {tradeRecord.unrealizedPnL >= 0 ? '+' : ''}${tradeRecord.unrealizedPnL.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">盈亏比例:</span>
                  <span className={`font-medium ${
                    tradeRecord.totalPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {tradeRecord.totalPnLPercent >= 0 ? '+' : ''}{tradeRecord.totalPnLPercent.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">已实现盈亏:</span>
                  <span className={`font-medium ${
                    tradeRecord.realizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {tradeRecord.realizedPnL >= 0 ? '+' : ''}${tradeRecord.realizedPnL.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">总投入:</span>
                  <span className="font-medium">${tradeRecord.totalInvested.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">风险指标</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">风险敞口:</span>
                  <span className="font-medium">${currentDetail?.riskExposure.toFixed(2) || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">组合权重:</span>
                  <span className="font-medium">{currentDetail?.portfolioWeight.toFixed(2) || 'N/A'}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">纪律评级:</span>
                  <span className={`font-medium ${
                    tradeRecord.disciplineRating === 'perfect' ? 'text-green-600' :
                    tradeRecord.disciplineRating === 'good' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {tradeRecord.disciplineRating}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 预定操作组件
function PlannedActions({
  actions,
  onUpdate,
  onDelete
}: {
  actions: PlannedAction[];
  onUpdate: (actionId: string, updates: Partial<PlannedAction>) => void;
  onDelete: (actionId: string) => void;
}) {
  const getActionTypeIcon = (type: PlannedActionType) => {
    switch (type) {
      case PlannedActionType.BUY: return <TrendingUp className="w-4 h-4 text-green-500" />;
      case PlannedActionType.SELL: return <TrendingDown className="w-4 h-4 text-red-500" />;
      case PlannedActionType.STOP_LOSS: return <Shield className="w-4 h-4 text-red-500" />;
      case PlannedActionType.TAKE_PROFIT: return <Target className="w-4 h-4 text-green-500" />;
      case PlannedActionType.ADD_POSITION: return <Plus className="w-4 h-4 text-blue-500" />;
      case PlannedActionType.REDUCE_POSITION: return <TrendingDown className="w-4 h-4 text-orange-500" />;
      case PlannedActionType.ADJUST_STOP: return <Edit3 className="w-4 h-4 text-purple-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActionTypeLabel = (type: PlannedActionType) => {
    switch (type) {
      case PlannedActionType.BUY: return '买入';
      case PlannedActionType.SELL: return '卖出';
      case PlannedActionType.STOP_LOSS: return '止损';
      case PlannedActionType.TAKE_PROFIT: return '止盈';
      case PlannedActionType.ADD_POSITION: return '加仓';
      case PlannedActionType.REDUCE_POSITION: return '减仓';
      case PlannedActionType.ADJUST_STOP: return '调整止损';
      default: return type;
    }
  };

  const getStatusIcon = (status: PlannedActionStatus) => {
    switch (status) {
      case PlannedActionStatus.PENDING: return <Clock className="w-4 h-4 text-yellow-500" />;
      case PlannedActionStatus.TRIGGERED: return <Bell className="w-4 h-4 text-orange-500" />;
      case PlannedActionStatus.EXECUTED: return <CheckCircle className="w-4 h-4 text-green-500" />;
      case PlannedActionStatus.CANCELLED: return <XCircle className="w-4 h-4 text-gray-500" />;
      case PlannedActionStatus.EXPIRED: return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: PlannedActionStatus) => {
    switch (status) {
      case PlannedActionStatus.PENDING: return '待执行';
      case PlannedActionStatus.TRIGGERED: return '已触发';
      case PlannedActionStatus.EXECUTED: return '已执行';
      case PlannedActionStatus.CANCELLED: return '已取消';
      case PlannedActionStatus.EXPIRED: return '已过期';
      default: return status;
    }
  };

  const getStatusColor = (status: PlannedActionStatus) => {
    switch (status) {
      case PlannedActionStatus.PENDING: return 'bg-yellow-100 text-yellow-800';
      case PlannedActionStatus.TRIGGERED: return 'bg-orange-100 text-orange-800';
      case PlannedActionStatus.EXECUTED: return 'bg-green-100 text-green-800';
      case PlannedActionStatus.CANCELLED: return 'bg-gray-100 text-gray-800';
      case PlannedActionStatus.EXPIRED: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {actions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">暂无预定操作</p>
            <p className="text-sm text-gray-400">添加买入、卖出、止损等预定操作</p>
          </CardContent>
        </Card>
      ) : (
        actions.map(action => (
          <Card key={action.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getActionTypeIcon(action.type)}
                    <h3 className="font-semibold text-gray-900">
                      {getActionTypeLabel(action.type)}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(action.status)}`}>
                      {getStatusLabel(action.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">触发价格: <span className="font-medium">${action.triggerPrice}</span></p>
                      <p className="text-gray-600">数量: <span className="font-medium">{action.quantity}</span></p>
                    </div>
                    <div>
                      <p className="text-gray-600">订单类型: <span className="font-medium">{action.orderType}</span></p>
                      {action.limitPrice && (
                        <p className="text-gray-600">限价: <span className="font-medium">${action.limitPrice}</span></p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-600">创建时间: <span className="font-medium">{action.createdAt.toLocaleDateString()}</span></p>
                      {action.expiresAt && (
                        <p className="text-gray-600">过期时间: <span className="font-medium">{action.expiresAt.toLocaleDateString()}</span></p>
                      )}
                    </div>
                  </div>

                  <p className="text-gray-700 mt-2">{action.reason}</p>
                  {action.notes && (
                    <p className="text-sm text-gray-500 mt-1 italic">{action.notes}</p>
                  )}
                </div>

                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => onUpdate(action.id, { status: PlannedActionStatus.CANCELLED })}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="取消"
                    disabled={action.status !== PlannedActionStatus.PENDING}
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(action.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// 操作历史组件
function OperationHistory({ tradeRecord }: { tradeRecord: TradeRecord }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2 text-green-500" />
            执行历史
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tradeRecord.executions.map((execution, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {execution.type === 'BUY' ?
                    <TrendingUp className="w-4 h-4 text-green-500" /> :
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  }
                  <div>
                    <p className="font-medium text-gray-900">
                      {execution.type === 'BUY' ? '买入' : '卖出'} {execution.quantity} 股
                    </p>
                    <p className="text-sm text-gray-600">
                      价格: ${execution.price} | 时间: {execution.timestamp.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    ${(execution.quantity * execution.price).toFixed(2)}
                  </p>
                  {execution.deviation !== 0 && (
                    <p className={`text-sm ${execution.deviation > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      偏差: {execution.deviation > 0 ? '+' : ''}{execution.deviation.toFixed(2)}%
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 风险管理组件
function RiskManagement({ riskRecord }: { riskRecord?: RiskManagementRecord }) {
  if (!riskRecord) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">暂无风险管理数据</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 风险警报 */}
      {riskRecord.riskAlerts && riskRecord.riskAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
              风险警报
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {riskRecord.riskAlerts.map(alert => (
                <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${
                  alert.severity === 'critical' ? 'bg-red-50 border-red-500' :
                  alert.severity === 'high' ? 'bg-orange-50 border-orange-500' :
                  alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                  'bg-blue-50 border-blue-500'
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{alert.message}</p>
                      <p className="text-sm text-gray-600">{alert.timestamp.toLocaleString()}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                      alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {alert.severity === 'critical' ? '严重' :
                       alert.severity === 'high' ? '高' :
                       alert.severity === 'medium' ? '中' : '低'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 止损止盈设置 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2 text-red-500" />
              止损设置
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">初始止损:</span>
                <span className="font-medium">${riskRecord.stopLoss.initialPrice}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">当前止损:</span>
                <span className="font-medium">${riskRecord.stopLoss.currentPrice}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">调整次数:</span>
                <span className="font-medium">{riskRecord.stopLoss.adjustmentHistory.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="w-5 h-5 mr-2 text-green-500" />
              止盈设置
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {riskRecord.takeProfits.map((tp, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">${tp.targetPrice}</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{tp.quantity} 股</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      tp.status === 'executed' ? 'bg-green-100 text-green-800' :
                      tp.status === 'triggered' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {tp.status === 'executed' ? '已执行' :
                       tp.status === 'triggered' ? '已触发' : '待触发'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
