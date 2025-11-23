// 止损止盈执行监督系统

export interface StopLossAlert {
  type: 'stop_loss' | 'take_profit';
  level?: 1 | 2 | 3;  // 止盈目标级别
  triggerPrice: number;
  currentPrice: number;
  suggestedAction: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  delayWarning?: string;
}

export interface ExecutionRecord {
  id: string;
  planId: string;
  type: 'stop_loss' | 'take_profit';
  triggerTime: Date;
  executionTime?: Date;
  triggerPrice: number;
  executionPrice?: number;
  delay?: number;  // 延迟时间（秒）
  executed: boolean;
  reason?: string;  // 未执行原因
}

/**
 * 检查是否触发止损
 */
export function checkStopLoss(
  currentPrice: number,
  stopLossPrice: number,
  lastCheckPrice?: number
): StopLossAlert | null {
  // 首次触发止损
  if (currentPrice <= stopLossPrice) {
    return {
      type: 'stop_loss',
      triggerPrice: stopLossPrice,
      currentPrice,
      suggestedAction: '立即止损，避免更大损失',
      urgency: 'critical',
    };
  }
  
  // 接近止损价（2%范围内）
  const distancePercent = ((currentPrice - stopLossPrice) / stopLossPrice) * 100;
  if (distancePercent < 2 && distancePercent > 0) {
    return {
      type: 'stop_loss',
      triggerPrice: stopLossPrice,
      currentPrice,
      suggestedAction: '价格接近止损，做好止损准备',
      urgency: 'high',
    };
  }
  
  return null;
}

/**
 * 检查是否触发止盈
 */
export function checkTakeProfit(
  currentPrice: number,
  target1Price: number,
  target2Price: number,
  target3Price: number
): StopLossAlert | null {
  // 检查第三目标
  if (currentPrice >= target3Price) {
    return {
      type: 'take_profit',
      level: 3,
      triggerPrice: target3Price,
      currentPrice,
      suggestedAction: '已达到第三目标价，建议卖出剩余25%仓位',
      urgency: 'high',
    };
  }
  
  // 检查第二目标
  if (currentPrice >= target2Price) {
    return {
      type: 'take_profit',
      level: 2,
      triggerPrice: target2Price,
      currentPrice,
      suggestedAction: '已达到第二目标价，建议卖出50%仓位',
      urgency: 'medium',
    };
  }
  
  // 检查第一目标
  if (currentPrice >= target1Price) {
    return {
      type: 'take_profit',
      level: 1,
      triggerPrice: target1Price,
      currentPrice,
      suggestedAction: '已达到第一目标价，建议卖出25%仓位',
      urgency: 'medium',
    };
  }
  
  return null;
}

/**
 * 计算执行延迟警告
 */
export function calculateDelayWarning(
  alert: StopLossAlert,
  triggerTime: Date
): StopLossAlert {
  const now = new Date();
  const delaySeconds = Math.floor((now.getTime() - triggerTime.getTime()) / 1000);
  
  if (alert.type === 'stop_loss') {
    if (delaySeconds > 300) {  // 5分钟
      alert.delayWarning = `⚠️ 止损已触发${Math.floor(delaySeconds / 60)}分钟，尚未执行！`;
      alert.urgency = 'critical';
    } else if (delaySeconds > 60) {  // 1分钟
      alert.delayWarning = `⚠️ 止损已触发${delaySeconds}秒，请尽快执行！`;
    }
  } else {
    if (delaySeconds > 600) {  // 10分钟
      alert.delayWarning = `价格可能回落，建议尽快止盈`;
    }
  }
  
  return alert;
}

/**
 * 记录执行情况
 */
export function recordExecution(
  planId: string,
  alert: StopLossAlert,
  triggerTime: Date,
  executed: boolean,
  executionPrice?: number,
  reason?: string
): ExecutionRecord {
  const now = new Date();
  const delay = executed 
    ? Math.floor((now.getTime() - triggerTime.getTime()) / 1000)
    : undefined;
  
  return {
    id: `exec_${Date.now()}`,
    planId,
    type: alert.type,
    triggerTime,
    executionTime: executed ? now : undefined,
    triggerPrice: alert.triggerPrice,
    executionPrice,
    delay,
    executed,
    reason,
  };
}

/**
 * 计算执行统计
 */
export function calculateExecutionStats(records: ExecutionRecord[]): {
  stopLossExecutionRate: number;
  takeProfitExecutionRate: number;
  averageDelay: number;
  totalExecuted: number;
  totalTriggered: number;
} {
  const stopLossRecords = records.filter(r => r.type === 'stop_loss');
  const takeProfitRecords = records.filter(r => r.type === 'take_profit');
  
  const stopLossExecuted = stopLossRecords.filter(r => r.executed).length;
  const takeProfitExecuted = takeProfitRecords.filter(r => r.executed).length;
  
  const stopLossExecutionRate = stopLossRecords.length > 0
    ? (stopLossExecuted / stopLossRecords.length) * 100
    : 0;
  
  const takeProfitExecutionRate = takeProfitRecords.length > 0
    ? (takeProfitExecuted / takeProfitRecords.length) * 100
    : 0;
  
  const executedRecords = records.filter(r => r.executed && r.delay);
  const averageDelay = executedRecords.length > 0
    ? executedRecords.reduce((sum, r) => sum + (r.delay || 0), 0) / executedRecords.length
    : 0;
  
  return {
    stopLossExecutionRate,
    takeProfitExecutionRate,
    averageDelay,
    totalExecuted: records.filter(r => r.executed).length,
    totalTriggered: records.length,
  };
}

/**
 * 生成执行报告
 */
export function generateExecutionReport(record: ExecutionRecord): string {
  const lines = [
    '=== 止损/止盈执行记录 ===\n',
    `类型：${record.type === 'stop_loss' ? '止损' : '止盈'}`,
    `触发时间：${record.triggerTime.toLocaleString('zh-CN')}`,
    `触发价格：$${record.triggerPrice.toFixed(2)}`,
  ];
  
  if (record.executed) {
    lines.push(
      `执行时间：${record.executionTime?.toLocaleString('zh-CN')}`,
      `执行价格：$${record.executionPrice?.toFixed(2)}`,
      `执行延迟：${record.delay}秒`,
      `\n✅ 执行成功`
    );
    
    if (record.delay && record.delay > 60) {
      lines.push(`⚠️ 执行延迟较长，建议加快反应速度`);
    }
  } else {
    lines.push(
      `\n❌ 未执行`,
      `原因：${record.reason || '未知'}`
    );
  }
  
  return lines.join('\n');
}

/**
 * 获取执行建议
 */
export function getExecutionAdvice(
  alert: StopLossAlert,
  delaySeconds: number
): string[] {
  const advice: string[] = [];
  
  if (alert.type === 'stop_loss') {
    advice.push('🚨 止损是保护本金的最后防线');
    advice.push('📉 立即执行止损，不要犹豫');
    advice.push('💰 小亏损总比大亏损好');
    
    if (delaySeconds > 60) {
      advice.push('⏰ 每延迟1秒，风险都在增加！');
    }
  } else {
    advice.push('🎯 恭喜达到目标价位！');
    advice.push('💡 建议按计划分批止盈');
    advice.push('📈 落袋为安，不要贪婪');
    
    if (delaySeconds > 300) {
      advice.push('⚠️ 价格可能回落，尽快止盈');
    }
  }
  
  return advice;
}




