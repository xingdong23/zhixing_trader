import { BrokerAdapter, Order, Quote, OrderSide, OrderType } from './brokers/base'

// 交易计划接口
export interface TradingPlan {
  id: string
  name: string
  symbol: string
  strategy: 'buy_signal' | 'sell_signal' | 'stop_loss' | 'take_profit' | 'rebalance'
  status: 'active' | 'inactive' | 'executed' | 'cancelled' | 'failed'
  
  // 触发条件
  trigger: {
    type: 'price' | 'technical' | 'time' | 'manual'
    condition: string // 例如: "price <= 210", "RSI < 30", "time >= 09:30"
    params?: Record<string, any>
  }
  
  // 执行参数
  execution: {
    side: OrderSide
    type: OrderType
    quantity: number
    price?: number
    stopPrice?: number
    timeInForce?: 'DAY' | 'GTC' | 'IOC' | 'FOK'
    brokerId: string
  }
  
  // 风控参数
  riskControl: {
    maxLoss?: number // 最大亏损金额
    maxLossPercent?: number // 最大亏损百分比
    positionLimit?: number // 仓位限制
    dailyLimit?: number // 当日交易限制
  }
  
  createdAt: string
  updatedAt?: string
  createdBy: string
  nextCheckTime?: string
}

// 执行结果
export interface ExecutionResult {
  planId: string
  success: boolean
  order?: Order
  error?: string
  executedAt: string
  nextAction?: 'wait' | 'retry' | 'cancel' | 'complete'
}

// 执行统计
export interface ExecutionStats {
  totalPlans: number
  activePlans: number
  executedToday: number
  successRate: number
  errorCount: number
  lastExecution?: string
}

// 执行引擎配置
export interface EngineConfig {
  enabled: boolean
  checkInterval: number // 检查间隔（毫秒）
  maxConcurrentExecutions: number
  retryAttempts: number
  retryDelay: number
  riskCheckEnabled: boolean
  notificationEnabled: boolean
}

// 交易执行引擎
export class TradingExecutionEngine {
  private brokers: Map<string, BrokerAdapter> = new Map()
  private plans: Map<string, TradingPlan> = new Map()
  private isRunning: boolean = false
  private checkInterval?: NodeJS.Timeout
  private config: EngineConfig
  private executionHistory: ExecutionResult[] = []
  private quoteCache: Map<string, Quote> = new Map()
  private quoteCacheTime: Map<string, number> = new Map()
  private readonly QUOTE_CACHE_TTL = 5000 // 5秒缓存

  constructor(config: EngineConfig) {
    this.config = config
  }

  // 注册券商
  registerBroker(id: string, broker: BrokerAdapter): void {
    this.brokers.set(id, broker)
    console.log(`[Engine] 注册券商: ${id} (${broker.getName()})`)
  }

  // 移除券商
  removeBroker(id: string): void {
    this.brokers.delete(id)
    console.log(`[Engine] 移除券商: ${id}`)
  }

  // 获取券商
  getBroker(id: string): BrokerAdapter | undefined {
    return this.brokers.get(id)
  }

  // 添加交易计划
  addPlan(plan: TradingPlan): void {
    this.plans.set(plan.id, plan)
    console.log(`[Engine] 添加交易计划: ${plan.name} (${plan.symbol})`)
  }

  // 移除交易计划
  removePlan(planId: string): void {
    this.plans.delete(planId)
    console.log(`[Engine] 移除交易计划: ${planId}`)
  }

  // 更新交易计划
  updatePlan(plan: TradingPlan): void {
    if (this.plans.has(plan.id)) {
      this.plans.set(plan.id, { ...plan, updatedAt: new Date().toISOString() })
      console.log(`[Engine] 更新交易计划: ${plan.name}`)
    }
  }

  // 获取交易计划
  getPlan(planId: string): TradingPlan | undefined {
    return this.plans.get(planId)
  }

  // 获取所有交易计划
  getAllPlans(): TradingPlan[] {
    return Array.from(this.plans.values())
  }

  // 启动引擎
  start(): void {
    if (this.isRunning) {
      console.log('[Engine] 引擎已在运行中')
      return
    }

    this.isRunning = true
    this.checkInterval = setInterval(() => {
      this.checkAndExecutePlans()
    }, this.config.checkInterval)

    console.log('[Engine] 交易执行引擎启动')
  }

  // 停止引擎
  stop(): void {
    if (!this.isRunning) {
      console.log('[Engine] 引擎未在运行')
      return
    }

    this.isRunning = false
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = undefined
    }

