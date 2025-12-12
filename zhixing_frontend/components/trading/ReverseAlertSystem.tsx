'use client'

import { useState, useEffect } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  ShoppingCart,
  Shield,
  Activity,
  X,
  Bell,
  CheckCircle
} from 'lucide-react'

// 反向提醒类型
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

interface ReverseAlertSystemProps {
  variant?: 'banner' | 'sidebar' | 'popup'
  autoCheck?: boolean
  checkInterval?: number // 秒
}

export default function ReverseAlertSystem({
  variant = 'banner',
  autoCheck = true,
  checkInterval = 30
}: ReverseAlertSystemProps) {
  const [alerts, setAlerts] = useState<ReverseAlert[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 获取反向提醒
  const fetchAlerts = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/trading/reverse-alerts')
      const result = await response.json()

      if (result.success && result.data) {
        // 只显示未被忽略的提醒
        const activeAlerts = result.data.filter((alert: ReverseAlert) => !alert.dismissed)
        setAlerts(activeAlerts)
      }
    } catch (error) {
      console.error('获取反向提醒失败:', error)
      // 使用Mock数据
      const mockAlerts = generateMockAlerts()
      setAlerts(mockAlerts.filter(alert => !alert.dismissed))
    } finally {
      setIsLoading(false)
    }
  }

  // 生成Mock数据
  const generateMockAlerts = (): ReverseAlert[] => {
    const alerts: ReverseAlert[] = []

    // 随机生成不同类型的提醒
    const rand = Math.random()

    // 30%概率：市场大跌提醒
    if (rand < 0.3) {
      alerts.push({
        id: 'alert-1',
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
        id: 'alert-2',
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
      alerts.push({
        id: 'alert-3',
        type: 'position_crash',
        severity: 'critical',
        title: '🛑 持仓大跌 - 检查恐慌指数！',
        message: '你的持仓AAPL下跌-8.2%',
        actionSuggestion: 'UVXY指数+56%严重偏离均线，当前极度恐慌！不要在此时止损，这可能是最后一跌！',
        data: {
          symbol: 'AAPL',
          changePercent: -8.2,
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
        id: 'alert-4',
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
        id: 'alert-5',
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

  // 忽略提醒
  const dismissAlert = async (alertId: string) => {
    try {
      await fetch(`/api/trading/reverse-alerts/${alertId}/dismiss`, {
        method: 'POST'
      })
    } catch (error) {
      console.error('忽略提醒失败:', error)
    }

    setAlerts(prev => prev.filter(alert => alert.id !== alertId))
  }

  // 获取提醒图标
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'market_crash':
      case 'position_crash':
        return <TrendingDown className="h-5 w-5" />
      case 'market_rally':
        return <TrendingUp className="h-5 w-5" />
      case 'leader_weak':
        return <AlertTriangle className="h-5 w-5" />
      case 'panic_buy':
        return <ShoppingCart className="h-5 w-5" />
      default:
        return <Bell className="h-5 w-5" />
    }
  }

  // 获取提醒颜色类
  const getAlertColorClass = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500 bg-red-50'
      case 'warning':
        return 'border-orange-500 bg-orange-50'
      case 'info':
        return 'border-blue-500 bg-blue-50'
      default:
        return 'border-gray-500 bg-gray-50'
    }
  }

  useEffect(() => {
    fetchAlerts()

    if (autoCheck) {
      const interval = setInterval(fetchAlerts, checkInterval * 1000)
      return () => clearInterval(interval)
    }
  }, [autoCheck, checkInterval])

  // 没有提醒时不显示
  if (alerts.length === 0) {
    return null
  }

  // Banner变体 - 页面顶部横幅
  if (variant === 'banner') {
    const primaryAlert = alerts[0]

    return (
      <Alert className={`${getAlertColorClass(primaryAlert.severity)} mb-4`}>
        <div className="flex items-start justify-between gap-4 w-full">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 mt-0.5">
              {getAlertIcon(primaryAlert.type)}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <AlertTitle className="font-semibold text-base m-0">{primaryAlert.title}</AlertTitle>
                <Badge variant="outline" className="text-xs">
                  {new Date(primaryAlert.timestamp).toLocaleTimeString('zh-CN')}
                </Badge>
              </div>
              <AlertDescription className="space-y-2 text-sm">
                <div>{primaryAlert.message}</div>
                <div className="font-medium bg-white/50 dark:bg-gray-800/50 p-3 rounded">
                  💡 {primaryAlert.actionSuggestion}
                </div>
                {primaryAlert.data?.historicalData && (
                  <div className="text-xs text-muted-foreground">
                    📊 {primaryAlert.data.historicalData}
                  </div>
                )}
              </AlertDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dismissAlert(primaryAlert.id)}
            className="flex-shrink-0 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {alerts.length > 1 && (
          <div className="mt-3 pt-3 border-t border-current/20 text-xs">
            还有 {alerts.length - 1} 个提醒，
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs ml-1"
              onClick={() => {/* TODO: 打开提醒面板 */ }}
            >
              查看全部
            </Button>
          </div>
        )}
      </Alert>
    )
  }

  // Sidebar变体 - 侧边栏卡片
  if (variant === 'sidebar') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" />
            反向提醒 ({alerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border ${getAlertColorClass(alert.severity)}`}
            >
              <div className="flex items-start gap-2 mb-2">
                {getAlertIcon(alert.type)}
                <div className="flex-1 text-sm font-medium">{alert.title}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => dismissAlert(alert.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                {alert.actionSuggestion}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  // Popup变体 - 弹出列表
  return (
    <div className="space-y-3">
      {alerts.map(alert => (
        <Alert key={alert.id} className={`${getAlertColorClass(alert.severity)}`}>
          <div className="flex items-start justify-between gap-4 w-full">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 mt-0.5">
                {getAlertIcon(alert.type)}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <AlertTitle className="text-base font-semibold m-0">{alert.title}</AlertTitle>
                <AlertDescription className="space-y-2 text-sm">
                  <div>{alert.message}</div>
                  <div className="font-medium bg-white/50 dark:bg-gray-800/50 p-3 rounded">
                    💡 {alert.actionSuggestion}
                  </div>
                  {alert.data && (
                    <div className="text-xs space-y-1 bg-white/30 dark:bg-gray-800/30 p-2 rounded">
                      {alert.data.symbol && (
                        <div className="font-medium">股票: {alert.data.symbol}</div>
                      )}
                      {alert.data.changePercent !== undefined && (
                        <div>涨跌幅: <span className={alert.data.changePercent > 0 ? 'text-green-600' : 'text-red-600'}>{alert.data.changePercent > 0 ? '+' : ''}{alert.data.changePercent}%</span></div>
                      )}
                      {alert.data.vix !== undefined && (
                        <div>VIX: {alert.data.vix}</div>
                      )}
                      {alert.data.uvxyDeviation !== undefined && (
                        <div>UVXY偏离: <span className="text-orange-600">+{alert.data.uvxyDeviation}%</span></div>
                      )}
                      {alert.data.historicalData && (
                        <div className="text-muted-foreground mt-1">📊 {alert.data.historicalData}</div>
                      )}
                    </div>
                  )}
                </AlertDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dismissAlert(alert.id)}
              className="flex-shrink-0 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Alert>
      ))}
    </div>
  )
}
