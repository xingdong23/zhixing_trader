// 【知行交易】类型定义统一入口
// 重构后的模块化类型系统，提供清晰的类型组织和导出

// ==================== 核心类型导出 ====================
export * from './core';
export * from './stock';
export * from './trading';
export * from './analysis';
export * from './app';

// ==================== 工具类型 ====================

/** 实体ID类型 */
export type EntityId = string;

/** 时间戳类型 */
export type Timestamp = Date | string;

/** 价格类型 */
export type Price = number;

/** 百分比类型 */
export type Percentage = number;

/** 评分类型 (1-10) */
export type Score = number;

/** 颜色类型 */
export type Color = string;

/** 可选字段工具类型 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** 必需字段工具类型 */
export type Required<T, K extends keyof T> = T & Required<Pick<T, K>>;

/** 深度部分类型 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** 深度只读类型 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// ==================== 联合类型 ====================

/** 所有实体类型 */
export type AnyEntity = 
  | Stock 
  | TradingStrategy 
  | TradingPlan 
  | TradingRecord 
  | StockSelectionStrategy 
  | TradingRecommendation 
  | InsightCard 
  | Expert 
  | Concept 
  | Industry;

/** 所有统计类型 */
export type AnyStats = 
  | TradingStats 
  | StockPoolStats 
  | SelectionStats 
  | RecommendationStats 
  | AppStats;

/** 所有配置类型 */
export type AnyConfig = 
  | UserSettings 
  | ThemeSettings 
  | TradingSettings 
  | NotificationSettings 
  | DataSettings 
  | TradingTypeConfig;

/** 所有状态类型 */
export type AnyState = 
  | AppState 
  | UIState 
  | DisciplineStatus;

// ==================== 类型守卫 ====================

/** 检查是否为有效实体 */
export function isValidEntity(entity: any): entity is AnyEntity {
  return entity && typeof entity === 'object' && typeof entity.id === 'string';
}

/** 检查是否为股票类型 */
export function isStock(entity: any): entity is Stock {
  return isValidEntity(entity) && 'symbol' in entity && 'name' in entity;
}

/** 检查是否为交易计划 */
export function isTradingPlan(entity: any): entity is TradingPlan {
  return isValidEntity(entity) && 'stockId' in entity && 'strategyId' in entity;
}

/** 检查是否为交易记录 */
export function isTradingRecord(entity: any): entity is TradingRecord {
  return isValidEntity(entity) && 'planId' in entity && 'price' in entity;
}

// ==================== 默认值 ====================

/** 默认分页参数 */
export const DEFAULT_PAGINATION: PaginationParams = {
  page: 1,
  pageSize: 20
};

/** 默认排序参数 */
export const DEFAULT_SORT: SortParams = {
  field: 'createdAt',
  order: 'desc'
};

/** 默认用户设置 */
export const DEFAULT_USER_SETTINGS: Partial<UserSettings> = {
  theme: {
    mode: 'auto',
    primaryColor: '#1890ff',
    fontSize: 'medium',
    compactMode: false,
    animations: true
  },
  trading: {
    defaultTradingType: 'swing',
    defaultRiskLevel: 'medium',
    defaultStopLoss: 0.05,
    defaultTakeProfit: 0.15,
    maxDailyLoss: 0.02,
    maxPositionSize: 0.1,
    requireConfirmation: true,
    enableDisciplineCheck: true,
    enableEmotionCheck: true,
    cooldownPeriod: 300,
    autoSaveEnabled: true,
    autoBackupEnabled: true,
    autoSyncInterval: 5
  },
  notifications: {
    enabled: true,
    soundEnabled: true,
    desktopEnabled: true,
    priceAlerts: true,
    tradeAlerts: true,
    systemAlerts: true,
    marketAlerts: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    },
    maxNotificationsPerHour: 10,
    groupSimilarNotifications: true
  }
};

// ==================== 常量 ====================

/** 支持的市场 */
export const SUPPORTED_MARKETS = ['SH', 'SZ', 'BJ'] as const;

/** 交易类型 */
export const TRADING_TYPES = ['short_term', 'swing', 'value'] as const;

