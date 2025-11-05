'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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

interface StockListProps {
  selectedConcept?: string | null
  onConceptSelect?: (concept: string | null) => void
}

export function StockList({ selectedConcept, onConceptSelect }: StockListProps) {
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [allConcepts, setAllConcepts] = useState<{[key: string]: string[]}>({
    industry: [],
    fundamentals: [],
    custom: []
  })
  
  const pageSize = 20

  // 获取概念分类数据
  async function fetchConceptCategories() {
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
      const res = await fetch(`${base}/api/v1/concepts/categories`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(String(data?.detail || data?.message || `HTTP ${res.status}`))
      
      const categories = data?.data?.categories || {}
      setAllConcepts(categories)
    } catch (err) {
      console.error('fetch concept categories error', err)
      setAllConcepts({
        industry: ["其他"],
        fundamentals: ["其他"],
        custom: ["其他"]
      })
    }
  }

  // 获取股票数据
  async function fetchStocks() {
    try {
      setLoading(true)
      const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
      let url = `${base}/api/v1/stocks/overview?page=${page}&page_size=${pageSize}`
      if (selectedConcept) {
        url += `&concept_name=${encodeURIComponent(selectedConcept)}`
      }
      
      const res = await fetch(url)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(String(data?.detail || data?.message || `HTTP ${res.status}`))
      
      const items = (data?.data?.stocks || []) as any[]
      setStocks(items.map(it => ({
        id: it.id,
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
      console.error('fetch stocks error', err)
    } finally {
      setLoading(false)
    }
  }

  // 当选中概念变化时，重置页码并重新获取数据
  useEffect(() => { 
    if (selectedConcept !== null) {
      setPage(1)
    }
    fetchStocks() 
  }, [selectedConcept])

  useEffect(() => { fetchStocks() }, [page])
  useEffect(() => { fetchConceptCategories() }, [])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <Card>
      <CardHeader>
        <CardTitle>自选股票</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 概念筛选 */}
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
                      if (selectedConcept === tag) {
                        onConceptSelect?.(null)
                      } else {
                        onConceptSelect?.(tag)
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
            <Button variant="outline" size="sm" onClick={() => onConceptSelect?.(null)}>
              重置筛选 ({selectedConcept})
            </Button>
          )}
        </div>

        {/* 股票表格 */}
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
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center p-4">加载中...</td>
                </tr>
              ) : stocks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-4">暂无数据</td>
                </tr>
              ) : (
                stocks.map((s) => (
                  <tr key={s.symbol} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <div>
                        <div className="font-medium">{s.symbol}</div>
                        <div className="text-sm text-gray-500">{s.name}</div>
                      </div>
                    </td>
                    <td className="p-2">{s.price || '-'}</td>
                    <td className="p-2">
                      {s.change_percent ? (
                        <span className={s.change_percent >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {s.change_percent > 0 ? '+' : ''}{s.change_percent}%
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-2">{s.market || '-'}</td>
                    <td className="p-2">
                      {s.concepts && s.concepts.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {s.concepts.slice(0, 3).map((concept, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">{concept}</Badge>
                          ))}
                          {s.concepts.length > 3 && (
                            <Badge variant="secondary" className="text-xs">+{s.concepts.length - 3}</Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </td>
                    <td className="p-2 text-sm text-gray-500">
                      {s.updated_at ? new Date(s.updated_at).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* 分页控件 */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">共 {total} 条 · 每页 {pageSize} 条</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
              上一页
            </Button>
            <div className="text-sm">第 {page} / {totalPages} 页</div>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
              下一页
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
