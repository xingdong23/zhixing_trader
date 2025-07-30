// 【知行交易】股票相关类型定义

export interface Stock {
  id: string;
  symbol: string;              // 股票代码，如 AAPL
  name: string;                // 股票名称，如 苹果公司
  market: 'US' | 'HK' | 'CN';  // 市场类型

  // 标签系统
  tags: {
    industry: string[];        // 行业标签
    fundamentals: string[];    // 基本面标签
    marketCap: 'large' | 'mid' | 'small';  // 市值规模
    watchLevel: 'high' | 'medium' | 'low'; // 关注程度
  };

  // 概念关联
  conceptIds: string[];        // 关联的概念ID列表

  // 价格信息
  currentPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
  volume?: number;

  // 元数据
  addedAt: Date;
  updatedAt: Date;
  notes?: string;              // 用户备注

  // 观点记录
  opinions?: StockOpinion[];   // 观点记录列表
}

export interface StockOpinion {
  id: string;
  stockId: string;
  source: string;              // 观点来源
  author: string;              // 作者/分析师
  type: 'technical' | 'fundamental' | 'mixed';  // 观点类型

  // 观点内容
  title: string;               // 观点标题
  content: string;             // 详细内容
  sentiment: 'bullish' | 'bearish' | 'neutral'; // 情绪倾向
  targetPrice?: number;        // 目标价格
  timeframe?: string;          // 时间框架

  // 分析详情
  technicalAnalysis?: {
    trend: string;             // 趋势分析
    support: number[];         // 支撑位
    resistance: number[];      // 阻力位
    indicators: string[];      // 技术指标分析
  };

  fundamentalAnalysis?: {
    valuation: string;         // 估值分析
    growth: string;           // 成长性分析
    risks: string[];          // 风险因素
    catalysts: string[];      // 催化剂
  };

  // 元数据
  createdAt: Date;
  updatedAt: Date;
  tags: string[];             // 标签
  confidence: number;         // 信心度 1-10
  isActive: boolean;          // 是否仍然有效
}

export interface Concept {
  id: string;
  name: string;                // 概念名称
  description?: string;        // 概念描述
  color?: string;              // 概念标签颜色
  stockIds: string[];          // 关联的股票ID列表
  stockCount: number;          // 该概念下的股票数量
  createdAt: Date;
  updatedAt: Date;
}

export interface ConceptStockRelation {
  conceptId: string;
  stockId: string;
  addedAt: Date;
}

export interface Industry {
  id: string;
  name: string;                // 行业名称
  description?: string;        // 行业描述
  stockCount: number;          // 该行业股票数量
  createdAt: Date;
  updatedAt: Date;
}

export interface StockPoolStats {
  totalStocks: number;
  byMarket: Record<string, number>;
  byIndustry: Record<string, number>;
  byWatchLevel: Record<string, number>;
  recentlyAdded: number;       // 最近7天添加的数量
  lastUpdated: Date;
}

// 富途导入相关类型
export interface FutuStockData {
  代码: string;
  名称: string;
  最新价: string;
  涨跌额: string;
  涨跌幅: string;
  成交量: string;
  成交额: string;
  今开: string;
  昨收: string;
  最高: string;
  最低: string;
  总市值: string;
  市盈率TTM: string;
  市净率: string;
  股息率TTM: string;
  所属行业: string;
  [key: string]: string;
}

export interface ImportedStock {
  id: string;
  symbol: string;
  name: string;
  market: 'US' | 'HK' | 'CN';
  industryId?: string;
  industry?: Industry;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  turnover: number;
  high: number;
  low: number;
  open: number;
  preClose: number;
  marketCap?: number;
  peRatio?: number;
  pbRatio?: number;
  dividendYield?: number;
  addedAt: Date;
  updatedAt: Date;
  tags: string[];
  notes: string;
}