/** 风险等级 */
export const RISK_LEVELS = ['low', 'medium', 'high'] as const;

/** 应用模块 */
export const APP_MODULES = [
  'dashboard',
  'stock_market', 
  'trading_management',
  'review_center',
  'research_lab',
  'script_manager',
  'settings',
  'database_admin'
] as const;

// ==================== 版本信息 ====================

/** 类型系统版本 */
export const TYPE_SYSTEM_VERSION = '2.0.0';

/** 最后更新时间 */
export const LAST_UPDATED = '2024-12-19';

/** 重构说明 */
export const REFACTOR_NOTES = {
  version: '2.0.0',
  changes: [
    '模块化类型定义，按功能领域分离',
    '统一的基础类型和工具类型',
    '清晰的导出结构和类型集合',
    '完善的类型守卫和默认值',
    '支持交易类型分类管理系统'
  ],
  migration: {
    from: '1.x',
    breaking: false,
    notes: '向后兼容，建议逐步迁移到新的模块化导入'
  }
};

// ==================== 遗留类型定义（待迁移） ====================
// 注意：以下类型定义将逐步迁移到对应的模块文件中

// 加仓层级 - 分批建仓的单个层级
export interface PositionLayer {
  id: string;
  layerIndex: number;         // 层级序号 (1, 2, 3...)
  targetPrice: number;        // 目标加仓价格
  positionPercent: number;    // 该层级仓位占总资金比例
  executed: boolean;          // 是否已执行
  actualPrice?: number;       // 实际执行价格
  executedAt?: Date;          // 执行时间
  deviation?: number;         // 执行偏差
}

// 止盈层级 - 滚动止盈的单个层级
export interface TakeProfitLayer {
  id: string;
  layerIndex: number;         // 层级序号 (1, 2, 3...)
  targetPrice: number;        // 目标止盈价格
  sellPercent: number;        // 该层级减仓比例 (如30%)
  executed: boolean;          // 是否已执行
  actualPrice?: number;       // 实际执行价格
  executedAt?: Date;          // 执行时间
  deviation?: number;         // 执行偏差
}

// 纪律执行状态
export interface DisciplineStatus {
  overallScore: number;       // 总体纪律分 (0-100)
  entryDiscipline: number;    // 入场纪律分
  exitDiscipline: number;     // 出场纪律分
  positionDiscipline: number; // 仓位纪律分
  violations: DisciplineViolation[]; // 违规记录
  lastUpdated: Date;
}

// 纪律违规记录
export interface DisciplineViolation {
  id: string;
  type: 'EARLY_ENTRY' | 'LATE_ENTRY' | 'WRONG_SIZE' | 'MISSED_STOP' | 'EMOTIONAL_EXIT';
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  timestamp: Date;
  priceDeviation?: number;    // 价格偏差
  sizeDeviation?: number;     // 仓位偏差
}

// 交易计划 - 支持复杂策略的完整计划
export interface TradingPlan {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  // 基础信息
  symbol: string;              // 股票代码
  symbolName: string;          // 股票名称

  // 策略类型
  strategyType: 'SINGLE_ENTRY' | 'PYRAMID_ENTRY' | 'GRID_TRADING';

  // 分批加仓策略
  positionLayers: PositionLayer[];  // 加仓层级
  maxTotalPosition: number;         // 最大总仓位比例

  // 分批止盈策略
  takeProfitLayers: TakeProfitLayer[]; // 止盈层级
  trailingStopEnabled: boolean;        // 是否启用移动止损
  trailingStopPercent?: number;        // 移动止损百分比

  // 风险管理
  globalStopLoss: number;      // 全局止损价
  maxLossPercent: number;      // 最大亏损比例
  riskRewardRatio: number;     // 风险收益比

  // 决策依据
  buyingLogic: {
    technical: string;         // 技术面分析
    fundamental: string;       // 基本面分析
    news: string;             // 消息面分析
  };

  // 心理与纪律
  emotion: TradingEmotion;     // 交易情绪
  informationSource: InformationSource; // 信息来源
  disciplineLocked: boolean;   // 是否开启纪律锁定
  disciplineStatus: DisciplineStatus; // 纪律执行状态

