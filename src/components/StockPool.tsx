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
  TrendingDown,
  Filter,
  X
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
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '24px',
      padding: '0 8px'
    }}>
      {/* 页面标题 */}
      <div className="card p-6 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold gradient-text mb-1">
            股票池
          </h2>
          <p className="text-sm text-secondary">
            第{page}页 · 共{total}只股票 · {filteredStocks.length}只已筛选
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          <span>添加股票</span>
        </button>
      </div>

      {/* 搜索和筛选 */}
      <div className="card p-6">
        {/* 搜索栏 */}
        <div className="relative mb-6">
          <Search 
            size={20} 
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-tertiary" 
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-12 h-12 text-base"
            placeholder="搜索股票代码或名称 (如: AAPL, 苹果, TSLA)"
          />
        </div>

        {/* 快速筛选 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <select
            value={selectedMarket}
            onChange={(e) => setSelectedMarket(e.target.value)}
            className="input h-12"
          >
            <option value="">所有市场</option>
            <option value="US">🇺🇸 美股</option>
            <option value="HK">🇭🇰 港股</option>
            <option value="CN">🇨🇳 A股</option>
          </select>

          <select
            value={selectedWatchLevel}
            onChange={(e) => setSelectedWatchLevel(e.target.value)}
            className="input h-12"
          >
            <option value="">所有关注度</option>
            <option value="high">⭐ 重点关注</option>
            <option value="medium">👀 一般关注</option>
            <option value="low">📝 观察中</option>
          </select>

          <button
            onClick={clearFilters}
            className="btn btn-secondary h-12 flex items-center justify-center gap-2"
          >
            <Filter size={16} />
            清除筛选
          </button>
        </div>

        {/* 概念标签 */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-lg font-semibold text-primary">
              概念筛选
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-border-primary to-transparent" />
          </div>
          
          <div className="flex flex-wrap gap-3 mb-4">
            <button
              onClick={() => { 
                setSelectedConcept(''); 
                if (onConceptChange) onConceptChange(''); 
              }}
              className={`tag ${selectedConcept === '' ? 'tag-primary' : ''}`}
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
                className="tag"
                style={{
                  background: selectedConcept === concept.id 
                    ? concept.color 
                    : `${concept.color}20`,
                  color: selectedConcept === concept.id ? 'var(--bg-primary)' : concept.color,
                  borderColor: concept.color
                }}
              >
                {concept.name} ({concept.stockCount})
              </button>
            ))}
          </div>
          
          <div className="text-sm text-secondary font-medium">
            💡 显示 {filteredStocks.length} / {total || updatedStocks.length} 只股票
          </div>
        </div>
      </div>

      {/* 股票列表 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
        {filteredStocks.length === 0 ? (
          <div className="card col-span-full text-center p-16">
            <div className="text-6xl mb-4 opacity-50">
              📊
            </div>
            <h3 className="text-xl font-semibold text-primary mb-2">
              暂无股票数据
            </h3>
            <p className="text-secondary mb-6">
              开始添加您的第一只股票，建立您的投资组合
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn btn-primary"
            >
              <Plus size={18} className="mr-2" />
              添加股票
            </button>
          </div>
        ) : (
          filteredStocks.map((stock, index) => (
            <StockCard
              key={stock.id}
              stock={stock}
              concepts={concepts}
              conceptRelations={conceptRelations}
              onEdit={() => handleEditStock(stock)}
              onDelete={() => onDeleteStock(stock.id)}
              onSelect={() => onSelectStock(stock)}
              onViewDetail={() => onViewDetail(stock)}
              index={index}
            />
          ))
        )}
      </div>

      {/* 分页控件 */}
      {filteredStocks.length > 0 && (
        <div className="card p-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              className="btn btn-secondary"
              disabled={page <= 1}
              onClick={() => onPageChange && onPageChange(page - 1)}
            >
              上一页
            </button>
            <span className="text-sm text-secondary font-medium">
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
          <div className="flex items-center gap-3">
            <span className="text-sm text-secondary font-medium">
              每页显示
            </span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange && onPageSizeChange(parseInt(e.target.value, 10))}
              className="input w-20 px-2 py-1"
            >
              {[20, 50, 100].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </div>
      )}

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

