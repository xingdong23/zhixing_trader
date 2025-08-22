'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Plus, Edit2, Trash2, Tag, Search, BarChart3, X, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { ConceptService } from '@/services/conceptService';
import { StockPoolService } from '@/services/stockPoolService';
import { Concept, Stock } from '@/types';

interface ConceptManagerProps {
  onConceptSelect?: (conceptId: string) => void;
}

export function ConceptManager({ onConceptSelect }: ConceptManagerProps = {}) {
  // 简化状态管理
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [expandedConcepts, setExpandedConcepts] = useState<Set<string>>(new Set());
  const [editingConcept, setEditingConcept] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newConceptName, setNewConceptName] = useState('');
  const [selectedStocks, setSelectedStocks] = useState<Set<string>>(new Set());
  const [showStockSelector, setShowStockSelector] = useState<string | null>(null);

  // 数据加载
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [loadedConcepts, loadedStocks] = await Promise.all([
        ConceptService.getConcepts(),
        StockPoolService.getStocksFromAPI()
      ]);
      setConcepts(loadedConcepts);
      setStocks(loadedStocks);
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  };

  // 筛选概念
  const filteredConcepts = concepts.filter(concept =>
    concept.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 获取概念下的股票
  const getConceptStocks = (conceptId: string): Stock[] => {
    const concept = concepts.find(c => c.id === conceptId);
    if (!concept) return [];
    return stocks.filter(stock => concept.stockIds.includes(stock.id));
  };

  // 获取可添加的股票
  const getAvailableStocks = (conceptId: string): Stock[] => {
    const conceptStockIds = getConceptStocks(conceptId).map(stock => stock.id);
    return stocks.filter(stock => !conceptStockIds.includes(stock.id));
  };

  // 创建概念
  const handleCreateConcept = async () => {
    if (!newConceptName.trim()) return;
    try {
      const newConcept = await ConceptService.createConcept(newConceptName.trim());
      setConcepts(prev => [...prev, newConcept]);
      setNewConceptName('');
      setShowCreateForm(false);
    } catch (error) {
      alert('创建概念失败');
    }
  };

  // 更新概念
  const handleUpdateConcept = async (id: string, name: string) => {
    try {
      await ConceptService.updateConcept(id, { name: name.trim() });
      setEditingConcept(null);
      loadData();
    } catch (error) {
      alert('更新概念失败');
    }
  };

  // 删除概念
  const handleDeleteConcept = async (id: string, name: string) => {
    if (!confirm(`确定要删除概念"${name}"吗？`)) return;
    try {
      await ConceptService.deleteConcept(id);
      loadData();
    } catch (error) {
      alert('删除概念失败');
    }
  };

  // 添加股票到概念
  const handleAddStocksToConcept = async (conceptId: string) => {
    if (selectedStocks.size === 0) return;
    try {
      await ConceptService.addStocksToConceptAPI(conceptId, Array.from(selectedStocks));
      setSelectedStocks(new Set());
      setShowStockSelector(null);
      loadData();
    } catch (error) {
      alert('添加股票失败');
    }
  };

  // 移除股票
  const handleRemoveStock = async (conceptId: string, stockId: string) => {
    try {
      await ConceptService.removeStockFromConcept(conceptId, stockId);
      loadData();
    } catch (error) {
      alert('移除股票失败');
    }
  };

  // 切换展开状态
  const toggleExpansion = (conceptId: string) => {
    const newExpanded = new Set(expandedConcepts);
    if (newExpanded.has(conceptId)) {
      newExpanded.delete(conceptId);
    } else {
      newExpanded.add(conceptId);
    }
    setExpandedConcepts(newExpanded);
  };

  return (
    <div className="space-y-6">
      {/* 统计概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            概念统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="text-xl font-bold text-primary">{concepts.length}</div>
              <div className="text-xs text-text-secondary">概念数量</div>
            </div>
            <div className="text-center p-3 bg-success/10 border border-success/20 rounded-lg">
              <div className="text-xl font-bold text-success">
                {concepts.reduce((sum, c) => sum + c.stockCount, 0)}
              </div>
              <div className="text-xs text-text-secondary">关联股票</div>
            </div>
            <div className="text-center p-3 bg-info/10 border border-info/20 rounded-lg">
              <div className="text-xl font-bold text-info">
                {concepts.length > 0 ? Math.round(concepts.reduce((sum, c) => sum + c.stockCount, 0) / concepts.length * 10) / 10 : 0}
              </div>
              <div className="text-xs text-text-secondary">平均股票数</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 概念管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            概念管理
          </CardTitle>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                placeholder="搜索概念..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-unified"
              />
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-unified-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              创建概念
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {/* 创建表单 */}
          {showCreateForm && (
            <div className="mb-6 p-4 border border-border rounded-lg bg-surface/50">
              <h4 className="font-semibold mb-3 text-text-primary">创建新概念</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="概念名称"
                  value={newConceptName}
                  onChange={(e) => setNewConceptName(e.target.value)}
                  className="input-unified flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateConcept()}
                />
                <button
                  onClick={handleCreateConcept}
                  disabled={!newConceptName.trim()}
                  className="p-2 bg-success/20 border border-success/30 text-success rounded hover:bg-success/30 disabled:bg-surface disabled:text-text-muted disabled:border-border"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewConceptName('');
                  }}
                  className="p-2 bg-surface border border text-text-secondary rounded hover:bg-surface-light"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* 概念列表 */}
          {filteredConcepts.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{searchQuery ? '没有找到匹配的概念' : '暂无概念标签'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredConcepts.map((concept) => {
                const conceptStocks = getConceptStocks(concept.id);
                const isExpanded = expandedConcepts.has(concept.id);
                const isEditing = editingConcept === concept.id;

                return (
                  <div key={concept.id} className="border border rounded-lg bg-surface/30">
                    {/* 概念标题 */}
                    <div className="p-4 bg-surface/50 flex items-center justify-between border-b border">
                      <div className="flex items-center gap-3 flex-1">
                        <button
                          onClick={() => toggleExpansion(concept.id)}
                          className="text-text-muted hover:text-text-primary transition-colors"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: concept.color }}></div>

                        {isEditing ? (
                          <input
                            type="text"
                            defaultValue={concept.name}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleUpdateConcept(concept.id, (e.target as HTMLInputElement).value);
                              }
                            }}
                            className="input-unified flex-1"
                            autoFocus
                          />
                        ) : (
                          <div className="flex-1">
                            <h3 className="font-semibold text-text-primary">{concept.name}</h3>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-secondary">{concept.stockCount} 只股票</span>
                        
                        {isEditing ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                const input = document.querySelector(`input[defaultValue="${concept.name}"]`) as HTMLInputElement;
                                handleUpdateConcept(concept.id, input?.value || concept.name);
                              }}
                              className="p-1 text-success hover:bg-success/10 rounded transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingConcept(null)}
                              className="p-1 text-text-secondary hover:bg-surface rounded transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditingConcept(concept.id)}
                              className="p-1 text-info hover:bg-info/10 rounded transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteConcept(concept.id, concept.name)}
                              className="p-1 text-danger hover:bg-danger/10 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 展开的股票列表 */}
                    {isExpanded && (
                      <div className="border-t">
                        {/* 添加股票 */}
                        <div className="p-3 border-b border bg-surface/30">
                          <button
                            onClick={() => setShowStockSelector(concept.id)}
                            className="btn-unified-primary text-sm"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            添加股票
                          </button>
                        </div>

                        {/* 股票选择器 */}
                        {showStockSelector === concept.id && (
                          <div className="p-3 border-b border bg-info/5">
                            <h5 className="font-medium mb-2 text-text-primary">选择股票：</h5>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                              {getAvailableStocks(concept.id).map(stock => (
                                <label key={stock.id} className="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:bg-surface/50 p-1 rounded">
                                  <input
                                    type="checkbox"
                                    checked={selectedStocks.has(stock.id)}
                                    onChange={(e) => {
                                      const newSelected = new Set(selectedStocks);
                                      if (e.target.checked) {
                                        newSelected.add(stock.id);
                                      } else {
                                        newSelected.delete(stock.id);
                                      }
                                      setSelectedStocks(newSelected);
                                    }}
                                    className="accent-primary"
                                  />
                                  <span className="font-mono text-xs text-text-secondary">{stock.symbol}</span>
                                  <span className="text-text-primary">{stock.name}</span>
                                </label>
                              ))}
                            </div>
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => handleAddStocksToConcept(concept.id)}
                                disabled={selectedStocks.size === 0}
                                className="px-3 py-1 text-sm bg-success/20 border border-success/30 text-success rounded hover:bg-success/30 disabled:bg-surface disabled:text-text-muted disabled:border-border"
                              >
                                添加 ({selectedStocks.size})
                              </button>
                              <button
                                onClick={() => {
                                  setShowStockSelector(null);
                                  setSelectedStocks(new Set());
                                }}
                                className="btn-unified-secondary text-sm"
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 股票列表 */}
                        <div className="max-h-60 overflow-y-auto">
                          {conceptStocks.length === 0 ? (
                            <div className="p-4 text-center text-text-muted text-sm">
                              暂无股票
                            </div>
                          ) : (
                            <div className="divide-y divide-border">
                              {conceptStocks.map(stock => (
                                <div key={stock.id} className="p-3 flex items-center justify-between hover:bg-surface/30 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <span className="font-mono text-sm text-text-secondary">{stock.symbol}</span>
                                    <span className="font-medium text-text-primary">{stock.name}</span>
                                    <span className={`px-2 py-1 rounded text-xs border ${
                                      stock.market === 'US' ? 'bg-info/10 text-info border-info/30' :
                                      stock.market === 'HK' ? 'bg-success/10 text-success border-success/30' :
                                      'bg-danger/10 text-danger border-danger/30'
                                    }`}>
                                      {stock.market}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveStock(concept.id, stock.id)}
                                    className="p-1 text-danger hover:bg-danger/10 rounded transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
