'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Activity,
  Shield,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Target,
  Brain,
  Eye,
  Zap,
  Heart
} from 'lucide-react'

// 交易健康评分
interface TradingHealth {
  overallScore: number // 0-100总体评分
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
  score: number // 0-100
  status: 'good' | 'warning' | 'critical'
  details: string
}

export default function TradingHealthCenter() {
  const router = useRouter()
  const [health, setHealth] = useState<TradingHealth | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // 获取健康评估
  const fetchHealth = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/trading/health-check')
      const result = await response.json()
      
      if (result.success && result.data) {
        setHealth(result.data)
      } else {
        throw new Error('获取数据失败')
      }
    } catch (error) {
      console.error('获取健康评估失败:', error)
      // 使用Mock数据
      setHealth(generateMockHealth())
    } finally {
      setIsLoading(false)
    }
  }

  // 生成Mock数据
  const generateMockHealth = (): TradingHealth => {
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
      strengths.push('情绪控制良好')
    }
    
    if (riskScore < 60) {
      recommendations.push('重新评估止损策略，使用智能止损计算器')
      warnings.push('风险管理有待加强')
    } else {
      strengths.push('风险管理得当')
    }
    
    if (timingScore < 50) {
      recommendations.push('多关注恐慌指数，在极度恐慌时捞货而不是止损')
      warnings.push('市场时机把握需要提升')
    }
    
    if (patternScore < 60) {
      recommendations.push('当前交易模式匹配度低，建议暂停交易观察市场')
      warnings.push('交易模式不适配当前市场')
    } else {
      strengths.push('交易模式匹配良好')
    }
    
    if (technicalScore >= 70) {
      strengths.push('技术分析能力强')
    }
    
    return {
      overallScore: Math.round(overallScore),
      level,
      categories: {
        emotionalControl: {
          score: Math.round(emotionalScore),
          status: emotionalScore >= 70 ? 'good' : emotionalScore >= 50 ? 'warning' : 'critical',
          details: '基于最近交易前检查清单填写和情绪自评'
        },
        riskManagement: {
          score: Math.round(riskScore),
          status: riskScore >= 70 ? 'good' : riskScore >= 50 ? 'warning' : 'critical',
          details: '基于止损设置、仓位控制和风险暴露'
        },
        marketTiming: {
          score: Math.round(timingScore),
          status: timingScore >= 70 ? 'good' : timingScore >= 50 ? 'warning' : 'critical',
          details: '基于入场时机、恐慌指数利用和反向操作'
        },
        patternAdherence: {
          score: Math.round(patternScore),
          status: patternScore >= 70 ? 'good' : patternScore >= 50 ? 'warning' : 'critical',
          details: '基于交易策略遵守度和模式匹配度'
        },
        technicalAnalysis: {
          score: Math.round(technicalScore),
          status: technicalScore >= 70 ? 'good' : technicalScore >= 50 ? 'warning' : 'critical',
          details: '基于技术形态识别和关键位置把握'
        }
      },
      recommendations,
      warnings,
      strengths,
      timestamp: new Date().toISOString()
    }
  }

  // 获取等级颜色
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'excellent': return 'text-green-600 bg-green-100'
      case 'good': return 'text-blue-600 bg-blue-100'
      case 'fair': return 'text-yellow-600 bg-yellow-100'
      case 'poor': return 'text-orange-600 bg-orange-100'
      case 'critical': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  // 获取等级文本
  const getLevelText = (level: string) => {
    switch (level) {
      case 'excellent': return '优秀'
      case 'good': return '良好'
      case 'fair': return '一般'
      case 'poor': return '较差'
      case 'critical': return '危险'
      default: return '未知'
    }
  }

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'critical': return <XCircle className="h-5 w-5 text-red-600" />
      default: return <Activity className="h-5 w-5 text-gray-600" />
    }
  }

  // 获取分类图标
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'emotionalControl': return <Brain className="h-5 w-5" />
      case 'riskManagement': return <Shield className="h-5 w-5" />
      case 'marketTiming': return <Target className="h-5 w-5" />
      case 'patternAdherence': return <Zap className="h-5 w-5" />
      case 'technicalAnalysis': return <Eye className="h-5 w-5" />
      default: return <Activity className="h-5 w-5" />
    }
  }

  // 获取分类名称
  const getCategoryName = (category: string) => {
    switch (category) {
      case 'emotionalControl': return '情绪控制'
      case 'riskManagement': return '风险管理'
      case 'marketTiming': return '市场时机'
      case 'patternAdherence': return '策略遵守'
      case 'technicalAnalysis': return '技术分析'
      default: return '未知'
    }
  }

  useEffect(() => {
    fetchHealth()
  }, [])

  if (isLoading || !health) {
    return (
      <div className="flex items-center justify-center p-12">
        <Activity className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 总体健康评分 */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center gap-3">
              <Heart className="h-8 w-8 text-red-500" />
              交易健康体检中心
            </CardTitle>
            <Button onClick={fetchHealth} disabled={isLoading}>
              {isLoading ? <Activity className="h-4 w-4 animate-spin" /> : '重新评估'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 总体评分 */}
          <div className="text-center space-y-4">
            <div>
              <div className="text-6xl font-bold mb-2">{health.overallScore}</div>
              <div className="text-muted-foreground">总体健康评分</div>
            </div>
            <Badge className={`text-lg px-6 py-2 ${getLevelColor(health.level)}`}>
              {getLevelText(health.level)}
            </Badge>
            <Progress value={health.overallScore} className="h-4" />
          </div>

          {/* 评分说明 */}
          <div className="grid grid-cols-5 gap-2 text-xs text-center">
            <div className="p-2 bg-green-100 rounded">
              <div className="font-medium">85-100</div>
              <div className="text-muted-foreground">优秀</div>
            </div>
            <div className="p-2 bg-blue-100 rounded">
              <div className="font-medium">70-84</div>
              <div className="text-muted-foreground">良好</div>
            </div>
            <div className="p-2 bg-yellow-100 rounded">
              <div className="font-medium">50-69</div>
              <div className="text-muted-foreground">一般</div>
            </div>
            <div className="p-2 bg-orange-100 rounded">
              <div className="font-medium">30-49</div>
              <div className="text-muted-foreground">较差</div>
            </div>
            <div className="p-2 bg-red-100 rounded">
              <div className="font-medium">0-29</div>
              <div className="text-muted-foreground">危险</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 分类详细评分 */}
      <Card>
        <CardHeader>
          <CardTitle>详细评分</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(health.categories).map(([key, category]) => (
            <div key={key} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getCategoryIcon(key)}
                  <div>
                    <div className="font-medium">{getCategoryName(key)}</div>
                    <div className="text-xs text-muted-foreground">{category.details}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusIcon(category.status)}
                  <div className="text-right">
                    <div className="text-2xl font-bold">{category.score}</div>
                    <div className="text-xs text-muted-foreground">分</div>
                  </div>
                </div>
              </div>
              <Progress value={category.score} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 优势 */}
      {health.strengths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              你的优势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {health.strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 警告 */}
      {health.warnings.length > 0 && (
        <Alert className="border-yellow-500 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-700">需要关注的问题</AlertTitle>
          <AlertDescription>
            <ul className="space-y-1 mt-2">
              {health.warnings.map((warning, index) => (
                <li key={index} className="text-sm text-yellow-700">
                  • {warning}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* 改进建议 */}
      {health.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              改进建议
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {health.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <span className="text-sm">{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 快速访问 */}
      <Card>
        <CardHeader>
          <CardTitle>快速访问防护系统</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => router.push('/#trades')}
            >
              <Brain className="h-5 w-5" />
              <span className="text-sm">检查清单</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => {
                // 这里可以显示恐慌指数的详细信息
                alert('恐慌指数功能已集成在体检中心中，可以查看市场情绪评分')
              }}
            >
              <Activity className="h-5 w-5" />
              <span className="text-sm">恐慌指数</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => {
                alert('智能止损计算已集成在交易计划表单中')
              }}
            >
              <Target className="h-5 w-5" />
              <span className="text-sm">止损计算</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => {
                alert('交易模式追踪已集成在体检中心的"策略遵守"评分中')
              }}
            >
              <Zap className="h-5 w-5" />
              <span className="text-sm">模式追踪</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => router.push('/#dashboard')}
            >
              <Shield className="h-5 w-5" />
              <span className="text-sm">反向提醒</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => {
                alert('技术形态扫描功能开发中...')
              }}
            >
              <Eye className="h-5 w-5" />
              <span className="text-sm">形态扫描</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 更新时间 */}
      <div className="text-xs text-muted-foreground text-center">
        最后评估时间：{new Date(health.timestamp).toLocaleString('zh-CN')}
      </div>
    </div>
  )
}
