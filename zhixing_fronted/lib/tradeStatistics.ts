// 交易统计系统

import { TradePlan } from './tradePlan';
import { ExecutionRecord } from './stopLossMonitor';
import { EmotionScore } from './emotionDetection';

export interface TradeStatistics {
  // 计划制定
  planStats: {
    totalTrades: number;
    tradesWithPlan: number;
    planCreationRate: number;  // 计划制定率
    averagePlanScore: number;  // 平均计划评分
  };
  
  // 纪律执行
  disciplineStats: {
    stopLossExecutionRate: number;  // 止损执行率
    takeProfitExecutionRate: number;  // 止盈执行率
    planAdherenceRate: number;  // 计划遵守率
  };
  
  // 情绪控制
  emotionStats: {
    emotionalTradeRate: number;  // 情绪化交易识别率
    averageEmotionScore: number;  // 平均情绪评分
    coolingPeriodActivations: number;  // 冷静期触发次数
  };
  
  // 交易表现
  performanceStats: {
    totalProfit: number;  // 总盈亏
    winRate: number;  // 胜率
    averageProfit: number;  // 平均盈利
    averageLoss: number;  // 平均亏损
    profitLossRatio: number;  // 盈亏比
  };
  
  // 时间分布
  timeStats: {
    tradingDays: number;  // 交易天数
    averageTradesPerDay: number;  // 日均交易次数
    longestWinStreak: number;  // 最长连胜
    longestLossStreak: number;  // 最长连亏
  };
}

export interface Trade {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  price: number;
  quantity: number;
  date: Date;
  hasPlan: boolean;
  plan?: TradePlan;
  emotionScore?: EmotionScore;
  executionRecords?: ExecutionRecord[];
  profit?: number;
  profitPercent?: number;
}

/**
 * 计算交易统计
 */
export function calculateStatistics(trades: Trade[]): TradeStatistics {
  // 计划制定统计
  const tradesWithPlan = trades.filter(t => t.hasPlan).length;
  const planCreationRate = trades.length > 0 ? (tradesWithPlan / trades.length) * 100 : 0;
  const averagePlanScore = trades
    .filter(t => t.plan?.score)
    .reduce((sum, t) => sum + (t.plan?.score || 0), 0) / (tradesWithPlan || 1);
  
  // 纪律执行统计
  const allExecutionRecords = trades
    .filter(t => t.executionRecords)
    .flatMap(t => t.executionRecords || []);
  
  const stopLossRecords = allExecutionRecords.filter(r => r.type === 'stop_loss');
  const takeProfitRecords = allExecutionRecords.filter(r => r.type === 'take_profit');
  
  const stopLossExecutionRate = stopLossRecords.length > 0
    ? (stopLossRecords.filter(r => r.executed).length / stopLossRecords.length) * 100
    : 100;
  
  const takeProfitExecutionRate = takeProfitRecords.length > 0
    ? (takeProfitRecords.filter(r => r.executed).length / takeProfitRecords.length) * 100
    : 100;
  
  const planAdherenceRate = calculatePlanAdherence(trades);
  
  // 情绪控制统计
  const emotionalTrades = trades.filter(t => 
    t.emotionScore && t.emotionScore.total >= 40
  ).length;
  const emotionalTradeRate = trades.length > 0 ? (emotionalTrades / trades.length) * 100 : 0;
  
  const averageEmotionScore = trades
    .filter(t => t.emotionScore)
    .reduce((sum, t) => sum + (t.emotionScore?.total || 0), 0) / (trades.length || 1);
  
  const coolingPeriodActivations = trades.filter(t => 
    t.emotionScore && t.emotionScore.shouldBlock
  ).length;
  
  // 交易表现统计
  const closedTrades = trades.filter(t => t.profit !== undefined);
  const profitTrades = closedTrades.filter(t => (t.profit || 0) > 0);
  const lossTrades = closedTrades.filter(t => (t.profit || 0) < 0);
  
  const totalProfit = closedTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
  const winRate = closedTrades.length > 0 ? (profitTrades.length / closedTrades.length) * 100 : 0;
  
  const averageProfit = profitTrades.length > 0
    ? profitTrades.reduce((sum, t) => sum + (t.profit || 0), 0) / profitTrades.length
    : 0;
  
  const averageLoss = lossTrades.length > 0
    ? Math.abs(lossTrades.reduce((sum, t) => sum + (t.profit || 0), 0) / lossTrades.length)
    : 0;
  
  const profitLossRatio = averageLoss > 0 ? averageProfit / averageLoss : 0;
  
  // 时间分布统计
  const tradingDays = calculateTradingDays(trades);
  const averageTradesPerDay = tradingDays > 0 ? trades.length / tradingDays : 0;
  const { longestWinStreak, longestLossStreak } = calculateStreaks(trades);
  
  return {
    planStats: {
      totalTrades: trades.length,
      tradesWithPlan,
      planCreationRate,
      averagePlanScore,
    },
    disciplineStats: {
      stopLossExecutionRate,
      takeProfitExecutionRate,
      planAdherenceRate,
    },
    emotionStats: {
      emotionalTradeRate,
      averageEmotionScore,
      coolingPeriodActivations,
    },
    performanceStats: {
      totalProfit,
      winRate,
      averageProfit,
      averageLoss,
      profitLossRatio,
    },
    timeStats: {
      tradingDays,
      averageTradesPerDay,
      longestWinStreak,
      longestLossStreak,
    },
  };
}

