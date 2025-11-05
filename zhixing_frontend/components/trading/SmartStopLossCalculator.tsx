'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Activity,
  ArrowDown,
  ArrowUp
} from 'lucide-react'

// 股票价格分析数据
interface PriceAnalysis {
  currentPrice: number
  highPrice: number // 近期高点
  lowPrice: number // 近期低点
  ma50: number // 50日均线
  ma200: number // 200日均线（年线）
  atr: number // 平均真实波幅
  positionType: 'high' | 'mid' | 'low' // 当前位置类型
  positionScore: number // 位置分数 0-100
  distanceFromHigh: number // 距离高点的百分比
  distanceFromLow: number // 距离低点的百分比
}

// 止损建议
interface StopLossRecommendation {
  narrowStopLoss: {
    percentage: number
    price: number
    description: string
  }
  normalStopLoss: {
    percentage: number
    price: number
    description: string
  }
  wideStopLoss: {
    percentage: number
    price: number
    description: string
  }
  atrStopLoss: {
    price: number
    atrMultiple: number
    description: string
  }
  recommended: 'narrow' | 'normal' | 'wide' | 'atr'
  reason: string
}

interface SmartStopLossCalculatorProps {
  symbol: string
  currentPrice: number
  onStopLossSelect?: (stopLoss: number) => void
  variant?: 'full' | 'compact'
}

