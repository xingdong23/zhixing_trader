// 【知行交易】股票池管理
// 股票收集、标签管理、筛选功能的核心组件

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Stock, StockPoolStats } from '@/types';
import { industryTags, fundamentalTags } from '@/data/sampleStocks';
import {
  Plus,
  Search,
  Filter,
  Edit3,
  Trash2,
  Tag,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Star,
  StarOff,
  Download,
  Upload
} from 'lucide-react';

interface StockPoolProps {
  stocks: Stock[];
  onAddStock: (stock: Omit<Stock, 'id' | 'addedAt' | 'updatedAt'>) => void;
  onUpdateStock: (id: string, stock: Partial<Stock>) => void;
  onDeleteStock: (id: string) => void;
  onSelectStock: (stock: Stock) => void; // 选中股票用于制定交易计划
}

export function StockPool({ 
  stocks, 
  onAddStock, 
  onUpdateStock, 
  onDeleteStock,
  onSelectStock 
}: StockPoolProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [selectedFundamental, setSelectedFundamental] = useState<string>('');
  const [selectedMarket, setSelectedMarket] = useState<string>('');
  const [selectedWatchLevel, setSelectedWatchLevel] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);

  // 计算统计数据
  const stats: StockPoolStats = useMemo(() => {
    const byMarket = stocks.reduce((acc, stock) => {
      acc[stock.market] = (acc[stock.market] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byIndustry = stocks.reduce((acc, stock) => {
      stock.tags.industry.forEach(industry => {
        acc[industry] = (acc[industry] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const byWatchLevel = stocks.reduce((acc, stock) => {
      acc[stock.watchLevel] = (acc[stock.watchLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentlyAdded = stocks.filter(stock => stock.addedAt > sevenDaysAgo).length;

    return {
      totalStocks: stocks.length,
      byMarket,
      byIndustry,
      byWatchLevel,
      recentlyAdded,
      lastUpdated: new Date()
    };
  }, [stocks]);

  // 筛选股票
  const filteredStocks = useMemo(() => {
    return stocks.filter(stock => {
      const matchesSearch = !searchTerm || 
        stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesIndustry = !selectedIndustry || 
        stock.tags.industry.includes(selectedIndustry);
      
      const matchesFundamental = !selectedFundamental || 
        stock.tags.fundamentals.includes(selectedFundamental);
      
      const matchesMarket = !selectedMarket || stock.market === selectedMarket;
      
      const matchesWatchLevel = !selectedWatchLevel || 
        stock.watchLevel === selectedWatchLevel;

      return matchesSearch && matchesIndustry && matchesFundamental && 
             matchesMarket && matchesWatchLevel;
    });
  }, [stocks, searchTerm, selectedIndustry, selectedFundamental, selectedMarket, selectedWatchLevel]);

  // 获取所有已使用的行业标签
  const usedIndustryTags = useMemo(() => {
    const tags = new Set<string>();
    stocks.forEach(stock => {
      stock.tags.industry.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [stocks]);

  // 获取所有已使用的基本面标签
  const usedFundamentalTags = useMemo(() => {
    const tags = new Set<string>();
    stocks.forEach(stock => {
      stock.tags.fundamentals.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [stocks]);

  const handleAddStock = (stockData: Omit<Stock, 'id' | 'addedAt' | 'updatedAt'>) => {
    onAddStock(stockData);
    setShowAddForm(false);
  };

  const handleEditStock = (stock: Stock) => {
    setEditingStock(stock);
    setShowAddForm(true);
  };

  const handleUpdateStock = (stockData: Omit<Stock, 'id' | 'addedAt' | 'updatedAt'>) => {
    if (editingStock) {
      onUpdateStock(editingStock.id, stockData);
      setEditingStock(null);
      setShowAddForm(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedIndustry('');
    setSelectedFundamental('');
    setSelectedMarket('');
    setSelectedWatchLevel('');
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">股票池管理</h1>
          <p className="text-gray-600 mt-2">收集和管理您关注的股票，为选股策略提供基础</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            添加股票
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">总股票数</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalStocks}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">重点关注</p>
                <p className="text-2xl font-bold text-orange-600">{stats.byWatchLevel.high || 0}</p>
              </div>
              <Star className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">美股</p>
                <p className="text-2xl font-bold text-green-600">{stats.byMarket.US || 0}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">最近添加</p>
                <p className="text-2xl font-bold text-purple-600">{stats.recentlyAdded}</p>
              </div>
              <Plus className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2 text-gray-500" />
            筛选条件
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* 搜索框 */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="搜索股票代码或名称..."
                />
              </div>
            </div>

            {/* 行业筛选 */}
            <div>
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">所有行业</option>
                {usedIndustryTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>

            {/* 基本面筛选 */}
            <div>
              <select
                value={selectedFundamental}
                onChange={(e) => setSelectedFundamental(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">所有基本面</option>
                {usedFundamentalTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>

            {/* 市场筛选 */}
            <div>
              <select
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">所有市场</option>
                <option value="US">美股</option>
                <option value="HK">港股</option>
                <option value="CN">A股</option>
              </select>
            </div>

            {/* 关注程度筛选 */}
            <div>
              <select
                value={selectedWatchLevel}
                onChange={(e) => setSelectedWatchLevel(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">所有关注度</option>
                <option value="high">重点关注</option>
                <option value="medium">一般关注</option>
                <option value="low">观察中</option>
              </select>
            </div>

            {/* 清除筛选 */}
            <div>
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                清除筛选
              </button>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            显示 {filteredStocks.length} / {stats.totalStocks} 只股票
          </div>
        </CardContent>
      </Card>

      {/* 股票列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>股票列表</span>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>共 {filteredStocks.length} 只</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredStocks.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">暂无股票数据</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  添加第一只股票
                </button>
              </div>
            ) : (
              filteredStocks.map((stock) => (
                <StockCard
                  key={stock.id}
                  stock={stock}
                  onEdit={() => handleEditStock(stock)}
                  onDelete={() => onDeleteStock(stock.id)}
                  onSelect={() => onSelectStock(stock)}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 添加/编辑股票表单 */}
      {showAddForm && (
        <StockForm
          stock={editingStock}
          onSave={editingStock ? handleUpdateStock : handleAddStock}
          onCancel={() => {
            setShowAddForm(false);
            setEditingStock(null);
          }}
        />
      )}
    </div>
  );
}

// 股票卡片组件
function StockCard({
  stock,
  onEdit,
  onDelete,
  onSelect
}: {
  stock: Stock;
  onEdit: () => void;
  onDelete: () => void;
  onSelect: () => void;
}) {
  const getWatchLevelIcon = (level: string) => {
    switch (level) {
      case 'high': return <Star className="w-4 h-4 text-orange-500 fill-current" />;
      case 'medium': return <Star className="w-4 h-4 text-gray-400" />;
      case 'low': return <StarOff className="w-4 h-4 text-gray-300" />;
      default: return null;
    }
  };

  const getMarketFlag = (market: string) => {
    switch (market) {
      case 'US': return '🇺🇸';
      case 'HK': return '🇭🇰';
      case 'CN': return '🇨🇳';
      default: return '🌐';
    }
  };

  const getPriceChangeColor = (change?: number) => {
    if (!change) return 'text-gray-500';
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getPriceChangeIcon = (change?: number) => {
    if (!change) return null;
    return change >= 0 ?
      <TrendingUp className="w-4 h-4" /> :
      <TrendingDown className="w-4 h-4" />;
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        {/* 左侧：股票信息 */}
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <span className="text-lg">{getMarketFlag(stock.market)}</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {stock.symbol}
              </h3>
              <p className="text-sm text-gray-600">{stock.name}</p>
            </div>
            {getWatchLevelIcon(stock.watchLevel)}
          </div>

          {/* 价格信息 */}
          {stock.currentPrice && (
            <div className="flex items-center space-x-4 mb-3">
              <span className="text-xl font-bold text-gray-900">
                ${stock.currentPrice.toFixed(2)}
              </span>
              {stock.priceChange && (
                <div className={`flex items-center space-x-1 ${getPriceChangeColor(stock.priceChange)}`}>
                  {getPriceChangeIcon(stock.priceChange)}
                  <span className="font-medium">
                    {stock.priceChange > 0 ? '+' : ''}{stock.priceChange.toFixed(2)}
                  </span>
                  {stock.priceChangePercent && (
                    <span className="text-sm">
                      ({stock.priceChangePercent > 0 ? '+' : ''}{stock.priceChangePercent.toFixed(2)}%)
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 标签 */}
          <div className="space-y-2">
            {/* 行业标签 */}
            <div className="flex flex-wrap gap-1">
              {stock.tags.industry.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* 基本面标签 */}
            <div className="flex flex-wrap gap-1">
              {stock.tags.fundamentals.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* 备注 */}
          {stock.notes && (
            <p className="text-sm text-gray-600 mt-2 italic">
              {stock.notes}
            </p>
          )}
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex flex-col space-y-2 ml-4">
          <button
            onClick={onSelect}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            制定计划
          </button>
          <button
            onClick={onEdit}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="编辑"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// 股票表单组件
function StockForm({
  stock,
  onSave,
  onCancel
}: {
  stock?: Stock | null;
  onSave: (stock: Omit<Stock, 'id' | 'addedAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    symbol: stock?.symbol || '',
    name: stock?.name || '',
    market: stock?.market || 'US' as const,
    tags: {
      industry: stock?.tags.industry || [],
      fundamentals: stock?.tags.fundamentals || [],
      marketCap: stock?.tags.marketCap || 'mid' as const,
      watchLevel: stock?.tags.watchLevel || 'medium' as const
    },
    currentPrice: stock?.currentPrice || 0,
    notes: stock?.notes || ''
  });

  const [newIndustryTag, setNewIndustryTag] = useState('');
  const [newFundamentalTag, setNewFundamentalTag] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.symbol || !formData.name) return;

    onSave({
      symbol: formData.symbol.toUpperCase(),
      name: formData.name,
      market: formData.market,
      tags: formData.tags,
      currentPrice: formData.currentPrice || undefined,
      notes: formData.notes || undefined
    });
  };

  const addIndustryTag = (tag: string) => {
    if (tag && !formData.tags.industry.includes(tag)) {
      setFormData({
        ...formData,
        tags: {
          ...formData.tags,
          industry: [...formData.tags.industry, tag]
        }
      });
    }
  };

  const removeIndustryTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: {
        ...formData.tags,
        industry: formData.tags.industry.filter(t => t !== tag)
      }
    });
  };

  const addFundamentalTag = (tag: string) => {
    if (tag && !formData.tags.fundamentals.includes(tag)) {
      setFormData({
        ...formData,
        tags: {
          ...formData.tags,
          fundamentals: [...formData.tags.fundamentals, tag]
        }
      });
    }
  };

  const removeFundamentalTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: {
        ...formData.tags,
        fundamentals: formData.tags.fundamentals.filter(t => t !== tag)
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {stock ? '编辑股票' : '添加股票'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 基础信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                股票代码 *
              </label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="如：AAPL"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                股票名称 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="如：苹果公司"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                市场
              </label>
              <select
                value={formData.market}
                onChange={(e) => setFormData({...formData, market: e.target.value as any})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="US">美股</option>
                <option value="HK">港股</option>
                <option value="CN">A股</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                市值规模
              </label>
              <select
                value={formData.tags.marketCap}
                onChange={(e) => setFormData({
                  ...formData,
                  tags: {...formData.tags, marketCap: e.target.value as any}
                })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="large">大盘股</option>
                <option value="mid">中盘股</option>
                <option value="small">小盘股</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                关注程度
              </label>
              <select
                value={formData.tags.watchLevel}
                onChange={(e) => setFormData({
                  ...formData,
                  tags: {...formData.tags, watchLevel: e.target.value as any}
                })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="high">重点关注</option>
                <option value="medium">一般关注</option>
                <option value="low">观察中</option>
              </select>
            </div>
          </div>

          {/* 当前价格 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              当前价格（可选）
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.currentPrice || ''}
              onChange={(e) => setFormData({...formData, currentPrice: parseFloat(e.target.value) || 0})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="如：150.25"
            />
          </div>

          {/* 行业标签 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              行业标签
            </label>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      addIndustryTag(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">选择行业标签...</option>
                  {industryTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newIndustryTag}
                  onChange={(e) => setNewIndustryTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addIndustryTag(newIndustryTag);
                      setNewIndustryTag('');
                    }
                  }}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="或输入自定义标签..."
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.industry.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full flex items-center"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeIndustryTag(tag)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 基本面标签 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              基本面标签
            </label>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      addFundamentalTag(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">选择基本面标签...</option>
                  {fundamentalTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newFundamentalTag}
                  onChange={(e) => setNewFundamentalTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addFundamentalTag(newFundamentalTag);
                      setNewFundamentalTag('');
                    }
                  }}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="或输入自定义标签..."
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.fundamentals.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full flex items-center"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeFundamentalTag(tag)}
                      className="ml-2 text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              备注
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="添加关于这只股票的备注..."
            />
          </div>

          {/* 按钮 */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {stock ? '更新' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
