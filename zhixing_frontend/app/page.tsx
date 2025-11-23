'use client'

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  ChevronUp,
  ChevronDown,
  Folder,
  Flame,
  Lightbulb,
  Menu,
} from "lucide-react"

// 导入策略管理组件
// import StrategyManagement from '@/components/strategies/StrategyManagement' // 暂时不需要

import { StockList } from '@/components/stocks/StockList'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import DataSyncButton from '@/components/common/DataSyncButton'
import CategorySelector from '@/components/categories/CategorySelector'

// 导入交易和笔记视图组件
import TradesView from '@/components/trades/TradesView'
import NotesView from '@/components/notes/NotesView'
import UnifiedNoteDialog from '@/components/notes/UnifiedNoteDialog'
import type { Note, NoteTag } from '@/app/notes/types'
import { mockTags as noteMockTags } from '@/app/notes/mockData'
import BrokersView from '@/components/brokers/BrokersView'
import CategoriesView from '@/components/categories/CategoriesView'
import ReviewView from '@/components/review/ReviewView'
import StrategiesView from '@/components/strategies/StrategiesView'
import ChecklistView from '@/components/checklist/ChecklistView'
import PsychologyView from '@/components/psychology/PsychologyView'
import ErrorsView from '@/components/errors/ErrorsView'
import PivotView from '@/components/pivot/PivotView'
import MarketOpportunityView from '@/components/market/MarketOpportunityView'
import MarketSentimentMonitor from '@/components/market/MarketSentimentMonitor'
import FearGreedMonitor from '@/components/market/FearGreedMonitor'

import TradingDisciplineReminder from "@/components/trading/TradingDisciplineReminder"
import TradingPatternTracker from "@/components/trading/TradingPatternTracker"
import ReverseAlertSystem from "@/components/trading/ReverseAlertSystem"
import TradingHealthCenter from "@/components/trading/TradingHealthCenter"
import TechnicalPatternScanner from "@/components/market/TechnicalPatternScanner"
import WisdomLibrary from "@/components/wisdom/WisdomLibrary"
import KeyMetrics from "@/components/dashboard/KeyMetrics"
import TradeHeatmap from "@/components/dashboard/TradeHeatmap"

// 导入Mock数据
import { getMockStocks } from './mockStockData'

interface Stock {
  id: number
  symbol: string
  name: string
  market?: string
  group_name?: string
  concepts?: string[]
  updated_at?: string
  price?: number | null
  change_percent?: number | null
}

