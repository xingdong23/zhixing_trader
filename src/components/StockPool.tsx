'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Stock, StockPoolStats, Concept, ConceptStockRelation } from '@/types';
import { ConceptService } from '@/services/conceptService';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Star,
  StarOff,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface StockPoolProps {
  stocks: Stock[];
  onAddStock: (stock: Omit<Stock, 'id' | 'addedAt' | 'updatedAt'>) => void;
  onUpdateStock: (id: string, stock: Partial<Stock>) => void;
  onDeleteStock: (id: string) => void;
  onSelectStock: (stock: Stock) => void;
  onViewDetail: (stock: Stock) => void;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<string>('');
  const [selectedWatchLevel, setSelectedWatchLevel] = useState<string>('');
  const [selectedConcept, setSelectedConcept] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [conceptRelations, setConceptRelations] = useState<ConceptStockRelation[]>([]);
  const [availableConcepts, setAvailableConcepts] = useState<Array<Concept & { stockCount: number }>>([]);

  const updatedStocks = stocks || [];

  // 获取概念数据
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

  // 获取概念关联关系
  useEffect(() => {
    const fetchRelations = async () => {
      try {
        const relations = await ConceptService.getConceptRelations();
        setConceptRelations(relations);
      } catch (error) {
        console.error('获取概念关联关系失败:', error);
        setConceptRelations([]);
      }
    };
    fetchRelations();
  }, []);

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

  // 筛选股票
  const filteredStocks = useMemo(() => {
    return updatedStocks.filter(stock => {
      const matchesSearch = !searchTerm ||
        stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesMarket = !selectedMarket || stock.market === selectedMarket;
      const matchesWatchLevel = !selectedWatchLevel || stock.tags.watchLevel === selectedWatchLevel;
      const matchesConcept = !selectedConcept ||
        conceptRelations.some(rel =>
          rel.conceptId === selectedConcept && rel.stockId === stock.symbol
        );

      return matchesSearch && matchesMarket && matchesWatchLevel && matchesConcept;
    });
  }, [updatedStocks, searchTerm, selectedMarket, selectedWatchLevel, selectedConcept, conceptRelations]);

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
    setSelectedMarket('');
    setSelectedWatchLevel('');
    setSelectedConcept('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 页面标题 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>股票池</h2>
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
            第{page}页 / 共{totalPages}页 · 共{total}只股票
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} />
          <span>添加股票</span>
        </button>
      </div>

      {/* 搜索功能 */}
      <div className="card" style={{ background: 'white', color: '#1f2937' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary">搜索 股票池</button>
          <button className="btn btn-secondary">搜索 自选股</button>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <div style={{ position: 'relative' }}>
              <Search 
                size={16} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '12px', 
                  color: '#6b7280' 
                }} 
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                placeholder="股票代码或名称，如sh000001 | 000001 美股代码，如：amzn,港股代码，如：hk3690 | 03690"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 基础筛选条件 */}
      <div className="card" style={{ background: 'white', color: '#1f2937' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px' 
        }}>
          <select
            value={selectedMarket}
            onChange={(e) => setSelectedMarket(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="">所有市场</option>
            <option value="US">美股</option>
            <option value="HK">港股</option>
            <option value="CN">A股</option>
          </select>

          <select
            value={selectedWatchLevel}
            onChange={(e) => setSelectedWatchLevel(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="">所有关注度</option>
            <option value="high">重点关注</option>
            <option value="medium">一般关注</option>
            <option value="low">观察中</option>
          </select>

          <button
            onClick={clearFilters}
            className="btn btn-secondary"
          >
            清除筛选
          </button>
        </div>
      </div>

      {/* 概念标签筛选 */}
      <div className="card" style={{ background: 'white', color: '#1f2937' }}>
        <div style={{ marginBottom: '16px' }}>
          <span style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>概念筛选：</span>
        </div>
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '8px', 
          marginBottom: '16px' 
        }}>
          <button
            onClick={() => { 
              setSelectedConcept(''); 
              if (onConceptChange) onConceptChange(''); 
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '16px',
              border: selectedConcept === '' ? '2px solid #3b82f6' : '1px solid #d1d5db',
              background: selectedConcept === '' ? '#3b82f6' : 'white',
              color: selectedConcept === '' ? 'white' : '#374151',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            全部 ({total || updatedStocks.length})
          </button>

          {availableConcepts.map(concept => (
            <button
              key={concept.id}
              onClick={() => {
                const next = concept.id === selectedConcept ? '' : concept.id;
                setSelectedConcept(next);
                if (onConceptChange) onConceptChange(next);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '16px',
                border: selectedConcept === concept.id ? `2px solid ${concept.color}` : `1px solid ${concept.color}`,
                background: selectedConcept === concept.id ? concept.color : 'white',
                color: selectedConcept === concept.id ? 'white' : concept.color,
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {concept.name} ({concept.stockCount})
            </button>
          ))}
        </div>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>
          显示 {filteredStocks.length} / {total || updatedStocks.length} 只股票
        </div>
      </div>

      {/* 股票列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredStocks.length === 0 ? (
          <div className="card" style={{ background: 'white', color: '#1f2937', textAlign: 'center', padding: '48px 24px' }}>
            <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '18px' }}>暂无股票数据</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn btn-primary"
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

      {/* 分页控件 */}
      <div className="card" style={{ background: 'white', color: '#1f2937' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-secondary"
              disabled={page <= 1}
              onClick={() => onPageChange && onPageChange(page - 1)}
            >
              上一页
            </button>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              {page} / {Math.max(totalPages, 1)}
            </span>
            <button
              className="btn btn-secondary"
              disabled={page >= totalPages}
              onClick={() => onPageChange && onPageChange(page + 1)}
            >
              下一页
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>每页</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange && onPageSizeChange(parseInt(e.target.value, 10))}
              style={{
                padding: '4px 8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              {[20, 50, 100].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </div>
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
      case 'high': return <Star size={16} style={{ color: '#f59e0b', fill: '#f59e0b' }} />;
      case 'medium': return <Star size={16} style={{ color: '#6b7280' }} />;
      case 'low': return <StarOff size={16} style={{ color: '#6b7280' }} />;
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

  const getPriceChangeIcon = (change?: number) => {
    if (!change) return null;
    return change >= 0 ?
      <TrendingUp size={16} /> :
      <TrendingDown size={16} />;
  };

  return (
    <div className="card" style={{ background: 'white', color: '#1f2937' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        {/* 左侧：股票信息 */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
              {stock.name}
            </h3>
            <span style={{
              padding: '4px 8px',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#6b7280',
              fontFamily: 'monospace'
            }}>
              {stock.symbol}
            </span>
            <span style={{ fontSize: '14px' }}>
              {getMarketFlag(stock.market)}
            </span>
          </div>

          {/* 概念标签 */}
          {(() => {
            const stockConcepts = conceptRelations
              .filter(rel => rel.stockId === stock.symbol)
              .map(rel => concepts.find(concept => concept.id === rel.conceptId))
              .filter(Boolean) as Concept[];
            
            return stockConcepts.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                {stockConcepts.slice(0, 3).map((concept) => (
                  <span
                    key={concept.id}
                    style={{
                      padding: '2px 8px',
                      background: `${concept.color}20`,
                      border: `1px solid ${concept.color}40`,
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: concept.color
                    }}
                  >
                    {concept.name}
                  </span>
                ))}
                {stockConcepts.length > 3 && (
                  <span style={{
                    padding: '2px 8px',
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>
                    +{stockConcepts.length - 3}
                  </span>
                )}
              </div>
            );
          })()}

          {/* 价格信息 */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#1f2937',
              fontFamily: 'monospace',
              marginBottom: '4px'
            }}>
              ${stock.currentPrice?.toFixed(2) || '0.00'}
            </div>
            {stock.priceChange && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: stock.priceChange >= 0 ? '#059669' : '#dc2626'
              }}>
                {getPriceChangeIcon(stock.priceChange)}
                <span style={{ fontWeight: '500', color: '#1f2937' }}>
                  {stock.priceChange >= 0 ? '+' : ''}{stock.priceChange.toFixed(2)}
                </span>
                {stock.priceChangePercent && (
                  <span style={{ fontFamily: 'monospace' }}>
                    ({stock.priceChangePercent >= 0 ? '+' : ''}{stock.priceChangePercent.toFixed(2)}%)
                  </span>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onViewDetail}
              style={{
                padding: '6px 12px',
                background: '#3b82f620',
                border: '1px solid #3b82f640',
                borderRadius: '6px',
                color: '#3b82f6',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              查看详情
            </button>
            <button
              onClick={onSelect}
              style={{
                padding: '6px 12px',
                background: '#05966920',
                border: '1px solid #05966940',
                borderRadius: '6px',
                color: '#059669',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              制定交易计划
            </button>
          </div>
        </div>

        {/* 右侧：操作按钮 */}
        <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
          <button
            onClick={onEdit}
            style={{
              width: '32px',
              height: '32px',
              background: '#3b82f620',
              border: '1px solid #3b82f640',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6',
              cursor: 'pointer'
            }}
            title="编辑"
          >
            <Edit3 size={16} />
          </button>
          <button
            onClick={onDelete}
            style={{
              width: '32px',
              height: '32px',
              background: '#dc262620',
              border: '1px solid #dc262640',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#dc2626',
              cursor: 'pointer'
            }}
            title="删除"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* 股票详细信息 */}
      <div style={{
        display: 'flex',
        gap: '24px',
        paddingTop: '16px',
        borderTop: '1px solid #e5e7eb'
      }}>
        <div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>市值规模</div>
          <div style={{ fontFamily: 'monospace', color: '#1f2937' }}>
            {stock.tags.marketCap === 'large' ? '大盘股' : 
             stock.tags.marketCap === 'mid' ? '中盘股' : 
             stock.tags.marketCap === 'small' ? '小盘股' : '--'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>成交量</div>
          <div style={{ fontFamily: 'monospace', color: '#1f2937' }}>
            {stock.volume || '--'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>关注级别</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {getWatchLevelIcon(stock.tags.watchLevel || 'medium')}
            <span style={{ fontSize: '14px', color: '#1f2937' }}>
              {stock.tags.watchLevel || 'medium'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 股票表单组件 - 简化版本
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
      marketCap: stock?.tags.marketCap || 'mid' as const,
      watchLevel: stock?.tags.watchLevel || 'medium' as const
    },
    conceptIds: stock?.conceptIds || [],
    currentPrice: stock?.currentPrice || 0,
    notes: stock?.notes || ''
  });

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

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '24px'
        }}>
          {stock ? '编辑股票' : '添加股票'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1f2937', marginBottom: '8px' }}>
                股票代码 *
              </label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}
                placeholder="如：AAPL"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1f2937', marginBottom: '8px' }}>
                股票名称 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}
                placeholder="如：苹果公司"
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1f2937', marginBottom: '8px' }}>
                市场
              </label>
              <select
                value={formData.market}
                onChange={(e) => setFormData({...formData, market: e.target.value as any})}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}
              >
                <option value="US">美股</option>
                <option value="HK">港股</option>
                <option value="CN">A股</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1f2937', marginBottom: '8px' }}>
                市值规模
              </label>
              <select
                value={formData.tags.marketCap}
                onChange={(e) => setFormData({
                  ...formData,
                  tags: {...formData.tags, marketCap: e.target.value as any}
                })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}
              >
                <option value="large">大盘股</option>
                <option value="mid">中盘股</option>
                <option value="small">小盘股</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1f2937', marginBottom: '8px' }}>
                关注程度
              </label>
              <select
                value={formData.tags.watchLevel}
                onChange={(e) => setFormData({
                  ...formData,
                  tags: {...formData.tags, watchLevel: e.target.value as any}
                })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}
              >
                <option value="high">重点关注</option>
                <option value="medium">一般关注</option>
                <option value="low">观察中</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1f2937', marginBottom: '8px' }}>
              当前价格（可选）
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.currentPrice || ''}
              onChange={(e) => setFormData({...formData, currentPrice: parseFloat(e.target.value) || 0})}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
              placeholder="如：150.25"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1f2937', marginBottom: '8px' }}>
              备注
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                resize: 'vertical'
              }}
              placeholder="添加关于这只股票的备注..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px' }}>
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
            >
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              {stock ? '更新' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}