  // 质量评分
  planQualityScore: number;    // 计划质量分 (0-100)

  // 决策快照
  chartSnapshot?: string;      // K线图快照 (base64)

  // 关联剧本
  playbookId?: string;         // 应用的剧本ID

  // 状态
  status: TradeStatus;
}

// 单次执行记录 - 每次买入/卖出的具体记录
export interface ExecutionRecord {
  id: string;
  type: 'BUY' | 'SELL';
  layerId?: string;           // 关联的层级ID (加仓或止盈层级)
  price: number;              // 执行价格
  quantity: number;           // 执行数量
  amount: number;             // 执行金额
  timestamp: Date;            // 执行时间
  deviation: number;          // 与计划的偏差
  notes?: string;             // 执行备注
}

// 交易记录 - 实际执行的完整记录
export interface TradeRecord {
  id: string;
  planId: string;             // 关联的计划ID
  createdAt: Date;
  updatedAt: Date;

  // 分批执行记录
  executions: ExecutionRecord[]; // 所有执行记录

  // 当前状态
  currentPosition: number;     // 当前持仓数量
  averageEntryPrice: number;   // 平均买入价
  totalInvested: number;       // 总投入金额

  // 盈亏计算
  unrealizedPnL: number;       // 浮动盈亏
  realizedPnL: number;         // 已实现盈亏
  totalPnL: number;            // 总盈亏
  totalPnLPercent: number;     // 总盈亏百分比

  // 执行时间
  firstEntryTime?: Date;       // 首次买入时间
  lastExitTime?: Date;         // 最后卖出时间

  // 纪律评估
  disciplineRating: DisciplineRating; // 纪律执行评级
  disciplineNotes: string;     // 纪律执行说明

  // 复盘总结
  tradingSummary: string;      // 交易总结
  lessonsLearned: string;      // 经验教训

  // 状态
  status: TradeStatus;

  // 持仓详细记录（新增）
  positionDetails: PositionDetail[];

  // 预定操作记录（新增）
  plannedActions: PlannedAction[];

  // 风险管理记录（新增）
  riskManagement: RiskManagementRecord;
}

// ==================== 持仓记录增强 ====================

// 持仓详细记录
export interface PositionDetail {
  id: string;
  timestamp: Date;

  // 持仓信息
  quantity: number;            // 持仓数量
  averagePrice: number;        // 平均成本
  currentPrice: number;        // 当前价格
  marketValue: number;         // 市值

  // 盈亏信息
  unrealizedPnL: number;       // 浮动盈亏
  unrealizedPnLPercent: number; // 浮动盈亏百分比

  // 风险指标
  riskExposure: number;        // 风险敞口
  portfolioWeight: number;     // 组合权重

  // 备注
  notes?: string;
}

// 预定操作类型
export enum PlannedActionType {
  BUY = 'buy',                 // 买入
  SELL = 'sell',               // 卖出
  STOP_LOSS = 'stop_loss',     // 止损
  TAKE_PROFIT = 'take_profit', // 止盈
  ADD_POSITION = 'add_position', // 加仓
  REDUCE_POSITION = 'reduce_position', // 减仓
  ADJUST_STOP = 'adjust_stop'  // 调整止损
}

// 预定操作状态
export enum PlannedActionStatus {
  PENDING = 'pending',         // 待执行
  TRIGGERED = 'triggered',     // 已触发
  EXECUTED = 'executed',       // 已执行
  CANCELLED = 'cancelled',     // 已取消
  EXPIRED = 'expired'          // 已过期
}

// 预定操作记录
export interface PlannedAction {
  id: string;
  type: PlannedActionType;
  status: PlannedActionStatus;

  // 触发条件
  triggerPrice: number;        // 触发价格
  triggerCondition: string;    // 触发条件描述

  // 执行参数
  quantity: number;            // 数量
  orderType: 'market' | 'limit' | 'stop'; // 订单类型
  limitPrice?: number;         // 限价（如果是限价单）

