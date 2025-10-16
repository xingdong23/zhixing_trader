"use client";

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

interface CategoryNode {
  id: number;
  category_id: string;
  name: string;
  parent_id: string | null;
  path: string;
  level: number;
  icon: string | null;
  color: string | null;
  stock_count: number;
  total_stock_count: number;
  children: CategoryNode[];
  avg_change_percent?: number;
  rising_count?: number;
  falling_count?: number;
}

interface CategorySelectorProps {
  onSelectCategory?: (categoryId: string | null) => void;
  selectedCategoryId?: string | null;
  compact?: boolean;
}

export default function CategorySelector({ 
  onSelectCategory, 
  selectedCategoryId,
  compact = true 
}: CategorySelectorProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [showTree, setShowTree] = useState(true);

  useEffect(() => {
    fetchCategories();
    fetchHeatmapData();
  }, []);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:8000/api/v1/categories/');
      const result = await response.json();
      
      if (result.success) {
        setCategories(result.data);
        // 默认展开第一层
        const rootIds = result.data.map((cat: CategoryNode) => cat.category_id);
        setExpandedNodes(new Set(rootIds));
      }
    } catch (error) {
      console.error('获取分类失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHeatmapData = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/categories/heatmap/data');
      const result = await response.json();
      
      if (result.success) {
        const heatmapMap: { [key: string]: any } = {};
        result.data.forEach((item: any) => {
          heatmapMap[item.category_id] = {
            avg_change_percent: item.avg_change_percent,
            rising_count: item.rising_count,
            falling_count: item.falling_count,
          };
        });
        
        // 更新categories，合并热力图数据
        setCategories((prevCategories) => {
          const updateNode = (node: CategoryNode): CategoryNode => {
            const heatData = heatmapMap[node.category_id];
            return {
              ...node,
              avg_change_percent: heatData?.avg_change_percent,
              rising_count: heatData?.rising_count,
              falling_count: heatData?.falling_count,
              children: node.children.map(updateNode),
            };
          };
          return prevCategories.map(updateNode);
        });
      }
    } catch (error) {
      console.error('获取热力图数据失败:', error);
    }
  };

  const toggleNode = (categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleSelectCategory = (categoryId: string | null) => {
    if (onSelectCategory) {
      onSelectCategory(categoryId);
    }
  };

  const getChangeColor = (changePercent: number | undefined) => {
    if (changePercent === undefined || changePercent === null) return 'text-gray-500';
    if (changePercent > 0) return 'text-red-600';
    if (changePercent < 0) return 'text-green-600';
    return 'text-gray-500';
  };

  const renderCompactNode = (node: CategoryNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.category_id);
    const isSelected = selectedCategoryId === node.category_id;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.category_id}>
        <div
          className={`
            flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer
            transition-colors text-sm
            ${isSelected ? 'bg-blue-100 border-l-2 border-blue-500' : 'hover:bg-gray-50'}
          `}
          style={{ marginLeft: `${level * 12}px` }}
          onClick={() => handleSelectCategory(node.category_id)}
        >
          {/* 展开按钮 */}
          <div
            className="w-4 h-4 flex items-center justify-center flex-shrink-0"
            onClick={(e) => hasChildren && toggleNode(node.category_id, e)}
          >
            {hasChildren && (
              isExpanded ? (
                <ChevronDown className="w-3 h-3 text-gray-500" />
              ) : (
                <ChevronRight className="w-3 h-3 text-gray-500" />
              )
            )}
          </div>

          {/* 图标 */}
          {node.icon ? (
            <span className="text-sm flex-shrink-0">{node.icon}</span>
          ) : (
            <Folder className="w-3 h-3 text-yellow-600 flex-shrink-0" />
          )}

          {/* 名称 */}
          <span className="font-medium truncate flex-1">{node.name}</span>

          {/* 股票数量 */}
          <span className="text-xs text-gray-500 flex-shrink-0">
            {node.total_stock_count}
          </span>

          {/* 涨跌幅 */}
          {node.avg_change_percent !== undefined && (
            <span className={`text-xs font-semibold flex-shrink-0 ${getChangeColor(node.avg_change_percent)}`}>
              {node.avg_change_percent > 0 ? '+' : ''}
              {node.avg_change_percent.toFixed(1)}%
            </span>
          )}
        </div>

        {/* 子节点 */}
        {isExpanded && hasChildren && (
          <div>
            {node.children.map((child) => renderCompactNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderBadgeMode = (nodes: CategoryNode[]) => {
    const flattenNodes = (nodes: CategoryNode[]): CategoryNode[] => {
      let result: CategoryNode[] = [];
      for (const node of nodes) {
        result.push(node);
        if (node.children && node.children.length > 0) {
          result = result.concat(flattenNodes(node.children));
        }
      }
      return result;
    };

    const allNodes = flattenNodes(nodes);

    return (
      <div className="flex flex-wrap gap-2">
        {allNodes.map((node) => (
          <Badge
            key={node.category_id}
            variant={selectedCategoryId === node.category_id ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => handleSelectCategory(node.category_id)}
          >
            {node.icon && <span className="mr-1">{node.icon}</span>}
            {node.name}
            <span className="ml-1 text-xs">({node.total_stock_count})</span>
            {node.avg_change_percent !== undefined && (
              <span className={`ml-1 text-xs font-semibold ${getChangeColor(node.avg_change_percent)}`}>
                {node.avg_change_percent > 0 ? '+' : ''}
                {node.avg_change_percent.toFixed(1)}%
              </span>
            )}
          </Badge>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        暂无分类，
        <Button
          variant="link"
          size="sm"
          className="px-1"
          onClick={() => router.push('/categories')}
        >
          前往创建
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">股票分类:</span>
          {selectedCategoryId && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs"
              onClick={() => handleSelectCategory(null)}
            >
              清除筛选
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => setShowTree(!showTree)}
          >
            {showTree ? '标签模式' : '树形模式'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => router.push('/categories')}
          >
            <LayoutGrid className="w-3 h-3 mr-1" />
            管理分类
          </Button>
        </div>
      </div>

      {showTree ? (
        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50">
          {categories.map((node) => renderCompactNode(node))}
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
          {renderBadgeMode(categories)}
        </div>
      )}
    </div>
  );
}

