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
  RefreshCw,
  Play
} from 'lucide-react';

// 类型定义
export type MarketTabId = 'pool' | 'import' | 'concepts' | 'strategies' | 'sync';

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
            : 'bg-surface text-text-secondary border-border hover:bg-surface-light hover:border-primary/30 hover:shadow-sm'
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
    <div className={`space-y-6 ${className}`}>
      {/* 标签页导航 */}
      <div className="tab-nav">
        {DEFAULT_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`tab-item ${isActive ? 'active' : ''}`}
              title={tab.description}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
      
      {/* 搜索和操作区域 */}
      <div className="flex items-center justify-between gap-6">
        {/* 搜索区域 */}
        <div className="flex-1">
          <div className="flex gap-3 mb-3">
            <button className={`px-4 py-2 rounded-lg text-sm transition-all ${
              currentTab === 'pool' 
                ? 'bg-[#3b82f6] text-white' 
                : 'bg-[rgba(30,41,59,0.6)] text-[#cbd5e1] hover:bg-[rgba(59,130,246,0.1)]'
            }`}>
              搜索 股票池
            </button>
            <button className={`px-4 py-2 rounded-lg text-sm transition-all ${
              currentTab === 'import' 
                ? 'bg-[#f59e0b] text-white' 
                : 'bg-[rgba(30,41,59,0.6)] text-[#cbd5e1] hover:bg-[rgba(245,158,11,0.1)]'
            }`}>
              搜索 自选股
            </button>
          </div>
          <div className="relative">
            <input 
              type="text" 
              className="search-bar" 
              placeholder="股票代码或名称，如SH000001｜000001 美股代码，如：amzn,港股代码，如：hk3690｜03690"
            />
          </div>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex items-center space-x-3">
          {onRefreshData && (
            <button
              onClick={onRefreshData}
              disabled={isRefreshing}
              className="px-4 py-2 bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)] rounded-lg text-[#3b82f6] text-sm hover:bg-[rgba(59,130,246,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? '刷新中...' : '刷新数据'}</span>
            </button>
          )}
          
          {onRunAllStrategies && (
            <button
              onClick={onRunAllStrategies}
              disabled={isRunningStrategies || activeStrategiesCount === 0}
              className="px-4 py-2 bg-gradient-to-r from-[#00ffd0] to-[#3b82f6] border-none rounded-lg text-[#0f172a] text-sm hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Play className={`w-4 h-4 ${isRunningStrategies ? 'animate-pulse' : ''}`} />
              <span>
                {isRunningStrategies 
                  ? '运行中...' 
                  : `运行策略${activeStrategiesCount > 0 ? `(${activeStrategiesCount})` : ''}`
                }
              </span>
            </button>
          )}
        </div>
      </div>
      
      {/* 筛选器 */}
      <div className="filters">
        <select className="filter-select">
          <option>所有市场</option>
          <option>A股</option>
          <option>港股</option>
          <option>美股</option>
        </select>
        <select className="filter-select">
          <option>所有行业</option>
          <option>科技</option>
          <option>金融</option>
          <option>医疗</option>
        </select>
        <select className="filter-select">
          <option>按市值</option>
          <option>按涨跌幅</option>
          <option>按成交量</option>
        </select>
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
export const MARKET_TAB_IDS = ['pool', 'import', 'concepts', 'strategies', 'sync'] as const;
export const MARKET_TAB_LABELS = DEFAULT_TABS.reduce((acc, tab) => {
  acc[tab.id] = tab.label;
  return acc;
}, {} as Record<MarketTabId, string>);