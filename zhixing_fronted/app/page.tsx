'use client'

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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
  ChevronUp,
  ChevronDown,
} from "lucide-react"

// 导入策略管理组件
import StrategyManagement from '@/components/strategies/StrategyManagement'

import { StockList } from '@/components/stocks/StockList'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import DataSyncButton from '@/components/common/DataSyncButton'
import CategorySelector from '@/components/categories/CategorySelector'

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
  
  // 排序状态
  const [sortField, setSortField] = useState<string>('updated_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // 价格筛选状态
  const [priceRange, setPriceRange] = useState<{min?: number, max?: number}>({})
  const [changePercentRange, setChangePercentRange] = useState<{min?: number, max?: number}>({})
  const [showPriceFilter, setShowPriceFilter] = useState(false)
  const [showChangePercentFilter, setShowChangePercentFilter] = useState(false)
  

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
                  {currentPage === "dashboard" && "自选股票"}
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
                <div className="flex items-center gap-2">
                  <NotificationCenter />
                  <Button variant="ghost" size="icon">
                    <Settings className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="px-6 py-4">
            {currentPage === "dashboard" && (
              <div className="space-y-6">
                {/* 价格数据同步 */}
                <Card>
                  <CardHeader>
                    <CardTitle>价格数据同步</CardTitle>
                    <p className="text-sm text-gray-600">从雅虎财经同步自选股的最新价格和K线数据</p>
                  </CardHeader>
                  <CardContent>
                    <DataSyncButton 
                      onSyncComplete={(result) => {
                        console.log('同步完成:', result)
                        // 同步完成后可以刷新自选股列表
                        fetchBackendStocks()
                      }}
                      showProgress={true}
                      autoRefresh={true}
                    />
                  </CardContent>
                </Card>

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
                    {/* 多级分类树选择器 */}
                    <div className="mb-6">
                      <CategorySelector 
                        onSelectCategory={setSelectedCategoryId}
                        selectedCategoryId={selectedCategoryId}
                        compact={true}
                      />
                    </div>

                    {/* Stock Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th 
                              className="text-left p-2 cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort('name')}
                            >
                              <div className="flex items-center gap-1">
                                代码/名称
                                {sortField === 'name' && (
                                  sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                )}
                              </div>
                            </th>
                            <th className="text-left p-2">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="flex items-center gap-1 cursor-pointer hover:bg-muted/50 select-none px-1 py-0.5 rounded"
                                  onClick={() => handleSort('price')}
                                >
                                  现价
                                  {sortField === 'price' && (
                                    sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                  )}
                                </div>
                                <div className="relative">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 price-filter-button"
                                    onClick={() => setShowPriceFilter(!showPriceFilter)}
                                  >
                                    <Filter className={`w-3 h-3 ${(priceRange.min !== undefined || priceRange.max !== undefined) ? 'text-blue-600' : 'text-gray-400'}`} />
                                  </Button>
                                  {showPriceFilter && (
                                    <div className="absolute top-8 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50 w-64 price-filter-popup">
                                      <div className="space-y-3">
                                        <div className="text-sm font-medium">价格范围筛选</div>
                                        <div className="flex items-center gap-2">
                                          <Input
                                            type="number"
                                            placeholder="最低价"
                                            value={priceRange.min || ''}
                                            onChange={(e) => setPriceRange(prev => ({
                                              ...prev,
                                              min: e.target.value ? Number(e.target.value) : undefined
                                            }))}
                                            className="w-20 h-8 text-xs"
                                          />
                                          <span className="text-xs">-</span>
                                          <Input
                                            type="number"
                                            placeholder="最高价"
                                            value={priceRange.max || ''}
                                            onChange={(e) => setPriceRange(prev => ({
                                              ...prev,
                                              max: e.target.value ? Number(e.target.value) : undefined
                                            }))}
                                            className="w-20 h-8 text-xs"
                                          />
                                        </div>
                                        <div className="flex gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-6 text-xs"
                                            onClick={() => {
                                              setPriceRange({})
                                              setShowPriceFilter(false)
                                            }}
                                          >
                                            清除
                                          </Button>
                                          <Button
                                            variant="default"
                                            size="sm"
                                            className="h-6 text-xs"
                                            onClick={() => setShowPriceFilter(false)}
                                          >
                                            确定
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </th>
                            <th className="text-left p-2">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="flex items-center gap-1 cursor-pointer hover:bg-muted/50 select-none px-1 py-0.5 rounded"
                                  onClick={() => handleSort('change_percent')}
                                >
                                  涨跌幅
                                  {sortField === 'change_percent' && (
                                    sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                  )}
                                </div>
                                <div className="relative">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 change-percent-filter-button"
                                    onClick={() => setShowChangePercentFilter(!showChangePercentFilter)}
                                  >
                                    <Filter className={`w-3 h-3 ${(changePercentRange.min !== undefined || changePercentRange.max !== undefined) ? 'text-blue-600' : 'text-gray-400'}`} />
                                  </Button>
                                  {showChangePercentFilter && (
                                    <div className="absolute top-8 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50 w-64 change-percent-filter-popup">
                                      <div className="space-y-3">
                                        <div className="text-sm font-medium">涨跌幅范围筛选</div>
                                        <div className="flex items-center gap-2">
                                          <Input
                                            type="number"
                                            placeholder="最小%"
                                            value={changePercentRange.min || ''}
                                            onChange={(e) => setChangePercentRange(prev => ({
                                              ...prev,
                                              min: e.target.value ? Number(e.target.value) : undefined
                                            }))}
                                            className="w-20 h-8 text-xs"
                                          />
                                          <span className="text-xs">-</span>
                                          <Input
                                            type="number"
                                            placeholder="最大%"
                                            value={changePercentRange.max || ''}
                                            onChange={(e) => setChangePercentRange(prev => ({
                                              ...prev,
                                              max: e.target.value ? Number(e.target.value) : undefined
                                            }))}
                                            className="w-20 h-8 text-xs"
                                          />
                                        </div>
                                        <div className="flex gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-6 text-xs"
                                            onClick={() => {
                                              setChangePercentRange({})
                                              setShowChangePercentFilter(false)
                                            }}
                                          >
                                            清除
                                          </Button>
                                          <Button
                                            variant="default"
                                            size="sm"
                                            className="h-6 text-xs"
                                            onClick={() => setShowChangePercentFilter(false)}
                                          >
                                            确定
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </th>
                            <th 
                              className="text-left p-2 cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort('market')}
                            >
                              <div className="flex items-center gap-1">
                                市场
                                {sortField === 'market' && (
                                  sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                )}
                              </div>
                            </th>
                            <th className="text-left p-2">概念</th>
                            <th 
                              className="text-left p-2 cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort('updated_at')}
                            >
                              <div className="flex items-center gap-1">
                                更新时间
                                {sortField === 'updated_at' && (
                                  sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                )}
                              </div>
                            </th>
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
                              <td className="p-2">
                                <span className="text-sm text-muted-foreground">
                                  {s.updated_at ? new Date(s.updated_at).toLocaleString('zh-CN') : '-'}
                                </span>
                              </td>
                              <td className="p-2">
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => router.push(`/stock/${s.symbol}`)}
                                  >
                                    详情
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex justify-between items-center mt-4">
                      <div className="text-sm text-muted-foreground">
                        共 {total} 条 · 每页 {pageSize} 条
                        </div>
                        <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                          onClick={() => setPage(Math.max(1, page - 1))}
                          disabled={page <= 1}
                              >
                          上一页
                              </Button>
                        <span className="text-sm">
                          第 {page} / {Math.ceil(total / pageSize)} 页
                            </span>
                                <Button
                                  variant="outline"
                              size="sm"
                          onClick={() => setPage(Math.min(Math.ceil(total / pageSize), page + 1))}
                          disabled={page >= Math.ceil(total / pageSize)}
                            >
                          下一页
                            </Button>
                          </div>
                      </div>
                    </CardContent>
                  </Card>
              </div>
            )}

            {currentPage === "plans" && (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium mb-2">交易计划</h3>
                <p className="text-muted-foreground">功能开发中...</p>
                          </div>
                        )}

            {currentPage === "strategies" && (
              <StrategyManagement />
            )}

            {currentPage === "trading" && (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium mb-2">交易执行</h3>
                <p className="text-muted-foreground">功能开发中...</p>
              </div>
            )}

            {currentPage === "influencer" && (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium mb-2">大佬追踪</h3>
                <p className="text-muted-foreground">功能开发中...</p>
              </div>
            )}

            {currentPage === "mindset" && (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium mb-2">心态建设</h3>
                <p className="text-muted-foreground">功能开发中...</p>
              </div>
            )}

            {currentPage === "review" && (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium mb-2">交易复盘</h3>
                <p className="text-muted-foreground">功能开发中...</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}