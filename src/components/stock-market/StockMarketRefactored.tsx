// 【知行交易】重构后的股票市场主组件
// 整合概览、标签页、数据管理和内容渲染的统一界面

'use client';

import React, { useState, useMemo } from 'react';
import { Stock } from '@/types';
import { StockDetail } from '../StockDetail';

// 导入子组件
import { MarketOverview } from './MarketOverview';
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
  console.log('🎯 StockMarketRefactored 组件正在渲染... [v2.0]');
  
  // 状态管理
  const [currentTab, setCurrentTab] = useState<MarketTabId>('pool');
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRunningStrategies, setIsRunningStrategies] = useState(false);
  
  // 数据管理
  const { state, actions } = useMarketData();
  const { stocks, strategies, isLoading, error } = state;
  
  // 计算统计信息
  const stats = useMemo(() => {
    return {
      totalStocks: stocks.length,
      totalStrategies: strategies.length,
      activeStrategies: strategies.filter(s => s.isActive).length,
      todayOpportunities: 0 // 暂时移除选股结果功能
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
      // 运行完成后切换到策略页面查看结果
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
    // 导入完成后刷新数据
    await handleRefreshData();
    // 切换到股票池查看结果
    setCurrentTab('pool');
  };
  
  const handleConceptSelect = (conceptId: string) => {
    // 选择概念后可以在这里处理筛选逻辑
    console.log('选择概念:', conceptId);
    // 切换到股票池查看相关股票
    setCurrentTab('pool');
  };
  
  // 错误处理
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
    <div className={`max-w-7xl mx-auto p-6 space-y-6 ${className}`}>
      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <span className="text-red-800 font-medium">数据加载失败</span>
            </div>
            <button
              onClick={handleClearError}
              className="text-red-600 hover:text-red-700 text-sm"
            >
              关闭
            </button>
          </div>
          <p className="text-red-600 text-sm mt-2">{error}</p>
          <div className="mt-3">
            <button
              onClick={handleRefreshData}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
            >
              重试
            </button>
          </div>
        </div>
      )}
      
      {/* 市场概览 */}
      <MarketOverview
        stats={stats}
        isLoading={isLoading}
        onRefresh={handleRefreshData}
      />
      
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

// 组件元数据
StockMarketRefactored.displayName = 'StockMarketRefactored';

// 组件文档
export const StockMarketRefactoredDocs = {
  name: 'StockMarketRefactored',
  description: '重构后的股票市场主组件，整合了概览、标签页、数据管理和内容渲染',
  version: '2.0.0',
  
  props: {
    onCreateTradingPlan: {
      type: '(stock: Stock) => void',
      required: true,
      description: '创建交易计划的回调函数'
    },
    className: {
      type: 'string',
      required: false,
      description: '自定义CSS类名'
    }
  },
  
  features: [
    '市场概览统计展示',
    '多标签页功能切换',
    '统一的数据状态管理',
    '错误处理和重试机制',
    '加载状态和用户反馈',
    '股票详情页面集成',
    '策略执行和结果查看'
  ],
  
  subComponents: [
    'MarketOverview - 市场概览组件',
    'MarketTabs - 标签页导航组件',
    'MarketContent - 内容渲染组件',
    'useMarketData - 数据管理Hook'
  ],
  
  usage: `
    import { StockMarketRefactored } from '@/components/stock-market';
    
    function App() {
      const handleCreateTradingPlan = (stock) => {
        // 处理交易计划创建
      };
      
      return (
        <StockMarketRefactored 
          onCreateTradingPlan={handleCreateTradingPlan}
        />
      );
    }
  `
};

// 性能优化建议
export const StockMarketPerformanceTips = {
  memoization: [
    '使用 useMemo 缓存计算结果',
    '使用 useCallback 缓存事件处理函数',
    '避免在渲染过程中创建新对象'
  ],
  
  dataManagement: [
    '合理使用 useMarketData Hook',
    '避免频繁的数据刷新',
    '实现数据缓存和增量更新'
  ],
  
  rendering: [
    '使用错误边界处理组件错误',
    '实现骨架屏提升加载体验',
    '合理拆分组件避免过度渲染'
  ]
};