"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  LayoutDashboard,
  ClipboardList,
  ClipboardCheck,
  Target,
  HeartPulse,
  BarChart3,
  Search,
  Bell,
  Settings,
  Upload,
  Plus,
  AlertTriangle,
  BellRing,
  TrendingUp,
  Brain,
  BookOpen,
  PenTool,
  FileText,
  Activity,
  CheckCircle,
  Clock,
  ArrowLeft,
  DollarSign,
  Users,
  Bot,
  MessageSquare,
  Heart,
  MessageCircle,
  Zap,
  Filter,
  MoreHorizontal,
  ThumbsUp,
  Tag,
  X,
  Camera,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Calendar,
  Eye,
  Play,
  Pause,
  Shield,
  XCircle,
} from "lucide-react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface StockData {
  ticker: string
  name: string
  price: number
  change: number
  volume: string
  rules: string[]
  concepts: {
    industry: string[]
    fundamentals: string[]
    custom: string[]
  }
  intelNotes: IntelNote[]
}

interface IntelNote {
  text: string
  image?: string
  alertPrice?: number
  alertExpression?: string
  triggered: boolean
  author?: string
  timestamp: string
  content?: string
}

interface TradingPlan {
  id: number
  ticker: string
  name: string
  type: string
  status: string
  entry: number
  tp: number
  sl: number
  date: string
  reason: string
  notes: PlanNote[]
}

interface PlanNote {
  user: string
  text: string
  date: string
  type: "comment" | "opinion"
}

interface Strategy {
  id: string
  name: string
  type: string
  description: string
  script: string
  notes: { text: string; date: string }[]
  cases: { name: string; description: string; date: string }[]  // 修改为对象数组，支持更详细信息
  applications: { text: string; date: string }[]
  rules: string[]
  performance?: { winRate: number; avgReturn: number; maxDrawdown: number }
  patterns?: { id: string; name: string; description: string; imageUrl: string; uploadDate: string }[]  // 新增K线图片模式
}

interface StrategyResult {
  strategyId: string
  strategyName: string
  selectedStocks: StockData[]
  executionTime: string
  confidence: number
  summary: string
}

interface Notification {
  id: string
  type: 'stock_selection' | 'price_alert' | 'trading_plan' | 'strategy' | 'system'
  title: string
  content: string
  timestamp: string
  read: boolean
  actionable: boolean
  actionUrl?: string
  actionText?: string
  data?: any
}

interface TodoItem {
  id: string
  type: 'review_selection' | 'confirm_alert' | 'execute_plan' | 'review_strategy'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  dueDate?: string
  completed: boolean
  actionUrl: string
  data?: any
}

