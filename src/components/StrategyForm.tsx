// 【知行交易】策略创建/编辑表单
// 支持创建基于技术分析模式的自定义策略

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { FundamentalCondition, PriceCondition, TradingType } from '@/types';
import { TechnicalCondition } from '@/types/strategy';
import { StockSelectionStrategy } from '@/types/analysis';
import {
  X,
  Plus,
  Save,
  TrendingUp,
  Target,
  BarChart3,
  Zap,
  Award,
  Settings,
  Info
} from 'lucide-react';

interface StrategyFormProps {
  strategy?: StockSelectionStrategy;
  onSave: (strategy: Omit<StockSelectionStrategy, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export function StrategyForm({ strategy, onSave, onCancel }: StrategyFormProps) {
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    tradingType: TradingType;
    technicalConditions: import('@/types/analysis').TechnicalCondition[];
    fundamentalConditions: FundamentalCondition[];
    priceConditions: PriceCondition[];
    conditions: {
      technical: import('@/types/analysis').TechnicalCondition[];
      fundamental: FundamentalCondition[];
      price: PriceCondition[];
    };
    parameters: {
      timeframe: string;
      volumeThreshold: number;
      priceChangeThreshold: number;
      entanglementDays: number;
      pullbackDays: number;
      stabilizationHours: number;
      emaLength: number;
      trendlineDays: number;
      confirmationPeriods: number;
      tolerancePercent: number;
    };
    markets: string[];
    industries: string[];
    marketCapRange?: [number, number];
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    maxResults: number;
    usageCount: number;
    avgSuccessRate?: number;
    lastRunAt?: Date;
    isActive: boolean;
    isDefault: boolean;
    isSystemDefault: boolean;
    tags: string[];
    notes?: string;
  }>({
    name: '',
    description: '',
    tradingType: TradingType.SWING,
    technicalConditions: [],
    fundamentalConditions: [],
    priceConditions: [],
    conditions: {
      technical: [],
      fundamental: [],
      price: []
    },
    parameters: {
      timeframe: '1d',
      volumeThreshold: 1.5,
      priceChangeThreshold: 2.0,
      entanglementDays: 10,
      pullbackDays: 3,
      stabilizationHours: 4,
      emaLength: 55,
      trendlineDays: 20,
      confirmationPeriods: 2,
      tolerancePercent: 3
    },
    markets: [],
    industries: [],
    sortBy: 'score',
    sortOrder: 'desc',
    maxResults: 50,
    usageCount: 0,
    isActive: true,
    isDefault: false,
    isSystemDefault: false,
    tags: []
  });

  // 预设的技术分析模式
  const technicalPatterns = [
    {
      id: 'ma_entanglement_breakthrough',
      name: '均线缠绕突破',
      description: '多条均线缠绕后向上突破，回踩不破均线',
      conditions: [
        {
          type: 'pattern' as const,
          parameter: 'ma_entanglement',
          operator: '=' as const,
          value: 1,
          description: '5日、10日、20日均线缠绕'
        },
        {
          type: 'moving_average' as const,
          parameter: 'ma_breakthrough',
          operator: 'cross_above' as const,
          value: 1,
          description: '价格向上突破均线束'
        },
        {
          type: 'pattern' as const,
          parameter: 'pullback_support',
          operator: '>=' as const,
          value: 0.98,
          description: '回踩不破均线支撑'
        }
      ]
    },
    {
      id: 'ema55_pullback',
      name: 'EMA55回踩企稳',
      description: '主升浪回踩EMA55不破，1小时级别企稳',
      conditions: [
        {
          type: 'indicator' as const,
          parameter: 'main_uptrend',
          operator: '>=' as const,
          value: 20,
          description: '前期主升浪涨幅超过20%'
        },
        {
          type: 'moving_average' as const,
          parameter: 'ema55_support',
          operator: '>=' as const,
          value: 0.97,
          description: '回踩EMA55不破'
        },
        {
          type: 'pattern' as const,
          parameter: 'hourly_stabilization',
          operator: '=' as const,
          value: 1,
          description: '1小时级别企稳'
        }
      ]
    },
    {
      id: 'trendline_breakthrough',
      name: '趋势线突破',
      description: '突破重要趋势线阻力，确认新上涨',
      conditions: [
        {
          type: 'pattern' as const,
          parameter: 'trendline_break',
          operator: '>' as const,
          value: 1.02,
          description: '突破趋势线2%以上'
        },
        {
          type: 'volume' as const,
          parameter: 'breakthrough_volume',
          operator: '>=' as const,
          value: 2.0,
          description: '突破时成交量放大2倍'
        }
      ]
    }
  ];

  const categoryOptions = [
    { value: 'breakthrough', label: '技术突破', icon: TrendingUp, color: 'blue' },
    { value: 'pullback', label: '回调买入', icon: Target, color: 'green' },
    { value: 'pattern', label: '形态策略', icon: BarChart3, color: 'purple' },
    { value: 'indicator', label: '指标策略', icon: Zap, color: 'orange' },
    { value: 'fundamental', label: '基本面策略', icon: Award, color: 'indigo' }
  ];

  const timeframeOptions = [
    { value: '1h', label: '1小时' },
    { value: '4h', label: '4小时' },
    { value: '1d', label: '日线' },
    { value: '1w', label: '周线' }
  ];

  useEffect(() => {
    if (strategy) {
      setFormData({
        name: strategy.name,
        description: strategy.description,
        tradingType: strategy.tradingType,
        technicalConditions: strategy.technicalConditions,
        fundamentalConditions: strategy.fundamentalConditions,
        priceConditions: strategy.priceConditions,
        conditions: strategy.conditions,
        parameters: {
          timeframe: strategy.parameters.timeframe,
          volumeThreshold: strategy.parameters.volumeThreshold,
          priceChangeThreshold: strategy.parameters.priceChangeThreshold,
          entanglementDays: strategy.parameters.entanglementDays || 5,
          pullbackDays: strategy.parameters.pullbackDays || 3,
          stabilizationHours: strategy.parameters.stabilizationHours || 2,
          emaLength: strategy.parameters.emaLength || 20,
          trendlineDays: strategy.parameters.trendlineDays || 10,
          confirmationPeriods: strategy.parameters.confirmationPeriods || 2,
          tolerancePercent: strategy.parameters.tolerancePercent || 2
        },
        markets: strategy.markets,
        industries: strategy.industries,
        marketCapRange: strategy.marketCapRange,
        sortBy: strategy.sortBy,
        sortOrder: strategy.sortOrder,
        maxResults: strategy.maxResults,
        usageCount: strategy.usageCount,
        isActive: strategy.isActive,
        isDefault: strategy.isDefault,
        isSystemDefault: strategy.isSystemDefault,
        tags: strategy.tags,
        notes: strategy.notes
      });
    }
  }, [strategy]);

  // 转换函数：将strategy.ts格式的TechnicalCondition转换为analysis.ts格式
  const convertTechnicalConditions = (conditions: TechnicalCondition[]): import('@/types/analysis').TechnicalCondition[] => {
    return conditions.map(condition => ({
      indicator: condition.parameter,
      operator: condition.operator,
      value: condition.value,
      timeframe: '1d', // 默认时间周期
      description: condition.description
    }));
  };

  const handleApplyPattern = (pattern: typeof technicalPatterns[0]) => {
    setFormData(prev => ({
      ...prev,
      name: pattern.name + '策略',
      description: pattern.description,
      tradingType: TradingType.SWING,
      conditions: {
        ...prev.conditions,
        technical: convertTechnicalConditions(pattern.conditions)
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      isSystemDefault: formData.isSystemDefault || false
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* 表单头部 */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">
              {strategy ? '编辑策略' : '创建策略'}
            </h2>
            <button
              type="button"
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* 基本信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Info className="w-5 h-5 mr-2 text-blue-500" />
                  基本信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    策略名称
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入策略名称，如：均线缠绕突破策略"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    策略描述
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="描述策略的核心逻辑和适用场景"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    交易类型
                  </label>
                  <select
                    value={formData.tradingType}
                    onChange={(e) => setFormData(prev => ({ ...prev, tradingType: e.target.value as TradingType }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={TradingType.SHORT_TERM}>短期投机</option>
                    <option value={TradingType.SWING}>波段交易</option>
                    <option value={TradingType.VALUE}>价值投资</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* 预设模式 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-purple-500" />
                  技术分析模式
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  选择一个预设的技术分析模式快速创建策略，或手动配置条件
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {technicalPatterns.map(pattern => (
                    <div
                      key={pattern.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer"
                      onClick={() => handleApplyPattern(pattern)}
                    >
                      <h4 className="font-medium text-gray-900 mb-2">{pattern.name}</h4>
                      <p className="text-sm text-gray-600 mb-3">{pattern.description}</p>
                      <button
                        type="button"
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        应用此模式
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 策略参数 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-orange-500" />
                  策略参数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      时间周期
                    </label>
                    <select
                      value={formData.parameters.timeframe}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        parameters: { ...prev.parameters, timeframe: e.target.value }
                      }))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {timeframeOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      成交量阈值
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.parameters.volumeThreshold}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        parameters: { ...prev.parameters, volumeThreshold: parseFloat(e.target.value) }
                      }))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      价格变化阈值(%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.parameters.priceChangeThreshold}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        parameters: { ...prev.parameters, priceChangeThreshold: parseFloat(e.target.value) }
                      }))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 表单底部 */}
            <div className="flex items-center justify-between pt-6 border-t">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  启用策略
                </label>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  保存策略
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