export default function TradingSystem() {
  const router = useRouter()
  
  // 页面状态
  const [currentPage, setCurrentPage] = useState("dashboard")
  const [searchQuery, setSearchQuery] = useState("")
  
  // 导入自选股相关
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string>("")
  
  // 股票数据状态
  const [backendStocks, setBackendStocks] = useState<Stock[]>([])
  const [page, setPage] = useState<number>(1)
  const pageSize = 20
  const [total, setTotal] = useState<number>(0)
  
  // 分类筛选状态
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  // 监听 URL hash，实现页内“菜单”跳转（如 #categories）
  useEffect(() => {
    const applyHash = () => {
      if (typeof window === 'undefined') return
      const hash = window.location.hash.replace('#', '')
      if (!hash) return
      const valid = [
        'dashboard','categories','trades','notes','review','strategies','checklist','psychology','wisdom','errors','pivot','brokers','health','patterns'
      ]
      if (valid.includes(hash)) setCurrentPage(hash)
    }
    applyHash()
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
  }, [])

  // 当前页变化时，同步到 hash，保证外部跳转可用
  useEffect(() => {
    if (typeof window === 'undefined') return
    // 如果当前 URL 已携带了有效 hash（如从 /trade/[id] 返回到 /#trades），
    // 则优先尊重现有 hash，避免初次渲染时被覆盖回 dashboard
    const existing = window.location.hash.replace('#', '')
    const valid = [
      'dashboard','categories','trades','notes','review','strategies','checklist','psychology','wisdom','errors','pivot','brokers','health','patterns'
    ]
    if (existing && valid.includes(existing) && existing !== currentPage) {
      // 不覆盖由外部显式指定的 hash
      return
    }
    const target = `#${currentPage}`
    if (window.location.hash !== target) {
      window.history.replaceState(null, '', target)
    }
  }, [currentPage])
  
  // 快速操作状态
  const [showAddNoteDialog, setShowAddNoteDialog] = useState(false)
  const [noteEditorOpen, setNoteEditorOpen] = useState(false)
  const [showAddAlertDialog, setShowAddAlertDialog] = useState(false)
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null)

  
  // 排序状态
  const [sortField, setSortField] = useState<string>('updated_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // 价格筛选状态
  const [priceRange, setPriceRange] = useState<{min?: number, max?: number}>({})
  const [changePercentRange, setChangePercentRange] = useState<{min?: number, max?: number}>({})
  const [showPriceFilter, setShowPriceFilter] = useState(false)
  const [showChangePercentFilter, setShowChangePercentFilter] = useState(false)
  
  // 恐慌指数面板状态
  const [showFearIndexPanel, setShowFearIndexPanel] = useState(false)
  
  // 熔断状态
  const [isCircuitBreakerActive, setIsCircuitBreakerActive] = useState(false)

  // 移动端侧边栏状态
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  // 处理排序点击
  const handleSort = (field: string) => {
    if (sortField === field) {
      // 如果点击的是当前排序字段，切换排序顺序
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // 如果点击的是新字段，设置为该字段并默认降序
      setSortField(field)
      setSortOrder('desc')
    }
    setPage(1) // 重置到第一页
  }

  // 获取后端股票数据
  async function fetchBackendStocks() {
    try {
      // 使用Mock数据（临时替代后端API）
      const mockResponse = getMockStocks({
        page,
        pageSize,
        sortField,
        sortOrder,
        priceMin: priceRange.min,
        priceMax: priceRange.max,
        changePercentMin: changePercentRange.min,
        changePercentMax: changePercentRange.max,
      });
      
      console.log('Using mock data:', mockResponse);
      setBackendStocks(mockResponse.items);
      setTotal(mockResponse.total);
      
      /* TODO: 实际使用时切换回后端API
      const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
      let url = `${base}/api/v1/stocks/overview?page=${page}&page_size=${pageSize}`
      
      // 使用分类筛选
      if (selectedCategoryId) {
        // 通过分类ID获取股票
        url = `${base}/api/v1/categories/${selectedCategoryId}/stocks?page=${page}&page_size=${pageSize}`
      }
      // 添加排序参数
      url += `&sort_field=${sortField}&sort_order=${sortOrder}`
      
      // 添加价格筛选参数
      if (priceRange.min !== undefined) {
        url += `&price_min=${priceRange.min}`
      }
      if (priceRange.max !== undefined) {
        url += `&price_max=${priceRange.max}`
      }
      if (changePercentRange.min !== undefined) {
        url += `&change_percent_min=${changePercentRange.min}`
      }
      if (changePercentRange.max !== undefined) {
        url += `&change_percent_max=${changePercentRange.max}`
      }
      
      console.log('Fetching stocks with URL:', url)
      const res = await fetch(url)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(String(data?.detail || data?.message || `HTTP ${res.status}`))
      
      let stocks = []
      let total = 0
      
      // 根据不同的API返回格式处理数据
      if (selectedCategoryId) {
        // 分类API返回格式：data.stocks
        stocks = data?.data?.stocks || []
        total = data?.data?.total || stocks.length
      } else {
        // 普通股票API返回格式：data.stocks
        stocks = data?.data?.stocks || []
        total = data?.data?.total || 0
      }
      
      setBackendStocks(stocks.map((s: any) => ({
        id: s.id || 0,
        symbol: s.code || s.symbol || '',
        name: s.name || '',
        market: s.market || '',
        group_name: s.group_name || '',
        concepts: s.concepts || [],
        updated_at: s.updated_at || '',
        price: s.price,
        change_percent: s.change_percent
      })))
      setTotal(total)
      */
    } catch (err) {
      console.error('fetch backend stocks error', err)
    }
  }

  // CSV 导入相关函数
  const triggerPickCsv = () => {
    fileInputRef.current?.click()
  }

  const handleCsvPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setImporting(true)
    setImportMsg("正在处理文件...")
    
    // 这里可以添加CSV处理逻辑
    setTimeout(() => {
      setImporting(false)
      setImportMsg("导入成功!")
      setTimeout(() => setImportMsg(""), 3000)
    }, 2000)
  }


  // 当页码变化时重新获取数据
  useEffect(() => {
    fetchBackendStocks() 
  }, [page])

  // 当选中分类变化时，重置页码并重新获取数据
  useEffect(() => {
    if (selectedCategoryId !== null) {
      setPage(1)
    }
    fetchBackendStocks() 
  }, [selectedCategoryId])

  // 当排序条件变化时重新获取数据
  useEffect(() => {
    fetchBackendStocks() 
  }, [sortField, sortOrder])

  // 当价格筛选条件变化时重新获取数据
  useEffect(() => {
    setPage(1) // 重置到第一页
    fetchBackendStocks() 
  }, [priceRange, changePercentRange])

  // 点击外部关闭筛选器
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Element
      if (!target.closest('.price-filter-popup') && !target.closest('.price-filter-button')) {
        setShowPriceFilter(false)
      }
      if (!target.closest('.change-percent-filter-popup') && !target.closest('.change-percent-filter-button')) {
        setShowChangePercentFilter(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 模拟触发的提醒
  const triggeredAlerts: { ticker: string; message: string }[] = []

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`
          fixed inset-y-0 left-0 z-50 w-64 flex-shrink-0 bg-sidebar border-r border-sidebar-border p-6
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:block
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="flex items-center gap-3 mb-8">
            <BarChart3 className="w-8 h-8 text-sidebar-primary" />
            <h1 className="text-xl font-bold text-sidebar-foreground">QuantMind</h1>
          </div>

          <nav className="space-y-2">
            {[ 
              { id: "dashboard", label: "股票", icon: Heart },
              { id: "categories", label: "分类", icon: Folder },
              { id: "trades", label: "交易", icon: DollarSign },
              { id: "notes", label: "笔记", icon: PenTool },
              { id: "review", label: "复盘", icon: BookOpen },
              { id: "strategies", label: "策略", icon: Target },
              { id: "psychology", label: "心理", icon: Brain },
              { id: "health", label: "体检中心", icon: Shield },
              { id: "wisdom", label: "智慧库", icon: Lightbulb },
              { id: "brokers", label: "券商", icon: Settings },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setCurrentPage(id)
                  setIsSidebarOpen(false) // Close sidebar on mobile click
                  if (typeof window !== 'undefined') {
                    const target = `#${id}`
                    if (window.location.hash !== target) {
                      window.history.replaceState(null, '', target)
                    }
                  }
                }}
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
        <div className="flex-1 min-w-0">
          {/* Header */}
          <header className="bg-sidebar border-b border-sidebar-border px-6 py-4 sticky top-0 z-30">
            <div className="flex items-center justify-between gap-4">
              {/* Left Section - Title and Alerts */}
              <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
                {/* Hamburger Menu for Mobile */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden -ml-2"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                  <Menu className="w-6 h-6" />
                </Button>

                <h2 className="text-lg md:text-xl font-semibold text-sidebar-foreground whitespace-nowrap">
                  {currentPage === "dashboard" && "股票"}
                  {currentPage === "trades" && "交易"}
                  {currentPage === "notes" && "笔记"}
                  {currentPage === "categories" && "分类"}
                  {currentPage === "review" && "复盘"}
                  {currentPage === "strategies" && "策略"}
                  {currentPage === "psychology" && "心理"}
                  {currentPage === "health" && "体检中心"}
                  {currentPage === "wisdom" && "智慧库"}
                  {currentPage === "brokers" && "券商"}
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

              {/* Right Section - Search and Actions */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索代码/名称/概念..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage('health')}
                  title="查看交易健康状况"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  体检中心
                </Button>
                <NotificationCenter />
                <Button variant="ghost" size="icon">
                  <Settings className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-4 lg:p-6">
            {/* 智能提醒系统 - 只在有重要提醒时显示 */}
            <ReverseAlertSystem 
              variant="banner"
              autoCheck={true}
              checkInterval={60}
            />

            {currentPage === "dashboard" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* 1. 核心指标卡片 */}
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-muted-foreground">Overview</h3>
                  <KeyMetrics />
                </div>

                {/* 2. 交易热力图 */}
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-muted-foreground">Trading Activity</h3>
                  <TradeHeatmap />
                </div>

                {/* 3. 底部快捷入口 */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="bg-card/50 backdrop-blur-sm border-none shadow-lg hover:bg-card/80 transition-colors cursor-pointer" onClick={() => setCurrentPage('trades')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Recent Trades</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">12</div>
                      <p className="text-xs text-muted-foreground">
                        Trades this week
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card/50 backdrop-blur-sm border-none shadow-lg hover:bg-card/80 transition-colors cursor-pointer" onClick={() => setCurrentPage('strategies')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Strategies</CardTitle>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">3</div>
                      <p className="text-xs text-muted-foreground">
                        Running currently
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {currentPage === "plans" && (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium mb-2">交易计划</h3>
                <p className="text-muted-foreground">功能开发中...</p>
              </div>
            )}

            {currentPage === "trades" && (
              <TradesView />
            )}

            {currentPage === "notes" && (
              <NotesView />
            )}

            {currentPage === "categories" && (
              <CategoriesView />
            )}

            {currentPage === "market" && (
              <MarketOpportunityView />
            )}

            {currentPage === "sentiment" && (
              <MarketSentimentMonitor />
            )}

            {currentPage === "review" && (
              <ReviewView />
            )}

            {currentPage === "strategies" && (
              <StrategiesView />
            )}

            {currentPage === "checklist" && (
              <ChecklistView />
            )}

            {currentPage === "psychology" && (
              <PsychologyView />
            )}

            {currentPage === "wisdom" && (
              <WisdomLibrary />
            )}

            {currentPage === "errors" && (
              <ErrorsView />
            )}

            {currentPage === "pivot" && (
              <PivotView />
            )}

            {currentPage === "brokers" && (
              <BrokersView />
            )}

            {currentPage === "health" && (
              <TradingHealthCenter />
            )}

            {currentPage === "patterns" && (
              <TechnicalPatternScanner variant="full" autoRefresh={true} refreshInterval={300} />
            )}

          </main>
        </div>
      </div>
      
      {/* 统一笔记弹框 */}
      <UnifiedNoteDialog
        open={noteEditorOpen}
        onClose={() => setNoteEditorOpen(false)}
        preset={selectedStock ? { symbol: selectedStock.symbol, symbolName: selectedStock.name, relatedType: 'stock' } : undefined}
        locks={{ symbol: true }}
        onSave={() => { setNoteEditorOpen(false) }}
      />
      
      {/* 设定提醒对话框（样式与 NoteEditor 对齐）*/}
      <Dialog open={showAddAlertDialog} onOpenChange={setShowAddAlertDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>为 {selectedStock?.name} ({selectedStock?.symbol}) 设定提醒</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>提醒类型</Label>
              <Select defaultValue="price">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price">价格提醒</SelectItem>
                  <SelectItem value="change">涨跌幅提醒</SelectItem>
                  <SelectItem value="volume">成交量提醒</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>触发条件</Label>
              <Select defaultValue="above">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="above">价格高于</SelectItem>
                  <SelectItem value="below">价格低于</SelectItem>
                </SelectContent>
              </Select>
              <Input id="alert-value" type="number" placeholder="输入目标价格" step="0.01" />
            </div>
            <div className="space-y-2">
              <Label>备注（可选）</Label>
              <Textarea id="alert-note" placeholder="提醒原因或说明..." rows={6} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAlertDialog(false)}>
              取消
            </Button>
            <Button onClick={() => {
              setShowAddAlertDialog(false)
            }}>
              <Bell className="w-4 h-4 mr-2" />
              设定提醒
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}