// 【知行交易】现代化市场分析组件
// 专业金融系统 - 市场数据分析与管理

'use client';

import React, { useState, useMemo } from 'react';
import { Stock } from '@/types';
import { StockDetail } from '../StockDetail';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn } from '@/utils/cn';
import { AlertCircle, RefreshCw, Zap, TrendingUp, Target, BarChart3, X } from 'lucide-react';

// 导入子组件
import { MarketTabs, MarketTabId } from './MarketTabs';
import { MarketContent } from './MarketContent';
import { useMarketData } from './MarketDataManager';

// 类型定义
export interface StockMarketProps {
  onCreateTradingPlan: (stock: Stock) => void;
  className?: string;
}

// 主组件
export function StockMarketRefactored({ 
  onCreateTradingPlan, 
  className = '' 
}: StockMarketProps) {
  console.log('🎯 StockMarketRefactored 组件正在渲染... [v3.0]');
  
  // 状态管理
  const [currentTab, setCurrentTab] = useState<MarketTabId>('pool');
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRunningStrategies, setIsRunningStrategies] = useState(false);
  
  // 数据管理
  const { state, actions } = useMarketData();
  const { stocks, strategies, isLoading, error, page, pageSize, total, totalPages } = state;
  
  // 计算统计信息
  const stats = useMemo(() => {
    // 使用Stock类型中的priceChangePercent属性
    const gainers = stocks.filter(s => s.priceChangePercent && s.priceChangePercent > 0).length;
    const losers = stocks.filter(s => s.priceChangePercent && s.priceChangePercent < 0).length;
    
    return {
      totalStocks: stocks.length,
      totalStrategies: strategies.length,
      activeStrategies: strategies.filter(s => s.isActive).length,
      gainers,
      losers,
      avgGain: stocks.length > 0 
        ? (stocks.reduce((sum, s) => sum + (s.priceChangePercent || 0), 0) / stocks.length).toFixed(2)
        : '0.00'
    };
  }, [stocks, strategies]);
  
  // 事件处理函数
  const handleTabChange = (tabId: MarketTabId) => {
    setCurrentTab(tabId);
  };
  
  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await actions.refreshData();
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const handleRunAllStrategies = async () => {
    setIsRunningStrategies(true);
    try {
      await actions.runAllStrategies();
      setCurrentTab('strategies');
    } finally {
      setIsRunningStrategies(false);
    }
  };
  
  const handleViewStockDetail = (stock: Stock) => {
    setSelectedStock(stock);
  };
  
  const handleBackToList = () => {
    setSelectedStock(null);
  };
  
  const handleImportComplete = async (importedStocks: Stock[]) => {
    await handleRefreshData();
    setCurrentTab('pool');
  };
  
  const handleConceptSelect = (conceptId: string) => {
    console.log('选择概念:', conceptId);
    setCurrentTab('pool');
  };
  
  const handleClearError = () => {
    actions.clearError();
  };
  
  // 如果选中了股票，显示股票详情页
  if (selectedStock) {
    return (
      <StockDetail
        stock={selectedStock}
        onBack={handleBackToList}
        onCreateTradingPlan={onCreateTradingPlan}
        onUpdateStock={actions.updateStock}
      />
    );
  }
  
  return (
    <div className={cn('space-y-6', className)}>
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">市场分析</h1>
          <p className="text-text-secondary mt-1">智能选股与市场数据分析</p>
        </div>
        
        {/* 快速操作按钮 */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={handleRefreshData}
            loading={isRefreshing}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            刷新数据
          </Button>
          <Button
            variant="primary"
            onClick={handleRunAllStrategies}
            loading={isRunningStrategies}
            leftIcon={<Zap className="w-4 h-4" />}
          >
            执行策略
          </Button>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card variant="gradient">
          <CardContent padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary mb-1">股票总数</p>
                <p className="text-2xl font-bold number">{stats.totalStocks}</p>
                <p className="text-xs text-text-tertiary mt-1">已导入数据库</p>
              </div>
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card variant="gradient">
          <CardContent padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary mb-1">上涨股数</p>
                <p className="text-2xl font-bold number status-success">{stats.gainers}</p>
                <p className="text-xs text-text-tertiary mt-1">今日上涨</p>
              </div>
              <TrendingUp className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>
        
        <Card variant="gradient">
          <CardContent padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary mb-1">活跃策略</p>
                <p className="text-2xl font-bold number">{stats.activeStrategies}</p>
                <p className="text-xs text-text-tertiary mt-1">正在运行</p>
              </div>
              <Target className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        
        <Card variant="gradient">
          <CardContent padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary mb-1">平均涨幅</p>
                <p className={cn(
                  'text-2xl font-bold number',
                  Number(stats.avgGain) > 0 ? 'status-success' : 
                  Number(stats.avgGain) < 0 ? 'status-danger' : 'text-text-secondary'
                )}>
                  {Number(stats.avgGain) > 0 && '+'}{stats.avgGain}%
                </p>
                <p className="text-xs text-text-tertiary mt-1">今日平均</p>
              </div>
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                Number(stats.avgGain) > 0 ? 'bg-success/20 text-success' :
                Number(stats.avgGain) < 0 ? 'bg-danger/20 text-danger' :
                'bg-text-tertiary/20 text-text-tertiary'
              )}>
                %
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 错误提示 */}
      {error && (
        <Card variant="outline" className="border-danger">
          <CardContent padding="md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-danger" />
                <div>
                  <p className="font-medium text-danger">数据加载失败</p>
                  <p className="text-sm text-text-secondary mt-1">{error}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleRefreshData}>
                  重试
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClearError}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* 功能标签页 */}
      <MarketTabs
        currentTab={currentTab}
        onTabChange={handleTabChange}
        onRefreshData={handleRefreshData}
        onRunAllStrategies={handleRunAllStrategies}
        isRefreshing={isRefreshing}
        isRunningStrategies={isRunningStrategies}
        activeStrategiesCount={stats.activeStrategies}
      />
      
      {/* 标签页内容 */}
      <MarketContent
        currentTab={currentTab}
        stocks={stocks}
        strategies={strategies}
        page={page}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
        onPageChange={async (p) => { await actions.fetchStocks({ page: p }); }}
        onPageSizeChange={async (s) => { await actions.fetchStocks({ page: 1, pageSize: s }); }}
        onConceptFilterChange={async (conceptId) => { await actions.fetchStocks({ page: 1, conceptId }); }}
        onAddStock={actions.addStock}
        onUpdateStock={actions.updateStock}
        onDeleteStock={actions.deleteStock}
        onSelectStock={onCreateTradingPlan}
        onViewStockDetail={handleViewStockDetail}
        onCreateStrategy={() => { /* 禁用创建 */ }}
        onUpdateStrategy={() => { /* 禁用更新 */ }}
        onDeleteStrategy={() => { /* 禁用删除 */ }}
        onRunStrategy={actions.runStrategy}
        onImportComplete={handleImportComplete}
        onConceptSelect={handleConceptSelect}
        onTabChange={handleTabChange}
        onRefreshData={handleRefreshData}
        isLoading={isLoading}
      />
    </div>
  );
}

// 默认导出
export default StockMarketRefactored;