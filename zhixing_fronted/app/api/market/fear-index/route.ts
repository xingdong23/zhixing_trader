import { NextResponse } from 'next/server'

// 恐慌指数数据接口
interface FearIndexData {
  uvxy: {
    current: number
    ma20: number
    deviation: number
    status: 'extreme_fear' | 'high_fear' | 'fear' | 'normal' | 'low'
  }
  vix: {
    current: number
    status: 'extreme' | 'high' | 'elevated' | 'normal' | 'low'
    level: string
  }
  marketSentiment: {
    score: number
    label: string
    suggestion: string
  }
  timestamp: string
}

// 生成Mock数据
function generateMockData(): FearIndexData {
  // 模拟UVXY数据
  const uvxyCurrent = 15 + Math.random() * 20 // 15-35
  const uvxyMa20 = 18.2
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

export async function GET() {
  try {
    // TODO: 实际应用中，这里应该调用真实的API获取UVXY和VIX数据
    // 例如：调用雅虎财经API、Alpha Vantage API等
    // const response = await fetch('https://api.example.com/fear-index')
    
    // 目前使用Mock数据
    const data = generateMockData()
    
    return NextResponse.json({
      success: true,
      data,
      message: '获取恐慌指数成功'
    })
  } catch (error) {
    console.error('获取恐慌指数失败:', error)
    return NextResponse.json({
      success: false,
      error: '获取恐慌指数失败',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

// 真实数据接入示例（注释掉，供参考）
/*
async function fetchRealFearIndex(): Promise<FearIndexData> {
  // 1. 获取UVXY数据（可以使用Yahoo Finance API）
  const uvxyResponse = await fetch(
    'https://query1.finance.yahoo.com/v8/finance/chart/UVXY?interval=1d&range=1mo'
  )
  const uvxyData = await uvxyResponse.json()
  
  // 2. 获取VIX数据
  const vixResponse = await fetch(
    'https://query1.finance.yahoo.com/v8/finance/chart/^VIX?interval=1d&range=1d'
  )
  const vixData = await vixResponse.json()
  
  // 3. 处理数据并计算偏离度等指标
  // ... 实际数据处理逻辑
  
  return processedData
}
*/
