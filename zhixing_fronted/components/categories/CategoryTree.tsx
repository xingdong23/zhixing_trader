"use client";

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Plus, Edit2, Trash2, Folder, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface CategoryNode {
  id: number;
  category_id: string;
  name: string;
  parent_id: string | null;
  path: string;
  level: number;
  sort_order: number;
  icon: string | null;
  color: string | null;
  description: string | null;
  stock_count: number;
  total_stock_count: number;
  is_active: boolean;
  is_custom: boolean;
  children: CategoryNode[];
  avg_change_percent?: number;
  rising_count?: number;
  falling_count?: number;
}

interface CategoryTreeProps {
  onSelectCategory?: (category: CategoryNode) => void;
  showHeatmap?: boolean;
}

export default function CategoryTree({ onSelectCategory, showHeatmap = false }: CategoryTreeProps) {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [parentCategory, setParentCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:8000/api/v1/categories/');
      const result = await response.json();
      
      if (result.success) {
        setCategories(result.data);
        // 默认展开根节点
        const rootIds = result.data.map((cat: CategoryNode) => cat.category_id);
        setExpandedNodes(new Set(rootIds));
      }
    } catch (error) {
      console.error('获取分类失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleNode = (categoryId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleSelectNode = (category: CategoryNode) => {
    setSelectedNode(category.category_id);
    if (onSelectCategory) {
      onSelectCategory(category);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const response = await fetch('http://localhost:8000/api/v1/categories/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCategoryName,
          parent_id: parentCategory,
          sort_order: 0,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setNewCategoryName('');
        setIsAdding(false);
        setParentCategory(null);
        fetchCategories();
      }
    } catch (error) {
      console.error('添加分类失败:', error);
    }
  };

  const handleDeleteCategory = async (categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('确定要删除这个分类吗？')) return;

    try {
      const response = await fetch(`http://localhost:8000/api/v1/categories/${categoryId}?force=false`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        fetchCategories();
      }
    } catch (error) {
      console.error('删除分类失败:', error);
    }
  };

  const getChangeColor = (changePercent: number | undefined) => {
    if (changePercent === undefined || changePercent === null) return 'text-gray-500';
    if (changePercent > 0) return 'text-red-600';
    if (changePercent < 0) return 'text-green-600';
    return 'text-gray-500';
  };

  const getChangeBackground = (changePercent: number | undefined) => {
    if (!showHeatmap || changePercent === undefined || changePercent === null) return '';
    
    const intensity = Math.min(Math.abs(changePercent) / 10, 1);
    
    if (changePercent > 0) {
      return `rgba(220, 38, 38, ${intensity * 0.2})`;
    } else if (changePercent < 0) {
      return `rgba(22, 163, 74, ${intensity * 0.2})`;
    }
    return '';
  };

  const renderTreeNode = (node: CategoryNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.category_id);
    const isSelected = selectedNode === node.category_id;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.category_id} className="select-none">
        <div
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer
            transition-all duration-200 hover:bg-gray-50
            ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''}
          `}
          style={{
            marginLeft: `${level * 20}px`,
            backgroundColor: showHeatmap ? getChangeBackground(node.avg_change_percent) : undefined,
          }}
          onClick={() => handleSelectNode(node)}
        >
          {/* 展开/收起按钮 */}
          <div
            className="w-5 h-5 flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) toggleNode(node.category_id);
            }}
          >
            {hasChildren && (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )
            )}
          </div>

          {/* 文件夹图标 */}
          <div className="flex-shrink-0">
            {isExpanded ? (
              <FolderOpen className="w-5 h-5 text-yellow-500" />
            ) : (
              <Folder className="w-5 h-5 text-yellow-600" />
            )}
          </div>

          {/* 分类名称 */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className="font-medium truncate">{node.name}</span>
            <span className="text-xs text-gray-500 flex-shrink-0">
              ({node.total_stock_count})
            </span>
          </div>

          {/* 涨跌幅显示 */}
          {showHeatmap && node.avg_change_percent !== undefined && (
            <div className={`text-sm font-semibold ${getChangeColor(node.avg_change_percent)}`}>
              {node.avg_change_percent > 0 ? '+' : ''}
              {node.avg_change_percent.toFixed(2)}%
            </div>
          )}

          {/* 上涨/下跌数量 */}
          {showHeatmap && (node.rising_count !== undefined || node.falling_count !== undefined) && (
            <div className="flex gap-2 text-xs">
              <span className="text-red-600">↑{node.rising_count || 0}</span>
              <span className="text-green-600">↓{node.falling_count || 0}</span>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                setParentCategory(node.category_id);
                setIsAdding(true);
              }}
            >
              <Plus className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
              onClick={(e) => handleDeleteCategory(node.category_id, e)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* 子节点 */}
        {isExpanded && hasChildren && (
          <div className="mt-1">
            {node.children.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">股票分类树</h2>
        <Button
          size="sm"
          onClick={() => {
            setParentCategory(null);
            setIsAdding(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          添加根分类
        </Button>
      </div>

      {/* 添加分类表单 */}
      {isAdding && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <Input
            placeholder="输入分类名称"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleAddCategory();
            }}
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={handleAddCategory}>
              确认
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsAdding(false);
                setNewCategoryName('');
                setParentCategory(null);
              }}
            >
              取消
            </Button>
          </div>
        </div>
      )}

      {/* 分类树 */}
      <div className="space-y-1 overflow-auto max-h-[600px]">
        {categories.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            暂无分类，点击上方按钮添加
          </div>
        ) : (
          categories.map((node) => renderTreeNode(node))
        )}
      </div>
    </Card>
  );
}