/**
 * 计算计划遵守率
 */
function calculatePlanAdherence(trades: Trade[]): number {
  const tradesWithPlan = trades.filter(t => t.hasPlan && t.plan);
  if (tradesWithPlan.length === 0) return 100;
  
  let adherentTrades = 0;
  
  for (const trade of tradesWithPlan) {
    if (!trade.plan) continue;
    
    // 检查是否按计划价格买入
    const priceDeviation = Math.abs(
      (trade.price - trade.plan.targetBuyPrice) / trade.plan.targetBuyPrice
    ) * 100;
    
    // 价格偏离不超过5%视为遵守计划
    if (priceDeviation <= 5) {
      adherentTrades++;
    }
  }
  
  return (adherentTrades / tradesWithPlan.length) * 100;
}

/**
 * 计算交易天数
 */
function calculateTradingDays(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  
  const uniqueDays = new Set(
    trades.map(t => t.date.toISOString().split('T')[0])
  );
  
  return uniqueDays.size;
}

/**
 * 计算连胜/连亏
 */
function calculateStreaks(trades: Trade[]): {
  longestWinStreak: number;
  longestLossStreak: number;
} {
  const closedTrades = trades
    .filter(t => t.profit !== undefined)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  
  for (const trade of closedTrades) {
    if ((trade.profit || 0) > 0) {
      currentWinStreak++;
      currentLossStreak = 0;
      longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
    } else {
      currentLossStreak++;
      currentWinStreak = 0;
      longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
    }
  }
  
  return { longestWinStreak, longestLossStreak };
}

/**
 * 生成统计报告
 */
