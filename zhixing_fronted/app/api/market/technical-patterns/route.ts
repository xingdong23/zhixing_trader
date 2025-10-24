import { NextResponse } from 'next/server'

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
  quality: 'high' | 'medium' | 'low'
  timestamp: string
}

// 生成Mock数据
function generateMockPatterns(): TechnicalPattern[] {
  const patterns: TechnicalPattern[] = []
  const symbols = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMD', 'META', 'AMZN', 'CRM', 'PLTR']
  
  // 生成年线突破
  if (Math.random() > 0.4) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)]
    const ma200 = 150 + Math.random() * 50
    const currentPrice = ma200 * (1.01 + Math.random() * 0.05)
    
    patterns.push({
      id: `pattern-${Date.now()}-1`,
      symbol,
      name: getStockName(symbol),
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
    const currentPrice = ma200 * (0.95 - Math.random() * 0.05)
    
    patterns.push({
      id: `pattern-${Date.now()}-2`,
      symbol,
      name: getStockName(symbol),
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
  if (Math.random() > 0.3) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)]
    const support = 180 + Math.random() * 30
    const currentPrice = support * (1.00 + Math.random() * 0.03)
    const ma200 = support * 0.95
    
    patterns.push({
      id: `pattern-${Date.now()}-3`,
      symbol,
      name: getStockName(symbol),
      patternType: 'support',
      severity: 'bullish',
      currentPrice,
      keyLevel: support,
      ma200,
      description: `${symbol}在关键支撑位${support.toFixed(2)}附近`,
      actionSuggestion: '当前在关键支撑位，是埋伏的好位置，不是追涨！',
      quality: 'high',
      timestamp: new Date().toISOString()
    })
  }
  
  // 生成突破前高
  if (Math.random() > 0.4) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)]
    const resistance = 200 + Math.random() * 50
    const currentPrice = resistance * (1.01 + Math.random() * 0.04)
    const ma200 = resistance * 0.90
    
    patterns.push({
      id: `pattern-${Date.now()}-4`,
      symbol,
      name: getStockName(symbol),
      patternType: 'breakout',
      severity: 'bullish',
      currentPrice,
      keyLevel: resistance,
      ma200,
      description: `${symbol}突破前期高点${resistance.toFixed(2)}`,
      actionSuggestion: '突破前高，但注意不要追高！等待回踩确认更安全。',
      quality: 'medium',
      timestamp: new Date().toISOString()
    })
  }
  
  // 生成关键阻力位
  if (Math.random() > 0.7) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)]
    const resistance = 220 + Math.random() * 30
    const currentPrice = resistance * (0.97 + Math.random() * 0.03)
    const ma200 = resistance * 0.92
    
    patterns.push({
      id: `pattern-${Date.now()}-5`,
      symbol,
      name: getStockName(symbol),
      patternType: 'resistance',
      severity: 'neutral',
      currentPrice,
      keyLevel: resistance,
      ma200,
      description: `${symbol}接近关键阻力位${resistance.toFixed(2)}`,
      actionSuggestion: '接近阻力位，注意可能回调。如有持仓可考虑减仓。',
      quality: 'medium',
      timestamp: new Date().toISOString()
    })
  }
  
  return patterns.slice(0, 6)
}

