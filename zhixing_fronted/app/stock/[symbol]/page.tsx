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
import UnifiedNoteDialog from "@/components/notes/UnifiedNoteDialog"
import TradingViewWidget from "@/components/stocks/TradingViewWidget"
import LightweightChart from "@/components/stocks/LightweightChart"
import TimelineNotes, { TimelineNote } from "@/components/stocks/TimelineNotes"
import AddTimelineNoteDialog from "@/components/stocks/AddTimelineNoteDialog"

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
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  
  // 时间线笔记状态
  const [timelineNotes, setTimelineNotes] = useState<TimelineNote[]>([
    {
      id: "1",
      author: "张三",
      content: "AAPL 目前处于上升通道，RSI 指标显示未超买，建议逢低买入。从技术面看，股价已突破 55 日均线，成交量放大，显示多头力量增强。",
      timestamp: "2025-01-15 14:30",
      judgmentType: "bullish",
      priceTarget: 195.00,
      currentPrice: 183.25,
      likes: 12,
      comments: [
        {
          id: "c1",
          author: "李四",
          content: "我不太同意，目前市场整体偏弱，科技股面临调整压力。",
          timestamp: "2025-01-15 15:20",
          likes: 5,
          replies: [
            {
              id: "c1-1",
              author: "张三",
              content: "确实有调整风险，但长期看好。可以分批建仓降低风险。",
              timestamp: "2025-01-15 16:10",
              likes: 3
            }
          ]
        }
      ]
    },
    {
      id: "2",
      author: "王五",
      content: "注意！AAPL 即将发布财报，历史上财报前后波动较大，建议控制仓位。",
      timestamp: "2025-01-18 10:15",
      judgmentType: "risk",
      likes: 8,
      comments: []
    },
    {
      id: "3",
      author: "赵六",
      content: "180 美元是重要支撑位，如果跌破需要重新评估。目前看多头趋势完好。",
      timestamp: "2025-01-20 09:00",
      judgmentType: "entry",
      priceTarget: 180.00,
      currentPrice: 183.25,
      likes: 15,
      comments: [
        {
          id: "c2",
          author: "钱七",
          content: "同意，180 是关键位置。我已经在 181 附近建仓了。",
          timestamp: "2025-01-20 10:30",
          likes: 2
        }
      ]
    }
  ])
  const [showAddNoteDialog, setShowAddNoteDialog] = useState(false)

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

  // 添加时间线笔记
  const handleAddTimelineNote = (note: {
    author: string
    content: string
    judgmentType: TimelineNote["judgmentType"]
    priceTarget?: number
    currentPrice?: number
  }) => {
    const newNote: TimelineNote = {
      id: Date.now().toString(),
      author: note.author,
      content: note.content,
      timestamp: new Date().toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }),
      judgmentType: note.judgmentType,
      priceTarget: note.priceTarget,
      currentPrice: note.currentPrice || stock?.price,
      likes: 0,
      comments: []
    }
    setTimelineNotes([newNote, ...timelineNotes])
  }

  // 添加评论
  const handleAddComment = (noteId: string, content: string, parentCommentId?: string) => {
    setTimelineNotes(notes => notes.map(note => {
      if (note.id !== noteId) return note

      const newComment = {
        id: Date.now().toString(),
        author: "我",
        content,
        timestamp: new Date().toLocaleString("zh-CN", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        }),
        likes: 0
      }

      if (!parentCommentId) {
        // 顶级评论
        return {
          ...note,
          comments: [...note.comments, newComment]
        }
      } else {
        // 回复评论
        const addReply = (comments: typeof note.comments): typeof note.comments => {
          return comments.map(comment => {
            if (comment.id === parentCommentId) {
              return {
                ...comment,
                replies: [...(comment.replies || []), newComment]
              }
            }
            if (comment.replies) {
              return {
                ...comment,
                replies: addReply(comment.replies)
              }
            }
            return comment
          })
        }
        return {
          ...note,
          comments: addReply(note.comments)
        }
      }
    }))
  }

  // 点赞
  const handleLike = (noteId: string, commentId?: string) => {
    setTimelineNotes(notes => notes.map(note => {
      if (note.id !== noteId) return note

      if (!commentId) {
        // 点赞笔记
        return { ...note, likes: note.likes + 1 }
      } else {
        // 点赞评论
        const updateLikes = (comments: typeof note.comments): typeof note.comments => {
          return comments.map(comment => {
            if (comment.id === commentId) {
              return { ...comment, likes: comment.likes + 1 }
            }
            if (comment.replies) {
              return {
                ...comment,
                replies: updateLikes(comment.replies)
              }
            }
            return comment
          })
        }
        return {
          ...note,
          comments: updateLikes(note.comments)
        }
      }
    }))
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

            {/* Timeline Notes - 投资笔记时间线 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>投资笔记时间线</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    记录你的投资判断和分析，与其他投资者讨论
                  </p>
                </div>
                <Button onClick={() => setShowAddNoteDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  添加笔记
                </Button>
              </CardHeader>
              <CardContent>
                <TimelineNotes
                  notes={timelineNotes}
                  onAddComment={handleAddComment}
                  onLike={handleLike}
                />
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
          <UnifiedNoteDialog
            open={noteDialogOpen}
            onClose={() => setNoteDialogOpen(false)}
            preset={{ symbol: stock.ticker, symbolName: stock.name, relatedType: 'stock' }}
            locks={{ symbol: true }}
            onSave={(data) => {
              // 保存到页面的情报列表（Mock）
              const newItem: IntelNote = {
                id: Date.now().toString(),
                author: '我',
                text: data.content,
                timestamp: new Date().toLocaleString('zh-CN'),
                triggered: false,
                type: 'text'
              }
              setStock((prev) => prev ? { ...prev, intelNotes: [newItem, ...prev.intelNotes] } : prev)
            }}
          />

          {/* 添加时间线笔记对话框 */}
          <AddTimelineNoteDialog
            open={showAddNoteDialog}
            onClose={() => setShowAddNoteDialog(false)}
            onSave={handleAddTimelineNote}
            currentPrice={stock.price}
          />
        </div>
      </div>
    </div>
  )
}