// 现代化股票卡片组件
function StockCard({
  stock,
  concepts,
  conceptRelations,
  onEdit,
  onDelete,
  onSelect,
  onViewDetail,
  index
}: {
  stock: Stock;
  concepts: Concept[];
  conceptRelations: ConceptStockRelation[];
  onEdit: () => void;
  onDelete: () => void;
  onSelect: () => void;
  onViewDetail: () => void;
  index: number;
}) {
  const getWatchLevelIcon = (level: string) => {
    switch (level) {
      case 'high': return <Star size={16} style={{ color: 'var(--warning)', fill: 'var(--warning)' }} />;
      case 'medium': return <Star size={16} style={{ color: 'var(--text-secondary)' }} />;
      case 'low': return <StarOff size={16} style={{ color: 'var(--text-secondary)' }} />;
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

  const priceChange = stock.priceChange || 0;
  const priceChangePercent = stock.priceChangePercent || 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="card card-interactive relative overflow-hidden">
      {/* 状态指示条 */}
      <div 
        className={`absolute top-0 left-0 right-0 h-1 ${isPositive ? 'bg-success' : 'bg-danger'}`}
        style={{
          background: isPositive 
            ? 'linear-gradient(90deg, var(--color-success), #00cc6a)'
            : 'linear-gradient(90deg, var(--color-danger), #e63946)'
        }}
      />

      <div style={{ padding: '24px' }}>
        {/* 头部信息 */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          justifyContent: 'space-between', 
          marginBottom: '16px' 
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              marginBottom: '8px' 
            }}>
              <span style={{ fontSize: '24px' }}>
                {getMarketFlag(stock.market)}
              </span>
              <div>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '700', 
                  color: 'var(--text-primary)', 
                  margin: 0,
                  lineHeight: 1.2
                }}>
                  {stock.name}
                </h3>
                <span style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  fontFamily: 'Monaco, monospace',
                  fontWeight: '500'
                }}>
                  {stock.symbol}
                </span>
              </div>
            </div>

            {/* 概念标签 */}
            {(() => {
              const stockConcepts = conceptRelations
                .filter(rel => rel.stockId === stock.symbol)
                .map(rel => concepts.find(concept => concept.id === rel.conceptId))
                .filter(Boolean) as Concept[];
              
              return stockConcepts.length > 0 && (
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '6px', 
                  marginBottom: '16px' 
                }}>
                  {stockConcepts.slice(0, 3).map((concept) => (
                    <span
                      key={concept.id}
                      className="tag"
                      style={{
                        background: `${concept.color}20`,
                        color: concept.color,
                        border: `1px solid ${concept.color}40`,
                        fontSize: '11px',
                        padding: '4px 8px'
                      }}
                    >
                      {concept.name}
                    </span>
                  ))}
                  {stockConcepts.length > 3 && (
                    <span className="tag" style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                      fontSize: '11px',
                      padding: '4px 8px'
                    }}>
                      +{stockConcepts.length - 3}
                    </span>
                  )}
                </div>
              );
            })()}
          </div>

          {/* 操作按钮 */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onEdit}
              className="btn btn-secondary"
              style={{
                width: '36px',
                height: '36px',
                padding: 0,
                minWidth: 'auto'
              }}
              title="编辑"
            >
              <Edit3 size={16} />
            </button>
            <button
              onClick={onDelete}
              className="btn btn-danger"
              style={{
                width: '36px',
                height: '36px',
                padding: 0,
                minWidth: 'auto'
              }}
              title="删除"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* 价格信息 */}
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <div style={{
            fontSize: '28px',
            fontWeight: '700',
            color: 'var(--text-primary)',
            fontFamily: 'Monaco, monospace',
            marginBottom: '4px'
          }}>
            ${stock.currentPrice?.toFixed(2) || '0.00'}
          </div>
          {(priceChange !== 0 || priceChangePercent !== 0) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: isPositive ? 'var(--success)' : 'var(--danger)',
              fontWeight: '600'
            }}>
              {getPriceChangeIcon(priceChange)}
              <span>
                {isPositive ? '+' : ''}{priceChange.toFixed(2)}
              </span>
              <span style={{ fontFamily: 'Monaco, monospace' }}>
                ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>

        {/* 操作区域 */}
        <div style={{ 
          display: 'flex', 
          gap: '12px',
          marginBottom: '16px'
        }}>
          <button
            onClick={onViewDetail}
            className="btn btn-secondary"
            style={{ flex: 1 }}
          >
            查看详情
          </button>
          <button
            onClick={onSelect}
            className="btn btn-success"
            style={{ flex: 1 }}
          >
            交易计划
          </button>
        </div>

        {/* 底部信息 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '16px',
          borderTop: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {getWatchLevelIcon(stock.tags.watchLevel || 'medium')}
            <span style={{ 
              fontSize: '13px', 
              color: 'var(--text-secondary)',
              fontWeight: '500'
            }}>
              {stock.tags.marketCap === 'large' ? '大盘股' : 
               stock.tags.marketCap === 'mid' ? '中盘股' : 
               stock.tags.marketCap === 'small' ? '小盘股' : '--'}
            </span>
          </div>
          <div style={{ 
            fontSize: '13px', 
            color: 'var(--text-secondary)',
            fontFamily: 'Monaco, monospace'
          }}>
            {stock.volume ? `成交量: ${stock.volume}` : '--'}
          </div>
        </div>
      </div>
    </div>
  );
}

// 现代化表单组件
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
      background: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: '32px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: 'var(--text-primary)',
            margin: 0
          }}>
            {stock ? '编辑股票' : '添加股票'}
          </h2>
          <button
            onClick={onCancel}
            className="btn btn-secondary"
            style={{
              width: '40px',
              height: '40px',
              padding: 0,
              minWidth: 'auto'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '20px' 
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '16px' 
          }}>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '600', 
                color: 'var(--text-primary)', 
                marginBottom: '8px' 
              }}>
                股票代码 *
              </label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
                className="input"
                placeholder="如：AAPL"
                required
              />
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '600', 
                color: 'var(--text-primary)', 
                marginBottom: '8px' 
              }}>
                股票名称 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="input"
                placeholder="如：苹果公司"
                required
              />
            </div>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr 1fr', 
            gap: '16px' 
          }}>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '600', 
                color: 'var(--text-primary)', 
                marginBottom: '8px' 
              }}>
                市场
              </label>
              <select
                value={formData.market}
                onChange={(e) => setFormData({...formData, market: e.target.value as any})}
                className="input"
              >
                <option value="US">🇺🇸 美股</option>
                <option value="HK">🇭🇰 港股</option>
                <option value="CN">🇨🇳 A股</option>
              </select>
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '600', 
                color: 'var(--text-primary)', 
                marginBottom: '8px' 
              }}>
                市值规模
              </label>
              <select
                value={formData.tags.marketCap}
                onChange={(e) => setFormData({
                  ...formData,
                  tags: {...formData.tags, marketCap: e.target.value as any}
                })}
                className="input"
              >
                <option value="large">大盘股</option>
                <option value="mid">中盘股</option>
                <option value="small">小盘股</option>
              </select>
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '600', 
                color: 'var(--text-primary)', 
                marginBottom: '8px' 
              }}>
                关注程度
              </label>
              <select
                value={formData.tags.watchLevel}
                onChange={(e) => setFormData({
                  ...formData,
                  tags: {...formData.tags, watchLevel: e.target.value as any}
                })}
                className="input"
              >
                <option value="high">⭐ 重点关注</option>
                <option value="medium">👀 一般关注</option>
                <option value="low">📝 观察中</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600', 
              color: 'var(--text-primary)', 
              marginBottom: '8px' 
            }}>
              当前价格（可选）
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.currentPrice || ''}
              onChange={(e) => setFormData({...formData, currentPrice: parseFloat(e.target.value) || 0})}
              className="input"
              placeholder="如：150.25"
            />
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600', 
              color: 'var(--text-primary)', 
              marginBottom: '8px' 
            }}>
              备注
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
              className="input"
              style={{ resize: 'vertical', minHeight: '80px' }}
              placeholder="添加关于这只股票的备注..."
            />
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '12px', 
            paddingTop: '16px',
            borderTop: '1px solid var(--border)'
          }}>
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
              {stock ? '更新股票' : '添加股票'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}