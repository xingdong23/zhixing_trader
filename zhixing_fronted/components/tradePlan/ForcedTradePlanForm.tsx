"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle, Info, TrendingUp, Shield, Target, Clock, Image as ImageIcon, X } from "lucide-react";
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
  const [chartImages, setChartImages] = useState<string[]>([]);
  const technicalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [suggestedShares, setSuggestedShares] = useState<number>(0);

  // 实时更新评分和风险收益比
  useEffect(() => {
    const newScore = evaluateTradePlan(plan);
    setScore(newScore);
    
    const rrr = calculateRiskRewardRatio(
      plan.targetBuyPrice,
      plan.stopLoss.price,
      plan.stopProfit.target2.price
    );
    if (Math.abs(plan.riskRewardRatio - rrr) > 0.01) {
      setPlan((prev) => ({ ...prev, riskRewardRatio: rrr }));
    }
  }, [
    plan.tradeType,
    plan.buyReason.technical,
    plan.buyReason.fundamental,
    plan.buyReason.catalyst,
    plan.targetBuyPrice,
    plan.stopLoss.price,
    plan.stopProfit.target1.price,
    plan.stopProfit.target2.price,
    plan.stopProfit.target3.price,
    plan.positionSize,
    plan.expectedHoldDays,
  ]);

  // 根据风险预算建议股数
  useEffect(() => {
    const balance = plan.accountBalance || 0;
    const riskPct = plan.riskBudgetPercent || 0;
    const riskAmt = plan.riskAmount || (balance * riskPct / 100);
    const riskPerShare = Math.max(plan.targetBuyPrice - plan.stopLoss.price, 0);
    if (riskAmt > 0 && riskPerShare > 0) {
      const shares = Math.floor(riskAmt / riskPerShare);
      setSuggestedShares(shares);
    } else {
      setSuggestedShares(0);
    }
  }, [plan.accountBalance, plan.riskBudgetPercent, plan.riskAmount, plan.targetBuyPrice, plan.stopLoss.price]);

  // 处理图片粘贴
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const imageUrl = event.target?.result as string;
            setChartImages((prev) => [...prev, imageUrl]);
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  const removeImage = (index: number) => {
    setChartImages((prev) => prev.filter((_, i) => i !== index));
  };

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
    
    if (field === "stopLoss.price") {
      const percent = ((plan.targetBuyPrice - value) / plan.targetBuyPrice) * 100;
      updates.stopLoss = { price: value, percent };
    }
    
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
    <div className="flex h-full w-full">
      {/* 左侧：表单区域 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 min-w-0">
        {/* 基本信息 */}
        <Card className="border-2">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="w-5 h-5" />
              基本信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium">股票代码</Label>
                <Input value={plan.symbol} disabled className="mt-1.5" />
              </div>
              <div>
                <Label className="text-sm font-medium">股票名称</Label>
                <Input value={plan.name} disabled className="mt-1.5" />
              </div>
              <div>
                <Label className="text-sm font-medium">当前价格</Label>
                <Input value={`$${currentPrice.toFixed(2)}`} disabled className="mt-1.5" />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">交易类型 *</Label>
              <Select value={plan.tradeType} onValueChange={(value: TradeType) => handleTradeTypeChange(value)}>
                <SelectTrigger className="mt-1.5">
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
              <p className="text-xs text-gray-500 mt-2">
                💡 建议持有：{TRADE_TYPE_CONFIG[plan.tradeType].expectedDays} | 
                最大仓位：{TRADE_TYPE_CONFIG[plan.tradeType].positionSizeMax}% |
                最大止损：{TRADE_TYPE_CONFIG[plan.tradeType].stopLossMax}%
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 买入理由 */}
        <Card className="border-2 border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              买入理由（30分）
            </CardTitle>
            <CardDescription>详细的分析是成功交易的基础</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium flex items-center justify-between">
                <span>📊 技术面分析（至少20字）</span>
                <span className={`text-xs ${plan.buyReason.technical.length >= 20 ? 'text-green-600' : 'text-gray-400'}`}>
                  {plan.buyReason.technical.length}/20
                </span>
              </Label>
              <Textarea
                ref={technicalTextareaRef}
                placeholder="例如：突破20日均线，MACD金叉，成交量放大，RSI处于50-70区间...&#10;&#10;💡 提示：可以直接粘贴K线截图！"
                value={plan.buyReason.technical}
                onChange={(e) =>
                  setPlan({
                    ...plan,
                    buyReason: { ...plan.buyReason, technical: e.target.value },
                  })
                }
                onPaste={handlePaste}
                rows={4}
                className="mt-1.5 resize-none"
              />
              
              {/* 图片预览区域 */}
              {chartImages.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {chartImages.map((img, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={img} 
                        alt={`K线图 ${index + 1}`} 
                        className="w-full h-32 object-cover rounded-lg border-2 border-purple-200"
                      />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <Alert className="mt-3">
                <ImageIcon className="w-4 h-4" />
                <AlertDescription className="text-xs">
                  💡 提示：可以直接 Ctrl+V (Mac: Cmd+V) 粘贴K线截图到文本框中
                </AlertDescription>
              </Alert>
            </div>

            <div>
              <Label className="text-sm font-medium flex items-center justify-between">
                <span>📈 基本面分析（至少20字）</span>
                <span className={`text-xs ${plan.buyReason.fundamental.length >= 20 ? 'text-green-600' : 'text-gray-400'}`}>
                  {plan.buyReason.fundamental.length}/20
                </span>
              </Label>
              <Textarea
                placeholder="例如：公司业绩持续增长，ROE大于15%，行业地位前三，财务健康，市盈率合理..."
                value={plan.buyReason.fundamental}
                onChange={(e) =>
                  setPlan({
                    ...plan,
                    buyReason: { ...plan.buyReason, fundamental: e.target.value },
                  })
                }
                rows={4}
                className="mt-1.5 resize-none"
              />
            </div>

            <div>
              <Label className="text-sm font-medium flex items-center justify-between">
                <span>📰 消息面/催化剂（至少10字）</span>
                <span className={`text-xs ${plan.buyReason.catalyst.length >= 10 ? 'text-green-600' : 'text-gray-400'}`}>
                  {plan.buyReason.catalyst.length}/10
                </span>
              </Label>
              <Textarea
                placeholder="例如：新产品发布，行业政策利好，订单增长超预期，机构增持..."
                value={plan.buyReason.catalyst}
                onChange={(e) =>
                  setPlan({
                    ...plan,
                    buyReason: { ...plan.buyReason, catalyst: e.target.value },
                  })
                }
                rows={3}
                className="mt-1.5 resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* 价格和仓位 */}
        <Card className="border-2 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="w-5 h-5 text-blue-600" />
              价格和仓位设置（15分）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium">目标买入价 *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={plan.targetBuyPrice}
                  onChange={(e) =>
                    setPlan({ ...plan, targetBuyPrice: parseFloat(e.target.value) || 0 })
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">最高买入价 *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={plan.maxBuyPrice}
                  onChange={(e) =>
                    setPlan({ ...plan, maxBuyPrice: parseFloat(e.target.value) || 0 })
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">仓位比例（%）*</Label>
                <Input
                  type="number"
                  step="1"
                  max={TRADE_TYPE_CONFIG[plan.tradeType].positionSizeMax}
                  value={plan.positionSize}
                  onChange={(e) =>
                    setPlan({ ...plan, positionSize: parseFloat(e.target.value) || 0 })
                  }
                  className="mt-1.5"
                />
                <p className="text-xs text-gray-500 mt-1">
                  建议≤{TRADE_TYPE_CONFIG[plan.tradeType].positionSizeMax}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 风险预算与仓位计算（增强） */}
        <Card className="border-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">风险预算与仓位建议</CardTitle>
            <CardDescription>根据账户规模与止损距离，给出建议股数</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium">账户规模（$）</Label>
                <Input type="number" value={plan.accountBalance || ''} onChange={(e) => setPlan({ ...plan, accountBalance: parseFloat(e.target.value) || 0 })} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-sm font-medium">单笔风险（%）</Label>
                <Input type="number" value={plan.riskBudgetPercent || ''} onChange={(e) => setPlan({ ...plan, riskBudgetPercent: parseFloat(e.target.value) || 0 })} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-sm font-medium">或最大亏损金额（$）</Label>
                <Input type="number" value={plan.riskAmount || ''} onChange={(e) => setPlan({ ...plan, riskAmount: parseFloat(e.target.value) || 0 })} className="mt-1.5" />
              </div>
            </div>
            <div className="text-sm text-gray-600">建议股数：<span className="font-semibold">{suggestedShares}</span> 股（基于风险预算与止损距离）</div>
          </CardContent>
        </Card>

        {/* 止损设置 */}
        <Card className="border-2 border-red-200 dark:border-red-800">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-red-600" />
              止损设置（25分）
            </CardTitle>
            <CardDescription>严格的止损是保护本金的关键</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">止损价格 *</Label>
              <Input
                type="number"
                step="0.01"
                value={plan.stopLoss.price}
                onChange={(e) => handlePriceChange("stopLoss.price", parseFloat(e.target.value) || 0)}
                className="mt-1.5"
              />
              <p className={`text-sm mt-2 ${plan.stopLoss.percent <= TRADE_TYPE_CONFIG[plan.tradeType].stopLossMax ? 'text-green-600' : 'text-red-600'}`}>
                止损幅度：{plan.stopLoss.percent.toFixed(2)}%
                （建议≤{TRADE_TYPE_CONFIG[plan.tradeType].stopLossMax}%）
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 止盈设置 */}
        <Card className="border-2 border-green-200 dark:border-green-800">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
              止盈设置（20分）
            </CardTitle>
            <CardDescription>分批止盈，让利润奔跑</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium">第一目标（保守）</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={plan.stopProfit.target1.price}
                  onChange={(e) =>
                    handlePriceChange("stopProfit.target1.price", parseFloat(e.target.value) || 0)
                  }
                  className="mt-1.5"
                />
                <p className="text-xs text-green-600 mt-1">
                  +{plan.stopProfit.target1.percent.toFixed(2)}% (卖25%)
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">第二目标（正常）</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={plan.stopProfit.target2.price}
                  onChange={(e) =>
                    handlePriceChange("stopProfit.target2.price", parseFloat(e.target.value) || 0)
                  }
                  className="mt-1.5"
                />
                <p className="text-xs text-green-600 mt-1">
                  +{plan.stopProfit.target2.percent.toFixed(2)}% (卖50%)
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">第三目标（乐观）</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={plan.stopProfit.target3.price}
                  onChange={(e) =>
                    handlePriceChange("stopProfit.target3.price", parseFloat(e.target.value) || 0)
                  }
                  className="mt-1.5"
                />
                <p className="text-xs text-green-600 mt-1">
                  +{plan.stopProfit.target3.percent.toFixed(2)}% (卖25%)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 时间规划 */}
        <Card className="border-2 border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5 text-orange-600" />
              时间规划（10分）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label className="text-sm font-medium">预期持有天数 *</Label>
              <Input
                type="number"
                step="1"
                value={plan.expectedHoldDays}
                onChange={(e) =>
                  setPlan({ ...plan, expectedHoldDays: parseInt(e.target.value) || 0 })
                }
                className="mt-1.5"
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 建议：{TRADE_TYPE_CONFIG[plan.tradeType].expectedDays}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 市场与信心 */}
        <Card className="border-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">市场与信心</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium">市场环境</Label>
              <Select value={plan.marketCondition || 'sideways'} onValueChange={(v: any) => setPlan({ ...plan, marketCondition: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bull">牛市</SelectItem>
                  <SelectItem value="bear">熊市</SelectItem>
                  <SelectItem value="sideways">震荡</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">信心评分（1-5）</Label>
              <Input type="number" min={1} max={5} value={plan.confidenceRating || 3} onChange={(e) => setPlan({ ...plan, confidenceRating: Math.max(1, Math.min(5, parseInt(e.target.value) || 3)) })} className="mt-1.5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 右侧：评分和风险展示（固定） */}
      <div className="w-80 flex-shrink-0 border-l bg-gray-50 dark:bg-gray-900/50 overflow-y-auto">
        <div className="p-4 space-y-4">
        {/* 总评分 */}
        <Card className={`border-2 ${score.canTrade ? "border-green-500" : "border-red-500"}`}>
          <CardHeader>
            <div className="text-center">
              <div className={`text-6xl font-bold mb-2 ${getScoreColor(score.total)}`}>
                {score.total}
              </div>
              <p className="text-sm text-gray-500">总分</p>
              <Badge className={`${getScoreBadgeColor(score.total)} mt-3 text-sm px-3 py-1`}>
                {score.canTrade ? "✅ 可以交易" : "❌ 禁止交易"}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* 评分详情 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">评分详情</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">买入理由</span>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${getScoreColor(score.breakdown.buyReason)}`}>
                  {score.breakdown.buyReason}
                </span>
                <span className="text-xs text-gray-500">/30</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">止损设置</span>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${getScoreColor(score.breakdown.stopLoss)}`}>
                  {score.breakdown.stopLoss}
                </span>
                <span className="text-xs text-gray-500">/25</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">止盈设置</span>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${getScoreColor(score.breakdown.stopProfit)}`}>
                  {score.breakdown.stopProfit}
                </span>
                <span className="text-xs text-gray-500">/20</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">仓位管理</span>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${getScoreColor(score.breakdown.positionSize)}`}>
                  {score.breakdown.positionSize}
                </span>
                <span className="text-xs text-gray-500">/15</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">时间规划</span>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${getScoreColor(score.breakdown.timeFrame)}`}>
                  {score.breakdown.timeFrame}
                </span>
                <span className="text-xs text-gray-500">/10</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 风险收益比 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">风险收益比</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className={`text-4xl font-bold ${plan.riskRewardRatio >= 2 ? "text-green-600" : plan.riskRewardRatio >= 1 ? "text-yellow-600" : "text-red-600"}`}>
                1 : {plan.riskRewardRatio.toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {plan.riskRewardRatio >= 2
                  ? "✅ 优秀"
                  : plan.riskRewardRatio >= 1
                  ? "⚠️ 一般"
                  : "❌ 较差"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 改进建议 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">改进建议</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {score.suggestions.map((suggestion, index) => (
              <Alert key={index} variant={index === 0 && !score.canTrade ? "destructive" : "default"}>
                <AlertDescription className="flex items-start gap-2 text-xs">
                  {index === 0 && score.canTrade ? (
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  )}
                  <span>{suggestion}</span>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900/50 pt-4 pb-4 space-y-3">
          <Button
            onClick={handleSubmit}
            disabled={!score.canTrade}
            className="w-full h-12 text-lg"
            size="lg"
          >
            {score.canTrade ? `✅ 提交交易计划（${score.total}分）` : `❌ 计划不完整（${score.total}/60分）`}
          </Button>
          <Button variant="outline" onClick={onCancel} className="w-full" size="lg">
            取消
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
}
