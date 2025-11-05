import { NextResponse } from 'next/server'

// 交易统计数据接口
interface TradingStatistics {
  recentWinRate: number // 最近10笔交易的胜率
  consecutiveLosses: number // 连续失败次数
  totalTrades: number // 总交易次数
  profitFactor: number // 盈亏比
  averageWin: number // 平均盈利
  averageLoss: number // 平均亏损
  lastTradeDate: string // 最后交易日期
  isCircuitBreakerActive: boolean // 熔断机制是否激活
}

// 生成Mock数据
function generateMockStatistics(): TradingStatistics {
  // 模拟最近交易表现
  const recentWinRate = 30 + Math.random() * 50 // 30%-80%
  const consecutiveLosses = Math.floor(Math.random() * 6) // 0-5次
  
  return {
    recentWinRate: parseFloat(recentWinRate.toFixed(1)),
    consecutiveLosses,
    totalTrades: 150 + Math.floor(Math.random() * 100),
    profitFactor: 1.2 + Math.random() * 0.8,
    averageWin: 5.5 + Math.random() * 3,
    averageLoss: -3.2 - Math.random() * 2,
    lastTradeDate: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
    isCircuitBreakerActive: consecutiveLosses >= 5
  }
}

export async function GET() {
  try {
    // TODO: 实际应用中，这里应该从数据库获取真实的交易统计数据
    // const statistics = await fetchRealStatistics()
    
    // 目前使用Mock数据
    const data = generateMockStatistics()
    
    return NextResponse.json({
      success: true,
      data,
      message: '获取交易统计成功'
    })
  } catch (error) {
    console.error('获取交易统计失败:', error)
    return NextResponse.json({
      success: false,
      error: '获取交易统计失败',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

// 真实数据获取示例（注释掉，供参考）
/*
async function fetchRealStatistics(): Promise<TradingStatistics> {
  // 从数据库获取最近的交易记录
  const recentTrades = await db.trades.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  })
  
  // 计算胜率
  const wins = recentTrades.filter(t => t.profitLoss > 0).length
  const recentWinRate = (wins / recentTrades.length) * 100
  
  // 计算连续失败次数
  let consecutiveLosses = 0
  for (const trade of recentTrades) {
    if (trade.profitLoss < 0) {
      consecutiveLosses++
    } else {
      break
    }
  }
  
  // 其他统计计算...
  
  return {
    recentWinRate,
    consecutiveLosses,
    // ... 其他字段
  }
}
*/