  // 时间信息
  createdAt: Date;
  triggeredAt?: Date;
  executedAt?: Date;
  expiresAt?: Date;

  // 执行结果
  executedPrice?: number;      // 实际执行价格
  executedQuantity?: number;   // 实际执行数量

  // 备注
  reason: string;              // 设置原因
  notes?: string;              // 备注

  // 关联信息
  relatedActionId?: string;    // 关联的其他操作
}

// 风险管理记录
export interface RiskManagementRecord {
  // 止损设置
  stopLoss: {
    initialPrice: number;      // 初始止损价
    currentPrice: number;      // 当前止损价
    adjustmentHistory: {
      timestamp: Date;
      oldPrice: number;
      newPrice: number;
      reason: string;
    }[];
  };

  // 止盈设置
  takeProfits: {
    targetPrice: number;       // 目标价格
    quantity: number;          // 止盈数量
    status: 'active' | 'triggered' | 'executed';
    executedAt?: Date;
    executedPrice?: number;
  }[];

  // 仓位管理
  positionSizing: {
    maxPosition: number;       // 最大仓位
    currentPosition: number;   // 当前仓位
    riskPerTrade: number;      // 单笔风险
    portfolioRisk: number;     // 组合风险
  };

  // 风险警报
  riskAlerts: {
    id: string;
    type: 'stop_loss_hit' | 'max_loss_reached' | 'position_too_large' | 'correlation_risk';
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: Date;
    acknowledged: boolean;
  }[];
}

// 盘中观察日志 - 执行过程中的心理记录
export interface LiveJournal {
  id: string;
  tradeId: string;           // 关联的交易ID
  timestamp: Date;
  
  // 观察内容
  currentPrice: number;      // 当前价格
  observation: string;       // 观察记录
  emotion: TradingEmotion;   // 当时情绪
  
  // 是否考虑调整计划
  consideringAdjustment: boolean;
  adjustmentReason?: string;
}

// 交易剧本 - 成功模式的固化
export interface TradingPlaybook {
  id: string;
  name: string;              // 剧本名称
  description: string;       // 剧本描述
  createdAt: Date;
  updatedAt: Date;
  
  // 剧本模板
  template: {
    buyingLogicTemplate: {
      technical: string;
      fundamental: string;
      news: string;
    };
    riskManagementTemplate: {
      stopLossRatio: number;   // 止损比例
      takeProfitRatio: number; // 止盈比例
    };
    recommendedEmotion: TradingEmotion;
    recommendedSource: InformationSource;
  };
  
  // 历史表现
  performance: {
    totalTrades: number;       // 总交易次数
    winRate: number;          // 胜率
    avgPnLPercent: number;    // 平均盈亏百分比
    avgRiskRewardRatio: number; // 平均风险收益比
    totalPnL: number;         // 总盈亏
  };
  
  // 标签
  tags: string[];
  
  // 是否为系统预设
  isSystemDefault: boolean;
}

// ==================== 统计与分析 ====================

// 个人交易统计
export interface TradingStats {
  // 基础统计
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  
  // 盈亏统计
  totalPnL: number;
  totalPnLPercent: number;
  avgWinPercent: number;
  avgLossPercent: number;
  avgRiskRewardRatio: number;
  
  // 纪律统计
  disciplineScore: number;    // 个人纪律分 (0-100)
  perfectExecutions: number;  // 完美执行次数
  poorExecutions: number;     // 糟糕执行次数
  
  // 情绪分析
  emotionBreakdown: Record<TradingEmotion, number>;
  sourceBreakdown: Record<InformationSource, number>;
  
  // 时间分析
  avgHoldingDays: number;
  
  // 更新时间
  lastUpdated: Date;
}

// 洞察卡片 - AI生成的个人化洞察
export interface InsightCard {
  id: string;
  type: 'emotion' | 'playbook' | 'discipline' | 'source' | 'timing';
  title: string;
  content: string;
  severity: 'info' | 'warning' | 'success' | 'error';
  createdAt: Date;
  isRead: boolean;
}

// ==================== 应用状态 ====================

// 全局应用状态
export interface AppState {
  // 用户数据
  tradingStats: TradingStats;
  
