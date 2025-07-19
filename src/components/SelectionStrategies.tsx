// 【知行交易】选股策略管理
// 策略定义、管理和手动筛选功能

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { SelectionStrategy, Stock, SelectedStock } from '@/types';
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
  strategies: SelectionStrategy[];
  stocks: Stock[];
  onCreateStrategy: (strategy: Omit<SelectionStrategy, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateStrategy: (id: string, strategy: Partial<SelectionStrategy>) => void;
  onDeleteStrategy: (id: string) => void;
  onRunStrategy: (strategyId: string) => SelectedStock[];
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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<SelectionStrategy | null>(null);
  const [runningStrategy, setRunningStrategy] = useState<string | null>(null);
  const [strategyResults, setStrategyResults] = useState<Record<string, SelectedStock[]>>({});

  // 按类别分组策略
  const strategiesByCategory = useMemo(() => {
    const filtered = strategies.filter(strategy => {
      const matchesSearch = !searchTerm || 
        strategy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        strategy.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = !selectedCategory || strategy.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });

    return filtered.reduce((acc, strategy) => {
      const category = strategy.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(strategy);
      return acc;
    }, {} as Record<string, SelectionStrategy[]>);
  }, [strategies, searchTerm, selectedCategory]);

  // 策略统计
  const stats = useMemo(() => {
    const total = strategies.length;
    const active = strategies.filter(s => s.isActive).length;
    const systemDefault = strategies.filter(s => s.isSystemDefault).length;
    const custom = total - systemDefault;

    return { total, active, systemDefault, custom };
  }, [strategies]);

  // 类别选项
  const categoryOptions = [
    { value: 'breakthrough', label: '技术突破', icon: TrendingUp, color: 'blue' },
    { value: 'pullback', label: '回调买入', icon: Target, color: 'green' },
    { value: 'pattern', label: '形态策略', icon: BarChart3, color: 'purple' },
    { value: 'indicator', label: '指标策略', icon: Zap, color: 'orange' },
    { value: 'fundamental', label: '基本面策略', icon: Award, color: 'indigo' }
  ];

  const getCategoryInfo = (category: string) => {
    return categoryOptions.find(opt => opt.value === category) || 
           { label: category, icon: Filter, color: 'gray' };
  };

  const handleRunStrategy = async (strategy: SelectionStrategy) => {
    setRunningStrategy(strategy.id);
    try {
      // 模拟策略运行（实际应用中这里会调用真实的选股算法）
      await new Promise(resolve => setTimeout(resolve, 1000));
      const results = onRunStrategy(strategy.id);
      setStrategyResults(prev => ({
        ...prev,
        [strategy.id]: results
      }));
    } finally {
      setRunningStrategy(null);
    }
  };

  const handleToggleStrategy = (strategy: SelectionStrategy) => {
    onUpdateStrategy(strategy.id, { isActive: !strategy.isActive });
  };

  const handleEditStrategy = (strategy: SelectionStrategy) => {
    setEditingStrategy(strategy);
    setShowCreateForm(true);
  };

  const handleCopyStrategy = (strategy: SelectionStrategy) => {
    const copy = {
      ...strategy,
      name: `${strategy.name} (副本)`,
      isSystemDefault: false
    };
    delete (copy as any).id;
    delete (copy as any).createdAt;
    delete (copy as any).updatedAt;
    onCreateStrategy(copy);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">选股策略</h1>
          <p className="text-gray-600 mt-2">管理和运行您的选股策略，发现投资机会</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            创建策略
          </button>
        </div>
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

            {/* 类别筛选 */}
            <div className="md:w-64">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">所有类别</option>
                {categoryOptions.map(option => (
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
              <button
                onClick={() => setShowCreateForm(true)}
                className="text-blue-600 hover:text-blue-700"
              >
                创建第一个策略
              </button>
            </CardContent>
          </Card>
        ) : (
          Object.entries(strategiesByCategory).map(([category, categoryStrategies]) => {
            const categoryInfo = getCategoryInfo(category);
            const CategoryIcon = categoryInfo.icon;
            
            return (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CategoryIcon className={`w-5 h-5 mr-2 text-${categoryInfo.color}-500`} />
                    {categoryInfo.label} ({categoryStrategies.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {categoryStrategies.map(strategy => (
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
  strategy: SelectionStrategy;
  isRunning: boolean;
  results?: SelectedStock[];
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
            {isRunning ? '运行中...' : '运行策略'}
          </button>

          <div className="flex space-x-1">
            <button
              onClick={onEdit}
              className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="编辑"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={onCopy}
              className="p-1 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
              title="复制"
            >
              <Copy className="w-4 h-4" />
            </button>
            {!strategy.isSystemDefault && (
              <button
                onClick={onDelete}
                className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="删除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
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
