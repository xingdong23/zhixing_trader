// 【知行交易】股票市场导航标签页组件
// 管理股票池、导入、概念、策略等功能模块的切换

'use client';

import React from 'react';
import { Button } from '@/components/ui';
import {
  BarChart3,
  Target,
  Calendar,
  Filter,
  Tag,
  Database,
  RefreshCw,
  Play
} from 'lucide-react';

// 类型定义
export type MarketTabId = 'pool' | 'import' | 'concepts' | 'strategies' | 'sync' | 'database';

export interface MarketTab {
  id: MarketTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

export interface MarketTabsProps {
  currentTab: MarketTabId;
  onTabChange: (tabId: MarketTabId) => void;
  onRefreshData?: () => void;
  onRunAllStrategies?: () => void;
  isRefreshing?: boolean;
  isRunningStrategies?: boolean;
  activeStrategiesCount?: number;
  className?: string;
}

// 默认标签页配置
export const DEFAULT_TABS: MarketTab[] = [
  {
    id: 'pool',
    label: '股票池',
    icon: BarChart3,
    description: '管理和查看股票池中的股票'
  },
  {
    id: 'import',
    label: '导入自选股',
    icon: Calendar,
    description: '从外部平台导入自选股列表'
  },
  {
    id: 'concepts',
    label: '概念管理',
    icon: Tag,
    description: '管理股票概念和分类标签'
  },
  {
    id: 'strategies',
    label: '选股策略',
    icon: Filter,
    description: '创建和管理选股策略'
  },
  {
    id: 'sync',
    label: '数据同步',
    icon: Target,
    description: '同步股票数据和价格信息'
  },
  {
    id: 'database',
    label: '数据库管理',
    icon: Database,
    description: '管理数据库和数据质量'
  }
];

// 标签页按钮组件
interface TabButtonProps {
  tab: MarketTab;
  isActive: boolean;
  onClick: () => void;
}

function TabButton({ tab, isActive, onClick }: TabButtonProps) {
  const Icon = tab.icon;
  
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 text-sm rounded border transition-all duration-200
        flex items-center space-x-2 min-w-0
        ${
          isActive
            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm'
        }
      `}
      title={tab.description}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="truncate">{tab.label}</span>
    </button>
  );
}

// 操作按钮组件
interface ActionButtonsProps {
  onRefreshData?: () => void;
  onRunAllStrategies?: () => void;
  isRefreshing?: boolean;
  isRunningStrategies?: boolean;
  activeStrategiesCount?: number;
}

function ActionButtons({
  onRefreshData,
  onRunAllStrategies,
  isRefreshing = false,
  isRunningStrategies = false,
  activeStrategiesCount = 0
}: ActionButtonsProps) {
  return (
    <div className="flex space-x-2">
      {onRefreshData && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRefreshData}
          disabled={isRefreshing}
          className="flex items-center space-x-1"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? '刷新中...' : '刷新数据'}</span>
        </Button>
      )}
      
      {onRunAllStrategies && (
        <Button
          variant="primary"
          size="sm"
          onClick={onRunAllStrategies}
          disabled={isRunningStrategies || activeStrategiesCount === 0}
          className="flex items-center space-x-1"
        >
          <Play className={`w-4 h-4 ${isRunningStrategies ? 'animate-pulse' : ''}`} />
          <span>
            {isRunningStrategies 
              ? '运行中...' 
              : `运行策略${activeStrategiesCount > 0 ? `(${activeStrategiesCount})` : ''}`
            }
          </span>
        </Button>
      )}
    </div>
  );
}

// 主组件
export function MarketTabs({
  currentTab,
  onTabChange,
  onRefreshData,
  onRunAllStrategies,
  isRefreshing = false,
  isRunningStrategies = false,
  activeStrategiesCount = 0,
  className = ''
}: MarketTabsProps) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {/* 标签页导航 */}
          <div className="flex space-x-2 overflow-x-auto">
            {DEFAULT_TABS.map(tab => (
              <TabButton
                key={tab.id}
                tab={tab}
                isActive={currentTab === tab.id}
                onClick={() => onTabChange(tab.id)}
              />
            ))}
          </div>
          
          {/* 操作按钮 */}
          <ActionButtons
            onRefreshData={onRefreshData}
            onRunAllStrategies={onRunAllStrategies}
            isRefreshing={isRefreshing}
            isRunningStrategies={isRunningStrategies}
            activeStrategiesCount={activeStrategiesCount}
          />
        </div>
        
        {/* 当前标签页描述 */}
        <div className="mt-2">
          <p className="text-sm text-gray-600">
            {DEFAULT_TABS.find(tab => tab.id === currentTab)?.description}
          </p>
        </div>
      </div>
    </div>
  );
}

// 默认导出
export default MarketTabs;

// 工具函数
export const marketTabsUtils = {
  // 获取标签页信息
  getTabInfo: (tabId: MarketTabId): MarketTab | undefined => {
    return DEFAULT_TABS.find(tab => tab.id === tabId);
  },
  
  // 获取下一个标签页
  getNextTab: (currentTab: MarketTabId): MarketTabId => {
    const currentIndex = DEFAULT_TABS.findIndex(tab => tab.id === currentTab);
    const nextIndex = (currentIndex + 1) % DEFAULT_TABS.length;
    return DEFAULT_TABS[nextIndex].id;
  },
  
  // 获取上一个标签页
  getPrevTab: (currentTab: MarketTabId): MarketTabId => {
    const currentIndex = DEFAULT_TABS.findIndex(tab => tab.id === currentTab);
    const prevIndex = currentIndex === 0 ? DEFAULT_TABS.length - 1 : currentIndex - 1;
    return DEFAULT_TABS[prevIndex].id;
  },
  
  // 验证标签页ID
  isValidTabId: (tabId: string): tabId is MarketTabId => {
    return DEFAULT_TABS.some(tab => tab.id === tabId);
  }
};

// 常量导出
export const MARKET_TAB_IDS = ['pool', 'import', 'concepts', 'strategies', 'sync', 'database'] as const;
export const MARKET_TAB_LABELS = DEFAULT_TABS.reduce((acc, tab) => {
  acc[tab.id] = tab.label;
  return acc;
}, {} as Record<MarketTabId, string>);