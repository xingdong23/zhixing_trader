// 【知行交易】股票市场模块统一导出
// 整合股票市场相关的所有组件、类型和工具函数

// 主要组件导出
export { MarketOverview } from './MarketOverview';
export type { MarketStats, MarketOverviewProps } from './MarketOverview';

export { MarketTabs } from './MarketTabs';
export type { MarketTabId, MarketTab, MarketTabsProps } from './MarketTabs';
export { DEFAULT_TABS } from './MarketTabs';

export { useMarketData } from './MarketDataManager';
export type { MarketDataState, MarketDataActions, UseMarketDataResult } from './MarketDataManager';

export { MarketContent } from './MarketContent';
export type { MarketContentProps } from './MarketContent';

// 重构后的主组件
export { StockMarketRefactored } from './StockMarketRefactored';
export type { StockMarketProps } from './StockMarketRefactored';

// 工具函数
export const stockMarketUtils = {
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
  }
};