export default function TradingSystem() {
  const router = useRouter()
  // 导入自选股（富途 CSV）相关
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string>("")
  const [backendStocks, setBackendStocks] = useState<{ symbol: string; name: string; market?: string; group_name?: string; concepts?: string[]; updated_at?: string; price?: number | null; change_percent?: number | null }[]>([])
  // 分页控制（每页固定20条）
  const [page, setPage] = useState<number>(1)
  const pageSize = 20
  const [total, setTotal] = useState<number>(0)
  const [watchlist, setWatchlist] = useState<{ symbol: string; name: string; market?: string; group_name?: string; updated_at?: string }[]>([])
  const [showWatchlistPanel, setShowWatchlistPanel] = useState(false)
  const [watchlistLoading, setWatchlistLoading] = useState(false)

  const triggerPickCsv = () => fileInputRef.current?.click()

  

  function parseCSV(text: string): string[][] {
    const rows: string[][] = []
    let i = 0, field = '', row: string[] = [], inQuotes = false
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
    while (i < text.length) {
      const ch = text[i]
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue }
          inQuotes = false; i++; continue
        }
        field += ch; i++; continue
      } else {
        if (ch === '"') { inQuotes = true; i++; continue }
        if (ch === ',') { row.push(field.trim()); field = ''; i++; continue }
        if (ch === '\n') { row.push(field.trim()); rows.push(row); row = []; field = ''; i++; continue }
        if (ch === '\r') { if (text[i+1] === '\n') { row.push(field.trim()); rows.push(row); row=[]; field=''; i+=2; continue } else { row.push(field.trim()); rows.push(row); row=[]; field=''; i++; continue } }
        field += ch; i++
      }
    }
    if (field.length > 0 || row.length > 0) { row.push(field.trim()); rows.push(row) }
    return rows.filter(r => r.some(c => c && c.length > 0))
  }

  function futuCsvToStocks(rows: string[][]): Array<Record<string, string>> {
    if (!rows.length) return []
    const header = rows[0].map(h => h.trim())
    const data = rows.slice(1)
    const findIdx = (cands: string[]) => header.findIndex(h => cands.some(c => h.toLowerCase() === c.toLowerCase()))
    const idxCode = findIdx(['代码','symbol','股票代码','ticker','证券代码'])
    const idxName = findIdx(['名称','name','股票名称','security name'])
    const idxMarket = findIdx(['市场','market','交易所'])
    const idxGroup = findIdx(['分组','分组名称','行业','所属行业','板块','板块名称','group','group_name','industry','sector'])
    return data.map(r => {
      const code = (idxCode >= 0 ? r[idxCode] : '').toUpperCase()
      const name = idxName >= 0 ? r[idxName] : ''
      const market = idxMarket >= 0 ? r[idxMarket] : ''
      const group = idxGroup >= 0 ? r[idxGroup] : ''
      const item: Record<string, string> = { code, name }
      if (market) item.market = market
      if (group) item.group_name = group
      return item
    }).filter(it => it.code && it.name)
  }

  async function readFileSmart(file: File): Promise<string> {
    const buf = await file.arrayBuffer()
    let text = new TextDecoder('utf-8').decode(new Uint8Array(buf))
    if (text.includes('\uFFFD')) {
      try { text = new TextDecoder('gbk').decode(new Uint8Array(buf)) } catch {}
    }
    return text
  }

  async function handleCsvPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setImporting(true)
      setImportMsg('')
      const text = await readFileSmart(file)
      const rows = parseCSV(text)
      const stocks = futuCsvToStocks(rows)
      if (!stocks.length) throw new Error('解析失败：未识别到有效的股票数据（请确认是富途导出的自选股 CSV）')
      const base = process.env.NEXT_PUBLIC_API_BASE_URL || ''
      const res = await fetch(`${base}/api/v1/stocks/import`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stocks }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { throw new Error(String((data && (data.detail || data.message)) || `HTTP ${res.status}`)) }
      const msg = data?.message || '导入成功'
      const info = data?.data ? `（新增 ${data.data.added_count || 0}，更新 ${data.data.updated_count || 0}）` : ''
      setImportMsg(`${msg}${info}`)
      // 导入成功后刷新后台列表
      await fetchBackendStocks()
      await fetchWatchlistAndShow()
      
    } catch (err: any) {
      setImportMsg(`导入失败：${err?.message || err}`)
    } finally {
      setImporting(false)
      // 清空以便重复选择同一文件
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }
  
  async function fetchWatchlistAndShow() {
    try {
      setWatchlistLoading(true)
      const base = process.env.NEXT_PUBLIC_API_BASE_URL || ''
      const res = await fetch(`${base}/api/v1/stocks/?page=1&page_size=200`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(String(data?.detail || data?.message || `HTTP ${res.status}`))
      const items = (data?.data?.stocks || []) as any[]
      setWatchlist(items.map(it => ({
        symbol: it.symbol,
        name: it.name,
        market: it.market,
        group_name: it.group_name,
        updated_at: it.updated_at,
      })))
      setShowWatchlistPanel(true)
    } catch (err) {
      console.error('fetch watchlist error', err)
    } finally {
      setWatchlistLoading(false)
    }
  }

  async function fetchBackendStocks() {
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL || ''
      // 单接口返回当前页全部展示信息（分页20条）
      let url = `${base}/api/v1/stocks/overview?page=${page}&page_size=${pageSize}`
      if (selectedConcept) {
        url += `&concept_name=${encodeURIComponent(selectedConcept)}`
      }
      const res = await fetch(url)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(String(data?.detail || data?.message || `HTTP ${res.status}`))
      const items = (data?.data?.stocks || []) as any[]
      setBackendStocks(items.map(it => ({
        symbol: it.symbol,
        name: it.name,
        market: it.market,
        group_name: it.group_name,
        concepts: it.concepts || [],
        updated_at: it.updated_at,
        price: it.price,
        change_percent: it.change_percent,
      })))
      setTotal(Number(data?.data?.total || 0))
    } catch (err) {
      console.error('fetch backend stocks error', err)
    }
  }
  useEffect(() => { fetchBackendStocks() }, [page])
  // 通知中心组件
  const NotificationCenter = () => {
    const [activeTab, setActiveTab] = useState<'notifications' | 'todos'>('notifications')

    const getNotificationIcon = (type: Notification['type']) => {
      switch (type) {
        case 'stock_selection': return <TrendingUp className="w-4 h-4" />
        case 'price_alert': return <AlertCircle className="w-4 h-4" />
        case 'trading_plan': return <Calendar className="w-4 h-4" />
        case 'strategy': return <Brain className="w-4 h-4" />
        case 'system': return <Settings className="w-4 h-4" />
        default: return <Bell className="w-4 h-4" />
      }
    }

    const getTodoIcon = (type: TodoItem['type']) => {
      switch (type) {
        case 'review_selection': return <Eye className="w-4 h-4" />
        case 'confirm_alert': return <AlertTriangle className="w-4 h-4" />
        case 'execute_plan': return <Activity className="w-4 h-4" />
        case 'review_strategy': return <FileText className="w-4 h-4" />
        default: return <CheckCircle className="w-4 h-4" />
      }
    }

    const getPriorityColor = (priority: TodoItem['priority']) => {
      switch (priority) {
        case 'high': return 'text-red-600'
        case 'medium': return 'text-yellow-600'
        case 'low': return 'text-green-600'
        default: return 'text-gray-600'
      }
    }

    const handleNotificationClick = (notification: Notification) => {
      markNotificationAsRead(notification.id)
      setShowNotificationPanel(false)
      
      if (notification.actionUrl === '#selection' && notification.data) {
        setDetailView({ type: 'selection', data: notification.data })
      }
    }

    const handleTodoClick = (todo: TodoItem) => {
      markTodoAsCompleted(todo.id)
      setShowNotificationPanel(false)
      
      if (todo.actionUrl === '#selection' && todo.data) {
        setDetailView({ type: 'selection', data: todo.data })
      }
    }

    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowNotificationPanel(!showNotificationPanel)}
          className="relative"
        >
          <Bell className="w-5 h-5" />
          {totalUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </span>
          )}
        </Button>

        {showNotificationPanel && (
          <div className="absolute right-0 top-10 w-96 bg-card border rounded-lg shadow-lg z-50">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">通知中心</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotificationPanel(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex border-b">
              <Button
                variant={activeTab === 'notifications' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1 rounded-none"
                onClick={() => setActiveTab('notifications')}
              >
                通知
                {unreadNotificationsCount > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2">
                    {unreadNotificationsCount}
                  </span>
                )}
              </Button>
              <Button
                variant={activeTab === 'todos' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1 rounded-none"
                onClick={() => setActiveTab('todos')}
              >
                待办
                {pendingTodosCount > 0 && (
                  <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2">
                    {pendingTodosCount}
                  </span>
                )}
              </Button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {activeTab === 'notifications' ? (
                <div className="p-2">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>暂无通知</p>
                    </div>
                  ) : (
                    <>
                      {unreadNotificationsCount > 0 && (
                        <div className="flex justify-end mb-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={markAllNotificationsAsRead}
                            className="text-xs"
                          >
                            全部标记为已读
                          </Button>
                        </div>
                      )}
                      {notifications.slice(0, 3).map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 mb-2 rounded-lg border cursor-pointer transition-colors ${
                            notification.read 
                              ? 'bg-muted/50 border-muted' 
                              : 'bg-background border-primary/20 hover:bg-primary/5'
                          }`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-1 ${
                              notification.read ? 'text-muted-foreground' : 'text-primary'
                            }`}>
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`font-medium text-sm ${
                                notification.read ? 'text-muted-foreground' : 'text-foreground'
                              }`}>
                                {notification.title}
                              </div>
                              <div className={`text-xs mt-1 ${
                                notification.read ? 'text-muted-foreground' : 'text-muted-foreground'
                              }`}>
                                {notification.content}
                              </div>
                              <div className="text-xs text-muted-foreground mt-2">
                                {notification.timestamp}
                              </div>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                            )}
                          </div>
                        </div>
                      ))}
                      {notifications.length > 3 && (
                        <div className="text-center py-2 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowNotificationPanel(false)
                              router.push('/notifications')
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            查看全部 ({notifications.length}) 条通知
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="p-2">
                  {todos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>暂无待办事项</p>
                    </div>
                  ) : (
                    <>
                      {pendingTodosCount > 0 && (
                        <div className="flex justify-end mb-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearCompletedTodos}
                            className="text-xs"
                          >
                            清除已完成
                          </Button>
                        </div>
                      )}
                      {todos.map((todo) => (
                        <div
                          key={todo.id}
                          className={`p-3 mb-2 rounded-lg border cursor-pointer transition-colors ${
                            todo.completed 
                              ? 'bg-muted/50 border-muted opacity-60' 
                              : 'bg-background border-blue-200 hover:bg-blue-50'
                          }`}
                          onClick={() => handleTodoClick(todo)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-1 ${
                              todo.completed ? 'text-muted-foreground' : 'text-blue-600'
                            }`}>
                              {todo.completed ? <CheckCircle2 className="w-4 h-4" /> : getTodoIcon(todo.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`font-medium text-sm flex items-center gap-2 ${
                                todo.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                              }`}>
                                {todo.title}
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  getPriorityColor(todo.priority)
                                } bg-current bg-opacity-10`}>
                                  {todo.priority === 'high' ? '高' : todo.priority === 'medium' ? '中' : '低'}
                                </span>
                              </div>
                              <div className={`text-xs mt-1 ${
                                todo.completed ? 'text-muted-foreground' : 'text-muted-foreground'
                              }`}>
                                {todo.description}
                              </div>
                              {todo.dueDate && (
                                <div className="text-xs text-orange-600 mt-2">
                                  截止时间: {todo.dueDate}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }
  const [currentPage, setCurrentPage] = useState("dashboard")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("stockPool")
  const [activeFilterTags, setActiveFilterTags] = useState<string[]>([])
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null)
  
  // 当选中概念变化时，重置页码并重新获取数据
  useEffect(() => { 
    if (selectedConcept !== null) { // 只有当概念真正变化时才执行
      setPage(1) // 重置页码
    }
    fetchBackendStocks() 
  }, [selectedConcept])
  
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<TradingPlan | null>(null)
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null)
  const [activeStrategyResult, setActiveStrategyResult] = useState<StrategyResult | null>(null)
  const [showIntelForm, setShowIntelForm] = useState(false)
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [showAlertForm, setShowAlertForm] = useState(false)
  const [planFilter, setPlanFilter] = useState("all")
  const [showTagEditor, setShowTagEditor] = useState(false)
  const [editingStock, setEditingStock] = useState<StockData | null>(null)
  const [newTag, setNewTag] = useState("")
  const [tagCategory, setTagCategory] = useState<"industry" | "fundamentals" | "custom">("custom")
  const [strategyResults, setStrategyResults] = useState<StrategyResult[]>([])
  const [triggeredAlerts, setTriggeredAlerts] = useState<any[]>([])
  const [activeStrategyFilters, setActiveStrategyFilters] = useState<string[]>([])
  const [strategySearchQuery, setStrategySearchQuery] = useState("")
  const [idCounter, setIdCounter] = useState(1000) // For generating unique IDs
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "stock_selection",
      title: "今日选股完成",
      content: "龙头战法策略已完成今日选股，共筛选出5只股票",
      timestamp: "2025-08-23 08:30:15",
      read: false,
      actionable: true,
      actionUrl: "#selection",
      actionText: "查看结果"
    },
    {
      id: "2",
      type: "price_alert",
      title: "价格提醒触发",
      content: "苹果(AAPL)股价已跌破$210，达到预设提醒条件",
      timestamp: "2025-08-23 07:15:30",
      read: false,
      actionable: true,
      actionUrl: "/stock/AAPL",
      actionText: "查看详情"
    }
  ])
  const [todos, setTodos] = useState<TodoItem[]>([
    {
      id: "1",
      type: "review_selection",
      title: "待分析选股结果",
      description: "请分析龙头战法策略的选股结果，共5只股票",
      priority: "high",
      completed: false,
      actionUrl: "#selection"
    },
    {
      id: "2",
      type: "confirm_alert",
      title: "确认价格提醒",
      description: "苹果(AAPL)股价提醒已触发，请确认是否需要调整",
      priority: "medium",
      completed: false,
      actionUrl: "/stock/AAPL"
    }
  ])
  const [showNotificationPanel, setShowNotificationPanel] = useState(false)

  const [detailView, setDetailView] = useState<{
    type: "stock" | "plan" | "strategy" | "selection" | null
    data: any
  }>({ type: null, data: null })

  // 生成客户端安全的随机 ID
  const [clientSideIds, setClientSideIds] = useState<{notificationCounter: number, todoCounter: number}>()
  
  // 在客户端初始化ID计数器
  useEffect(() => {
    setClientSideIds({
      notificationCounter: 1000,
      todoCounter: 2000
    })
  }, [])

  // 通知和待办管理函数
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    if (!clientSideIds) return; // 仅在客户端添加
    
    const newNotification: Notification = {
      ...notification,
      id: `notification-${clientSideIds.notificationCounter}`,
      timestamp: new Date().toLocaleString('zh-CN')
    }
    
    setClientSideIds(prev => ({
      ...prev!,
      notificationCounter: prev!.notificationCounter + 1
    }))
    
    setNotifications(prev => [newNotification, ...prev])
  }

  const addTodo = (todo: Omit<TodoItem, 'id'>) => {
    if (!clientSideIds) return; // 仅在客户端添加
    
    const newTodo: TodoItem = {
      ...todo,
      id: `todo-${clientSideIds.todoCounter}`
    }
    
    setClientSideIds(prev => ({
      ...prev!,
      todoCounter: prev!.todoCounter + 1
    }))
    
    setTodos(prev => [newTodo, ...prev])
  }

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    )
  }

  const markTodoAsCompleted = (id: string) => {
    setTodos(prev => 
      prev.map(todo => 
        todo.id === id ? { ...todo, completed: true } : todo
      )
    )
  }

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    )
  }

  const clearCompletedTodos = () => {
    setTodos(prev => prev.filter(todo => !todo.completed))
  }

  // 计算未读数量
  const unreadNotificationsCount = notifications.filter(n => !n.read).length
  const pendingTodosCount = todos.filter(t => !t.completed).length
  const totalUnreadCount = unreadNotificationsCount + pendingTodosCount

  const [strategies, setStrategies] = useState<Strategy[]>([
    {
      id: "1",
      name: "龙头战法",
      type: "趋势跟踪",
      description: "专注于行业龙头股票的趋势跟踪策略",
      rules: ["市值前三", "ROE>15%", "营收增长>20%"],
      script: `
def select_stocks():
    stocks = get_all_stocks()
    return stocks.filter(
        market_cap_rank <= 3,
        roe > 0.15,
        revenue_growth > 0.20
    )
      `,
      cases: [
        { name: "贵州茅台", description: "在2024年Q1成功捕捉茅台反弹，获得25%收益", date: "2024-03-15" },
        { name: "宁德时代", description: "在新能源车行业爆发期成功捕捉龙头", date: "2024-02-20" },
        { name: "比亚迪", description: "通过龙头战法在正确时机介入，获得30%收益", date: "2024-01-10" }
      ],
      performance: { winRate: 72, avgReturn: 15.8, maxDrawdown: -8.2 },
      notes: [
        { text: "龙头战法适合牛市使用，重点关注行业龙头的业绩表现", date: "2025-08-20" },
        { text: "需要结合宏观经济环境，避免在熊市中盲目使用", date: "2025-08-22" }
      ],
      applications: [
        { text: "QuantMind在2024年Q3成功应用该策略，获得18%收益", date: "2024-09-30" },
        { text: "巴菲特价值投资理念与此策略高度契合", date: "2024-10-15" }
      ],
      patterns: [
        { id: "1", name: "龙头突破模式", description: "股价突破前高点，成交量放大", imageUrl: "/pattern1.png", uploadDate: "2024-01-15" }
      ]
    },
    {
      id: "2",
      name: "趋势突破",
      type: "技术分析",
      description: "基于技术指标的趋势突破策略",
      rules: ["突破20日均线", "成交量放大", "RSI>50"],
      script: `
def select_stocks():
    stocks = get_all_stocks()
    return stocks.filter(
        price > ma20,
        volume > avg_volume * 1.5,
        rsi > 50
    )
      `,
      cases: [
        { name: "特斯拉", description: "在电动车行业爆发时成功捕捉趋势", date: "2024-05-10" },
        { name: "苹果", description: "通过技术突破捕捉iPhone新品发布前的上涨", date: "2024-04-20" },
        { name: "英伟达", description: "AI热潮中成功捕捉突破机会", date: "2024-03-25" }
      ],
      performance: { winRate: 65, avgReturn: 12.3, maxDrawdown: -12.5 },
      notes: [
        { text: "趋势突破策略需要严格止损，控制回撤风险", date: "2025-08-18" },
        { text: "最佳使用时机是牛市中期和震荡市突破阶段", date: "2025-08-21" }
      ],
      applications: [
        { text: "量化交易员在科技股反弹中成功捕获多只涨停股", date: "2024-11-12" },
        { text: "短线高手利用该策略在新能源板块获得显著收益", date: "2024-12-05" }
      ],
      patterns: []
    },
    {
      id: "3",
      name: "熊市抗跌精选",
      type: "防御策略",
      description: "在市场下跌时表现相对较好的股票",
      rules: ["低波动率", "高股息率", "稳定盈利"],
      script: `
def select_stocks():
    stocks = get_all_stocks()
    return stocks.filter(
        volatility < 0.3,
        dividend_yield > 0.03,
        profit_stability > 0.8
    )
      `,
      cases: [
        { name: "中国平安", description: "在2022年熊市中表现稳健，跑赢市场", date: "2022-12-30" },
        { name: "招商银行", description: "银行股作为防御性投资的优选", date: "2023-01-15" },
        { name: "万科A", description: "地产龙头在市场低迷时期的稳健表现", date: "2023-02-20" }
      ],
      performance: { winRate: 58, avgReturn: 8.5, maxDrawdown: -5.8 },
      notes: [
        { text: "防御策略虽然收益率不高，但在熊市中能有效保护资金", date: "2025-08-19" },
        { text: "建议与成长股策略搭配使用，实现攻守平衡", date: "2025-08-23" }
      ],
      applications: [
        { text: "价值投资者在2022年熊市中运用此策略，跑赢市场15%", date: "2022-12-20" },
        { text: "机构投资者将其作为底仓配置的重要参考", date: "2023-03-10" }
      ],
      patterns: []
    },
  ])

  // 动态概念数据
  const [allConcepts, setAllConcepts] = useState<{[key: string]: string[]}>({
    industry: [],
    fundamentals: [],
    custom: []
  })

  // 获取概念分类数据
  async function fetchConceptCategories() {
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL || ''
      const res = await fetch(`${base}/api/v1/concepts/categories`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(String(data?.detail || data?.message || `HTTP ${res.status}`))
      
      const categories = data?.data?.categories || {}
      setAllConcepts(categories)
    } catch (err) {
      console.error('fetch concept categories error', err)
      // 失败时使用默认值
      setAllConcepts({
        industry: ["其他"],
        fundamentals: ["其他"],
        custom: ["其他"]
      })
    }
  }

  // 组件加载时获取概念数据
  useEffect(() => { fetchConceptCategories() }, [])

  const influencers = [
    {
      id: 1,
      name: "巴菲特",
      platform: "伯克希尔",
      followers: "50万+",
      avatar: "/warren-buffett-portrait.png",
      status: "active",
      accuracy: "85%",
    },
    {
      id: 2,
      name: "段永平",
      platform: "雪球",
      followers: "100万+",
      avatar: "/thoughtful-investor.png",
      status: "active",
      accuracy: "78%",
    },
    {
      id: 3,
      name: "林园",
      platform: "微博",
      followers: "80万+",
      avatar: "/chinese-investor.png",
      status: "active",
      accuracy: "72%",
    },
  ]

  const scripts = [
    {
      id: 1,
      name: "雪球监控脚本",
      platform: "雪球",
      status: "running",
      influencerCount: 15,
      postsToday: 23,
      nextRun: "15:30",
    },
    {
      id: 2,
      name: "微博监控脚本",
      platform: "微博",
      status: "running",
      influencerCount: 8,
      postsToday: 12,
      nextRun: "16:00",
    },
    {
      id: 3,
      name: "财经新闻脚本",
      platform: "财联社",
      status: "stopped",
      influencerCount: 5,
      postsToday: 0,
      nextRun: "已停止",
    },
  ]

  const influencerPosts = [
    {
      id: 1,
      influencerName: "段永平",
      platform: "雪球",
      content: "苹果在当前价位具有长期投资价值，建议分批买入。技术面看，已经接近重要支撑位。",
      timestamp: "2小时前",
      likes: 156,
      comments: 23,
      sentiment: "positive",
      relatedStock: "AAPL",
      keywords: ["苹果", "长期投资", "支撑位"],
    },
    {
      id: 2,
      influencerName: "林园",
      platform: "微博",
      content: "新能源车板块调整充分，龙头公司估值已经合理，可以关注反弹机会。",
      timestamp: "4小时前",
      likes: 89,
      comments: 15,
      sentiment: "positive",
      relatedStock: "BYD",
      keywords: ["新能源", "估值", "反弹"],
    },
    {
      id: 3,
      influencerName: "巴菲特",
      platform: "伯克希尔",
      content: "市场短期是投票机，长期是称重机。专注于企业的内在价值，而不是股价波动。",
      timestamp: "1天前",
      likes: 234,
      comments: 45,
      sentiment: "neutral",
      relatedStock: null,
      keywords: ["价值投资", "长期", "内在价值"],
    },
  ]

  const [tradingPlans, setTradingPlans] = useState<TradingPlan[]>([
    {
      id: 1,
      ticker: "AAPL",
      name: "苹果回调买入计划",
      type: "波段交易",
      status: "等待入场",
      entry: 210.0,
      tp: 230.0,
      sl: 195.0,
      date: "2025-08-23",
      reason: "技术面回调至关键支撑位，基本面依然强劲",
      notes: [
        {
          user: "自己",
          text: "等待回调至$210附近，配合成交量确认后入场",
          date: "2025-08-23 09:30",
          type: "comment",
        },
      ],
    },
    {
      id: 2,
      ticker: "TSLA",
      name: "特斯拉突破追涨",
      type: "趋势跟随",
      status: "已入场",
      entry: 185.0,
      tp: 220.0,
      sl: 170.0,
      date: "2025-08-22",
      reason: "突破关键阻力位，成交量放大确认",
      notes: [
        {
          user: "大佬A",
          text: "这个位置突破很关键，可以重仓",
          date: "2025-08-22 14:20",
          type: "opinion",
        },
      ],
    },
  ])

  // Mock data
  const [stockPoolData, setStockPoolData] = useState<StockData[]>([
    {
      ticker: "AAPL",
      name: "苹果",
      price: 214.29,
      change: 1.25,
      volume: "25.8B",
      rules: ["均线多头", "周线突破"],
      concepts: {
        industry: ["信息技术"],
        fundamentals: ["高毛利率", "强大护城河"],
        custom: ["科技龙头", "重点观察"],
      },
      intelNotes: [
        {
          text: "大佬A认为苹果在$210是强支撑位，建议逢低买入",
          alertExpression: "price <= 210 AND volume > avgVolume(5) * 1.2",
          triggered: false,
          author: "大佬A",
          timestamp: "2025-08-23 09:30",
          content: "大佬A认为苹果在$210是强支撑位，建议逢低买入",
        },
      ],
    },
    {
      ticker: "TSLA",
      name: "特斯拉",
      price: 183.01,
      change: -0.54,
      volume: "15.2B",
      rules: ["箱体震荡"],
      concepts: {
        industry: ["可选消费"],
        fundamentals: ["高增长", "高负债"],
        custom: ["新能源", "高风险"],
      },
      intelNotes: [
        {
          text: "大佬B认为$175是关键支撑位，跌破则形态破坏。",
          image: "/tsla-technical-analysis.png",
          alertExpression: "price < 175 OR (price < EMA(55) AND RSI(14) < 30)",
          triggered: true,
          author: "大佬B",
          timestamp: "2025-08-22 14:20",
          content: "大佬B认为$175是关键支撑位，跌破则形态破坏。",
        },
      ],
    },
    {
      ticker: "NVDA",
      name: "英伟达",
      price: 127.08,
      change: 2.89,
      volume: "45.1B",
      rules: ["趋势向上", "成交量放大"],
      concepts: {
        industry: ["信息技术", "半导体"],
        fundamentals: ["高增长", "高研发投入"],
        custom: ["芯片", "AI核心", "重点观察"],
      },
      intelNotes: [
        {
          text: "机构报告：AI需求持续强劲，目标价$150",
          alertExpression: 'price > EMA(20) AND MACD_signal == "BULLISH" AND volume > avgVolume(10) * 1.5',
          triggered: false,
          author: "高盛研报",
          timestamp: "2025-08-23 08:15",
          content: "机构报告：AI需求持续强劲，目标价$150",
        },
      ],
    },
  ])

  // Generate daily strategy results simulation
  const generateDailyResults = () => {
    // 使用固定日期格式代替动态生成
    const today = "2025-08-23"
    const todayResults: StrategyResult[] = []

    strategies.forEach((strategy, strategyIndex) => {
      const mockResults: StockData[] = []
      // Use deterministic values to avoid hydration issues
      const stockCount = (strategyIndex % 6) + 3 // 3-8 stocks per strategy
      
      for (let i = 0; i < stockCount; i++) {
        const stockPool = [
          { ticker: "AAPL", name: "苹果", price: 185.25, change: 2.45 },
          { ticker: "TSLA", name: "特斯拉", price: 242.18, change: 3.21 },
          { ticker: "NVDA", name: "英伟达", price: 456.78, change: 5.67 },
          { ticker: "MSFT", name: "微软", price: 389.45, change: 1.89 },
          { ticker: "GOOGL", name: "谷歌", price: 142.56, change: -0.87 },
          { ticker: "META", name: "Meta", price: 298.34, change: 2.34 },
          { ticker: "AMZN", name: "亚马逊", price: 127.89, change: 1.45 },
          { ticker: "BABA", name: "阿里巴巴", price: 78.45, change: -1.23 },
          { ticker: "TCEHY", name: "腾讯", price: 45.67, change: 0.89 },
          { ticker: "BYD", name: "比亚迪", price: 245.80, change: 4.23 },
        ]
        
        const stockIndex = (strategyIndex * 3 + i) % stockPool.length
        const selectedStock = stockPool[stockIndex]
        if (!mockResults.find(s => s.ticker === selectedStock.ticker)) {
          mockResults.push({
            ...selectedStock,
            volume: `${(((strategyIndex + i) % 90) + 10).toFixed(1)}M`,
            rules: strategy.rules,
            concepts: {
              industry: ["信息技术", "新能源", "消费"].slice(0, (strategyIndex % 2) + 1),
              fundamentals: ["高ROE", "稳定增长", "强大护城河"].slice(0, (i % 2) + 1),
              custom: ["科技龙头", "机构重仓", "重点观察"].slice(0, ((strategyIndex + i) % 2) + 1)
            },
            intelNotes: []
          })
        }
      }

      setIdCounter(prev => prev + 1)
      const result: StrategyResult = {
        strategyId: `${strategy.id}-${idCounter}`,
        strategyName: strategy.name,
        executionTime: today,
        selectedStocks: mockResults,
        confidence: ((strategyIndex % 20) + 80),
        summary: `根据${strategy.name}策略，筛选出${mockResults.length}只符合条件的股票`,
      }
      
      todayResults.push(result)
    })

    setStrategyResults(prev => {
      // Remove old results from today and add new ones
      const filtered = prev.filter(r => r.executionTime !== today)
      return [...todayResults, ...filtered]
    })
  }

  // Auto-generate results on component mount
  useEffect(() => {
    if (strategyResults.length === 0) {
      generateDailyResults()
    }
  }, [])

  const filteredTradingPlans = tradingPlans.filter((plan) => {
    if (planFilter === "all") return true
    if (planFilter === "active") return plan.status === "已入场"
    if (planFilter === "waiting") return plan.status === "等待入场"
    if (planFilter === "completed") return plan.status === "已完成"
    return true
  })

  const executeStrategy = (strategy: any) => {
    // Mock strategy execution - create StockData objects
    const mockResults: StockData[] = [
      {
        ticker: "AAPL",
        name: "苹果",
        price: 185.25,
        change: 2.45,
        volume: "45.2M",
        rules: ["符合龙头战法条件", "市值前三", "ROE>15%"],
        concepts: {
          industry: ["信息技术"],
          fundamentals: ["高ROE", "强大护城河"],
          custom: ["科技龙头", "机构重仓"]
        },
        intelNotes: []
      },
      {
        ticker: "TSLA",
        name: "特斯拉",
        price: 242.18,
        change: 3.21,
        volume: "72.8M",
        rules: ["技术面突破信号", "突破20日均线", "成交量放大"],
        concepts: {
          industry: ["新能源"],
          fundamentals: ["稳定增长"],
          custom: ["重点观察", "北向资金"]
        },
        intelNotes: []
      },
      {
        ticker: "NVDA",
        name: "英伟达",
        price: 456.78,
        change: 5.67,
        volume: "89.3M",
        rules: ["AI概念龙头", "市值前三", "营收增长>20%"],
        concepts: {
          industry: ["信息技术"],
          fundamentals: ["高ROE", "稳定增长"],
          custom: ["科技龙头", "机构重仓", "业绩预增"]
        },
        intelNotes: []
      },
    ]

    setIdCounter(prev => prev + 1)
    const result: StrategyResult = {
      strategyId: `manual-${idCounter}`,
      strategyName: strategy.name,
      executionTime: "2025-08-23 10:15:30",
      selectedStocks: mockResults,
      confidence: 85,
      summary: `根据${strategy.name}策略，筛选出${mockResults.length}只符合条件的股票`,
    }

    setStrategyResults((prev) => [result, ...prev])
    setDetailView({ type: "selection", data: result })
    
    // 生成通知和待办事项
    addNotification({
      type: 'strategy',
      title: '策略执行完成',
      content: `${strategy.name}策略已执行完成，筛选出${mockResults.length}只股票`,
      read: false,
      actionable: true,
      actionUrl: '#selection',
      actionText: '查看结果',
      data: result
    })

    addTodo({
      type: 'review_selection',
      title: '待分析选股结果',
      description: `请分析${strategy.name}策略的选股结果，共${mockResults.length}只股票`,
      priority: 'high',
      completed: false,
      actionUrl: '#selection',
      data: result
    })

    // 添加价格提醒触发模拟 - 使用确定性算法代替Math.random()
    if (mockResults.length > 0 && clientSideIds) {
      // 使用确定性算法选择股票
      const stockIndex = mockResults.length > 1 ? mockResults.length - 1 : 0
      const randomStock = mockResults[stockIndex]
      addNotification({
        type: 'price_alert',
        title: '价格提醒触发',
        content: `${randomStock.name}(${randomStock.ticker})股价已达到预设提醒条件`,
        read: false,
        actionable: true,
        actionUrl: `/stock/${randomStock.ticker}`,
        actionText: '查看详情'
      })
    }
  }

  // Strategy results filtering and analysis
  const getAllStocksFromResults = () => {
    const allStocks = new Map<string, { stock: StockData; strategies: string[] }>()
    
    strategyResults.forEach(result => {
      if (activeStrategyFilters.length === 0 || activeStrategyFilters.includes(result.strategyName)) {
        result.selectedStocks.forEach(stock => {
          const key = stock.ticker
          if (allStocks.has(key)) {
            const existing = allStocks.get(key)!
            if (!existing.strategies.includes(result.strategyName)) {
              existing.strategies.push(result.strategyName)
            }
          } else {
            allStocks.set(key, {
              stock,
              strategies: [result.strategyName]
            })
          }
        })
      }
    })
    
    return Array.from(allStocks.values())
  }

  const filteredStrategyStocks = getAllStocksFromResults().filter((item) => {
    const matchesSearch =
      strategySearchQuery === "" ||
      item.stock.name.toLowerCase().includes(strategySearchQuery.toLowerCase()) ||
      item.stock.ticker.toLowerCase().includes(strategySearchQuery.toLowerCase())
    
    return matchesSearch
  })

  // Get available strategy names for filtering
  const availableStrategies = Array.from(new Set(strategyResults.map(r => r.strategyName)))

  // Original stock pool filtering
  const filteredStocks = stockPoolData.filter((stock) => {
    const matchesSearch =
      searchQuery === "" ||
      stock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.ticker.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesTags =
      activeFilterTags.length === 0 ||
      activeFilterTags.some((tag) => Object.values(stock.concepts).flat().includes(tag) || stock.rules.includes(tag))

    return matchesSearch && matchesTags
  })

  const renderStockDetail = (stock: StockData) => {
    return (
      <>
        <Button variant="outline" size="sm" onClick={() => setDetailView({ type: "stock", data: stock })}>
          详情
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="w-3 h-3 mr-1" />
              情报
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>添加 {stock.name} 情报</DialogTitle>
            </DialogHeader>
            <IntelNoteForm
              stock={stock}
              onSave={(note) => {
                setStockPoolData((prev) =>
                  prev.map((s) => (s.ticker === stock.ticker ? { ...s, intelNotes: [...s.intelNotes, note] } : s)),
                )
              }}
            />
          </DialogContent>
        </Dialog>
      </>
    )
  }

  const addTradingPlanForStock = (stock: StockData) => {
    setIdCounter(prev => prev + 1)
    const newPlan: TradingPlan = {
      id: idCounter,
      ticker: stock.ticker,
      name: `${stock.name}交易计划`,
      type: "待定",
      status: "计划中",
      entry: stock.price,
      tp: stock.price * 1.1,
      sl: stock.price * 0.95,
      date: new Date().toISOString().split("T")[0],
      reason: "从选股结果创建",
      notes: [],
    }
    setTradingPlans((prev) => [newPlan, ...prev])
    console.log(`[v0] Created trading plan for ${stock.ticker}`)
  }

  const handleEditTags = (stock: StockData) => {
    setEditingStock(stock)
    setShowTagEditor(true)
  }

  const handleAddTag = () => {
    if (!editingStock || !newTag.trim()) return

    const updatedStock = {
      ...editingStock,
      concepts: {
        ...editingStock.concepts,
        [tagCategory]: [...editingStock.concepts[tagCategory], newTag.trim()],
      },
    }

    setStockPoolData((prev) => prev.map((stock) => (stock.ticker === editingStock.ticker ? updatedStock : stock)))

    setNewTag("")
  }

  const handleRemoveTag = (tag: string, category: "industry" | "fundamentals" | "custom") => {
    if (!editingStock) return

    const updatedStock = {
      ...editingStock,
      concepts: {
        ...editingStock.concepts,
        [category]: editingStock.concepts[category].filter((t) => t !== tag),
      },
    }

    setStockPoolData((prev) => prev.map((stock) => (stock.ticker === editingStock.ticker ? updatedStock : stock)))

    setEditingStock(updatedStock)
  }

  const StockDetailView = ({ stock }: { stock: StockData }) => {
    const [activeTab, setActiveTab] = useState("opinions")
    const [showAddNote, setShowAddNote] = useState(false)
    const [showAddAlert, setShowAddAlert] = useState(false)
    const [showAddPlan, setShowAddPlan] = useState(false)
    const [selectedPrice, setSelectedPrice] = useState<number | null>(null)
    const [annotationType, setAnnotationType] = useState<"alert" | "support" | "resistance" | null>(null)
    const [annotations, setAnnotations] = useState<{
      alerts: Array<{ price: number; condition: string; note: string }>
      supports: Array<{ price: number; note: string; strength: "weak" | "strong" }>
      resistances: Array<{ price: number; note: string; strength: "weak" | "strong" }>
    }>({
      alerts: [],
      supports: [{ price: 210.0, note: "大佬A: 强支撑位", strength: "strong" }],
      resistances: [{ price: 220.0, note: "技术分析: 关键阻力", strength: "strong" }]
    })

    const handleChartClick = (event: React.MouseEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect()
      const y = event.clientY - rect.top
      const chartHeight = rect.height - 80 // 减去padding
      const priceRange = 30 // 假设价格范围
      const clickedPrice = stock.price + ((chartHeight / 2 - y) / chartHeight) * priceRange
      setSelectedPrice(Math.round(clickedPrice * 100) / 100)
    }

    const addAnnotation = (type: "alert" | "support" | "resistance", note: string, strength?: "weak" | "strong") => {
      if (!selectedPrice) return
      
      setAnnotations(prev => {
        const key = (type + 's') as 'alerts' | 'supports' | 'resistances'
        const list = (prev as any)[key] as any[]
        const nextItem: any = { price: selectedPrice, note }
        if (strength) nextItem.strength = strength
        if (type === 'alert') nextItem.condition = `价格${selectedPrice > stock.price ? '突破' : '跌破'} $${selectedPrice}`
        return {
          ...prev,
          [key]: [...list, nextItem]
        }
      })
      setSelectedPrice(null)
      setAnnotationType(null)
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setDetailView({ type: null, data: null })}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{stock.name}</h1>
              <p className="text-muted-foreground">{stock.ticker}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-600">${stock.price}</div>
              <div className={`text-lg ${stock.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                {stock.change >= 0 ? "+" : ""}{stock.change}%
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowAddNote(true)}>
              <Plus className="w-4 h-4 mr-2" />
              添加观点
            </Button>
            <Button variant="outline" onClick={() => setShowAddPlan(true)}>
              <Target className="w-4 h-4 mr-2" />
              创建计划
            </Button>
          </div>
        </div>

        {/* K线图 - 始终显示的基础组件 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                交互式K线图
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant={annotationType === "alert" ? "default" : "outline"}
                  onClick={() => setAnnotationType(annotationType === "alert" ? null : "alert")}
                >
                  <Bell className="w-4 h-4 mr-1" />
                  设置提醒
                </Button>
                <Button 
                  size="sm" 
                  variant={annotationType === "support" ? "default" : "outline"}
                  onClick={() => setAnnotationType(annotationType === "support" ? null : "support")}
                >
                  支撑
                </Button>
                <Button 
                  size="sm" 
                  variant={annotationType === "resistance" ? "default" : "outline"}
                  onClick={() => setAnnotationType(annotationType === "resistance" ? null : "resistance")}
                >
                  阻力
                </Button>
              </div>
            </div>
            {selectedPrice && (
              <div className="text-sm text-blue-600 font-medium">
                选中价位: ${selectedPrice} - 点击标注按钮添加
              </div>
            )}
          </CardHeader>
              <CardContent>
                <div 
                  className="h-[500px] bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg border relative overflow-hidden cursor-crosshair"
                  onClick={handleChartClick}
                >
                  {/* K线图主体 */}
                  <div className="absolute inset-4">
                    <div className="h-full flex items-end justify-between gap-1">
                      {Array.from({ length: 30 }, (_, i) => {
                        // 使用确定性算法生成数据，避免hydration错误
                        const seed = i * 17 + 23 // 使用简单的种子算法
                        const height = ((seed % 60) + 20) // 高度在20-80之间变化
                        const isGreen = (seed % 3) !== 0 // 约2/3概率为绿色
                        return (
                          <div key={i} className="flex-1 flex flex-col justify-end">
                            <div
                              className={`w-full ${isGreen ? "bg-green-500" : "bg-red-500"} rounded-sm opacity-80 hover:opacity-100 transition-opacity`}
                              style={{ height: `${height}%` }}
                            />
                          </div>
                        )
                      })}
                    </div>
                    
                    {/* 价位标注层 */}
                    {annotations.supports.map((support, index) => (
                      <div 
                        key={`support-${index}`}
                        className="absolute left-0 right-0 border-b-2 border-green-500 border-dashed"
                        style={{ bottom: `${((support.price - (stock.price - 15)) / 30) * 100}%` }}
                      >
                        <div className="absolute right-2 bg-green-500 text-white text-xs px-3 py-1 rounded-md transform -translate-y-1/2 shadow-lg">
                          <div className="font-bold">支撑 ${support.price}</div>
                          <div className="text-xs opacity-90">{support.note}</div>
                        </div>
                      </div>
                    ))}
                    
                    {annotations.resistances.map((resistance, index) => (
                      <div 
                        key={`resistance-${index}`}
                        className="absolute left-0 right-0 border-b-2 border-red-500 border-dashed"
                        style={{ bottom: `${((resistance.price - (stock.price - 15)) / 30) * 100}%` }}
                      >
                        <div className="absolute right-2 bg-red-500 text-white text-xs px-3 py-1 rounded-md transform -translate-y-1/2 shadow-lg">
                          <div className="font-bold">阻力 ${resistance.price}</div>
                          <div className="text-xs opacity-90">{resistance.note}</div>
                        </div>
                      </div>
                    ))}
                    
                    {annotations.alerts.map((alert, index) => (
                      <div 
                        key={`alert-${index}`}
                        className="absolute left-0 right-0 border-b-2 border-yellow-500"
                        style={{ bottom: `${((alert.price - (stock.price - 15)) / 30) * 100}%` }}
                      >
                        <div className="absolute right-2 bg-yellow-500 text-black text-xs px-3 py-1 rounded-md transform -translate-y-1/2 shadow-lg">
                          <Bell className="w-3 h-3 inline mr-1" />
                          <span className="font-bold">${alert.price}</span>
                        </div>
                      </div>
                    ))}
                    
                    {selectedPrice && (
                      <div 
                        className="absolute left-0 right-0 border-b-2 border-blue-500 animate-pulse"
                        style={{ bottom: `${((selectedPrice - (stock.price - 15)) / 30) * 100}%` }}
                      >
                        <div className="absolute right-2 bg-blue-500 text-white text-xs px-3 py-1 rounded-md transform -translate-y-1/2 shadow-lg">
                          <span className="font-bold">${selectedPrice}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* 左侧技术指标面板 */}
                  <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg border">
                    <h4 className="font-semibold text-sm mb-3 text-gray-800">实时技术指标</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-gray-600">RSI(14):</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-yellow-600">61.2</span>
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">中性</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-gray-600">MACD:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-green-600">+0.07</span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">金叉</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-gray-600">KDJ:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-orange-600">65/58</span>
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">超买</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-gray-600">EMA55:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blue-600">${(stock.price * 1.04).toFixed(2)}</span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">支撑</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 右侧关键价位面板 */}
                  <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg border">
                    <h4 className="font-semibold text-sm mb-3 text-gray-800">关键价位分析</h4>
                    <div className="space-y-2 text-xs">
                      {[
                        { level: "强阻力", price: "$220.00", distance: "+2.7%", color: "text-red-600", bgColor: "bg-red-50", borderColor: "border-red-200" },
                        { level: "弱阻力", price: "$216.50", distance: "+1.0%", color: "text-orange-600", bgColor: "bg-orange-50", borderColor: "border-orange-200" },
                        { level: "当前价", price: "$214.29", distance: "0.0%", color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
                        { level: "弱支撑", price: "$210.00", distance: "-2.0%", color: "text-green-600", bgColor: "bg-green-50", borderColor: "border-green-200" },
                        { level: "强支撑", price: "$205.00", distance: "-4.3%", color: "text-green-700", bgColor: "bg-green-50", borderColor: "border-green-300" },
                      ].map((level, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-2 rounded border ${level.bgColor} ${level.borderColor}`}
                        >
                          <div>
                            <div className="font-medium text-gray-700">{level.level}</div>
                            <div className={`font-bold ${level.color}`}>{level.price}</div>
                          </div>
                          <div className={`font-medium ${level.color}`}>{level.distance}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* 快捷标注操作面板 */}
                {selectedPrice && annotationType && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium mb-3 text-blue-800">
                      在 ${selectedPrice} 添加{annotationType === "alert" ? "提醒" : annotationType === "support" ? "支撑" : "阻力"}标注
                    </h4>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="添加备注信息 (如：巴菲特观点、技术分析等)" 
                        className="flex-1"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addAnnotation(annotationType, (e.target as HTMLInputElement).value, "strong")
                            ;(e.target as HTMLInputElement).value = ''
                          }
                        }}
                      />
                      <Button 
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => {
                          const input = document.querySelector('input[placeholder*="备注信息"]') as HTMLInputElement
                          addAnnotation(annotationType, input?.value || '', "strong")
                          if (input) input.value = ''
                        }}
                      >
                        确认标注
                      </Button>
                      <Button variant="outline" onClick={() => { setSelectedPrice(null); setAnnotationType(null) }}>
                        取消
                      </Button>
                    </div>
                  </div>
                )}              </CardContent>
            </Card>

        {/* 辅助信息Tab区域 */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          {[
            { id: "opinions", label: "大佬观点", icon: Users },
            { id: "ai", label: "AI分析", icon: Brain },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2"
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </Button>
          ))}
        </div>

        {activeTab === "opinions" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">大佬观点与分析</h3>
                <p className="text-sm text-muted-foreground">基于大佬观点生成关键价位标注</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  筛选大佬
                </Button>
                <Button onClick={() => setShowAddNote(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  添加观点
                </Button>
              </div>
            </div>

            {/* 大佬观点统计 */}
            <div className="grid grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stock.intelNotes.length}</div>
                  <div className="text-sm text-muted-foreground">总观点数</div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {stock.intelNotes.filter((note) => note.alertExpression).length}
                  </div>
                  <div className="text-sm text-muted-foreground">关键价位</div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {new Set(stock.intelNotes.map((note) => note.author)).size}
                  </div>
                  <div className="text-sm text-muted-foreground">关注大佬</div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">78%</div>
                  <div className="text-sm text-muted-foreground">观点准确率</div>
                </div>
              </Card>
            </div>

            {/* 大佬观点列表 */}
            <div className="grid gap-4">
              {[
                {
                  author: "巴菲特",
                  avatar: "B",
                  timestamp: "2小时前",
                  content: "该股票技术面表现良好，日K回踩EMA55是不错的买入机会。关注$210支撑位，突破$220阻力位可追涨。",
                  keyPrices: [{ price: 210, type: "support", note: "强支撑位" }, { price: 220, type: "resistance", note: "关键阻力" }],
                  sentiment: "看涨",
                  accuracy: 85,
                  likes: 156,
                  comments: 23
                },
                {
                  author: "彼得·林奇",
                  avatar: "P",
                  timestamp: "4小时前",
                  content: "从基本面看，公司财务健康，业务增长稳定。建议长期持有，短期回调至$205可加仓。",
                  keyPrices: [{ price: 205, type: "support", note: "加仓机会" }],
                  sentiment: "看涨",
                  accuracy: 92,
                  likes: 89,
                  comments: 12
                },
                {
                  author: "索罗斯",
                  avatar: "S",
                  timestamp: "6小时前",
                  content: "MACD金叉信号明确，RSI还有上涨空间。但要警惕$225附近的历史高点压力。",
                  keyPrices: [{ price: 225, type: "resistance", note: "历史高点" }],
                  sentiment: "中性",
                  accuracy: 76,
                  likes: 67,
                  comments: 8
                }
              ].map((opinion, index) => (
                <Card key={index} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {opinion.avatar}
                        </div>
                        <div>
                          <div className="font-semibold text-lg">{opinion.author}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{opinion.timestamp}</span>
                            <span>•</span>
                            <span>准确率 {opinion.accuracy}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            opinion.sentiment === "看涨"
                              ? "default"
                              : opinion.sentiment === "看跌"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {opinion.sentiment}
                        </Badge>
                        <Button size="sm" variant="outline">
                          <Bell className="w-3 h-3 mr-1" />
                          关注
                        </Button>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-gray-700 leading-relaxed">{opinion.content}</p>
                    </div>

                    {/* 关键价位 */}
                    {opinion.keyPrices.length > 0 && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Target className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-blue-800">关键价位</span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {opinion.keyPrices.map((priceInfo, priceIndex) => (
                            <div 
                              key={priceIndex} 
                              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                                priceInfo.type === 'support' 
                                  ? 'bg-green-100 text-green-700 border border-green-200' 
                                  : 'bg-red-100 text-red-700 border border-red-200'
                              }`}
                            >
                              <div className="font-bold">${priceInfo.price}</div>
                              <div className="text-xs opacity-80">{priceInfo.note}</div>
                            </div>
                          ))}
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="mt-3"
                          onClick={() => {
                            // 自动在K线图上标注这些关键价位
                            opinion.keyPrices.forEach(priceInfo => {
                              setAnnotations(prev => ({
                                ...prev,
                                [priceInfo.type + 's']: [...prev[priceInfo.type + 's' as keyof typeof prev], {
                                  price: priceInfo.price,
                                  note: `${opinion.author}: ${priceInfo.note}`,
                                  strength: "strong"
                                }]
                              }))
                            })
                            setActiveTab("chart")
                          }}
                        >
                          <TrendingUp className="w-3 h-3 mr-1" />
                          在K线图中标注
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <button className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                          <ThumbsUp className="w-4 h-4" />
                          <span>赞同 {opinion.likes}</span>
                        </button>
                        <button className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                          <MessageCircle className="w-4 h-4" />
                          <span>评论 {opinion.comments}</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost">
                          <Plus className="w-3 h-3 mr-1" />
                          创建计划
                        </Button>
                      </div>
                    </div>
                    {/* 分页控件（自选股票表格） */}
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">共 {total} 条 · 每页 {pageSize} 条</div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>上一页</Button>
                        <div className="text-sm">第 {page} / {Math.max(1, Math.ceil(total / pageSize))} 页</div>
                        <Button variant="outline" size="sm" disabled={page >= Math.max(1, Math.ceil(total / pageSize))} onClick={() => setPage(p => p + 1)}>下一页</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
              ))}
            </div>

            {/* 添加更多观点提示 */}
            <Card className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">关注更多投资大佬</h3>
                <p className="text-gray-500 mb-4">收集更多投资大佬的观点，自动生成关键价位标注</p>
                <Button onClick={() => setShowAddNote(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  添加大佬观点
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "ai" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI技术面分析 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  AI技术面分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <h4 className="font-semibold text-blue-800">趋势分析</h4>
                    </div>
                    <p className="text-blue-700 text-sm mb-3">
                      当前价格位于EMA55上方，形成多头排列。RSI(61.2)处于中性偏强区域，MACD金叉信号明确，短期趋势向上。
                    </p>
                    <div className="flex gap-2">
                      <Badge className="bg-blue-100 text-blue-700">看涨信号</Badge>
                      <Badge variant="outline">强度: 75%</Badge>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-green-600" />
                      <h4 className="font-semibold text-green-800">关键位分析</h4>
                    </div>
                    <p className="text-green-700 text-sm mb-3">
                      基于AI算法识别的关键支撑位$210(概率82%)和阻力位$220(概率78%)。建议在支撑位附近布局，突破阻力位可追涨。
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>支撑位 $210.00</span>
                        <span className="text-green-600 font-medium">82%可靠</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>阻力位 $220.00</span>
                        <span className="text-red-600 font-medium">78%可靠</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-4 h-4 text-purple-600" />
                      <h4 className="font-semibold text-purple-800">量价分析</h4>
                    </div>
                    <p className="text-purple-700 text-sm">
                      成交量温和放大，配合价格上涨，属于健康的量价配合。AI预测后续可能出现更大成交量突破。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI基本面分析 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  AI基本面分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <h4 className="font-semibold text-green-800">财务健康度</h4>
                    </div>
                    <p className="text-green-700 text-sm mb-3">
                      AI分析显示公司财务状况良好，ROE稳定增长，负债率控制合理，现金流充裕。
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span>ROE:</span>
                        <span className="font-medium text-green-600">18.5%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>负债率:</span>
                        <span className="font-medium">35.2%</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <h4 className="font-semibold text-blue-800">增长预测</h4>
                    </div>
                    <p className="text-blue-700 text-sm mb-3">
                      基于机器学习模型预测，未来12个月营收增长率预期20-25%，业绩确定性较高。
                    </p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Q1营收预测:</span>
                        <span className="font-medium text-blue-600">+22%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>年度EPS预测:</span>
                        <span className="font-medium text-blue-600">$12.50</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      <h4 className="font-semibold text-yellow-800">风险评估</h4>
                    </div>
                    <p className="text-yellow-700 text-sm">
                      市场竞争加剧，原材料成本上涨等因素可能影响利润率。建议关注行业政策变化。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI交易建议 */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  AI交易建议
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600 mb-2">买入</div>
                    <div className="text-sm text-green-700 mb-3">建议操作</div>
                    <div className="space-y-2 text-xs">
                      <div>入场区间: $210-$214</div>
                      <div>目标价位: $225-$230</div>
                      <div>止损价位: $205</div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-2">85%</div>
                    <div className="text-sm text-blue-700 mb-3">AI信心度</div>
                    <div className="space-y-2 text-xs">
                      <div>技术面: 强势</div>
                      <div>基本面: 良好</div>
                      <div>市场情绪: 乐观</div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-purple-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600 mb-2">3-5天</div>
                    <div className="text-sm text-purple-700 mb-3">持有周期</div>
                    <div className="space-y-2 text-xs">
                      <div>预期收益: 8-12%</div>
                      <div>风险等级: 中等</div>
                      <div>胜率预测: 78%</div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex gap-2 justify-center">
                  <Button onClick={() => setShowAddPlan(true)}>
                    <Target className="w-4 h-4 mr-2" />
                    基于AI建议创建计划
                  </Button>
                  <Button variant="outline">
                    <Bell className="w-4 h-4 mr-2" />
                    设置AI提醒
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add Note Modal */}
        {showAddNote && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>添加大佬观点</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">大佬名称</label>
                  <input className="w-full mt-1 px-3 py-2 border rounded-md" placeholder="输入大佬名称" />
                </div>
                <div>
                  <label className="text-sm font-medium">观点内容</label>
                  <textarea
                    className="w-full mt-1 px-3 py-2 border rounded-md h-24"
                    placeholder="输入观点内容"
                  ></textarea>
                </div>
                <div>
                  <label className="text-sm font-medium">提醒条件（可选）</label>
                  <input
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="如：price > 220 AND volume > avgVolume(5) * 1.2"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowAddNote(false)}>
                    取消
                  </Button>
                  <Button onClick={() => setShowAddNote(false)}>保存</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add Alert Modal */}
        {showAddAlert && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>设置价格提醒</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">提醒条件</label>
                  <select className="w-full mt-1 px-3 py-2 border rounded-md">
                    <option>价格突破</option>
                    <option>技术指标</option>
                    <option>成交量异常</option>
                    <option>自定义表达式</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">目标值</label>
                  <input className="w-full mt-1 px-3 py-2 border rounded-md" placeholder="输入目标价格或表达式" />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowAddAlert(false)}>
                    取消
                  </Button>
                  <Button onClick={() => setShowAddAlert(false)}>设置提醒</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add Trading Plan Modal */}
        {showAddPlan && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-lg mx-4">
              <CardHeader>
                <CardTitle>创建交易计划</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">计划名称</label>
                    <input className="w-full mt-1 px-3 py-2 border rounded-md" placeholder="输入计划名称" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">策略类型</label>
                    <select className="w-full mt-1 px-3 py-2 border rounded-md">
                      <option>突破买入</option>
                      <option>回调买入</option>
                      <option>趋势跟踪</option>
                      <option>均值回归</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">入场条件</label>
                    <input className="w-full mt-1 px-3 py-2 border rounded-md" placeholder="入场价格/条件" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">目标价格</label>
                    <input className="w-full mt-1 px-3 py-2 border rounded-md" placeholder="目标价格" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">止损价格</label>
                    <input className="w-full mt-1 px-3 py-2 border rounded-md" placeholder="止损价格" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">交易理由</label>
                  <textarea
                    className="w-full mt-1 px-3 py-2 border rounded-md h-20"
                    placeholder="输入交易理由和分析"
                  ></textarea>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowAddPlan(false)}>
                    取消
                  </Button>
                  <Button onClick={() => setShowAddPlan(false)}>创建计划</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    )
  }

  const TradingPlanDetailView = ({ plan }: { plan: TradingPlan }) => (
    <div className="space-y-6">
      {/* Header with back button and plan info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setDetailView({ type: null, data: null })}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-xl font-bold">
              {plan.ticker} {plan.name}
            </h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{plan.ticker}</span>
              <Badge variant="outline">等待入场</Badge>
              <span>策略: 趋势突破</span>
              <span>创建: {plan.date}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            标记入场
          </Button>
          <Button variant="default" size="sm">
            编辑计划
          </Button>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left column - Trading Parameters and Reason */}
        <div className="col-span-5 space-y-6">
          {/* Trading Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                交易参数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-sm text-muted-foreground mb-1">入场价</div>
                  <div className="text-2xl font-bold">${plan.entry}</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-sm text-muted-foreground mb-1">目标价</div>
                  <div className="text-2xl font-bold text-green-600">${plan.tp}</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center col-span-2">
                  <div className="text-sm text-muted-foreground mb-1">止损价</div>
                  <div className="text-2xl font-bold text-red-600">${plan.sl}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trading Reason */}
          <Card>
            <CardHeader>
              <CardTitle>交易理由</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                技术面突破关键阻力位，基本面电动车销量增长强劲，适合中线持有
              </p>
            </CardContent>
          </Card>

          {/* Trading Notes Timeline */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>交易笔记与时间线</CardTitle>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                添加笔记
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium">
                    自己
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">评论</span>
                      <span className="text-xs text-muted-foreground">2024-01-15 10:30</span>
                    </div>
                    <p className="text-sm">计划创建，等待价格突破260阻力位后入场</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-xs font-medium">
                    系统
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">风险</span>
                      <span className="text-xs text-muted-foreground">2024-01-15 14:20</span>
                    </div>
                    <p className="text-sm">风险提醒：当前RSI已达70，注意超买风险</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle column - Risk Analysis */}
        <div className="col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                风险分析
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">风险回报比</span>
                <span className="text-lg font-bold">1:2.33</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">合位大小</span>
                <span className="font-medium">1000 股</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">潜在盈利</span>
                <span className="font-medium text-green-600">+$35000.00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">潜在亏损</span>
                <span className="font-medium text-red-600">-$15000.00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">风险等级</span>
                <Badge variant="secondary">中风险</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Plan Overview and Quick Actions */}
        <div className="col-span-3 space-y-6">
          {/* Plan Overview */}
          <Card>
            <CardHeader>
              <CardTitle>计划概况</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">股票代码</span>
                <span className="font-medium">TSLA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">策略类型</span>
                <span className="font-medium">趋势突破</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">最后更新</span>
                <span className="font-medium">2024-01-15 14:20</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>快速操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                <TrendingUp className="w-4 h-4 mr-2" />
                查看股票详情
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                <AlertTriangle className="w-4 h-4 mr-2" />
                设置提醒
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                <DollarSign className="w-4 h-4 mr-2" />
                模拟交易
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                <BarChart3 className="w-4 h-4 mr-2" />
                风险分析
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )

  // 添加应用案例表单组件
  const AddCaseForm = ({ onSave }: { onSave: (caseItem: { name: string; description: string; date: string }) => void }) => {
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [clientSide, setClientSide] = useState(false)

    // 确保只在客户端执行
    useEffect(() => {
      setClientSide(true)
    }, [])

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (name.trim() && description.trim() && clientSide) {
        onSave({
          name: name.trim(),
          description: description.trim(),
          date: "2025-08-23" // 固定日期避免hydration错误
        })
        setName("")
        setDescription("")
      }
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">股票名称</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：贵州茅台"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">案例描述</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="详细描述该策略在此股票上的应用情况和结果..."
            rows={3}
            required
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="submit">
            <Plus className="w-4 h-4 mr-2" />
            添加案例
          </Button>
        </div>
      </form>
    )
  }

  // 添加策略笔记表单组件
  const AddNoteForm = ({ onSave }: { onSave: (note: { text: string; date: string }) => void }) => {
    const [text, setText] = useState("")
    const [clientSide, setClientSide] = useState(false)

    // 确保只在客户端执行
    useEffect(() => {
      setClientSide(true)
    }, [])
    
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (text.trim() && clientSide) {
        onSave({
          text: text.trim(),
          date: "2025-08-23" // 固定日期避免hydration错误
        })
        setText("")
      }
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">策略笔记</label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="记录使用该策略的心得、注意事项、优化建议等..."
            rows={4}
            required
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="submit">
            <Plus className="w-4 h-4 mr-2" />
            添加笔记
          </Button>
        </div>
      </form>
    )
  }

  // 添加K线图片表单组件
  const AddPatternForm = ({ onSave }: { onSave: (pattern: { id: string; name: string; description: string; imageUrl: string; uploadDate: string }) => void }) => {
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [uniqueId, setUniqueId] = useState<string>('')

    // 使用useEffect确保在客户端生成ID
    useEffect(() => {
      setUniqueId(Date.now().toString())
    }, [])

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        setImageFile(file)
        // 创建预览URL
        const previewUrl = URL.createObjectURL(file)
        setImagePreview(previewUrl)
      }
    }

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (name.trim() && description.trim() && imageFile && uniqueId) {
        // 模拟上传，实际项目中需要上传到服务器
        const timestamp = Date.now()
        const imageUrl = `/patterns/${timestamp}_${imageFile.name}`
        
        onSave({
          id: uniqueId,
          name: name.trim(),
          description: description.trim(),
          imageUrl,
          uploadDate: "2025-08-23" // 固定日期避免hydration错误
        })
        
        setName("")
        setDescription("")
        setImageFile(null)
        setImagePreview(null)
      }
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">模式名称</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：突破前高模式"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">模式描述</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="描述该K线模式的特征、信号意义和应用场景..."
            rows={3}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">上传K线图</label>
          <div className="space-y-2">
            <Input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              required
            />
            {imagePreview && (
              <div className="border rounded-lg p-2">
                <img 
                  src={imagePreview} 
                  alt="预览" 
                  className="max-w-full max-h-40 object-contain mx-auto"
                />
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={!imageFile}>
            <Plus className="w-4 h-4 mr-2" />
            添加模式
          </Button>
        </div>
      </form>
    )
  }

  const StrategyDetailView = ({ strategy, onUpdate, setDetailView, executeStrategy }: { 
    strategy: Strategy; 
    onUpdate: (strategy: Strategy) => void;
    setDetailView: (view: { type: "stock" | "plan" | "strategy" | "selection" | null; data: any }) => void;
    executeStrategy: (strategy: Strategy) => void;
  }) => {
    const [showAddCaseDialog, setShowAddCaseDialog] = useState(false)
    const [showAddNoteDialog, setShowAddNoteDialog] = useState(false)
    const [showAddPatternDialog, setShowAddPatternDialog] = useState(false)

    const addCase = (caseItem: { name: string; description: string; date: string }) => {
      const updatedStrategy = {
        ...strategy,
        cases: [...strategy.cases, caseItem]
      }
      onUpdate(updatedStrategy)
      setShowAddCaseDialog(false)
    }

    const addNote = (note: { text: string; date: string }) => {
      const updatedStrategy = {
        ...strategy,
        notes: [...strategy.notes, note]
      }
      onUpdate(updatedStrategy)
      setShowAddNoteDialog(false)
    }

    const addPattern = (pattern: { id: string; name: string; description: string; imageUrl: string; uploadDate: string }) => {
      const updatedStrategy = {
        ...strategy,
        patterns: [...(strategy.patterns || []), pattern]
      }
      onUpdate(updatedStrategy)
      setShowAddPatternDialog(false)
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setDetailView({ type: null, data: null })}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{strategy.name}</h1>
              <p className="text-muted-foreground">{strategy.description}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => executeStrategy(strategy)}>
              <Search className="w-4 h-4 mr-2" />
              执行选股
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>策略规则</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {strategy.rules.map((rule, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary mt-0.5">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{rule}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>策略代码</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  <code>{strategy.script}</code>
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>应用案例</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setShowAddCaseDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    添加案例
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {strategy.cases.map((caseItem, index) => (
                    <div key={index} className="border-l-4 border-primary/20 pl-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{caseItem.name}</h4>
                        <span className="text-xs text-muted-foreground">{caseItem.date}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {caseItem.description}
                      </p>
                    </div>
                  ))}
                  {strategy.cases.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      暂无应用案例，点击上方按钮添加
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>策略笔记</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setShowAddNoteDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    添加笔记
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {strategy.notes.map((note, index) => (
                    <div key={index} className="p-3 bg-muted rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium">策略笔记</span>
                        <span className="text-xs text-muted-foreground">{note.date}</span>
                      </div>
                      <p className="text-sm">{note.text}</p>
                    </div>
                  ))}
                  {strategy.notes.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      暂无策略笔记，点击上方按钮添加
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>模式K线图</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setShowAddPatternDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    上传图片
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {strategy.patterns && strategy.patterns.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {strategy.patterns.map((pattern) => (
                        <div key={pattern.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">{pattern.name}</h4>
                            <span className="text-xs text-muted-foreground">{pattern.uploadDate}</span>
                          </div>
                          <div className="mb-3">
                            <img 
                              src={pattern.imageUrl} 
                              alt={pattern.name}
                              className="w-full h-32 object-cover rounded border"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/placeholder.svg';
                              }}
                            />
                          </div>
                          <p className="text-sm text-muted-foreground">{pattern.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-lg flex items-center justify-center">
                        <Camera className="w-8 h-8" />
                      </div>
                      <p className="text-sm">暂无模式K线图</p>
                      <p className="text-xs mt-1">上传类似的K线图作为策略参考模式</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>策略统计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">胜率</span>
                    <span className="font-medium">{strategy.performance?.winRate || 'N/A'}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">平均收益</span>
                    <span className="font-medium text-green-600">{strategy.performance?.avgReturn ? `+${strategy.performance.avgReturn}%` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">最大回撤</span>
                    <span className="font-medium text-red-600">{strategy.performance?.maxDrawdown ? `${strategy.performance.maxDrawdown}%` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">使用次数</span>
                    <span className="font-medium">{strategy.applications?.length || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>大佬应用</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {strategy.applications && strategy.applications.length > 0 ? (
                    strategy.applications.map((expert, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium">知</span>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">策略应用</div>
                          <div className="text-xs text-muted-foreground mb-1">{expert.text}</div>
                          <div className="text-xs text-muted-foreground">{expert.date}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      暂无应用案例
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 添加应用案例对话框 */}
        <Dialog open={showAddCaseDialog} onOpenChange={setShowAddCaseDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>添加应用案例</DialogTitle>
            </DialogHeader>
            <AddCaseForm onSave={addCase} />
          </DialogContent>
        </Dialog>

        {/* 添加策略笔记对话框 */}
        <Dialog open={showAddNoteDialog} onOpenChange={setShowAddNoteDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>添加策略笔记</DialogTitle>
            </DialogHeader>
            <AddNoteForm onSave={addNote} />
          </DialogContent>
        </Dialog>

        {/* 添加模式K线图对话框 */}
        <Dialog open={showAddPatternDialog} onOpenChange={setShowAddPatternDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>上传模式K线图</DialogTitle>
            </DialogHeader>
            <AddPatternForm onSave={addPattern} />
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  const StockSelectionResultView = ({ 
    result, 
    setDetailView, 
    setTradingPlans 
  }: { 
    result: StrategyResult;
    setDetailView: (view: { type: "stock" | "plan" | "strategy" | "selection" | null; data: any }) => void;
    setTradingPlans: React.Dispatch<React.SetStateAction<TradingPlan[]>>;
  }) => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setDetailView({ type: null, data: null })}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-2xl font-bold">选股结果: {result.strategyName}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>执行时间: {result.executionTime}</span>
              <Badge variant="outline">置信度: {result.confidence}%</Badge>
              <span>选出 {result.selectedStocks.length} 只股票</span>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>选股结果详情</CardTitle>
        </CardHeader>
        <CardContent>
          {result.selectedStocks.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">股票</th>
                    <th className="text-left p-2">现价</th>
                    <th className="text-left p-2">涨跌幅</th>
                    <th className="text-left p-2">匹配理由</th>
                    <th className="text-left p-2">大佬观点</th>
                    <th className="text-left p-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {result.selectedStocks.map((stock) => (
                    <tr key={stock.ticker} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <div>
                          <div className="font-medium">{stock.name}</div>
                          <div className="text-sm text-muted-foreground">{stock.ticker}</div>
                        </div>
                      </td>
                      <td className={`p-2 font-medium ${stock.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                        ${stock.price}
                      </td>
                      <td className={`p-2 ${stock.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {stock.change >= 0 ? "+" : ""}
                        {stock.change}%
                      </td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {stock.rules.map((rule) => (
                            <Badge key={rule} variant="secondary" className="text-xs">
                              {rule}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex flex-col gap-1">
                          {stock.intelNotes.slice(0, 2).map((note, index) => (
                            <div key={index} className="text-xs bg-muted p-1 rounded">
                              <span className="font-medium">{note.author}:</span>
                              <span className="ml-1">{note.text.slice(0, 30)}...</span>
                            </div>
                          ))}
                          {stock.intelNotes.length === 0 && (
                            <span className="text-xs text-muted-foreground">暂无观点</span>
                          )}
                        </div>
                      </td>

                      <td className="p-2">
                        <div className="flex gap-1 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDetailView({ type: "stock", data: stock })}
                            className="text-xs"
                          >
                            详情
                          </Button>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="text-xs">
                                <Bell className="w-3 h-3 mr-1" />
                                提醒
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>为 {stock.name} 设置提醒</DialogTitle>
                              </DialogHeader>
                              <IntelNoteForm
                                stock={stock}
                                onSave={(note) => {
                                  console.log("保存提醒:", note)
                                }}
                              />
                            </DialogContent>
                          </Dialog>

                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="text-xs">
                                <Plus className="w-3 h-3 mr-1" />
                                计划
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>为 {stock.name} 创建交易计划</DialogTitle>
                              </DialogHeader>
                              <TradingPlanForm
                                stock={stock}
                                onSave={(plan) => {
                                  setTradingPlans((prev) => [plan, ...prev])
                                }}
                              />
                            </DialogContent>
                          </Dialog>

                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="text-xs">
                                <Tag className="w-3 h-3 mr-1" />
                                标签
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>编辑 {stock.name} 标签</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">当前标签</label>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {[
                                      ...stock.concepts.industry,
                                      ...stock.concepts.fundamentals,
                                      ...stock.concepts.custom
                                    ].map((tag, index) => (
                                      <Badge key={index} variant="secondary" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Input placeholder="添加新标签..." className="flex-1" />
                                  <Button size="sm">
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">该策略未选出符合条件的股票</div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  if (detailView.type === "selection") {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <StockSelectionResultView 
            result={detailView.data} 
            setDetailView={setDetailView}
            setTradingPlans={setTradingPlans}
          />
        </div>
      </div>
    )
  }

  if (detailView.type === "stock") {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <StockDetailView stock={detailView.data} />
        </div>
      </div>
    )
  }

  if (detailView.type === "plan") {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <TradingPlanDetailView plan={detailView.data} />
        </div>
      </div>
    )
  }

  if (detailView.type === "strategy") {
    const updateStrategy = (updatedStrategy: Strategy) => {
      setStrategies(prev => prev.map(s => s.id === updatedStrategy.id ? updatedStrategy : s))
    }
    
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <StrategyDetailView 
            strategy={detailView.data} 
            onUpdate={updateStrategy}
            setDetailView={setDetailView}
            executeStrategy={executeStrategy}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-sidebar border-r border-sidebar-border p-6">
          <div className="flex items-center gap-3 mb-8">
            <BarChart3 className="w-8 h-8 text-sidebar-primary" />
            <h1 className="text-xl font-bold text-sidebar-foreground">QuantMind</h1>
          </div>

          <nav className="space-y-2">
            {[
              { id: "dashboard", label: "自选股票", icon: Heart },
              { id: "plans", label: "交易计划", icon: ClipboardList },
              { id: "strategies", label: "策略管理", icon: ClipboardCheck },
              { id: "trading", label: "交易执行", icon: Zap },
              { id: "influencer", label: "大佬追踪", icon: Target },
              { id: "mindset", label: "心态建设", icon: HeartPulse },
              { id: "review", label: "交易复盘", icon: BarChart3 },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setCurrentPage(id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  currentPage === id
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          <header className="bg-sidebar border-b border-sidebar-border p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold text-sidebar-foreground">
                  {currentPage === "dashboard" && "仪表盘"}
                  {currentPage === "plans" && "交易计划"}
                  {currentPage === "strategies" && "策略管理"}
                  {currentPage === "trading" && "交易执行"}
                  {currentPage === "influencer" && "大佬追踪"}
                  {currentPage === "mindset" && "心态建设"}
                  {currentPage === "review" && "交易复盘"}
                </h2>

                {triggeredAlerts.length > 0 && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <BellRing className="w-4 h-4 mr-2" />
                        {triggeredAlerts.length} 个提醒已触发
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>今日触发的提醒</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        {triggeredAlerts.map((alert, index) => (
                          <Alert key={index}>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>{alert.ticker}:</strong> {alert.message}
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索代码/名称/概念..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <NotificationCenter />
                <Button variant="ghost" size="icon">
                  <Settings className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-6">
            {currentPage === "dashboard" && (
              <div className="space-y-6">
                {/* Stock Pool */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>自选股票</CardTitle>
                      <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleCsvPicked} className="hidden" />
                      <Button onClick={triggerPickCsv} disabled={importing}>
                        <Upload className="w-4 h-4 mr-2" />
                        {importing ? '导入中...' : '导入股票列表'}
                      </Button>
                      {importMsg && (
                        <span className="ml-3 text-sm text-gray-600">{importMsg}</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6 space-y-4">
                      {Object.entries(allConcepts).map(([type, tags]) => (
                        <div key={type} className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium w-20 capitalize">{type}:</span>
                          <div className="flex flex-wrap gap-2">
                            {tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant={selectedConcept === tag ? "default" : "outline"}
                                className="cursor-pointer"
                                onClick={() => {
                                  // 点击概念标签进行筛选
                                  if (selectedConcept === tag) {
                                    setSelectedConcept(null) // 取消筛选
                                  } else {
                                    setSelectedConcept(tag) // 设置筛选
                                    setPage(1) // 重置到第一页
                                  }
                                }}
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                      {selectedConcept && (
                        <Button variant="outline" size="sm" onClick={() => setSelectedConcept(null)}>
                          重置筛选 ({selectedConcept})
                        </Button>
                      )}
                    </div>

                    {/* Stock Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">代码/名称</th>
                            <th className="text-left p-2">现价</th>
                            <th className="text-left p-2">涨跌幅</th>
                            <th className="text-left p-2">市场</th>
                            <th className="text-left p-2">概念</th>
                            <th className="text-left p-2">更新时间</th>
                            <th className="text-left p-2">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {backendStocks.map((s) => (
                            <tr key={s.symbol} className="border-b hover:bg-muted/50">
                              <td className="p-2">
                                <div className="font-medium">{s.name}</div>
                                <div className="text-sm text-muted-foreground">{s.symbol}</div>
                              </td>
                              <td className="p-2">
                                {s.price != null ? `$${Number(s.price).toFixed(2)}` : '-'}
                              </td>
                              <td className="p-2">
                                {(() => {
                                  const p = s.change_percent
                                  if (p == null) return '-'
                                  const positive = p >= 0
                                  return (
                                    <span className={positive ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                      {positive ? '+' : ''}{Number(p).toFixed(2)}%
                                    </span>
                                  )
                                })()}
                              </td>
                              <td className="p-2">{s.market || '-'}</td>
                              <td className="p-2">
                                {s.concepts && s.concepts.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {s.concepts.slice(0, 3).map((concept, idx) => (
                                      <Badge key={idx} variant="secondary" className="text-xs">{concept}</Badge>
                                    ))}
                                    {s.concepts.length > 3 && (
                                      <Badge variant="outline" className="text-xs">+{s.concepts.length - 3}</Badge>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </td>
                              <td className="p-2 text-sm text-muted-foreground">{s.updated_at ? s.updated_at.replace('T',' ').replace('Z','') : '-'}</td>
                              <td className="p-2">
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => router.push(`/stock/${s.symbol}`)}>
                                    详情
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* 分页控件 */}
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">共 {total} 条 · 每页 {pageSize} 条</div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>上一页</Button>
                        <div className="text-sm">第 {page} / {Math.max(1, Math.ceil(total / pageSize))} 页</div>
                        <Button variant="outline" size="sm" disabled={page >= Math.max(1, Math.ceil(total / pageSize))} onClick={() => setPage(p => p + 1)}>下一页</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {showWatchlistPanel && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">已导入自选股</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{watchlistLoading ? '加载中...' : `共 ${watchlist.length} 条`}</span>
                          <Button variant="outline" size="sm" onClick={() => setShowWatchlistPanel(false)}>关闭</Button>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">代码</th>
                              <th className="text-left p-2">名称</th>
                              <th className="text-left p-2">市场</th>
                              <th className="text-left p-2">概念</th>
                              <th className="text-left p-2">更新时间</th>
                            </tr>
                          </thead>
                          <tbody>
                            {watchlist.map((s) => (
                              <tr key={s.symbol} className="border-b">
                                <td className="p-2 font-mono">{s.symbol}</td>
                                <td className="p-2">{s.name}</td>
                                <td className="p-2">{s.market || '-'}</td>
                                <td className="p-2">{s.group_name || '-'}</td>
                                <td className="p-2 text-sm text-muted-foreground">{s.updated_at ? s.updated_at.replace('T', ' ').replace('Z','') : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {showTagEditor && editingStock && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">编辑标签 - {editingStock.name}</h3>
                        <Button variant="ghost" size="sm" onClick={() => setShowTagEditor(false)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-6">
                        {/* Add New Tag */}
                        <div className="space-y-3">
                          <h4 className="font-medium">添加新标签</h4>
                          <div className="flex gap-2">
                            <select
                              value={tagCategory}
                              onChange={(e) => setTagCategory(e.target.value as "industry" | "fundamentals" | "custom")}
                              className="px-3 py-2 border rounded-md"
                            >
                              <option value="industry">行业</option>
                              <option value="fundamentals">基本面</option>
                              <option value="custom">自定义</option>
                            </select>
                            <Input
                              placeholder="输入标签名称"
                              value={newTag}
                              onChange={(e) => setNewTag(e.target.value)}
                              className="flex-1"
                            />
                            <Button onClick={handleAddTag}>添加</Button>
                          </div>
                        </div>

                        {/* Current Tags */}
                        <div className="space-y-4">
                          {Object.entries(editingStock.concepts).map(([category, tags]) => (
                            <div key={category} className="space-y-2">
                              <h4 className="font-medium capitalize">
                                {category === "industry" ? "行业" : category === "fundamentals" ? "基本面" : "自定义"}
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {tags.map((tag) => (
                                  <Badge key={tag} variant="secondary" className="cursor-pointer group">
                                    {tag}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="ml-1 h-auto p-0 opacity-0 group-hover:opacity-100"
                                      onClick={() =>
                                        handleRemoveTag(tag, category as "industry" | "fundamentals" | "custom")
                                      }
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 mt-6">
                        <Button variant="outline" onClick={() => setShowTagEditor(false)}>
                          取消
                        </Button>
                        <Button onClick={() => setShowTagEditor(false)}>完成</Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentPage === "strategies" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">策略管理</h2>
                  <div className="flex gap-2">
                    <Button onClick={generateDailyResults} variant="outline">
                      <Zap className="w-4 h-4 mr-2" />
                      执行所有策略
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 策略管理面板 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ClipboardCheck className="w-5 h-5" />
                        策略库
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {strategies.map((strategy) => (
                          <div key={strategy.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <h3 className="font-semibold">{strategy.name}</h3>
                                <p className="text-sm text-muted-foreground">{strategy.type}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => executeStrategy(strategy)}>
                                  选股
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDetailView({ type: "strategy", data: strategy })}
                                >
                                  详情
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{strategy.description}</p>
                            <div className="flex flex-wrap gap-1">
                              {strategy.rules.map((rule, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {rule}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 策略汇总面板 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        策略汇总结果
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* 策略筛选器 */}
                      <div className="mb-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Search className="w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="搜索股票..."
                            value={strategySearchQuery}
                            onChange={(e) => setStrategySearchQuery(e.target.value)}
                            className="max-w-xs"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Filter className="w-4 h-4" />
                            策略筛选:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {availableStrategies.map((strategyName) => (
                              <Badge
                                key={strategyName}
                                variant={activeStrategyFilters.includes(strategyName) ? "default" : "outline"}
                                className="cursor-pointer"
                                onClick={() => {
                                  setActiveStrategyFilters((prev) =>
                                    prev.includes(strategyName)
                                      ? prev.filter((s) => s !== strategyName)
                                      : [...prev, strategyName]
                                  )
                                }}
                              >
                                {strategyName}
                              </Badge>
                            ))}
                            {activeStrategyFilters.length > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setActiveStrategyFilters([])}
                                className="h-6 px-2 text-xs"
                              >
                                重置
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 多策略命中统计 */}
                      <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                        <h4 className="font-medium mb-2">多策略命中统计</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">总股票数:</span>
                            <span className="ml-2 font-medium">{filteredStrategyStocks.length}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">多策略命中:</span>
                            <span className="ml-2 font-medium text-green-600">
                              {filteredStrategyStocks.filter(item => item.strategies.length > 1).length}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 股票列表 */}
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {filteredStrategyStocks
                          .sort((a, b) => b.strategies.length - a.strategies.length) // Sort by strategy count desc
                          .map((item) => (
                          <div
                            key={item.stock.ticker}
                            className={`p-3 border rounded-lg hover:bg-muted/50 transition-colors ${
                              item.strategies.length > 1 ? 'border-green-200 bg-green-50/50' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div>
                                  <div className="font-medium">{item.stock.name}</div>
                                  <div className="text-sm text-muted-foreground">{item.stock.ticker}</div>
                                </div>
                                <div className={`text-sm ${item.stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  ${item.stock.price} ({item.stock.change >= 0 ? '+' : ''}{item.stock.change}%)
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {item.strategies.length > 1 && (
                                  <Badge variant="default" className="bg-green-600">
                                    <Zap className="w-3 h-3 mr-1" />
                                    {item.strategies.length}策略
                                  </Badge>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setDetailView({ type: "stock", data: item.stock })}
                                >
                                  详情
                                </Button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {item.strategies.map((strategyName) => (
                                <Badge key={strategyName} variant="secondary" className="text-xs">
                                  {strategyName}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                        
                        {filteredStrategyStocks.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            {strategyResults.length === 0 ? '点击"执行所有策略"开始分析' : '没有找到符合条件的股票'}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 策略执行历史 */}
                {strategyResults.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        策略执行历史
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {strategyResults.slice(0, 10).map((result, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-4">
                              <div>
                                <div className="font-medium">{result.strategyName}</div>
                                <div className="text-sm text-muted-foreground">
                                  {result.executionTime} • 选出{result.selectedStocks.length}只股票
                                </div>
                              </div>
                              <Badge variant="outline">置信度 {result.confidence}%</Badge>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDetailView({ type: "selection", data: result })}
                            >
                              查看结果
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {currentPage === "plans" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    量化交易计划
                  </h2>
                  <p className="text-gray-600 mt-1">管理基于价格和技术指标的自动化交易策略</p>
                </div>



                <div className="flex gap-1 border border-gray-200 rounded-lg p-1 w-fit">
                  <div
                    className={`px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                      planFilter === "active"
                        ? "bg-gray-900 text-white"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                    onClick={() => setPlanFilter("active")}
                  >
                    活跃计划
                  </div>
                  <div
                    className={`px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                      planFilter === "waiting"
                        ? "bg-gray-900 text-white"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                    onClick={() => setPlanFilter("waiting")}
                  >
                    等待触发
                  </div>
                  <div
                    className={`px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                      planFilter === "completed"
                        ? "bg-gray-900 text-white"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                    onClick={() => setPlanFilter("completed")}
                  >
                    已完成
                  </div>
                  <div
                    className={`px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                      planFilter === "all"
                        ? "bg-gray-900 text-white"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                    onClick={() => setPlanFilter("all")}
                  >
                    全部计划
                  </div>
                </div>

                <div className="space-y-4">
                  {filteredTradingPlans.map((plan) => (
                    <Card
                      key={plan.id}
                      className="border border-gray-200 hover:border-gray-300 transition-colors bg-white"
                    >
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  plan.status === "等待入场"
                                    ? "border-gray-300 text-gray-600"
                                    : plan.status === "已入场"
                                      ? "border-gray-400 text-gray-700 bg-gray-50"
                                      : "border-gray-300 text-gray-500"
                                }`}
                              >
                                {plan.status === "等待入场" ? "等待" : plan.status === "已入场" ? "活跃" : "完成"}
                              </Badge>
                              <Badge variant="outline" className="text-xs border-gray-300 text-gray-600">
                                {plan.type}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
                              <span className="flex items-center gap-1">
                                <span>股票:</span>
                                <span className="font-medium text-gray-700">{plan.ticker}</span>
                              </span>
                              <span>•</span>
                              <span>创建于 {plan.date}</span>
                            </div>

                            <div className="mb-4">
                              <div className="text-sm text-gray-600 mb-2">触发条件</div>
                              <div className="bg-gray-50 border border-gray-200 p-3 rounded-md">
                                <span className="text-sm text-gray-700">价格突破 ${plan.entry}</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="border border-gray-200 p-3 rounded-md">
                                <p className="text-xs text-gray-500 mb-1">目标价格</p>
                                <p className="text-lg font-semibold text-gray-900">${plan.tp}</p>
                              </div>
                              <div className="border border-gray-200 p-3 rounded-md">
                                <p className="text-xs text-gray-500 mb-1">止损价格</p>
                                <p className="text-lg font-semibold text-gray-900">${plan.sl}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 ml-6">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDetailView({ type: "plan", data: plan })}
                              className="border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              详情
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newStatus =
                                  plan.status === "等待入场"
                                    ? "已入场"
                                    : plan.status === "已入场"
                                      ? "已完成"
                                      : "等待入场"
                                setTradingPlans((prev) =>
                                  prev.map((p) => (p.id === plan.id ? { ...p, status: newStatus } : p)),
                                )
                              }}
                              className="border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              {plan.status === "等待入场"
                                ? "标记入场"
                                : plan.status === "已入场"
                                  ? "标记完成"
                                  : "重新激活"}
                            </Button>
                          </div>
                        </div>

                        {plan.notes.length > 0 && (
                          <div className="border-t border-gray-100 pt-4 mt-4">
                            <h5 className="text-sm font-medium text-gray-700 mb-2">最新讨论</h5>
                            <div className="space-y-2">
                              {plan.notes.slice(-2).map((note, index) => (
                                <div key={index} className="bg-gray-50 p-3 rounded-md">
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="text-sm font-medium text-gray-800">{note.user}</span>
                                    <span className="text-xs text-gray-500">{note.date}</span>
                                  </div>
                                  <p className="text-sm text-gray-600">{note.text}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {filteredTradingPlans.length === 0 && (
                    <Card className="border border-gray-200">
                      <CardContent className="py-12">
                        <div className="text-center">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <ClipboardList className="w-6 h-6 text-gray-400" />
                          </div>
                          <h3 className="text-base font-medium text-gray-700 mb-1">没有找到交易计划</h3>
                          <p className="text-sm text-gray-500">创建你的第一个交易计划开始量化交易之路</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {activeTab === "tradingPlans" && (
              <div className="space-y-6">
                <div className="text-center py-12 text-muted-foreground">
                  <p>交易计划功能已整合到主页面中</p>
                </div>
              </div>
            )}

            {/* 交易执行中心页面 */}
            {currentPage === "trading" && (
              <div className="space-y-6">
                {/* 页面标题 */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <Zap className="h-8 w-8 text-blue-600" />
                      交易执行中心
                    </h2>
                    <p className="text-muted-foreground mt-1">管理券商连接、配置交易环境并监控自动执行</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => window.open('/trading', '_blank')}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      打开完整版
                    </Button>
                    <Button variant="outline">
                      <Settings className="w-4 h-4 mr-2" />
                      系统设置
                    </Button>
                  </div>
                </div>

                {/* 系统状态卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100">
                          <Play className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">自动交易</p>
                          <p className="text-lg font-bold text-green-600">运行中</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Activity className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">活跃计划</p>
                          <p className="text-2xl font-bold text-gray-900">3</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">今日执行</p>
                          <p className="text-2xl font-bold text-gray-900">2</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">错误次数</p>
                          <p className="text-2xl font-bold text-red-600">0</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 券商管理区域 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 券商连接状态 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        券商连接状态
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-2xl">🐮</div>
                              <div>
                                <h3 className="font-semibold text-gray-900">富途牛牛</h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span>已连接</span>
                                  <Badge className="bg-blue-100 text-blue-800">模拟盘</Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                切换实盘
                              </Button>
                              <Button variant="outline" size="sm">
                                断开
                              </Button>
                            </div>
                          </div>
                          <div className="mt-3 text-sm text-muted-foreground">
                            <div className="grid grid-cols-2 gap-4">
                              <div>账户: DU1234567</div>
                              <div>可用资金: $85,000</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="border rounded-lg p-4 opacity-60">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-2xl">🐅</div>
                              <div>
                                <h3 className="font-semibold text-gray-900">老虎证券</h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <XCircle className="h-4 w-4 text-gray-400" />
                                  <span>未连接</span>
                                </div>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">
                              连接
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <Button className="w-full" variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          添加券商
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 执行记录 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        最近执行记录
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="border rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">AAPL</span>
                                <Badge variant="default">买入</Badge>
                                <Badge>已成交</Badge>
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                数量: 100 | 价格: $210.50 | 09:30:15
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">$21,050</div>
                              <div className="text-sm text-muted-foreground">手续费: $1.5</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="border rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">TSLA</span>
                                <Badge variant="destructive">卖出</Badge>
                                <Badge variant="secondary">待成交</Badge>
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                数量: 50 | 价格: $195.20 | 14:20:30
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">$9,760</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <Button variant="outline" className="w-full">
                          查看全部记录
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 交易计划监控 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      交易计划监控
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 border rounded-lg">
                        <div>
                          <h3 className="font-semibold">苹果回调买入计划</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span>AAPL</span>
                            <span>触发价: ≤ $210</span>
                            <span>当前价: $215.30</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">监控中</Badge>
                          <Button variant="outline" size="sm">
                            手动执行
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center p-4 border rounded-lg">
                        <div>
                          <h3 className="font-semibold">特斯拉止盈计划</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span>TSLA</span>
                            <span>触发价: ≥ $220</span>
                            <span>当前价: $195.20</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">监控中</Badge>
                          <Button variant="outline" size="sm">
                            暂停监控
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 text-center">
                      <Button variant="outline">
                        查看所有计划
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* 系统控制 */}
                <Card>
                  <CardHeader>
                    <CardTitle>系统控制</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-semibold text-gray-900">自动交易执行</h3>
                        <p className="text-sm text-muted-foreground">
                          启用后，系统将根据交易计划自动执行买卖操作
                        </p>
                      </div>
                      <Button className="flex items-center gap-2">
                        <Pause className="h-4 w-4" />
                        暂停自动交易
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/*  实现心态建设页面功能 */}
            {currentPage === "mindset" && (
              <div className="space-y-6">
                {/* 心态指标卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">交易纪律</p>
                          <p className="text-xl font-semibold text-green-600">85%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Brain className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">情绪控制</p>
                          <p className="text-xl font-semibold text-blue-600">良好</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <Target className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">执行力</p>
                          <p className="text-xl font-semibold text-purple-600">78%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 投资智慧 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      投资智慧
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        {
                          title: "巴菲特：时间是优秀企业的朋友",
                          content:
                            "时间是优秀企业的朋友，是平庸企业的敌人。你可能认为这个原则平淡无奇，但我从实际经验中发现，能够真正按照这个原则行事的人少之又少。",
                          author: "沃伦·巴菲特",
                          category: "长期投资",
                        },
                        {
                          title: "索罗斯：承认错误是力量的源泉",
                          content: "我能够承认错误，这是我的力量源泉。我关心的不是对错，而是赚了多少钱。",
                          author: "乔治·索罗斯",
                          category: "风险管理",
                        },
                        {
                          title: "彼得·林奇：投资你了解的公司",
                          content:
                            "永远不要投资你不了解其财务状况的公司。最大的损失来自于投资了业绩不佳的公司，而不是没有投资业绩优秀的公司。",
                          author: "彼得·林奇",
                          category: "选股策略",
                        },
                      ].map((wisdom, index) => (
                        <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                          <h4 className="font-semibold text-sm mb-1">{wisdom.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{wisdom.content}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-blue-600">— {wisdom.author}</span>
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">{wisdom.category}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* 情绪日记 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PenTool className="w-5 h-5" />
                      交易情绪日记
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input placeholder="今天的交易心情如何？记录下来..." className="flex-1" />
                        <Button>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {[
                          {
                            date: "2024-01-15",
                            mood: "焦虑",
                            content: "今天看到账户亏损，有点焦虑。需要提醒自己坚持长期策略。",
                            color: "red",
                          },
                          {
                            date: "2024-01-14",
                            mood: "平静",
                            content: "按计划执行交易，心态平和。这种状态很好。",
                            color: "green",
                          },
                        ].map((entry, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className={`text-xs px-2 py-1 rounded text-white bg-${entry.color}-500`}>
                                {entry.mood}
                              </span>
                              <span className="text-xs text-muted-foreground">{entry.date}</span>
                            </div>
                            <p className="text-sm">{entry.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/*  实现交易复盘页面功能 */}
            {currentPage === "review" && (
              <div className="space-y-6">
                {/* 复盘统计卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">总收益率</p>
                          <p className="text-xl font-semibold text-green-600">+12.5%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Target className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">胜率</p>
                          <p className="text-xl font-semibold text-blue-600">68%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <BarChart3 className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">盈亏比</p>
                          <p className="text-xl font-semibold text-purple-600">2.1:1</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <Activity className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">交易次数</p>
                          <p className="text-xl font-semibold text-orange-600">47</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 交易记录表格 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardList className="w-5 h-5" />
                      交易记录
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">日期</th>
                            <th className="text-left p-2">股票</th>
                            <th className="text-left p-2">操作</th>
                            <th className="text-left p-2">价格</th>
                            <th className="text-left p-2">数量</th>
                            <th className="text-left p-2">盈亏</th>
                            <th className="text-left p-2">策略</th>
                            <th className="text-left p-2">复盘</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            {
                              date: "2024-01-15",
                              stock: "贵州茅台",
                              action: "卖出",
                              price: "1680.00",
                              quantity: "100",
                              profit: "+8.5%",
                              strategy: "龙头战法",
                              reviewed: true,
                            },
                            {
                              date: "2024-01-12",
                              stock: "宁德时代",
                              action: "买入",
                              price: "185.50",
                              quantity: "200",
                              profit: "-2.1%",
                              strategy: "趋势突破",
                              reviewed: false,
                            },
                            {
                              date: "2024-01-10",
                              stock: "比亚迪",
                              action: "卖出",
                              price: "245.80",
                              quantity: "150",
                              profit: "+15.2%",
                              strategy: "熊市抗跌",
                              reviewed: true,
                            },
                          ].map((trade, index) => (
                            <tr key={index} className="border-b hover:bg-gray-50">
                              <td className="p-2">{trade.date}</td>
                              <td className="p-2 font-medium">{trade.stock}</td>
                              <td className="p-2">
                                <span
                                  className={`px-2 py-1 rounded text-xs ${
                                    trade.action === "买入" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                                  }`}
                                >
                                  {trade.action}
                                </span>
                              </td>
                              <td className="p-2">¥{trade.price}</td>
                              <td className="p-2">{trade.quantity}</td>
                              <td className="p-2">
                                <span
                                  className={`font-medium ${
                                    trade.profit.startsWith("+") ? "text-green-600" : "text-red-600"
                                  }`}
                                >
                                  {trade.profit}
                                </span>
                              </td>
                              <td className="p-2">
                                <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs">
                                  {trade.strategy}
                                </span>
                              </td>
                              <td className="p-2">
                                <Button variant={trade.reviewed ? "outline" : "default"} size="sm" className="text-xs">
                                  {trade.reviewed ? "已复盘" : "待复盘"}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* 复盘笔记 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      复盘笔记
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input placeholder="记录今天的交易心得和反思..." className="flex-1" />
                        <Button>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {[
                          {
                            date: "2024-01-15",
                            title: "茅台卖出复盘",
                            content:
                              "在1680价位卖出茅台是正确的决策，符合龙头战法的止盈策略。下次可以考虑分批卖出以获得更好的收益。",
                            tags: ["龙头战法", "止盈策略"],
                          },
                          {
                            date: "2024-01-12",
                            title: "宁德时代买入反思",
                            content: "买入时机稍早，应该等待更明确的突破信号。需要加强对趋势突破策略的理解和执行。",
                            tags: ["趋势突破", "时机把握"],
                          },
                        ].map((note, index) => (
                          <div key={index} className="p-4 border rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium">{note.title}</h4>
                              <span className="text-xs text-muted-foreground">{note.date}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{note.content}</p>
                            <div className="flex gap-2">
                              {note.tags.map((tag, tagIndex) => (
                                <span key={tagIndex} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/*  实现大佬追踪页面功能 */}
            {currentPage === "influencer" && (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold">大佬追踪</h2>
                    <p className="text-muted-foreground">自动化监控投资大佬动态和观点</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      添加大佬
                    </Button>
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4 mr-2" />
                      脚本设置
                    </Button>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{influencers.length}</p>
                          <p className="text-sm text-muted-foreground">追踪大佬</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Activity className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{scripts.filter((s) => s.status === "running").length}</p>
                          <p className="text-sm text-muted-foreground">运行脚本</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <MessageSquare className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{influencerPosts.length}</p>
                          <p className="text-sm text-muted-foreground">今日观点</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <TrendingUp className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">78%</p>
                          <p className="text-sm text-muted-foreground">平均准确率</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column - Influencer Management */}
                  <div className="lg:col-span-1 space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="w-5 h-5" />
                          大佬管理
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {influencers.map((influencer) => (
                          <div key={influencer.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <img
                                src={influencer.avatar || "/placeholder.svg"}
                                alt={influencer.name}
                                className="w-10 h-10 rounded-full"
                              />
                              <div>
                                <p className="font-medium">{influencer.name}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{influencer.platform}</span>
                                  <span>•</span>
                                  <span>{influencer.followers}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant={influencer.status === "active" ? "default" : "secondary"}>
                                {influencer.status === "active" ? "活跃" : "停用"}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">准确率: {influencer.accuracy}</p>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* Script Status */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Bot className="w-5 h-5" />
                          脚本状态
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {scripts.map((script) => (
                          <div key={script.id} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium">{script.name}</p>
                              <Badge variant={script.status === "running" ? "default" : "secondary"}>
                                {script.status === "running" ? "运行中" : "已停止"}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <p>平台: {script.platform}</p>
                              <p>监控大佬: {script.influencerCount}位</p>
                              <p>今日抓取: {script.postsToday}条</p>
                              <p>下次运行: {script.nextRun}</p>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column - Posts and Analysis */}
                  <div className="lg:col-span-2 space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MessageSquare className="w-5 h-5" />
                          最新观点
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {influencerPosts.map((post) => (
                          <div key={post.id} className="p-4 border rounded-lg">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-sm font-medium text-blue-600">{post.influencerName[0]}</span>
                                </div>
                                <div>
                                  <p className="font-medium">{post.influencerName}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{post.platform}</span>
                                    <span>•</span>
                                    <span>{post.timestamp}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {post.relatedStock && <Badge variant="outline">{post.relatedStock}</Badge>}
                                <Badge
                                  variant={
                                    post.sentiment === "positive"
                                      ? "default"
                                      : post.sentiment === "negative"
                                        ? "destructive"
                                        : "secondary"
                                  }
                                >
                                  {post.sentiment === "positive"
                                    ? "看涨"
                                    : post.sentiment === "negative"
                                      ? "看跌"
                                      : "中性"}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-sm mb-3">{post.content}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Heart className="w-3 h-3" />
                                  {post.likes}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MessageCircle className="w-3 h-3" />
                                  {post.comments}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm">
                                  <Bell className="w-3 h-3 mr-1" />
                                  设置提醒
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Plus className="w-3 h-3 mr-1" />
                                  创建计划
                                </Button>
                              </div>
                            </div>
                            {post.keywords.length > 0 && (
                              <div className="flex gap-1 mt-3">
                                {post.keywords.map((keyword, index) => (
                                  <span key={index} className="px-2 py-1 bg-muted text-xs rounded">
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* 添加交易计划对话框 */}
      <Dialog open={showPlanForm} onOpenChange={setShowPlanForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedStock ? `为 ${selectedStock.name} 创建交易计划` : "创建交易计划"}
            </DialogTitle>
          </DialogHeader>
          <TradingPlanForm
            stock={selectedStock}
            onSave={(plan) => {
              setTradingPlans((prev) => [plan, ...prev])
              setShowPlanForm(false)
              setSelectedStock(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* 添加情报/提醒对话框 */}
      <Dialog open={showIntelForm} onOpenChange={setShowIntelForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedStock ? `为 ${selectedStock.name} 添加情报` : "添加情报"}
            </DialogTitle>
          </DialogHeader>
          <IntelNoteForm
            stock={selectedStock}
            onSave={(note) => {
              if (selectedStock) {
                setStockPoolData((prev) =>
                  prev.map((s) => 
                    s.ticker === selectedStock.ticker 
                      ? { ...s, intelNotes: [...s.intelNotes, note] } 
                      : s
                  )
                )
              }
              setShowIntelForm(false)
              setSelectedStock(null)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TradingPlanDetail({ plan, onUpdate }: { plan: TradingPlan; onUpdate: (plan: TradingPlan) => void }) {
  const [newNote, setNewNote] = useState("")

  const addNote = () => {
    if (newNote.trim()) {
      const updatedPlan = {
        ...plan,
        notes: [
          ...plan.notes,
          {
            user: "自己",
            text: newNote.trim(),
            date: new Date().toLocaleString("zh-CN"),
            type: "comment" as const,
          },
        ],
      }
      onUpdate(updatedPlan)
      setNewNote("")
    }
  }

  return (
    <div className="space-y-6">
      {/* Plan Overview */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">交易参数</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">股票:</span>
                <span className="font-medium">{plan.ticker}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">入场价:</span>
                <span className="font-medium">${plan.entry}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">目标价:</span>
                <span className="font-medium text-green-600">${plan.tp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">止损价:</span>
                <span className="font-medium text-red-600">${plan.sl}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">风险回报比:</span>
                <span className="font-medium">
                  {plan.tp && plan.sl ? `1:${((plan.tp - plan.entry) / (plan.entry - plan.sl)).toFixed(2)}` : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2">交易理由</h4>
          <p className="text-sm text-muted-foreground">{plan.reason}</p>
        </div>
      </div>

      {/* Notes and Discussion */}
      <div>
        <h4 className="font-semibold mb-4">交易笔记与讨论</h4>
        <div className="space-y-3 mb-4">
          {plan.notes.map((note, index) => (
            <div key={index} className="bg-muted p-3 rounded">
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium">{note.user}</span>
                <span className="text-xs text-muted-foreground">{note.date}</span>
              </div>
              <p className="text-sm">{note.text}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="添加交易笔记..."
            onKeyPress={(e) => e.key === "Enter" && addNote()}
          />
          <Button onClick={addNote} disabled={!newNote.trim()}>
            添加
          </Button>
        </div>
      </div>
    </div>
  )
}

interface IntelNoteFormProps {
  stock: StockData
  onSave: (note: IntelNote) => void
}

function IntelNoteForm({ stock, onSave }: { stock?: StockData | null, onSave: (note: IntelNote) => void }) {
  const [text, setText] = useState("")
  const [alertExpression, setAlertExpression] = useState("")
  const [author, setAuthor] = useState("")
  const [showExpressionBuilder, setShowExpressionBuilder] = useState(false)

  const [conditionType, setConditionType] = useState("price")
  const [indicator, setIndicator] = useState("EMA")
  const [period, setPeriod] = useState("55")
  const [operator, setOperator] = useState("cross_above")
  const [value, setValue] = useState("")
  const [volumeCondition, setVolumeCondition] = useState("")

  const buildExpression = () => {
    let expression = ""

    if (conditionType === "price") {
      expression = `price ${operator === "cross_above" ? "突破" : operator === "cross_below" ? "跌破" : operator} ${value}`
    } else if (conditionType === "technical") {
      if (indicator === "EMA" || indicator === "SMA") {
        expression = `price ${operator === "cross_above" ? "突破" : operator === "cross_below" ? "跌破" : operator} ${indicator}(${period})`
      } else if (indicator === "RSI") {
        expression = `RSI(${period}) ${operator} ${value}`
      } else if (indicator === "MACD") {
        expression = `MACD ${operator === "cross_above" ? "金叉" : operator === "cross_below" ? "死叉" : operator}`
      } else if (indicator === "KDJ") {
        expression = `KDJ ${operator === "cross_above" ? "金叉" : operator === "cross_below" ? "死叉" : operator}`
      }
    } else if (conditionType === "volume") {
      expression = `成交量 ${operator} ${volumeCondition}`
    }

    setAlertExpression(expression)
    setShowExpressionBuilder(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (text.trim()) {
      onSave({
        text: text.trim(),
        alertExpression: alertExpression.trim(),
        triggered: false,
        author: author.trim() || "自己",
        timestamp: new Date().toLocaleString("zh-CN"),
        content: text.trim(),
      })
      setText("")
      setAlertExpression("")
      setAuthor("")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">情报内容</label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="例如：大佬A认为日K回踩EMA55是买入机会"
          rows={3}
          required
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">提醒条件 (技术指标)</label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowExpressionBuilder(!showExpressionBuilder)}
          >
            {showExpressionBuilder ? "收起" : "构建条件"}
          </Button>
        </div>

        {showExpressionBuilder && (
          <Card className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>条件类型</Label>
                <Select value={conditionType} onValueChange={setConditionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price">价格条件</SelectItem>
                    <SelectItem value="technical">技术指标</SelectItem>
                    <SelectItem value="volume">成交量条件</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {conditionType === "technical" && (
                <div>
                  <Label>技术指标</Label>
                  <Select value={indicator} onValueChange={setIndicator}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMA">EMA均线</SelectItem>
                      <SelectItem value="SMA">SMA均线</SelectItem>
                      <SelectItem value="RSI">RSI指标</SelectItem>
                      <SelectItem value="MACD">MACD指标</SelectItem>
                      <SelectItem value="KDJ">KDJ指标</SelectItem>
                      <SelectItem value="BOLL">布林带</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(indicator === "EMA" || indicator === "SMA" || indicator === "RSI") && conditionType === "technical" && (
                <div>
                  <Label>周期参数</Label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5日</SelectItem>
                      <SelectItem value="10">10日</SelectItem>
                      <SelectItem value="20">20日</SelectItem>
                      <SelectItem value="55">55日</SelectItem>
                      <SelectItem value="14">14日(RSI)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>操作符</Label>
                <Select value={operator} onValueChange={setOperator}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cross_above">突破/金叉</SelectItem>
                    <SelectItem value="cross_below">跌破/死叉</SelectItem>
                    <SelectItem value=">">大于</SelectItem>
                    <SelectItem value="<">小于</SelectItem>
                    <SelectItem value=">=">大于等于</SelectItem>
                    <SelectItem value="<=">小于等于</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {conditionType === "price" && (
                <div>
                  <Label>价格值</Label>
                  <Input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="185.00"
                    type="number"
                    step="0.01"
                  />
                </div>
              )}

              {conditionType === "technical" && indicator === "RSI" && (
                <div>
                  <Label>RSI数值</Label>
                  <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="70" type="number" />
                </div>
              )}

              {conditionType === "volume" && (
                <div>
                  <Label>成交量条件</Label>
                  <Select value={volumeCondition} onValueChange={setVolumeCondition}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="昨日1.5倍">昨日1.5倍</SelectItem>
                      <SelectItem value="昨日2倍">昨日2倍</SelectItem>
                      <SelectItem value="5日均量1.2倍">5日均量1.2倍</SelectItem>
                      <SelectItem value="10日均量1.5倍">10日均量1.5倍</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowExpressionBuilder(false)}>
                取消
              </Button>
              <Button type="button" onClick={buildExpression}>
                生成条件
              </Button>
            </div>
          </Card>
        )}

        <Input
          value={alertExpression}
          onChange={(e) => setAlertExpression(e.target.value)}
          placeholder="例如：price 突破 EMA(55) 且 成交量 > 昨日1.5倍"
        />
        <p className="text-xs text-muted-foreground mt-1">
          支持技术指标：EMA回踩、RSI超买超卖、MACD金叉死叉、成交量放大等
        </p>
      </div>

      <div>
        <label className="text-sm font-medium">作者 (可选)</label>
        <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="例如：大佬A" />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit">添加情报</Button>
      </div>
    </form>
  )
}

interface TradingPlanFormProps {
  onSave: (plan: TradingPlan) => void
}

function TradingPlanForm({ stock, onSave }: { stock?: StockData | null, onSave: (plan: TradingPlan) => void }) {
  const [ticker, setTicker] = useState(stock?.ticker || "")
  const [name, setName] = useState(stock ? `${stock.name}交易计划` : "")
  const [type, setType] = useState("")
  const [status, setStatus] = useState("等待入场")
  const [entry, setEntry] = useState(stock?.price || 0)
  const [tp, setTp] = useState(stock ? stock.price * 1.1 : 0)
  const [sl, setSl] = useState(stock ? stock.price * 0.95 : 0)
  const [date, setDate] = useState("2025-08-23") // 固定日期避免hydration错误
  const [reason, setReason] = useState("基于技术分析创建")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      id: Date.now(), // 使用时间戳生成唯一ID
      ticker,
      name,
      type,
      status,
      entry,
      tp,
      sl,
      date,
      reason,
      notes: [],
    })
    // Reset form
    setTicker("")
    setName("")
    setType("")
    setStatus("等待入场")
    setEntry(0)
    setTp(0)
    setSl(0)
    setDate("2025-08-23") // 固定日期避免hydration错误
    setReason("基于技术分析创建")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="ticker">股票代码</Label>
        <Input type="text" id="ticker" value={ticker} onChange={(e) => setTicker(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="name">计划名称</Label>
        <Input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="type">策略类型</Label>
        <Input type="text" id="type" value={type} onChange={(e) => setType(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="status">计划状态</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue placeholder="选择状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="等待入场">等待入场</SelectItem>
            <SelectItem value="已入场">已入场</SelectItem>
            <SelectItem value="已完成">已完成</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="entry">入场价格</Label>
        <Input
          type="number"
          id="entry"
          value={entry}
          onChange={(e) => setEntry(Number.parseFloat(e.target.value))}
          required
        />
      </div>
      <div>
        <Label htmlFor="tp">目标价格</Label>
        <Input type="number" id="tp" value={tp} onChange={(e) => setTp(Number.parseFloat(e.target.value))} required />
      </div>
      <div>
        <Label htmlFor="sl">止损价格</Label>
        <Input type="number" id="sl" value={sl} onChange={(e) => setSl(Number.parseFloat(e.target.value))} required />
      </div>
      <div>
        <Label htmlFor="date">计划日期</Label>
        <Input type="date" id="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="reason">交易理由</Label>
        <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
      </div>
      <Button type="submit">创建计划</Button>
    </form>
  )
}
