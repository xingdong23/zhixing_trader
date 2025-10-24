import { NextResponse } from 'next/server'

interface ReverseAlert {
  id: string
  type: 'market_crash' | 'market_rally' | 'position_crash' | 'leader_weak' | 'panic_buy'
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  actionSuggestion: string
  data?: {
    symbol?: string
    changePercent?: number
    vix?: number
    uvxyDeviation?: number
    historicalData?: string
  }
  timestamp: string
  dismissed: boolean
}

// 生成Mock数据
function generateMockAlerts(): ReverseAlert[] {
  const alerts: ReverseAlert[] = []
  const rand = Math.random()
  
  // 30%概率：市场大跌提醒
  if (rand < 0.3) {
    alerts.push({
      id: `alert-${Date.now()}-1`,
      type: 'market_crash',
      severity: 'critical',
      title: '🎯 市场大跌 - 捞货机会！',
      message: '标普500大跌-3.5%，纳斯达克跌-4.2%',
      actionSuggestion: '这是捞货机会，不是止损时机！查看你的观察清单，有优质股票在关键支撑位吗？',
      data: {
        changePercent: -3.5,
        vix: 32.5,
        historicalData: '过去10次类似大跌后，5日内平均反弹+4.8%'
      },
      timestamp: new Date().toISOString(),
      dismissed: false
    })
  }
  
  // 25%概率：市场大涨警告
  if (rand > 0.3 && rand < 0.55) {
    alerts.push({
      id: `alert-${Date.now()}-2`,
      type: 'market_rally',
      severity: 'warning',
      title: '⚠️ 市场大涨 - 警惕追高！',
      message: '标普500大涨+3.8%，情绪高涨',
      actionSuggestion: '市场情绪过热，不要在兴奋时追涨！坚持你的入场计划。',
      data: {
        changePercent: 3.8,
        vix: 11.5,
        historicalData: '前期龙头股NVDA今日仅+0.8%，注意龙头疲软信号'
      },
      timestamp: new Date().toISOString(),
      dismissed: false
    })
  }
  
  // 20%概率：持仓大跌联动恐慌指数
  if (rand > 0.55 && rand < 0.75) {
    const symbols = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL']
    const symbol = symbols[Math.floor(Math.random() * symbols.length)]
    const changePercent = -(5 + Math.random() * 5)
    
    alerts.push({
      id: `alert-${Date.now()}-3`,
      type: 'position_crash',
      severity: 'critical',
      title: '🛑 持仓大跌 - 检查恐慌指数！',
      message: `你的持仓${symbol}下跌${changePercent.toFixed(1)}%`,
      actionSuggestion: 'UVXY指数+56%严重偏离均线，当前极度恐慌！不要在此时止损，这可能是最后一跌！',
      data: {
        symbol,
        changePercent,
        uvxyDeviation: 56,
        vix: 35.2
      },
      timestamp: new Date().toISOString(),
      dismissed: false
    })
  }
  
  // 15%概率：龙头疲软警告
  if (rand > 0.75 && rand < 0.9) {
    alerts.push({
      id: `alert-${Date.now()}-4`,
      type: 'leader_weak',
      severity: 'warning',
      title: '⚡ 龙头疲软 - 注意风险！',
      message: '前期龙头股开始疲软',
      actionSuggestion: '市场波动加大，龙头不再领涨。不符合你交易模式的股票坚决不进！',
      data: {
        historicalData: 'NVDA连续3日涨幅<1%，TSLA今日转跌-2.1%'
      },
      timestamp: new Date().toISOString(),
      dismissed: false
    })
  }
  
  // 10%概率：恐慌抄底提醒
  if (rand > 0.9) {
    alerts.push({
      id: `alert-${Date.now()}-5`,
      type: 'panic_buy',
      severity: 'info',
      title: '💡 极度恐慌 - 考虑分批抄底',
      message: 'VIX指数达到38.5，市场极度恐慌',
      actionSuggestion: '历史数据显示，VIX>35时通常接近底部。可以考虑分批建仓优质标的。',
      data: {
        vix: 38.5,
        uvxyDeviation: 62,
        historicalData: '过去5次VIX>35后，30日内平均上涨+12.3%'
      },
      timestamp: new Date().toISOString(),
      dismissed: false
    })
  }
  
  return alerts
}

