// 【知行交易】交易相关类型定义
// 包含交易计划、策略、记录、风险管理等相关类型

import { BaseEntity, TaggedEntity, NotedEntity, BaseStats, TradingEmotion, InformationSource, TradeStatus, DisciplineRating } from './core';

// ==================== 交易类型分类 ====================

/** 交易类型 */
export enum TradingType {
  SHORT_TERM = 'short_term',     // 短期投机
  SWING = 'swing',               // 波段交易
  VALUE = 'value'                // 价值投资
}

/** 交易类型配置 */
export interface TradingTypeConfig {
  type: TradingType;
  name: string;
  description: string;
  timeframe: string;
  riskTolerance: 'high' | 'medium' | 'low';
  maxPositionSize: number;       // 最大仓位比例
  stopLossRange: [number, number]; // 止损范围
  takeProfitRange: [number, number]; // 止盈范围
}

// ==================== 交易策略 ====================

/** 策略类型 */
export enum StrategyType {
  TECHNICAL = 'technical',       // 技术分析
  FUNDAMENTAL = 'fundamental',   // 基本面分析
  QUANTITATIVE = 'quantitative', // 量化策略
  MIXED = 'mixed'               // 混合策略
}

/** 交易策略 */
export interface TradingStrategy extends BaseEntity, TaggedEntity, NotedEntity {
  name: string;
  type: StrategyType;
  tradingType: TradingType;      // 适用的交易类型
  description: string;
  rules: string[];               // 策略规则
  entryConditions: string[];     // 入场条件
  exitConditions: string[];      // 出场条件
  riskManagement: string[];      // 风险管理规则
  isActive: boolean;
  successRate?: number;          // 成功率
  avgReturn?: number;            // 平均收益率
  maxDrawdown?: number;          // 最大回撤
  usageCount: number;            // 使用次数
}

// ==================== 交易计划 ====================

/** 加仓层级 */
export interface AddPositionLevel {
  level: number;                 // 层级编号
  triggerPrice: number;          // 触发价格
  quantity: number;              // 加仓数量
  reasoning: string;             // 加仓理由
  isTriggered: boolean;          // 是否已触发
  triggeredAt?: Date;            // 触发时间
}

/** 止盈层级 */
export interface TakeProfitLevel {
  level: number;                 // 层级编号
  triggerPrice: number;          // 触发价格
  sellRatio: number;             // 卖出比例 (0-1)
  reasoning: string;             // 止盈理由
  isTriggered: boolean;          // 是否已触发
  triggeredAt?: Date;            // 触发时间
}

/** 交易计划 */
export interface TradingPlan extends BaseEntity, TaggedEntity, NotedEntity {
  stockId: string;
  strategyId?: string;
  tradingType: TradingType;
  
  // 基本信息
  title: string;
  description: string;
  
  // 价格计划
  entryPrice: number;            // 计划入场价格
  stopLoss: number;              // 止损价格
  takeProfit: number;            // 止盈价格
  
  // 仓位管理
  plannedQuantity: number;       // 计划数量
  maxInvestment: number;         // 最大投资金额
  addPositionLevels: AddPositionLevel[]; // 加仓层级
  takeProfitLevels: TakeProfitLevel[];   // 止盈层级
  
  // 条件设置
  entryConditions: string[];     // 入场条件
  exitConditions: string[];      // 出场条件
  
  // 状态管理
  status: TradeStatus;
  isActive: boolean;
  
  // 执行记录
  executedAt?: Date;             // 执行时间
  actualEntryPrice?: number;     // 实际入场价格
  actualQuantity?: number;       // 实际数量
  
  // 风险控制
  maxLossAmount: number;         // 最大亏损金额
  riskLevel: 'low' | 'medium' | 'high';
  
  // 情绪和纪律
  emotion: TradingEmotion;
  disciplineScore?: number;      // 纪律评分
  
  // 关联数据
  tradingRecords: string[];      // 关联的交易记录ID
}

// ==================== 交易记录 ====================

/** 交易操作类型 */
export enum TradeAction {
  BUY = 'buy',
  SELL = 'sell',
  ADD_POSITION = 'add_position',
  REDUCE_POSITION = 'reduce_position'
}

/** 交易记录 */
export interface TradingRecord extends BaseEntity, TaggedEntity, NotedEntity {
  planId?: string;               // 关联的交易计划ID
  stockId: string;
  tradingType: TradingType;
  
  // 交易基本信息
  action: TradeAction;
  quantity: number;
  price: number;
  amount: number;                // 交易金额
  commission: number;            // 手续费
  
