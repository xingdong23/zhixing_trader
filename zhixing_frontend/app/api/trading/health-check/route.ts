import { NextResponse } from 'next/server'

interface TradingHealth {
  overallScore: number
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  categories: {
    emotionalControl: CategoryScore
    riskManagement: CategoryScore
    marketTiming: CategoryScore
    patternAdherence: CategoryScore
    technicalAnalysis: CategoryScore
  }
  recommendations: string[]
  warnings: string[]
  strengths: string[]
  timestamp: string
}

interface CategoryScore {
  score: number
  status: 'good' | 'warning' | 'critical'
  details: string
}

// 生成Mock数据
function generateMockHealth(): TradingHealth {
  // 模拟各项评分
  const emotionalScore = 60 + Math.random() * 30
  const riskScore = 50 + Math.random() * 40
  const timingScore = 40 + Math.random() * 40
  const patternScore = 55 + Math.random() * 35
  const technicalScore = 65 + Math.random() * 25
  
  const overallScore = (emotionalScore + riskScore + timingScore + patternScore + technicalScore) / 5
  
  let level: TradingHealth['level'] = 'good'
  if (overallScore >= 85) level = 'excellent'
  else if (overallScore >= 70) level = 'good'
  else if (overallScore >= 50) level = 'fair'
  else if (overallScore >= 30) level = 'poor'
  else level = 'critical'
  
  const recommendations: string[] = []
  const warnings: string[] = []
  const strengths: string[] = []
  
  // 根据各项评分生成建议
  if (emotionalScore < 60) {
    recommendations.push('加强情绪控制，使用交易前检查清单降低冲动交易')
    warnings.push('情绪控制需要改善')
  } else {
    strengths.push('情绪控制良好，能够保持冷静理性')
  }
  
  if (riskScore < 60) {
    recommendations.push('重新评估止损策略，使用智能止损计算器优化风险控制')
    warnings.push('风险管理有待加强')
  } else {
    strengths.push('风险管理得当，止损设置合理')
  }
  
  if (timingScore < 50) {
    recommendations.push('多关注恐慌指数（UVXY/VIX），在极度恐慌时捞货而不是止损')
    warnings.push('市场时机把握需要提升')
  }
  
  if (patternScore < 60) {
    recommendations.push('当前交易模式匹配度低，建议暂停交易观察市场变化')
    warnings.push('交易模式不适配当前市场环境')
  } else {
    strengths.push('交易模式匹配良好，策略执行到位')
  }
  
  if (technicalScore >= 70) {
    strengths.push('技术分析能力强，能准确识别关键位置')
  } else if (technicalScore < 60) {
    recommendations.push('加强技术分析学习，利用形态扫描器辅助决策')
  }
  
  return {
    overallScore: Math.round(overallScore),
    level,
    categories: {
      emotionalControl: {
        score: Math.round(emotionalScore),
        status: emotionalScore >= 70 ? 'good' : emotionalScore >= 50 ? 'warning' : 'critical',
        details: '基于最近交易前检查清单填写和情绪自评数据'
      },
      riskManagement: {
        score: Math.round(riskScore),
        status: riskScore >= 70 ? 'good' : riskScore >= 50 ? 'warning' : 'critical',
        details: '基于止损设置、仓位控制和最大风险暴露'
      },
      marketTiming: {
        score: Math.round(timingScore),
        status: timingScore >= 70 ? 'good' : timingScore >= 50 ? 'warning' : 'critical',
        details: '基于入场时机选择、恐慌指数利用和反向操作能力'
      },
      patternAdherence: {
        score: Math.round(patternScore),
        status: patternScore >= 70 ? 'good' : patternScore >= 50 ? 'warning' : 'critical',
        details: '基于交易策略遵守度和市场模式匹配度'
      },
      technicalAnalysis: {
        score: Math.round(technicalScore),
        status: technicalScore >= 70 ? 'good' : technicalScore >= 50 ? 'warning' : 'critical',
        details: '基于技术形态识别准确度和关键位置把握能力'
      }
    },
    recommendations,
    warnings,
    strengths,
    timestamp: new Date().toISOString()
  }
}

