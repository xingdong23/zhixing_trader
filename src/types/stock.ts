// 【知行交易】股票相关类型定义
// 包含股票、概念、行业、专家意见等相关类型

import { BaseEntity, TaggedEntity, NotedEntity, PriceData, MarketType, MarketCap, WatchLevel } from './core';

// ==================== 股票相关类型 ====================

/** 股票标签分类 */
export interface StockTags {
  industry: string[];        // 行业标签
  fundamentals: string[];    // 基本面标签
  marketCap: MarketCap;      // 市值规模
  watchLevel: WatchLevel;    // 关注程度
}

/** 股票基础信息 */
export interface Stock extends BaseEntity, NotedEntity, PriceData {
  symbol: string;            // 股票代码
  name: string;              // 股票名称
  market: MarketType;        // 市场类型
  tags: StockTags;           // 标签分类
  conceptIds: string[];      // 关联的概念ID列表
  opinions?: StockOpinion[]; // 观点记录列表
}

// ==================== 股票观点相关 ====================

/** 技术分析数据 */
export interface TechnicalAnalysis {
  trend: string;             // 趋势分析
  support: number[];         // 支撑位
  resistance: number[];      // 阻力位
  indicators: string[];      // 技术指标分析
}

/** 基本面分析数据 */
export interface FundamentalAnalysis {
  valuation: string;         // 估值分析
  growth: string;           // 成长性分析
  risks: string[];          // 风险因素
  catalysts: string[];      // 催化剂
}

/** 股票观点 */
export interface StockOpinion extends BaseEntity, TaggedEntity {
  stockId: string;
  sentiment: 'bullish' | 'bearish' | 'neutral'; // 看多/看空/中性
  targetPrice?: number;      // 目标价格
  timeframe?: string;        // 时间框架
  technicalAnalysis?: TechnicalAnalysis;
  fundamentalAnalysis?: FundamentalAnalysis;
  confidence: number;        // 信心度 1-10
  isActive: boolean;         // 是否仍然有效
}

// ==================== 概念和行业 ====================

/** 概念定义 */
export interface Concept extends BaseEntity {
  name: string;              // 概念名称
  description?: string;      // 概念描述
  color?: string;            // 概念标签颜色
  stockIds: string[];        // 关联的股票ID列表
  stockCount: number;        // 该概念下的股票数量
}

/** 概念-股票关联关系 */
export interface ConceptStockRelation {
  conceptId: string;
  stockId: string;
  addedAt: Date;
}

/** 行业定义 */
export interface Industry extends BaseEntity {
  name: string;              // 行业名称
  description?: string;      // 行业描述
  stockCount: number;        // 该行业股票数量
}

// ==================== 专家和意见 ====================

/** 专家信息 */
export interface Expert extends BaseEntity {
  name: string;              // 专家名称
  title?: string;            // 头衔
  avatar?: string;           // 头像图片
  credibility: number;       // 可信度评分 (0-100)
  specialties: string[];     // 专长领域
  description?: string;      // 专家简介
  isVerified: boolean;       // 是否认证
}

/** 价格指导类型 */
export enum PriceGuidanceType {
  BUY_POINT = 'buy_point',
  SELL_POINT = 'sell_point',
  STOP_LOSS = 'stop_loss',
  TAKE_PROFIT = 'take_profit',
  SUPPORT_LEVEL = 'support_level',
  RESISTANCE_LEVEL = 'resistance_level',
  TARGET_PRICE = 'target_price'
}

/** 价格指导 */
export interface PriceGuidance {
  type: PriceGuidanceType;
  price: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  timeframe?: string;
}

/** 专家意见 */
export interface ExpertOpinion extends BaseEntity, TaggedEntity, NotedEntity {
  stockId: string;
  expertId: string;
  title: string;
  content: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  priceGuidances: PriceGuidance[];
  chartImages: string[];
  attachments?: {
    name: string;
    url: string;
    type: 'image' | 'pdf' | 'link';
  }[];
  publishedAt: Date;
  source?: string;
  sourceUrl?: string;
  isActive: boolean;
  priority: 'high' | 'medium' | 'low';
  userNotes?: string;
  isBookmarked: boolean;
}

// ==================== 统计相关 ====================

/** 股票池统计 */
export interface StockPoolStats {
  totalStocks: number;
  byMarket: Record<string, number>;
  byIndustry: Record<string, number>;
  byWatchLevel: Record<string, number>;
  recentlyAdded: number;
  lastUpdated: Date;
}

/** 专家意见统计 */
export interface ExpertOpinionStats {
  totalOpinions: number;
  byExpert: Record<string, number>;
  bySentiment: Record<string, number>;
  byTimeframe: Record<string, number>;
  recentOpinions: number;
  lastUpdated: Date;
}

// ==================== 导入相关 ====================

/** 富途股票数据格式 */
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

/** 导入的股票数据 */
export interface ImportedStock extends BaseEntity, TaggedEntity, NotedEntity {
  symbol: string;
  name: string;
  market: MarketType;
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
}