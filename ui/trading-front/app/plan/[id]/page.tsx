"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus, TrendingUp, AlertTriangle, Target, DollarSign, BarChart3 } from "lucide-react"
import { Label } from "@/components/ui/label"

interface TradingPlanNote {
  id: string
  user: string
  text: string
  date: string
  type: "comment" | "execution" | "analysis" | "risk"
}

interface TradingPlan {
  id: string
  name: string
  ticker: string
  entry: number
  tp: number
  sl: number
  status: "等待入场" | "已入场" | "已完成"
  reason: string
  strategy: string
  riskLevel: "low" | "medium" | "high"
  positionSize: number
  notes: TradingPlanNote[]
  createdAt: string
  updatedAt: string
}

export default function TradingPlanDetailPage() {
  const params = useParams()
  const planId = params.id as string

  const [plan, setPlan] = useState<TradingPlan | null>(null)
  const [newNote, setNewNote] = useState({
    text: "",
    type: "comment" as const,
  })

  // Mock data - in real app, fetch from API
  useEffect(() => {
    const mockPlan: TradingPlan = {
      id: planId,
      name: "TSLA 突破买入计划",
      ticker: "TSLA",
      entry: 245.0,
      tp: 280.0,
      sl: 230.0,
      status: "等待入场",
      reason: "技术面突破关键阻力位，基本面电动车销量增长强劲，适合中线持有",
      strategy: "趋势突破",
      riskLevel: "medium",
      positionSize: 1000,
      createdAt: "2024-01-15 10:30",
      updatedAt: "2024-01-15 14:20",
      notes: [
        {
          id: "1",
          user: "自己",
          text: "计划创建，等待价格突破260阻力位后入场",
          date: "2024-01-15 10:30",
          type: "comment",
        },
        {
          id: "2",
          user: "系统",
          text: "风险提醒：当前RSI已达70，注意超买风险",
          date: "2024-01-15 14:20",
          type: "risk",
        },
      ],
    }
    setPlan(mockPlan)
  }, [planId])

  const addNote = () => {
    if (!plan || !newNote.text.trim()) return

    const note: TradingPlanNote = {
      id: Date.now().toString(),
      user: "自己",
      text: newNote.text,
      date: new Date().toLocaleString("zh-CN"),
      type: newNote.type,
    }

    setPlan({
      ...plan,
      notes: [...plan.notes, note],
      updatedAt: new Date().toLocaleString("zh-CN"),
    })

    setNewNote({ text: "", type: "comment" })
  }

  const updatePlanStatus = (newStatus: TradingPlan["status"]) => {
    if (!plan) return

    const statusNote: TradingPlanNote = {
      id: Date.now().toString(),
      user: "系统",
      text: `计划状态更新: ${plan.status} → ${newStatus}`,
      date: new Date().toLocaleString("zh-CN"),
      type: "execution",
    }

    setPlan({
      ...plan,
      status: newStatus,
      notes: [...plan.notes, statusNote],
      updatedAt: new Date().toLocaleString("zh-CN"),
    })
  }

  if (!plan) {
    return <div className="p-8">加载中...</div>
  }

  const riskRewardRatio = plan.tp && plan.sl ? ((plan.tp - plan.entry) / (plan.entry - plan.sl)).toFixed(2) : "N/A"
  const potentialProfit = ((plan.tp - plan.entry) * plan.positionSize).toFixed(2)
  const potentialLoss = ((plan.entry - plan.sl) * plan.positionSize).toFixed(2)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => window.close()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{plan.name}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{plan.ticker}</span>
                <Badge
                  variant={plan.status === "等待入场" ? "secondary" : plan.status === "已入场" ? "default" : "outline"}
                >
                  {plan.status}
                </Badge>
                <span>策略: {plan.strategy}</span>
                <span>创建: {plan.createdAt}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const newStatus =
                  plan.status === "等待入场" ? "已入场" : plan.status === "已入场" ? "已完成" : "等待入场"
                updatePlanStatus(newStatus)
              }}
            >
              {plan.status === "等待入场" ? "标记入场" : plan.status === "已入场" ? "标记完成" : "重新激活"}
            </Button>
            <Button>编辑计划</Button>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="xl:col-span-2 space-y-6">
            {/* Trading Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    交易参数
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-muted rounded">
                        <div className="text-sm text-muted-foreground">入场价</div>
                        <div className="text-lg font-bold">${plan.entry}</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded">
                        <div className="text-sm text-muted-foreground">目标价</div>
                        <div className="text-lg font-bold text-green-600">${plan.tp}</div>
                      </div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded">
                      <div className="text-sm text-muted-foreground">止损价</div>
                      <div className="text-lg font-bold text-red-600">${plan.sl}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    风险分析
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">风险回报比</span>
                      <span className="font-semibold">1:{riskRewardRatio}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">仓位大小</span>
                      <span className="font-semibold">{plan.positionSize} 股</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">潜在盈利</span>
                      <span className="font-semibold text-green-600">+${potentialProfit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">潜在亏损</span>
                      <span className="font-semibold text-red-600">-${potentialLoss}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">风险等级</span>
                      <Badge
                        variant={
                          plan.riskLevel === "low"
                            ? "secondary"
                            : plan.riskLevel === "medium"
                              ? "default"
                              : "destructive"
                        }
                      >
                        {plan.riskLevel === "low" ? "低风险" : plan.riskLevel === "medium" ? "中风险" : "高风险"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Trading Reason */}
            <Card>
              <CardHeader>
                <CardTitle>交易理由</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{plan.reason}</p>
              </CardContent>
            </Card>

            {/* Notes and Timeline */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>交易笔记与时间线</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      添加笔记
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>添加交易笔记</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="noteType">笔记类型</Label>
                        <Select
                          value={newNote.type}
                          onValueChange={(value: any) => setNewNote({ ...newNote, type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="comment">一般评论</SelectItem>
                            <SelectItem value="analysis">技术分析</SelectItem>
                            <SelectItem value="execution">执行记录</SelectItem>
                            <SelectItem value="risk">风险提醒</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="noteText">笔记内容</Label>
                        <Textarea
                          id="noteText"
                          value={newNote.text}
                          onChange={(e) => setNewNote({ ...newNote, text: e.target.value })}
                          placeholder="记录交易想法、市场观察、执行情况等..."
                          rows={4}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <DialogTrigger asChild>
                          <Button variant="outline">取消</Button>
                        </DialogTrigger>
                        <Button onClick={addNote}>添加笔记</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {plan.notes.map((note) => (
                    <div
                      key={note.id}
                      className={`p-4 rounded-lg border-l-4 ${
                        note.type === "risk"
                          ? "border-l-red-500 bg-red-50"
                          : note.type === "execution"
                            ? "border-l-blue-500 bg-blue-50"
                            : note.type === "analysis"
                              ? "border-l-green-500 bg-green-50"
                              : "border-l-gray-500 bg-muted"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{note.user}</span>
                          <Badge variant="outline" className="text-xs">
                            {note.type === "comment"
                              ? "评论"
                              : note.type === "analysis"
                                ? "分析"
                                : note.type === "execution"
                                  ? "执行"
                                  : "风险"}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{note.date}</span>
                      </div>
                      <p className="text-sm">{note.text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>计划概览</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">股票代码</span>
                  <span className="font-semibold">{plan.ticker}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">策略类型</span>
                  <span className="font-semibold">{plan.strategy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">最后更新</span>
                  <span className="font-semibold text-sm">{plan.updatedAt}</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>快速操作</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full bg-transparent" variant="outline">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  查看股票详情
                </Button>
                <Button className="w-full bg-transparent" variant="outline">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  设置提醒
                </Button>
                <Button className="w-full bg-transparent" variant="outline">
                  <DollarSign className="w-4 h-4 mr-2" />
                  模拟交易
                </Button>
                <Button className="w-full bg-transparent" variant="outline">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  风险分析
                </Button>
              </CardContent>
            </Card>

            {/* Risk Warning */}
            {plan.riskLevel === "high" && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    风险提醒
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-red-600">此交易计划为高风险等级，请谨慎操作，严格执行止损策略。</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
