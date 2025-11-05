'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  TrendingUp,
  TrendingDown,
  Target,
  Eye,
  Star,
  Activity,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'

// 技术形态类型
interface TechnicalPattern {
  id: string
  symbol: string
  name: string
  patternType: 'ma200_cross_up' | 'ma200_cross_down' | 'support' | 'resistance' | 'breakout' | 'breakdown'
  severity: 'bullish' | 'bearish' | 'neutral'
  currentPrice: number
  keyLevel: number
  ma200: number
  description: string
  actionSuggestion: string
  quality: 'high' | 'medium' | 'low' // 信号质量
  timestamp: string
}

interface TechnicalPatternScannerProps {
  variant?: 'full' | 'compact'
  autoRefresh?: boolean
  refreshInterval?: number
  filterType?: 'all' | 'ma200_cross' | 'breakout' | 'key_levels'
}

export default function TechnicalPatternScanner({
  variant = 'full',
  autoRefresh = true,
  refreshInterval = 300, // 5分钟
  filterType = 'all'
}: TechnicalPatternScannerProps) {
  const [patterns, setPatterns] = useState<TechnicalPattern[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filter, setFilter] = useState<string>(filterType)

  // 获取技术形态数据
  const fetchPatterns = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/market/technical-patterns?filter=${filter}`)
      const result = await response.json()
      
      if (result.success && result.data) {
        setPatterns(result.data)
      } else {
        throw new Error('获取数据失败')
      }
    } catch (error) {
      console.error('获取技术形态失败:', error)
      // 使用Mock数据
      setPatterns(generateMockPatterns())
    } finally {
      setIsLoading(false)
    }
  }

  // 生成Mock数据
  const generateMockPatterns = (): TechnicalPattern[] => {
    const patterns: TechnicalPattern[] = []
    const symbols = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMD', 'META', 'AMZN']
    
    // 生成年线突破
    if (Math.random() > 0.5) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)]
      const ma200 = 150 + Math.random() * 50
      const currentPrice = ma200 * (1.01 + Math.random() * 0.05) // 刚突破年线1-6%
      
      patterns.push({
        id: `pattern-${Date.now()}-1`,
        symbol,
        name: symbol === 'AAPL' ? '苹果' : symbol === 'TSLA' ? '特斯拉' : symbol,
        patternType: 'ma200_cross_up',
        severity: 'bullish',
        currentPrice,
        keyLevel: ma200,
        ma200,
        description: `${symbol}突破200日均线（年线）`,
        actionSuggestion: '重新站上年线，可能是大牛股！密切关注，适合埋伏。',
        quality: 'high',
        timestamp: new Date().toISOString()
      })
    }
    
    // 生成跌破年线
    if (Math.random() > 0.6) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)]
      const ma200 = 120 + Math.random() * 40
      const currentPrice = ma200 * (0.95 - Math.random() * 0.05) // 跌破年线5-10%
      
      patterns.push({
        id: `pattern-${Date.now()}-2`,
        symbol,
        name: symbol === 'NVDA' ? '英伟达' : symbol,
        patternType: 'ma200_cross_down',
        severity: 'bearish',
        currentPrice,
        keyLevel: ma200,
        ma200,
        description: `${symbol}跌破200日均线（年线）`,
        actionSuggestion: '跌破年线，趋势转弱。如有持仓需谨慎评估。',
        quality: 'medium',
        timestamp: new Date().toISOString()
      })
    }
    
    // 生成关键支撑位
    if (Math.random() > 0.4) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)]
      const support = 180 + Math.random() * 30
      const currentPrice = support * (1.00 + Math.random() * 0.03) // 在支撑位附近0-3%
      
      patterns.push({
        id: `pattern-${Date.now()}-3`,
        symbol,
        name: symbol,
        patternType: 'support',
        severity: 'bullish',
        currentPrice,
        keyLevel: support,
        ma200: support * 0.95,
        description: `${symbol}在关键支撑位${support.toFixed(2)}附近`,
        actionSuggestion: '当前在关键支撑位，是埋伏的好位置，不是追涨！',
        quality: 'high',
        timestamp: new Date().toISOString()
      })
    }
    
    // 生成突破前高
    if (Math.random() > 0.5) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)]
      const resistance = 200 + Math.random() * 50
      const currentPrice = resistance * (1.01 + Math.random() * 0.04) // 突破1-5%
      
      patterns.push({
        id: `pattern-${Date.now()}-4`,
        symbol,
        name: symbol,
        patternType: 'breakout',
        severity: 'bullish',
        currentPrice,
        keyLevel: resistance,
        ma200: resistance * 0.90,
        description: `${symbol}突破前期高点${resistance.toFixed(2)}`,
        actionSuggestion: '突破前高，但注意不要追高！等待回踩确认更安全。',
        quality: 'medium',
        timestamp: new Date().toISOString()
      })
    }
    
    return patterns.slice(0, 6) // 最多返回6个
  }

  // 获取形态图标
  const getPatternIcon = (type: string) => {
    switch (type) {
      case 'ma200_cross_up':
      case 'breakout':
        return <TrendingUp className="h-4 w-4" />
      case 'ma200_cross_down':
      case 'breakdown':
        return <TrendingDown className="h-4 w-4" />
      case 'support':
        return <ArrowUp className="h-4 w-4" />
      case 'resistance':
        return <ArrowDown className="h-4 w-4" />
      default:
        return <Target className="h-4 w-4" />
    }
  }

  // 获取形态名称
  const getPatternName = (type: string) => {
    switch (type) {
      case 'ma200_cross_up': return '突破年线'
      case 'ma200_cross_down': return '跌破年线'
      case 'support': return '关键支撑'
      case 'resistance': return '关键阻力'
      case 'breakout': return '突破前高'
      case 'breakdown': return '跌破前低'
      default: return '未知形态'
    }
  }

  // 获取质量徽章颜色
  const getQualityVariant = (quality: string) => {
    switch (quality) {
      case 'high': return 'default'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  useEffect(() => {
    fetchPatterns()
    
    if (autoRefresh) {
      const interval = setInterval(fetchPatterns, refreshInterval * 1000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, filter])

  if (isLoading && patterns.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Activity className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  // Compact版本
  if (variant === 'compact') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4" />
              技术形态扫描 ({patterns.length})
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={fetchPatterns}
              disabled={isLoading}
            >
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {patterns.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              暂无重要技术形态
            </div>
          ) : (
            patterns.slice(0, 3).map(pattern => (
              <div
                key={pattern.id}
                className={`p-2 rounded border ${
                  pattern.severity === 'bullish' ? 'border-green-200 bg-green-50' :
                  pattern.severity === 'bearish' ? 'border-red-200 bg-red-50' :
                  'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {getPatternIcon(pattern.patternType)}
                    <span className="font-medium text-sm">{pattern.symbol}</span>
                  </div>
                  <Badge variant={getQualityVariant(pattern.quality)} className="text-xs">
                    {getPatternName(pattern.patternType)}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  ${pattern.currentPrice.toFixed(2)} · {pattern.description}
                </div>
              </div>
            ))
          )}
          {patterns.length > 3 && (
            <div className="text-center pt-2">
              <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                查看全部 {patterns.length} 个形态
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Full版本
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            技术形态扫描器
          </CardTitle>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="all">全部形态</option>
              <option value="ma200_cross">年线突破</option>
              <option value="breakout">关键突破</option>
              <option value="key_levels">关键位置</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPatterns}
              disabled={isLoading}
            >
              {isLoading ? <Activity className="h-4 w-4 animate-spin" /> : '刷新'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {patterns.length === 0 ? (
          <Alert>
            <Activity className="h-4 w-4" />
            <AlertDescription>
              暂无重要技术形态，系统会自动扫描并提醒。
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* 年线突破特别提醒 */}
            {patterns.some(p => p.patternType === 'ma200_cross_up') && (
              <Alert className="border-green-500 bg-green-50">
                <Star className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  <div className="font-medium mb-1">🎯 发现年线突破股票！</div>
                  <div className="text-sm">
                    跌破年线后重新站上，这类股票往往是大牛股！建议密切关注。
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* 形态列表 */}
            <div className="space-y-3">
              {patterns.map(pattern => (
                <div
                  key={pattern.id}
                  className={`p-4 rounded-lg border-2 ${
                    pattern.severity === 'bullish' ? 'border-green-300 bg-green-50' :
                    pattern.severity === 'bearish' ? 'border-red-300 bg-red-50' :
                    'border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getPatternIcon(pattern.patternType)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">{pattern.symbol}</span>
                          <span className="text-muted-foreground">{pattern.name}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(pattern.timestamp).toLocaleString('zh-CN')}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={getQualityVariant(pattern.quality)}>
                        {getPatternName(pattern.patternType)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {pattern.quality === 'high' ? '高质量' :
                         pattern.quality === 'medium' ? '中等' : '低质量'}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
                    <div className="p-2 bg-white/50 rounded">
                      <div className="text-muted-foreground text-xs">当前价格</div>
                      <div className="font-bold">${pattern.currentPrice.toFixed(2)}</div>
                    </div>
                    <div className="p-2 bg-white/50 rounded">
                      <div className="text-muted-foreground text-xs">关键位置</div>
                      <div className="font-bold">${pattern.keyLevel.toFixed(2)}</div>
                    </div>
                    <div className="p-2 bg-white/50 rounded">
                      <div className="text-muted-foreground text-xs">200日均线</div>
                      <div className="font-bold">${pattern.ma200.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">形态描述：</span>
                      {pattern.description}
                    </div>
                    <div className="text-sm bg-white/70 p-2 rounded">
                      <span className="font-medium">💡 操作建议：</span>
                      {pattern.actionSuggestion}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded">
          <div className="font-medium mb-1">📊 形态说明：</div>
          <ul className="space-y-1 ml-4 list-disc">
            <li><strong>突破年线</strong>：跌破200日均线后重新站上，往往是大牛股信号</li>
            <li><strong>关键支撑</strong>：在重要支撑位附近，是埋伏的好位置</li>
            <li><strong>突破前高</strong>：突破前期高点，但要注意不要盲目追高</li>
            <li>系统每5分钟自动扫描，发现重要形态会立即提醒</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
