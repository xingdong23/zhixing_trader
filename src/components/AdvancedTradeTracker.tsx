// 【知行交易】高级交易追踪 - 严格的纪律执行监督系统
// 实现分批执行监控、偏差检测、纪律评分等专业功能

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  TradingPlan, 
  TradeRecord,
  PositionLayer,
  TakeProfitLayer,
  ExecutionRecord,
  DisciplineViolation
} from '@/types';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Target,
  TrendingUp,
  TrendingDown,
  Shield,
  Eye,
  BarChart3,
  Zap
} from 'lucide-react';

interface AdvancedTradeTrackerProps {
  plan: TradingPlan;
  record: TradeRecord;
  currentPrice: number;
  onExecuteLayer: (layerId: string, type: 'BUY' | 'SELL', actualPrice: number) => void;
  onUpdateDiscipline: (violations: DisciplineViolation[]) => void;
  onBack: () => void;
}

export function AdvancedTradeTracker({
  plan,
  record,
  currentPrice,
  onExecuteLayer,
  onUpdateDiscipline,
  onBack
}: AdvancedTradeTrackerProps) {
  const [priceAlerts, setPriceAlerts] = useState<string[]>([]);
  const [disciplineScore, setDisciplineScore] = useState(100);
  
  // 检查价格触发条件
  useEffect(() => {
    checkPriceTriggers();
  }, [currentPrice, plan, record]);
  
  // 检查价格触发和纪律偏差
  const checkPriceTriggers = () => {
    const alerts: string[] = [];
    const violations: DisciplineViolation[] = [];
    
    // 检查加仓层级触发
    plan.positionLayers.forEach(layer => {
      if (!layer.executed && currentPrice <= layer.targetPrice) {
        alerts.push(`加仓信号：第${layer.layerIndex}层 (目标价: ¥${layer.targetPrice})`);
      }
    });
    
    // 检查止盈层级触发
    plan.takeProfitLayers.forEach(layer => {
      if (!layer.executed && currentPrice >= layer.targetPrice) {
        alerts.push(`止盈信号：目标${layer.layerIndex} (目标价: ¥${layer.targetPrice})`);
      }
    });
    
    // 检查止损触发
    if (currentPrice <= plan.globalStopLoss) {
      alerts.push(`止损警告：当前价格已触及止损位 (¥${plan.globalStopLoss})`);
    }
    
    setPriceAlerts(alerts);
    
    // 检查执行偏差
    record.executions.forEach(execution => {
      const layer = execution.type === 'BUY' 
        ? plan.positionLayers.find(l => l.id === execution.layerId)
        : plan.takeProfitLayers.find(l => l.id === execution.layerId);
      
      if (layer && Math.abs(execution.deviation) > 0.02) { // 偏差超过2%
        violations.push({
          id: Date.now().toString(),
          type: execution.deviation > 0 ? 'LATE_ENTRY' : 'EARLY_ENTRY',
          description: `执行偏差过大: ${(execution.deviation * 100).toFixed(2)}%`,
          severity: Math.abs(execution.deviation) > 0.05 ? 'HIGH' : 'MEDIUM',
          timestamp: execution.timestamp,
          priceDeviation: execution.deviation
        });
      }
    });
    
    if (violations.length > 0) {
      onUpdateDiscipline(violations);
    }
  };
  
  // 计算执行进度
  const getExecutionProgress = () => {
    const totalLayers = plan.positionLayers.length;
    const executedLayers = plan.positionLayers.filter(l => l.executed).length;
    return (executedLayers / totalLayers) * 100;
  };
  
  // 计算当前仓位
  const getCurrentPosition = () => {
    return plan.positionLayers
      .filter(l => l.executed)
      .reduce((sum, l) => sum + l.positionPercent, 0);
  };
  
  // 计算浮动盈亏
  const getUnrealizedPnL = () => {
    if (record.currentPosition === 0) return 0;
    return (currentPrice - record.averageEntryPrice) * record.currentPosition;
  };
  
  // 获取下一步执行建议
  const getNextAction = () => {
    // 检查是否有待执行的加仓
    const nextBuyLayer = plan.positionLayers
      .filter(l => !l.executed && currentPrice <= l.targetPrice)
      .sort((a, b) => b.targetPrice - a.targetPrice)[0];
    
    if (nextBuyLayer) {
      return {
        type: 'BUY',
        layer: nextBuyLayer,
        message: `建议加仓第${nextBuyLayer.layerIndex}层 (${nextBuyLayer.positionPercent}%)`
      };
    }
    
    // 检查是否有待执行的止盈
    const nextSellLayer = plan.takeProfitLayers
      .filter(l => !l.executed && currentPrice >= l.targetPrice)
      .sort((a, b) => a.targetPrice - b.targetPrice)[0];
    
    if (nextSellLayer) {
      return {
        type: 'SELL',
        layer: nextSellLayer,
        message: `建议止盈目标${nextSellLayer.layerIndex} (减仓${nextSellLayer.sellPercent}%)`
      };
    }
    
    return null;
  };
  
  // 执行交易
  const handleExecute = (layerId: string, type: 'BUY' | 'SELL') => {
    const deviation = Math.random() * 0.02 - 0.01; // 模拟执行偏差
    const actualPrice = currentPrice * (1 + deviation);
    onExecuteLayer(layerId, type, actualPrice);
  };
  
  const nextAction = getNextAction();
  const executionProgress = getExecutionProgress();
  const currentPosition = getCurrentPosition();
  const unrealizedPnL = getUnrealizedPnL();
  
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* 头部信息 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {plan.symbol} - {plan.symbolName}
          </h1>
          <p className="text-gray-600 mt-1">高级交易追踪 - 纪律执行监督</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-600">当前价格</p>
            <p className="text-2xl font-bold text-gray-900">¥{currentPrice.toFixed(2)}</p>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            返回
          </button>
        </div>
      </div>
      
      {/* 价格警告 */}
      {priceAlerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center mb-2">
              <Zap className="w-5 h-5 text-orange-500 mr-2" />
              <h3 className="font-semibold text-orange-800">价格触发提醒</h3>
            </div>
            <div className="space-y-1">
              {priceAlerts.map((alert, index) => (
                <p key={index} className="text-sm text-orange-700">{alert}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* 执行概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">执行进度</p>
                <p className="text-2xl font-bold text-blue-600">{executionProgress.toFixed(0)}%</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${executionProgress}%` }}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">当前仓位</p>
                <p className="text-2xl font-bold text-green-600">{currentPosition}%</p>
              </div>
              <Target className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              最大仓位: {plan.maxTotalPosition}%
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">浮动盈亏</p>
                <p className={`text-2xl font-bold ${unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {unrealizedPnL >= 0 ? '+' : ''}¥{unrealizedPnL.toFixed(2)}
                </p>
              </div>
              {unrealizedPnL >= 0 ? 
                <TrendingUp className="w-8 h-8 text-green-500" /> :
                <TrendingDown className="w-8 h-8 text-red-500" />
              }
            </div>
            <p className="text-xs text-gray-500 mt-1">
              盈亏比例: {record.currentPosition > 0 ? ((unrealizedPnL / record.totalInvested) * 100).toFixed(2) : '0.00'}%
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">纪律分</p>
                <p className="text-2xl font-bold text-purple-600">{plan.disciplineStatus.overallScore}</p>
              </div>
              <Shield className="w-8 h-8 text-purple-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              违规次数: {plan.disciplineStatus.violations.length}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* 下一步执行建议 */}
      {nextAction && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Activity className="w-5 h-5 text-blue-500 mr-2" />
                <div>
                  <h3 className="font-semibold text-blue-800">执行建议</h3>
                  <p className="text-sm text-blue-700">{nextAction.message}</p>
                </div>
              </div>
              <button
                onClick={() => handleExecute(nextAction.layer.id, nextAction.type)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                立即执行
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 分批执行状态 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 加仓层级状态 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
              加仓执行状态
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {plan.positionLayers.map((layer) => {
                const isTriggered = currentPrice <= layer.targetPrice;
                const deviation = layer.actualPrice ?
                  ((layer.actualPrice - layer.targetPrice) / layer.targetPrice) * 100 : 0;

                return (
                  <div key={layer.id} className={`p-3 rounded-lg border ${
                    layer.executed ? 'bg-green-50 border-green-200' :
                    isTriggered ? 'bg-yellow-50 border-yellow-200' :
                    'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {layer.executed ? (
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        ) : isTriggered ? (
                          <AlertTriangle className="w-4 h-4 text-yellow-500 mr-2" />
                        ) : (
                          <Clock className="w-4 h-4 text-gray-400 mr-2" />
                        )}
                        <span className="font-medium">第{layer.layerIndex}层</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          目标: ¥{layer.targetPrice} ({layer.positionPercent}%)
                        </p>
                        {layer.executed && layer.actualPrice && (
                          <p className={`text-xs ${deviation > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            实际: ¥{layer.actualPrice} ({deviation > 0 ? '+' : ''}{deviation.toFixed(2)}%)
                          </p>
                        )}
                      </div>
                    </div>
                    {isTriggered && !layer.executed && (
                      <div className="mt-2 flex justify-end">
                        <button
                          onClick={() => handleExecute(layer.id, 'BUY')}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                        >
                          执行加仓
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 止盈层级状态 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="w-5 h-5 mr-2 text-purple-500" />
              止盈执行状态
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {plan.takeProfitLayers.map((layer) => {
                const isTriggered = currentPrice >= layer.targetPrice;
                const deviation = layer.actualPrice ?
                  ((layer.actualPrice - layer.targetPrice) / layer.targetPrice) * 100 : 0;

                return (
                  <div key={layer.id} className={`p-3 rounded-lg border ${
                    layer.executed ? 'bg-purple-50 border-purple-200' :
                    isTriggered ? 'bg-yellow-50 border-yellow-200' :
                    'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {layer.executed ? (
                          <CheckCircle className="w-4 h-4 text-purple-500 mr-2" />
                        ) : isTriggered ? (
                          <AlertTriangle className="w-4 h-4 text-yellow-500 mr-2" />
                        ) : (
                          <Clock className="w-4 h-4 text-gray-400 mr-2" />
                        )}
                        <span className="font-medium">目标{layer.layerIndex}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          目标: ¥{layer.targetPrice} ({layer.sellPercent}%)
                        </p>
                        {layer.executed && layer.actualPrice && (
                          <p className={`text-xs ${deviation < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            实际: ¥{layer.actualPrice} ({deviation > 0 ? '+' : ''}{deviation.toFixed(2)}%)
                          </p>
                        )}
                      </div>
                    </div>
                    {isTriggered && !layer.executed && record.currentPosition > 0 && (
                      <div className="mt-2 flex justify-end">
                        <button
                          onClick={() => handleExecute(layer.id, 'SELL')}
                          className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
                        >
                          执行止盈
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 纪律违规记录 */}
      {plan.disciplineStatus.violations.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center text-red-700">
              <AlertTriangle className="w-5 h-5 mr-2" />
              纪律违规记录
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {plan.disciplineStatus.violations.map((violation) => (
                <div key={violation.id} className={`p-3 rounded-lg ${
                  violation.severity === 'HIGH' ? 'bg-red-50 border border-red-200' :
                  violation.severity === 'MEDIUM' ? 'bg-yellow-50 border border-yellow-200' :
                  'bg-gray-50 border border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{violation.description}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(violation.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      violation.severity === 'HIGH' ? 'bg-red-100 text-red-800' :
                      violation.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {violation.severity === 'HIGH' ? '严重' :
                       violation.severity === 'MEDIUM' ? '中等' : '轻微'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 执行历史 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="w-5 h-5 mr-2 text-indigo-500" />
            执行历史
          </CardTitle>
        </CardHeader>
        <CardContent>
          {record.executions.length > 0 ? (
            <div className="space-y-2">
              {record.executions.map((execution) => (
                <div key={execution.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    {execution.type === 'BUY' ? (
                      <TrendingUp className="w-4 h-4 text-green-500 mr-2" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500 mr-2" />
                    )}
                    <div>
                      <p className="font-medium">
                        {execution.type === 'BUY' ? '买入' : '卖出'}
                        {execution.quantity} 股
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(execution.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">¥{execution.price.toFixed(2)}</p>
                    <p className={`text-sm ${execution.deviation > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      偏差: {(execution.deviation * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Eye className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>暂无执行记录</p>
              <p className="text-sm">等待价格触发执行条件</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
