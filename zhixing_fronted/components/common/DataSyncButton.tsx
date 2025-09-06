"use client"

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  RefreshCw, 
  Download, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Play,
  Pause,
  X
} from 'lucide-react'

// 任务状态类型
interface SyncTask {
  task_id: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  total_stocks: number
  processed_stocks: number
  success_stocks: number
  failed_stocks: number
  daily_records: number
  hourly_records: number
  task_type: string
  force_full_sync: boolean
  start_time: string | null
  end_time: string | null
  duration_seconds: number | null
  created_at: string
}

interface DataSyncButtonProps {
  className?: string
  onSyncComplete?: (result: any) => void
  showProgress?: boolean
  autoRefresh?: boolean
}

export default function DataSyncButton({ 
  className = '', 
  onSyncComplete,
  showProgress = true,
  autoRefresh = true
}: DataSyncButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [currentTask, setCurrentTask] = useState<SyncTask | null>(null)
  const [lastTask, setLastTask] = useState<SyncTask | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 获取API基础URL
  const getApiBase = () => process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

  // 获取运行中的任务
  const fetchRunningTasks = useCallback(async () => {
    try {
      const response = await fetch(`${getApiBase()}/api/v1/sync/tasks/running`)
      const data = await response.json()
      
      if (data.success && data.data.length > 0) {
        setCurrentTask(data.data[0])
        return data.data[0]
      } else {
        setCurrentTask(null)
        return null
      }
    } catch (error) {
      console.error('获取运行中任务失败:', error)
      return null
    }
  }, [])

  // 获取最近的任务
  const fetchRecentTasks = useCallback(async () => {
    try {
      const response = await fetch(`${getApiBase()}/api/v1/sync/tasks/recent?limit=1`)
      const data = await response.json()
      
      if (data.success && data.data.length > 0) {
        setLastTask(data.data[0])
        return data.data[0]
      }
    } catch (error) {
      console.error('获取最近任务失败:', error)
    }
    return null
  }, [])

  // 获取指定任务状态
  const fetchTaskStatus = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`${getApiBase()}/api/v1/sync/task/${taskId}`)
      const data = await response.json()
      
      if (data.success) {
        return data.data
      }
    } catch (error) {
      console.error('获取任务状态失败:', error)
    }
    return null
  }, [])

  // 触发数据同步
  const triggerSync = async (forceFull: boolean = false) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`${getApiBase()}/api/v1/sync/trigger?force_full=${forceFull}&run_in_background=true`, {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.detail || '同步启动失败')
      }
      
      if (data.success) {
        // 立即获取任务状态
        setTimeout(() => {
          fetchRunningTasks()
        }, 1000)
      }
      
    } catch (error: any) {
      console.error('触发同步失败:', error)
      setError(error.message || '同步启动失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 取消任务
  const cancelTask = async (taskId: string) => {
    try {
      const response = await fetch(`${getApiBase()}/api/v1/sync/task/${taskId}/cancel`, {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        setCurrentTask(null)
        await fetchRecentTasks()
      }
    } catch (error) {
      console.error('取消任务失败:', error)
    }
  }

  // 自动刷新任务状态
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(async () => {
      const runningTask = await fetchRunningTasks()
      
      // 如果没有运行中的任务，获取最近的任务
      if (!runningTask) {
        await fetchRecentTasks()
      }
      
      // 如果任务完成，触发回调
      if (runningTask && runningTask.status === 'completed' && onSyncComplete) {
        onSyncComplete(runningTask)
      }
    }, 2000) // 每2秒刷新一次

    return () => clearInterval(interval)
  }, [autoRefresh, fetchRunningTasks, fetchRecentTasks, onSyncComplete])

  // 初始加载
  useEffect(() => {
    fetchRunningTasks().then(runningTask => {
      if (!runningTask) {
        fetchRecentTasks()
      }
    })
  }, [fetchRunningTasks, fetchRecentTasks])

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'cancelled':
        return <X className="h-4 w-4 text-gray-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <Download className="h-4 w-4" />
    }
  }

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '等待中'
      case 'running':
        return '同步中'
      case 'completed':
        return '已完成'
      case 'failed':
        return '失败'
      case 'cancelled':
        return '已取消'
      default:
        return '未知'
    }
  }

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // 格式化时间
  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-'
    try {
      return new Date(timeString).toLocaleString('zh-CN')
    } catch {
      return '-'
    }
  }

  // 格式化持续时间
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-'
    if (seconds < 60) return `${seconds.toFixed(1)}秒`
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}分钟`
    return `${(seconds / 3600).toFixed(1)}小时`
  }

  const displayTask = currentTask || lastTask

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 同步按钮区域 */}
      <div className="flex items-center gap-3">
        <Button
          onClick={() => triggerSync(false)}
          disabled={isLoading || (currentTask?.status === 'running')}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {currentTask?.status === 'running' ? '同步中...' : '价格同步'}
        </Button>

        <Button
          variant="outline"
          onClick={() => triggerSync(true)}
          disabled={isLoading || (currentTask?.status === 'running')}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          全量同步
        </Button>

        {currentTask?.status === 'running' && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => cancelTask(currentTask.task_id)}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            取消
          </Button>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* 进度显示 */}
      {showProgress && displayTask && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                {getStatusIcon(displayTask.status)}
                数据同步状态
              </CardTitle>
              <Badge className={getStatusColor(displayTask.status)}>
                {getStatusText(displayTask.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 进度条 */}
            {displayTask.status === 'running' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>进度: {displayTask.processed_stocks || 0}/{displayTask.total_stocks || 0}</span>
                  <span>{displayTask.progress?.toFixed(1) || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${displayTask.progress || 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* 统计信息 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-600">总股票数</div>
                <div className="font-semibold">{displayTask.total_stocks || 0}</div>
              </div>
              <div>
                <div className="text-gray-600">成功数</div>
                <div className="font-semibold text-green-600">{displayTask.success_stocks || 0}</div>
              </div>
              <div>
                <div className="text-gray-600">失败数</div>
                <div className="font-semibold text-red-600">{displayTask.failed_stocks || 0}</div>
              </div>
              <div>
                <div className="text-gray-600">数据记录</div>
                <div className="font-semibold">
                  {(displayTask.daily_records || 0) + (displayTask.hourly_records || 0)}
                </div>
              </div>
            </div>

            {/* 时间信息 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm pt-2 border-t">
              <div>
                <div className="text-gray-600">开始时间</div>
                <div className="font-mono text-xs">{formatTime(displayTask.start_time)}</div>
              </div>
              {displayTask.end_time && (
                <div>
                  <div className="text-gray-600">结束时间</div>
                  <div className="font-mono text-xs">{formatTime(displayTask.end_time)}</div>
                </div>
              )}
              {displayTask.duration_seconds && (
                <div>
                  <div className="text-gray-600">耗时</div>
                  <div className="font-semibold">{formatDuration(displayTask.duration_seconds)}</div>
                </div>
              )}
            </div>

            {/* 任务ID */}
            <div className="text-xs text-gray-500 pt-2 border-t">
              任务ID: {displayTask.task_id}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
