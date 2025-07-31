// 【知行交易】分析相关类型定义
// 包含选股策略、推荐、洞察、复盘分析等相关类型

import { BaseEntity, TaggedEntity, NotedEntity, BaseStats } from './core';
import { TradingType } from './trading';
import { Stock } from './stock';

// ==================== 选股策略 ====================

/** 技术条件 */
export interface TechnicalCondition {
  indicator: string;             // 技术指标名称
  operator: '>' | '<' | '=' | '>=' | '<=' | 'between' | 'cross_above' | 'cross_below';
  value: number | [number, number]; // 条件值
  timeframe: string;             // 时间周期
  description: string;           // 条件描述
}

/** 基本面条件 */
export interface FundamentalCondition {
  metric: string;                // 基本面指标
  operator: '>' | '<' | '=' | '>=' | '<=' | 'between';
  value: number | [number, number];
  period: string;                // 统计周期
  description: string;
}

/** 价格条件 */
export interface PriceCondition {
  type: 'price' | 'change' | 'volume' | 'turnover';
  operator: '>' | '<' | '=' | '>=' | '<=' | 'between';
  value: number | [number, number];
  timeframe: string;
  description: string;
}

/** 选股策略 */
export interface StockSelectionStrategy extends BaseEntity, TaggedEntity, NotedEntity {
  name: string;
  description: string;
  tradingType: TradingType;      // 适用的交易类型
  
  // 筛选条件
  technicalConditions: TechnicalCondition[];
  fundamentalConditions: FundamentalCondition[];
  priceConditions: PriceCondition[];
  
  // 市场筛选
  markets: string[];             // 适用市场
  industries: string[];          // 适用行业
  marketCapRange?: [number, number]; // 市值范围
  
  // 排序和限制
  sortBy: string;                // 排序字段
  sortOrder: 'asc' | 'desc';     // 排序方向
  maxResults: number;            // 最大结果数
  
  // 统计信息
  usageCount: number;
  avgSuccessRate?: number;
  lastRunAt?: Date;
  
  isActive: boolean;
  isDefault: boolean;
}

// ==================== 每日选股 ====================

/** 选股结果 */
export interface StockSelectionResult {
  stockId: string;
  stock: Stock;
  score: number;                 // 综合评分
  rank: number;                  // 排名
  
  // 匹配详情
  technicalScore: number;        // 技术面评分
  fundamentalScore: number;      // 基本面评分
  priceScore: number;            // 价格评分
  
  // 匹配条件
  matchedConditions: string[];   // 匹配的条件
  warnings: string[];            // 警告信息
  
  // 推荐信息
  recommendedAction: 'buy' | 'watch' | 'avoid';
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

/** 每日选股 */
export interface DailyStockSelection extends BaseEntity {
  date: Date;
  strategyId: string;
  strategy: StockSelectionStrategy;
  
  // 执行信息
  executedAt: Date;
  executionTime: number;         // 执行耗时(毫秒)
  
  // 结果统计
  totalScanned: number;          // 扫描总数
  totalMatched: number;          // 匹配总数
  avgScore: number;              // 平均评分
  
  // 选股结果
  results: StockSelectionResult[];
  
  // 市场概况
  marketSummary: {
    trend: 'bullish' | 'bearish' | 'neutral';
    volatility: 'high' | 'medium' | 'low';
    volume: 'high' | 'medium' | 'low';
    sentiment: string;
  };
  
  // 状态
  status: 'running' | 'completed' | 'failed';
  errorMessage?: string;
}

// ==================== 交易推荐 ====================

/** 推荐类型 */
export enum RecommendationType {
  BUY = 'buy',
  SELL = 'sell',
  HOLD = 'hold',
  WATCH = 'watch',
  AVOID = 'avoid'
}

/** 推荐来源 */
export enum RecommendationSource {
  ALGORITHM = 'algorithm',       // 算法推荐
  EXPERT = 'expert',            // 专家推荐
  NEWS = 'news',                // 新闻驱动
  TECHNICAL = 'technical',      // 技术分析
  FUNDAMENTAL = 'fundamental'   // 基本面分析
}

/** 交易推荐 */
export interface TradingRecommendation extends BaseEntity, TaggedEntity {
  stockId: string;
  stock: Stock;
  
  // 推荐信息
  type: RecommendationType;
  source: RecommendationSource;
  confidence: number;            // 信心度 0-100
  priority: 'high' | 'medium' | 'low';
  
  // 价格信息
  currentPrice: number;
  targetPrice?: number;
  stopLoss?: number;
  priceRange?: [number, number]; // 合理价格区间
  
  // 推荐理由
  title: string;
  summary: string;
  reasoning: string[];
  risks: string[];
  catalysts: string[];
  
  // 时间信息
  timeframe: string;             // 推荐时间框架
  validUntil?: Date;             // 有效期
  
  // 跟踪信息
  isActive: boolean;
  isFollowed: boolean;           // 是否已跟进
  followedAt?: Date;
  
  // 结果跟踪
  actualReturn?: number;         // 实际收益率
  maxReturn?: number;            // 最大收益率
  minReturn?: number;            // 最小收益率
  
  // 用户反馈
  userRating?: number;           // 用户评分 1-5
  userNotes?: string;
}

// ==================== 洞察分析 ====================

/** 洞察类型 */
export enum InsightType {
  MARKET_TREND = 'market_trend',         // 市场趋势
  SECTOR_ROTATION = 'sector_rotation',   // 板块轮动
  RISK_WARNING = 'risk_warning',         // 风险警告
  OPPORTUNITY = 'opportunity',           // 投资机会
  PERFORMANCE = 'performance',           // 表现分析
  BEHAVIOR = 'behavior'                  // 行为分析
}

/** 洞察卡片 */
export interface InsightCard extends BaseEntity, TaggedEntity {
  type: InsightType;
  title: string;
  summary: string;
  content: string;
  