  // 当前数据
  activePlans: TradingPlan[];
  activeRecords: TradeRecord[];
  liveJournals: LiveJournal[];
  playbooks: TradingPlaybook[];
  insights: InsightCard[];
  
  // UI状态
  currentView: 'dashboard' | 'planning' | 'tracking' | 'insights' | 'playbooks' | 'review' | 'settings';
  
  // 设置
  settings: {
    disciplineLockCooldown: number; // 纪律锁定冷却时间(分钟)
    autoGenerateInsights: boolean;  // 自动生成洞察
    notificationsEnabled: boolean;  // 启用通知
  };
}

// ==================== 股票市场模块 ====================

// 股票基础信息
export interface Stock {
  id: string;
  symbol: string;              // 股票代码，如 AAPL
  name: string;                // 股票名称，如 苹果公司
  market: 'US' | 'HK' | 'CN';  // 市场类型

  // 固有属性标签
  tags: {
    industry: string[];        // 行业标签：量子计算、核能、新能源汽车等（保留用于兼容）
    fundamentals: string[];    // 基本面标签：基本面优秀、财务健康、高成长等
    marketCap: 'large' | 'mid' | 'small';  // 市值规模
    watchLevel: 'high' | 'medium' | 'low'; // 关注程度
  };

  // 概念标签系统
  conceptIds: string[];        // 关联的概念ID列表

  // 实时数据（可选，用于显示）
  currentPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
  volume?: number;

  // 元数据
  addedAt: Date;
  updatedAt: Date;
  notes?: string;              // 用户备注

  // 观点追踪
  opinions?: StockOpinion[];   // 观点记录列表
}

// 股票观点记录
export interface StockOpinion {
  id: string;
  stockId: string;
  source: string;              // 观点来源：MVP公众号、微信读书、某某大佬等
  author: string;              // 作者/分析师
  type: 'technical' | 'fundamental' | 'mixed';  // 观点类型

  // 观点内容
  title: string;               // 观点标题
  content: string;             // 详细内容
  sentiment: 'bullish' | 'bearish' | 'neutral';  // 看涨/看跌/中性

  // 价格预期
  targetPrice?: number;        // 目标价
  stopLoss?: number;          // 止损价
  timeframe?: string;         // 时间框架：短期/中期/长期

  // 技术面分析
  technicalAnalysis?: {
    trend: string;             // 趋势分析
    support: number[];         // 支撑位
    resistance: number[];      // 阻力位
    indicators: string[];      // 技术指标分析
  };

  // 基本面分析
  fundamentalAnalysis?: {
    valuation: string;         // 估值分析
    growth: string;           // 成长性分析
    risks: string[];          // 风险因素
    catalysts: string[];      // 催化剂
  };

  // 元数据
  createdAt: Date;
  updatedAt: Date;
  tags: string[];             // 标签：如"金叉"、"突破"、"财报"等
  confidence: number;         // 信心度 1-10
  isActive: boolean;          // 是否仍然有效
}

// ==================== 操作建议模块 ====================

// 注意：TradingRecommendation 已在 analysis.ts 中定义

// 注意：TechnicalCondition, FundamentalCondition, PriceCondition 已在 analysis.ts 中定义

// 注意：SelectionStrategy 对应 analysis.ts 中的 StockSelectionStrategy

// 注意：SelectedStock 对应 analysis.ts 中的 StockSelectionResult

// 注意：DailySelection 对应 analysis.ts 中的 DailyStockSelection

// 股票池统计
export interface StockPoolStats {
  totalStocks: number;
  byMarket: Record<string, number>;
  byIndustry: Record<string, number>;
  byWatchLevel: Record<string, number>;
  recentlyAdded: number;       // 最近7天添加的数量
  lastUpdated: Date;
}

// ==================== 专家意见系统 ====================

// 专家/大佬信息
export interface Expert {
  id: string;
  name: string;                // 专家名称，如 "巴菲特"、"段永平"
  title?: string;              // 头衔，如 "价值投资大师"
  avatar?: string;             // 头像图片
  credibility: number;         // 可信度评分 (0-100)
  specialties: string[];       // 专长领域，如 ["价值投资", "科技股"]
  description?: string;        // 专家简介
  isVerified: boolean;         // 是否认证
  createdAt: Date;
}