export async function GET() {
  try {
    // TODO: 实际应用中，应该：
    // 1. 获取市场实时数据
    // 2. 获取用户持仓数据
    // 3. 分析触发条件
    // 4. 生成智能提醒
    // 5. 检查历史数据支持
    
    // 目前使用Mock数据
    const data = generateMockAlerts()
    
    return NextResponse.json({
      success: true,
      data,
      message: '获取反向提醒成功'
    })
  } catch (error) {
    console.error('获取反向提醒失败:', error)
    return NextResponse.json({
      success: false,
      error: '获取反向提醒失败',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

// 真实数据分析示例（注释掉，供参考）
/*
async function analyzeMarketAndGenerateAlerts(): Promise<ReverseAlert[]> {
  const alerts: ReverseAlert[] = []
  
  // 1. 获取市场数据
  const marketData = await fetchMarketData()
  const spyChange = marketData.spy.changePercent
  const nasdaqChange = marketData.nasdaq.changePercent
  const vix = marketData.vix.current
  
  // 2. 检查市场大跌（-3%以上）
  if (spyChange <= -3 || nasdaqChange <= -3) {
    // 获取历史相似情况
    const historicalData = await getHistoricalRecovery('market_crash', 3)
    
    alerts.push({
      id: generateId(),
      type: 'market_crash',
      severity: 'critical',
      title: '🎯 市场大跌 - 捞货机会！',
      message: `标普500跌${spyChange}%，纳斯达克跌${nasdaqChange}%`,
      actionSuggestion: '这是捞货机会，不是止损时机！查看你的观察清单。',
      data: {
        changePercent: spyChange,
        vix,
        historicalData: `过去${historicalData.count}次类似大跌后，5日内平均反弹+${historicalData.avgRecovery}%`
      },
      timestamp: new Date().toISOString(),
      dismissed: false
    })
  }
  
  // 3. 检查市场大涨（+3%以上）
  if (spyChange >= 3 || nasdaqChange >= 3) {
    // 检查龙头股表现
    const leaders = await checkLeaderStocks()
    const leadersWeak = leaders.some(l => l.changePercent < 1)
    
    alerts.push({
      id: generateId(),
      type: 'market_rally',
      severity: 'warning',
      title: '⚠️ 市场大涨 - 警惕追高！',
      message: `标普500涨+${spyChange}%，情绪高涨`,
      actionSuggestion: '市场情绪过热，不要在兴奋时追涨！',
      data: {
        changePercent: spyChange,
        vix,
        historicalData: leadersWeak ? '前期龙头股表现疲软，注意风险' : undefined
      },
      timestamp: new Date().toISOString(),
      dismissed: false
    })
  }
  
  // 4. 检查用户持仓大跌
  const positions = await getUserPositions()
  const uvxyData = await getUVXYData()
  
  for (const position of positions) {
    if (position.unrealizedPnlPercent <= -5) {
      // 持仓跌超5%，检查恐慌指数
      if (uvxyData.deviation > 40) {
        alerts.push({
          id: generateId(),
          type: 'position_crash',
          severity: 'critical',
          title: '🛑 持仓大跌 - 检查恐慌指数！',
          message: `你的持仓${position.symbol}下跌${position.unrealizedPnlPercent}%`,
          actionSuggestion: `UVXY指数+${uvxyData.deviation}%严重偏离，极度恐慌！不要止损！`,
          data: {
            symbol: position.symbol,
            changePercent: position.unrealizedPnlPercent,
            uvxyDeviation: uvxyData.deviation,
            vix
          },
          timestamp: new Date().toISOString(),
          dismissed: false
        })
      }
    }
  }
  
  return alerts
}
*/
