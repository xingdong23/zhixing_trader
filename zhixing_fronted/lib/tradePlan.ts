// 交易计划系统 - 核心业务逻辑

export type TradeType = 'short_term' | 'swing' | 'value'; // 短期投机、波段交易、价值投资

export interface TradePlan {
  id?: string;
  symbol: string;
  name: string;
  tradeType: TradeType;
  
  // 买入计划
  buyReason: {
    technical: string;    // 技术面分析
    fundamental: string;  // 基本面分析
    catalyst: string;     // 消息面/催化剂
  };
  
  // 价格和仓位
  targetBuyPrice: number;
  maxBuyPrice: number;
  positionSize: number;  // 占总资金百分比
  shares?: number;       // 股数
  // 风险预算（新增，可选）
  accountBalance?: number;  // 账户规模（用于建议计算）
  riskBudgetPercent?: number; // 单笔风险占比（%）
  riskAmount?: number; // 该笔允许最大亏损金额
  
  // 止损止盈
  stopLoss: {
    price: number;
    percent: number;
  };
  stopProfit: {
    target1: { price: number; percent: number; sellPercent: 25 };
    target2: { price: number; percent: number; sellPercent: 50 };
    target3: { price: number; percent: number; sellPercent: 25 };
  };
  
  // 持有周期
  expectedHoldDays: number;
  
  // 风险评估
  riskRewardRatio: number;
  
  // 评分
  score?: number;
  // 信心与市场条件（新增）
  confidenceRating?: number; // 1-5
  marketCondition?: 'bull' | 'bear' | 'sideways';
  
  // 创建时间
  createdAt?: string;
  
  // 状态
  status: 'draft' | 'pending' | 'active' | 'closed';
}

// 交易类型配置
export const TRADE_TYPE_CONFIG: Record<TradeType, {
  label: string;
  description: string;
  stopLossMax: number;
  expectedDays: string;
  positionSizeMax: number;
}> = {
  short_term: {
    label: '短期投机',
    description: '1-7天，快速进出',
    stopLossMax: 3,
    expectedDays: '1-7天',
    positionSizeMax: 10,
  },
  swing: {
    label: '波段交易',
    description: '1-8周，捕捉中期趋势',
    stopLossMax: 10,
    expectedDays: '1-8周',
    positionSizeMax: 20,
  },
  value: {
    label: '价值投资',
    description: '3个月以上，长期持有',
    stopLossMax: 20,
    expectedDays: '3个月以上',
    positionSizeMax: 30,
  },
};

// 计划完整性评分系统
export interface PlanScore {
  total: number;
  breakdown: {
    buyReason: number;      // 买入理由（30分）
    stopLoss: number;       // 止损设置（25分）
    stopProfit: number;     // 止盈设置（20分）
    positionSize: number;   // 仓位管理（15分）
    timeFrame: number;      // 时间规划（10分）
  };
  suggestions: string[];
  canTrade: boolean;  // 是否可以交易（>=60分）
}

/**
 * 评估交易计划完整性
 */
export function evaluateTradePlan(plan: TradePlan): PlanScore {
  const breakdown = {
    buyReason: 0,
    stopLoss: 0,
    stopProfit: 0,
    positionSize: 0,
    timeFrame: 0,
  };
  
  const suggestions: string[] = [];
  
  // 1. 买入理由评分（30分）
  let buyReasonScore = 0;
  
  if (plan.buyReason.technical && plan.buyReason.technical.length >= 20) {
    buyReasonScore += 10;
  } else {
    suggestions.push('技术面分析不够详细（至少20字）');
  }
  
  if (plan.buyReason.fundamental && plan.buyReason.fundamental.length >= 20) {
    buyReasonScore += 10;
  } else {
    suggestions.push('基本面分析不够详细（至少20字）');
  }
  
  if (plan.buyReason.catalyst && plan.buyReason.catalyst.length >= 10) {
    buyReasonScore += 10;
  } else {
    suggestions.push('消息面/催化剂描述不够详细（至少10字）');
  }
  
  breakdown.buyReason = buyReasonScore;
  
  // 2. 止损设置评分（25分）
  let stopLossScore = 0;
  
  if (plan.stopLoss.price > 0) {
    stopLossScore += 10;
    
    // 检查止损是否合理
    const typeConfig = TRADE_TYPE_CONFIG[plan.tradeType];
    if (plan.stopLoss.percent <= typeConfig.stopLossMax) {
      stopLossScore += 15;
    } else {
      suggestions.push(`止损幅度过大（${plan.tradeType === 'short_term' ? '短期投机' : plan.tradeType === 'swing' ? '波段交易' : '价值投资'}建议≤${typeConfig.stopLossMax}%）`);
      stopLossScore += 5;
    }
  } else {
    suggestions.push('必须设置止损价格');
  }
  
  breakdown.stopLoss = stopLossScore;
  
  // 3. 止盈设置评分（20分）
  let stopProfitScore = 0;
  
  if (plan.stopProfit.target1.price > 0) {
    stopProfitScore += 7;
  } else {
    suggestions.push('必须设置第一目标价（保守目标）');
  }
  
  if (plan.stopProfit.target2.price > 0) {
    stopProfitScore += 7;
  } else {
    suggestions.push('必须设置第二目标价（正常目标）');
  }
  
  if (plan.stopProfit.target3.price > 0) {
    stopProfitScore += 6;
  } else {
    suggestions.push('必须设置第三目标价（乐观目标）');
  }
  
  breakdown.stopProfit = stopProfitScore;
  
  // 4. 仓位管理评分（15分）
  let positionSizeScore = 0;
  
  if (plan.positionSize > 0 && plan.positionSize <= 100) {
    positionSizeScore += 5;
    
    // 检查仓位是否合理
    const typeConfig = TRADE_TYPE_CONFIG[plan.tradeType];
    if (plan.positionSize <= typeConfig.positionSizeMax) {
      positionSizeScore += 10;
    } else {
      suggestions.push(`仓位过大（${typeConfig.label}建议≤${typeConfig.positionSizeMax}%）`);
      positionSizeScore += 5;
    }
  } else {
    suggestions.push('必须设置合理的仓位比例');
  }
  
  breakdown.positionSize = positionSizeScore;
  
  // 5. 时间规划评分（10分）
  let timeFrameScore = 0;
  
  if (plan.expectedHoldDays > 0) {
    timeFrameScore += 5;
    
    // 检查持有周期是否合理
    if (plan.tradeType === 'short_term' && plan.expectedHoldDays <= 7) {
      timeFrameScore += 5;
    } else if (plan.tradeType === 'swing' && plan.expectedHoldDays >= 7 && plan.expectedHoldDays <= 56) {
      timeFrameScore += 5;
    } else if (plan.tradeType === 'value' && plan.expectedHoldDays >= 90) {
      timeFrameScore += 5;
    } else {
      suggestions.push('持有周期与交易类型不匹配');
    }
  } else {
    suggestions.push('必须设置预期持有周期');
  }
  
  breakdown.timeFrame = timeFrameScore;
  
  // 计算总分
  const total = Object.values(breakdown).reduce((sum, score) => sum + score, 0);
  
  // 判断是否可以交易
  const canTrade = total >= 60;
  
  if (!canTrade) {
    suggestions.unshift(`⚠️ 计划评分${total}分，低于60分，无法执行交易`);
  } else if (total < 80) {
    suggestions.unshift(`⚠️ 计划评分${total}分，可以交易但建议完善`);
  } else {
    suggestions.unshift(`✅ 计划评分${total}分，可以正常交易`);
  }
  
  return {
    total,
    breakdown,
    suggestions,
    canTrade,
  };
}

