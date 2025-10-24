'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { TrendingUp, TrendingDown, AlertTriangle, Activity, Target } from 'lucide-react'

interface SentimentData {
  fearGreedIndex: number
  sp500Index: number
  timestamp: string
  recommendation: 'small_cap' | 'large_cap'
  sentiment: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed'
}

export default function MarketSentimentMonitor() {
  const [sentimentData, setSentimentData] = useState<SentimentData>({
    fearGreedIndex: 45,
    sp500Index: 50,
    timestamp: new Date().toISOString(),
    recommendation: 'large_cap',
    sentiment: 'neutral'
  })

  const [isLoading, setIsLoading] = useState(false)

  // 获取情绪等级
  const getSentimentLevel = (index: number): SentimentData['sentiment'] => {
    if (index <= 20) return 'extreme_fear'
    if (index <= 40) return 'fear'
    if (index <= 60) return 'neutral'
    if (index <= 80) return 'greed'
    return 'extreme_greed'
  }

  // 获取情绪颜色
  const getSentimentColor = (sentiment: SentimentData['sentiment']) => {
    const colors = {
      extreme_fear: 'text-red-600 bg-red-50',
      fear: 'text-orange-600 bg-orange-50',
      neutral: 'text-yellow-600 bg-yellow-50',
      greed: 'text-green-600 bg-green-50',
      extreme_greed: 'text-emerald-600 bg-emerald-50'
    }
    return colors[sentiment]
  }

  // 获取情绪标签
  const getSentimentLabel = (sentiment: SentimentData['sentiment']) => {
    const labels = {
      extreme_fear: '极度恐慌',
      fear: '恐慌',
      neutral: '中性',
      greed: '贪婪',
      extreme_greed: '极度贪婪'
    }
    return labels[sentiment]
  }

  // 获取市场情绪数据
  const fetchSentimentData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/market/sentiment')
      const result = await response.json()
      
      if (result.success && result.data) {
        setSentimentData({
          fearGreedIndex: result.data.fearGreedIndex,
          sp500Index: result.data.sp500Index,
          timestamp: result.data.timestamp,
          recommendation: result.data.recommendation,
          sentiment: result.data.sentiment
        })
      } else {
        throw new Error('获取数据失败')
      }
    } catch (error) {
      console.error('获取市场情绪数据失败:', error)
      // 如果API失败，使用模拟数据
      const mockFearGreedIndex = Math.floor(Math.random() * 100)
      const mockSP500Index = 50
      const sentiment = getSentimentLevel(mockFearGreedIndex)
      const recommendation = mockFearGreedIndex > mockSP500Index ? 'small_cap' : 'large_cap'
      
      setSentimentData({
        fearGreedIndex: mockFearGreedIndex,
        sp500Index: mockSP500Index,
        timestamp: new Date().toISOString(),
        recommendation,
        sentiment
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSentimentData()
    // 每5分钟更新一次
    const interval = setInterval(fetchSentimentData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const { fearGreedIndex, sp500Index, recommendation, sentiment } = sentimentData

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                市场情绪监控
              </CardTitle>
              <CardDescription>
                基于恐慌贪婪指数的小盘股/大盘股策略
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {new Date(sentimentData.timestamp).toLocaleTimeString('zh-CN')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 恐慌贪婪指数 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">恐慌贪婪指数</span>
                <Badge className={getSentimentColor(sentiment)}>
                  {getSentimentLabel(sentiment)}
                </Badge>
              </div>
              <span className="text-2xl font-bold">{fearGreedIndex}</span>
            </div>
            <Progress value={fearGreedIndex} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>极度恐慌 (0)</span>
              <span>中性 (50)</span>
              <span>极度贪婪 (100)</span>
            </div>
          </div>

          {/* 标普500基准 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">标普500基准</span>
              <span className="text-xl font-semibold">{sp500Index}</span>
            </div>
            <Progress value={sp500Index} className="h-2 opacity-50" />
          </div>

          {/* 策略建议 */}
          <Alert className={
            recommendation === 'small_cap' 
              ? 'border-green-500 bg-green-50' 
              : 'border-blue-500 bg-blue-50'
          }>
            <Target className="h-4 w-4" />
            <AlertTitle className="flex items-center gap-2">
              当前策略建议
              {recommendation === 'small_cap' ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-blue-600" />
              )}
            </AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <div className="font-medium">
                {recommendation === 'small_cap' ? (
                  <span className="text-green-700">
                    ✓ 适合买入小盘股
                  </span>
                ) : (
                  <span className="text-blue-700">
                    ⚠ 建议转向大盘股
                  </span>
                )}
              </div>
              <div className="text-sm">
                {recommendation === 'small_cap' ? (
                  <>
                    恐慌贪婪指数 ({fearGreedIndex}) &gt; 标普500 ({sp500Index})，
                    市场情绪较好，小盘股可能有更好的表现机会。
                  </>
                ) : (
                  <>
                    恐慌贪婪指数 ({fearGreedIndex}) ≤ 标普500 ({sp500Index})，
                    市场情绪偏弱，建议选择更稳健的大盘股。
                  </>
                )}
              </div>
            </AlertDescription>
          </Alert>

          {/* 策略说明 */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4" />
              策略规则
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
              <li>当恐慌贪婪指数 &gt; 标普500时，买入小盘股</li>
              <li>当恐慌贪婪指数 ≤ 标普500时，转向大盘股</li>
              <li>数据每5分钟自动更新一次</li>
            </ul>
          </div>

          {/* 刷新按钮 */}
          <button
            onClick={fetchSentimentData}
            disabled={isLoading}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            {isLoading ? '更新中...' : '立即刷新数据'}
          </button>
        </CardContent>
      </Card>

      {/* 历史趋势卡片（可选扩展） */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">接入说明</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>当前为Mock模式。</strong>要接入真实数据，需要：
          </p>
          <ol className="list-decimal ml-5 space-y-1">
            <li>获取老虎证券API密钥</li>
            <li>创建 <code className="bg-muted px-1 py-0.5 rounded">/api/market/sentiment</code> 接口</li>
            <li>调用老虎API获取恐慌贪婪指数</li>
            <li>返回格式化的数据给前端</li>
          </ol>
          <p className="pt-2">
            老虎证券API文档: <a href="https://quant.itigerup.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://quant.itigerup.com/</a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
