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

// 交易计划 - 参谋部作业的核心产物
export interface TradingPlan {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  
  // 基础信息
  symbol: string;              // 股票代码
  symbolName: string;          // 股票名称
  plannedEntryPrice: number;   // 计划买入价
  positionSize: number;        // 仓位大小
  
  // 决策依据
  buyingLogic: {
    technical: string;         // 技术面分析
    fundamental: string;       // 基本面分析
    news: string;             // 消息面分析
  };
  
  // 风险管理
  stopLoss: number;           // 止损价
  takeProfit: number;         // 止盈价
  riskRewardRatio: number;    // 风险收益比
  
  // 心理与纪律
  emotion: TradingEmotion;    // 交易情绪
  informationSource: InformationSource; // 信息来源
  disciplineLocked: boolean;  // 是否开启纪律锁定
  
  // 质量评分
  planQualityScore: number;   // 计划质量分 (0-100)
  
  // 决策快照
  chartSnapshot?: string;     // K线图快照 (base64)
  
  // 关联剧本
  playbookId?: string;        // 应用的剧本ID
  
  // 状态
  status: TradeStatus;
}

// 交易记录 - 实际执行的记录
export interface TradeRecord {
  id: string;
  planId: string;             // 关联的计划ID
  createdAt: Date;
  updatedAt: Date;
  
  // 执行信息
  actualEntryPrice?: number;   // 实际买入价
  actualExitPrice?: number;    // 实际卖出价
  actualPositionSize?: number; // 实际仓位
  
  // 盈亏计算
  realizedPnL?: number;       // 实际盈亏
  realizedPnLPercent?: number; // 实际盈亏百分比
  
  // 执行时间
  entryTime?: Date;           // 买入时间
  exitTime?: Date;            // 卖出时间
  
  // 纪律评估
  disciplineRating: DisciplineRating; // 纪律执行评级
  disciplineNotes: string;    // 纪律执行说明
  
  // 复盘总结
  tradingSummary: string;     // 交易总结
  lessonsLearned: string;     // 经验教训
  
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
  playbooks: TradingPlaybook[];
  insights: InsightCard[];
  
  // UI状态
  currentView: 'dashboard' | 'planning' | 'tracking' | 'insights' | 'playbooks';
  
  // 设置
  settings: {
    disciplineLockCooldown: number; // 纪律锁定冷却时间(分钟)
    autoGenerateInsights: boolean;  // 自动生成洞察
    notificationsEnabled: boolean;  // 启用通知
  };
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
