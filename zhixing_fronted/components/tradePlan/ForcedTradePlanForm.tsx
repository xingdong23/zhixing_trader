"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle, Info, TrendingUp, Shield, Target, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TradePlan,
  TradeType,
  TRADE_TYPE_CONFIG,
  evaluateTradePlan,
  calculateRiskRewardRatio,
} from "@/lib/tradePlan";

interface ForcedTradePlanFormProps {
  symbol?: string;
  name?: string;
  currentPrice?: number;
  onSubmit: (plan: TradePlan) => void;
  onCancel: () => void;
}

export default function ForcedTradePlanForm({
  symbol = "",
  name = "",
  currentPrice = 0,
  onSubmit,
  onCancel,
}: ForcedTradePlanFormProps) {
  const [plan, setPlan] = useState<TradePlan>({
    symbol,
    name,
    tradeType: "swing",
    buyReason: {
      technical: "",
      fundamental: "",
      catalyst: "",
    },
    targetBuyPrice: currentPrice,
    maxBuyPrice: currentPrice * 1.05,
    positionSize: 10,
    stopLoss: {
      price: currentPrice * 0.92,
      percent: 8,
    },
    stopProfit: {
      target1: { price: currentPrice * 1.1, percent: 10, sellPercent: 25 },
      target2: { price: currentPrice * 1.2, percent: 20, sellPercent: 50 },
      target3: { price: currentPrice * 1.3, percent: 30, sellPercent: 25 },
    },
    expectedHoldDays: 30,
    riskRewardRatio: 0,
    status: "draft",
  });

  const [score, setScore] = useState(evaluateTradePlan(plan));

  // 实时更新评分
  useEffect(() => {
    const newScore = evaluateTradePlan(plan);
    setScore(newScore);
    
    // 计算风险收益比
    const rrr = calculateRiskRewardRatio(
      plan.targetBuyPrice,
      plan.stopLoss.price,
      plan.stopProfit.target2.price
    );
    setPlan((prev) => ({ ...prev, riskRewardRatio: rrr }));
  }, [plan]);

  const handleTradeTypeChange = (type: TradeType) => {
    const config = TRADE_TYPE_CONFIG[type];
    setPlan({
      ...plan,
      tradeType: type,
      positionSize: Math.min(plan.positionSize, config.positionSizeMax),
    });
  };

  const handlePriceChange = (field: string, value: number) => {
    const updates: any = { [field]: value };
    
    // 自动计算止损百分比
    if (field === "stopLoss.price") {
      const percent = ((plan.targetBuyPrice - value) / plan.targetBuyPrice) * 100;
      updates.stopLoss = { price: value, percent };
    }
    
    // 自动计算止盈百分比
    if (field.startsWith("stopProfit.target")) {
      const targetNum = field.includes("target1") ? 1 : field.includes("target2") ? 2 : 3;
      const percent = ((value - plan.targetBuyPrice) / plan.targetBuyPrice) * 100;
      updates.stopProfit = {
        ...plan.stopProfit,
        [`target${targetNum}`]: {
          ...plan.stopProfit[`target${targetNum}` as keyof typeof plan.stopProfit],
          price: value,
          percent,
        },
      };
    }
    
    setPlan({ ...plan, ...updates });
  };

  const handleSubmit = () => {
    if (score.canTrade) {
      onSubmit({ ...plan, score: score.total, createdAt: new Date().toISOString() });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800 border-green-300";
    if (score >= 60) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-red-100 text-red-800 border-red-300";
  };

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto p-6">
      {/* 评分展示 */}
      <Card className={`border-2 ${score.canTrade ? "border-green-500" : "border-red-500"}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>交易计划评分</CardTitle>
            <Badge className={`${getScoreBadgeColor(score.total)} text-xl px-4 py-2 border`}>
              {score.total} 分
            </Badge>
          </div>
          <CardDescription>
            {score.canTrade ? "✅ 计划符合要求，可以执行交易" : "⚠️ 计划不完整，必须完善后才能交易"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4 mb-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreColor(score.breakdown.buyReason)}`}>
                {score.breakdown.buyReason}
              </div>
              <div className="text-xs text-gray-500">买入理由 (30)</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreColor(score.breakdown.stopLoss)}`}>
                {score.breakdown.stopLoss}
              </div>
              <div className="text-xs text-gray-500">止损设置 (25)</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreColor(score.breakdown.stopProfit)}`}>
                {score.breakdown.stopProfit}
              </div>
              <div className="text-xs text-gray-500">止盈设置 (20)</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreColor(score.breakdown.positionSize)}`}>
                {score.breakdown.positionSize}
              </div>
              <div className="text-xs text-gray-500">仓位管理 (15)</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreColor(score.breakdown.timeFrame)}`}>
                {score.breakdown.timeFrame}
              </div>
              <div className="text-xs text-gray-500">时间规划 (10)</div>
            </div>
          </div>

          {/* 建议 */}
          <div className="space-y-2">
            {score.suggestions.map((suggestion, index) => (
              <Alert key={index} variant={index === 0 && !score.canTrade ? "destructive" : "default"}>
                <AlertDescription className="flex items-center gap-2">
                  {index === 0 && score.canTrade ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  {suggestion}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            基本信息
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>股票代码</Label>
              <Input value={plan.symbol} disabled />
            </div>
            <div>
              <Label>股票名称</Label>
              <Input value={plan.name} disabled />
            </div>
          </div>

          <div>
            <Label>交易类型 *</Label>
            <Select value={plan.tradeType} onValueChange={(value: TradeType) => handleTradeTypeChange(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TRADE_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div>
                      <div className="font-medium">{config.label}</div>
                      <div className="text-xs text-gray-500">{config.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              建议持有：{TRADE_TYPE_CONFIG[plan.tradeType].expectedDays} | 
              最大仓位：{TRADE_TYPE_CONFIG[plan.tradeType].positionSizeMax}% |
              最大止损：{TRADE_TYPE_CONFIG[plan.tradeType].stopLossMax}%
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 买入理由 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            买入理由 * (必须详细填写)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>技术面分析（至少20字）</Label>
            <Textarea
              placeholder="例如：突破20日均线，MACD金叉，成交量放大，RSI处于50-70区间..."
              value={plan.buyReason.technical}
              onChange={(e) =>
                setPlan({
                  ...plan,
                  buyReason: { ...plan.buyReason, technical: e.target.value },
                })
              }
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              {plan.buyReason.technical.length}/20 字
            </p>
          </div>

          <div>
            <Label>基本面分析（至少20字）</Label>
            <Textarea
              placeholder="例如：公司业绩持续增长，ROE>15%，行业地位前三，财务健康..."
              value={plan.buyReason.fundamental}
              onChange={(e) =>
                setPlan({
                  ...plan,
                  buyReason: { ...plan.buyReason, fundamental: e.target.value },
                })
              }
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              {plan.buyReason.fundamental.length}/20 字
            </p>
          </div>

          <div>
            <Label>消息面/催化剂（至少10字）</Label>
            <Textarea
              placeholder="例如：新产品发布，行业政策利好，订单增长超预期..."
              value={plan.buyReason.catalyst}
              onChange={(e) =>
                setPlan({
                  ...plan,
                  buyReason: { ...plan.buyReason, catalyst: e.target.value },
                })
              }
              rows={2}
            />
            <p className="text-xs text-gray-500 mt-1">
              {plan.buyReason.catalyst.length}/10 字
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 价格和仓位 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            价格和仓位设置 *
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>目标买入价 *</Label>
              <Input
                type="number"
                step="0.01"
                value={plan.targetBuyPrice}
                onChange={(e) =>
                  setPlan({ ...plan, targetBuyPrice: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label>最高买入价 *</Label>
              <Input
                type="number"
                step="0.01"
                value={plan.maxBuyPrice}
                onChange={(e) =>
                  setPlan({ ...plan, maxBuyPrice: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <div>
            <Label>仓位比例（占总资金%）*</Label>
            <Input
              type="number"
              step="1"
              max={TRADE_TYPE_CONFIG[plan.tradeType].positionSizeMax}
              value={plan.positionSize}
              onChange={(e) =>
                setPlan({ ...plan, positionSize: parseFloat(e.target.value) || 0 })
              }
            />
            <p className="text-xs text-gray-500 mt-1">
              建议≤{TRADE_TYPE_CONFIG[plan.tradeType].positionSizeMax}%
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 止损设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            止损设置 * (必须设置)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>止损价格 *</Label>
            <Input
              type="number"
              step="0.01"
              value={plan.stopLoss.price}
              onChange={(e) => handlePriceChange("stopLoss.price", parseFloat(e.target.value) || 0)}
            />
            <p className="text-xs text-gray-500 mt-1">
              止损幅度：{plan.stopLoss.percent.toFixed(2)}%
              （建议≤{TRADE_TYPE_CONFIG[plan.tradeType].stopLossMax}%）
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 止盈设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            止盈设置 * (分批止盈策略)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>第一目标（保守）25%</Label>
              <Input
                type="number"
                step="0.01"
                value={plan.stopProfit.target1.price}
                onChange={(e) =>
                  handlePriceChange("stopProfit.target1.price", parseFloat(e.target.value) || 0)
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                +{plan.stopProfit.target1.percent.toFixed(2)}%
              </p>
            </div>
            <div>
              <Label>第二目标（正常）50%</Label>
              <Input
                type="number"
                step="0.01"
                value={plan.stopProfit.target2.price}
                onChange={(e) =>
                  handlePriceChange("stopProfit.target2.price", parseFloat(e.target.value) || 0)
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                +{plan.stopProfit.target2.percent.toFixed(2)}%
              </p>
            </div>
            <div>
              <Label>第三目标（乐观）25%</Label>
              <Input
                type="number"
                step="0.01"
                value={plan.stopProfit.target3.price}
                onChange={(e) =>
                  handlePriceChange("stopProfit.target3.price", parseFloat(e.target.value) || 0)
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                +{plan.stopProfit.target3.percent.toFixed(2)}%
              </p>
            </div>
          </div>

          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              建议分批止盈：达到第一目标卖出25%，第二目标卖出50%，第三目标卖出剩余25%
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* 时间规划 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            时间规划 *
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label>预期持有天数 *</Label>
            <Input
              type="number"
              step="1"
              value={plan.expectedHoldDays}
              onChange={(e) =>
                setPlan({ ...plan, expectedHoldDays: parseInt(e.target.value) || 0 })
              }
            />
            <p className="text-xs text-gray-500 mt-1">
              建议：{TRADE_TYPE_CONFIG[plan.tradeType].expectedDays}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 风险收益比 */}
      <Card>
        <CardHeader>
          <CardTitle>风险收益比</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className={`text-4xl font-bold ${plan.riskRewardRatio >= 2 ? "text-green-600" : plan.riskRewardRatio >= 1 ? "text-yellow-600" : "text-red-600"}`}>
              1 : {plan.riskRewardRatio.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {plan.riskRewardRatio >= 2
                ? "✅ 风险收益比良好"
                : plan.riskRewardRatio >= 1
                ? "⚠️ 风险收益比一般，建议优化"
                : "❌ 风险收益比较差，不建议交易"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex gap-4 sticky bottom-0 bg-white dark:bg-gray-900 py-4 border-t">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          取消
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!score.canTrade}
          className="flex-1"
        >
          {score.canTrade ? `提交交易计划（${score.total}分）` : `计划不完整（${score.total}分/60分）`}
        </Button>
      </div>
    </div>
  );
}


