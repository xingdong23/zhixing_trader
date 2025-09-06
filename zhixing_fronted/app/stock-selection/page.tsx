"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrendingUp, ArrowUpRight, ArrowDownRight, Eye, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

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

  // 模拟选股结果数据
  useEffect(() => {
    const mockResults: StockSelectionResult[] = [
      {
        id: '1',
        symbol: 'BABA',
        name: '阿里巴巴',
        strategy: '龙头战法',
        score: 8.5,
        currentPrice: 92.45,
        changePercent: 2.3,
        volume: 25600000,
        marketCap: '2456亿',
        reason: '突破关键阻力位，成交量放大，资金流入明显',
        timestamp: '2025-08-23 08:30:15',
        tags: ['科技股', '港股通', '大盘股']
      },
      {
        id: '2',
        symbol: 'NVDA',
        name: '英伟达',
        strategy: '龙头战法',
        score: 9.2,
        currentPrice: 485.20,
        changePercent: 1.8,
        volume: 42300000,
        marketCap: '1.2万亿',
        reason: 'AI概念持续火热，财报表现超预期，技术面强势',
        timestamp: '2025-08-23 08:30:15',
        tags: ['AI概念', '芯片股', '大盘股']
      },
      {
        id: '3',
        symbol: 'TSLA',
        name: '特斯拉',
        strategy: '龙头战法',
        score: 7.8,
        currentPrice: 195.67,
        changePercent: -0.5,
        volume: 98500000,
        marketCap: '6234亿',
        reason: '新能源汽车销量数据良好，估值合理',
        timestamp: '2025-08-23 08:30:15',
        tags: ['新能源', '汽车股', '大盘股']
      },
      {
        id: '4',
        symbol: 'META',
        name: 'Meta',
        strategy: '龙头战法',
        score: 8.1,
        currentPrice: 298.35,
        changePercent: 1.2,
        volume: 18900000,
        marketCap: '7850亿',
        reason: 'VR业务进展顺利，广告收入稳定增长',
        timestamp: '2025-08-23 08:30:15',
        tags: ['元宇宙', '社交媒体', '大盘股']
      },
      {
        id: '5',
        symbol: 'GOOGL',
        name: '谷歌',
        strategy: '龙头战法',
        score: 8.7,
        currentPrice: 142.80,
        changePercent: 0.8,
        volume: 28400000,
        marketCap: '1.8万亿',
        reason: '云计算业务增长强劲，AI技术领先',
        timestamp: '2025-08-23 08:30:15',
        tags: ['云计算', 'AI概念', '大盘股']
      }
    ]
    setResults(mockResults)
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

        {/* 策略筛选 */}
        <div className="mb-6">
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