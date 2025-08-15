// 【知行交易】股票市场概览组件 - 现代极客金融风格
// 显示股票池、策略和机会的统计信息

'use client';

import React from 'react';
import { BarChart3, Target, Filter, TrendingUp, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui';

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
  color?: 'primary' | 'success' | 'warning' | 'info';
  isLoading?: boolean;
}

function StatCard({ icon: Icon, value, label, color = 'primary', isLoading }: StatCardProps) {
  const colorClasses = {
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    info: 'text-info'
  };

  const bgClasses = {
    primary: 'bg-primary/10',
    success: 'bg-success/10',
    warning: 'bg-warning/10',
    info: 'bg-info/10'
  };

  return (
    <div className="card neon-border hover:border-primary/50 transition-all duration-300 group">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg ${bgClasses[color]} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
          <Icon className={`w-6 h-6 ${colorClasses[color]}`} />
        </div>
        <div className="text-right">
          {isLoading ? (
            <div className="w-16 h-8 bg-surface-light animate-pulse rounded"></div>
          ) : (
            <div className="text-2xl font-bold data-mono text-primary group-hover:text-primary-light transition-colors">
              {formatNumber(value)}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${colorClasses[color]} animate-pulse`}></div>
          <span className="text-xs text-text-muted">活跃</span>
        </div>
      </div>
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
  const strategyActivationRate = stats.totalStrategies > 0 
    ? Math.round((stats.activeStrategies / stats.totalStrategies) * 100)
    : 0;
  
  const averageStocksPerStrategy = stats.activeStrategies > 0 
    ? Math.round(stats.totalStocks / stats.activeStrategies)
    : 0;
  
  const opportunityRate = stats.totalStocks > 0 
    ? Math.round((stats.todayOpportunities / stats.totalStocks) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">市场概览</h2>
          <p className="text-sm text-text-secondary mt-1">实时监控投资组合和市场机会</p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="btn btn-primary flex items-center space-x-2"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? '刷新中...' : '刷新数据'}</span>
          </button>
        )}
      </div>
      
      {/* 统计卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BarChart3}
          value={stats.totalStocks}
          label="股票池"
          color="primary"
          isLoading={isLoading}
        />
        <StatCard
          icon={Filter}
          value={stats.totalStrategies}
          label="选股策略"
          color="info"
          isLoading={isLoading}
        />
        <StatCard
          icon={Target}
          value={stats.activeStrategies}
          label="启用策略"
          color="success"
          isLoading={isLoading}
        />
        <StatCard
          icon={TrendingUp}
          value={stats.todayOpportunities}
          label="今日机会"
          color="warning"
          isLoading={isLoading}
        />
      </div>
      
      {/* 快速洞察面板 */}
      <div className="card glass-effect">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary">快速洞察</h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <span className="text-xs text-text-secondary">实时更新</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 rounded-lg bg-surface/50 border border-border/50">
            <div className="text-sm text-text-secondary mb-2">策略启用率</div>
            <div className="text-2xl font-bold data-mono text-primary">
              {strategyActivationRate}%
            </div>
            <div className="mt-2">
              <div className="w-full bg-surface rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${strategyActivationRate}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          <div className="text-center p-4 rounded-lg bg-surface/50 border border-border/50">
            <div className="text-sm text-text-secondary mb-2">平均每策略股票</div>
            <div className="text-2xl font-bold data-mono text-info">
              {averageStocksPerStrategy}
            </div>
            <div className="mt-2">
              <span className="text-xs text-text-muted">
                {stats.totalStocks} 股票 / {stats.activeStrategies} 策略
              </span>
            </div>
          </div>
          
          <div className="text-center p-4 rounded-lg bg-surface/50 border border-border/50">
            <div className="text-sm text-text-secondary mb-2">机会发现率</div>
            <div className={`text-2xl font-bold data-mono ${
              opportunityRate > 50 ? 'text-success' : opportunityRate > 20 ? 'text-warning' : 'text-danger'
            }`}>
              {opportunityRate}%
            </div>
            <div className="mt-2">
              <span className="text-xs text-text-muted">
                {stats.todayOpportunities} 机会 / {stats.totalStocks} 股票
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
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