'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, RefreshCw, Check, X, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

// 数据同步任务类型
export interface SyncTask {
  task_id: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  total_stocks: number
  processed_stocks: number
  success_stocks: number
  failed_stocks: number
  daily_records: number
  hourly_records: number
  task_type: 'full' | 'incremental'
  force_full_sync: boolean
  start_time: string
  end_time: string | null
  duration_seconds: number | null
  created_at: string
  error_message?: string
}

interface DataSyncButtonProps {
  className?: string
  onSyncComplete?: (task: SyncTask) => void
  showProgress?: boolean
  autoRefresh?: boolean
}

// ========== Mock模式配置 ==========
const USE_MOCK_DATA = true // 启用Mock模式,不调用后端API

export default function DataSyncButton({ 
  className = '', 
  onSyncComplete,
  showProgress = true,
  autoRefresh = false // Mock模式下默认关闭自动刷新
}: DataSyncButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [currentTask, setCurrentTask] = useState<SyncTask | null>(null)
  const [lastTask, setLastTask] = useState<SyncTask | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Mock数据 - 最近完成的任务
  const mockLastTask: SyncTask = {
    task_id: 'mock_task_123',
    status: 'completed',
    progress: 100,
    total_stocks: 150,
    processed_stocks: 150,
    success_stocks: 148,
    failed_stocks: 2,
    daily_records: 150,
    hourly_records: 0,
    task_type: 'incremental',
    force_full_sync: false,
    start_time: new Date(Date.now() - 300000).toISOString(),
    end_time: new Date(Date.now() - 240000).toISOString(),
    duration_seconds: 60,
    created_at: new Date(Date.now() - 300000).toISOString()
  }

  // 获取API基础URL
  const getApiBase = () => process.env.NEXT_PUBLIC_API_BASE_URL || ''

  // 获取运行中的任务
  const fetchRunningTasks = useCallback(async () => {
    if (USE_MOCK_DATA) {
      // Mock模式: 不调用后端
      return null
    }
    
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
      return null
    }
  }, [])

  // 获取最近的任务
  const fetchRecentTasks = useCallback(async () => {
    if (USE_MOCK_DATA) {
      // Mock模式: 使用Mock数据
      setLastTask(mockLastTask)
      return mockLastTask
    }
    
    try {
      const response = await fetch(`${getApiBase()}/api/v1/sync/tasks/recent?limit=1`)
      const data = await response.json()
      
      if (data.success && data.data.length > 0) {
        setLastTask(data.data[0])
        return data.data[0]
      }
    } catch (error) {
      // 静默处理
    }
    return null
  }, [])

  // 触发数据同步
  const triggerSync = async (forceFull: boolean = false) => {
    if (USE_MOCK_DATA) {
      // ========== Mock模式: 模拟同步过程 ==========
      setIsLoading(true)
      setError(null)
      
      toast.info(`🔄 开始${forceFull ? '全量' : '增量'}同步 (Mock模式)`)
      
      // 创建Mock运行任务
      const mockRunningTask: SyncTask = {
        task_id: `mock_task_${Date.now()}`,
        status: 'running',
        progress: 0,
        total_stocks: 150,
        processed_stocks: 0,
        success_stocks: 0,
        failed_stocks: 0,
        daily_records: 0,
        hourly_records: 0,
        task_type: forceFull ? 'full' : 'incremental',
        force_full_sync: forceFull,
        start_time: new Date().toISOString(),
        end_time: null,
        duration_seconds: null,
        created_at: new Date().toISOString()
      }
      
      setCurrentTask(mockRunningTask)
      
      // 模拟进度更新
      let progress = 0
      const progressInterval = setInterval(() => {
        progress += 10
        
        if (progress <= 100) {
          setCurrentTask(prev => prev ? {
            ...prev,
            progress,
            processed_stocks: Math.floor(150 * progress / 100),
            success_stocks: Math.floor(148 * progress / 100),
            failed_stocks: progress === 100 ? 2 : 0,
            daily_records: Math.floor(150 * progress / 100)
          } : null)
        }
        
        if (progress >= 100) {
          clearInterval(progressInterval)
          
          // 完成任务
          setTimeout(() => {
            const completedTask: SyncTask = {
              ...mockRunningTask,
              status: 'completed',
              progress: 100,
              processed_stocks: 150,
              success_stocks: 148,
              failed_stocks: 2,
              daily_records: 150,
              end_time: new Date().toISOString(),
              duration_seconds: 3
            }
            
            setCurrentTask(null)
            setLastTask(completedTask)
            setIsLoading(false)
            
            toast.success(`✅ 同步完成! 成功: ${completedTask.success_stocks}, 失败: ${completedTask.failed_stocks}`)
            
            if (onSyncComplete) {
              onSyncComplete(completedTask)
            }
          }, 500)
        }
      }, 300)
      
      return
    }
    
    // ========== 真实API调用 ==========
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
        toast.success('同步任务已启动')
        // 立即获取任务状态
        setTimeout(() => {
          fetchRunningTasks()
        }, 1000)
      }
      
    } catch (error: any) {
      console.error('触发同步失败:', error)
      setError(error.message || '同步启动失败')
      toast.error(error.message || '同步启动失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 取消任务
  const cancelTask = async (taskId: string) => {
    if (USE_MOCK_DATA) {
      // Mock模式: 直接取消
      setCurrentTask(null)
      toast.info('任务已取消')
      return
    }
    
    try {
      const response = await fetch(`${getApiBase()}/api/v1/sync/task/${taskId}/cancel`, {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        setCurrentTask(null)
        await fetchRecentTasks()
        toast.success('任务已取消')
      }
    } catch (error) {
      console.error('取消任务失败:', error)
    }
  }

  // 自动刷新任务状态 (Mock模式下禁用)
  useEffect(() => {
    if (!autoRefresh || USE_MOCK_DATA) return

    const interval = setInterval(async () => {
      const runningTask = await fetchRunningTasks()
      
      if (!runningTask) {
        await fetchRecentTasks()
      }
      
      if (runningTask && runningTask.status === 'completed' && onSyncComplete) {
        onSyncComplete(runningTask)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [autoRefresh, fetchRunningTasks, fetchRecentTasks, onSyncComplete])

  // 初始加载
  useEffect(() => {
    if (USE_MOCK_DATA) {
      // Mock模式: 加载Mock数据
      setLastTask(mockLastTask)
    } else {
      // 真实模式: 调用API
      fetchRunningTasks().then(runningTask => {
        if (!runningTask) {
          fetchRecentTasks()
        }
      })
    }
  }, [])

  // 格式化时间
  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 渲染状态徽章
  const renderStatusBadge = (status: SyncTask['status']) => {
    const statusConfig = {
      running: { icon: Loader2, label: '同步中', color: 'bg-blue-500', spin: true },
      completed: { icon: Check, label: '已完成', color: 'bg-green-500', spin: false },
      failed: { icon: X, label: '失败', color: 'bg-red-500', spin: false },
      cancelled: { icon: AlertCircle, label: '已取消', color: 'bg-gray-500', spin: false },
      pending: { icon: Loader2, label: '等待中', color: 'bg-yellow-500', spin: true }
    }

    const config = statusConfig[status]
    const Icon = config.icon

    return (
      <Badge variant="outline" className="gap-1">
        <Icon className={`w-3 h-3 ${config.spin ? 'animate-spin' : ''}`} />
        {config.label}
      </Badge>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 主控制区域 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button
            onClick={() => triggerSync(false)}
            disabled={isLoading || currentTask !== null}
            size="sm"
          >
            {isLoading || currentTask ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            增量同步
          </Button>

          <Button
            onClick={() => triggerSync(true)}
            disabled={isLoading || currentTask !== null}
            variant="outline"
            size="sm"
          >
            全量同步
          </Button>
        </div>

        {/* 最后同步时间 */}
        {lastTask && !currentTask && (
          <div className="text-xs text-gray-500">
            上次同步: {formatTime(lastTask.end_time || lastTask.start_time)}
          </div>
        )}
      </div>

      {/* 当前任务进度 */}
      {currentTask && showProgress && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {renderStatusBadge(currentTask.status)}
              <span className="text-sm font-medium">
                {currentTask.processed_stocks} / {currentTask.total_stocks} 股票
              </span>
            </div>
            
            {currentTask.status === 'running' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => cancelTask(currentTask.task_id)}
                className="h-6 text-xs"
              >
                取消
              </Button>
            )}
          </div>

          <Progress value={currentTask.progress} className="h-2" />

          <div className="flex justify-between text-xs text-gray-600">
            <span>成功: {currentTask.success_stocks}</span>
            <span>失败: {currentTask.failed_stocks}</span>
            <span>进度: {currentTask.progress}%</span>
          </div>
        </div>
      )}

      {/* 最后任务结果 */}
      {lastTask && !currentTask && showProgress && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border space-y-2">
          <div className="flex items-center justify-between">
            {renderStatusBadge(lastTask.status)}
            <span className="text-xs text-gray-500">
              耗时: {lastTask.duration_seconds}秒
            </span>
          </div>

          <div className="flex justify-between text-xs text-gray-600">
            <span>总计: {lastTask.total_stocks} 股票</span>
            <span>成功: {lastTask.success_stocks}</span>
            <span>失败: {lastTask.failed_stocks}</span>
            <span>记录: {lastTask.daily_records}</span>
          </div>
        </div>
      )}

      {/* 错误信息 */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        </div>
      )}

      {/* Mock模式提示 */}
      {USE_MOCK_DATA && (
        <div className="text-xs text-gray-500 text-center">
          🎭 Mock模式 - 不调用后端API
        </div>
      )}
    </div>
  )
}
