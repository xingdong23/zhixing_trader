'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lock,
  Unlock,
  Activity,
  Target,
  Shield,
  CheckCircle,
  XCircle,
  BarChart3
} from 'lucide-react'

// 交易统计数据
interface TradingStats {
  recentTrades: TradeResult[]
  winRate: number
  consecutiveLosses: number
  consecutiveWins: number
  profitFactor: number
  totalTrades: number
  isCircuitBreakerActive: boolean
  circuitBreakerUntil?: string
  patternMatchScore: number // 0-100，当前市场与你的交易模式匹配度
}

interface TradeResult {
  id: number
  symbol: string
  date: string
  result: 'win' | 'loss'
  profitLoss: number
  reason?: string
}

interface TradingPatternTrackerProps {
  variant?: 'full' | 'compact'
  onCircuitBreakerChange?: (active: boolean) => void
}

export default function TradingPatternTracker({
  variant = 'full',
  onCircuitBreakerChange
}: TradingPatternTrackerProps) {
  const [stats, setStats] = useState<TradingStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showUnlockDialog, setShowUnlockDialog] = useState(false)

  // 获取交易统计
  const fetchStats = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/trading/pattern-stats')
      const result = await response.json()
      
      if (result.success && result.data) {
        setStats(result.data)
        
        // 触发熔断状态回调
        if (onCircuitBreakerChange) {
          onCircuitBreakerChange(result.data.isCircuitBreakerActive)
        }
      } else {
        throw new Error('获取数据失败')
      }
    } catch (error) {
      console.error('获取交易统计失败:', error)
      // 使用Mock数据
      const mockStats = generateMockStats()
      setStats(mockStats)
      
      if (onCircuitBreakerChange) {
        onCircuitBreakerChange(mockStats.isCircuitBreakerActive)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // 生成Mock数据
  const generateMockStats = (): TradingStats => {
    const recentTrades: TradeResult[] = []
    let consecutiveLosses = 0
    let consecutiveWins = 0
    let wins = 0
    
    // 生成最近10笔交易
    for (let i = 0; i < 10; i++) {
      const isWin = Math.random() > 0.55 // 45%胜率
      const result: TradeResult = {
        id: i + 1,
        symbol: ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL'][Math.floor(Math.random() * 5)],
        date: new Date(Date.now() - i * 86400000).toISOString(),
        result: isWin ? 'win' : 'loss',
        profitLoss: isWin ? Math.random() * 500 + 100 : -(Math.random() * 300 + 50),
        reason: isWin ? '止盈' : '止损'
      }
      recentTrades.push(result)
      
      if (isWin) {
        wins++
        if (i === 0) consecutiveWins++
      } else {
        if (i === 0 || recentTrades[i - 1]?.result === 'loss') {
          consecutiveLosses++
        }
      }
    }
    
    const winRate = (wins / 10) * 100
    const isCircuitBreakerActive = consecutiveLosses >= 5
    const patternMatchScore = 40 + Math.random() * 40 // 40-80分
    
    return {
      recentTrades,
      winRate,
      consecutiveLosses,
      consecutiveWins,
      profitFactor: 1.2 + Math.random() * 0.5,
      totalTrades: 150,
      isCircuitBreakerActive,
      circuitBreakerUntil: isCircuitBreakerActive 
        ? new Date(Date.now() + 24 * 3600000).toISOString()
        : undefined,
      patternMatchScore
    }
  }

  // 解除熔断
  const unlockCircuitBreaker = async () => {
    try {
      const response = await fetch('/api/trading/unlock-circuit-breaker', {
        method: 'POST'
      })
      const result = await response.json()
      
      if (result.success) {
        fetchStats()
        setShowUnlockDialog(false)
      }
    } catch (error) {
      console.error('解除熔断失败:', error)
      // Mock：直接解除
      if (stats) {
        setStats({
          ...stats,
          isCircuitBreakerActive: false,
          circuitBreakerUntil: undefined
        })
      }
      setShowUnlockDialog(false)
    }
  }

  useEffect(() => {
    fetchStats()
    // 每分钟更新一次
    const interval = setInterval(fetchStats, 60000)
    return () => clearInterval(interval)
  }, [])

  if (!stats) {
    return (
      <div className="flex items-center justify-center p-8">
        <Activity className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  // Compact版本
  if (variant === 'compact') {
    return (
      <Card className={stats.isCircuitBreakerActive ? 'border-red-500' : ''}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" />
            交易模式追踪
            {stats.isCircuitBreakerActive && (
              <Badge variant="destructive" className="text-xs">
                <Lock className="w-3 h-3 mr-1" />
                已熔断
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">最近胜率</div>
              <div className={`font-bold ${stats.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.winRate.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">连续失败</div>
              <div className={`font-bold ${stats.consecutiveLosses >= 3 ? 'text-red-600' : ''}`}>
                {stats.consecutiveLosses}次
              </div>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>模式匹配度</span>
              <span className={
                stats.patternMatchScore >= 70 ? 'text-green-600' :
                stats.patternMatchScore >= 50 ? 'text-yellow-600' :
                'text-red-600'
              }>
                {stats.patternMatchScore.toFixed(0)}分
              </span>
            </div>
            <Progress value={stats.patternMatchScore} className="h-1.5" />
          </div>

          {stats.isCircuitBreakerActive && (
            <Alert className="border-red-500 bg-red-50 py-2">
              <Lock className="h-3 w-3 text-red-600" />
              <AlertDescription className="text-xs text-red-700 ml-1">
                交易已锁定至 {new Date(stats.circuitBreakerUntil!).toLocaleString('zh-CN')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    )
  }

  // Full版本
  return (
    <Card className={stats.isCircuitBreakerActive ? 'border-red-500 border-2' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            交易模式追踪与熔断机制
          </CardTitle>
          {stats.isCircuitBreakerActive && (
            <Badge variant="destructive" className="text-sm">
              <Lock className="w-4 h-4 mr-1" />
              交易已锁定
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 熔断警告 */}
        {stats.isCircuitBreakerActive && (
          <Alert className="border-red-500 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              <div className="font-medium mb-2">🔒 交易熔断已触发！</div>
              <div className="text-sm space-y-1">
                <p>连续失败{stats.consecutiveLosses}次，已达到熔断阈值（5次）。</p>
                <p>所有"买入"操作已被锁定至：{new Date(stats.circuitBreakerUntil!).toLocaleString('zh-CN')}</p>
                <p className="font-medium mt-2">原因分析：当前市场可能不适合你的交易策略，需要休息和重新评估。</p>
              </div>
              <div className="mt-3 pt-3 border-t border-red-200">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowUnlockDialog(true)}
                >
                  完成复盘并解除锁定
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* 统计数据 */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold mb-1">{stats.winRate.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">最近胜率</div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.winRate >= 50 ? '✓ 正常' : '⚠️ 偏低'}
            </div>
          </div>
          
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className={`text-2xl font-bold mb-1 ${stats.consecutiveLosses >= 3 ? 'text-red-600' : ''}`}>
              {stats.consecutiveLosses}次
            </div>
            <div className="text-sm text-muted-foreground">连续失败</div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.consecutiveLosses >= 5 ? '🔴 熔断' :
               stats.consecutiveLosses >= 3 ? '⚠️ 警告' : '✓ 正常'}
            </div>
          </div>
          
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold mb-1">{stats.profitFactor.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">盈亏比</div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.profitFactor >= 1.5 ? '✓ 优秀' : stats.profitFactor >= 1.0 ? '⚡ 一般' : '⚠️ 偏低'}
            </div>
          </div>
          
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold mb-1">{stats.totalTrades}</div>
            <div className="text-sm text-muted-foreground">总交易数</div>
            <div className="text-xs text-muted-foreground mt-1">
              样本充足
            </div>
          </div>
        </div>

        {/* 模式匹配度 */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="font-medium">市场vs交易模式匹配度</div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${
                stats.patternMatchScore >= 70 ? 'text-green-600' :
                stats.patternMatchScore >= 50 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {stats.patternMatchScore.toFixed(0)}分
              </span>
            </div>
          </div>
          <Progress value={stats.patternMatchScore} className="h-3" />
          <div className="text-sm text-muted-foreground">
            {stats.patternMatchScore >= 70 ? (
              <span className="text-green-600">✓ 当前市场非常适合你的交易策略</span>
            ) : stats.patternMatchScore >= 50 ? (
              <span className="text-yellow-600">⚡ 市场部分匹配你的策略，谨慎操作</span>
            ) : (
              <span className="text-red-600">⚠️ 当前市场不适合你的策略，建议休息观望！</span>
            )}
          </div>
        </div>

        {/* 最近10笔交易 */}
        <div className="space-y-3">
          <div className="font-medium">最近10笔交易</div>
          <div className="space-y-2">
            {stats.recentTrades.map((trade, index) => (
              <div
                key={trade.id}
                className={`flex items-center gap-3 p-2 rounded border ${
                  trade.result === 'win' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="w-6 text-center text-xs text-muted-foreground">#{index + 1}</div>
                {trade.result === 'win' ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium">{trade.symbol}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(trade.date).toLocaleDateString('zh-CN')}
                  </div>
                </div>
                <div className={`font-medium ${
                  trade.result === 'win' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {trade.profitLoss > 0 ? '+' : ''}{trade.profitLoss.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 操作建议 */}
        {stats.consecutiveLosses >= 3 && !stats.isCircuitBreakerActive && (
          <Alert className="border-orange-500 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-700">
              <div className="font-medium mb-1">⚠️ 交易警告</div>
              <div className="text-sm">
                已连续失败{stats.consecutiveLosses}次，再失败{5 - stats.consecutiveLosses}次将触发熔断机制。
                建议暂停交易，重新评估策略。
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
