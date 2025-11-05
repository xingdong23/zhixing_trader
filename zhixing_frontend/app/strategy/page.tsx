"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Target,
  Clock,
  DollarSign,
  Activity,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Zap,
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle,
  Database,
  ArrowLeft
} from 'lucide-react'

// 导入策略API
import { StrategyApi, Strategy, StrategyResult, TaskStatus } from '@/lib/strategy-api'

export default function StrategyPage() {
  const router = useRouter()
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null)
  const [strategyResults, setStrategyResults] = useState<StrategyResult[]>([])
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null)
  const [updatingData, setUpdatingData] = useState(false)

  // 获取策略列表
  const fetchStrategies = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await StrategyApi.getStrategies()
      if (response.success) {
        setStrategies(response.data.strategies)
        if (response.data.strategies.length > 0 && !selectedStrategy) {
          setSelectedStrategy(response.data.strategies[0])
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取策略列表失败')
      console.error('获取策略列表失败:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedStrategy])

  // 执行策略
  const executeStrategy = async (strategy: Strategy, async: boolean = false) => {
    try {
      setExecuting(true)
      setError(null)
      setStrategyResults([])
      
      if (async) {
        // 异步执行
        const response = await StrategyApi.executeStrategyAsync(strategy.id)
        if (response.success) {
          const taskId = response.data.task_id
          // 轮询任务状态
          await pollTaskStatus(taskId)
        }
      } else {
        // 同步执行
        const response = await StrategyApi.executeStrategy(strategy.id)
        if (response.success) {
          setStrategyResults(response.data)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行策略失败')
      console.error('执行策略失败:', err)
    } finally {
      setExecuting(false)
    }
  }

  // 轮询任务状态
  const pollTaskStatus = async (taskId: string) => {
    const poll = async () => {
      try {
        const response = await StrategyApi.getTaskStatus(taskId)
        if (response.success) {
          const status = response.data
          setTaskStatus(status)
          
          if (status.status === 'completed' && status.result) {
            setStrategyResults(status.result)
            setExecuting(false)
            return
          } else if (status.status === 'failed') {
            setError(status.error || '任务执行失败')
            setExecuting(false)
            return
          }
          
          // 如果任务还在执行中，继续轮询
          if (status.status === 'running' || status.status === 'pending') {
            setTimeout(poll, 2000) // 2秒后再次检查
          }
        }
      } catch (err) {
        console.error('轮询任务状态失败:', err)
        setExecuting(false)
      }
    }
    
    poll()
  }

  // 执行所有策略
  const executeAllStrategies = async () => {
    try {
      setExecuting(true)
      setError(null)
      const response = await StrategyApi.executeAllStrategies()
      if (response.success) {
        // 合并所有策略结果
        const allResults: StrategyResult[] = []
        Object.values(response.data.strategy_results).forEach(results => {
          allResults.push(...results)
        })
        setStrategyResults(allResults)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行所有策略失败')
      console.error('执行所有策略失败:', err)
    } finally {
      setExecuting(false)
    }
  }

  // 触发数据更新
  const triggerDataUpdate = async () => {
    try {
      setUpdatingData(true)
      setError(null)
      const response = await StrategyApi.triggerDataUpdate()
      if (response.success) {
        // 显示更新成功的消息
        console.log('数据更新成功:', response.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '数据更新失败')
      console.error('数据更新失败:', err)
    } finally {
      setUpdatingData(false)
    }
  }

  // 初始加载
  useEffect(() => {
    fetchStrategies()
  }, [fetchStrategies])

  const getStatusColor = (enabled: boolean) => {
    return enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (enabled: boolean) => {
    return enabled ? '已启用' : '已禁用'
  }

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'low': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'high': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getRiskLevelText = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'low': return '低风险'
      case 'medium': return '中风险'
      case 'high': return '高风险'
      default: return '未知'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>加载策略列表...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/')}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">策略管理中心</h1>
          </div>
          <p className="text-gray-600">管理和执行您的量化交易策略</p>
        </div>

        {/* 错误提示 */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-800">{error}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setError(null)}
                  className="ml-auto"
                >
                  关闭
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 操作按钮 */}
        <div className="mb-6 flex gap-3">
          <Button 
            onClick={executeAllStrategies} 
            disabled={executing || strategies.length === 0}
            className="flex items-center gap-2"
          >
            {executing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            执行所有策略
          </Button>
          <Button 
            onClick={triggerDataUpdate} 
            disabled={updatingData}
            variant="outline"
            className="flex items-center gap-2"
          >
            {updatingData ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            更新数据
          </Button>
          <Button 
            onClick={fetchStrategies} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            刷新策略
          </Button>
        </div>

        {/* 任务状态 */}
        {taskStatus && executing && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <div>
                  <div className="font-medium">任务执行中...</div>
                  <div className="text-sm text-gray-600">{taskStatus.message}</div>
                  <div className="text-sm text-gray-600">进度: {taskStatus.progress}%</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 策略列表 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                策略列表 ({strategies.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {strategies.map((strategy) => (
                  <div 
                    key={strategy.id} 
                    className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedStrategy?.id === strategy.id ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedStrategy(strategy)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-semibold">{strategy.name}</h3>
                        <p className="text-sm text-muted-foreground">{strategy.category}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getStatusColor(strategy.enabled)}>
                          {getStatusText(strategy.enabled)}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{strategy.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>执行次数: {strategy.execution_count}</span>
                        <span>时间框架: {strategy.timeframe}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation()
                            executeStrategy(strategy, false)
                          }}
                          disabled={executing || !strategy.enabled}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          执行
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            executeStrategy(strategy, true)
                          }}
                          disabled={executing || !strategy.enabled}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          异步
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 策略详情和执行结果 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {selectedStrategy ? selectedStrategy.name : '选择策略'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedStrategy ? (
                <div className="space-y-4">
                  {/* 策略信息 */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">类型:</span>
                        <span className="ml-2 font-medium">{selectedStrategy.impl_type}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">状态:</span>
                        <Badge className={`ml-2 ${getStatusColor(selectedStrategy.enabled)}`}>
                          {getStatusText(selectedStrategy.enabled)}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-gray-600">执行次数:</span>
                        <span className="ml-2 font-medium">{selectedStrategy.execution_count}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">最后执行:</span>
                        <span className="ml-2 font-medium">
                          {selectedStrategy.last_execution_time 
                            ? new Date(selectedStrategy.last_execution_time).toLocaleString()
                            : '从未执行'
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 执行结果 */}
                  {strategyResults.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        执行结果 ({strategyResults.length} 只股票)
                      </h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {strategyResults.map((result, index) => (
                          <div key={index} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <span className="font-medium text-blue-600">
                                  {result.stock_symbol}
                                </span>
                                <Badge variant="outline">
                                  评分: {result.score.toFixed(2)}
                                </Badge>
                                <Badge variant="outline">
                                  信心: {(result.confidence * 100).toFixed(1)}%
                                </Badge>
                              </div>
                              <span className={`text-sm ${getRiskLevelColor(result.risk_level)}`}>
                                {getRiskLevelText(result.risk_level)}
                              </span>
                            </div>
                            
                            <div className="text-sm text-gray-600 mb-2">
                              <div>建议操作: <span className="font-medium">{result.suggested_action}</span></div>
                              {result.current_price && (
                                <div>当前价格: <span className="font-medium">${result.current_price}</span></div>
                              )}
                              {result.target_price && (
                                <div>目标价格: <span className="font-medium text-green-600">${result.target_price}</span></div>
                              )}
                              {result.stop_loss && (
                                <div>止损价格: <span className="font-medium text-red-600">${result.stop_loss}</span></div>
                              )}
                            </div>
                            
                            {result.reasons.length > 0 && (
                              <div className="text-sm">
                                <span className="text-gray-600">选股理由:</span>
                                <ul className="list-disc list-inside mt-1 text-gray-600">
                                  {result.reasons.map((reason, idx) => (
                                    <li key={idx}>{reason}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 无结果提示 */}
                  {!executing && strategyResults.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>点击"执行"按钮开始策略分析</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>请选择一个策略查看详情</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}