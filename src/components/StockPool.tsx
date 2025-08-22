// 【知行交易】股票池管理
// 股票收集、标签管理、筛选功能的核心组件

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Stock, StockPoolStats, Concept, ConceptStockRelation } from '@/types';

import { ConceptService } from '@/services/conceptService';
// import { StockPoolService } from '@/services/stockPoolService'; // 已移除，股票数据通过API管理

// 常用标签常量
const industryTags = [
  '科技', '金融', '医疗', '消费', '制造', '能源', '房地产', '通信', '材料', '公用事业',
  '互联网', '电商', '游戏', '教育', '汽车', '航空', '银行', '保险', '证券', '基金'
];

// fundamentalTags 已移除，概念通过关联表管理
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
  // 分页
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onConceptChange?: (conceptId: string) => void;
}

export function StockPool({
  stocks,
  onAddStock,
  onUpdateStock,
  onDeleteStock,
  onSelectStock,
  onViewDetail,
  page = 1,
  pageSize = 20,
  total = 0,
  totalPages = 0,
  onPageChange,
  onPageSizeChange,
  onConceptChange
}: StockPoolProps) {
  // 调试信息
  console.log('🔍 StockPool: 接收到的stocks数据:', stocks);
  console.log('🔍 StockPool: stocks数量:', stocks.length);
  console.log('🔍 StockPool: stocks类型:', typeof stocks);
  console.log('🔍 StockPool: 是否为数组:', Array.isArray(stocks));
  console.log('🔍 StockPool: 前几只股票:', stocks.slice(0, 3));
  const [searchTerm, setSearchTerm] = useState('');
  // selectedFundamental 已移除，概念通过关联表管理
  const [selectedMarket, setSelectedMarket] = useState<string>('');
  const [selectedWatchLevel, setSelectedWatchLevel] = useState<string>('');
  const [selectedConcept, setSelectedConcept] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [concepts, setConcepts] = useState<Concept[]>([]);

  // 直接使用传入的股票数据，不依赖本地存储
  const updatedStocks = stocks || [];
  console.log('🔍 StockPool: updatedStocks数量:', updatedStocks.length);

  // 获取概念数据（使用缓存/合并请求）
  useEffect(() => {
    let mounted = true;
    const fetchConcepts = async () => {
      try {
        const conceptsData = await ConceptService.getConcepts();
        if (mounted) setConcepts(conceptsData);
      } catch (error) {
        console.error('获取概念数据失败:', error);
        if (mounted) setConcepts([]);
      }
    };
    fetchConcepts();
    return () => { mounted = false; };
  }, []);



  // 计算统计数据
  const stats: StockPoolStats = useMemo(() => {
    const byMarket = stocks.reduce((acc, stock) => {
      acc[stock.market] = (acc[stock.market] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byIndustry = {} as Record<string, number>; // 行业统计已移除，使用概念关联表

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

  // 概念关联关系状态
  const [conceptRelations, setConceptRelations] = useState<ConceptStockRelation[]>([]);

  // 获取概念关联关系
  useEffect(() => {
    const fetchRelations = async () => {
      try {
        const relations = await ConceptService.getConceptRelations();
        console.log('🔍 StockPool: 获取到的概念关联关系:', relations);
        console.log('🔍 StockPool: 关联关系数量:', relations.length);
        setConceptRelations(relations);
      } catch (error) {
        console.error('获取概念关联关系失败:', error);
        setConceptRelations([]);
      }
    };

    fetchRelations();
  }, []);

  // 筛选股票
  const filteredStocks = useMemo(() => {
    console.log('🔍 StockPool: 开始筛选股票...');
    console.log('🔍 StockPool: updatedStocks数量:', updatedStocks.length);
    console.log('🔍 StockPool: searchTerm:', searchTerm);
    console.log('🔍 StockPool: selectedMarket:', selectedMarket);
    console.log('🔍 StockPool: selectedWatchLevel:', selectedWatchLevel);
    console.log('🔍 StockPool: selectedConcept:', selectedConcept);
    
    const result = updatedStocks.filter(stock => {
      const matchesSearch = !searchTerm ||
        stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.name.toLowerCase().includes(searchTerm.toLowerCase());

      // matchesFundamental 已移除，概念通过关联表管理

      const matchesMarket = !selectedMarket || stock.market === selectedMarket;

      const matchesWatchLevel = !selectedWatchLevel ||
        stock.tags.watchLevel === selectedWatchLevel;

      // 使用关联关系检查概念匹配
      const matchesConcept = !selectedConcept ||
        conceptRelations.some(rel =>
          rel.conceptId === selectedConcept && rel.stockId === stock.symbol
        );

      return matchesSearch &&
             matchesMarket && matchesWatchLevel && matchesConcept;
    });
    
    console.log('🔍 StockPool: 筛选后股票数量:', result.length);
    return result;
  }, [updatedStocks, searchTerm, selectedMarket, selectedWatchLevel, selectedConcept, conceptRelations]);

  // usedFundamentalTags 已移除，概念通过关联表管理

  // 概念数据状态（直接使用后端返回的 stock_count，而不是用当前页股票二次统计）
  const [availableConcepts, setAvailableConcepts] = useState<Array<Concept & { stockCount: number }>>([]);

  useEffect(() => {
    const syncConcepts = async () => {
      try {
        const list = await ConceptService.getConcepts();
        const normalized = list.map(c => ({ ...c, stockCount: c.stockCount ?? 0 }));
        setAvailableConcepts(normalized);
      } catch (e) {
        console.error('获取概念失败:', e);
        setAvailableConcepts([]);
      }
    };
    syncConcepts();
  }, [concepts]);

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
    // setSelectedFundamental 已移除，概念通过关联表管理
    setSelectedMarket('');
    setSelectedWatchLevel('');
    setSelectedConcept('');
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">股票池</h2>
          <p className="text-sm text-text-secondary mt-1">第{page}页 / 共{totalPages}页 · 共{total}只股票</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-gradient-to-r from-[#00ffd0] to-[#3b82f6] text-[#0f172a] text-sm rounded-lg font-medium hover:shadow-lg transition-all flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>添加股票</span>
        </button>
      </div>

      {/* 统一的筛选区域 - 精简版 */}
      <div className="bg-surface/20 border border rounded-lg p-3 mb-4">
        {/* 第一行：搜索框 + 市场筛选 + 关注度筛选 + 清除按钮 */}
        <div className="flex gap-3 mb-3">
          {/* 搜索框 */}
          <div className="flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-unified w-full h-9"
              placeholder="搜索代码或名称，如AAPL、000001"
            />
          </div>
          
          {/* 市场筛选 */}
          <select
            value={selectedMarket}
            onChange={(e) => setSelectedMarket(e.target.value)}
            className="input-unified w-24 h-9 text-sm"
          >
            <option value="">市场</option>
            <option value="US">美股</option>
            <option value="HK">港股</option>
            <option value="CN">A股</option>
          </select>

          {/* 关注程度筛选 */}
          <select
            value={selectedWatchLevel}
            onChange={(e) => setSelectedWatchLevel(e.target.value)}
            className="input-unified w-24 h-9 text-sm"
          >
            <option value="">关注度</option>
            <option value="high">重点</option>
            <option value="medium">一般</option>
            <option value="low">观察</option>
          </select>

          {/* 清除筛选 */}
          <button
            onClick={clearFilters}
            className="btn-unified-secondary text-sm h-9 px-3"
          >
            清除
          </button>
        </div>

        {/* 第二行：概念标签筛选 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary flex-shrink-0">概念：</span>
          <div className="flex flex-wrap gap-1 flex-1">
            {/* 全部概念按钮 */}
            <button
              onClick={() => { setSelectedConcept(''); if (onConceptChange) onConceptChange(''); }}
              className={`px-2 py-1 text-xs rounded transition-all ${
                selectedConcept === '' 
                  ? 'bg-primary text-slate-900 border border-primary' 
                  : 'bg-surface/50 text-text-secondary border border hover:bg-surface'
              }`}
            >
              全部 ({total || updatedStocks.length})
            </button>

            {/* 概念标签按钮 - 限制显示数量 */}
            {availableConcepts.slice(0, 12).map(concept => (
              <button
                key={concept.id}
                onClick={() => {
                  const next = concept.id === selectedConcept ? '' : concept.id;
                  setSelectedConcept(next);
                  if (onConceptChange) onConceptChange(next);
                }}
                className={`px-2 py-1 text-xs rounded transition-all border ${
                  selectedConcept === concept.id
                    ? 'text-slate-900 border-2'
                    : 'text-text-secondary border hover:scale-105'
                }`}
                style={{
                  backgroundColor: selectedConcept === concept.id
                    ? concept.color
                    : `${concept.color}15`,
                  borderColor: concept.color
                }}
              >
                {concept.name} ({concept.stockCount})
              </button>
            ))}
            
            {/* 更多概念按钮 */}
            {availableConcepts.length > 12 && (
              <span className="px-2 py-1 text-xs text-text-muted bg-surface/30 rounded border border">
                +{availableConcepts.length - 12}个
              </span>
            )}
          </div>
          
          {/* 统计信息 */}
          <span className="text-xs text-text-muted flex-shrink-0">
            {filteredStocks.length}/{total || stats.totalStocks}
          </span>
        </div>
      </div>



      {/* 股票列表 */}
      <div className="stock-list space-y-4">
        {filteredStocks.length === 0 ? (
          <div className="text-center py-12 card">
            <p className="text-text-secondary mb-4 text-lg">暂无股票数据</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-primary text-text-inverse text-sm rounded-lg hover:bg-primary-light transition-colors"
            >
              添加第一只股票
            </button>
          </div>
        ) : (
          filteredStocks.map((stock) => (
            <StockCard
              key={stock.id}
              stock={stock}
              concepts={concepts}
              conceptRelations={conceptRelations}
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

      {/* 分页控件 */}
      <div className="pagination-container">
        <div className="flex items-center gap-2">
          <button
            className="pagination-button"
            disabled={page <= 1}
            onClick={() => onPageChange && onPageChange(page - 1)}
          >上一页</button>
          <span className="pagination-info">{page} / {Math.max(totalPages, 1)}</span>
          <button
            className="pagination-button"
            disabled={page >= totalPages}
            onClick={() => onPageChange && onPageChange(page + 1)}
          >下一页</button>
        </div>
        <div className="flex items-center gap-2">
          <span className="pagination-info">每页</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange && onPageSizeChange(parseInt(e.target.value, 10))}
            className="pagination-button"
          >
            {[20, 50, 100].map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// 股票卡片组件
function StockCard({
  stock,
  concepts,
  conceptRelations,
  onEdit,
  onDelete,
  onSelect,
  onViewDetail
}: {
  stock: Stock;
  concepts: Concept[];
  conceptRelations: ConceptStockRelation[];
  onEdit: () => void;
  onDelete: () => void;
  onSelect: () => void;
  onViewDetail: () => void;
}) {
  const getWatchLevelIcon = (level: string) => {
    switch (level) {
      case 'high': return <Star className="w-4 h-4 text-accent fill-current" />;
      case 'medium': return <Star className="w-4 h-4 text-text-muted" />;
      case 'low': return <StarOff className="w-4 h-4 text-text-muted" />;
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
    if (!change) return 'text-text-muted';
    return change >= 0 ? 'text-success' : 'text-danger';
  };

  const getPriceChangeIcon = (change?: number) => {
    if (!change) return null;
    return change >= 0 ?
      <TrendingUp className="w-4 h-4" /> :
      <TrendingDown className="w-4 h-4" />;
  };

  return (
    <div className="neon-card p-4">
      <div className="flex items-center justify-between mb-3">
        {/* 左侧：股票信息 */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-base font-semibold text-text-primary">{stock.name}</h3>
            <span className="px-2 py-1 bg-surface/50 border border rounded text-xs text-text-secondary font-mono">
              {stock.symbol}
            </span>
            <span className="text-sm">
              {getMarketFlag(stock.market)}
            </span>
            {/* 关注级别标识 */}
            <div className="flex items-center">
              {getWatchLevelIcon(stock.tags.watchLevel || 'medium')}
            </div>
          </div>

          {/* 概念标签 - 只显示最多2个 */}
          {(() => {
            const stockConcepts = conceptRelations
              .filter(rel => rel.stockId === stock.symbol)
              .map(rel => concepts.find(concept => concept.id === rel.conceptId))
              .filter(Boolean) as Concept[];
            
            return stockConcepts.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {stockConcepts.slice(0, 2).map((concept) => (
                  <span
                    key={concept.id}
                    className="px-2 py-0.5 bg-accent/10 border border-accent/20 rounded text-xs text-accent"
                  >
                    {concept.name}
                  </span>
                ))}
                {stockConcepts.length > 2 && (
                  <span className="px-2 py-0.5 bg-surface/50 border border rounded text-xs text-text-muted">
                    +{stockConcepts.length - 2}
                  </span>
                )}
              </div>
            );
          })()}

          {/* 价格信息 - 精简显示 */}
          <div className="flex items-center gap-4 mb-2">
            <div className="text-lg font-bold text-text-primary font-mono">
              ${stock.currentPrice?.toFixed(2) || '0.00'}
            </div>
            {stock.priceChange && (
              <div className={`flex items-center gap-1 text-sm ${stock.priceChange >= 0 ? 'text-success' : 'text-danger'}`}>
                {getPriceChangeIcon(stock.priceChange)}
                <span className="font-medium">
                  {stock.priceChange >= 0 ? '+' : ''}{stock.priceChange.toFixed(2)}
                </span>
                {stock.priceChangePercent && (
                  <span className="font-mono text-xs">
                    ({stock.priceChangePercent >= 0 ? '+' : ''}{stock.priceChangePercent.toFixed(1)}%)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 简化的操作按钮 */}
          <div className="flex gap-2">
            <button
              onClick={onSelect}
              className="px-3 py-1 bg-primary/10 border border-primary/20 rounded text-primary text-xs hover:bg-primary/20 transition-all"
            >
              交易计划
            </button>
            <button
              onClick={onViewDetail}
              className="px-3 py-1 bg-info/10 border border-info/20 rounded text-info text-xs hover:bg-info/20 transition-all"
            >
              详情
            </button>
          </div>
        </div>

        {/* 右侧：管理按钮 */}
        <div className="flex flex-col gap-1 ml-3">
          <button
            onClick={onEdit}
            className="w-7 h-7 bg-primary/10 border border-primary/20 rounded flex items-center justify-center text-primary hover:bg-primary/20 transition-all"
            title="编辑"
          >
            <Edit3 className="w-3 h-3" />
          </button>
          <button
            onClick={onDelete}
            className="w-7 h-7 bg-danger/10 border border-danger/20 rounded flex items-center justify-center text-danger hover:bg-danger/20 transition-all"
            title="删除"
          >
            <Trash2 className="w-3 h-3" />
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
      // fundamentals 字段已移除：基本面标签通过概念关联表管理
      marketCap: stock?.tags.marketCap || 'mid' as const,
      watchLevel: stock?.tags.watchLevel || 'medium' as const
    },
    conceptIds: stock?.conceptIds || [],
    currentPrice: stock?.currentPrice || 0,
    notes: stock?.notes || ''
  });

  // const [newFundamentalTag, setNewFundamentalTag] = useState(''); // 已移除：基本面标签通过概念关联表管理
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [newConceptName, setNewConceptName] = useState('');

  // 加载概念数据
  useEffect(() => {
    const loadConcepts = async () => {
      try {
        const conceptsData = await ConceptService.getConcepts();
        setConcepts(conceptsData);
      } catch (error) {
        console.error('加载概念数据失败:', error);
      }
    };
    loadConcepts();
  }, []);

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

  // 概念管理函数
  const addConceptToStock = async (conceptId: string) => {
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

  const createAndAddConcept = async (conceptName: string) => {
    if (!conceptName.trim()) return;

    try {
      // 检查概念是否已存在
      const existingConcept = concepts.find(c => c.name.toLowerCase() === conceptName.toLowerCase());
      if (existingConcept) {
        await addConceptToStock(existingConcept.id);
        setNewConceptName('');
        return;
      }

      // 创建新概念
      const newConcept = await ConceptService.createConcept(conceptName.trim());
      setConcepts(prev => [...prev, newConcept]);
      await addConceptToStock(newConcept.id);
      setNewConceptName('');
    } catch (error) {
      console.error('创建概念失败:', error);
    }
  };

  // 基本面标签相关函数已移除：基本面标签通过概念关联表管理
  // const addFundamentalTag = (tag: string) => {...};
  // const removeFundamentalTag = (tag: string) => {...};

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
      <div className="modal-content rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-[#e2e8f0] mb-6">
          {stock ? '编辑股票' : '添加股票'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 基础信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                股票代码 *
              </label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
                className="w-full p-3 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="如：AAPL"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                股票名称 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full p-3 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="如：苹果公司"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                市场
              </label>
              <select
                value={formData.market}
                onChange={(e) => setFormData({...formData, market: e.target.value as any})}
                className="w-full p-3 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="US">美股</option>
                <option value="HK">港股</option>
                <option value="CN">A股</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                市值规模
              </label>
              <select
                value={formData.tags.marketCap}
                onChange={(e) => setFormData({
                  ...formData,
                  tags: {...formData.tags, marketCap: e.target.value as any}
                })}
                className="w-full p-3 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="large">大盘股</option>
                <option value="mid">中盘股</option>
                <option value="small">小盘股</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                关注程度
              </label>
              <select
                value={formData.tags.watchLevel}
                onChange={(e) => setFormData({
                  ...formData,
                  tags: {...formData.tags, watchLevel: e.target.value as any}
                })}
                className="w-full p-3 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="high">重点关注</option>
                <option value="medium">一般关注</option>
                <option value="low">观察中</option>
              </select>
            </div>
          </div>

          {/* 当前价格 */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              当前价格（可选）
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.currentPrice || ''}
              onChange={(e) => setFormData({...formData, currentPrice: parseFloat(e.target.value) || 0})}
              className="w-full p-3 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="如：150.25"
            />
          </div>

          {/* 概念管理 */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              概念管理
            </label>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      addConceptToStock(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="flex-1 p-2 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">选择概念...</option>
                  {concepts.map(concept => (
                    <option key={concept.id} value={concept.id}>{concept.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newConceptName}
                  onChange={(e) => setNewConceptName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      createAndAddConcept(newConceptName);
                    }
                  }}
                  className="flex-1 p-2 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="或输入自定义概念..."
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.conceptIds.map((conceptId) => {
                  const concept = concepts.find(c => c.id === conceptId);
                  return concept ? (
                    <span
                      key={conceptId}
                      className="px-3 py-1 bg-accent/10 text-accent text-sm rounded-full flex items-center"
                    >
                      {concept.name}
                      <button
                        type="button"
                        onClick={() => removeConceptFromStock(conceptId)}
                        className="ml-2 text-accent hover:text-accent-dark"
                      >
                        ×
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          </div>

          {/* 基本面标签部分已移除：基本面标签通过概念关联表管理 */}



          {/* 备注 */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              备注
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
              className="w-full p-3 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="添加关于这只股票的备注..."
            />
          </div>

          {/* 按钮 */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1 border border rounded text-sm hover:bg-surface transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-1 bg-primary text-text-inverse text-sm rounded hover:bg-primary-light transition-colors"
            >
              {stock ? '更新' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
