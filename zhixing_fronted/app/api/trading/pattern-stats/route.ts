import { NextResponse } from 'next/server'

// 交易统计数据接口
interface TradeResult {
  id: number
  symbol: string
  date: string
  result: 'win' | 'loss'
  profitLoss: number
  reason?: string
}

interface TradingStats {
  recentTrades: TradeResult[]
  winRate: number
  consecutiveLosses: number
  consecutiveWins: number
  profitFactor: number
  totalTrades: number
  isCircuitBreakerActive: boolean
  circuitBreakerUntil?: string
  patternMatchScore: number
}

// 生成Mock数据
function generateMockStats(): TradingStats {
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
      if (i === 0 || (i > 0 && recentTrades[i - 1]?.result === 'loss')) {
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

export async function GET() {
  try {
    // TODO: 实际应用中，从数据库获取真实交易数据
    // const stats = await fetchRealStats()
    
    // 目前使用Mock数据
    const data = generateMockStats()
    
    return NextResponse.json({
      success: true,
      data,
      message: '获取交易模式统计成功'
    })
  } catch (error) {
    console.error('获取交易模式统计失败:', error)
    return NextResponse.json({
      success: false,
      error: '获取交易模式统计失败',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

// 真实数据获取示例（注释掉，供参考）
/*
async function fetchRealStats(): Promise<TradingStats> {
  // 1. 获取最近10笔交易
  const recentTrades = await db.trades.findMany({
    where: { status: 'closed' },
    orderBy: { closedAt: 'desc' },
    take: 10
  })
  
  // 2. 计算胜率
  const wins = recentTrades.filter(t => t.profitLoss > 0).length
  const winRate = (wins / recentTrades.length) * 100
  
  // 3. 计算连续失败/成功次数
  let consecutiveLosses = 0
  let consecutiveWins = 0
  
  for (const trade of recentTrades) {
    if (trade.profitLoss < 0) {
      consecutiveLosses++
    } else {
      break
    }
  }
  
  for (const trade of recentTrades) {
    if (trade.profitLoss > 0) {
      consecutiveWins++
    } else {
      break
    }
  }
  
  // 4. 计算盈亏比
  const avgWin = recentTrades
    .filter(t => t.profitLoss > 0)
    .reduce((sum, t) => sum + t.profitLoss, 0) / wins
    
  const avgLoss = Math.abs(
    recentTrades
      .filter(t => t.profitLoss < 0)
      .reduce((sum, t) => sum + t.profitLoss, 0) / (recentTrades.length - wins)
  )
  
  const profitFactor = avgWin / avgLoss
  
  // 5. 检查熔断状态
  const circuitBreaker = await db.circuitBreaker.findFirst({
    where: {
      userId: getCurrentUserId(),
      active: true,
      until: { gte: new Date() }
    }
  })
  
  // 6. 计算模式匹配度
  const patternMatchScore = await calculatePatternMatch()
  
  return {
    recentTrades: recentTrades.map(t => ({
      id: t.id,
      symbol: t.symbol,
      date: t.closedAt.toISOString(),
      result: t.profitLoss > 0 ? 'win' : 'loss',
      profitLoss: t.profitLoss,
      reason: t.exitReason
    })),
    winRate,
    consecutiveLosses,
    consecutiveWins,
    profitFactor,
    totalTrades: await db.trades.count(),
    isCircuitBreakerActive: !!circuitBreaker,
    circuitBreakerUntil: circuitBreaker?.until.toISOString(),
    patternMatchScore
  }
}
*/
