"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, ArrowLeft, Bell, Calendar, TrendingUp, Upload } from "lucide-react"
import { Label } from "@/components/ui/label"
import TradingViewWidget from "@/components/stocks/TradingViewWidget"
import LightweightChart from "@/components/stocks/LightweightChart"

interface IntelNote {
  id: string
  author: string
  text: string
  timestamp: string
  alertExpression?: string
  triggered: boolean
  image?: string
  type: "text" | "image" | "chart" | "analysis"
}

interface StockData {
  ticker: string
  name: string
  price: number
  change: number
  change_percent: number
  volume: string
  market: string
  concepts: string[]
  rsi?: number
  ema55?: number
  intelNotes: IntelNote[]
}

export default function StockDetailPage() {
  const params = useParams()
  const router = useRouter()
  const symbol = params.symbol as string

  const [stock, setStock] = useState<StockData | null>(null)
  const [newNote, setNewNote] = useState<{
    author: string
    text: string
    alertExpression: string
    type: IntelNote["type"]
    image: string
  }>({
    author: "",
    text: "",
    alertExpression: "",
    type: "text",
    image: "",
  })

  // 从API获取股票数据（Mock优先）
  useEffect(() => {
    const USE_MOCK = true

    const buildMock = (): StockData => ({
      ticker: symbol.toUpperCase(),
      name: symbol.toUpperCase() === 'AAPL' ? '苹果公司' : symbol.toUpperCase(),
      price: 180 + Math.random() * 10,
      change: (Math.random() - 0.5) * 5,
      change_percent: (Math.random() - 0.5) * 2,
      volume: `${(Math.random() * 100 + 10).toFixed(1)}M`,
      market: 'NASDAQ',
      concepts: ['科技股', '人工智能'],
      rsi: 45 + Math.random() * 20,
      ema55: 140 + Math.random() * 50,
      intelNotes: [
        {
          id: 'demo',
          author: '演示数据',
          text: `Mock数据：${symbol.toUpperCase()} 当前演示价格与指标。`,
          timestamp: new Date().toLocaleString('zh-CN'),
          triggered: false,
          type: 'text',
        },
      ],
    })

    const load = async () => {
      if (USE_MOCK) {
        setStock(buildMock())
        return
      }

      try {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
        const stockResponse = await fetch(`${base}/api/v1/market-data/info/${symbol}`)
        const stockResult = await stockResponse.json()
        if (stockResult.success && stockResult.data) {
          const s = stockResult.data
          setStock({
            ticker: symbol.toUpperCase(),
            name: s.name || symbol.toUpperCase(),
            price: parseFloat(s.price) || 0,
            change: parseFloat(s.change) || 0,
            change_percent: parseFloat(s.change_percent) || 0,
            volume: s.volume || '0',
            market: s.market || '未知',
            concepts: s.concepts || [],
            rsi: s.rsi,
            ema55: s.ema55,
            intelNotes: [],
          })
        } else {
          setStock(buildMock())
        }
      } catch {
        setStock(buildMock())
      }
    }

    load()
  }, [symbol])

  const addIntelNote = () => {
    if (!stock || !newNote.text.trim()) return

    const note: IntelNote = {
      id: Date.now().toString(),
      author: newNote.author || "匿名",
      text: newNote.text,
      timestamp: new Date().toLocaleString("zh-CN"),
      alertExpression: newNote.alertExpression || undefined,
      triggered: false,
      type: newNote.type,
      image: newNote.image || undefined,
    }

    setStock({
      ...stock,
      intelNotes: [...stock.intelNotes, note],
    })

    setNewNote({
      author: "",
      text: "",
      alertExpression: "",
      type: "text",
      image: "",
    })
  }

  const createTradingPlan = (note: IntelNote) => {
    // Open trading plan creation with pre-filled data
    window.open(
      `/plan/create?ticker=${stock?.ticker}&note=${encodeURIComponent(note.text)}&author=${note.author}`,
      "_blank",
    )
  }

  if (!stock) {
    return <div className="p-8">加载中...</div>
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {stock.name} ({stock.ticker})
            </h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                现价: <span className="font-semibold text-foreground">${stock.price}</span>
              </span>
              <span className={`font-semibold ${stock.change_percent >= 0 ? "text-green-600" : "text-red-600"}`}>
                {stock.change_percent >= 0 ? "+" : ""}
                {stock.change_percent.toFixed(2)}%
              </span>
              <span>成交量: {stock.volume}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="xl:col-span-3 space-y-6">
            {/* 图表（优先使用本地 LightweightCharts；如需TV可再切换）*/}
            <div className="rounded-lg border overflow-hidden" style={{height: 560}}>
              <LightweightChart
                candles={Array.from({length: 120}).map((_, i) => {
                  // 生成简单Mock K线数据
                  const base = 150
                  const time = Math.floor(Date.now() / 1000) - (120 - i) * 86400
                  const open = base + Math.sin(i / 10) * 5 + (Math.random() - 0.5) * 2
                  const close = open + (Math.random() - 0.5) * 4
                  const high = Math.max(open, close) + Math.random() * 3
                  const low = Math.min(open, close) - Math.random() * 3
                  return { time, open, high, low, close }
                })}
                height={560}
              />
            </div>

            {/* Intelligence Notes */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>大佬观点与情报</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      添加笔记
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>添加笔记</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="author">作者/来源</Label>
                          <Input
                            id="author"
                            value={newNote.author}
                            onChange={(e) => setNewNote({ ...newNote, author: e.target.value })}
                            placeholder="如：巴菲特、雪球大V等"
                          />
                        </div>
                        <div>
                          <Label htmlFor="type">类型</Label>
                          <Select
                            value={newNote.type}
                            onValueChange={(value: any) => setNewNote({ ...newNote, type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">文字观点</SelectItem>
                              <SelectItem value="image">截图分析</SelectItem>
                              <SelectItem value="chart">K线分析</SelectItem>
                              <SelectItem value="analysis">技术分析</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="content">观点内容</Label>
                        <Textarea
                          id="content"
                          value={newNote.text}
                          onChange={(e) => setNewNote({ ...newNote, text: e.target.value })}
                          placeholder="输入大佬的观点、分析或建议..."
                          rows={4}
                        />
                      </div>

                      {(newNote.type === "image" || newNote.type === "chart") && (
                        <div>
                          <Label htmlFor="image">上传图片</Label>
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">点击上传或拖拽图片到此处</p>
                            <Input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                // Handle file upload
                                const file = e.target.files?.[0]
                                if (file) {
                                  // In real app, upload to server and get URL
                                  setNewNote({ ...newNote, image: "/tsla-technical-analysis.png" })
                                }
                              }}
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <Label htmlFor="alert">提醒条件 (可选)</Label>
                        <Input
                          id="alert"
                          value={newNote.alertExpression}
                          onChange={(e) => setNewNote({ ...newNote, alertExpression: e.target.value })}
                          placeholder="如: price <= 240 AND RSI(14) < 30"
                        />
                        <p className="text-xs text-muted-foreground mt-1">支持复杂表达式：价格、技术指标、成交量等</p>
                      </div>

                      <div className="flex justify-end gap-2">
                        <DialogTrigger asChild>
                          <Button variant="outline">取消</Button>
                        </DialogTrigger>
                        <Button onClick={addIntelNote}>保存笔记</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stock.intelNotes.map((note) => (
                    <Card key={note.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{note.author}</Badge>
                            <Badge variant={note.type === "text" ? "secondary" : "default"}>
                              {note.type === "text"
                                ? "文字"
                                : note.type === "image"
                                  ? "截图"
                                  : note.type === "chart"
                                    ? "K线"
                                    : "分析"}
                            </Badge>
                            {note.triggered && <Badge variant="destructive">已触发</Badge>}
                          </div>
                          <span className="text-sm text-muted-foreground">{note.timestamp}</span>
                        </div>

                        <p className="mb-3">{note.text}</p>

                        {note.image && (
                          <div className="mb-3">
                            <img
                              src={note.image || "/placeholder.svg"}
                              alt="分析图片"
                              className="rounded-lg max-w-full h-auto border"
                            />
                          </div>
                        )}

                        {note.alertExpression && (
                          <div className="bg-muted p-3 rounded mb-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Bell className="w-4 h-4" />
                              <span className="font-medium text-sm">提醒条件</span>
                            </div>
                            <code className="text-sm">{note.alertExpression}</code>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => createTradingPlan(note)}>
                            <Calendar className="w-4 h-4 mr-1" />
                            创建交易计划
                          </Button>
                          <Button size="sm" variant="outline">
                            <Bell className="w-4 h-4 mr-1" />
                            设置提醒
                          </Button>
                          <Button size="sm" variant="outline">
                            <TrendingUp className="w-4 h-4 mr-1" />
                            技术分析
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Key Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>关键指标</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">现价</span>
                    <span className="font-semibold">${stock.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">涨跌幅</span>
                    <span className={`font-semibold ${stock.change_percent >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {stock.change_percent >= 0 ? "+" : ""}
                      {stock.change_percent.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">成交量</span>
                    <span className="font-semibold">{stock.volume}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">RSI(14)</span>
                    <span className="font-semibold">{stock.rsi ? stock.rsi.toFixed(1) : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">EMA(55)</span>
                    <span className="font-semibold">{stock.ema55 ? `$${stock.ema55.toFixed(2)}` : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">市场</span>
                    <span className="font-semibold">{stock.market}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Concepts & Tags */}
            {stock.concepts && stock.concepts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>概念标签</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {stock.concepts.map((concept, index) => (
                      <Badge key={index} variant="secondary">
                        {concept}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>快速操作</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full bg-transparent" variant="outline">
                  <Calendar className="w-4 h-4 mr-2" />
                  创建交易计划
                </Button>
                <Button className="w-full bg-transparent" variant="outline">
                  <Bell className="w-4 h-4 mr-2" />
                  设置价格提醒
                </Button>
                <Button className="w-full bg-transparent" variant="outline">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  技术分析
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
