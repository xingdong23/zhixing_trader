// 【知行交易】交易相关类型定义

// 基础枚举
export enum TradingEmotion {
  CALM = 'calm',           // 冷静分析
  FOMO = 'fomo',           // 害怕错过
  FEAR = 'fear',           // 恐惧
  GREED = 'greed',         // 贪婪
  REVENGE = 'revenge',     // 报复性交易
  CONFIDENT = 'confident', // 自信
  UNCERTAIN = 'uncertain'  // 不确定
}

export enum InformationSource {
  SELF_ANALYSIS = 'self_analysis',     // 自己分析
  FRIEND_RECOMMEND = 'friend_recommend', // 朋友推荐
  NEWS_MEDIA = 'news_media',           // 新闻媒体
  SOCIAL_MEDIA = 'social_media',       // 社交媒体
  PROFESSIONAL_REPORT = 'professional_report', // 专业报告
  TECHNICAL_SIGNAL = 'technical_signal' // 技术信号
}

export enum TradeStatus {
  PLANNING = 'planning',     // 计划中
  ACTIVE = 'active',         // 执行中
  CLOSED = 'closed',         // 已平仓
  CANCELLED = 'cancelled'    // 已取消
}

export enum DisciplineRating {
  PERFECT = 'perfect',       // 完美执行
  GOOD = 'good',            // 基本执行
  PARTIAL = 'partial',      // 部分执行
  POOR = 'poor'             // 未执行
}

// 加仓层级
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

// 止盈层级
export interface TakeProfitLayer {
  id: string;
  layerIndex: number;         // 层级序号
  targetPrice: number;        // 目标止盈价格
  sellPercent: number;        // 该层级减仓比例
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

// 交易计划
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

// 执行记录
export interface ExecutionRecord {
  id: string;
  type: 'BUY' | 'SELL';
  layerId?: string;           // 关联的层级ID
  price: number;              // 执行价格
  quantity: number;           // 执行数量
  amount: number;             // 执行金额
  timestamp: Date;            // 执行时间
  deviation: number;          // 与计划的偏差
  notes?: string;             // 执行备注
}

// 交易记录
export interface TradeRecord {
  id: string;
  planId: string;             // 关联的计划ID
  createdAt: Date;
  updatedAt: Date;

  // 执行记录
  executions: ExecutionRecord[]; // 所有执行记录

  // 持仓信息
  currentPosition: number;     // 当前持仓数量
  averageEntryPrice: number;   // 平均买入价
  totalInvested: number;       // 总投入金额

  // 盈亏信息
  unrealizedPnL: number;       // 浮动盈亏
  realizedPnL: number;         // 已实现盈亏
  totalPnL: number;            // 总盈亏
  totalPnLPercent: number;     // 总盈亏百分比

  // 时间信息
  firstEntryTime?: Date;       // 首次买入时间
  lastExitTime?: Date;         // 最后卖出时间

  // 纪律评估
  disciplineRating: DisciplineRating; // 纪律执行评级
  disciplineNotes: string;     // 纪律执行说明

  // 交易总结
  tradingSummary: string;      // 交易总结
  lessonsLearned: string;      // 经验教训

  // 状态
  status: TradeStatus;
}

// 交易统计
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

  // 情绪和来源分析
  emotionBreakdown: Record<TradingEmotion, number>;
  sourceBreakdown: Record<InformationSource, number>;

  // 时间统计
  avgHoldingDays: number;

  // 更新时间
  lastUpdated: Date;
}

// 实时交易日志
export interface LiveJournal {
  id: string;
  tradeId: string;           // 关联的交易ID
  timestamp: Date;
  
  // 市场状态
  currentPrice: number;      // 当前价格
  observation: string;       // 观察记录
  emotion: TradingEmotion;   // 当时情绪
  
  // 调整考虑
  consideringAdjustment: boolean;
  adjustmentReason?: string;
}