  // 重要性
  importance: 'critical' | 'high' | 'medium' | 'low';
  urgency: 'immediate' | 'soon' | 'normal' | 'low';
  
  // 影响范围
  affectedStocks?: string[];     // 影响的股票
  affectedSectors?: string[];    // 影响的行业
  
  // 数据支撑
  dataPoints: {
    label: string;
    value: number | string;
    trend?: 'up' | 'down' | 'stable';
    change?: number;
  }[];
  
  // 建议行动
  recommendedActions: string[];
  
  // 时效性
  validFrom: Date;
  validUntil?: Date;
  
  // 用户交互
  isRead: boolean;
  isBookmarked: boolean;
  isDismissed: boolean;
  
  // 关联数据
  relatedInsights?: string[];    // 相关洞察ID
  sourceData?: Record<string, any>; // 源数据
}

// ==================== 复盘分析 ====================

/** 复盘类型 */
export enum ReviewType {
  DAILY = 'daily',               // 日度复盘
  WEEKLY = 'weekly',             // 周度复盘
  MONTHLY = 'monthly',           // 月度复盘
  QUARTERLY = 'quarterly',       // 季度复盘
  TRADE_SPECIFIC = 'trade_specific' // 单笔交易复盘
}

/** 复盘维度 */
export interface ReviewDimension {
  name: string;
  score: number;                 // 评分 0-100
  weight: number;                // 权重
  description: string;
  improvements: string[];        // 改进建议
}

/** 复盘报告 */
export interface ReviewReport extends BaseEntity, TaggedEntity, NotedEntity {
  type: ReviewType;
  tradingType?: TradingType;     // 针对的交易类型
  period: {
    start: Date;
    end: Date;
  };
  
  // 总体评估
  overallScore: number;          // 总体评分
  overallGrade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  
  // 分维度评估
  dimensions: ReviewDimension[];
  
  // 关键指标
  keyMetrics: {
    totalTrades: number;
    winRate: number;
    avgReturn: number;
    maxDrawdown: number;
    disciplineScore: number;
    emotionScore: number;
  };
  
  // 亮点和问题
  highlights: string[];          // 做得好的地方
  issues: string[];             // 存在的问题
  
  // 改进计划
  improvements: {
    area: string;
    action: string;
    priority: 'high' | 'medium' | 'low';
    deadline?: Date;
  }[];
  
  // 学习要点
  learnings: string[];
  
  // 下期目标
  nextPeriodGoals: string[];
  
  // 关联数据
  relatedTrades?: string[];      // 相关交易ID
  attachments?: {
    name: string;
    type: 'chart' | 'document' | 'link';
    url: string;
  }[];
  
  // 状态
  isCompleted: boolean;
  completedAt?: Date;
}

// ==================== 市场分析 ====================

/** 市场情绪 */
export interface MarketSentiment {
  date: Date;
  
  // 情绪指标
  fearGreedIndex: number;        // 恐惧贪婪指数 0-100
  vixLevel: number;              // 波动率指数
  putCallRatio: number;          // 看跌看涨比率
  
  // 技术指标
  marketTrend: 'bullish' | 'bearish' | 'neutral';
  volatility: 'high' | 'medium' | 'low';
  volume: 'high' | 'medium' | 'low';
  
  // 基本面
  economicIndicators: {
    gdpGrowth?: number;
    inflation?: number;
    unemployment?: number;
    interestRate?: number;
  };
  
  // 新闻情绪
  newssentiment: number;        // 新闻情绪分数 -100 到 100
  socialSentiment: number;       // 社交媒体情绪分数
  
  // 资金流向
  moneyFlow: {
    inflow: number;
    outflow: number;
    net: number;
  };
  
  // 解读
  interpretation: string;
  recommendations: string[];
}

// ==================== 统计分析 ====================

/** 选股统计 */
export interface SelectionStats extends BaseStats {
  // 策略统计
  totalStrategies: number;
  activeStrategies: number;
  avgExecutionTime: number;
  
  // 结果统计
  totalSelections: number;
  avgStocksPerDay: number;
  avgScore: number;
  
  // 成功率统计
  followedRecommendations: number;
  successfulTrades: number;
  successRate: number;
  
  // 分类统计
  byTradingType: Record<TradingType, {
    selections: number;
    avgScore: number;
    successRate: number;
  }>;
  
  // 趋势数据
  dailyTrends: {
    date: Date;
    selections: number;
    avgScore: number;
    marketTrend: string;
  }[];
}

/** 推荐统计 */
export interface RecommendationStats extends BaseStats {
  // 基础统计
  totalRecommendations: number;
  activeRecommendations: number;
  followedRecommendations: number;
  
  // 成功率统计
  successfulRecommendations: number;
  overallSuccessRate: number;
  avgReturn: number;
  
  // 分类统计
  byType: Record<RecommendationType, {
    count: number;
    successRate: number;
    avgReturn: number;
  }>;
  
  bySource: Record<RecommendationSource, {
    count: number;
    successRate: number;
    avgReturn: number;
  }>;
  
  // 时间统计
  avgHoldingPeriod: number;
  avgResponseTime: number;       // 平均响应时间
}

// ==================== 导出类型集合 ====================

export type AnalysisEntity = StockSelectionStrategy | DailyStockSelection | TradingRecommendation | InsightCard | ReviewReport;
export type AnalysisResult = StockSelectionResult | TradingRecommendation | InsightCard;
export type AnalysisStats = SelectionStats | RecommendationStats | MarketSentiment;
export type AnalysisCondition = TechnicalCondition | FundamentalCondition | PriceCondition;