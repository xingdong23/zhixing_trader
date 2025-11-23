// 券商适配器基类和接口定义

export type TradingMode = 'paper' | 'live'
export type OrderSide = 'buy' | 'sell'
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit'
export type OrderStatus = 'pending' | 'filled' | 'cancelled' | 'failed' | 'partial_filled'
export type Market = 'US' | 'HK' | 'CN' | 'SG' | 'JP' | 'EU'

// 订单信息
export interface Order {
  id: string
  symbol: string
  side: OrderSide
  type: OrderType
  quantity: number
  price?: number
  stopPrice?: number
  status: OrderStatus
  filledQuantity: number
  avgFillPrice?: number
  commission?: number
  createdAt: string
  updatedAt?: string
  error?: string
}

// 持仓信息
export interface Position {
  symbol: string
  quantity: number
  avgCost: number
  currentPrice: number
  marketValue: number
  unrealizedPnL: number
  realizedPnL: number
}

// 账户信息
export interface Account {
  id: string
  name: string
  currency: string
  totalValue: number
  availableCash: number
  buyingPower: number
  positions: Position[]
  dayTradingBuyingPower?: number
  maintenanceMargin?: number
}

// 行情数据
export interface Quote {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  timestamp: string
  bid?: number
  ask?: number
  bidSize?: number
  askSize?: number
}

// 券商配置
export interface BrokerConfig {
  apiKey?: string
  apiSecret?: string
  appId?: string
  host?: string
  port?: number
  account?: string
  market?: Market[]
  sandbox?: boolean
  timeout?: number
}

// 连接状态
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error'

// 券商能力
export interface BrokerCapabilities {
  markets: Market[]
  orderTypes: OrderType[]
  autoTrading: boolean
  paperTrading: boolean
  realTimeData: boolean
  optionsTrading: boolean
  cryptoTrading: boolean
  marginTrading: boolean
  fractionalShares: boolean
}

// 券商适配器抽象基类
export abstract class BrokerAdapter {
  protected config: BrokerConfig
  protected mode: TradingMode
  protected status: ConnectionStatus = 'disconnected'
  protected lastError?: string

  constructor(config: BrokerConfig, mode: TradingMode = 'paper') {
    this.config = config
    this.mode = mode
  }

  // 抽象方法 - 子类必须实现
  abstract getName(): string
  abstract getCapabilities(): BrokerCapabilities
  abstract connect(): Promise<boolean>
  abstract disconnect(): Promise<boolean>
  abstract isConnected(): boolean

  // 账户相关
  abstract getAccount(): Promise<Account>
  abstract getPositions(): Promise<Position[]>
  abstract getOrders(symbol?: string): Promise<Order[]>

  // 交易相关
  abstract placeOrder(
    symbol: string,
    side: OrderSide,
    type: OrderType,
    quantity: number,
    price?: number,
    stopPrice?: number
  ): Promise<Order>
  
  abstract cancelOrder(orderId: string): Promise<boolean>
  abstract modifyOrder(orderId: string, quantity?: number, price?: number): Promise<Order>

  // 行情相关
  abstract getQuote(symbol: string): Promise<Quote>
  abstract getQuotes(symbols: string[]): Promise<Quote[]>
  abstract subscribeQuotes(symbols: string[], callback: (quotes: Quote[]) => void): Promise<boolean>
  abstract unsubscribeQuotes(symbols: string[]): Promise<boolean>

  // 工具方法
  getMode(): TradingMode {
    return this.mode
  }

  setMode(mode: TradingMode): void {
    this.mode = mode
  }

  getStatus(): ConnectionStatus {
    return this.status
  }

  getLastError(): string | undefined {
    return this.lastError
  }

  protected setStatus(status: ConnectionStatus): void {
    this.status = status
  }

  protected setError(error: string): void {
    this.lastError = error
    this.status = 'error'
  }

  // 验证订单参数
  protected validateOrder(
    symbol: string,
    side: OrderSide,
    type: OrderType,
    quantity: number,
    price?: number
  ): void {
    if (!symbol || symbol.trim() === '') {
      throw new Error('股票代码不能为空')
    }
    
    if (quantity <= 0) {
      throw new Error('交易数量必须大于0')
    }
    
    if ((type === 'limit' || type === 'stop_limit') && (!price || price <= 0)) {
      throw new Error('限价单必须指定有效的价格')
    }
  }

  // 格式化金额
  protected formatAmount(amount: number, decimals: number = 2): number {
    return Math.round(amount * Math.pow(10, decimals)) / Math.pow(10, decimals)
  }

  // 生成订单ID
  protected generateOrderId(): string {
    return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// 券商工厂类
export class BrokerFactory {
  private static adapters: Map<string, typeof BrokerAdapter> = new Map()

  // 注册券商适配器
  static register(name: string, adapterClass: typeof BrokerAdapter): void {
    this.adapters.set(name, adapterClass)
  }

  // 创建券商实例
  static create(name: string, config: BrokerConfig, mode: TradingMode = 'paper'): BrokerAdapter {
    const AdapterClass = this.adapters.get(name)
    if (!AdapterClass) {
      throw new Error(`不支持的券商: ${name}`)
    }
    // 这里需要注意：实际使用时AdapterClass是具体的子类，不是抽象类
    return new (AdapterClass as any)(config, mode)
  }

  // 获取支持的券商列表
  static getSupportedBrokers(): string[] {
    return Array.from(this.adapters.keys())
  }
}

// 错误类定义
export class BrokerError extends Error {
  constructor(
    message: string,
    public code?: string,
    public brokerError?: any
  ) {
    super(message)
    this.name = 'BrokerError'
  }
}

export class ConnectionError extends BrokerError {
  constructor(message: string, brokerError?: any) {
    super(message, 'CONNECTION_ERROR', brokerError)
    this.name = 'ConnectionError'
  }
}

export class OrderError extends BrokerError {
  constructor(message: string, brokerError?: any) {
    super(message, 'ORDER_ERROR', brokerError)
    this.name = 'OrderError'
  }
}

export class QuoteError extends BrokerError {
  constructor(message: string, brokerError?: any) {
    super(message, 'QUOTE_ERROR', brokerError)
    this.name = 'QuoteError'
  }
}