// 【知行交易】核心计算逻辑
// 这些函数实现了交易系统的核心算法，包括质量评分、纪律评分等

import { 
  TradingPlan, 
  TradeRecord, 
  TradingStats, 
  DisciplineRating, 
  TradingEmotion,
  InformationSource,
  PlanQualityResponse 
} from '@/types';

// ==================== 计划质量评分算法 ====================

/**
 * 计算交易计划质量分
 * 这是系统的核心功能之一，通过多维度评估确保计划的完整性和可执行性
 */
export function calculatePlanQualityScore(plan: Partial<TradingPlan>): PlanQualityResponse {
  const breakdown = {
    basicInfo: 0,
    riskManagement: 0,
    logicClarity: 0,
    chartEvidence: 0,
    emotionalState: 0
  };
  
  const suggestions: string[] = [];

  // 1. 基础信息完整性 (25分)
  let basicInfoScore = 0;
  if (plan.symbol && plan.symbolName) basicInfoScore += 8;
  if (plan.plannedEntryPrice && plan.plannedEntryPrice > 0) basicInfoScore += 8;
  if (plan.positionSize && plan.positionSize > 0) basicInfoScore += 9;
  
  if (basicInfoScore < 25) {
    suggestions.push('请完善基础信息：股票代码、计划价格、仓位大小');
  }
  breakdown.basicInfo = basicInfoScore;

  // 2. 风险管理 (25分)
  let riskScore = 0;
  if (plan.stopLoss && plan.stopLoss > 0) {
    riskScore += 12;
    // 检查止损合理性（不超过20%）
    if (plan.plannedEntryPrice) {
      const stopLossPercent = Math.abs(plan.plannedEntryPrice - plan.stopLoss) / plan.plannedEntryPrice;
      if (stopLossPercent > 0.20) {
        suggestions.push('止损幅度过大，建议控制在20%以内');
        riskScore -= 3;
      }
    }
  } else {
    suggestions.push('必须设置止损价格');
  }
  
  if (plan.takeProfit && plan.takeProfit > 0) {
    riskScore += 8;
  } else {
    suggestions.push('建议设置止盈目标');
  }
  
  // 风险收益比评估
  if (plan.riskRewardRatio && plan.riskRewardRatio >= 1) {
    riskScore += 5;
    if (plan.riskRewardRatio < 1.5) {
      suggestions.push('风险收益比偏低，建议至少1.5:1');
    }
  } else {
    suggestions.push('风险收益比不足，建议至少1:1');
  }
  
  breakdown.riskManagement = Math.min(riskScore, 25);

  // 3. 逻辑清晰度 (20分)
  let logicScore = 0;
  if (plan.buyingLogic?.technical && plan.buyingLogic.technical.length > 20) {
    logicScore += 8;
  } else {
    suggestions.push('请详细描述技术面分析逻辑');
  }
  
  if (plan.buyingLogic?.fundamental && plan.buyingLogic.fundamental.length > 10) {
    logicScore += 6;
  } else {
    suggestions.push('请补充基本面分析');
  }
  
  if (plan.buyingLogic?.news && plan.buyingLogic.news.length > 10) {
    logicScore += 6;
  } else {
    suggestions.push('请说明消息面情况');
  }
  
  breakdown.logicClarity = logicScore;

  // 4. 图表证据 (15分)
  let chartScore = 0;
  if (plan.chartSnapshot && plan.chartSnapshot.length > 0) {
    chartScore = 15;
  } else {
    suggestions.push('请上传K线图作为决策依据');
  }
  breakdown.chartEvidence = chartScore;

  // 5. 情绪状态 (15分)
  let emotionScore = 0;
  if (plan.emotion) {
    emotionScore += 8;
    // 情绪合理性检查
    if (plan.emotion === TradingEmotion.FOMO || plan.emotion === TradingEmotion.GREED) {
      emotionScore -= 3;
      suggestions.push('当前情绪状态可能影响决策质量，建议冷静后再操作');
    }
    if (plan.emotion === TradingEmotion.FEAR || plan.emotion === TradingEmotion.REVENGE) {
      emotionScore -= 5;
      suggestions.push('当前情绪状态不适合交易，建议暂停操作');
    }
  } else {
    suggestions.push('请选择当前交易情绪');
  }
  
  if (plan.informationSource) {
    emotionScore += 7;
    // 信息源质量检查
    if (plan.informationSource === InformationSource.SOCIAL_MEDIA) {
      emotionScore -= 2;
      suggestions.push('社交媒体信息可靠性较低，建议谨慎');
    }
    if (plan.informationSource === InformationSource.FRIEND_RECOMMEND) {
      emotionScore -= 1;
      suggestions.push('朋友推荐需要独立验证');
    }
  } else {
    suggestions.push('请选择信息来源');
  }
  
  breakdown.emotionalState = Math.max(emotionScore, 0);

  // 计算总分
  const totalScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0);
  
  // 额外的综合性建议
  if (totalScore < 60) {
    suggestions.unshift('计划质量偏低，建议完善后再执行');
  } else if (totalScore < 80) {
    suggestions.unshift('计划基本可行，建议优化后执行');
  } else {
    suggestions.unshift('计划质量良好，可以执行');
  }

  return {
    score: totalScore,
    breakdown,
    suggestions
  };
}

