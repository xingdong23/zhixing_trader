'use client';

import React from 'react';
import { Stock, StockSelectionStrategy } from '@/types';
import { MarketTabId } from './MarketTabs';

// 导入各个功能模块组件
import { StockPool } from '../StockPool';
import { WatchlistImporter } from '../WatchlistImporter';
import { ConceptManager } from '../ConceptManager';
import { SelectionStrategies } from '../SelectionStrategies';
import DataSyncManager from '../DataSyncManager';

// 类型定义
export interface MarketContentProps {
  currentTab: MarketTabId;
  
  // 数据
  stocks: Stock[];
  strategies: StockSelectionStrategy[];
  // 分页
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onConceptFilterChange?: (conceptId: string) => void;
  
  // 股票操作
  onAddStock: (stockData: Omit<Stock, 'id' | 'addedAt' | 'updatedAt'>) => void;
  onUpdateStock: (id: string, stockData: Partial<Stock>) => void;
  onDeleteStock: (id: string) => void;
  onSelectStock: (stock: Stock) => void;
  onViewStockDetail: (stock: Stock) => void;
  
  // 策略操作
  onCreateStrategy: (strategyData: Omit<StockSelectionStrategy, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateStrategy: (id: string, strategyData: Partial<StockSelectionStrategy>) => void;
  onDeleteStrategy: (id: string) => void;
  onRunStrategy: (strategyId: string) => Promise<any[]>;
  
  // 其他操作
  onImportComplete?: (importedStocks: Stock[]) => void;
  onConceptSelect?: (conceptId: string) => void;
  onTabChange?: (tabId: MarketTabId) => void;
  onRefreshData?: () => void;
  
  // 状态
  isLoading?: boolean;
  className?: string;
}

// 错误边界组件
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class TabErrorBoundary extends React.Component<
  { children: React.ReactNode; tabId: MarketTabId },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; tabId: MarketTabId }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`标签页 ${this.props.tabId} 渲染错误:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '32px', textAlign: 'center' }}>
          <div className="card" style={{ background: 'white', color: '#1f2937', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#ef4444', marginBottom: '8px' }}>
              标签页加载失败
            </h3>
            <p style={{ color: '#ef4444', marginBottom: '16px' }}>
              {this.state.error?.message || '未知错误'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              style={{
                background: '#ef4444',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              重试
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 加载状态组件
function LoadingState() {
  return (
    <div style={{ padding: '32px', textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '16px',
          height: '16px',
          border: '2px solid #e5e7eb',
          borderTop: '2px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <span style={{ color: '#6b7280' }}>加载中...</span>
      </div>
    </div>
  );
}

// 空状态组件
function EmptyState({ tabId }: { tabId: MarketTabId }) {
  const messages = {
    pool: '暂无股票数据',
    import: '准备导入自选股',
    concepts: '暂无概念数据',
    strategies: '暂无选股策略',
    sync: '数据同步准备就绪',
  };

  return (
    <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
      {messages[tabId]}
    </div>
  );
}

// 主组件
export function MarketContent({
  currentTab,
  stocks,
  strategies,
  onAddStock,
  onUpdateStock,
  onDeleteStock,
  onSelectStock,
  onViewStockDetail,
  onCreateStrategy,
  onUpdateStrategy,
  onDeleteStrategy,
  onRunStrategy,
  onImportComplete,
  onConceptSelect,
  onTabChange,
  onRefreshData,
  isLoading = false,
  className = '',
  page = 1,
  pageSize = 20,
  total = 0,
  totalPages = 0,
  onPageChange,
  onPageSizeChange,
  onConceptFilterChange
}: MarketContentProps) {
  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <div style={{ marginTop: '24px' }} className={className}>
        <LoadingState />
      </div>
    );
  }

  // 渲染内容
  const renderTabContent = () => {
    switch (currentTab) {
      case 'pool':
        return (
          <TabErrorBoundary tabId="pool">
            <StockPool
              stocks={stocks}
              page={page}
              pageSize={pageSize}
              total={total}
              totalPages={totalPages}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
              onConceptChange={onConceptFilterChange}
              onAddStock={onAddStock}
              onUpdateStock={onUpdateStock}
              onDeleteStock={onDeleteStock}
              onSelectStock={onSelectStock}
              onViewDetail={onViewStockDetail}
            />
          </TabErrorBoundary>
        );

      case 'import':
        return (
          <TabErrorBoundary tabId="import">
            <WatchlistImporter
              onImportComplete={async (importedStocks) => {
                if (onImportComplete) {
                  onImportComplete(importedStocks);
                }
                // 导入完成后切换到股票池
                if (onTabChange) {
                  onTabChange('pool');
                }
              }}
            />
          </TabErrorBoundary>
        );

      case 'concepts':
        return (
          <TabErrorBoundary tabId="concepts">
            <ConceptManager
              onConceptSelect={(conceptId) => {
                if (onConceptSelect) {
                  onConceptSelect(conceptId);
                }
                // 选择概念后切换到股票池
                if (onTabChange) {
                  onTabChange('pool');
                }
              }}
            />
          </TabErrorBoundary>
        );

      case 'strategies':
        return (
          <TabErrorBoundary tabId="strategies">
            <SelectionStrategies
              strategies={strategies}
              stocks={stocks}
              onCreateStrategy={() => { /* 禁用创建 */ }}
              onUpdateStrategy={() => { /* 禁用更新 */ }}
              onDeleteStrategy={() => { /* 禁用删除 */ }}
              onRunStrategy={onRunStrategy}
            />
          </TabErrorBoundary>
        );

      case 'sync':
        return (
          <TabErrorBoundary tabId="sync">
            <DataSyncManager />
          </TabErrorBoundary>
        );

      default:
        return <EmptyState tabId={currentTab} />;
    }
  };

  return (
    <div className={className}>
      {/* 主要内容区域 */}
      <div style={{ minHeight: '400px' }}>
        {renderTabContent()}
      </div>
    </div>
  );
}

// 默认导出
export default MarketContent;