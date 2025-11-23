import { 
  BrokerAdapter, 
  BrokerCapabilities, 
  Account, 
  Position, 
  Order, 
  Quote,
  OrderSide,
  OrderType,
  Market,
  ConnectionError,
  OrderError,
  QuoteError 
} from './base'

// 老虎证券适配器
export class TigerAdapter extends BrokerAdapter {
  private accessToken?: string
  private refreshToken?: string
  private quoteSubscriptions: Set<string> = new Set()

  getName(): string {
    return '老虎证券'
  }

  getCapabilities(): BrokerCapabilities {
    return {
      markets: ['US', 'HK', 'CN', 'SG'],
      orderTypes: ['market', 'limit', 'stop', 'stop_limit'],
      autoTrading: true,
      paperTrading: true,
      realTimeData: true,
      optionsTrading: true,
      cryptoTrading: true,
      marginTrading: true,
      fractionalShares: true
    }
  }

  async connect(): Promise<boolean> {
    try {
      this.setStatus('connecting')

      // 验证配置
      if (!this.config.apiKey || !this.config.apiSecret) {
        throw new ConnectionError('API Key 或 API Secret 未配置')
      }

      // 模拟OAuth认证流程
      await this.delay(800)
      const authResult = await this.authenticate()
      
      if (!authResult) {
        throw new ConnectionError('API认证失败，请检查API Key和Secret')
      }

      // 获取访问令牌
      this.accessToken = 'tiger_access_token_' + Date.now()
      this.refreshToken = 'tiger_refresh_token_' + Date.now()

      this.setStatus('connected')
      console.log(`[Tiger] 连接成功 - 模式: ${this.mode}`)
      return true

    } catch (error) {
      this.setError(`连接失败: ${error instanceof Error ? error.message : '未知错误'}`)
      throw error
    }
  }

  async disconnect(): Promise<boolean> {
    try {
      // 清理订阅
      this.quoteSubscriptions.clear()
      
      // 清理令牌
      this.accessToken = undefined
      this.refreshToken = undefined

      this.setStatus('disconnected')
      console.log('[Tiger] 连接已断开')
      return true

    } catch (error) {
      this.setError(`断开连接失败: ${error instanceof Error ? error.message : '未知错误'}`)
      return false
    }
  }

  isConnected(): boolean {
    return this.status === 'connected' && !!this.accessToken
  }

