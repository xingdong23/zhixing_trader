// 【知行交易】核心数据模型定义
// 这些类型定义体现了从工具到交易教练的核心哲学

// ==================== 基础枚举类型 ====================

// 交易情绪类型 - 帮助用户识别和管理交易心理
export enum TradingEmotion {
  CALM = 'calm',           // 冷静分析
  FOMO = 'fomo',           // 害怕错过
  FEAR = 'fear',           // 恐惧
  GREED = 'greed',         // 贪婪
  REVENGE = 'revenge',     // 报复性交易
  CONFIDENT = 'confident', // 自信
  UNCERTAIN = 'uncertain'  // 不确定
}

// 信息来源类型 - 追踪决策依据的质量
export enum InformationSource {
  SELF_ANALYSIS = 'self_analysis',     // 自己分析
  FRIEND_RECOMMEND = 'friend_recommend', // 朋友推荐
  NEWS_MEDIA = 'news_media',           // 新闻媒体
  SOCIAL_MEDIA = 'social_media',       // 社交媒体
  PROFESSIONAL_REPORT = 'professional_report', // 专业报告
  TECHNICAL_SIGNAL = 'technical_signal' // 技术信号
}

// 交易状态
export enum TradeStatus {
  PLANNING = 'planning',     // 计划中
  ACTIVE = 'active',         // 执行中
  CLOSED = 'closed',         // 已平仓
  CANCELLED = 'cancelled'    // 已取消
}

// 纪律执行评级
export enum DisciplineRating {
  PERFECT = 'perfect',       // 完美执行
  GOOD = 'good',            // 基本执行
  PARTIAL = 'partial',      // 部分执行
  POOR = 'poor'             // 未执行
}

// ==================== 核心数据结构 ====================

// ==================== 高级交易策略数据结构 ====================

// 加仓层级 - 金字塔式加仓的单个层级
export interface PositionLayer {
  id: string;
  layerIndex: number;         // 层级序号 (1, 2, 3...)
  targetPrice: number;        // 目标加仓价格
  positionPercent: number;    // 该层级仓位占总资金比例 (如20%)
  executed: boolean;          // 是否已执行
  actualPrice?: number;       // 实际执行价格
  executedAt?: Date;          // 执行时间
  deviation?: number;         // 执行偏差 (实际价格 vs 计划价格)
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
  currentView: 'dashboard' | 'planning' | 'tracking' | 'insights' | 'playbooks' | 'review';
  
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
    industry: string[];        // 行业标签：量子计算、核能、新能源汽车等
    fundamentals: string[];    // 基本面标签：基本面优秀、财务健康、高成长等
    marketCap: 'large' | 'mid' | 'small';  // 市值规模
    watchLevel: 'high' | 'medium' | 'low'; // 关注程度
  };

  // 实时数据（可选，用于显示）
  currentPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
  volume?: number;

  // 元数据
  addedAt: Date;
  updatedAt: Date;
  notes?: string;              // 用户备注
}

// 技术条件
export interface TechnicalCondition {
  type: 'price_breakthrough' | 'moving_average' | 'volume' | 'indicator' | 'pattern';
  parameter: string;           // 参数名称，如 'ma20', 'rsi', 'volume_ratio'
  operator: '>' | '<' | '>=' | '<=' | '=' | 'cross_above' | 'cross_below';
  value: number;
  description: string;         // 条件描述
}

// 基本面条件
export interface FundamentalCondition {
  type: 'pe_ratio' | 'pb_ratio' | 'roe' | 'revenue_growth' | 'profit_growth';
  operator: '>' | '<' | '>=' | '<=' | '=';
  value: number;
  description: string;
}

// 价格条件
export interface PriceCondition {
  type: 'price_range' | 'price_change' | 'price_level';
  minValue?: number;
  maxValue?: number;
  description: string;
}

// 选股策略
export interface SelectionStrategy {
  id: string;
  name: string;                // 策略名称，如 "平台突破策略"
  description: string;         // 策略描述
  category: 'breakthrough' | 'pullback' | 'pattern' | 'indicator' | 'fundamental';

  // 策略条件
  conditions: {
    technical: TechnicalCondition[];
    fundamental: FundamentalCondition[];
    price: PriceCondition[];
  };

  // 策略参数
  parameters: {
    timeframe: string;         // 时间周期，如 '1d', '1w'
    volumeThreshold: number;   // 成交量阈值
    priceChangeThreshold: number; // 价格变化阈值
  };

  // 策略状态
  isActive: boolean;           // 是否启用
  isSystemDefault: boolean;    // 是否为系统预设

  // 元数据
  createdAt: Date;
  updatedAt: Date;
}

// 选股结果中的单个股票
export interface SelectedStock {
  stock: Stock;
  score: number;               // 匹配分数 (0-100)
  reasons: string[];           // 选中原因
  suggestedAction: string;     // 建议操作
  targetPrice?: number;        // 目标价格
  stopLoss?: number;          // 建议止损价
  confidence: 'high' | 'medium' | 'low'; // 信心度
}

// 每日选股结果
export interface DailySelection {
  id: string;
  date: Date;

  // 按策略分组的结果
  strategyResults: {
    strategyId: string;
    strategyName: string;
    category: string;
    selectedStocks: SelectedStock[];
    totalCount: number;
  }[];

  // 汇总信息
  summary: {
    totalStocks: number;
    totalStrategies: number;
    topOpportunities: SelectedStock[]; // 最佳机会（跨策略）
  };

  createdAt: Date;
}

// 股票池统计
export interface StockPoolStats {
  totalStocks: number;
  byMarket: Record<string, number>;
  byIndustry: Record<string, number>;
  byWatchLevel: Record<string, number>;
  recentlyAdded: number;       // 最近7天添加的数量
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
