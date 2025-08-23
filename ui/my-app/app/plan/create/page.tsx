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
    tp: "",
    sl: "",
    strategy: "",
    riskLevel: "medium" as const,
    positionSize: "",
    reason: searchParams.get("note")
      ? `基于${searchParams.get("author")}的观点: ${decodeURIComponent(searchParams.get("note") || "")}`
      : "",
  })

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
