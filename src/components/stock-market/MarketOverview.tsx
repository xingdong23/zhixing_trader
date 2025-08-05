// 【知行交易】股票市场概览组件
// 显示股票池、策略和机会的统计信息

'use client';

import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui';
import { BarChart3, Target, Filter, TrendingUp } from 'lucide-react';

// 类型定义
export interface MarketStats {
  totalStocks: number;
  totalStrategies: number;
  activeStrategies: number;
  todayOpportunities: number;
}

export interface MarketOverviewProps {
  stats: MarketStats;
  isLoading?: boolean;
  onRefresh?: () => void;
}

// 统计卡片组件
interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  color?: 'blue' | 'green' | 'orange' | 'purple';
  isLoading?: boolean;
}

function StatCard({ icon: Icon, value, label, color = 'blue', isLoading }: StatCardProps) {
  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    orange: 'text-orange-600',
    purple: 'text-purple-600'
  };

  return (
    <div className="text-center p-4">
      <div className="flex items-center justify-center mb-2">
        <Icon className={`w-5 h-5 ${colorClasses[color]} mr-2`} />
        {isLoading ? (
          <div className="w-8 h-8 bg-gray-200 animate-pulse rounded"></div>
        ) : (
          <p className="text-2xl font-semibold text-gray-900">{formatNumber(value)}</p>
        )}
      </div>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
}

// 工具函数
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// 主组件
export function MarketOverview({ stats, isLoading = false, onRefresh }: MarketOverviewProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>市场概览</CardTitle>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
              disabled={isLoading}
            >
              {isLoading ? '刷新中...' : '刷新'}
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">市场概览</h2>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
              disabled={isLoading}
            >
              {isLoading ? '刷新中...' : '刷新'}
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={BarChart3}
            value={stats.totalStocks}
            label="股票池"
            color="blue"
            isLoading={isLoading}
          />
          <StatCard
            icon={Filter}
            value={stats.totalStrategies}
            label="选股策略"
            color="green"
            isLoading={isLoading}
          />
          <StatCard
            icon={Target}
            value={stats.activeStrategies}
            label="启用策略"
            color="orange"
            isLoading={isLoading}
          />
          <StatCard
            icon={TrendingUp}
            value={stats.todayOpportunities}
            label="今日机会"
            color="purple"
            isLoading={isLoading}
          />
        </div>
        
        {/* 快速洞察 */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <span className="text-gray-600">策略启用率</span>
              <div className="mt-1">
                <span className="font-semibold text-gray-900">
                  {stats.totalStrategies > 0 
                    ? Math.round((stats.activeStrategies / stats.totalStrategies) * 100)
                    : 0
                  }%
                </span>
              </div>
            </div>
            <div className="text-center">
              <span className="text-gray-600">平均每策略股票</span>
              <div className="mt-1">
                <span className="font-semibold text-gray-900">
                  {stats.activeStrategies > 0 
                    ? Math.round(stats.totalStocks / stats.activeStrategies)
                    : 0
                  }
                </span>
              </div>
            </div>
            <div className="text-center">
              <span className="text-gray-600">机会发现率</span>
              <div className="mt-1">
                <span className="font-semibold text-gray-900">
                  {stats.totalStocks > 0 
                    ? Math.round((stats.todayOpportunities / stats.totalStocks) * 100)
                    : 0
                  }%
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 默认导出
export default MarketOverview;

// 工具函数导出
export const marketOverviewUtils = {
  formatNumber,
  calculateStrategyActivationRate: (active: number, total: number) => 
    total > 0 ? Math.round((active / total) * 100) : 0,
  calculateAverageStocksPerStrategy: (stocks: number, strategies: number) => 
    strategies > 0 ? Math.round(stocks / strategies) : 0,
  calculateOpportunityRate: (opportunities: number, stocks: number) => 
    stocks > 0 ? Math.round((opportunities / stocks) * 100) : 0
};