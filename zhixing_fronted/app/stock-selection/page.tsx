"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrendingUp, ArrowUpRight, ArrowDownRight, Eye, Plus, Upload, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// 选股结果数据模型
interface StockSelectionResult {
  id: string
  symbol: string
  name: string
  strategy: string
  score: number
  currentPrice: number
  changePercent: number
  volume: number
  marketCap: string
  reason: string
  timestamp: string
  tags: string[]
}

export default function StockSelectionPage() {
  const router = useRouter()
  const [results, setResults] = useState<StockSelectionResult[]>([])
  const [selectedStrategy, setSelectedStrategy] = useState<string>('all')
  // 导入自选股（CSV）
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [importing, setImporting] = useState<boolean>(false)
  const [importMsg, setImportMsg] = useState<string>("")
  // 后端自选股列表
  const [watchlist, setWatchlist] = useState<{ symbol: string; name: string; market?: string; group_name?: string; updated_at?: string }[]>([])
  const [watchlistLoading, setWatchlistLoading] = useState<boolean>(false)

  // 解析 CSV（支持带引号、逗号）
  function parseCSV(text: string): string[][] {
    const rows: string[][] = []
    let i = 0, field = '', row: string[] = [], inQuotes = false
    // 去掉 UTF-8 BOM
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
    while (i < text.length) {
      const char = text[i]
      if (inQuotes) {
        if (char === '"') {
          if (text[i + 1] === '"') { // 转义双引号
            field += '"'
            i += 2
            continue
          } else {
            inQuotes = false
            i++
            continue
          }
        } else {
          field += char
          i++
          continue
        }
      } else {
        if (char === '"') { inQuotes = true; i++; continue }
        if (char === ',') { row.push(field.trim()); field = ''; i++; continue }
        if (char === '\n') { row.push(field.trim()); rows.push(row); row = []; field = ''; i++; continue }
        if (char === '\r') { // 兼容 CRLF
          // lookahead for \n
          if (text[i + 1] === '\n') { row.push(field.trim()); rows.push(row); row = []; field = ''; i += 2; continue }
          else { row.push(field.trim()); rows.push(row); row = []; field = ''; i++; continue }
        }
        field += char
        i++
      }
    }
    // 最后一列/行
    if (field.length > 0 || row.length > 0) {
      row.push(field.trim())
      rows.push(row)
    }
    // 过滤空行
    return rows.filter(r => r.some(c => c && c.length > 0))
  }

  // 将 Futu 自选股 CSV 转为后端所需结构
  function futuCsvToStocks(rows: string[][]): Array<Record<string, string>> {
    if (!rows.length) return []
    const header = rows[0].map(h => h.trim())
    const data = rows.slice(1)
    const findIdx = (candidates: string[]) => header.findIndex(h => candidates.some(c => h.toLowerCase() === c.toLowerCase()))
    const idxCode = findIdx(['代码','symbol','股票代码','ticker','证券代码'])
    const idxName = findIdx(['名称','name','股票名称','security name'])
    const idxMarket = findIdx(['市场','market','交易所'])
    const idxGroup = findIdx(['分组','分组名称','行业','所属行业','板块','板块名称','group','group_name','industry','sector'])
    return data.map(r => {
      const code = (idxCode >= 0 ? r[idxCode] : '').toUpperCase()
      const name = idxName >= 0 ? r[idxName] : ''
      const market = idxMarket >= 0 ? r[idxMarket] : ''
      const group = idxGroup >= 0 ? r[idxGroup] : ''
      const item: Record<string, string> = {
        code,
        name
      }
      if (market) item.market = market
      if (group) item.group_name = group
      return item
    }).filter(it => it.code && it.name)
  }

  async function handleImport() {
    try {
      if (!csvFile) return
      setImporting(true)
      setImportMsg('')
      const text = await csvFile.text()
      const rows = parseCSV(text)
      const stocks = futuCsvToStocks(rows)
      if (!stocks.length) {
        setImportMsg('解析失败：未识别到有效的股票数据（请确认是富途导出的自选股 CSV）')
        setImporting(false)
        return
      }
      const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
      const res = await fetch(`${base}/api/v1/stocks/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stocks })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const detail = (data && (data.detail || data.message)) || `HTTP ${res.status}`
        throw new Error(String(detail))
      }
      const msg = data?.message || '导入成功'
      const info = data?.data ? `（新增 ${data.data.added_count || 0}，更新 ${data.data.updated_count || 0}）` : ''
      setImportMsg(`${msg}${info}`)
      // 导入成功后刷新后端自选股
      fetchWatchlist()
    } catch (e: any) {
      setImportMsg(`导入失败：${e?.message || e}`)
    } finally {
      setImporting(false)
    }
  }

  async function fetchWatchlist() {
    try {
      setWatchlistLoading(true)
      const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
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
    } catch (err) {
      console.error('fetch watchlist error', err)
    } finally {
      setWatchlistLoading(false)
    }
  }

  useEffect(() => { fetchWatchlist() }, [])

  // 获取策略执行结果
  const fetchStrategyResults = async () => {
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
      // 获取可用策略
      const strategiesRes = await fetch(`${base}/api/v1/strategies/`)
      const strategiesData = await strategiesRes.json()
      
      if (strategiesData.success && strategiesData.data.strategies.length > 0) {
        // 执行第一个策略作为示例
        const strategyId = strategiesData.data.strategies[0].id
        const executeRes = await fetch(`${base}/api/v1/strategies/${strategyId}/execute`, {
          method: 'POST'
        })
        const executeData = await executeRes.json()
        
        if (executeData.success) {
          // 转换为前端格式
          const formattedResults: StockSelectionResult[] = executeData.data.map((item: any, index: number) => ({
            id: (index + 1).toString(),
            symbol: item.stock_symbol,
            name: item.stock_symbol, // 暂时使用symbol作为name
            strategy: strategiesData.data.strategies[0].name,
            score: item.score || 8.0,
            currentPrice: item.current_price || 100.0,
            changePercent: Math.random() * 6 - 3, // 模拟涨跌幅
            volume: Math.floor(Math.random() * 50000000),
            marketCap: '未知',
            reason: item.reasons?.join(', ') || item.technical_details || '策略选股',
            timestamp: new Date().toLocaleString('zh-CN'),
            tags: [item.risk_level || '中风险', item.suggested_action || '观察']
          }))
          setResults(formattedResults)
        }
      }
    } catch (error) {
      console.error('获取策略结果失败:', error)
      // 如果API失败，使用模拟数据
      const mockResults: StockSelectionResult[] = [
        {
          id: '1',
          symbol: 'AAPL',
          name: '苹果',
          strategy: '示例策略',
          score: 8.5,
          currentPrice: 192.45,
          changePercent: 2.3,
          volume: 25600000,
          marketCap: '3万亿',
          reason: '技术面突破，基本面良好',
          timestamp: new Date().toLocaleString('zh-CN'),
          tags: ['科技股', '大盘股']
        }
      ]
      setResults(mockResults)
    }
  }

  useEffect(() => {
    fetchStrategyResults()
  }, [])

  // 获取策略列表
  const strategies = ['all', ...Array.from(new Set(results.map(r => r.strategy)))]

  // 过滤结果
  const filteredResults = selectedStrategy === 'all' 
    ? results 
    : results.filter(r => r.strategy === selectedStrategy)

  // 跳转到股票详情
  const goToStockDetail = (symbol: string) => {
    router.push(`/stock/${symbol}`)
  }

  // 创建交易计划
  const createTradingPlan = (symbol: string) => {
    router.push(`/plan/create?symbol=${symbol}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">选股结果</h1>
          </div>
          <p className="text-gray-600">基于量化策略筛选出的优质投资标的</p>
        </div>

        {/* 导入自选股（CSV） */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
              <div className="flex-1">
                <Label htmlFor="watchlistCsv" className="mb-2 inline-flex items-center gap-2">
                  <FileText className="h-4 w-4" /> 导入自选股（富途 CSV）
                </Label>
                <Input
                  id="watchlistCsv"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                />
                <p className="text-sm text-gray-500 mt-1">请选择富途导出的“自选股.csv”文件。支持包含列：代码、名称、市场、行业/分组等。</p>
              </div>
              <div>
                <Button onClick={handleImport} disabled={!csvFile || importing} className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  {importing ? '导入中...' : '导入'}
                </Button>
              </div>
            </div>
            {importMsg && (
              <div className="mt-3 text-sm text-gray-700">{importMsg}</div>
            )}
          </CardContent>
        </Card>

        {/* 后端自选股列表（自动刷新） */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>后端自选股列表</CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{watchlistLoading ? '刷新中...' : `共 ${watchlist.length} 条`}</span>
                <Button variant="outline" size="sm" onClick={fetchWatchlist}>刷新</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {watchlist.length === 0 ? (
              <div className="text-sm text-muted-foreground">暂无数据。可通过上方导入 CSV。</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">代码</th>
                      <th className="text-left p-2">名称</th>
                      <th className="text-left p-2">市场</th>
                      <th className="text-left p-2">分组/行业</th>
                      <th className="text-left p-2">更新时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {watchlist.map((s) => (
                      <tr key={s.symbol} className="border-b hover:bg-muted/50">
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
            )}
          </CardContent>
        </Card>

        {/* 策略筛选与执行 */}
        <div className="mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">策略执行结果</h2>
              <Button onClick={fetchStrategyResults} className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                重新执行策略
              </Button>
            </div>
            <div className="flex flex-wrap gap-3">
              {strategies.map(strategy => (
                <Button
                  key={strategy}
                  variant={selectedStrategy === strategy ? 'default' : 'outline'}
                  onClick={() => setSelectedStrategy(strategy)}
                  className="flex items-center gap-2"
                >
                  {strategy === 'all' ? '全部策略' : strategy}
                  <Badge variant="secondary" className="ml-1">
                    {strategy === 'all' 
                      ? results.length 
                      : results.filter(r => r.strategy === strategy).length
                    }
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* 选股结果统计 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">今日选股</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredResults.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <ArrowUpRight className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">平均涨幅</p>
                  <p className="text-2xl font-bold text-green-600">+1.32%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-yellow-600 font-bold">★</span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">平均评分</p>
                  <p className="text-2xl font-bold text-gray-900">8.3</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 font-bold">策</span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">活跃策略</p>
                  <p className="text-2xl font-bold text-gray-900">{strategies.length - 1}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 选股结果列表 */}
        <div className="space-y-4">
          {filteredResults.map((result) => (
            <Card key={result.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-gray-900">
                          {result.symbol}
                        </h3>
                        <span className="text-gray-600">{result.name}</span>
                        <Badge variant="outline" className="text-blue-600 border-blue-200">
                          {result.strategy}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">
                            ${result.currentPrice}
                          </p>
                          <p className={`text-sm flex items-center gap-1 ${
                            result.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {result.changePercent >= 0 ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                            {result.changePercent >= 0 ? '+' : ''}{result.changePercent}%
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">评分:</span>
                          <Badge 
                            variant={result.score >= 8.5 ? 'default' : result.score >= 7.5 ? 'secondary' : 'outline'}
                            className="font-bold"
                          >
                            {result.score}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">成交量</p>
                        <p className="font-medium">{(result.volume / 1000000).toFixed(1)}M</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">市值</p>
                        <p className="font-medium">{result.marketCap}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">选股时间</p>
                        <p className="font-medium">{result.timestamp}</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">选股理由</p>
                      <p className="text-gray-800">{result.reason}</p>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      {result.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-6">
                    <Button
                      onClick={() => goToStockDetail(result.symbol)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      查看详情
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => createTradingPlan(result.symbol)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      创建计划
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredResults.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TrendingUp className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">暂无选股结果</h3>
              <p className="text-gray-400">当前策略暂未产生选股结果</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