  async getAccount(): Promise<Account> {
    this.checkConnection()

    try {
      await this.delay(250)

      // 模拟老虎账户数据
      return {
        id: this.config.account || 'TG123456789',
        name: '老虎证券账户',
        currency: 'USD',
        totalValue: this.mode === 'paper' ? 200000 : 75000,
        availableCash: this.mode === 'paper' ? 150000 : 45000,
        buyingPower: this.mode === 'paper' ? 300000 : 90000,
        positions: await this.getPositions(),
        dayTradingBuyingPower: this.mode === 'paper' ? 600000 : 180000,
        maintenanceMargin: 5000
      }

    } catch (error) {
      throw new ConnectionError(`获取账户信息失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async getPositions(): Promise<Position[]> {
    this.checkConnection()

    try {
      await this.delay(200)

      // 模拟持仓数据
      if (this.mode === 'paper') {
        return [
          {
            symbol: 'NVDA',
            quantity: 20,
            avgCost: 485.00,
            currentPrice: 492.50,
            marketValue: 9850,
            unrealizedPnL: 150,
            realizedPnL: 0
          },
          {
            symbol: 'META',
            quantity: 30,
            avgCost: 298.80,
            currentPrice: 301.20,
            marketValue: 9036,
            unrealizedPnL: 72,
            realizedPnL: 0
          },
          {
            symbol: 'BTC-USD',
            quantity: 0.5,
            avgCost: 43000,
            currentPrice: 44500,
            marketValue: 22250,
            unrealizedPnL: 750,
            realizedPnL: 0
          }
        ]
      } else {
        return [
          {
            symbol: 'NVDA',
            quantity: 10,
            avgCost: 480.00,
            currentPrice: 492.50,
            marketValue: 4925,
            unrealizedPnL: 125,
            realizedPnL: 50
          }
        ]
      }

    } catch (error) {
      throw new ConnectionError(`获取持仓信息失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async getOrders(symbol?: string): Promise<Order[]> {
    this.checkConnection()

    try {
      await this.delay(150)

      // 模拟订单数据
      const allOrders = [
        {
          id: 'TG20250824001',
          symbol: 'NVDA',
          side: 'buy' as OrderSide,
          type: 'limit' as OrderType,
          quantity: 20,
          price: 485.00,
          status: 'filled' as const,
          filledQuantity: 20,
          avgFillPrice: 485.00,
          commission: 2.0,
          createdAt: '2025-08-24 10:15:30',
          updatedAt: '2025-08-24 10:15:45'
        },
        {
          id: 'TG20250824002',
          symbol: 'META',
          side: 'buy' as OrderSide,
          type: 'stop_limit' as OrderType,
          quantity: 30,
          price: 300.00,
          stopPrice: 295.00,
          status: 'pending' as const,
          filledQuantity: 0,
          commission: 0,
          createdAt: '2025-08-24 11:30:15'
        }
      ]

      return symbol 
        ? allOrders.filter(order => order.symbol === symbol)
        : allOrders

    } catch (error) {
      throw new ConnectionError(`获取订单失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async placeOrder(
    symbol: string,
    side: OrderSide,
    type: OrderType,
    quantity: number,
    price?: number,
    stopPrice?: number
  ): Promise<Order> {
    this.checkConnection()
    this.validateOrder(symbol, side, type, quantity, price)

    try {
      await this.delay(400)

      // 检查资金充足性
      if (side === 'buy') {
        const account = await this.getAccount()
        const estimatedValue = quantity * (price || await this.getCurrentPrice(symbol))
        if (estimatedValue > account.availableCash) {
          throw new OrderError('资金不足')
        }
      }

      // 检查持仓充足性
      if (side === 'sell') {
        const positions = await this.getPositions()
        const position = positions.find(p => p.symbol === symbol)
        if (!position || position.quantity < quantity) {
          throw new OrderError('持仓不足')
        }
      }

      // 模拟下单
      const order: Order = {
        id: `TG${Date.now()}`,
        symbol,
        side,
        type,
        quantity,
        price,
        stopPrice,
        status: type === 'market' ? 'filled' : 'pending',
        filledQuantity: type === 'market' ? quantity : 0,
        avgFillPrice: type === 'market' ? (price || await this.getCurrentPrice(symbol)) : undefined,
        commission: this.calculateCommission(quantity, price || 100),
        createdAt: new Date().toLocaleString('zh-CN')
      }

      console.log(`[Tiger] 订单提交成功: ${symbol} ${side} ${quantity}股`)
      return order

    } catch (error) {
      if (error instanceof OrderError) {
        throw error
      }
      throw new OrderError(`下单失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    this.checkConnection()

    try {
      await this.delay(300)

      // 模拟撤单检查
      const orders = await this.getOrders()
      const order = orders.find(o => o.id === orderId)
      
      if (!order) {
        throw new OrderError('订单不存在')
      }

      if (order.status === 'filled') {
        throw new OrderError('已成交订单无法撤销')
      }

      console.log(`[Tiger] 订单撤销成功: ${orderId}`)
      return true

    } catch (error) {
      if (error instanceof OrderError) {
        throw error
      }
      throw new OrderError(`撤单失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async modifyOrder(orderId: string, quantity?: number, price?: number): Promise<Order> {
    this.checkConnection()

    try {
      await this.delay(350)

      const orders = await this.getOrders()
      const existingOrder = orders.find(o => o.id === orderId)
      
      if (!existingOrder) {
        throw new OrderError('订单不存在')
      }

      if (existingOrder.status !== 'pending') {
        throw new OrderError('只能修改未成交订单')
      }

      const modifiedOrder: Order = {
        ...existingOrder,
        quantity: quantity || existingOrder.quantity,
        price: price || existingOrder.price,
        updatedAt: new Date().toLocaleString('zh-CN')
      }

      console.log(`[Tiger] 订单修改成功: ${orderId}`)
      return modifiedOrder

    } catch (error) {
      if (error instanceof OrderError) {
        throw error
      }
      throw new OrderError(`改单失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async getQuote(symbol: string): Promise<Quote> {
    this.checkConnection()

    try {
      await this.delay(120)

      // 模拟行情数据 - 老虎支持更多市场
      const mockQuotes: Record<string, Quote> = {
        'NVDA': {
          symbol: 'NVDA',
          price: 492.50,
          change: 7.50,
          changePercent: 1.55,
          volume: 28456000,
          timestamp: new Date().toISOString(),
          bid: 492.45,
          ask: 492.55,
          bidSize: 200,
          askSize: 150
        },
        'META': {
          symbol: 'META',
          price: 301.20,
          change: 2.40,
          changePercent: 0.80,
          volume: 15623000,
          timestamp: new Date().toISOString(),
          bid: 301.15,
          ask: 301.25,
          bidSize: 100,
          askSize: 250
        },
        'BTC-USD': {
          symbol: 'BTC-USD',
          price: 44500,
          change: 1500,
          changePercent: 3.49,
          volume: 1250000,
          timestamp: new Date().toISOString(),
          bid: 44495,
          ask: 44505,
          bidSize: 0.5,
          askSize: 0.3
        },
        '00700': { // 腾讯 - 港股
          symbol: '00700',
          price: 385.50,
          change: -2.50,
          changePercent: -0.64,
          volume: 8560000,
          timestamp: new Date().toISOString(),
          bid: 385.40,
          ask: 385.60,
          bidSize: 1000,
          askSize: 800
        }
      }

      const quote = mockQuotes[symbol]
      if (!quote) {
        throw new QuoteError(`找不到股票: ${symbol}`)
      }

      return quote

    } catch (error) {
      if (error instanceof QuoteError) {
        throw error
      }
      throw new QuoteError(`获取行情失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    this.checkConnection()

    try {
      // 老虎支持批量查询，效率更高
      await this.delay(200)
      const quotes = await Promise.all(symbols.map(symbol => this.getQuote(symbol)))
      return quotes
    } catch (error) {
      throw new QuoteError(`批量获取行情失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async subscribeQuotes(symbols: string[], callback: (quotes: Quote[]) => void): Promise<boolean> {
    this.checkConnection()

    try {
      // 添加到订阅列表
      symbols.forEach(symbol => this.quoteSubscriptions.add(symbol))

      // 模拟WebSocket实时推送
      const pushQuotes = async () => {
        try {
          const quotes = await this.getQuotes(symbols)
          // 模拟更真实的价格变动
          quotes.forEach(quote => {
            const volatility = quote.symbol.includes('BTC') ? 0.02 : 0.005
            const change = (Math.random() - 0.5) * quote.price * volatility
            quote.price = this.formatAmount(quote.price + change)
            quote.change = this.formatAmount(quote.change + change)
            quote.changePercent = this.formatAmount((quote.change / (quote.price - quote.change)) * 100)
            quote.timestamp = new Date().toISOString()
          })
          callback(quotes)
        } catch (error) {
          console.error('[Tiger] 行情推送错误:', error)
        }
      }

      // 立即推送一次
      await pushQuotes()

      // 定期推送
      const interval = setInterval(pushQuotes, 800)
      
      // 存储定时器引用
      ;(this as any)[`interval_${symbols.join('_')}`] = interval

      console.log(`[Tiger] 订阅行情成功: ${symbols.join(', ')}`)
      return true

    } catch (error) {
      throw new QuoteError(`订阅行情失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async unsubscribeQuotes(symbols: string[]): Promise<boolean> {
    try {
      // 从订阅列表移除
      symbols.forEach(symbol => this.quoteSubscriptions.delete(symbol))

      // 清理定时器
      const intervalKey = `interval_${symbols.join('_')}`
      const interval = (this as any)[intervalKey]
      if (interval) {
        clearInterval(interval)
        delete (this as any)[intervalKey]
      }

      console.log(`[Tiger] 取消订阅行情: ${symbols.join(', ')}`)
      return true

    } catch (error) {
      throw new QuoteError(`取消订阅失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  // 私有辅助方法

  private async authenticate(): Promise<boolean> {
    // 模拟OAuth认证
    await this.delay(600)
    return this.config.apiKey?.startsWith('tiger_') || false
  }

  private checkConnection(): void {
    if (!this.isConnected()) {
      throw new ConnectionError('未连接到老虎证券')
    }
  }

  private async getCurrentPrice(symbol: string): Promise<number> {
    const quote = await this.getQuote(symbol)
    return quote.price
  }

  private calculateCommission(quantity: number, price: number): number {
    // 老虎证券佣金计算（模拟）
    const value = quantity * price
    
    // 根据市场不同计算佣金
    if (price < 100) { // 可能是港股
      return Math.max(value * 0.0008, 3.0) // 港股最低3港币
    } else if (quantity < 1) { // 可能是加密货币
      return value * 0.001 // 0.1%
    } else { // 美股
      return Math.max(value * 0.0025, 0.99) // 最低0.99美元
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}