// 价格指导类型
export enum PriceGuidanceType {
  BUY_POINT = 'buy_point',           // 买入点位
  SELL_POINT = 'sell_point',         // 卖出点位
  STOP_LOSS = 'stop_loss',           // 止损点位
  TAKE_PROFIT = 'take_profit',       // 止盈点位
  SUPPORT_LEVEL = 'support_level',   // 支撑位
  RESISTANCE_LEVEL = 'resistance_level', // 阻力位
  TARGET_PRICE = 'target_price'      // 目标价
}

// 价格指导
export interface PriceGuidance {
  type: PriceGuidanceType;
  price: number;               // 指导价格
  confidence: 'high' | 'medium' | 'low'; // 信心度
  reasoning: string;           // 理由说明
  timeframe?: string;          // 时间框架，如 "3个月内"
}

// 专家意见
export interface ExpertOpinion {
  id: string;
  stockId: string;             // 关联的股票ID
  expertId: string;            // 专家ID

  // 意见内容
  title: string;               // 意见标题
  content: string;             // 详细分析内容
  sentiment: 'bullish' | 'bearish' | 'neutral'; // 看多/看空/中性

  // 价格指导
  priceGuidances: PriceGuidance[]; // 多个价格指导

  // 附件
  chartImages: string[];       // K线图截图 (base64 或 URL)
  attachments?: {
    name: string;
    url: string;
    type: 'image' | 'pdf' | 'link';
  }[];

  // 元数据
  publishedAt: Date;           // 发布时间
  source?: string;             // 来源，如 "微博"、"雪球"
  sourceUrl?: string;          // 原文链接
  tags: string[];              // 标签，如 ["技术分析", "基本面"]

  // 状态
  isActive: boolean;           // 是否有效（过期的意见可以设为false）
  priority: 'high' | 'medium' | 'low'; // 重要程度

  // 时间戳
  createdAt: Date;
  updatedAt: Date;

  // 用户交互
  userNotes?: string;          // 用户备注
  isBookmarked: boolean;       // 是否收藏
}

// 专家意见统计
export interface ExpertOpinionStats {
  totalOpinions: number;
  byExpert: Record<string, number>;
  bySentiment: Record<string, number>;
  byTimeframe: Record<string, number>;
  recentOpinions: number;      // 最近7天的意见数
  lastUpdated: Date;
}

// ==================== API响应类型 ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 计划质量评分响应
export interface PlanQualityResponse {
  score: number;
  breakdown: {
    basicInfo: number;        // 基础信息完整性
    riskManagement: number;   // 风险管理
    logicClarity: number;     // 逻辑清晰度
    chartEvidence: number;    // 图表证据
    emotionalState: number;   // 情绪状态
  };
  suggestions: string[];
}

// ==================== 概念标签系统接口 ====================

// 概念标签接口
export interface Concept {
  id: string;
  name: string;                // 概念名称，如"新能源汽车"、"人工智能"
  description?: string;        // 概念描述
  color?: string;              // 概念标签颜色
  stockIds: string[];          // 关联的股票ID列表
  stockCount: number;          // 该概念下的股票数量
  createdAt: Date;
  updatedAt: Date;
}

// 概念-股票关联接口
export interface ConceptStockRelation {
  conceptId: string;
  stockId: string;
  addedAt: Date;
}

// 行业分类接口（保留用于富途导入）
export interface Industry {
  id: string;
  name: string;                // 行业名称，如"半导体"、"生物技术"
  description?: string;        // 行业描述
  stockCount: number;          // 该行业股票数量
  createdAt: Date;
  updatedAt: Date;
}

// 富途导入的原始数据接口
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
  [key: string]: string; // 允许其他字段
}

// 导入的股票数据（处理后的格式）
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

// 注意：以上遗留类型定义保持不变，确保向后兼容性
// 新的开发应使用模块化的类型定义