export function generateStatisticsReport(stats: TradeStatistics): string {
  const lines = [
    '=== 交易纪律统计报告 ===\n',
    '【计划制定】',
    `总交易次数：${stats.planStats.totalTrades}`,
    `有计划交易：${stats.planStats.tradesWithPlan}`,
    `计划制定率：${stats.planStats.planCreationRate.toFixed(1)}% ${getScoreEmoji(stats.planStats.planCreationRate)}`,
    `平均计划评分：${stats.planStats.averagePlanScore.toFixed(1)}/100`,
    '',
    '【纪律执行】',
    `止损执行率：${stats.disciplineStats.stopLossExecutionRate.toFixed(1)}% ${getScoreEmoji(stats.disciplineStats.stopLossExecutionRate)}`,
    `止盈执行率：${stats.disciplineStats.takeProfitExecutionRate.toFixed(1)}% ${getScoreEmoji(stats.disciplineStats.takeProfitExecutionRate)}`,
    `计划遵守率：${stats.disciplineStats.planAdherenceRate.toFixed(1)}% ${getScoreEmoji(stats.disciplineStats.planAdherenceRate)}`,
    '',
    '【情绪控制】',
    `情绪化交易率：${stats.emotionStats.emotionalTradeRate.toFixed(1)}% ${getReverseScoreEmoji(stats.emotionStats.emotionalTradeRate)}`,
    `平均情绪评分：${stats.emotionStats.averageEmotionScore.toFixed(1)}/100`,
    `冷静期触发：${stats.emotionStats.coolingPeriodActivations}次`,
    '',
    '【交易表现】',
    `总盈亏：$${stats.performanceStats.totalProfit.toFixed(2)}`,
    `胜率：${stats.performanceStats.winRate.toFixed(1)}%`,
    `平均盈利：$${stats.performanceStats.averageProfit.toFixed(2)}`,
    `平均亏损：$${stats.performanceStats.averageLoss.toFixed(2)}`,
    `盈亏比：1:${stats.performanceStats.profitLossRatio.toFixed(2)}`,
    '',
    '【时间分布】',
    `交易天数：${stats.timeStats.tradingDays}天`,
    `日均交易：${stats.timeStats.averageTradesPerDay.toFixed(1)}次`,
    `最长连胜：${stats.timeStats.longestWinStreak}次`,
    `最长连亏：${stats.timeStats.longestLossStreak}次`,
  ];
  
  return lines.join('\n');
}

/**
 * 获取评分表情（值越高越好）
 */
function getScoreEmoji(score: number): string {
  if (score >= 80) return '✅ 优秀';
  if (score >= 60) return '⚠️ 良好';
  if (score >= 40) return '⚠️ 需改进';
  return '❌ 较差';
}

/**
 * 获取反向评分表情（值越低越好）
 */
function getReverseScoreEmoji(score: number): string {
  if (score <= 20) return '✅ 优秀';
  if (score <= 40) return '⚠️ 良好';
  if (score <= 60) return '⚠️ 需改进';
  return '❌ 较差';
}

/**
 * 获取改进建议
 */
export function getImprovementSuggestions(stats: TradeStatistics): string[] {
  const suggestions: string[] = [];
  
  // 计划制定建议
  if (stats.planStats.planCreationRate < 80) {
    suggestions.push('📋 提高计划制定率：每次交易前都要制定完整计划');
  }
  if (stats.planStats.averagePlanScore < 70) {
    suggestions.push('📊 提升计划质量：详细分析技术面和基本面');
  }
  
  // 纪律执行建议
  if (stats.disciplineStats.stopLossExecutionRate < 90) {
    suggestions.push('🛡️ 严格执行止损：止损是保护本金的最后防线');
  }
  if (stats.disciplineStats.takeProfitExecutionRate < 70) {
    suggestions.push('🎯 及时止盈：达到目标价要果断止盈');
  }
  if (stats.disciplineStats.planAdherenceRate < 70) {
    suggestions.push('📌 遵守计划：不要随意偏离制定好的计划');
  }
  
  // 情绪控制建议
  if (stats.emotionStats.emotionalTradeRate > 30) {
    suggestions.push('🧠 控制情绪：减少情绪化交易，理性决策');
  }
  if (stats.emotionStats.coolingPeriodActivations > 5) {
    suggestions.push('⏰ 放慢节奏：频繁触发冷静期说明交易过于冲动');
  }
  
  // 交易表现建议
  if (stats.performanceStats.winRate < 40) {
    suggestions.push('📈 提高胜率：重新审视选股策略和入场时机');
  }
  if (stats.performanceStats.profitLossRatio < 1.5) {
    suggestions.push('💰 优化盈亏比：让盈利奔跑，及时止损');
  }
  
  // 频率建议
  if (stats.timeStats.averageTradesPerDay > 10) {
    suggestions.push('🔄 降低频率：过度交易会增加亏损风险');
  }
  
  if (suggestions.length === 0) {
    suggestions.push('🎉 太棒了！你的交易纪律非常好，继续保持！');
  }
  
  return suggestions;
}




