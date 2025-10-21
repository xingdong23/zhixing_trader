// 交易违规检测逻辑

import type { Trade, TradeViolation } from "@/app/trades/types";

/**
 * 检测交易违规
 * @param trade 交易记录
 * @returns 违规列表
 */
export function detectViolations(trade: Trade): TradeViolation[] {
  const violations: TradeViolation[] = [];
  
  // 如果交易还在计划阶段，不检测
  if (trade.status === "planned") {
    return violations;
  }

  // 1. 检测入场价格违规（偏离计划价格超过2%）
  if (trade.planEntryPrice && trade.entryPrice) {
    const priceDiff = Math.abs(trade.entryPrice - trade.planEntryPrice);
    const priceDeviation = (priceDiff / trade.planEntryPrice) * 100;
    
    if (priceDeviation > 2) {
      const severity = priceDeviation > 5 ? "high" : priceDeviation > 3 ? "medium" : "low";
      violations.push({
        type: "entry_price",
        severity,
        description: `入场价格偏离计划 ${priceDeviation.toFixed(2)}%`,
        plannedValue: trade.planEntryPrice,
        actualValue: trade.entryPrice,
        detectedAt: trade.entryTime || trade.updatedAt,
      });
    }
  }

  // 2. 检测仓位大小违规（偏离计划数量超过10%）
  if (trade.planQuantity && trade.entryQuantity) {
    const quantityDiff = Math.abs(trade.entryQuantity - trade.planQuantity);
    const quantityDeviation = (quantityDiff / trade.planQuantity) * 100;
    
    if (quantityDeviation > 10) {
      const severity = quantityDeviation > 30 ? "high" : quantityDeviation > 20 ? "medium" : "low";
      violations.push({
        type: "position_size",
        severity,
        description: `仓位偏离计划 ${quantityDeviation.toFixed(2)}%`,
        plannedValue: trade.planQuantity,
        actualValue: trade.entryQuantity,
        detectedAt: trade.entryTime || trade.updatedAt,
      });
    }
  }

  // 3. 检测止损违规（未设置止损或止损价格不合理）
  if (trade.status === "active") {
    if (!trade.stopLossPrice && trade.planStopLoss) {
      violations.push({
        type: "stop_loss",
        severity: "high",
        description: "未设置止损价格",
        plannedValue: trade.planStopLoss,
        actualValue: "未设置",
        detectedAt: trade.updatedAt,
      });
    } else if (trade.stopLossPrice && trade.planStopLoss) {
      const slDiff = Math.abs(trade.stopLossPrice - trade.planStopLoss);
      const slDeviation = (slDiff / Math.abs(trade.entryPrice! - trade.planStopLoss)) * 100;
      
      if (slDeviation > 20) {
        violations.push({
          type: "stop_loss",
          severity: "medium",
          description: `止损价格偏离计划 ${slDeviation.toFixed(2)}%`,
          plannedValue: trade.planStopLoss,
          actualValue: trade.stopLossPrice,
          detectedAt: trade.updatedAt,
        });
      }
    }
  }

  // 4. 检测止盈违规（提前止盈但未达到计划目标）
  if (trade.status === "closed" && trade.planTakeProfit && trade.exitPrice) {
    const planProfit = trade.planType === "long" 
      ? trade.planTakeProfit - (trade.planEntryPrice || 0)
      : (trade.planEntryPrice || 0) - trade.planTakeProfit;
    
    const actualProfit = trade.planType === "long"
      ? trade.exitPrice - (trade.entryPrice || 0)
      : (trade.entryPrice || 0) - trade.exitPrice;
    
    if (actualProfit < planProfit * 0.7 && actualProfit > 0) {
      violations.push({
        type: "take_profit",
        severity: "medium",
        description: "未达到计划止盈目标即提前平仓",
        plannedValue: trade.planTakeProfit,
        actualValue: trade.exitPrice,
        detectedAt: trade.exitTime || trade.updatedAt,
      });
    }
  }

  // 5. 检测持仓时间违规（假设短期策略不应持仓超过5天）
  if (trade.status === "closed" && trade.entryTime && trade.exitTime) {
    const entryDate = new Date(trade.entryTime);
    const exitDate = new Date(trade.exitTime);
    const holdingDays = Math.floor((exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // 如果有 "short_term" 策略标签，检测持仓时间
    if (trade.strategyTags?.includes("short_term") && holdingDays > 5) {
      violations.push({
        type: "holding_time",
        severity: "low",
        description: `短期策略持仓时间过长 (${holdingDays}天)`,
        plannedValue: "≤5天",
        actualValue: `${holdingDays}天`,
        detectedAt: trade.exitTime,
      });
    }
  }

  return violations;
}

/**
 * 计算违规成本
 * @param trade 交易记录
 * @returns 违规导致的额外损失（估算）
 */
export function calculateViolationCost(trade: Trade): number {
  let totalCost = 0;
  const violations = trade.violations || detectViolations(trade);

  violations.forEach(v => {
    switch (v.type) {
      case "entry_price":
        // 入场价格偏离导致的成本
        if (typeof v.plannedValue === "number" && typeof v.actualValue === "number") {
          const priceDiff = Math.abs(v.actualValue - v.plannedValue);
          const quantity = trade.entryQuantity || trade.planQuantity || 0;
          totalCost += priceDiff * quantity;
        }
        break;
      
      case "stop_loss":
        // 未设置止损或止损不当可能导致更大损失（估算为当前亏损的20%）
        if (trade.netPnl && trade.netPnl < 0) {
          totalCost += Math.abs(trade.netPnl) * 0.2;
        }
        break;
      
      case "take_profit":
        // 提前止盈导致的机会成本
        if (trade.planTakeProfit && trade.exitPrice && trade.entryPrice) {
          const missedProfit = trade.planType === "long"
            ? (trade.planTakeProfit - trade.exitPrice) * (trade.exitQuantity || 0)
            : (trade.exitPrice - trade.planTakeProfit) * (trade.exitQuantity || 0);
          if (missedProfit > 0) {
            totalCost += missedProfit;
          }
        }
        break;
      
      case "position_size":
        // 仓位偏离导致的风险成本（较难量化，暂不计入）
        break;
      
      default:
        break;
    }
  });

  return totalCost;
}

/**
 * 获取违规严重程度的颜色
 */
export function getViolationColor(severity: "low" | "medium" | "high"): string {
  switch (severity) {
    case "low":
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case "medium":
      return "text-orange-600 bg-orange-50 border-orange-200";
    case "high":
      return "text-red-600 bg-red-50 border-red-200";
  }
}

/**
 * 获取违规类型的中文标签
 */
export function getViolationLabel(type: TradeViolation["type"]): string {
  const labels: Record<TradeViolation["type"], string> = {
    entry_price: "入场价格",
    stop_loss: "止损设置",
    take_profit: "止盈执行",
    position_size: "仓位大小",
    holding_time: "持仓时间",
    add_position: "加仓操作",
  };
  return labels[type] || type;
}

