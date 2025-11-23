// 情绪化交易检测系统

export interface EmotionScore {
  total: number;
  level: 'calm' | 'caution' | 'danger';
  factors: {
    chasingRally: number;      // 追涨得分（0-30分）
    panicSelling: number;      // 杀跌得分（0-30分）
    highFrequency: number;     // 高频交易得分（0-20分）
    fomo: number;              // FOMO心理得分（0-20分）
  };
  warnings: string[];
  shouldBlock: boolean;  // 是否应该阻止交易
}

export interface TradeAction {
  type: 'buy' | 'sell';
  price: number;
  timestamp: Date;
  quantity?: number;
}

export interface StockPriceHistory {
  symbol: string;
  currentPrice: number;
  dayHigh: number;
  dayLow: number;
  priceChange1d: number;
  priceChange5d: number;
  priceChange30d: number;
  volume: number;
  avgVolume: number;
}

/**
 * 检测情绪化交易倾向
 */
export function detectEmotionalTrading(
  action: TradeAction,
  stockHistory: StockPriceHistory,
  recentActions: TradeAction[]
): EmotionScore {
  const factors = {
    chasingRally: 0,
    panicSelling: 0,
    highFrequency: 0,
    fomo: 0,
  };
  
  const warnings: string[] = [];
  
  // 1. 追涨检测（30分）
  if (action.type === 'buy') {
    const chasingScore = detectChasingRally(action, stockHistory);
    factors.chasingRally = chasingScore.score;
    warnings.push(...chasingScore.warnings);
  }
  
  // 2. 杀跌检测（30分）
  if (action.type === 'sell') {
    const panicScore = detectPanicSelling(action, stockHistory);
    factors.panicSelling = panicScore.score;
    warnings.push(...panicScore.warnings);
  }
  
  // 3. 高频交易检测（20分）
  const frequencyScore = detectHighFrequency(action, recentActions);
  factors.highFrequency = frequencyScore.score;
  warnings.push(...frequencyScore.warnings);
  
  // 4. FOMO心理检测（20分）
  const fomoScore = detectFOMO(action, stockHistory, recentActions);
  factors.fomo = fomoScore.score;
  warnings.push(...fomoScore.warnings);
  
  // 计算总分
  const total = Object.values(factors).reduce((sum, score) => sum + score, 0);
  
  // 判断风险等级
  let level: 'calm' | 'caution' | 'danger' = 'calm';
  let shouldBlock = false;
  
  if (total >= 60) {
    level = 'danger';
    shouldBlock = true;
    warnings.unshift('🚨 情绪化交易风险极高！建议停止交易，冷静思考！');
  } else if (total >= 40) {
    level = 'caution';
    warnings.unshift('⚠️ 检测到情绪化交易倾向，请谨慎决策！');
  } else {
    warnings.unshift('✅ 交易决策较为理性');
  }
  
  return {
    total,
    level,
    factors,
    warnings,
    shouldBlock,
  };
}

/**
 * 检测追涨行为
 */
function detectChasingRally(
  action: TradeAction,
  stockHistory: StockPriceHistory
): { score: number; warnings: string[] } {
  let score = 0;
  const warnings: string[] = [];
  
  // 检查1：价格接近当日最高点（10分）
  const distanceFromHigh = ((stockHistory.dayHigh - action.price) / stockHistory.dayHigh) * 100;
  if (distanceFromHigh < 1) {
    score += 10;
    warnings.push('价格接近当日最高点，存在追高风险');
  } else if (distanceFromHigh < 3) {
    score += 5;
    warnings.push('价格较高，建议等待回调');
  }
  
  // 检查2：短期涨幅过大（10分）
  if (stockHistory.priceChange1d > 5) {
    score += 10;
    warnings.push(`今日涨幅${stockHistory.priceChange1d.toFixed(2)}%，追涨风险高`);
  } else if (stockHistory.priceChange1d > 3) {
    score += 5;
    warnings.push(`今日涨幅${stockHistory.priceChange1d.toFixed(2)}%，注意追高风险`);
  }
  
  // 检查3：连续上涨（10分）
  if (stockHistory.priceChange5d > 15) {
    score += 10;
    warnings.push(`5日涨幅${stockHistory.priceChange5d.toFixed(2)}%，可能处于阶段性高点`);
  } else if (stockHistory.priceChange5d > 10) {
    score += 5;
    warnings.push(`5日涨幅${stockHistory.priceChange5d.toFixed(2)}%，建议谨慎追高`);
  }
  
  return { score, warnings };
}

/**
 * 检测杀跌行为
 */