    console.log('[Engine] 交易执行引擎停止')
  }

  // 手动触发检查
  async checkAndExecutePlans(): Promise<void> {
    if (!this.config.enabled) {
      return
    }

    const activePlans = Array.from(this.plans.values()).filter(plan => plan.status === 'active')
    
    if (activePlans.length === 0) {
      return
    }

    console.log(`[Engine] 检查 ${activePlans.length} 个活跃计划`)

    // 限制并发执行数量
    const executing = activePlans.slice(0, this.config.maxConcurrentExecutions)
    
    await Promise.all(executing.map(plan => this.checkAndExecutePlan(plan)))
  }

  // 检查并执行单个计划
  private async checkAndExecutePlan(plan: TradingPlan): Promise<void> {
    try {
      // 检查是否满足触发条件
      const shouldExecute = await this.evaluateTrigger(plan)
      
      if (!shouldExecute) {
        return
      }

      console.log(`[Engine] 计划 ${plan.name} 触发条件满足，准备执行`)

      // 风险检查
      if (this.config.riskCheckEnabled) {
        const riskCheckPassed = await this.checkRisk(plan)
        if (!riskCheckPassed) {
          console.log(`[Engine] 计划 ${plan.name} 风险检查未通过，跳过执行`)
          return
        }
      }

      // 执行交易
      const result = await this.executePlan(plan)
      
      // 记录执行结果
      this.executionHistory.push(result)
      
      // 更新计划状态
      if (result.success) {
        plan.status = 'executed'
        plan.updatedAt = new Date().toISOString()
        this.plans.set(plan.id, plan)
        console.log(`[Engine] 计划 ${plan.name} 执行成功`)
      } else {
        console.log(`[Engine] 计划 ${plan.name} 执行失败: ${result.error}`)
        
        // 根据错误类型决定下一步动作
        if (result.nextAction === 'retry') {
          setTimeout(() => {
            this.checkAndExecutePlan(plan)
          }, this.config.retryDelay)
        } else if (result.nextAction === 'cancel') {
          plan.status = 'failed'
          this.plans.set(plan.id, plan)
        }
      }

    } catch (error) {
      console.error(`[Engine] 检查计划 ${plan.name} 时发生错误:`, error)
    }
  }

  // 评估触发条件
  private async evaluateTrigger(plan: TradingPlan): Promise<boolean> {
    switch (plan.trigger.type) {
      case 'price':
        return await this.evaluatePriceTrigger(plan)
      case 'technical':
        return await this.evaluateTechnicalTrigger(plan)
      case 'time':
        return this.evaluateTimeTrigger(plan)
      case 'manual':
        return false // 手动触发需要外部调用
      default:
        return false
    }
  }

  // 评估价格触发条件
  private async evaluatePriceTrigger(plan: TradingPlan): Promise<boolean> {
    try {
      const quote = await this.getQuoteWithCache(plan.symbol, plan.execution.brokerId)
      if (!quote) {
        return false
      }

      const condition = plan.trigger.condition
      const price = quote.price

      // 简单的条件解析（实际实现应该更复杂）
      if (condition.includes('<=')) {
        const targetPrice = parseFloat(condition.split('<=')[1].trim())
        return price <= targetPrice
      } else if (condition.includes('>=')) {
        const targetPrice = parseFloat(condition.split('>=')[1].trim())
        return price >= targetPrice
      } else if (condition.includes('<')) {
        const targetPrice = parseFloat(condition.split('<')[1].trim())
        return price < targetPrice
      } else if (condition.includes('>')) {
        const targetPrice = parseFloat(condition.split('>')[1].trim())
        return price > targetPrice
      }

      return false
    } catch (error) {
      console.error(`[Engine] 评估价格触发条件失败:`, error)
      return false
    }
  }

  // 评估技术指标触发条件（简化实现）
  private async evaluateTechnicalTrigger(plan: TradingPlan): Promise<boolean> {
    // 这里应该集成技术分析库，计算各种指标
    // 目前返回随机结果作为示例
    return Math.random() < 0.1 // 10%概率触发
  }

  // 评估时间触发条件
  private evaluateTimeTrigger(plan: TradingPlan): boolean {
    const condition = plan.trigger.condition
    const now = new Date()

    // 简单的时间条件解析
    if (condition.includes('time >=')) {
      const timeStr = condition.split('time >=')[1].trim().replace(/['"]/g, '')
      const targetTime = new Date(`${now.toDateString()} ${timeStr}`)
      return now >= targetTime
    }

    return false
  }

  // 风险检查
  private async checkRisk(plan: TradingPlan): Promise<boolean> {
    try {
      const broker = this.brokers.get(plan.execution.brokerId)
      if (!broker || !broker.isConnected()) {
        return false
      }

      const account = await broker.getAccount()
      const positions = await broker.getPositions()

      // 检查资金充足性
      if (plan.execution.side === 'buy') {
        const estimatedCost = plan.execution.quantity * (plan.execution.price || 100)
        if (estimatedCost > account.availableCash) {
          console.log(`[Engine] 资金不足: 需要 $${estimatedCost}, 可用 $${account.availableCash}`)
          return false
        }
      }

      // 检查持仓限制
      if (plan.riskControl.positionLimit) {
        const currentPosition = positions.find(p => p.symbol === plan.symbol)
        const currentQuantity = currentPosition ? currentPosition.quantity : 0
        const newQuantity = plan.execution.side === 'buy' 
          ? currentQuantity + plan.execution.quantity
          : currentQuantity - plan.execution.quantity

        if (Math.abs(newQuantity) > plan.riskControl.positionLimit) {
          console.log(`[Engine] 超出仓位限制: 新仓位 ${newQuantity}, 限制 ${plan.riskControl.positionLimit}`)
          return false
        }
      }

      // 检查当日交易限制
      if (plan.riskControl.dailyLimit) {
        const todayExecutions = this.getTodayExecutions()
        if (todayExecutions.length >= plan.riskControl.dailyLimit) {
          console.log(`[Engine] 超出当日交易限制: ${todayExecutions.length}/${plan.riskControl.dailyLimit}`)
          return false
        }
      }

      return true
    } catch (error) {
      console.error(`[Engine] 风险检查失败:`, error)
      return false
    }
  }

  // 执行交易计划
  private async executePlan(plan: TradingPlan): Promise<ExecutionResult> {
    try {
      const broker = this.brokers.get(plan.execution.brokerId)
      if (!broker || !broker.isConnected()) {
        return {
          planId: plan.id,
          success: false,
          error: '券商未连接',
          executedAt: new Date().toISOString(),
          nextAction: 'retry'
        }
      }

      // 下单
      const order = await broker.placeOrder(
        plan.symbol,
        plan.execution.side,
        plan.execution.type,
        plan.execution.quantity,
        plan.execution.price,
        plan.execution.stopPrice
      )

      return {
        planId: plan.id,
        success: true,
        order,
        executedAt: new Date().toISOString(),
        nextAction: 'complete'
      }

    } catch (error) {
      return {
        planId: plan.id,
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        executedAt: new Date().toISOString(),
        nextAction: 'retry'
      }
    }
  }

  // 带缓存的行情获取
  private async getQuoteWithCache(symbol: string, brokerId: string): Promise<Quote | null> {
    const cacheKey = `${symbol}_${brokerId}`
    const cached = this.quoteCache.get(cacheKey)
    const cacheTime = this.quoteCacheTime.get(cacheKey)

    if (cached && cacheTime && (Date.now() - cacheTime) < this.QUOTE_CACHE_TTL) {
      return cached
    }

    try {
      const broker = this.brokers.get(brokerId)
      if (!broker || !broker.isConnected()) {
        return null
      }

      const quote = await broker.getQuote(symbol)
      this.quoteCache.set(cacheKey, quote)
      this.quoteCacheTime.set(cacheKey, Date.now())
      return quote

    } catch (error) {
      console.error(`[Engine] 获取行情失败: ${symbol}`, error)
      return null
    }
  }

  // 获取今日执行记录
  private getTodayExecutions(): ExecutionResult[] {
    const today = new Date().toDateString()
    return this.executionHistory.filter(result => 
      new Date(result.executedAt).toDateString() === today
    )
  }

  // 获取执行统计
  getExecutionStats(): ExecutionStats {
    const allPlans = Array.from(this.plans.values())
    const todayExecutions = this.getTodayExecutions()
    const successfulExecutions = todayExecutions.filter(r => r.success)

    return {
      totalPlans: allPlans.length,
      activePlans: allPlans.filter(p => p.status === 'active').length,
      executedToday: todayExecutions.length,
      successRate: todayExecutions.length > 0 ? (successfulExecutions.length / todayExecutions.length) * 100 : 0,
      errorCount: todayExecutions.filter(r => !r.success).length,
      lastExecution: todayExecutions.length > 0 ? todayExecutions[todayExecutions.length - 1].executedAt : undefined
    }
  }

  // 手动执行计划
  async manualExecute(planId: string): Promise<ExecutionResult> {
    const plan = this.plans.get(planId)
    if (!plan) {
      return {
        planId,
        success: false,
        error: '计划不存在',
        executedAt: new Date().toISOString(),
        nextAction: 'cancel'
      }
    }

    return await this.executePlan(plan)
  }

  // 更新配置
  updateConfig(config: Partial<EngineConfig>): void {
    this.config = { ...this.config, ...config }
    
    // 如果修改了检查间隔，重启定时器
    if (config.checkInterval && this.isRunning) {
      this.stop()
      this.start()
    }
  }

  // 获取配置
  getConfig(): EngineConfig {
    return { ...this.config }
  }

  // 清理执行历史
  clearExecutionHistory(beforeDate?: string): void {
    if (beforeDate) {
      const cutoffTime = new Date(beforeDate).getTime()
      this.executionHistory = this.executionHistory.filter(
        result => new Date(result.executedAt).getTime() >= cutoffTime
      )
    } else {
      this.executionHistory = []
    }
  }
}