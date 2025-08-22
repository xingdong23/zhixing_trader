'use client';

import React, { useState, useMemo } from 'react';
import { Stock } from '@/types';
import { StockDetail } from '../StockDetail';

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
  console.log('🎯 StockMarketRefactored 组件正在渲染... [v2.0]');
  
  // 状态管理
  const [currentTab, setCurrentTab] = useState<MarketTabId>('pool');
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRunningStrategies, setIsRunningStrategies] = useState(false);
  
  // 数据管理
  const { state, actions } = useMarketData();
  const { stocks, strategies, isLoading, error, page, pageSize, total, totalPages } = state;
  
  // 调试信息
  console.log('🎯 StockMarketRefactored: stocks数据:', stocks);
  console.log('🎯 StockMarketRefactored: stocks数量:', stocks.length);
  console.log('🎯 StockMarketRefactored: isLoading:', isLoading);
  console.log('🎯 StockMarketRefactored: error:', error);
  
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className={className}>
      {/* 错误提示 */}
      {error && (
        <div className="card" style={{
          border: '1px solid #fca5a5',
          background: 'rgba(254, 226, 226, 0.5)',
          padding: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '16px',
                height: '16px',
                background: '#dc2626',
                borderRadius: '50%',
                animation: 'pulse 2s infinite'
              }}></div>
              <span style={{ color: '#dc2626', fontWeight: '500', fontFamily: 'monospace' }}>
                数据加载失败
              </span>
            </div>
            <button
              onClick={handleClearError}
              style={{
                color: '#dc2626',
                background: 'transparent',
                border: 'none',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              关闭
            </button>
          </div>
          <p style={{ color: 'rgba(220, 38, 38, 0.8)', fontSize: '14px', marginTop: '8px', fontFamily: 'monospace' }}>
            {error}
          </p>
          <div style={{ marginTop: '12px' }}>
            <button
              onClick={handleRefreshData}
              className="btn btn-primary"
            >
              重试
            </button>
          </div>
        </div>
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