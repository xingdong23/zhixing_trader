"use client";

import React, { useState, useEffect } from 'react';
import CategoryTree from '@/components/categories/CategoryTree';
import CategoryHeatmap from '@/components/categories/CategoryHeatmap';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutGrid, LayoutList, Search, Plus, Upload, Download } from 'lucide-react';

interface Stock {
  id: number;
  symbol: string;
  name: string;
  market: string;
  group_name: string;
}

export default function CategoriesPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryStocks, setCategoryStocks] = useState<Stock[]>([]);
  const [allStocks, setAllStocks] = useState<Stock[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'heatmap'>('tree');
  const [showAddStockDialog, setShowAddStockDialog] = useState(false);

  useEffect(() => {
    fetchAllStocks();
  }, []);

  useEffect(() => {
    if (selectedCategoryId) {
      fetchCategoryStocks(selectedCategoryId);
    }
  }, [selectedCategoryId]);

  const fetchAllStocks = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/stocks/?page=1&page_size=1000');
      const result = await response.json();
      if (result.success) {
        setAllStocks(result.data.stocks);
      }
    } catch (error) {
      console.error('获取股票列表失败:', error);
    }
  };

  const fetchCategoryStocks = async (categoryId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/categories/${categoryId}/stocks`);
      const result = await response.json();
      if (result.success) {
        setCategoryStocks(result.data.stocks);
      }
    } catch (error) {
      console.error('获取分类股票失败:', error);
    }
  };

  const handleAddStockToCategory = async (stockCode: string) => {
    if (!selectedCategoryId) return;

    try {
      const response = await fetch(`http://localhost:8000/api/v1/categories/${selectedCategoryId}/stocks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category_id: selectedCategoryId,
          stock_code: stockCode,
          weight: 1.0,
          is_primary: false,
        }),
      });

      const result = await response.json();
      if (result.success) {
        fetchCategoryStocks(selectedCategoryId);
      }
    } catch (error) {
      console.error('添加股票到分类失败:', error);
    }
  };

  const handleRemoveStockFromCategory = async (stockCode: string) => {
    if (!selectedCategoryId) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/categories/${selectedCategoryId}/stocks/${stockCode}`,
        {
          method: 'DELETE',
        }
      );

      const result = await response.json();
      if (result.success) {
        fetchCategoryStocks(selectedCategoryId);
      }
    } catch (error) {
      console.error('从分类移除股票失败:', error);
    }
  };

  const exportCategories = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/categories/?flat=true');
      const result = await response.json();
      
      if (result.success) {
        const dataStr = JSON.stringify(result.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `categories_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('导出分类失败:', error);
    }
  };

  const filteredStocks = allStocks.filter(
    (stock) =>
      stock.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      stock.symbol.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">股票分类管理</h1>
          <p className="text-gray-500 mt-1">
            多级分类树 + 实时热力图，快速定位投资机会
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={viewMode === 'tree' ? 'default' : 'outline'}
            onClick={() => setViewMode('tree')}
          >
            <LayoutList className="w-4 h-4 mr-2" />
            树形视图
          </Button>
          <Button
            variant={viewMode === 'heatmap' ? 'default' : 'outline'}
            onClick={() => setViewMode('heatmap')}
          >
            <LayoutGrid className="w-4 h-4 mr-2" />
            热力图
          </Button>
          <Button variant="outline" onClick={exportCategories}>
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：分类树/热力图 */}
        <div className="lg:col-span-2">
          {viewMode === 'tree' ? (
            <CategoryTree
              onSelectCategory={(category) => setSelectedCategoryId(category.category_id)}
              showHeatmap={true}
            />
          ) : (
            <CategoryHeatmap
              onSelectCategory={(categoryId) => setSelectedCategoryId(categoryId)}
            />
          )}
        </div>

        {/* 右侧：选中分类的股票列表 */}
        <div className="lg:col-span-1">
          <Card className="p-4 sticky top-6">
            <h3 className="text-lg font-bold mb-4">
              {selectedCategoryId ? '分类股票列表' : '请选择分类'}
            </h3>

            {selectedCategoryId ? (
              <>
                {/* 添加股票按钮 */}
                <Button
                  className="w-full mb-4"
                  onClick={() => setShowAddStockDialog(!showAddStockDialog)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  添加股票到分类
                </Button>

                {/* 添加股票对话框 */}
                {showAddStockDialog && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <Input
                      placeholder="搜索股票..."
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      className="mb-2"
                    />
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {filteredStocks.slice(0, 20).map((stock) => (
                        <div
                          key={stock.id}
                          className="flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer"
                          onClick={() => {
                            handleAddStockToCategory(stock.symbol);
                            setShowAddStockDialog(false);
                            setSearchKeyword('');
                          }}
                        >
                          <div>
                            <div className="font-medium">{stock.name}</div>
                            <div className="text-xs text-gray-500">{stock.symbol}</div>
                          </div>
                          <Plus className="w-4 h-4 text-blue-600" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 股票列表 */}
                <div className="space-y-2">
                  {categoryStocks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      该分类下暂无股票
                    </div>
                  ) : (
                    categoryStocks.map((stock) => (
                      <div
                        key={stock.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                      >
                        <div>
                          <div className="font-medium">{stock.name}</div>
                          <div className="text-xs text-gray-500">
                            {stock.symbol} · {stock.market}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleRemoveStockFromCategory(stock.symbol)}
                        >
                          移除
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                👈 点击左侧分类查看股票
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* 快速操作面板 */}
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4">快速操作</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button variant="outline" className="h-20 flex flex-col gap-2">
            <Plus className="w-6 h-6" />
            <span>创建分类</span>
          </Button>
          <Button variant="outline" className="h-20 flex flex-col gap-2">
            <Upload className="w-6 h-6" />
            <span>批量导入</span>
          </Button>
          <Button variant="outline" className="h-20 flex flex-col gap-2">
            <Download className="w-6 h-6" />
            <span>导出数据</span>
          </Button>
          <Button variant="outline" className="h-20 flex flex-col gap-2">
            <LayoutGrid className="w-6 h-6" />
            <span>查看热力图</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}

