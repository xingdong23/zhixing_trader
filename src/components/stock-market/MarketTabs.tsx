'use client';

import React from 'react';
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
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
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
  }
];

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
    <div className={className}>
      {/* 标签页导航 */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        {DEFAULT_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                borderRadius: '6px',
                border: isActive ? '2px solid #3b82f6' : '1px solid #d1d5db',
                background: isActive ? '#3b82f6' : 'white',
                color: isActive ? 'white' : '#6b7280',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                minWidth: 'fit-content'
              }}
              title={tab.description}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '#f3f4f6';
                  e.currentTarget.style.borderColor = '#3b82f640';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 操作按钮 */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'flex-end', 
        gap: '12px', 
        marginBottom: '24px' 
      }}>
        {onRefreshData && (
          <button
            onClick={onRefreshData}
            disabled={isRefreshing}
            style={{
              padding: '8px 16px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '6px',
              color: '#3b82f6',
              fontSize: '14px',
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
              opacity: isRefreshing ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!isRefreshing) {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isRefreshing) {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
              }
            }}
          >
            <RefreshCw 
              size={16} 
              style={{ 
                animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
              }} 
            />
            <span>{isRefreshing ? '刷新中...' : '刷新数据'}</span>
          </button>
        )}
        
        {onRunAllStrategies && (
          <button
            onClick={onRunAllStrategies}
            disabled={isRunningStrategies || activeStrategiesCount === 0}
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(90deg, #00ffd0 0%, #3b82f6 100%)',
              border: 'none',
              borderRadius: '6px',
              color: '#0f172a',
              fontSize: '14px',
              fontWeight: '500',
              cursor: (isRunningStrategies || activeStrategiesCount === 0) ? 'not-allowed' : 'pointer',
              opacity: (isRunningStrategies || activeStrategiesCount === 0) ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!isRunningStrategies && activeStrategiesCount > 0) {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isRunningStrategies && activeStrategiesCount > 0) {
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            <Play 
              size={16} 
              style={{ 
                animation: isRunningStrategies ? 'pulse 2s infinite' : 'none'
              }} 
            />
            <span>
              {isRunningStrategies
                ? '运行中...'
                : `运行策略${activeStrategiesCount > 0 ? `(${activeStrategiesCount})` : ''}`}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

// 默认导出
export default MarketTabs;