"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save } from "lucide-react"
import { Label } from "@/components/ui/label"

export default function CreateTradingPlanPage() {
  const searchParams = useSearchParams()
  const [plan, setPlan] = useState({
    name: "",
    ticker: searchParams.get("ticker") || "",
    entry: "",
    entryCondition: "", // Added technical indicator entry condition
    tp: "",
    tpCondition: "", // Added technical indicator take profit condition
    sl: "",
    slCondition: "", // Added technical indicator stop loss condition
    strategy: "",
    riskLevel: "medium" as const,
    positionSize: "",
    reason: searchParams.get("note")
      ? `基于${searchParams.get("author")}的观点: ${decodeURIComponent(searchParams.get("note") || "")}`
      : "",
  })

  const [showEntryBuilder, setShowEntryBuilder] = useState(false)
  const [showTpBuilder, setShowTpBuilder] = useState(false)
  const [showSlBuilder, setShowSlBuilder] = useState(false)

  const buildTechnicalCondition = (type: "entry" | "tp" | "sl", condition: string) => {
    setPlan((prev) => ({
      ...prev,
      [`${type}Condition`]: condition,
    }))
  }

  const savePlan = () => {
    // In real app, save to backend
    console.log("Saving plan:", plan)
    alert("交易计划已保存！")
    window.close()
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => window.close()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <h1 className="text-2xl font-bold">创建交易计划</h1>
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">计划名称</Label>
                <Input
                  id="name"
                  value={plan.name}
                  onChange={(e) => setPlan({ ...plan, name: e.target.value })}
                  placeholder="如：TSLA 突破买入计划"
                />
              </div>
              <div>
                <Label htmlFor="ticker">股票代码</Label>
                <Input
                  id="ticker"
                  value={plan.ticker}
                  onChange={(e) => setPlan({ ...plan, ticker: e.target.value })}
                  placeholder="如：TSLA"
                />
              </div>
              <div>
                <Label htmlFor="strategy">策略类型</Label>
                <Select value={plan.strategy} onValueChange={(value) => setPlan({ ...plan, strategy: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择策略类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="趋势突破">趋势突破</SelectItem>
                    <SelectItem value="均线策略">均线策略</SelectItem>
                    <SelectItem value="支撑阻力">支撑阻力</SelectItem>
                    <SelectItem value="价值投资">价值投资</SelectItem>
                    <SelectItem value="其他">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>交易参数</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="entry">入场价格</Label>
                <Input
                  id="entry"
                  type="number"
                  value={plan.entry}
                  onChange={(e) => setPlan({ ...plan, entry: e.target.value })}
                  placeholder="245.00"
                />
              </div>
              <div>
                <Label htmlFor="tp">目标价格</Label>
                <Input
                  id="tp"
                  type="number"
                  value={plan.tp}
                  onChange={(e) => setPlan({ ...plan, tp: e.target.value })}
                  placeholder="280.00"
                />
              </div>
              <div>
                <Label htmlFor="sl">止损价格</Label>
                <Input
                  id="sl"
                  type="number"
                  value={plan.sl}
                  onChange={(e) => setPlan({ ...plan, sl: e.target.value })}
                  placeholder="230.00"
                />
              </div>
              <div>
                <Label htmlFor="positionSize">仓位大小</Label>
                <Input
                  id="positionSize"
                  type="number"
                  value={plan.positionSize}
                  onChange={(e) => setPlan({ ...plan, positionSize: e.target.value })}
                  placeholder="1000"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>交易参数 (技术指标条件)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="entryCondition">入场条件</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEntryBuilder(!showEntryBuilder)}
                  >
                    技术指标
                  </Button>
                </div>
                <Input
                  id="entryCondition"
                  value={plan.entryCondition}
                  onChange={(e) => setPlan({ ...plan, entryCondition: e.target.value })}
                  placeholder="245.00 (固定价格) 或留空使用技术条件"
                />
                {showEntryBuilder && (
                  <Card className="mt-2 p-3">
                    <div className="space-y-3">
                      <Select onValueChange={(value) => buildTechnicalCondition("entry", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择入场技术条件" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="price 突破 EMA(55)">突破EMA55均线</SelectItem>
                          <SelectItem value="price 回踩 EMA(20) 且 RSI(14) &lt; 50">回踩EMA20且RSI&lt;50</SelectItem>
                          <SelectItem value="MACD金叉 且 成交量 &gt; 昨日1.5倍">MACD金叉且放量</SelectItem>
                          <SelectItem value="price &gt; SMA(20) 且 KDJ金叉">站上SMA20且KDJ金叉</SelectItem>
                          <SelectItem value="RSI(14) &lt; 30 且 price 接近 支撑位">RSI超卖且接近支撑</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </Card>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="tpCondition">止盈条件</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowTpBuilder(!showTpBuilder)}>
                    技术指标
                  </Button>
                </div>
                <Input
                  id="tpCondition"
                  value={plan.tpCondition}
                  onChange={(e) => setPlan({ ...plan, tpCondition: e.target.value })}
                  placeholder="280.00 (固定价格) 或留空使用技术条件"
                />
                {showTpBuilder && (
                  <Card className="mt-2 p-3">
                    <div className="space-y-3">
                      <Select onValueChange={(value) => buildTechnicalCondition("tp", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择止盈技术条件" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RSI(14) &gt; 70">RSI超买信号</SelectItem>
                          <SelectItem value="price 触及 布林带上轨">触及布林带上轨</SelectItem>
                          <SelectItem value="MACD死叉">MACD死叉信号</SelectItem>
                          <SelectItem value="成交量萎缩 且 price &lt; EMA(5)">量价背离信号</SelectItem>
                          <SelectItem value="price 达到 阻力位">到达关键阻力位</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </Card>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="slCondition">止损条件</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowSlBuilder(!showSlBuilder)}>
                    技术指标
                  </Button>
                </div>
                <Input
                  id="slCondition"
                  value={plan.slCondition}
                  onChange={(e) => setPlan({ ...plan, slCondition: e.target.value })}
                  placeholder="230.00 (固定价格) 或留空使用技术条件"
                />
                {showSlBuilder && (
                  <Card className="mt-2 p-3">
                    <div className="space-y-3">
                      <Select onValueChange={(value) => buildTechnicalCondition("sl", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择止损技术条件" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="price 跌破 EMA(55)">跌破EMA55均线</SelectItem>
                          <SelectItem value="price 跌破 支撑位">跌破关键支撑位</SelectItem>
                          <SelectItem value="RSI(14) &lt; 30 且 成交量放大">RSI超卖且恐慌性放量</SelectItem>
                          <SelectItem value="price &lt; SMA(20) 且 MACD死叉">跌破SMA20且MACD死叉</SelectItem>
                          <SelectItem value="连续3日收阴 且 成交量递增">连续收阴且放量下跌</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>交易理由</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={plan.reason}
                onChange={(e) => setPlan({ ...plan, reason: e.target.value })}
                placeholder="详细描述交易理由、技术分析、基本面分析等..."
                rows={6}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>风险管理</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="riskLevel">风险等级</Label>
                <Select value={plan.riskLevel} onValueChange={(value: any) => setPlan({ ...plan, riskLevel: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">低风险</SelectItem>
                    <SelectItem value="medium">中风险</SelectItem>
                    <SelectItem value="high">高风险</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>风险回报分析</CardTitle>
            </CardHeader>
            <CardContent>
              {plan.entry && plan.tp && plan.sl && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>风险回报比:</span>
                    <span className="font-semibold">
                      1:
                      {(
                        (Number.parseFloat(plan.tp) - Number.parseFloat(plan.entry)) /
                        (Number.parseFloat(plan.entry) - Number.parseFloat(plan.sl))
                      ).toFixed(2)}
                    </span>
                  </div>
                  {plan.positionSize && (
                    <>
                      <div className="flex justify-between">
                        <span>潜在盈利:</span>
                        <span className="font-semibold text-green-600">
                          +$
                          {(
                            (Number.parseFloat(plan.tp) - Number.parseFloat(plan.entry)) *
                            Number.parseFloat(plan.positionSize)
                          ).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>潜在亏损:</span>
                        <span className="font-semibold text-red-600">
                          -$
                          {(
                            (Number.parseFloat(plan.entry) - Number.parseFloat(plan.sl)) *
                            Number.parseFloat(plan.positionSize)
                          ).toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>技术条件总览</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">入场条件</h4>
                  <p className="text-green-700">
                    {plan.entryCondition || (plan.entry ? `固定价格: $${plan.entry}` : "未设置")}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">止盈条件</h4>
                  <p className="text-blue-700">{plan.tpCondition || (plan.tp ? `固定价格: $${plan.tp}` : "未设置")}</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <h4 className="font-medium text-red-800 mb-2">止损条件</h4>
                  <p className="text-red-700">{plan.slCondition || (plan.sl ? `固定价格: $${plan.sl}` : "未设置")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <Button variant="outline" onClick={() => window.close()}>
            取消
          </Button>
          <Button onClick={savePlan}>
            <Save className="w-4 h-4 mr-2" />
            保存计划
          </Button>
        </div>
      </div>
    </div>
  )
}
