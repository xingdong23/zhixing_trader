import { NextResponse } from 'next/server'

interface PriceAnalysis {
  currentPrice: number
  highPrice: number
  lowPrice: number
  ma50: number
  ma200: number
  atr: number
  positionType: 'high' | 'mid' | 'low'
  positionScore: number
  distanceFromHigh: number
  distanceFromLow: number
}

// 生成Mock数据
function generateMockAnalysis(price: number): PriceAnalysis {
  const highPrice = price * (1.15 + Math.random() * 0.15)
  const lowPrice = price * (0.70 + Math.random() * 0.15)
  const ma50 = price * (0.95 + Math.random() * 0.1)
  const ma200 = price * (0.85 + Math.random() * 0.2)
  const atr = price * (0.02 + Math.random() * 0.03)
  
  const distanceFromHigh = ((highPrice - price) / highPrice) * 100
  const distanceFromLow = ((price - lowPrice) / lowPrice) * 100
  const positionScore = ((price - lowPrice) / (highPrice - lowPrice)) * 100
  
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

export async function GET(
  request: Request,
  { params }: { params: { symbol: string } }
) {
  try {
    const { symbol } = params
    const { searchParams } = new URL(request.url)
    const currentPrice = parseFloat(searchParams.get('price') || '100')
    
    // TODO: 实际应用中，从数据库或API获取真实的价格分析数据
    // const analysis = await fetchRealPriceAnalysis(symbol)
    
    // 目前使用Mock数据
    const data = generateMockAnalysis(currentPrice)
    
    return NextResponse.json({
      success: true,
      data,
      message: '获取价格分析成功'
    })
  } catch (error) {
    console.error('获取价格分析失败:', error)
    return NextResponse.json({
      success: false,
      error: '获取价格分析失败',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

// 真实数据获取示例（注释掉，供参考）
/*
async function fetchRealPriceAnalysis(symbol: string): Promise<PriceAnalysis> {
  // 1. 获取股票历史数据
  const historicalData = await db.stockPrices.findMany({
    where: { symbol },
    orderBy: { date: 'desc' },
    take: 200 // 获取200个交易日数据
  })
  
  // 2. 计算各项指标
  const currentPrice = historicalData[0].close
  const highPrice = Math.max(...historicalData.map(d => d.high))
  const lowPrice = Math.min(...historicalData.map(d => d.low))
  
  // 3. 计算均线
  const ma50 = historicalData.slice(0, 50).reduce((sum, d) => sum + d.close, 0) / 50
  const ma200 = historicalData.reduce((sum, d) => sum + d.close, 0) / historicalData.length
  
  // 4. 计算ATR
  const atr = calculateATR(historicalData.slice(0, 14))
  
  // 5. 计算位置指标
  const positionScore = ((currentPrice - lowPrice) / (highPrice - lowPrice)) * 100
  const distanceFromHigh = ((highPrice - currentPrice) / highPrice) * 100
  const distanceFromLow = ((currentPrice - lowPrice) / lowPrice) * 100
  
  let positionType: 'high' | 'mid' | 'low' = 'mid'
  if (positionScore >= 70) positionType = 'high'
  else if (positionScore <= 30) positionType = 'low'
  
  return {
    currentPrice,
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

function calculateATR(data: any[], period: number = 14): number {
  // ATR计算逻辑
  const trueRanges = data.map((d, i) => {
    if (i === 0) return d.high - d.low
    const prevClose = data[i - 1].close
    return Math.max(
      d.high - d.low,
      Math.abs(d.high - prevClose),
      Math.abs(d.low - prevClose)
    )
  })
  
  return trueRanges.reduce((sum, tr) => sum + tr, 0) / trueRanges.length
}
*/
