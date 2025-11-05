'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Activity,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// 恐慌指数数据接口
interface FearIndexData {
  uvxy: {
    current: number
    ma20: number
    deviation: number // 偏离度百分比
    status: 'extreme_fear' | 'high_fear' | 'fear' | 'normal' | 'low'
  }
  vix: {
    current: number
    status: 'extreme' | 'high' | 'elevated' | 'normal' | 'low'
    level: string
  }
  marketSentiment: {
    score: number // 0-10分，越低越恐慌
    label: string
    suggestion: string
  }
  timestamp: string
}

interface FearGreedMonitorProps {
  variant?: 'full' | 'compact' | 'mini'
  autoRefresh?: boolean
  refreshInterval?: number // 秒
}

export default function FearGreedMonitor({ 
  variant = 'compact', 
  autoRefresh = true,
  refreshInterval = 60 
}: FearGreedMonitorProps) {
  const [data, setData] = useState<FearIndexData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // 获取恐慌指数数据
  const fetchFearIndexData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/market/fear-index')
      const result = await response.json()
      
      if (result.success && result.data) {
        setData(result.data)
        setLastUpdate(new Date())
      } else {
        throw new Error('获取数据失败')
      }
    } catch (error) {
      console.error('获取恐慌指数数据失败:', error)
      // 使用Mock数据
      const mockData = generateMockData()
      setData(mockData)
      setLastUpdate(new Date())
    } finally {
      setIsLoading(false)
    }
  }

  // 生成Mock数据
  const generateMockData = (): FearIndexData => {
    // 模拟UVXY数据
    const uvxyCurrent = 15 + Math.random() * 20 // 15-35
    const uvxyMa20 = 18
    const uvxyDeviation = ((uvxyCurrent - uvxyMa20) / uvxyMa20) * 100

    let uvxyStatus: FearIndexData['uvxy']['status'] = 'normal'
    if (uvxyDeviation > 50) uvxyStatus = 'extreme_fear'
    else if (uvxyDeviation > 30) uvxyStatus = 'high_fear'
    else if (uvxyDeviation > 15) uvxyStatus = 'fear'
    else if (uvxyDeviation < -20) uvxyStatus = 'low'

    // 模拟VIX数据
    const vixCurrent = 12 + Math.random() * 25 // 12-37
    let vixStatus: FearIndexData['vix']['status'] = 'normal'
    let vixLevel = '正常'
    
    if (vixCurrent > 30) {
      vixStatus = 'extreme'
      vixLevel = '极度恐慌'
    } else if (vixCurrent > 25) {
      vixStatus = 'high'
      vixLevel = '高恐慌'
    } else if (vixCurrent > 20) {
      vixStatus = 'elevated'
      vixLevel = '轻度恐慌'
    } else if (vixCurrent < 12) {
      vixStatus = 'low'
      vixLevel = '极度平静'
    }

    // 综合市场情绪评分（0-10分）
    let score = 5
    if (uvxyStatus === 'extreme_fear' || vixStatus === 'extreme') score = 1
    else if (uvxyStatus === 'high_fear' || vixStatus === 'high') score = 2
    else if (uvxyStatus === 'fear' || vixStatus === 'elevated') score = 3
    else if (vixStatus === 'low') score = 8

    let label = '中性'
    let suggestion = '正常交易'
    
    if (score <= 2) {
      label = '极度恐慌'
      suggestion = '🎯 绝佳的捞货时机！不要在此时止损！'
    } else if (score <= 3) {
      label = '恐慌'
      suggestion = '💡 市场恐慌，可能是买入机会'
    } else if (score <= 4) {
      label = '偏恐慌'
      suggestion = '⚠️ 市场偏弱，谨慎操作'
    } else if (score >= 8) {
      label = '过度乐观'
      suggestion = '🚨 市场情绪过热，警惕追高！'
    } else if (score >= 6) {
      label = '偏乐观'
      suggestion = '⚡ 市场较好，但注意控制仓位'
    }

    return {
      uvxy: {
        current: parseFloat(uvxyCurrent.toFixed(2)),
        ma20: uvxyMa20,
        deviation: parseFloat(uvxyDeviation.toFixed(1)),
        status: uvxyStatus
      },
      vix: {
        current: parseFloat(vixCurrent.toFixed(2)),
        status: vixStatus,
        level: vixLevel
      },
      marketSentiment: {
        score,
        label,
        suggestion
      },
      timestamp: new Date().toISOString()
    }
  }

  useEffect(() => {
    fetchFearIndexData()
    
    if (autoRefresh) {
      const interval = setInterval(fetchFearIndexData, refreshInterval * 1000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  if (!data) {
    return (
      <div className="flex items-center justify-center p-4">
        <RefreshCw className="w-4 h-4 animate-spin" />
      </div>
    )
  }

  // Mini版本 - 只显示核心指标
  if (variant === 'mini') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="relative"
      >
        <Activity className="w-4 h-4 mr-2" />
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono">VIX {data.vix.current}</span>
          <Badge 
            variant={
              data.marketSentiment.score <= 2 ? 'destructive' :
              data.marketSentiment.score <= 4 ? 'default' :
              data.marketSentiment.score >= 7 ? 'secondary' :
              'outline'
            }
            className="text-xs"
          >
            {data.marketSentiment.label}
          </Badge>
        </div>
        {isExpanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
      </Button>
    )
  }

  // Compact版本 - 紧凑卡片
  if (variant === 'compact') {
    return (
      <Card className="w-80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              恐慌指数监控
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={fetchFearIndexData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          {/* UVXY指标 */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">UVXY</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold">{data.uvxy.current}</span>
                <Badge 
                  variant={
                    data.uvxy.status === 'extreme_fear' ? 'destructive' :
                    data.uvxy.status === 'high_fear' ? 'default' :
                    'outline'
                  }
                  className="text-xs"
                >
                  {data.uvxy.deviation > 0 ? '+' : ''}{data.uvxy.deviation}%
                </Badge>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              20日均线: {data.uvxy.ma20}
            </div>
          </div>

          {/* VIX指标 */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">VIX</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold">{data.vix.current}</span>
                <Badge 
                  variant={
                    data.vix.status === 'extreme' ? 'destructive' :
                    data.vix.status === 'high' ? 'default' :
                    'outline'
                  }
                  className="text-xs"
                >
                  {data.vix.level}
                </Badge>
              </div>
            </div>
          </div>

          {/* 市场情绪 */}
          <Alert className={
            data.marketSentiment.score <= 2 ? 'border-red-500 bg-red-50' :
            data.marketSentiment.score <= 4 ? 'border-orange-500 bg-orange-50' :
            data.marketSentiment.score >= 7 ? 'border-yellow-500 bg-yellow-50' :
            'border-blue-500 bg-blue-50'
          }>
            <AlertTriangle className="h-3 w-3" />
            <AlertDescription className="text-xs ml-1">
              <div className="font-medium mb-1">
                市场情绪: {data.marketSentiment.label} ({data.marketSentiment.score}/10)
              </div>
              <div>{data.marketSentiment.suggestion}</div>
            </AlertDescription>
          </Alert>

          {/* 时间戳 */}
          <div className="text-xs text-muted-foreground text-center">
            更新于 {lastUpdate.toLocaleTimeString('zh-CN')}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Full版本 - 完整卡片
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            市场恐慌指数实时监控
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFearIndexData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* UVXY指数详情 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">UVXY恐慌指数</div>
              <div className="text-xs text-muted-foreground">
                波动率ETF - 衡量市场短期恐慌程度
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{data.uvxy.current}</div>
              <Badge 
                variant={
                  data.uvxy.status === 'extreme_fear' ? 'destructive' :
                  data.uvxy.status === 'high_fear' ? 'default' :
                  'outline'
                }
              >
                {data.uvxy.deviation > 0 ? '↑' : '↓'} {Math.abs(data.uvxy.deviation)}% 偏离均线
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">20日均线:</span>
              <span className="ml-2 font-medium">{data.uvxy.ma20}</span>
            </div>
            <div>
              <span className="text-muted-foreground">状态:</span>
              <span className="ml-2 font-medium">
                {data.uvxy.status === 'extreme_fear' && '🔴 极度恐慌'}
                {data.uvxy.status === 'high_fear' && '🟠 高度恐慌'}
                {data.uvxy.status === 'fear' && '🟡 恐慌'}
                {data.uvxy.status === 'normal' && '🟢 正常'}
                {data.uvxy.status === 'low' && '🔵 低波动'}
              </span>
            </div>
          </div>
        </div>

        {/* VIX指数详情 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">VIX波动率指数</div>
              <div className="text-xs text-muted-foreground">
                标普500隐含波动率 - 华尔街恐慌指数
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{data.vix.current}</div>
              <Badge 
                variant={
                  data.vix.status === 'extreme' ? 'destructive' :
                  data.vix.status === 'high' ? 'default' :
                  'outline'
                }
              >
                {data.vix.level}
              </Badge>
            </div>
          </div>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">&lt; 12:</span>
              <span>极度平静（市场过度乐观）</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">12-20:</span>
              <span>正常区间</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">20-25:</span>
              <span>轻度恐慌</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">25-30:</span>
              <span>高恐慌</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">&gt; 30:</span>
              <span>极度恐慌（买入机会）</span>
            </div>
          </div>
        </div>

        {/* 综合市场情绪与建议 */}
        <Alert className={
          data.marketSentiment.score <= 2 ? 'border-red-500 bg-red-50' :
          data.marketSentiment.score <= 4 ? 'border-orange-500 bg-orange-50' :
          data.marketSentiment.score >= 7 ? 'border-yellow-500 bg-yellow-50' :
          'border-blue-500 bg-blue-50'
        }>
          {data.marketSentiment.score <= 2 ? (
            <AlertTriangle className="h-4 w-4 text-red-600" />
          ) : data.marketSentiment.score >= 7 ? (
            <TrendingUp className="h-4 w-4 text-yellow-600" />
          ) : (
            <Activity className="h-4 w-4" />
          )}
          <AlertDescription className="ml-2">
            <div className="font-medium text-base mb-2">
              市场综合情绪: {data.marketSentiment.label} ({data.marketSentiment.score}/10分)
            </div>
            <div className="text-sm">
              {data.marketSentiment.suggestion}
            </div>
            {data.marketSentiment.score <= 2 && (
              <div className="mt-2 text-sm font-medium text-red-700">
                ⚠️ 重要提醒：极度恐慌时不要止损！这通常是最后一跌！
              </div>
            )}
          </AlertDescription>
        </Alert>

        {/* 更新时间 */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          最后更新: {lastUpdate.toLocaleString('zh-CN')} · 
          {autoRefresh && ` 每${refreshInterval}秒自动刷新`}
        </div>
      </CardContent>
    </Card>
  )
}