/**
 * 计算风险收益比
 */
export function calculateRiskRewardRatio(
  entryPrice: number,
  stopLoss: number,
  target: number
): number {
  const risk = entryPrice - stopLoss;
  const reward = target - entryPrice;
  
  if (risk <= 0) return 0;
  
  return reward / risk;
}

/**
 * 检查是否偏离计划
 */
export function checkPlanDeviation(
  plan: TradePlan,
  currentPrice: number
): {
  hasDeviation: boolean;
  deviationType: 'none' | 'above_max_buy' | 'below_stop_loss' | 'above_target';
  deviationPercent: number;
  message: string;
} {
  // 超过最高买入价
  if (currentPrice > plan.maxBuyPrice) {
    const deviationPercent = ((currentPrice - plan.maxBuyPrice) / plan.maxBuyPrice) * 100;
    return {
      hasDeviation: true,
      deviationType: 'above_max_buy',
      deviationPercent,
      message: `当前价格 $${currentPrice.toFixed(2)} 超过最高买入价 $${plan.maxBuyPrice.toFixed(2)}（${deviationPercent.toFixed(2)}%），可能存在追高风险`,
    };
  }
  
  // 跌破止损价
  if (currentPrice < plan.stopLoss.price) {
    const deviationPercent = ((plan.stopLoss.price - currentPrice) / plan.stopLoss.price) * 100;
    return {
      hasDeviation: true,
      deviationType: 'below_stop_loss',
      deviationPercent,
      message: `当前价格 $${currentPrice.toFixed(2)} 低于止损价 $${plan.stopLoss.price.toFixed(2)}（${deviationPercent.toFixed(2)}%），应立即止损`,
    };
  }
  
  // 达到目标价
  if (currentPrice >= plan.stopProfit.target1.price) {
    const deviationPercent = ((currentPrice - plan.targetBuyPrice) / plan.targetBuyPrice) * 100;
    
    if (currentPrice >= plan.stopProfit.target3.price) {
      return {
        hasDeviation: true,
        deviationType: 'above_target',
        deviationPercent,
        message: `当前价格 $${currentPrice.toFixed(2)} 已达到第三目标价（${deviationPercent.toFixed(2)}%盈利），建议分批止盈`,
      };
    } else if (currentPrice >= plan.stopProfit.target2.price) {
      return {
        hasDeviation: true,
        deviationType: 'above_target',
        deviationPercent,
        message: `当前价格 $${currentPrice.toFixed(2)} 已达到第二目标价（${deviationPercent.toFixed(2)}%盈利），建议分批止盈`,
      };
    } else {
      return {
        hasDeviation: true,
        deviationType: 'above_target',
        deviationPercent,
        message: `当前价格 $${currentPrice.toFixed(2)} 已达到第一目标价（${deviationPercent.toFixed(2)}%盈利），建议分批止盈`,
      };
    }
  }
  
  return {
    hasDeviation: false,
    deviationType: 'none',
    deviationPercent: 0,
    message: '当前价格在计划范围内',
  };
}





