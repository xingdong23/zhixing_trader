// 【知行交易】选股策略管理
// 策略定义、管理和手动筛选功能

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { apiGet, apiPost, API_ENDPOINTS, pollApi } from '@/utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { StockSelectionStrategy, Stock, StockSelectionResult } from '@/types';
// 创建/编辑功能已移除
import {
  Target,
  TrendingUp,
  BarChart3,
  Zap,
  Filter,
  Play,
  Pause,
  Edit3,
  Copy,
  Trash2,
  Plus,
  Search,
  Award,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface SelectionStrategiesProps {
  strategies: StockSelectionStrategy[];
  stocks: Stock[];
  onCreateStrategy: (strategy: Omit<StockSelectionStrategy, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateStrategy: (id: string, strategy: Partial<StockSelectionStrategy>) => void;
  onDeleteStrategy: (id: string) => void;
  onRunStrategy: (strategyId: string) => Promise<StockSelectionResult[]>;
}

export function SelectionStrategies({
  strategies,
  stocks,
  onCreateStrategy,
  onUpdateStrategy,
  onDeleteStrategy,
  onRunStrategy
}: SelectionStrategiesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  // 创建/编辑已禁用
  const [runningStrategy, setRunningStrategy] = useState<string | null>(null);
  const [strategyResults, setStrategyResults] = useState<Record<string, StockSelectionResult[]>>({});
  const [progressByStrategy, setProgressByStrategy] = useState<Record<string, { percent: number; current: string | null; state: string; }>>({});
  // 页面挂载后尝试恢复最近一次任务状态
  useEffect(() => {
    const restore = async () => {
      for (const s of strategies) {
        try {
          const res = await apiGet(`/strategies/exec/last-status?strategy_id=${s.id}`);
          if (!res.ok) continue;
          const data = await res.json();
          const st = data?.data;
          if (st && (st.state === 'running' || st.state === 'pending')) {
            setRunningStrategy(String(s.id));
            setProgressByStrategy(prev => ({ ...prev, [s.id]: { percent: st.percent ?? 0, current: st.current_symbol ?? null, state: st.state } }));
          }
        } catch {}
      }
    };
    restore();
  }, [strategies]);

  // 按类别分组策略
  const strategiesByCategory = useMemo(() => {
    const filtered = strategies.filter(strategy => {
      const matchesSearch = !searchTerm || 
        strategy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        strategy.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = !selectedCategory || strategy.tradingType === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });

    return filtered.reduce((acc, strategy) => {
      const category = strategy.tradingType;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(strategy);
      return acc;
    }, {} as Record<string, StockSelectionStrategy[]>);
  }, [strategies, searchTerm, selectedCategory]);

  // 策略统计
  const stats = useMemo(() => {
    const total = strategies.length;
    const active = strategies.filter(s => s.isActive).length;
    const systemDefault = strategies.filter(s => s.isSystemDefault).length;
    const custom = total - systemDefault;

    return { total, active, systemDefault, custom };
  }, [strategies]);

  // 交易类型选项
  const tradingTypeOptions = [
    { value: 'short_term', label: '短期投机', icon: TrendingUp, color: 'blue' },
    { value: 'swing', label: '波段交易', icon: Target, color: 'green' },
    { value: 'value', label: '价值投资', icon: Award, color: 'indigo' }
  ];

  const getTradingTypeInfo = (tradingType: string) => {
    return tradingTypeOptions.find(opt => opt.value === tradingType) || 
           { label: tradingType, icon: Filter, color: 'gray' };
  };

  const handleRunStrategy = async (strategy: StockSelectionStrategy) => {
    setRunningStrategy(strategy.id);
    try {
      // 1) 启动异步任务
      const resp = await apiPost(API_ENDPOINTS.STRATEGY_EXECUTE(strategy.id));
      const startData = await resp.json();
      const taskId = startData?.data?.task_id;
      if (!taskId) throw new Error('启动任务失败');

      // 2) 轮询任务状态并在按钮旁展示简单进度（标题）
      // 轮询任务状态并更新进度
      const status = await pollApi(`/strategies/exec/status?task_id=${taskId}`, { intervalMs: 1000, timeoutMs: 600000 });
      console.log('策略任务完成:', status);

      // 3) 任务完成后，拉取一次同步执行结果接口以获取结果（复用现有端点）
      const finishRes = await apiPost(API_ENDPOINTS.STRATEGY_EXECUTE_SYNC(strategy.id));
      const finishData = await finishRes.json();
      const results = finishData?.data || [];

      setStrategyResults(prev => ({ ...prev, [strategy.id]: results }));
    } catch (e) {
      console.error('运行策略失败:', e);
    } finally {
      setRunningStrategy(null);
      setProgressByStrategy(prev => ({ ...prev, [strategy.id]: { percent: 100, current: null, state: 'completed' } }));
    }
  };

  const handleToggleStrategy = (strategy: StockSelectionStrategy) => {
    onUpdateStrategy(strategy.id, { isActive: !strategy.isActive });
  };

  const handleEditStrategy = (_strategy: StockSelectionStrategy) => {};

  const handleCopyStrategy = (_strategy: StockSelectionStrategy) => {};

  const handleSaveStrategy = (_strategyData: Omit<StockSelectionStrategy, 'id' | 'createdAt' | 'updatedAt'>) => {};

  const handleCancelForm = () => {};

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">选股策略</h1>
          <p className="text-gray-600 mt-2">管理和运行您的选股策略，发现投资机会</p>
        </div>
        <div className="flex space-x-3" />
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">总策略数</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Filter className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">启用策略</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">系统预设</p>
                <p className="text-2xl font-bold text-purple-600">{stats.systemDefault}</p>
              </div>
              <Award className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">自定义策略</p>
                <p className="text-2xl font-bold text-orange-600">{stats.custom}</p>
              </div>
              <Edit3 className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="w-5 h-5 mr-2 text-gray-500" />
            筛选策略
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {/* 搜索框 */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="搜索策略名称或描述..."
                />
              </div>
            </div>

            {/* 交易类型筛选 */}
            <div className="md:w-64">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">所有类型</option>
                {tradingTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 清除筛选 */}
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('');
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              清除筛选
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 策略列表 */}
      <div className="space-y-6">
        {Object.keys(strategiesByCategory).length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">暂无匹配的策略</p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(strategiesByCategory).map(([tradingType, typeStrategies]) => {
            const typeInfo = getTradingTypeInfo(tradingType);
            const TypeIcon = typeInfo.icon;
            
            return (
              <Card key={tradingType}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TypeIcon className={`w-5 h-5 mr-2 text-${typeInfo.color}-500`} />
                    {typeInfo.label} ({typeStrategies.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {typeStrategies.map(strategy => (
                      <StrategyCard
                        key={strategy.id}
                        strategy={strategy}
                        isRunning={runningStrategy === strategy.id}
                        results={strategyResults[strategy.id]}
                        onRun={() => handleRunStrategy(strategy)}
                        onToggle={() => handleToggleStrategy(strategy)}
                        onEdit={() => handleEditStrategy(strategy)}
                        onCopy={() => handleCopyStrategy(strategy)}
                        onDelete={() => onDeleteStrategy(strategy.id)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* 创建/编辑已禁用 */}
    </div>
  );
}

// 策略卡片组件
function StrategyCard({
  strategy,
  isRunning,
  results,
  onRun,
  onToggle,
  onEdit,
  onCopy,
  onDelete
}: {
  strategy: StockSelectionStrategy;
  isRunning: boolean;
  results?: StockSelectionResult[];
  onRun: () => void;
  onToggle: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">{strategy.name}</h3>
            {strategy.isSystemDefault && (
              <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                系统
              </span>
            )}
            <div className="flex items-center">
              <button
                onClick={onToggle}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  strategy.isActive ? 'bg-green-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    strategy.isActive ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-3">{strategy.description}</p>

          {/* 策略条件摘要 */}
          <div className="space-y-1 text-xs text-gray-500">
            {strategy.conditions.technical.length > 0 && (
              <div>技术条件: {strategy.conditions.technical.length} 个</div>
            )}
            {strategy.conditions.fundamental.length > 0 && (
              <div>基本面条件: {strategy.conditions.fundamental.length} 个</div>
            )}
            {strategy.conditions.price.length > 0 && (
              <div>价格条件: {strategy.conditions.price.length} 个</div>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col space-y-2 ml-4">
          <button
            onClick={onRun}
            disabled={isRunning || !strategy.isActive}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              isRunning
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : strategy.isActive
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isRunning ? '运行中…' : '运行策略'}
          </button>

          {isRunning && (
            <div className="mt-2 text-xs text-gray-600">
              <div className="w-48 bg-gray-200 rounded h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 transition-all"
                  style={{ width: `${progressByStrategy[strategy.id]?.percent ?? 0}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between">
                <span>{progressByStrategy[strategy.id]?.percent ?? 0}%</span>
                <span className="truncate max-w-[8rem]" title={progressByStrategy[strategy.id]?.current ?? ''}>
                  {progressByStrategy[strategy.id]?.current ?? ''}
                </span>
              </div>
            </div>
          )}

          {/* 编辑/复制/删除入口关闭 */}
        </div>
      </div>

      {/* 运行结果 */}
      {results && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              选股结果 ({results.length} 只)
            </span>
            <span className="text-xs text-gray-500">
              {new Date().toLocaleTimeString()}
            </span>
          </div>

          {results.length === 0 ? (
            <p className="text-sm text-gray-500">暂无符合条件的股票</p>
          ) : (
            <div className="space-y-2">
              {results.slice(0, 3).map((result, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{result.stock.symbol}</span>
                    <span className="text-gray-600">{result.stock.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      result.confidence === 'high' ? 'bg-green-100 text-green-800' :
                      result.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {result.confidence === 'high' ? '高' :
                       result.confidence === 'medium' ? '中' : '低'}
                    </span>
                    <span className="text-gray-500">{result.score}/100</span>
                  </div>
                </div>
              ))}
              {results.length > 3 && (
                <p className="text-xs text-gray-500 text-center">
                  还有 {results.length - 3} 只股票...
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