function getStockName(symbol: string): string {
  const names: Record<string, string> = {
    'AAPL': '苹果',
    'TSLA': '特斯拉',
    'NVDA': '英伟达',
    'MSFT': '微软',
    'GOOGL': '谷歌',
    'AMD': 'AMD',
    'META': 'Meta',
    'AMZN': '亚马逊',
    'CRM': 'Salesforce',
    'PLTR': 'Palantir'
  }
  return names[symbol] || symbol
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all'
    
    // TODO: 实际应用中，应该：
    // 1. 从数据库获取所有自选股的历史价格数据
    // 2. 计算各项技术指标（MA50, MA200, 前高前低等）
    // 3. 识别技术形态（突破、跌破、支撑、阻力）
    // 4. 评估信号质量
    // 5. 根据filter参数筛选
    
    // 目前使用Mock数据
    let data = generateMockPatterns()
    
    // 根据filter筛选
    if (filter === 'ma200_cross') {
      data = data.filter(p => p.patternType === 'ma200_cross_up' || p.patternType === 'ma200_cross_down')
    } else if (filter === 'breakout') {
      data = data.filter(p => p.patternType === 'breakout' || p.patternType === 'breakdown')
    } else if (filter === 'key_levels') {
      data = data.filter(p => p.patternType === 'support' || p.patternType === 'resistance')
    }
    
    return NextResponse.json({
      success: true,
      data,
      message: '获取技术形态成功'
    })
  } catch (error) {
    console.error('获取技术形态失败:', error)
    return NextResponse.json({
      success: false,
      error: '获取技术形态失败',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

// 真实数据分析示例（注释掉，供参考）
/*
async function scanTechnicalPatterns(): Promise<TechnicalPattern[]> {
  const patterns: TechnicalPattern[] = []
  
  // 1. 获取所有自选股
  const watchlist = await db.stocks.findMany({
    where: { inWatchlist: true }
  })
  
  for (const stock of watchlist) {
    // 2. 获取历史价格数据
    const historicalData = await db.stockPrices.findMany({
      where: { symbol: stock.symbol },
      orderBy: { date: 'desc' },
      take: 200
    })
    
    if (historicalData.length < 200) continue
    
    // 3. 计算技术指标
    const currentPrice = historicalData[0].close
    const ma50 = calculateMA(historicalData, 50)
    const ma200 = calculateMA(historicalData, 200)
    const previousMa200 = calculateMA(historicalData.slice(1), 200)
    
    // 4. 检测年线突破
    if (currentPrice > ma200 && historicalData[1].close <= previousMa200) {
      // 从下方突破年线
      patterns.push({
        id: generateId(),
        symbol: stock.symbol,
        name: stock.name,
        patternType: 'ma200_cross_up',
        severity: 'bullish',
        currentPrice,
        keyLevel: ma200,
        ma200,
        description: `${stock.symbol}突破200日均线`,
        actionSuggestion: '重新站上年线，可能是大牛股！',
        quality: evaluateQuality(historicalData, 'ma200_cross_up'),
        timestamp: new Date().toISOString()
      })
    }
    
    // 5. 检测年线跌破
    if (currentPrice < ma200 && historicalData[1].close >= previousMa200) {
      patterns.push({
        id: generateId(),
        symbol: stock.symbol,
        name: stock.name,
        patternType: 'ma200_cross_down',
        severity: 'bearish',
        currentPrice,
        keyLevel: ma200,
        ma200,
        description: `${stock.symbol}跌破200日均线`,
        actionSuggestion: '跌破年线，趋势转弱。',
        quality: evaluateQuality(historicalData, 'ma200_cross_down'),
        timestamp: new Date().toISOString()
      })
    }
    
    // 6. 识别关键支撑位
    const support = findKeySupport(historicalData)
    if (support && Math.abs(currentPrice - support) / support < 0.03) {
      // 价格在支撑位3%范围内
      patterns.push({
        id: generateId(),
        symbol: stock.symbol,
        name: stock.name,
        patternType: 'support',
        severity: 'bullish',
        currentPrice,
        keyLevel: support,
        ma200,
        description: `${stock.symbol}在关键支撑位${support.toFixed(2)}附近`,
        actionSuggestion: '关键支撑位，埋伏好位置！',
        quality: 'high',
        timestamp: new Date().toISOString()
      })
    }
    
    // 7. 识别关键阻力位
    const resistance = findKeyResistance(historicalData)
    if (resistance && Math.abs(currentPrice - resistance) / resistance < 0.03) {
      patterns.push({
        id: generateId(),
        symbol: stock.symbol,
        name: stock.name,
        patternType: 'resistance',
        severity: 'neutral',
        currentPrice,
        keyLevel: resistance,
        ma200,
        description: `${stock.symbol}接近关键阻力位${resistance.toFixed(2)}`,
        actionSuggestion: '接近阻力位，注意可能回调。',
        quality: 'medium',
        timestamp: new Date().toISOString()
      })
    }
  }
  
  return patterns
}

function calculateMA(data: any[], period: number): number {
  const prices = data.slice(0, period).map(d => d.close)
  return prices.reduce((sum, p) => sum + p, 0) / prices.length
}

function evaluateQuality(data: any[], patternType: string): 'high' | 'medium' | 'low' {
  // 根据成交量、趋势强度等评估信号质量
  const volumeTrend = calculateVolumeTrend(data.slice(0, 5))
  const trendStrength = calculateTrendStrength(data.slice(0, 20))
  
  if (volumeTrend > 1.5 && trendStrength > 0.7) return 'high'
  if (volumeTrend > 1.2 && trendStrength > 0.5) return 'medium'
  return 'low'
}
*/