export async function GET() {
  try {
    // TODO: 实际应用中，应该：
    // 1. 从数据库获取用户最近的交易数据
    // 2. 分析检查清单完成情况
    // 3. 评估情绪自评历史
    // 4. 检查止损设置合理性
    // 5. 计算市场时机把握准确度
    // 6. 评估策略遵守情况
    // 7. 分析技术分析能力
    // 8. 综合计算健康评分
    
    // 目前使用Mock数据
    const data = generateMockHealth()
    
    return NextResponse.json({
      success: true,
      data,
      message: '获取健康评估成功'
    })
  } catch (error) {
    console.error('健康评估失败:', error)
    return NextResponse.json({
      success: false,
      error: '健康评估失败',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

// 真实评估示例（注释掉，供参考）
/*
async function calculateRealHealth(userId: string): Promise<TradingHealth> {
  // 1. 情绪控制评分
  const emotionalData = await db.preTradeChecklists.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10
  })
  
  const emotionalScore = calculateEmotionalScore(emotionalData)
  
  // 2. 风险管理评分
  const trades = await db.trades.findMany({
    where: { userId, status: 'closed' },
    orderBy: { closedAt: 'desc' },
    take: 20
  })
  
  const riskScore = calculateRiskScore(trades)
  
  // 3. 市场时机评分
  const timingScore = calculateTimingScore(trades)
  
  // 4. 策略遵守评分
  const patternScore = calculatePatternScore(trades, emotionalData)
  
  // 5. 技术分析评分
  const technicalScore = calculateTechnicalScore(trades)
  
  // 6. 计算总分
  const overallScore = (emotionalScore + riskScore + timingScore + patternScore + technicalScore) / 5
  
  // 7. 生成建议和警告
  const recommendations = generateRecommendations({
    emotionalScore,
    riskScore,
    timingScore,
    patternScore,
    technicalScore
  })
  
  const warnings = generateWarnings({
    emotionalScore,
    riskScore,
    timingScore,
    patternScore,
    technicalScore
  })
  
  const strengths = generateStrengths({
    emotionalScore,
    riskScore,
    timingScore,
    patternScore,
    technicalScore
  })
  
  return {
    overallScore,
    level: getLevel(overallScore),
    categories: {
      emotionalControl: {
        score: emotionalScore,
        status: getStatus(emotionalScore),
        details: '基于检查清单和情绪自评'
      },
      // ... 其他分类
    },
    recommendations,
    warnings,
    strengths,
    timestamp: new Date().toISOString()
  }
}

function calculateEmotionalScore(checklists: any[]): number {
  if (checklists.length === 0) return 50
  
  // 计算情绪自评的平均分
  const avgEmotionScore = checklists.reduce((sum, c) => sum + c.emotionScore, 0) / checklists.length
  
  // 情绪评分越低越好（1-10，1最冷静）
  // 转换为0-100评分（评分越高越好）
  return Math.max(0, Math.min(100, (10 - avgEmotionScore) * 12.5))
}

function calculateRiskScore(trades: any[]): number {
  if (trades.length === 0) return 50
  
  // 检查止损设置合理性
  const withStopLoss = trades.filter(t => t.stopLoss != null).length
  const stopLossRatio = withStopLoss / trades.length
  
  // 计算平均风险暴露
  const avgRisk = trades.reduce((sum, t) => {
    const risk = Math.abs((t.entryPrice - t.stopLoss) / t.entryPrice) * 100
    return sum + risk
  }, 0) / trades.length
  
  // 合理止损3-8%
  let riskScore = stopLossRatio * 50 // 最多50分
  if (avgRisk >= 3 && avgRisk <= 8) {
    riskScore += 50
  } else if (avgRisk < 3) {
    riskScore += 30 // 止损太窄
  } else if (avgRisk <= 12) {
    riskScore += 40 // 止损稍宽
  } else {
    riskScore += 20 // 止损太宽
  }
  
  return Math.min(100, riskScore)
}
*/
