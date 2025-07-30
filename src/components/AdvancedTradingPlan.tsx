// 【知行交易】高级交易计划 - 支持分批加仓、滚动止盈等复杂策略
// 实现专业级的交易计划制定和严格的纪律监督

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  TradingPlan,
  PositionLayer,
  TakeProfitLayer,
  TradingEmotion,
  InformationSource,
  DisciplineStatus,
  DisciplineViolation,
  TradeStatus
} from '@/types/index';
import { 
  Plus, 
  Minus, 
  Target, 
  Shield, 
  TrendingUp, 
  AlertTriangle,
  Lock,
  Eye,
  Calculator,
  BarChart3
} from 'lucide-react';

interface AdvancedTradingPlanProps {
  onSave: (plan: Omit<TradingPlan, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export function AdvancedTradingPlan({ onSave, onCancel }: AdvancedTradingPlanProps) {
  // 基础信息
  const [symbol, setSymbol] = useState('');
  const [symbolName, setSymbolName] = useState('');
  const [strategyType, setStrategyType] = useState<'SINGLE_ENTRY' | 'PYRAMID_ENTRY' | 'GRID_TRADING'>('PYRAMID_ENTRY');
  
  // 分批加仓层级
  const [positionLayers, setPositionLayers] = useState<PositionLayer[]>([
    { id: '1', layerIndex: 1, targetPrice: 0, positionPercent: 100, executed: false }
  ]);
  
  // 分批止盈层级
  const [takeProfitLayers, setTakeProfitLayers] = useState<TakeProfitLayer[]>([
    { id: '1', layerIndex: 1, targetPrice: 0, sellPercent: 100, executed: false }
  ]);
  
  // 风险管理
  const [globalStopLoss, setGlobalStopLoss] = useState(0);
  const [maxLossPercent, setMaxLossPercent] = useState(10);
  const [trailingStopEnabled, setTrailingStopEnabled] = useState(false);
  const [trailingStopPercent, setTrailingStopPercent] = useState(5);
  
  // 买入逻辑
  const [buyingLogic, setBuyingLogic] = useState({
    technical: '',
    fundamental: '',
    news: ''
  });
  
  // 心理状态
  const [emotion, setEmotion] = useState<TradingEmotion>(TradingEmotion.CALM);
  const [informationSource, setInformationSource] = useState<InformationSource>(InformationSource.SELF_ANALYSIS);
  const [disciplineLocked, setDisciplineLocked] = useState(false);
  
  // 计算总仓位
  const totalPosition = positionLayers.reduce((sum, layer) => sum + layer.positionPercent, 0);
  
  // 处理策略类型变化
  const handleStrategyTypeChange = (newType: 'SINGLE_ENTRY' | 'PYRAMID_ENTRY' | 'GRID_TRADING') => {
    setStrategyType(newType);

    if (newType === 'SINGLE_ENTRY') {
      // 一次性建仓：只保留一个层级，仓位100%
      setPositionLayers([
        { id: '1', layerIndex: 1, targetPrice: 0, positionPercent: 100, executed: false }
      ]);
      // 一次性止盈：只保留一个层级，止盈100%
      setTakeProfitLayers([
        { id: '1', layerIndex: 1, targetPrice: 0, sellPercent: 100, executed: false }
      ]);
    } else if (newType === 'PYRAMID_ENTRY') {
      // 金字塔式加仓：默认3个层级
      setPositionLayers([
        { id: '1', layerIndex: 1, targetPrice: 0, positionPercent: 20, executed: false },
        { id: '2', layerIndex: 2, targetPrice: 0, positionPercent: 20, executed: false },
        { id: '3', layerIndex: 3, targetPrice: 0, positionPercent: 20, executed: false }
      ]);
      // 分批止盈：默认3个层级
      setTakeProfitLayers([
        { id: '1', layerIndex: 1, targetPrice: 0, sellPercent: 30, executed: false },
        { id: '2', layerIndex: 2, targetPrice: 0, sellPercent: 40, executed: false },
        { id: '3', layerIndex: 3, targetPrice: 0, sellPercent: 30, executed: false }
      ]);
    } else if (newType === 'GRID_TRADING') {
      // 网格交易：默认5个层级
      setPositionLayers([
        { id: '1', layerIndex: 1, targetPrice: 0, positionPercent: 10, executed: false },
        { id: '2', layerIndex: 2, targetPrice: 0, positionPercent: 10, executed: false },
        { id: '3', layerIndex: 3, targetPrice: 0, positionPercent: 10, executed: false },
        { id: '4', layerIndex: 4, targetPrice: 0, positionPercent: 10, executed: false },
        { id: '5', layerIndex: 5, targetPrice: 0, positionPercent: 10, executed: false }
      ]);
      // 网格止盈：默认5个层级
      setTakeProfitLayers([
        { id: '1', layerIndex: 1, targetPrice: 0, sellPercent: 20, executed: false },
        { id: '2', layerIndex: 2, targetPrice: 0, sellPercent: 20, executed: false },
        { id: '3', layerIndex: 3, targetPrice: 0, sellPercent: 20, executed: false },
        { id: '4', layerIndex: 4, targetPrice: 0, sellPercent: 20, executed: false },
        { id: '5', layerIndex: 5, targetPrice: 0, sellPercent: 20, executed: false }
      ]);
    }
  };

  // 计算风险收益比
  const calculateRiskReward = () => {
    if (positionLayers.length === 0 || takeProfitLayers.length === 0 || globalStopLoss === 0) return 0;

    const avgEntryPrice = positionLayers.reduce((sum, layer) => sum + layer.targetPrice, 0) / positionLayers.length;
    const avgTakeProfit = takeProfitLayers.reduce((sum, layer) => sum + layer.targetPrice, 0) / takeProfitLayers.length;

    const potentialGain = avgTakeProfit - avgEntryPrice;
    const potentialLoss = avgEntryPrice - globalStopLoss;

    return potentialLoss > 0 ? potentialGain / potentialLoss : 0;
  };
  
  // 添加加仓层级
  const addPositionLayer = () => {
    const newLayer: PositionLayer = {
      id: Date.now().toString(),
      layerIndex: positionLayers.length + 1,
      targetPrice: 0,
      positionPercent: 10,
      executed: false
    };
    setPositionLayers([...positionLayers, newLayer]);
  };
  
  // 删除加仓层级
  const removePositionLayer = (id: string) => {
    if (positionLayers.length > 1) {
      setPositionLayers(positionLayers.filter(layer => layer.id !== id));
    }
  };
  
  // 更新加仓层级
  const updatePositionLayer = (id: string, field: keyof PositionLayer, value: any) => {
    setPositionLayers(positionLayers.map(layer => 
      layer.id === id ? { ...layer, [field]: value } : layer
    ));
  };
  
  // 添加止盈层级
  const addTakeProfitLayer = () => {
    const newLayer: TakeProfitLayer = {
      id: Date.now().toString(),
      layerIndex: takeProfitLayers.length + 1,
      targetPrice: 0,
      sellPercent: 20,
      executed: false
    };
    setTakeProfitLayers([...takeProfitLayers, newLayer]);
  };
  
  // 删除止盈层级
  const removeTakeProfitLayer = (id: string) => {
    if (takeProfitLayers.length > 1) {
      setTakeProfitLayers(takeProfitLayers.filter(layer => layer.id !== id));
    }
  };
  
  // 更新止盈层级
  const updateTakeProfitLayer = (id: string, field: keyof TakeProfitLayer, value: any) => {
    setTakeProfitLayers(takeProfitLayers.map(layer => 
      layer.id === id ? { ...layer, [field]: value } : layer
    ));
  };
  
  // 保存计划
  const handleSave = () => {
    const disciplineStatus: DisciplineStatus = {
      overallScore: 100,
      entryDiscipline: 100,
      exitDiscipline: 100,
      positionDiscipline: 100,
      violations: [],
      lastUpdated: new Date()
    };
    
    const plan: Omit<TradingPlan, 'id' | 'createdAt' | 'updatedAt'> = {
      symbol,
      symbolName,
      strategyType,
      positionLayers,
      maxTotalPosition: totalPosition,
      takeProfitLayers,
      trailingStopEnabled,
      trailingStopPercent: trailingStopEnabled ? trailingStopPercent : undefined,
      globalStopLoss,
      maxLossPercent,
      riskRewardRatio: calculateRiskReward(),
      buyingLogic,
      emotion,
      informationSource,
      disciplineLocked,
      disciplineStatus,
      planQualityScore: 85, // 临时评分，后续可以实现自动评分
      status: TradeStatus.PLANNING
    };
    
    onSave(plan);
  };
  
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">高级交易计划</h1>
          <p className="text-gray-600 mt-2">制定专业的分批加仓和滚动止盈策略</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!symbol || positionLayers.some(l => l.targetPrice === 0)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            保存计划
          </button>
        </div>
      </div>
      
      {/* 基础信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="w-5 h-5 mr-2 text-blue-500" />
            基础信息
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">股票代码</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="如：AAPL"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">股票名称</label>
              <input
                type="text"
                value={symbolName}
                onChange={(e) => setSymbolName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="如：苹果公司"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">策略类型</label>
              <select
                value={strategyType}
                onChange={(e) => handleStrategyTypeChange(e.target.value as any)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="SINGLE_ENTRY">一次性建仓</option>
                <option value="PYRAMID_ENTRY">金字塔式加仓</option>
                <option value="GRID_TRADING">网格交易</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 建仓策略设置 */}
      {strategyType === 'SINGLE_ENTRY' ? (
        // 一次性建仓
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
              一次性建仓设置
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">买入价格</label>
                <input
                  type="number"
                  step="0.01"
                  value={positionLayers[0]?.targetPrice || ''}
                  onChange={(e) => updatePositionLayer(positionLayers[0]?.id, 'targetPrice', parseFloat(e.target.value) || 0)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="目标买入价格"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">仓位比例</label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="100"
                    value={positionLayers[0]?.positionPercent || ''}
                    onChange={(e) => updatePositionLayer(positionLayers[0]?.id, 'positionPercent', parseInt(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
                    placeholder="仓位比例"
                  />
                  <span className="absolute right-3 top-3 text-gray-500">%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        // 分批加仓策略
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
                分批加仓策略
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">总仓位: {totalPosition}%</span>
                <button
                  onClick={addPositionLayer}
                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                  title="添加加仓层级"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {positionLayers.map((layer, index) => (
                <div key={layer.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700 w-16">第{layer.layerIndex}层</span>
                  <div className="flex-1">
                    <input
                      type="number"
                      step="0.01"
                      value={layer.targetPrice || ''}
                      onChange={(e) => updatePositionLayer(layer.id, 'targetPrice', parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="目标价格"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="100"
                      value={layer.positionPercent || ''}
                      onChange={(e) => updatePositionLayer(layer.id, 'positionPercent', parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="仓位%"
                    />
                  </div>
                  {positionLayers.length > 1 && (
                    <button
                      onClick={() => removePositionLayer(layer.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="删除此层级"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {totalPosition > 100 && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />
                  <span className="text-sm text-red-700">警告：总仓位超过100%，请调整各层级比例</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 止盈策略设置 */}
      {strategyType === 'SINGLE_ENTRY' ? (
        // 一次性止盈
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="w-5 h-5 mr-2 text-purple-500" />
              止盈策略设置
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">止盈价格</label>
                <input
                  type="number"
                  step="0.01"
                  value={takeProfitLayers[0]?.targetPrice || ''}
                  onChange={(e) => updateTakeProfitLayer(takeProfitLayers[0]?.id, 'targetPrice', parseFloat(e.target.value) || 0)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="目标止盈价格"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">止盈比例</label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="100"
                    value={takeProfitLayers[0]?.sellPercent || ''}
                    onChange={(e) => updateTakeProfitLayer(takeProfitLayers[0]?.id, 'sellPercent', parseInt(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-8"
                    placeholder="止盈比例"
                  />
                  <span className="absolute right-3 top-3 text-gray-500">%</span>
                </div>
              </div>
            </div>

            {/* 移动止损设置 */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={trailingStopEnabled}
                    onChange={(e) => setTrailingStopEnabled(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">启用移动止损</span>
                </label>
                {trailingStopEnabled && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">回撤比例:</span>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="20"
                      value={trailingStopPercent || ''}
                      onChange={(e) => setTrailingStopPercent(parseFloat(e.target.value) || 5)}
                      className="w-16 p-1 border border-gray-300 rounded text-center"
                    />
                    <span className="text-sm text-gray-600">%</span>
                  </div>
                )}
              </div>
              {trailingStopEnabled && (
                <p className="text-xs text-gray-500">
                  移动止损将在价格上涨时自动调整止损位，保护已获得的利润
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        // 分批止盈策略
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Target className="w-5 h-5 mr-2 text-purple-500" />
                分批止盈策略
              </div>
              <button
                onClick={addTakeProfitLayer}
                className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                title="添加止盈层级"
              >
                <Plus className="w-4 h-4" />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {takeProfitLayers.map((layer, index) => (
                <div key={layer.id} className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700 w-16">目标{layer.layerIndex}</span>
                  <div className="flex-1">
                    <input
                      type="number"
                      step="0.01"
                      value={layer.targetPrice || ''}
                      onChange={(e) => updateTakeProfitLayer(layer.id, 'targetPrice', parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="止盈价格"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="100"
                      value={layer.sellPercent || ''}
                      onChange={(e) => updateTakeProfitLayer(layer.id, 'sellPercent', parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="减仓%"
                    />
                  </div>
                  {takeProfitLayers.length > 1 && (
                    <button
                      onClick={() => removeTakeProfitLayer(layer.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="删除此层级"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* 移动止损设置 */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={trailingStopEnabled}
                    onChange={(e) => setTrailingStopEnabled(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">启用移动止损</span>
                </label>
                {trailingStopEnabled && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">回撤比例:</span>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="20"
                      value={trailingStopPercent || ''}
                      onChange={(e) => setTrailingStopPercent(parseFloat(e.target.value) || 5)}
                      className="w-16 p-1 border border-gray-300 rounded text-center"
                    />
                    <span className="text-sm text-gray-600">%</span>
                  </div>
                )}
              </div>
              {trailingStopEnabled && (
                <p className="text-xs text-gray-500">
                  移动止损将在价格上涨时自动调整止损位，保护已获得的利润
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 风险管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2 text-red-500" />
            风险管理
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">全局止损价</label>
              <input
                type="number"
                step="0.01"
                value={globalStopLoss || ''}
                onChange={(e) => setGlobalStopLoss(parseFloat(e.target.value) || 0)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="最低止损价格"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">最大亏损比例</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="50"
                  value={maxLossPercent || ''}
                  onChange={(e) => setMaxLossPercent(parseFloat(e.target.value) || 10)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent pr-8"
                  placeholder="10"
                />
                <span className="absolute right-3 top-3 text-gray-500">%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">风险收益比</label>
              <div className="p-3 bg-gray-100 rounded-lg">
                <span className="text-lg font-semibold text-gray-900">
                  {calculateRiskReward().toFixed(2)}:1
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  {calculateRiskReward() >= 2 ? '优秀' : calculateRiskReward() >= 1.5 ? '良好' : '需改进'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 买入逻辑 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="w-5 h-5 mr-2 text-indigo-500" />
            买入逻辑
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">技术面分析</label>
              <textarea
                value={buyingLogic.technical}
                onChange={(e) => setBuyingLogic({...buyingLogic, technical: e.target.value})}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="描述技术指标、图表形态、支撑阻力等..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">基本面分析</label>
              <textarea
                value={buyingLogic.fundamental}
                onChange={(e) => setBuyingLogic({...buyingLogic, fundamental: e.target.value})}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="描述财务状况、行业前景、估值水平等..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">消息面分析</label>
              <textarea
                value={buyingLogic.news}
                onChange={(e) => setBuyingLogic({...buyingLogic, news: e.target.value})}
                rows={2}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="描述相关新闻、政策影响、市场情绪等..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 心理状态与纪律 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lock className="w-5 h-5 mr-2 text-orange-500" />
            心理状态与纪律
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">当前情绪</label>
              <select
                value={emotion}
                onChange={(e) => setEmotion(e.target.value as TradingEmotion)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value={TradingEmotion.CALM}>冷静</option>
                <option value={TradingEmotion.CONFIDENT}>自信</option>
                <option value={TradingEmotion.UNCERTAIN}>不确定</option>
                <option value={TradingEmotion.FEAR}>恐惧</option>
                <option value={TradingEmotion.GREED}>贪婪</option>
                <option value={TradingEmotion.FOMO}>FOMO</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">信息来源</label>
              <select
                value={informationSource}
                onChange={(e) => setInformationSource(e.target.value as InformationSource)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value={InformationSource.SELF_ANALYSIS}>自主研究</option>
                <option value={InformationSource.PROFESSIONAL_REPORT}>专业报告</option>
                <option value={InformationSource.NEWS_MEDIA}>新闻媒体</option>
                <option value={InformationSource.SOCIAL_MEDIA}>社交媒体</option>
                <option value={InformationSource.FRIEND_RECOMMEND}>朋友推荐</option>
                <option value={InformationSource.TECHNICAL_SIGNAL}>技术信号</option>
              </select>
            </div>
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={disciplineLocked}
                  onChange={(e) => setDisciplineLocked(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">启用纪律锁定</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                锁定后将无法随意修改计划，确保严格执行
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
