'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  Plus, Edit2, Trash2, Tag, Search, Users, BarChart3, 
  X, Check, AlertCircle, ChevronDown, ChevronRight 
} from 'lucide-react';
import { ConceptService } from '@/services/conceptService';
import { StockPoolService } from '@/services/stockPoolService';
import { Concept, Stock } from '@/types';

interface ConceptManagerProps {
  onConceptSelect?: (conceptId: string) => void;
}

export function ConceptManager({ onConceptSelect }: ConceptManagerProps) {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [expandedConcepts, setExpandedConcepts] = useState<Set<string>>(new Set());
  const [editingConcept, setEditingConcept] = useState<string | null>(null);
  const [newConceptName, setNewConceptName] = useState('');
  const [newConceptDescription, setNewConceptDescription] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStocks, setSelectedStocks] = useState<Set<string>>(new Set());
  const [showStockSelector, setShowStockSelector] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    totalConcepts: number;
    totalRelations: number;
    avgStocksPerConcept: number;
    topConcepts: Array<{ name: string; stockCount: number }>;
  } | null>(null);
  const [conceptStocks, setConceptStocks] = useState<Record<string, Stock[]>>({});

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // 只从后端数据库获取数据
      const loadedConcepts = await ConceptService.getConcepts();
      const loadedStocks = await StockPoolService.getStocksFromAPI(); // 从API获取股票数据

      setConcepts(loadedConcepts);
      setStocks(loadedStocks);

      // 基于已加载的数据计算统计信息，避免重复API调用
      const totalConcepts = loadedConcepts.length;
      const totalRelations = loadedConcepts.reduce((sum, concept) => sum + concept.stockCount, 0);
      const avgStocksPerConcept = totalConcepts > 0 ? totalRelations / totalConcepts : 0;
      const topConcepts = loadedConcepts
        .sort((a, b) => b.stockCount - a.stockCount)
        .slice(0, 5)
        .map(c => ({ name: c.name, stockCount: c.stockCount }));

      setStats({
        totalConcepts,
        totalRelations,
        avgStocksPerConcept: Math.round(avgStocksPerConcept * 10) / 10,
        topConcepts
      });

      // 概念的股票关联关系已经在概念数据中包含了stockIds
      const conceptStocksMap: Record<string, Stock[]> = {};
      for (const concept of loadedConcepts) {
        // 直接使用概念中的stockIds，不需要额外API调用
        conceptStocksMap[concept.id] = loadedStocks.filter(stock =>
          concept.stockIds.includes(stock.id)
        );
      }
      setConceptStocks(conceptStocksMap);
    } catch (error) {
      console.error('加载概念数据失败:', error);
    }
  };

  // 筛选概念
  const filteredConcepts = concepts.filter(concept =>
    concept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (concept.description && concept.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // 创建概念
  const handleCreateConcept = async () => {
    if (!newConceptName.trim()) return;

    try {
      const newConcept = await ConceptService.createConcept(newConceptName.trim(), newConceptDescription.trim() || undefined);
      setNewConceptName('');
      setNewConceptDescription('');
      setShowCreateForm(false);

      // 只更新概念列表，不重新加载所有数据
      setConcepts(prev => [...prev, newConcept]);
    } catch (error) {
      alert(error instanceof Error ? error.message : '创建概念失败');
    }
  };

  // 更新概念
  const handleUpdateConcept = (id: string, name: string, description?: string) => {
    try {
      ConceptService.updateConcept(id, { name: name.trim(), description: description?.trim() });
      setEditingConcept(null);
      loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : '更新概念失败');
    }
  };

  // 删除概念
  const handleDeleteConcept = (id: string, name: string) => {
    if (confirm(`确定要删除概念"${name}"吗？这将同时移除所有相关的股票关联。`)) {
      try {
        ConceptService.deleteConcept(id);
        loadData();
      } catch (error) {
        alert(error instanceof Error ? error.message : '删除概念失败');
      }
    }
  };

  // 切换概念展开状态
  const toggleConceptExpansion = (conceptId: string) => {
    const newExpanded = new Set(expandedConcepts);
    if (newExpanded.has(conceptId)) {
      newExpanded.delete(conceptId);
    } else {
      newExpanded.add(conceptId);
    }
    setExpandedConcepts(newExpanded);
  };

  // 获取概念下的股票
  const getConceptStocks = (conceptId: string): Stock[] => {
    return conceptStocks[conceptId] || [];
  };

  // 获取未关联到指定概念的股票
  const getAvailableStocks = (conceptId: string): Stock[] => {
    const conceptStockIds = (conceptStocks[conceptId] || []).map(stock => stock.id);
    return stocks.filter(stock => !conceptStockIds.includes(stock.id));
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
      alert(error instanceof Error ? error.message : '添加股票失败');
    }
  };

  // 从概念中移除股票
  const handleRemoveStockFromConcept = (conceptId: string, stockId: string) => {
    try {
      ConceptService.removeStockFromConcept(conceptId, stockId);
      loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : '移除股票失败');
    }
  };

  return (
    <div className="space-y-6">
      {/* 统计概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            概念标签统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats?.totalConcepts || 0}</div>
              <div className="text-sm text-blue-700">概念数量</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats?.totalRelations || 0}</div>
              <div className="text-sm text-green-700">关联关系</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats?.avgStocksPerConcept || 0}</div>
              <div className="text-sm text-purple-700">平均股票数</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-lg font-bold text-orange-600">
                {stats?.topConcepts?.[0]?.name || '无'}
              </div>
              <div className="text-sm text-orange-700">最大概念</div>
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
            {/* 搜索框 */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="搜索概念..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {/* 创建按钮 */}
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Plus className="w-4 h-4" />
              创建概念
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {/* 创建概念表单 */}
          {showCreateForm && (
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h4 className="font-semibold mb-3">创建新概念</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="概念名称（必填）"
                  value={newConceptName}
                  onChange={(e) => setNewConceptName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="概念描述（可选）"
                  value={newConceptDescription}
                  onChange={(e) => setNewConceptDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateConcept}
                    disabled={!newConceptName.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
                  >
                    <Check className="w-4 h-4" />
                    创建
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewConceptName('');
                      setNewConceptDescription('');
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    <X className="w-4 h-4" />
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 概念列表 */}
          {filteredConcepts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{searchQuery ? '没有找到匹配的概念' : '暂无概念标签'}</p>
              <p className="text-sm">点击"创建概念"开始添加</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredConcepts.map((concept) => {
                const conceptStocks = getConceptStocks(concept.id);
                const isExpanded = expandedConcepts.has(concept.id);
                const isEditing = editingConcept === concept.id;

                return (
                  <div key={concept.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* 概念标题 */}
                    <div className="p-4 bg-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <button
                          onClick={() => toggleConceptExpansion(concept.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: concept.color }}
                        ></div>

                        {isEditing ? (
                          <div className="flex-1 flex gap-2">
                            <input
                              type="text"
                              defaultValue={concept.name}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const target = e.target as HTMLInputElement;
                                  const descInput = target.nextElementSibling as HTMLInputElement;
                                  handleUpdateConcept(concept.id, target.value, descInput?.value);
                                }
                              }}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <input
                              type="text"
                              defaultValue={concept.description || ''}
                              placeholder="描述"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const target = e.target as HTMLInputElement;
                                  const nameInput = target.previousElementSibling as HTMLInputElement;
                                  handleUpdateConcept(concept.id, nameInput.value, target.value);
                                }
                              }}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                        ) : (
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">{concept.name}</h3>
                            {concept.description && (
                              <p className="text-sm text-gray-600">{concept.description}</p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          {concept.stockCount} 只股票
                        </span>
                        
                        {isEditing ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                const nameInput = document.querySelector(`input[defaultValue="${concept.name}"]`) as HTMLInputElement;
                                const descInput = nameInput?.nextElementSibling as HTMLInputElement;
                                handleUpdateConcept(concept.id, nameInput?.value || concept.name, descInput?.value);
                              }}
                              className="p-1 text-green-600 hover:bg-green-100 rounded"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingConcept(null)}
                              className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditingConcept(concept.id)}
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteConcept(concept.id, concept.name)}
                              className="p-1 text-red-600 hover:bg-red-100 rounded"
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
                        {/* 添加股票按钮 */}
                        <div className="p-3 border-b bg-white">
                          <button
                            onClick={() => setShowStockSelector(concept.id)}
                            className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            <Plus className="w-3 h-3" />
                            添加股票
                          </button>
                        </div>

                        {/* 股票选择器 */}
                        {showStockSelector === concept.id && (
                          <div className="p-3 border-b bg-blue-50">
                            <h5 className="font-medium mb-2">选择要添加的股票：</h5>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                              {getAvailableStocks(concept.id).map(stock => (
                                <label key={stock.id} className="flex items-center gap-2 text-sm">
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
                                  />
                                  <span className="font-mono text-xs">{stock.symbol}</span>
                                  <span>{stock.name}</span>
                                </label>
                              ))}
                            </div>
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => handleAddStocksToConcept(concept.id)}
                                disabled={selectedStocks.size === 0}
                                className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
                              >
                                添加 ({selectedStocks.size})
                              </button>
                              <button
                                onClick={() => {
                                  setShowStockSelector(null);
                                  setSelectedStocks(new Set());
                                }}
                                className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 股票列表 */}
                        <div className="max-h-60 overflow-y-auto">
                          {conceptStocks.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              暂无股票，点击"添加股票"开始添加
                            </div>
                          ) : (
                            <div className="divide-y">
                              {conceptStocks.map(stock => (
                                <div key={stock.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                                  <div className="flex items-center gap-3">
                                    <span className="font-mono text-sm text-gray-600">{stock.symbol}</span>
                                    <span className="font-medium">{stock.name}</span>
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      stock.market === 'US' ? 'bg-blue-100 text-blue-800' :
                                      stock.market === 'HK' ? 'bg-green-100 text-green-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {stock.market}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveStockFromConcept(concept.id, stock.id)}
                                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                                    title="移除"
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
