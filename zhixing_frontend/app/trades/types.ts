// 我的交易模块类型定义

export type TradeStatus = "planned" | "pending" | "active" | "closed" | "cancelled";
export type TradeType = "long" | "short";
export type TradeStage = "plan" | "entry" | "holding" | "exit" | "review";
export type ScreenshotType = "kline" | "entry" | "exit" | "other";
export type AlertType = "price" | "time" | "pnl" | "custom";
export type AdjustmentType = "add_position" | "reduce_position" | "stop_loss" | "take_profit" | "other";

// 交易记录
export interface Trade {
  id: number;
  
  // 基本信息
  symbol: string;
  stockName: string;
  status: TradeStatus;
  
  // 计划阶段
  planType: TradeType;
  planEntryPrice?: number;
  planEntryPriceRangeLow?: number;
  planEntryPriceRangeHigh?: number;
  planQuantity?: number;
  planStopLoss?: number;
  planTakeProfit?: number;
  planNotes?: string;
  planStrategy?: string;
  strategyTags?: string[];
  planCreatedAt?: string;
  
  // 执行阶段
  entryPrice?: number;
  entryTime?: string;
  entryQuantity?: number;
  entryNotes?: string;
  
  // 持仓阶段
  currentPrice?: number;
  currentQuantity?: number;
  unrealizedPnl?: number;
  unrealizedPnlPct?: number;
  
  // 平仓阶段
  exitPrice?: number;
  exitTime?: string;
  exitQuantity?: number;
  exitNotes?: string;
  
  // 交易结果
  realizedPnl?: number;
  realizedPnlPct?: number;
  commission?: number;
  netPnl?: number;
  
  // 止损止盈
  stopLossPrice?: number;
  takeProfitPrice?: number;
  stopLossUpdatedAt?: string;
  
  // 复盘
  reviewRating?: number; // 1-5
  reviewNotes?: string;
  reviewLessons?: string;
  reviewTags?: string[];

  // 心理与策略（新增）
  mood?: 'FOMO' | 'Confident' | 'Revenge' | 'Bored' | 'Disciplined';
  mistakes?: string[];
  strategy?: string;
  
  // 关联
  strategyId?: number;
  categoryId?: number;
  
  // 元数据
  createdAt: string;
  updatedAt: string;
  
  // 扩展信息（前端计算）
  holdingDays?: number;
  noteCount?: number;
  screenshotCount?: number;
  alertCount?: number;
  
  // 违规信息
  violations?: TradeViolation[];
  violationCost?: number; // 违规导致的额外损失
}

// 违规类型
export interface TradeViolation {
  type: "entry_price" | "stop_loss" | "take_profit" | "position_size" | "holding_time" | "add_position";
  severity: "low" | "medium" | "high"; // 低/中/高
  description: string;
  plannedValue?: number | string;
  actualValue?: number | string;
  costImpact?: number; // 该违规导致的损失
  detectedAt: string;
}

// 交易笔记关联
export interface TradeNote {
  id: number;
  tradeId: number;
  noteId: number;
  noteStage: TradeStage;
  createdAt: string;
}

// 交易截图
export interface TradeScreenshot {
  id: number;
  tradeId: number;
  screenshotType: ScreenshotType;
  screenshotStage: TradeStage;
  filePath: string;
  fileUrl?: string;
  description?: string;
  createdAt: string;
}

// 交易提醒
export interface TradeAlert {
  id: number;
  tradeId: number;
  alertType: AlertType;
  
  // 价格提醒
  triggerPrice?: number;
  priceDirection?: "above" | "below";
  
  // 时间提醒
  triggerTime?: string;
  
  // 盈亏提醒
  triggerPnlPct?: number;
  pnlDirection?: "profit" | "loss";
  
  // 提醒设置
  alertTitle: string;
  alertMessage?: string;
  isRepeating: boolean;
  repeatInterval?: number;
  
  // 状态
  status: "active" | "triggered" | "cancelled";
  triggeredAt?: string;
  
  // 通知方式
  notifyBrowser: boolean;
  notifyEmail: boolean;
  notifySms: boolean;
  
  createdAt: string;
  updatedAt: string;
}

// 交易调整记录
export interface TradeAdjustment {
  id: number;
  tradeId: number;
  adjustmentType: AdjustmentType;
  
  // 调整内容
  price?: number;
  quantity?: number;
  newStopLoss?: number;
  newTakeProfit?: number;
  
  // 说明
  reason?: string;
  notes?: string;
  
  createdAt: string;
}

// 交易统计
export interface TradeStatistics {
  totalTrades: number;
  activeTrades: number;
  pendingTrades: number;
  closedTrades: number;
  
  winCount: number;
  lossCount: number;
  winRate: number;
  
  totalPnl: number;
  avgPnl: number;
  maxProfit: number;
  maxLoss: number;
  
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
}

// 筛选条件
export interface TradeFilters {
  status?: TradeStatus[];
  symbol?: string;
  startDate?: string;
  endDate?: string;
  minPnl?: number;
  maxPnl?: number;
  strategyId?: number;
  tradeType?: TradeType;
}

