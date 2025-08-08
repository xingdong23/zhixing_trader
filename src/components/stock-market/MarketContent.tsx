// 【知行交易】股票市场内容渲染组件
// 根据当前标签页渲染对应的功能模块

'use client';

import React from 'react';
import { Stock, StockSelectionStrategy } from '@/types';
import { MarketTabId } from './MarketTabs';
import { useMarketData } from './MarketDataManager';

// 导入各个功能模块组件
import { StockPool } from '../StockPool';
import { WatchlistImporter } from '../WatchlistImporter';
import { ConceptManager } from '../ConceptManager';
import { SelectionStrategies } from '../SelectionStrategies';
import DataSyncManager from '../DataSyncManager';
// 已移除数据库管理模块

// 类型定义
export interface MarketContentProps {
  currentTab: MarketTabId;
  
  // 数据
  stocks: Stock[];
  strategies: StockSelectionStrategy[];
  
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
        <div className="p-8 text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              标签页加载失败
            </h3>
            <p className="text-red-600 mb-4">
              {this.state.error?.message || '未知错误'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
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
    <div className="p-8 text-center">
      <div className="inline-flex items-center space-x-2">
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-gray-600">加载中...</span>
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
    // database: '数据库管理准备就绪'
  };

  return (
    <div className="p-8 text-center text-gray-500">
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
  className = ''
}: MarketContentProps) {
  // 获取分页状态（来源于 MarketDataManager）
  const { state, actions } = useMarketData();
  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <div className={`mt-6 ${className}`}>
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
              page={state.page}
              pageSize={state.pageSize}
              total={state.total}
              totalPages={state.totalPages}
              onPageChange={async (p) => {
                await actions.fetchStocks({ page: p });
              }}
              onPageSizeChange={async (s) => {
                await actions.fetchStocks({ page: 1, pageSize: s });
              }}
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
    <div className={`mt-6 ${className}`}>
      {renderTabContent()}
    </div>
  );
}

// 默认导出
export default MarketContent;

// 工具函数
export const marketContentUtils = {
  // 获取标签页是否需要数据
  tabRequiresData: (tabId: MarketTabId): boolean => {
    return ['pool', 'strategies'].includes(tabId);
  },
  
  // 获取标签页是否支持刷新
  tabSupportsRefresh: (tabId: MarketTabId): boolean => {
    return ['pool', 'concepts', 'database'].includes(tabId);
  },
  
  // 获取标签页的默认操作
  getTabDefaultActions: (tabId: MarketTabId) => {
    const actions = {
      pool: ['add', 'edit', 'delete', 'view'],
      import: ['import'],
      concepts: ['manage', 'select'],
      strategies: ['create', 'edit', 'delete', 'run'],
      sync: ['sync'],
      database: ['manage', 'analyze']
    };
    
    return actions[tabId] || [];
  },
  
  // 验证标签页所需的props
  validateTabProps: (tabId: MarketTabId, props: Partial<MarketContentProps>): boolean => {
    switch (tabId) {
      case 'pool':
        return !!(props.stocks && props.onSelectStock && props.onViewStockDetail);
      case 'strategies':
        return !!(props.strategies && props.onCreateStrategy && props.onRunStrategy);
      case 'import':
        return !!props.onImportComplete;
      case 'concepts':
        return !!props.onConceptSelect;
      default:
        return true;
    }
  }
};

// 常量导出
export const TAB_DISPLAY_NAMES = {
  pool: '股票池',
  import: '导入自选股',
  concepts: '概念管理',
  strategies: '选股策略',
  sync: '数据同步'
} as const;

export const TAB_DESCRIPTIONS = {
  pool: '管理和查看股票池中的股票，支持添加、编辑、删除和查看详情',
  import: '从外部平台导入自选股列表，支持多种格式',
  concepts: '管理股票概念和分类标签，建立股票与概念的关联',
  strategies: '创建和管理选股策略，执行策略并查看结果',
  sync: '同步股票数据和价格信息，保持数据最新'
} as const;