function detectPanicSelling(
  action: TradeAction,
  stockHistory: StockPriceHistory
): { score: number; warnings: string[] } {
  let score = 0;
  const warnings: string[] = [];
  
  // 检查1：价格接近当日最低点（10分）
  const distanceFromLow = ((action.price - stockHistory.dayLow) / stockHistory.dayLow) * 100;
  if (distanceFromLow < 1) {
    score += 10;
    warnings.push('价格接近当日最低点，可能是恐慌性卖出');
  } else if (distanceFromLow < 3) {
    score += 5;
    warnings.push('价格较低，建议冷静分析后再决定');
  }
  
  // 检查2：短期跌幅过大（10分）
  if (stockHistory.priceChange1d < -5) {
    score += 10;
    warnings.push(`今日跌幅${Math.abs(stockHistory.priceChange1d).toFixed(2)}%，避免恐慌性卖出`);
  } else if (stockHistory.priceChange1d < -3) {
    score += 5;
    warnings.push(`今日跌幅${Math.abs(stockHistory.priceChange1d).toFixed(2)}%，保持冷静`);
  }
  
  // 检查3：连续下跌（10分）
  if (stockHistory.priceChange5d < -15) {
    score += 10;
    warnings.push(`5日跌幅${Math.abs(stockHistory.priceChange5d).toFixed(2)}%，可能已接近底部`);
  } else if (stockHistory.priceChange5d < -10) {
    score += 5;
    warnings.push(`5日跌幅${Math.abs(stockHistory.priceChange5d).toFixed(2)}%，避免盲目杀跌`);
  }
  
  return { score, warnings };
}

/**
 * 检测高频交易
 */
function detectHighFrequency(
  action: TradeAction,
  recentActions: TradeAction[]
): { score: number; warnings: string[] } {
  let score = 0;
  const warnings: string[] = [];
  
  const now = action.timestamp.getTime();
  
  // 统计不同时间窗口的交易次数
  const last1Hour = recentActions.filter(a => 
    now - a.timestamp.getTime() < 60 * 60 * 1000
  ).length;
  
  const last1Day = recentActions.filter(a => 
    now - a.timestamp.getTime() < 24 * 60 * 60 * 1000
  ).length;
  
  const last7Days = recentActions.filter(a => 
    now - a.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000
  ).length;
  
  // 检查1：1小时内交易过于频繁（8分）
  if (last1Hour >= 5) {
    score += 8;
    warnings.push(`1小时内已交易${last1Hour}次，交易过于频繁`);
  } else if (last1Hour >= 3) {
    score += 4;
    warnings.push(`1小时内已交易${last1Hour}次，建议放慢节奏`);
  }
  
  // 检查2：当日交易过于频繁（7分）
  if (last1Day >= 15) {
    score += 7;
    warnings.push(`今日已交易${last1Day}次，可能过度交易`);
  } else if (last1Day >= 10) {
    score += 3;
    warnings.push(`今日已交易${last1Day}次，注意交易频率`);
  }
  
  // 检查3：7日交易过于频繁（5分）
  if (last7Days >= 50) {
    score += 5;
    warnings.push(`本周已交易${last7Days}次，建议减少交易`);
  } else if (last7Days >= 30) {
    score += 2;
    warnings.push(`本周已交易${last7Days}次，保持理性`);
  }
  
  return { score, warnings };
}

/**
 * 检测FOMO心理（Fear of Missing Out）
 */
function detectFOMO(
  action: TradeAction,
  stockHistory: StockPriceHistory,
  recentActions: TradeAction[]
): { score: number; warnings: string[] } {
  let score = 0;
  const warnings: string[] = [];
  
  if (action.type !== 'buy') {
    return { score, warnings };
  }
  
  // 检查1：成交量异常放大（10分）
  const volumeRatio = stockHistory.volume / stockHistory.avgVolume;
  if (volumeRatio > 3) {
    score += 10;
    warnings.push(`成交量是平均的${volumeRatio.toFixed(1)}倍，市场情绪过热`);
  } else if (volumeRatio > 2) {
    score += 5;
    warnings.push(`成交量明显放大，注意市场情绪`);
  }
  
  // 检查2：短期大幅上涨（5分）
  if (stockHistory.priceChange5d > 20) {
    score += 5;
    warnings.push('短期涨幅过大，可能是FOMO心理驱使');
  }
  
  // 检查3：最近没有该股票的交易记录，突然买入（5分）
  const hasRecentTrade = recentActions.some(a => 
    action.timestamp.getTime() - a.timestamp.getTime() < 30 * 24 * 60 * 60 * 1000
  );
  
  if (!hasRecentTrade && stockHistory.priceChange1d > 5) {
    score += 5;
    warnings.push('该股票大涨后突然想买入，可能受FOMO心理影响');
  }
  
  return { score, warnings };
}

/**
 * 生成情绪化交易报告
 */
export function generateEmotionReport(emotionScore: EmotionScore): string {
  const lines = [
    '=== 情绪化交易检测报告 ===\n',
    `总分：${emotionScore.total}/100`,
    `风险等级：${emotionScore.level === 'danger' ? '🔴 危险' : emotionScore.level === 'caution' ? '🟡 警告' : '🟢 正常'}\n`,
    '各项得分：',
    `- 追涨倾向：${emotionScore.factors.chasingRally}/30`,
    `- 杀跌倾向：${emotionScore.factors.panicSelling}/30`,
    `- 高频交易：${emotionScore.factors.highFrequency}/20`,
    `- FOMO心理：${emotionScore.factors.fomo}/20\n`,
    '警告信息：',
    ...emotionScore.warnings.map(w => `- ${w}`),
  ];
  
  if (emotionScore.shouldBlock) {
    lines.push('\n❌ 建议：暂停交易，进入冷静期！');
  }
  
  return lines.join('\n');
}




