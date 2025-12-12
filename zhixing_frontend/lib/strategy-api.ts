/**
 * 策略管理API调用工具
 */

// 获取API基础URL
const getApiBase = () => process.env.NEXT_PUBLIC_API_BASE_URL || ''

// 策略数据类型定义
export interface Strategy {
  id: number
  name: string
  description: string
  category: string
  impl_type: string
  configuration: Record<string, any>
  timeframe: string
  enabled: boolean
  is_system_default: boolean
  execution_count: number
  last_execution_time: string | null
  created_at: string | null
  updated_at: string | null
}

// 策略执行结果类型
export interface StrategyResult {
  stock_symbol: string
  score: number
  confidence: number
  reasons: string[]
  suggested_action: string
  target_price: number | null
  stop_loss: number | null
  current_price: number | null
  technical_details: Record<string, any>
  risk_level: string
}

// 策略执行任务状态
export interface TaskStatus {
  task_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  message: string
  result?: StrategyResult[]
  error?: string
  created_at: string
  updated_at: string
}

// API响应类型
export interface ApiResponse<T> {
  success: boolean
  data: T
  message: string
}

// 策略API类
export class StrategyApi {

  /**
   * 获取所有策略列表
   */
  static async getStrategies(): Promise<ApiResponse<{ strategies: Strategy[], total: number }>> {
    const response = await fetch(`${getApiBase()}/api/v1/strategies/`)
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.detail || '获取策略列表失败')
    }
    return data
  }

  /**
   * 执行单个策略（同步）
   */
  static async executeStrategy(strategyId: number): Promise<ApiResponse<StrategyResult[]>> {
    const response = await fetch(`${getApiBase()}/api/v1/strategies/${strategyId}/execute`, {
      method: 'POST'
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.detail || '执行策略失败')
    }
    return data
  }

  /**
   * 执行单个策略（异步）
   */
  static async executeStrategyAsync(strategyId: number): Promise<ApiResponse<{ task_id: string }>> {
    const response = await fetch(`${getApiBase()}/api/v1/strategies/${strategyId}/execute-async`, {
      method: 'POST'
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.detail || '异步执行策略失败')
    }
    return data
  }

  /**
   * 获取任务执行状态
   */
  static async getTaskStatus(taskId: string): Promise<ApiResponse<TaskStatus>> {
    const response = await fetch(`${getApiBase()}/api/v1/strategies/exec/status?task_id=${taskId}`)
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.detail || '获取任务状态失败')
    }
    return data
  }

  /**
   * 获取策略最近任务状态
   */
  static async getLastTaskStatus(strategyId: number): Promise<ApiResponse<TaskStatus>> {
    const response = await fetch(`${getApiBase()}/api/v1/strategies/exec/last-status?strategy_id=${strategyId}`)
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.detail || '获取最近任务状态失败')
    }
    return data
  }

  /**
   * 执行所有策略
   */
  static async executeAllStrategies(): Promise<ApiResponse<{ strategy_results: Record<string, StrategyResult[]>, total_stocks: number }>> {
    const response = await fetch(`${getApiBase()}/api/v1/strategies/execute-all`, {
      method: 'POST'
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.detail || '执行所有策略失败')
    }
    return data
  }

  /**
   * 获取可用策略类型
   */
  static async getAvailableStrategyTypes(): Promise<ApiResponse<{ strategy_types: string[], strategy_info: Record<string, any> }>> {
    const response = await fetch(`${getApiBase()}/api/v1/strategies/available`)
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.detail || '获取策略类型失败')
    }
    return data
  }

  /**
   * 触发数据更新
   */
  static async triggerDataUpdate(): Promise<ApiResponse<{ update_counts: Record<string, any>, total_daily: number, total_hourly: number }>> {
    const response = await fetch(`${getApiBase()}/api/v1/strategies/trigger-data-update`, {
      method: 'POST'
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.detail || '触发数据更新失败')
    }
    return data
  }
}
