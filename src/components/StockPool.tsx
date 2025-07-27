// 【知行交易】股票池管理
// 股票收集、标签管理、筛选功能的核心组件

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Stock, StockPoolStats, Concept } from '@/types';
import { industryTags, fundamentalTags } from '@/data/sampleStocks';
import { ConceptService } from '@/services/conceptService';
import { StockPoolService } from '@/services/stockPoolService';
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
  onViewDetail: (stock: Stock) => void; // 查看股票详情
}

export function StockPool({
  stocks,
  onAddStock,
  onUpdateStock,
  onDeleteStock,
  onSelectStock,
  onViewDetail
}: StockPoolProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFundamental, setSelectedFundamental] = useState<string>('');
  const [selectedMarket, setSelectedMarket] = useState<string>('');
  const [selectedWatchLevel, setSelectedWatchLevel] = useState<string>('');
  const [selectedConcept, setSelectedConcept] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);

  // 获取最新的股票数据（包含概念关联）
  const [updatedStocks, setUpdatedStocks] = useState<Stock[]>(stocks);

  // 自动建立概念关联
  useEffect(() => {
    if (stocks.length > 0) {
      StockPoolService.autoEstablishConceptRelations();
      // 获取更新后的股票数据
      const latestStocks = StockPoolService.getAllStocks();
      setUpdatedStocks(latestStocks);
    }
  }, [stocks]);

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
      acc[stock.tags.watchLevel] = (acc[stock.tags.watchLevel] || 0) + 1;
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
    return updatedStocks.filter(stock => {
      const matchesSearch = !searchTerm ||
        stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFundamental = !selectedFundamental ||
        stock.tags.fundamentals.includes(selectedFundamental);

      const matchesMarket = !selectedMarket || stock.market === selectedMarket;

      const matchesWatchLevel = !selectedWatchLevel ||
        stock.tags.watchLevel === selectedWatchLevel;

      const matchesConcept = !selectedConcept ||
        (stock.conceptIds && stock.conceptIds.includes(selectedConcept));

      return matchesSearch && matchesFundamental &&
             matchesMarket && matchesWatchLevel && matchesConcept;
    });
  }, [updatedStocks, searchTerm, selectedFundamental, selectedMarket, selectedWatchLevel, selectedConcept]);

  // 获取所有已使用的基本面标签
  const usedFundamentalTags = useMemo(() => {
    const tags = new Set<string>();
    updatedStocks.forEach(stock => {
      stock.tags.fundamentals.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [updatedStocks]);

  // 获取所有概念标签
  const availableConcepts = useMemo(() => {
    const concepts = ConceptService.getConcepts();
    return concepts.map(concept => {
      // 计算实际的股票数量
      const stockCount = updatedStocks.filter(stock => stock.conceptIds && stock.conceptIds.includes(concept.id)).length;
      return {
        ...concept,
        stockCount
      };
    }); // 显示所有概念，包括没有关联股票的概念
  }, [updatedStocks]);

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
    setSelectedFundamental('');
    setSelectedMarket('');
    setSelectedWatchLevel('');
    setSelectedConcept('');
  };

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">股票池</h2>
          <p className="text-sm text-gray-600 mt-1">第1页股票列表 股票池总共{stats.totalStocks}只股票</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-3 py-1 bg-gray-800 text-white text-sm rounded hover:bg-gray-900 transition-colors flex items-center space-x-1"
        >
          <Plus className="w-4 h-4" />
          <span>添加股票</span>
        </button>
      </div>

      {/* 搜索功能 */}
      <div className="bg-white border border-gray-200 rounded p-3">
        <div className="flex items-center space-x-4">
          <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
            搜索 股票池
          </button>
          <button className="px-3 py-1 bg-orange-500 text-white text-sm rounded hover:bg-orange-600">
            搜索 自选股
          </button>
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                placeholder="股票代码或名称，如sh000001 | 000001 美股代码，如：amzn,港股代码，如：hk3690 | 03690"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 基础筛选条件 */}
      <div className="bg-white border border-gray-200 rounded p-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* 基本面筛选 */}
          <select
            value={selectedFundamental}
            onChange={(e) => setSelectedFundamental(e.target.value)}
            className="p-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
          >
            <option value="">所有基本面</option>
            {usedFundamentalTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>

          {/* 市场筛选 */}
          <select
            value={selectedMarket}
            onChange={(e) => setSelectedMarket(e.target.value)}
            className="p-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
          >
            <option value="">所有市场</option>
            <option value="US">美股</option>
            <option value="HK">港股</option>
            <option value="CN">A股</option>
          </select>

          {/* 关注程度筛选 */}
          <select
            value={selectedWatchLevel}
            onChange={(e) => setSelectedWatchLevel(e.target.value)}
            className="p-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
          >
            <option value="">所有关注度</option>
            <option value="high">重点关注</option>
            <option value="medium">一般关注</option>
            <option value="low">观察中</option>
          </select>

          {/* 清除筛选 */}
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-gray-600 border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors"
          >
            清除筛选
          </button>
        </div>
      </div>

      {/* 概念标签筛选 */}
      <div className="bg-white border border-gray-200 rounded p-3">
        <div className="mb-2">
          <span className="text-sm font-medium text-gray-700">概念筛选：</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* 全部概念按钮 */}
          <button
            onClick={() => setSelectedConcept('')}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              selectedConcept === ''
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            全部 ({updatedStocks.length})
          </button>

          {/* 概念标签按钮 */}
          {availableConcepts.map(concept => (
            <button
              key={concept.id}
              onClick={() => setSelectedConcept(concept.id === selectedConcept ? '' : concept.id)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedConcept === concept.id
                  ? 'text-white'
                  : 'text-gray-700 hover:opacity-80'
              }`}
              style={{
                backgroundColor: selectedConcept === concept.id
                  ? concept.color
                  : `${concept.color}20`,
                borderColor: concept.color,
                borderWidth: '1px'
              }}
            >
              {concept.name} ({concept.stockCount})
            </button>
          ))}
        </div>

        <div className="mt-2 text-sm text-gray-600">
          显示 {filteredStocks.length} / {stats.totalStocks} 只股票
        </div>
      </div>



      {/* 股票列表 */}
      <div className="space-y-4">
        {filteredStocks.length === 0 ? (
          <div className="text-center py-12 bg-white border border-gray-200 rounded">
            <p className="text-gray-500 mb-2">暂无股票数据</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="text-gray-600 hover:text-gray-900"
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
              onViewDetail={() => onViewDetail(stock)}
            />
          ))
        )}
      </div>

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
  onSelect,
  onViewDetail
}: {
  stock: Stock;
  onEdit: () => void;
  onDelete: () => void;
  onSelect: () => void;
  onViewDetail: () => void;
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
    <div className="bg-white border border-gray-200 rounded p-4">
      <div className="flex items-start justify-between">
        {/* 左侧：股票信息 */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium text-blue-600 text-lg">{stock.name}({stock.symbol})</h3>
            <span className={`px-2 py-1 rounded text-xs ${
              stock.market === 'US' ? 'bg-blue-100 text-blue-800' :
              stock.market === 'HK' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            }`}>
              {stock.market}
            </span>
          </div>

          {/* 概念标签 */}
          {stock.conceptIds && stock.conceptIds.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {stock.conceptIds.map(conceptId => {
                const concept = ConceptService.getConceptById(conceptId);
                return concept ? (
                  <span
                    key={conceptId}
                    className="px-2 py-1 rounded text-xs text-white"
                    style={{ backgroundColor: concept.color }}
                  >
                    {concept.name}
                  </span>
                ) : null;
              })}
            </div>
          )}

          {/* 行业标签 */}
          {stock.tags.industry.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {stock.tags.industry.map(industry => (
                <span
                  key={industry}
                  className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs"
                >
                  {industry}
                </span>
              ))}
            </div>
          )}

          {/* 价格信息 */}
          {stock.currentPrice && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg font-semibold">${stock.currentPrice.toFixed(2)}</span>
              {stock.priceChange && (
                <span className={`flex items-center gap-1 text-sm ${getPriceChangeColor(stock.priceChange)}`}>
                  {getPriceChangeIcon(stock.priceChange)}
                  {stock.priceChange >= 0 ? '+' : ''}{stock.priceChange.toFixed(2)}
                  {stock.priceChangePercent && ` (${stock.priceChangePercent >= 0 ? '+' : ''}${stock.priceChangePercent.toFixed(2)}%)`}
                </span>
              )}
            </div>
          )}

          <div className="flex space-x-4 mt-2">
            <button
              onClick={onViewDetail}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              📊 查看详情
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={onSelect}
              className="text-sm text-green-600 hover:text-green-800 font-medium"
            >
              📈 制定交易计划
            </button>
          </div>
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex space-x-2 ml-4">
          <button
            onClick={onEdit}
            className="p-1 text-gray-600 hover:text-gray-900"
            title="编辑"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-gray-600 hover:text-gray-900"
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
    conceptIds: stock?.conceptIds || [],
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
      conceptIds: formData.conceptIds,
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

  // 概念标签管理
  const addConceptToStock = (conceptId: string) => {
    if (conceptId && !formData.conceptIds.includes(conceptId)) {
      setFormData({
        ...formData,
        conceptIds: [...formData.conceptIds, conceptId]
      });
    }
  };

  const removeConceptFromStock = (conceptId: string) => {
    setFormData({
      ...formData,
      conceptIds: formData.conceptIds.filter(id => id !== conceptId)
    });
  };

  // 获取可用的概念
  const availableConceptsForForm = ConceptService.getConcepts();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded p-4 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
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

          {/* 概念标签 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              概念标签
            </label>
            <div className="space-y-2">
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    addConceptToStock(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">选择概念标签...</option>
                {availableConceptsForForm
                  .filter(concept => !formData.conceptIds.includes(concept.id))
                  .map(concept => (
                    <option key={concept.id} value={concept.id}>
                      {concept.name} ({concept.stockCount} 只股票)
                    </option>
                  ))}
              </select>
              <div className="flex flex-wrap gap-2">
                {formData.conceptIds.map((conceptId) => {
                  const concept = availableConceptsForForm.find(c => c.id === conceptId);
                  return concept ? (
                    <span
                      key={conceptId}
                      className="px-3 py-1 text-white text-sm rounded-full flex items-center"
                      style={{ backgroundColor: concept.color }}
                    >
                      {concept.name}
                      <button
                        type="button"
                        onClick={() => removeConceptFromStock(conceptId)}
                        className="ml-2 text-white hover:text-gray-200"
                      >
                        ×
                      </button>
                    </span>
                  ) : null;
                })}
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
              className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-1 bg-gray-800 text-white text-sm rounded hover:bg-gray-900 transition-colors"
            >
              {stock ? '更新' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
