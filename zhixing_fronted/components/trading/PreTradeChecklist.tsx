'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  TrendingUp,
  TrendingDown,
  Shield,
  Brain,
  Target
} from 'lucide-react'

// 检查清单项
interface ChecklistItem {
  id: string
  category: 'opportunity' | 'position' | 'market' | 'emotion'
  question: string
  checked: boolean
  importance: 'critical' | 'important' | 'normal'
}

// 市场数据
interface MarketData {
  vix: number
  uvxyDeviation: number
  recentWinRate: number
  consecutiveLosses: number
}

interface PreTradeChecklistProps {
  open: boolean
  onClose: () => void
  onApprove: () => void
  stockSymbol?: string
  stockName?: string
  action: 'buy' | 'sell'
  marketData?: MarketData
}

export default function PreTradeChecklist({
  open,
  onClose,
  onApprove,
  stockSymbol = '',
  stockName = '',
  action = 'buy',
  marketData
}: PreTradeChecklistProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [showWarning, setShowWarning] = useState(false)
  const [forceOverride, setForceOverride] = useState(false)
  const [emotionScore, setEmotionScore] = useState<number>(5) // 1-10，1最冷静，10最冲动
  const [tradingReason, setTradingReason] = useState<string>('')
  const [marketInfo, setMarketInfo] = useState<MarketData | null>(null)
  const [circuitBreakerActive, setCircuitBreakerActive] = useState(false)
  const [circuitBreakerUntil, setCircuitBreakerUntil] = useState<string>('')

  // 初始化检查清单
  useEffect(() => {
    if (open) {
      setChecklist([
        // 机会判断
        {
          id: 'familiar_pattern',
          category: 'opportunity',
          question: '这是我熟悉的交易模式吗？',
          checked: false,
          importance: 'critical'
        },
        {
          id: 'selection_criteria',
          category: 'opportunity',
          question: '符合我的选股标准吗？',
          checked: false,
          importance: 'critical'
        },
        {
          id: 'clear_logic',
          category: 'opportunity',
          question: '我能清楚解释这笔交易的逻辑吗？',
          checked: false,
          importance: 'important'
        },
        
        // 位置判断
        {
          id: 'key_position',
          category: 'position',
          question: '是在关键位置埋伏，而不是追涨吗？',
          checked: false,
          importance: 'critical'
        },
        {
          id: 'entry_level',
          category: 'position',
          question: '我清楚自己是在相对低位还是高位吗？',
          checked: false,
          importance: 'important'
        },
        {
          id: 'stop_loss_set',
          category: 'position',
          question: '如果是高位，我设置了窄止损了吗？',
          checked: false,
          importance: 'important'
        },
        
        // 市场状态
        {
          id: 'vix_normal',
          category: 'market',
          question: '当前VIX指数正常吗？（自动显示）',
          checked: false,
          importance: 'important'
        },
        {
          id: 'volatility_check',
          category: 'market',
          question: '市场波动性是否在合理范围？',
          checked: false,
          importance: 'normal'
        },
        {
          id: 'leader_fatigue',
          category: 'market',
          question: '近期龙头票有疲软迹象吗？需要警惕吗？',
          checked: false,
          importance: 'normal'
        },
        
        // 情绪检查
        {
          id: 'calm_mind',
          category: 'emotion',
          question: '我现在是冷静的，不是被情绪驱动的吗？',
          checked: false,
          importance: 'critical'
        },
        {
          id: 'recent_performance',
          category: 'emotion',
          question: '我的交易策略最近胜率正常吗？',
          checked: false,
          importance: 'important'
        }
      ])
      
      fetchMarketData()
    }
  }, [open])

  // 获取市场数据
  const fetchMarketData = async () => {
    try {
      const response = await fetch('/api/market/fear-index')
      const result = await response.json()
      
      if (result.success && result.data) {
        // 同时获取交易统计数据
        const statsResponse = await fetch('/api/trading/statistics')
        const statsResult = await statsResponse.json()
        
        // 获取熔断状态
        const patternResponse = await fetch('/api/trading/pattern-stats')
        const patternResult = await patternResponse.json()
        
        if (patternResult.success && patternResult.data) {
          setCircuitBreakerActive(patternResult.data.isCircuitBreakerActive)
          setCircuitBreakerUntil(patternResult.data.circuitBreakerUntil || '')
        }
        
        setMarketInfo({
          vix: result.data.vix.current,
          uvxyDeviation: result.data.uvxy.deviation,
          recentWinRate: statsResult.data?.recentWinRate || 50,
          consecutiveLosses: statsResult.data?.consecutiveLosses || 0
        })
      }
    } catch (error) {
      console.error('获取市场数据失败:', error)
      // 使用Mock数据
      setMarketInfo({
        vix: 18.5,
        uvxyDeviation: 12.3,
        recentWinRate: 45,
        consecutiveLosses: 2
      })
    }
  }

  // 切换检查项
  const toggleCheck = (id: string) => {
    setChecklist(prev =>
      prev.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    )
  }

  // 计算完成度
  const getProgress = () => {
    const total = checklist.length
    const checked = checklist.filter(item => item.checked).length
    return (checked / total) * 100
  }

  // 检查是否有未通过的关键项
  const hasCriticalIssues = () => {
    return checklist.some(
      item => item.importance === 'critical' && !item.checked
    )
  }

  // 检查是否有警告
  const hasWarnings = () => {
    if (!marketInfo) return false
    
    return (
      marketInfo.vix > 25 ||
      marketInfo.uvxyDeviation > 40 ||
      marketInfo.recentWinRate < 40 ||
      marketInfo.consecutiveLosses >= 3 ||
      emotionScore > 7
    )
  }

  // 获取分类图标
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'opportunity': return <Target className="w-4 h-4" />
      case 'position': return <Activity className="w-4 h-4" />
      case 'market': return <TrendingUp className="w-4 h-4" />
      case 'emotion': return <Brain className="w-4 h-4" />
      default: return <Shield className="w-4 h-4" />
    }
  }

  // 获取分类名称
  const getCategoryName = (category: string) => {
    switch (category) {
      case 'opportunity': return '机会判断'
      case 'position': return '位置判断'
      case 'market': return '市场状态'
      case 'emotion': return '情绪检查'
      default: return '其他'
    }
  }

  // 处理继续交易
  const handleProceed = () => {
    if (hasCriticalIssues() && !forceOverride) {
      setShowWarning(true)
      return
    }
    
    // 记录检查清单结果
    console.log('Pre-trade checklist passed:', {
      stock: `${stockSymbol} - ${stockName}`,
      action,
      checklist,
      emotionScore,
      tradingReason,
      forced: forceOverride
    })
    
    onApprove()
  }

  // 按分类分组清单
  const groupedChecklist = checklist.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, ChecklistItem[]>)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="w-6 h-6 text-blue-600" />
            交易前强制检查清单
          </DialogTitle>
          <DialogDescription>
            {action === 'buy' ? '买入' : '卖出'} {stockSymbol} {stockName} - 请认真回答以下问题
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 熔断警告 */}
          {circuitBreakerActive && (
            <Alert className="border-red-500 bg-red-50">
              <Lock className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                <div className="font-medium mb-2">🔒 交易熔断已激活！</div>
                <div className="text-sm">
                  由于连续失败，交易功能已被锁定至：
                  <strong className="ml-1">{new Date(circuitBreakerUntil).toLocaleString('zh-CN')}</strong>
                </div>
                <div className="text-sm mt-2">
                  请前往"交易模式追踪"页面完成复盘后解除锁定。
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {/* 进度条 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>完成进度</span>
              <span className="font-medium">{Math.round(getProgress())}%</span>
            </div>
            <Progress value={getProgress()} className="h-2" />
          </div>

          {/* 市场数据展示 */}
          {marketInfo && (
            <Alert className={
              hasWarnings()
                ? 'border-orange-500 bg-orange-50'
                : 'border-blue-500 bg-blue-50'
            }>
              <Activity className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">当前市场状况</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>VIX指数:</span>
                    <span className={marketInfo.vix > 25 ? 'text-red-600 font-medium' : ''}>
                      {marketInfo.vix}
                      {marketInfo.vix > 25 && ' 🔴 高'}
                      {marketInfo.vix > 30 && ' 极度恐慌'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>UVXY偏离度:</span>
                    <span className={marketInfo.uvxyDeviation > 40 ? 'text-red-600 font-medium' : ''}>
                      {marketInfo.uvxyDeviation > 0 ? '+' : ''}{marketInfo.uvxyDeviation}%
                      {marketInfo.uvxyDeviation > 40 && ' 🔴 极度恐慌'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>近期胜率:</span>
                    <span className={marketInfo.recentWinRate < 40 ? 'text-red-600 font-medium' : ''}>
                      {marketInfo.recentWinRate}%
                      {marketInfo.recentWinRate < 40 && ' ⚠️ 偏低'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>连续失败:</span>
                    <span className={marketInfo.consecutiveLosses >= 3 ? 'text-red-600 font-medium' : ''}>
                      {marketInfo.consecutiveLosses}次
                      {marketInfo.consecutiveLosses >= 3 && ' ⚠️ 需警惕'}
                    </span>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* 检查清单 */}
          {Object.entries(groupedChecklist).map(([category, items]) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2 font-medium text-sm">
                {getCategoryIcon(category)}
                {getCategoryName(category)}
              </div>
              <div className="space-y-2 pl-6">
                {items.map(item => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => toggleCheck(item.id)}
                  >
                    <div className="pt-0.5">
                      {item.checked ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={item.checked ? 'line-through text-muted-foreground' : ''}>
                          {item.question}
                        </span>
                        {item.importance === 'critical' && (
                          <Badge variant="destructive" className="text-xs">必答</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* 情绪自评 */}
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            <div className="font-medium text-sm flex items-center gap-2">
              <Brain className="w-4 h-4" />
              情绪自评（1=极度冷静，10=极度冲动）
            </div>
            <div className="space-y-2">
              <input
                type="range"
                min="1"
                max="10"
                value={emotionScore}
                onChange={(e) => setEmotionScore(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>极度冷静</span>
                <span className={`font-bold ${
                  emotionScore <= 3 ? 'text-green-600' :
                  emotionScore <= 6 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {emotionScore}/10
                </span>
                <span>极度冲动</span>
              </div>
              {emotionScore > 7 && (
                <Alert className="border-red-500 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-sm text-red-700">
                    ⚠️ 情绪评分过高！建议冷静10分钟后再决定！
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {/* 交易动机 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">交易动机（必填）</label>
            <textarea
              value={tradingReason}
              onChange={(e) => setTradingReason(e.target.value)}
              placeholder="请简要说明本次交易的理由和逻辑..."
              className="w-full p-3 border rounded-md min-h-[80px] text-sm"
            />
          </div>

          {/* 警告提示 */}
          {showWarning && (
            <Alert className="border-red-500 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                <div className="font-medium mb-2">⚠️ 检查清单未完全通过！</div>
                <ul className="text-sm space-y-1 ml-4 list-disc">
                  {checklist
                    .filter(item => item.importance === 'critical' && !item.checked)
                    .map(item => (
                      <li key={item.id}>{item.question}</li>
                    ))}
                </ul>
                <div className="mt-3 pt-3 border-t border-red-200">
                  <p className="text-sm mb-2">
                    如果你确定要继续，请点击下方"强制继续"按钮。
                    此操作将被记录为<strong>违规交易</strong>。
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setForceOverride(true)
                      setShowWarning(false)
                    }}
                  >
                    我接受风险，强制继续
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            取消交易
          </Button>
          <Button
            onClick={handleProceed}
            disabled={circuitBreakerActive || getProgress() < 100 || !tradingReason.trim() || (emotionScore > 7 && !forceOverride)}
            className={forceOverride ? 'bg-orange-600 hover:bg-orange-700' : ''}
          >
            {circuitBreakerActive ? '🔒 交易已锁定' : 
             forceOverride ? '⚠️ 强制继续' : '✓ 通过检查，继续交易'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
