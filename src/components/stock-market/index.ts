// 【知行交易】股票市场模块统一导出
// 整合股票市场相关的所有组件、类型和工具函数

// 主要组件导出
export { MarketOverview } from './MarketOverview';
export type { MarketStats, MarketOverviewProps } from './MarketOverview';
export { marketOverviewUtils } from './MarketOverview';

export { MarketTabs } from './MarketTabs';
export type { MarketTabId, MarketTab, MarketTabsProps } from './MarketTabs';
export { DEFAULT_TABS, marketTabsUtils, MARKET_TAB_IDS, MARKET_TAB_LABELS } from './MarketTabs';

export { useMarketData } from './MarketDataManager';
export type { MarketDataState, MarketDataActions, UseMarketDataResult } from './MarketDataManager';
export { marketDataUtils } from './MarketDataManager';

export { MarketContent } from './MarketContent';
export type { MarketContentProps } from './MarketContent';
export { marketContentUtils, TAB_DISPLAY_NAMES, TAB_DESCRIPTIONS } from './MarketContent';

// 重构后的主组件
export { StockMarketRefactored } from './StockMarketRefactored';
export type { StockMarketProps } from './StockMarketRefactored';

// 工具函数和常量
export const stockMarketUtils = {
  // 数据管理
  ...marketDataUtils,
  
  // 概览统计
  ...marketOverviewUtils,
  
  // 标签页管理
  ...marketTabsUtils,
  
  // 内容渲染
  ...marketContentUtils,
  
  // 通用工具
  formatStockSymbol: (symbol: string, market?: string) => {
    if (!market) return symbol;
    return `${symbol}.${market.toUpperCase()}`;
  },
  
  formatMarketCap: (marketCap: string) => {
    const caps = {
      large: '大盘股',
      mid: '中盘股',
      small: '小盘股',
      micro: '微盘股'
    };
    return caps[marketCap as keyof typeof caps] || marketCap;
  },
  
  formatWatchLevel: (level: string) => {
    const levels = {
      high: '高关注',
      medium: '中关注',
      low: '低关注'
    };
    return levels[level as keyof typeof levels] || level;
  },
  
  // 数据验证
  validateStockData: (stock: any): boolean => {
    return !!(stock?.symbol && stock?.name && stock?.market);
  },
  
  validateStrategyData: (strategy: any): boolean => {
    return !!(strategy?.name && strategy?.description);
  },
  
  // 状态检查
  isDataReady: (stocks: any[], strategies: any[]) => {
    return Array.isArray(stocks) && Array.isArray(strategies);
  },
  
  hasActiveStrategies: (strategies: any[]) => {
    return strategies.some(s => s.isActive);
  }
};

// 常量导出
export const STOCK_MARKET_CONSTANTS = {
  // 默认配置
  DEFAULT_TAB: 'pool' as MarketTabId,
  REFRESH_INTERVAL: 5 * 60 * 1000, // 5分钟
  MAX_STOCKS_PER_PAGE: 50,
  MAX_STRATEGIES_PER_USER: 20,
  
  // 市场类型
  MARKETS: {
    SH: '上海',
    SZ: '深圳',
    HK: '香港',
    US: '美股'
  },
  
  // 市值分类
  MARKET_CAPS: {
    large: '大盘股',
    mid: '中盘股',
    small: '小盘股',
    micro: '微盘股'
  },
  
  // 关注级别
  WATCH_LEVELS: {
    high: '高关注',
    medium: '中关注',
    low: '低关注'
  },
  
  // 状态颜色
  STATUS_COLORS: {
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600',
    info: 'text-blue-600',
    default: 'text-gray-600'
  },
  
  // 操作类型
  ACTIONS: {
    ADD: 'add',
    UPDATE: 'update',
    DELETE: 'delete',
    VIEW: 'view',
    SELECT: 'select',
    RUN: 'run',
    REFRESH: 'refresh'
  }
};

// 类型导出
export type StockMarketModule = {
  // 组件类型
  MarketOverview: typeof MarketOverview;
  MarketTabs: typeof MarketTabs;
  MarketContent: typeof MarketContent;
  
  // Hook类型
  useMarketData: typeof useMarketData;
  
  // 工具类型
  utils: typeof stockMarketUtils;
  constants: typeof STOCK_MARKET_CONSTANTS;
};

// 版本信息
export const STOCK_MARKET_VERSION = {
  version: '2.0.0',
  refactoredAt: new Date().toISOString(),
  changes: [
    '拆分大组件为多个专用子组件',
    '引入统一的数据管理Hook',
    '优化标签页切换和内容渲染',
    '增强错误处理和加载状态',
    '提供完整的工具函数库'
  ],
  components: [
    'MarketOverview - 市场概览统计',
    'MarketTabs - 功能标签页导航',
    'MarketDataManager - 数据状态管理',
    'MarketContent - 内容渲染管理',
    'StockMarketRefactored - 重构后的主组件'
  ]
};

// 默认配置
export const defaultStockMarketConfig = {
  initialTab: STOCK_MARKET_CONSTANTS.DEFAULT_TAB,
  autoRefresh: true,
  refreshInterval: STOCK_MARKET_CONSTANTS.REFRESH_INTERVAL,
  enableErrorBoundary: true,
  enableLoadingStates: true,
  maxRetries: 3,
  retryDelay: 1000
};

// 调试信息
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__STOCK_MARKET_DEBUG__ = {
    version: STOCK_MARKET_VERSION,
    utils: stockMarketUtils,
    constants: STOCK_MARKET_CONSTANTS,
    config: defaultStockMarketConfig
  };
}