  // 时间信息
  executedAt: Date;
  
  // 市场信息
  marketPrice: number;           // 当时市价
  marketCondition: string;       // 市场状况描述
  
  // 决策信息
  reasoning: string;             // 交易理由
  emotion: TradingEmotion;       // 交易时情绪
  infoSource: InformationSource;        // 信息来源
  
  // 纪律评估
  followedPlan: boolean;         // 是否按计划执行
  disciplineRating: DisciplineRating; // 纪律评级
  disciplineNotes?: string;      // 纪律备注
  
  // 结果评估
  isProfit?: boolean;            // 是否盈利
  profitAmount?: number;         // 盈亏金额
  profitRate?: number;           // 盈亏比例
  
  // 复盘标记
  isReviewed: boolean;           // 是否已复盘
  reviewNotes?: string;          // 复盘笔记
  reviewScore?: number;          // 复盘评分
}

// ==================== 风险管理 ====================

/** 风险管理规则 */
export interface RiskManagement extends BaseEntity {
  tradingType: TradingType;
  
  // 仓位控制
  maxSinglePosition: number;     // 单只股票最大仓位
  maxTotalPosition: number;      // 总仓位上限
  maxDailyLoss: number;          // 单日最大亏损
  maxWeeklyLoss: number;         // 单周最大亏损
  
  // 止损设置
  defaultStopLoss: number;       // 默认止损比例
  maxStopLoss: number;           // 最大止损比例
  trailingStopLoss: boolean;     // 是否启用移动止损
  
  // 交易频率
  maxDailyTrades: number;        // 单日最大交易次数
  cooldownPeriod: number;        // 冷静期(小时)
  
  // 情绪控制
  emotionCheckRequired: boolean; // 是否需要情绪检查
  rationalityCheckRequired: boolean; // 是否需要理性检查
  
  isActive: boolean;
}

// ==================== 交易统计 ====================

/** 交易统计 */
export interface TradingStats extends BaseStats {
  // 基础统计
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  
  // 收益统计
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  avgProfit: number;
  avgLoss: number;
  profitFactor: number;          // 盈亏比
  
  // 风险统计
  maxDrawdown: number;
  maxConsecutiveLosses: number;
  maxConsecutiveWins: number;
  sharpeRatio?: number;
  
  // 分类统计
  byTradingType: Record<TradingType, {
    trades: number;
    winRate: number;
    avgReturn: number;
    totalProfit: number;
  }>;
  
  // 纪律统计
  disciplineScore: number;
  planFollowRate: number;        // 计划执行率
  emotionalTrades: number;       // 情绪化交易次数
  
  // 时间统计
  avgHoldingPeriod: number;      // 平均持仓时间(天)
  tradingFrequency: number;      // 交易频率(次/月)
}

// ==================== 实时日志 ====================

/** 日志类型 */
export enum LogType {
  TRADE = 'trade',               // 交易日志
  PLAN = 'plan',                 // 计划日志
  EMOTION = 'emotion',           // 情绪日志
  MARKET = 'market',             // 市场日志
  SYSTEM = 'system'              // 系统日志
}

/** 实时日志 */
export interface RealTimeLog extends BaseEntity {
  type: LogType;
  level: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  relatedId?: string;            // 关联的记录ID
  metadata?: Record<string, any>; // 额外元数据
  isRead: boolean;
  isImportant: boolean;
}

// ==================== 交易剧本 ====================

/** 剧本类型 */
export enum ScriptType {
  ENTRY = 'entry',               // 入场剧本
  EXIT = 'exit',                 // 出场剧本
  RISK_CONTROL = 'risk_control', // 风控剧本
  EMOTION_CONTROL = 'emotion_control' // 情绪控制剧本
}

/** 交易剧本 */
export interface TradingScript extends BaseEntity, TaggedEntity, NotedEntity {
  name: string;
  type: ScriptType;
  tradingType: TradingType;
  description: string;
  
  // 剧本内容
  conditions: string[];          // 触发条件
  actions: string[];             // 执行动作
  checkpoints: string[];         // 检查点
  
  // 使用统计
  usageCount: number;
  successRate: number;
  
  isActive: boolean;
  isDefault: boolean;            // 是否为默认剧本
}

// ==================== 导出类型集合 ====================

export type TradingEntity = TradingPlan | TradingRecord | TradingStrategy | RiskManagement | TradingScript;
export type TradingConfig = TradingTypeConfig | RiskManagement;
export type TradingAnalytics = TradingStats | RealTimeLog;