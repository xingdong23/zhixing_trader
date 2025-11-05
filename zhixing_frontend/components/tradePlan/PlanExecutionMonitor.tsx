"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, AlertCircle, CheckCircle, TrendingUp, TrendingDown, Target } from "lucide-react";
import { TradePlan, checkPlanDeviation } from "@/lib/tradePlan";

interface PlanExecutionMonitorProps {
  plan: TradePlan;
  currentPrice: number;
  onStopLoss?: () => void;
  onTakeProfit?: (level: 1 | 2 | 3) => void;
}

export default function PlanExecutionMonitor({
  plan,
  currentPrice,
  onStopLoss,
  onTakeProfit,
}: PlanExecutionMonitorProps) {
  const [deviation, setDeviation] = useState(checkPlanDeviation(plan, currentPrice));
  const [showAlert, setShowAlert] = useState(false);

  // 实时监控价格变化
  useEffect(() => {
    const newDeviation = checkPlanDeviation(plan, currentPrice);
    setDeviation(newDeviation);
    
    // 有偏离时显示警报
    if (newDeviation.hasDeviation) {
      setShowAlert(true);
    }
  }, [currentPrice, plan]);

  // 计算当前盈亏
  const currentPnL = ((currentPrice - plan.targetBuyPrice) / plan.targetBuyPrice) * 100;
  const isProfitable = currentPnL >= 0;

  // 判断当前达到哪个目标价
  const getTargetLevel = () => {
    if (currentPrice >= plan.stopProfit.target3.price) return 3;
    if (currentPrice >= plan.stopProfit.target2.price) return 2;
    if (currentPrice >= plan.stopProfit.target1.price) return 1;
    return 0;
  };

  const targetLevel = getTargetLevel();

  // 获取风险等级颜色
  const getRiskColor = () => {
    if (deviation.deviationType === 'below_stop_loss') return 'bg-red-100 border-red-500 text-red-900';
    if (deviation.deviationType === 'above_max_buy') return 'bg-yellow-100 border-yellow-500 text-yellow-900';
    if (deviation.deviationType === 'above_target') return 'bg-green-100 border-green-500 text-green-900';
    return 'bg-blue-100 border-blue-500 text-blue-900';
  };

  return (
    <div className="space-y-4">
      {/* 当前状态卡片 */}
      <Card className={`p-6 border-2 ${getRiskColor()}`}>
        <div className="space-y-4">
          {/* 顶部：当前价格和盈亏 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">当前价格</div>
              <div className="text-4xl font-bold">
                ${currentPrice.toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 dark:text-gray-400">当前盈亏</div>
              <div className={`text-4xl font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                {isProfitable ? '+' : ''}{currentPnL.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* 偏离状态提示 */}
          {deviation.hasDeviation && showAlert && (
            <Alert variant={deviation.deviationType === 'below_stop_loss' ? 'destructive' : 'default'}>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{deviation.message}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAlert(false)}
                >
                  知道了
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* 价格关键点位 */}
          <div className="grid grid-cols-5 gap-2 text-xs">
            <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
              <div className="text-red-600 font-bold">止损</div>
              <div>${plan.stopLoss.price.toFixed(2)}</div>
              <div className="text-red-600">-{plan.stopLoss.percent.toFixed(1)}%</div>
            </div>
            <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
              <div className="text-blue-600 font-bold">买入</div>
              <div>${plan.targetBuyPrice.toFixed(2)}</div>
              <div className="text-blue-600">0%</div>
            </div>
            <div className={`text-center p-2 rounded ${targetLevel >= 1 ? 'bg-green-100 dark:bg-green-900/40' : 'bg-green-50 dark:bg-green-900/20'}`}>
              <div className="text-green-600 font-bold">目标1</div>
              <div>${plan.stopProfit.target1.price.toFixed(2)}</div>
              <div className="text-green-600">+{plan.stopProfit.target1.percent.toFixed(1)}%</div>
              {targetLevel >= 1 && <CheckCircle className="w-4 h-4 mx-auto text-green-600 mt-1" />}
            </div>
            <div className={`text-center p-2 rounded ${targetLevel >= 2 ? 'bg-green-100 dark:bg-green-900/40' : 'bg-green-50 dark:bg-green-900/20'}`}>
              <div className="text-green-600 font-bold">目标2</div>
              <div>${plan.stopProfit.target2.price.toFixed(2)}</div>
              <div className="text-green-600">+{plan.stopProfit.target2.percent.toFixed(1)}%</div>
              {targetLevel >= 2 && <CheckCircle className="w-4 h-4 mx-auto text-green-600 mt-1" />}
            </div>
            <div className={`text-center p-2 rounded ${targetLevel >= 3 ? 'bg-green-100 dark:bg-green-900/40' : 'bg-green-50 dark:bg-green-900/20'}`}>
              <div className="text-green-600 font-bold">目标3</div>
              <div>${plan.stopProfit.target3.price.toFixed(2)}</div>
              <div className="text-green-600">+{plan.stopProfit.target3.percent.toFixed(1)}%</div>
              {targetLevel >= 3 && <CheckCircle className="w-4 h-4 mx-auto text-green-600 mt-1" />}
            </div>
          </div>
        </div>
      </Card>

      {/* 操作建议 */}
      {deviation.hasDeviation && (
        <Card className="p-4">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            执行建议
          </h3>
          <div className="space-y-2">
            {deviation.deviationType === 'below_stop_loss' && (
              <div>
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    <div className="font-bold mb-2">🚨 紧急：价格已跌破止损线！</div>
                    <div className="space-y-1 text-sm">
                      <p>• 立即执行止损，避免更大损失</p>
                      <p>• 不要幻想反弹，严格执行纪律</p>
                      <p>• 保护本金是第一要务</p>
                    </div>
                    {onStopLoss && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={onStopLoss}
                      >
                        <TrendingDown className="w-4 h-4 mr-2" />
                        立即止损
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {deviation.deviationType === 'above_max_buy' && (
              <div>
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    <div className="font-bold mb-2">⚠️ 警告：价格超过最高买入价！</div>
                    <div className="space-y-1 text-sm">
                      <p>• 当前价格可能存在追高风险</p>
                      <p>• 建议等待回调再买入</p>
                      <p>• 或者考虑提高止损价格以降低风险</p>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {deviation.deviationType === 'above_target' && targetLevel > 0 && (
              <div>
                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <AlertDescription>
                    <div className="font-bold mb-2 text-green-900">
                      ✅ 恭喜：已达到目标价位！
                    </div>
                    <div className="space-y-1 text-sm text-green-800">
                      {targetLevel >= 1 && (
                        <div>
                          <p className="font-bold">第一目标（+{plan.stopProfit.target1.percent.toFixed(1)}%）</p>
                          <p>• 建议卖出 25% 仓位</p>
                          <p>• 锁定部分利润，降低风险</p>
                          {onTakeProfit && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 w-full border-green-500 text-green-700 hover:bg-green-50"
                              onClick={() => onTakeProfit(1)}
                            >
                              <Target className="w-4 h-4 mr-2" />
                              卖出25%（目标1）
                            </Button>
                          )}
                        </div>
                      )}
                      {targetLevel >= 2 && (
                        <div className="mt-2 pt-2 border-t border-green-200">
                          <p className="font-bold">第二目标（+{plan.stopProfit.target2.percent.toFixed(1)}%）</p>
                          <p>• 建议再卖出 50% 仓位</p>
                          <p>• 大部分利润已锁定</p>
                          {onTakeProfit && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 w-full border-green-500 text-green-700 hover:bg-green-50"
                              onClick={() => onTakeProfit(2)}
                            >
                              <Target className="w-4 h-4 mr-2" />
                              卖出50%（目标2）
                            </Button>
                          )}
                        </div>
                      )}
                      {targetLevel >= 3 && (
                        <div className="mt-2 pt-2 border-t border-green-200">
                          <p className="font-bold">第三目标（+{plan.stopProfit.target3.percent.toFixed(1)}%）</p>
                          <p>• 建议卖出剩余 25% 仓位</p>
                          <p>• 完美执行分批止盈策略！</p>
                          {onTakeProfit && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 w-full border-green-500 text-green-700 hover:bg-green-50"
                              onClick={() => onTakeProfit(3)}
                            >
                              <Target className="w-4 h-4 mr-2" />
                              卖出25%（目标3）
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 计划详情 */}
      <Card className="p-4">
        <h3 className="font-bold mb-3">交易计划详情</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-600">交易类型</div>
            <div className="font-medium">
              {plan.tradeType === 'short_term' ? '短期投机' : 
               plan.tradeType === 'swing' ? '波段交易' : '价值投资'}
            </div>
          </div>
          <div>
            <div className="text-gray-600">预期持有</div>
            <div className="font-medium">{plan.expectedHoldDays} 天</div>
          </div>
          <div>
            <div className="text-gray-600">仓位比例</div>
            <div className="font-medium">{plan.positionSize}%</div>
          </div>
          <div>
            <div className="text-gray-600">风险收益比</div>
            <div className="font-medium">1:{plan.riskRewardRatio.toFixed(2)}</div>
          </div>
        </div>
      </Card>

      {/* 纪律提醒 */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-900/20">
        <h3 className="font-bold mb-3 text-blue-900 dark:text-blue-100">
          📋 交易纪律提醒
        </h3>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li>• 严格按照计划执行，不要随意改变</li>
          <li>• 达到止损价必须立即止损</li>
          <li>• 达到目标价建议分批止盈</li>
          <li>• 不要因为短期波动而恐慌</li>
          <li>• 持有时间不要超过预期太多</li>
        </ul>
      </Card>
    </div>
  );
}




