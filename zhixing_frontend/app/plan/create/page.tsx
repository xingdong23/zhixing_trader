"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, Zap, ListChecks } from "lucide-react"
import { Label } from "@/components/ui/label"
import CreateTradingPlanWizard from "./page-wizard"

export default function CreateTradingPlanPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<"select" | "quick" | "wizard">("select")
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
    router.back()
  }

  // 如果选择了向导模式，显示向导组件
  if (mode === "wizard") {
    return <CreateTradingPlanWizard />
  }

  // 模式选择页面
  if (mode === "select") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <header className="border-b bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4">
          <div className="container mx-auto flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            <div>
              <h1 className="text-2xl font-bold">创建交易计划</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">选择适合你的创建方式</p>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-12">
          <div className="max-w-5xl mx-auto">
            {/* 标题和说明 */}
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                通过6个步骤搭建交易体系
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                告别盲目交易，迈向稳定盈利
              </p>
            </div>

            {/* 两种模式选择 */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* 6步向导模式 */}
              <Card
                className="cursor-pointer transition-all hover:shadow-2xl hover:scale-105 border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950"
                onClick={() => setMode("wizard")}
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <ListChecks className="w-12 h-12 text-blue-600" />
                    <div className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full">
                      推荐
                    </div>
                  </div>
                  <CardTitle className="text-2xl">6步向导式创建</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    系统化引导，搭建完整交易体系
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">1</div>
                      <span>分析趋势 - 准确判断市场方向</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">2</div>
                      <span>找关键位 - 识别支撑阻力位</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold">3</div>
                      <span>入场时机 - 等待有效突破</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold">4</div>
                      <span>制定计划 - 明确交易策略</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold">5</div>
                      <span>执行检查 - 强制风险控制</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xs font-bold">6</div>
                      <span>复盘总结 - 持续优化体系</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-start gap-2 text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950 p-3 rounded">
                      <span className="text-lg">✅</span>
                      <div>
                        <p className="font-medium mb-1">适合:</p>
                        <p className="text-xs">• 希望建立完整交易体系的交易者</p>
                        <p className="text-xs">• 重要的交易决策</p>
                        <p className="text-xs">• 需要详细记录和分析的场景</p>
                      </div>
                    </div>
                  </div>

                  <Button className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
                    开始6步向导
                  </Button>
                </CardContent>
              </Card>

              {/* 快速创建模式 */}
              <Card
                className="cursor-pointer transition-all hover:shadow-xl hover:scale-105"
                onClick={() => setMode("quick")}
              >
                <CardHeader>
                  <Zap className="w-12 h-12 text-yellow-600 mb-4" />
                  <CardTitle className="text-2xl">快速创建</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    简单表单，快速录入交易计划
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <p>• 简化的表单填写</p>
                    <p>• 只需填写核心参数</p>
                    <p>• 适合经验丰富的交易者</p>
                    <p>• 快速记录交易想法</p>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-start gap-2 text-sm text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-950 p-3 rounded">
                      <span className="text-lg">⚡</span>
                      <div>
                        <p className="font-medium mb-1">适合:</p>
                        <p className="text-xs">• 有成熟交易体系的交易者</p>
                        <p className="text-xs">• 快速记录交易机会</p>
                        <p className="text-xs">• 简单的交易想法记录</p>
                      </div>
                    </div>
                  </div>

                  <Button className="w-full" variant="outline" size="lg">
                    快速创建
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* 底部说明 */}
            <div className="mt-12 text-center">
              <Card className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 border-orange-200 dark:border-orange-800">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-2">💡 建议</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    如果你是第一次使用，或者想要建立系统化的交易体系，<strong>强烈推荐使用6步向导模式</strong>。
                    它会帮助你全面思考每一笔交易，避免情绪化决策。
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 快速创建模式（原有表单）
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setMode("select")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回选择
          </Button>
          <h1 className="text-2xl font-bold">快速创建交易计划</h1>
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