export default function SmartStopLossCalculator({
  symbol,
  currentPrice,
  onStopLossSelect,
  variant = 'full'
}: SmartStopLossCalculatorProps) {
  const [analysis, setAnalysis] = useState<PriceAnalysis | null>(null)
  const [recommendation, setRecommendation] = useState<StopLossRecommendation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedType, setSelectedType] = useState<'narrow' | 'normal' | 'wide' | 'atr'>('normal')

  // 获取价格分析数据
  const fetchPriceAnalysis = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/stocks/${symbol}/price-analysis`)
      const result = await response.json()
      
      if (result.success && result.data) {
        setAnalysis(result.data)
        calculateStopLoss(result.data)
      } else {
        throw new Error('获取数据失败')
      }
    } catch (error) {
      console.error('获取价格分析失败:', error)
      // 使用Mock数据
      const mockAnalysis = generateMockAnalysis(currentPrice)
      setAnalysis(mockAnalysis)
      calculateStopLoss(mockAnalysis)
    } finally {
      setIsLoading(false)
    }
  }

  // 生成Mock数据
  const generateMockAnalysis = (price: number): PriceAnalysis => {
    const highPrice = price * (1.15 + Math.random() * 0.15) // 高点在当前价格上方15-30%
    const lowPrice = price * (0.70 + Math.random() * 0.15) // 低点在当前价格下方15-30%
    const ma50 = price * (0.95 + Math.random() * 0.1) // 50日均线
    const ma200 = price * (0.85 + Math.random() * 0.2) // 200日均线
    const atr = price * (0.02 + Math.random() * 0.03) // ATR约为价格的2-5%
    
    const distanceFromHigh = ((highPrice - price) / highPrice) * 100
    const distanceFromLow = ((price - lowPrice) / lowPrice) * 100
    
    // 计算位置分数（0-100，100表示在最高点）
    const positionScore = ((price - lowPrice) / (highPrice - lowPrice)) * 100
    
    // 判断位置类型
    let positionType: 'high' | 'mid' | 'low' = 'mid'
    if (positionScore >= 70) positionType = 'high'
    else if (positionScore <= 30) positionType = 'low'
    
    return {
      currentPrice: price,
      highPrice,
      lowPrice,
      ma50,
      ma200,
      atr,
      positionType,
      positionScore,
      distanceFromHigh,
      distanceFromLow
    }
  }

  // 计算止损建议
  const calculateStopLoss = (data: PriceAnalysis) => {
    const { currentPrice, positionType, atr, positionScore } = data
    
    // 窄止损（适合高位入场）
    const narrowPercentage = 3
    const narrowPrice = currentPrice * (1 - narrowPercentage / 100)
    
    // 正常止损（适合中位入场）
    const normalPercentage = 5
    const normalPrice = currentPrice * (1 - normalPercentage / 100)
    
    // 宽止损（适合低位入场）
    const widePercentage = 8
    const widePrice = currentPrice * (1 - widePercentage / 100)
    
    // ATR动态止损（2倍ATR）
    const atrMultiple = 2
    const atrPrice = currentPrice - atr * atrMultiple
    
    // 根据位置类型推荐止损策略
    let recommended: 'narrow' | 'normal' | 'wide' | 'atr' = 'normal'
    let reason = ''
    
    if (positionType === 'high') {
      recommended = 'narrow'
      reason = `当前价格距离高点仅${data.distanceFromHigh.toFixed(1)}%，处于高位区域。建议使用窄止损（-${narrowPercentage}%），快速止损以控制风险。`
    } else if (positionType === 'low') {
      recommended = 'wide'
      reason = `当前价格距离低点${data.distanceFromLow.toFixed(1)}%，处于低位区域。可以使用宽止损（-${widePercentage}%），给予更多空间。`
    } else {
      // 中位时，根据市场波动性选择
      if (atr / currentPrice > 0.04) { // 高波动
        recommended = 'atr'
        reason = `当前市场波动较大（ATR ${atr.toFixed(2)}），建议使用动态ATR止损（${atrMultiple}倍ATR），适应市场波动。`
      } else {
        recommended = 'normal'
        reason = `当前价格处于中位区域，市场波动正常。建议使用标准止损（-${normalPercentage}%）。`
      }
    }
    
    setRecommendation({
      narrowStopLoss: {
        percentage: narrowPercentage,
        price: narrowPrice,
        description: '适合高位入场，快速止损'
      },
      normalStopLoss: {
        percentage: normalPercentage,
        price: normalPrice,
        description: '标准止损，适合大多数情况'
      },
      wideStopLoss: {
        percentage: widePercentage,
        price: widePrice,
        description: '适合低位入场，给予更多空间'
      },
      atrStopLoss: {
        price: atrPrice,
        atrMultiple,
        description: '动态止损，根据市场波动调整'
      },
      recommended,
      reason
    })
    
    setSelectedType(recommended)
  }

  // 选择止损并通知父组件
  const handleSelectStopLoss = (type: 'narrow' | 'normal' | 'wide' | 'atr') => {
    setSelectedType(type)
    if (recommendation && onStopLossSelect) {
      const prices = {
        narrow: recommendation.narrowStopLoss.price,
        normal: recommendation.normalStopLoss.price,
        wide: recommendation.wideStopLoss.price,
        atr: recommendation.atrStopLoss.price
      }
      onStopLossSelect(prices[type])
    }
  }

  useEffect(() => {
    fetchPriceAnalysis()
  }, [symbol, currentPrice])

  if (isLoading || !analysis || !recommendation) {
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
          <CardTitle className="text-sm">智能止损建议</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert className="py-2">
            <Target className="h-3 w-3" />
            <AlertDescription className="text-xs">
              {recommendation.reason}
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-muted/50 rounded">
              <div className="text-muted-foreground">建议止损</div>
              <div className="font-bold text-base">
                ${recommendation[`${recommendation.recommended}StopLoss`].price.toFixed(2)}
              </div>
              <div className="text-muted-foreground">
                {recommendation.recommended === 'atr' ? (
                  `${recommendation.atrStopLoss.atrMultiple}x ATR`
                ) : (
                  `-${recommendation[`${recommendation.recommended}StopLoss`].percentage}%`
                )}
              </div>
            </div>
            <div className="p-2 bg-muted/50 rounded">
              <div className="text-muted-foreground">当前位置</div>
              <div className="font-bold text-base">
                {analysis.positionType === 'high' ? '高位' : 
                 analysis.positionType === 'low' ? '低位' : '中位'}
              </div>
              <div className="text-muted-foreground">
                {analysis.positionScore.toFixed(0)}分
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Full版本
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          智能止损计算器 - {symbol}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 当前价格位置分析 */}
        <div className="space-y-3">
          <div className="font-medium">价格位置分析</div>
          
          <div className="relative">
            {/* 价格区间可视化 */}
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>低点 ${analysis.lowPrice.toFixed(2)}</span>
              <span>当前 ${analysis.currentPrice.toFixed(2)}</span>
              <span>高点 ${analysis.highPrice.toFixed(2)}</span>
            </div>
            
            <div className="relative h-8 bg-gradient-to-r from-green-200 via-yellow-200 to-red-200 rounded-lg">
              {/* 当前价格指示器 */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-blue-600"
                style={{ left: `${analysis.positionScore}%` }}
              >
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold whitespace-nowrap">
                  ▼ 当前
                </div>
              </div>
            </div>
            
            <div className="flex justify-between text-xs mt-2">
              <Badge variant={analysis.positionType === 'low' ? 'default' : 'outline'}>
                低位区 (0-30%)
              </Badge>
              <Badge variant={analysis.positionType === 'mid' ? 'default' : 'outline'}>
                中位区 (30-70%)
              </Badge>
              <Badge variant={analysis.positionType === 'high' ? 'default' : 'outline'}>
                高位区 (70-100%)
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="p-3 bg-muted/50 rounded">
              <div className="text-muted-foreground text-xs">位置评分</div>
              <div className="font-bold text-lg">{analysis.positionScore.toFixed(0)}分</div>
              <div className="text-xs">
                {analysis.positionType === 'high' && '🔴 高位'}
                {analysis.positionType === 'mid' && '🟡 中位'}
                {analysis.positionType === 'low' && '🟢 低位'}
              </div>
            </div>
            
            <div className="p-3 bg-muted/50 rounded">
              <div className="text-muted-foreground text-xs">距高点</div>
              <div className="font-bold text-lg text-red-600">
                -{analysis.distanceFromHigh.toFixed(1)}%
              </div>
              <div className="text-xs">${analysis.highPrice.toFixed(2)}</div>
            </div>
            
            <div className="p-3 bg-muted/50 rounded">
              <div className="text-muted-foreground text-xs">距低点</div>
              <div className="font-bold text-lg text-green-600">
                +{analysis.distanceFromLow.toFixed(1)}%
              </div>
              <div className="text-xs">${analysis.lowPrice.toFixed(2)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-2 bg-muted/30 rounded">
              <div className="text-muted-foreground text-xs">50日均线</div>
              <div className="font-medium">${analysis.ma50.toFixed(2)}</div>
              <div className={`text-xs ${analysis.currentPrice > analysis.ma50 ? 'text-green-600' : 'text-red-600'}`}>
                {analysis.currentPrice > analysis.ma50 ? '↑ 站上' : '↓ 跌破'}
              </div>
            </div>
            
            <div className="p-2 bg-muted/30 rounded">
              <div className="text-muted-foreground text-xs">200日均线（年线）</div>
              <div className="font-medium">${analysis.ma200.toFixed(2)}</div>
              <div className={`text-xs ${analysis.currentPrice > analysis.ma200 ? 'text-green-600' : 'text-red-600'}`}>
                {analysis.currentPrice > analysis.ma200 ? '↑ 站上' : '↓ 跌破'}
              </div>
            </div>
          </div>
        </div>

        {/* 止损建议 */}
        <div className="space-y-3">
          <div className="font-medium">止损策略建议</div>
          
          <Alert className={
            recommendation.recommended === 'narrow' ? 'border-red-500 bg-red-50' :
            recommendation.recommended === 'wide' ? 'border-green-500 bg-green-50' :
            'border-blue-500 bg-blue-50'
          }>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-1">推荐策略</div>
              <div className="text-sm">{recommendation.reason}</div>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-3">
            {/* 窄止损 */}
            <div
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedType === 'narrow'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleSelectStopLoss('narrow')}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">窄止损</div>
                {recommendation.recommended === 'narrow' && (
                  <Badge variant="default">推荐</Badge>
                )}
              </div>
              <div className="text-2xl font-bold text-red-600">
                -{recommendation.narrowStopLoss.percentage}%
              </div>
              <div className="text-sm text-muted-foreground">
                ${recommendation.narrowStopLoss.price.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {recommendation.narrowStopLoss.description}
              </div>
            </div>

            {/* 标准止损 */}
            <div
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedType === 'normal'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleSelectStopLoss('normal')}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">标准止损</div>
                {recommendation.recommended === 'normal' && (
                  <Badge variant="default">推荐</Badge>
                )}
              </div>
              <div className="text-2xl font-bold text-orange-600">
                -{recommendation.normalStopLoss.percentage}%
              </div>
              <div className="text-sm text-muted-foreground">
                ${recommendation.normalStopLoss.price.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {recommendation.normalStopLoss.description}
              </div>
            </div>

            {/* 宽止损 */}
            <div
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedType === 'wide'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleSelectStopLoss('wide')}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">宽止损</div>
                {recommendation.recommended === 'wide' && (
                  <Badge variant="default">推荐</Badge>
                )}
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                -{recommendation.wideStopLoss.percentage}%
              </div>
              <div className="text-sm text-muted-foreground">
                ${recommendation.wideStopLoss.price.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {recommendation.wideStopLoss.description}
              </div>
            </div>

            {/* ATR动态止损 */}
            <div
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedType === 'atr'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleSelectStopLoss('atr')}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">ATR动态</div>
                {recommendation.recommended === 'atr' && (
                  <Badge variant="default">推荐</Badge>
                )}
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {recommendation.atrStopLoss.atrMultiple}x ATR
              </div>
              <div className="text-sm text-muted-foreground">
                ${recommendation.atrStopLoss.price.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {recommendation.atrStopLoss.description}
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded">
            <div className="font-medium mb-1">💡 使用建议：</div>
            <ul className="space-y-1 ml-4 list-disc">
              <li>高位入场：使用窄止损（-3%），快速止损保护资金</li>
              <li>低位入场：使用宽止损（-8%），给予反弹空间</li>
              <li>中位入场：根据波动性选择标准止损或ATR动态止损</li>
              <li>高波动市场：优先考虑ATR动态止损，适应市场波动</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
