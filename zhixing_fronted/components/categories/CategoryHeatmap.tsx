"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeatmapData {
  category_id: string;
  name: string;
  path: string;
  level: number;
  parent_id: string | null;
  stock_count: number;
  avg_change_percent: number;
  weighted_change_percent: number;
  total_market_value: number;
  rising_count: number;
  falling_count: number;
  unchanged_count: number;
  max_change_percent: number;
  min_change_percent: number;
  heat_level: number;
  color: string;
}

interface CategoryHeatmapProps {
  onSelectCategory?: (categoryId: string) => void;
}

export default function CategoryHeatmap({ onSelectCategory }: CategoryHeatmapProps) {
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'change' | 'count' | 'name'>('change');

  useEffect(() => {
    fetchHeatmapData();
  }, []);

  const fetchHeatmapData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:8000/api/v1/categories/heatmap/data');
      const result = await response.json();
      
      if (result.success) {
        setHeatmapData(result.data);
      }
    } catch (error) {
      console.error('获取热力图数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getHeatmapColor = (changePercent: number): string => {
    if (changePercent === 0) return 'bg-gray-200';
    
    const intensity = Math.min(Math.abs(changePercent) / 10, 1);
    
    if (changePercent > 0) {
      // 红色系（上涨）
      const red = Math.floor(220 + (255 - 220) * intensity);
      const green = Math.floor(38 * (1 - intensity));
      const blue = Math.floor(38 * (1 - intensity));
      return `rgb(${red}, ${green}, ${blue})`;
    } else {
      // 绿色系（下跌）
      const red = Math.floor(22 * (1 - intensity));
      const green = Math.floor(163 + (255 - 163) * intensity);
      const blue = Math.floor(74 * (1 - intensity));
      return `rgb(${red}, ${green}, ${blue})`;
    }
  };

  const getTextColor = (changePercent: number): string => {
    const absChange = Math.abs(changePercent);
    if (absChange > 5) return 'text-white';
    return 'text-gray-900';
  };

  const getSortedData = () => {
    const sorted = [...heatmapData];
    
    switch (sortBy) {
      case 'change':
        sorted.sort((a, b) => b.weighted_change_percent - a.weighted_change_percent);
        break;
      case 'count':
        sorted.sort((a, b) => b.stock_count - a.stock_count);
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    
    return sorted;
  };

  const getSize = (stockCount: number, maxCount: number): string => {
    const ratio = stockCount / maxCount;
    if (ratio > 0.7) return 'col-span-3 row-span-2';
    if (ratio > 0.4) return 'col-span-2 row-span-2';
    if (ratio > 0.2) return 'col-span-2';
    return 'col-span-1';
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

  const sortedData = getSortedData();
  const maxCount = Math.max(...heatmapData.map(d => d.stock_count), 1);

  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">分类热力图</h2>
          <p className="text-sm text-gray-500 mt-1">
            实时展示各分类涨跌幅情况，颜色越深变化越大
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={sortBy === 'change' ? 'default' : 'outline'}
            onClick={() => setSortBy('change')}
          >
            按涨幅
          </Button>
          <Button
            size="sm"
            variant={sortBy === 'count' ? 'default' : 'outline'}
            onClick={() => setSortBy('count')}
          >
            按数量
          </Button>
          <Button
            size="sm"
            variant={sortBy === 'name' ? 'default' : 'outline'}
            onClick={() => setSortBy('name')}
          >
            按名称
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchHeatmapData}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 图例 */}
      <div className="mb-4 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500"></div>
          <span>上涨</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500"></div>
          <span>下跌</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200"></div>
          <span>平盘</span>
        </div>
      </div>

      {/* 热力图网格 */}
      {heatmapData.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          暂无数据，请先添加分类和股票
        </div>
      ) : (
        <div className="grid grid-cols-6 gap-3 auto-rows-[120px]">
          {sortedData.map((item) => (
            <div
              key={item.category_id}
              className={`
                rounded-lg p-4 cursor-pointer
                transition-all duration-300 hover:scale-105 hover:shadow-xl
                ${getSize(item.stock_count, maxCount)}
              `}
              style={{
                backgroundColor: getHeatmapColor(item.weighted_change_percent),
              }}
              onClick={() => onSelectCategory && onSelectCategory(item.category_id)}
            >
              <div className={`h-full flex flex-col justify-between ${getTextColor(item.weighted_change_percent)}`}>
                {/* 分类名称 */}
                <div>
                  <h3 className="font-bold text-lg truncate">{item.name}</h3>
                  <p className="text-xs opacity-80 mt-1">
                    {item.stock_count} 只股票
                  </p>
                </div>

                {/* 涨跌幅 */}
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    {item.weighted_change_percent > 0 ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : item.weighted_change_percent < 0 ? (
                      <TrendingDown className="w-5 h-5" />
                    ) : (
                      <Minus className="w-5 h-5" />
                    )}
                    <span className="text-2xl font-bold">
                      {item.weighted_change_percent > 0 ? '+' : ''}
                      {item.weighted_change_percent.toFixed(2)}%
                    </span>
                  </div>

                  {/* 统计信息 */}
                  <div className="flex gap-3 mt-2 text-xs opacity-80">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {item.rising_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" />
                      {item.falling_count}
                    </span>
                  </div>

                  {/* 极值 */}
                  <div className="text-xs opacity-70 mt-1">
                    {item.max_change_percent.toFixed(2)}% ~ {item.min_change_percent.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 顶部涨跌榜 */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        {/* 涨幅榜 */}
        <Card className="p-4 bg-red-50">
          <h3 className="font-bold mb-3 text-red-700 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            涨幅榜 TOP 5
          </h3>
          <div className="space-y-2">
            {sortedData
              .filter(d => d.weighted_change_percent > 0)
              .slice(0, 5)
              .map((item, index) => (
                <div
                  key={item.category_id}
                  className="flex items-center justify-between text-sm cursor-pointer hover:bg-red-100 p-2 rounded"
                  onClick={() => onSelectCategory && onSelectCategory(item.category_id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-red-700">{index + 1}</span>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold text-red-600">
                    +{item.weighted_change_percent.toFixed(2)}%
                  </span>
                </div>
              ))}
          </div>
        </Card>

        {/* 跌幅榜 */}
        <Card className="p-4 bg-green-50">
          <h3 className="font-bold mb-3 text-green-700 flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            跌幅榜 TOP 5
          </h3>
          <div className="space-y-2">
            {[...sortedData]
              .filter(d => d.weighted_change_percent < 0)
              .sort((a, b) => a.weighted_change_percent - b.weighted_change_percent)
              .slice(0, 5)
              .map((item, index) => (
                <div
                  key={item.category_id}
                  className="flex items-center justify-between text-sm cursor-pointer hover:bg-green-100 p-2 rounded"
                  onClick={() => onSelectCategory && onSelectCategory(item.category_id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-green-700">{index + 1}</span>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold text-green-600">
                    {item.weighted_change_percent.toFixed(2)}%
                  </span>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </Card>
  );
}