// ==================== 纪律评分算法 ====================

/**
 * 计算个人纪律分
 * 这是衡量交易者成长的核心指标
 */
export function calculateDisciplineScore(records: TradeRecord[]): number {
  if (records.length === 0) return 50; // 初始分数

  let totalScore = 0;
  let weightedCount = 0;

  records.forEach((record, index) => {
    // 时间权重：越近期的交易权重越高
    const timeWeight = Math.exp(-index * 0.1) + 0.1;
    
    let tradeScore = 50; // 基础分
    
    switch (record.disciplineRating) {
      case DisciplineRating.PERFECT:
        tradeScore = 100;
        break;
      case DisciplineRating.GOOD:
        tradeScore = 80;
        break;
      case DisciplineRating.PARTIAL:
        tradeScore = 60;
        break;
      case DisciplineRating.POOR:
        tradeScore = 20;
        break;
    }
    
    totalScore += tradeScore * timeWeight;
    weightedCount += timeWeight;
  });

  return Math.round(totalScore / weightedCount);
}

// ==================== 统计计算 ====================

/**
 * 计算交易统计数据
 */
export function calculateTradingStats(records: TradeRecord[]): TradingStats {
  const closedRecords = records.filter(r => r.status === 'closed' && r.realizedPnL !== undefined);
  
  if (closedRecords.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnL: 0,
      totalPnLPercent: 0,
      avgWinPercent: 0,
      avgLossPercent: 0,
      avgRiskRewardRatio: 0,
      disciplineScore: 50,
      perfectExecutions: 0,
      poorExecutions: 0,
      emotionBreakdown: {} as Record<TradingEmotion, number>,
      sourceBreakdown: {} as Record<InformationSource, number>,
      avgHoldingDays: 0,
      lastUpdated: new Date()
    };
  }

  const winningTrades = closedRecords.filter(r => (r.realizedPnL || 0) > 0);
  const losingTrades = closedRecords.filter(r => (r.realizedPnL || 0) < 0);
  
  const totalPnL = closedRecords.reduce((sum, r) => sum + (r.realizedPnL || 0), 0);
  const totalPnLPercent = closedRecords.reduce((sum, r) => sum + (r.realizedPnLPercent || 0), 0);
  
  const avgWinPercent = winningTrades.length > 0 
    ? winningTrades.reduce((sum, r) => sum + (r.realizedPnLPercent || 0), 0) / winningTrades.length
    : 0;
    
  const avgLossPercent = losingTrades.length > 0
    ? Math.abs(losingTrades.reduce((sum, r) => sum + (r.realizedPnLPercent || 0), 0) / losingTrades.length)
    : 0;

  const avgRiskRewardRatio = avgLossPercent > 0 ? avgWinPercent / avgLossPercent : 0;

  // 纪律统计
  const perfectExecutions = closedRecords.filter(r => r.disciplineRating === DisciplineRating.PERFECT).length;
  const poorExecutions = closedRecords.filter(r => r.disciplineRating === DisciplineRating.POOR).length;

  // 情绪和来源统计
  const emotionBreakdown: Record<TradingEmotion, number> = {} as Record<TradingEmotion, number>;
  const sourceBreakdown: Record<InformationSource, number> = {} as Record<InformationSource, number>;

  // 持仓天数计算
  const holdingDays = closedRecords
    .filter(r => r.entryTime && r.exitTime)
    .map(r => {
      const entry = new Date(r.entryTime!);
      const exit = new Date(r.exitTime!);
      return (exit.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24);
    });
  
  const avgHoldingDays = holdingDays.length > 0 
    ? holdingDays.reduce((sum, days) => sum + days, 0) / holdingDays.length
    : 0;

  return {
    totalTrades: closedRecords.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: closedRecords.length > 0 ? winningTrades.length / closedRecords.length : 0,
    totalPnL,
    totalPnLPercent,
    avgWinPercent,
    avgLossPercent,
    avgRiskRewardRatio,
    disciplineScore: calculateDisciplineScore(closedRecords),
    perfectExecutions,
    poorExecutions,
    emotionBreakdown,
    sourceBreakdown,
    avgHoldingDays,
    lastUpdated: new Date()
  };
}

// ==================== 风险收益比计算 ====================

/**
 * 计算风险收益比
 */
export function calculateRiskRewardRatio(
  entryPrice: number, 
  stopLoss: number, 
  takeProfit: number
): number {
  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(takeProfit - entryPrice);
  
  return risk > 0 ? reward / risk : 0;
}

// ==================== 价格变化计算 ====================

/**
 * 计算价格变化百分比
 */
export function calculatePriceChangePercent(oldPrice: number, newPrice: number): number {
  return oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0;
}

/**
 * 计算当前价格在止损-止盈区间的位置 (0-100)
 */
export function calculateLifecyclePosition(
  currentPrice: number,
  entryPrice: number,
  stopLoss: number,
  takeProfit: number
): number {
  // 确定价格区间
  const minPrice = Math.min(stopLoss, takeProfit);
  const maxPrice = Math.max(stopLoss, takeProfit);
  
  // 计算位置百分比
  if (currentPrice <= minPrice) return 0;
  if (currentPrice >= maxPrice) return 100;
  
  return ((currentPrice - minPrice) / (maxPrice - minPrice)) * 100;
}
