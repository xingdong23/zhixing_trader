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

// 富途牛牛适配器
export class FutuAdapter extends BrokerAdapter {
  private websocket?: WebSocket
  private quoteCallbacks: Map<string, (quotes: Quote[]) => void> = new Map()

  getName(): string {
    return '富途牛牛'
  }

  getCapabilities(): BrokerCapabilities {
    return {
      markets: ['US', 'HK', 'CN'],
      orderTypes: ['market', 'limit'],
      autoTrading: true,
      paperTrading: true,
      realTimeData: true,
      optionsTrading: true,
      cryptoTrading: false,
      marginTrading: true,
      fractionalShares: false
    }
  }

  async connect(): Promise<boolean> {
    try {
      this.setStatus('connecting')

      // 模拟连接过程
      await this.delay(1000)

      // 验证配置
      if (!this.config.apiKey || !this.config.host) {
        throw new ConnectionError('API Key 或主机地址未配置')
      }

      // 模拟API认证
      const authResult = await this.authenticate()
      if (!authResult) {
        throw new ConnectionError('API认证失败，请检查API Key')
      }

      // 建立WebSocket连接（模拟）
      await this.connectWebSocket()

      this.setStatus('connected')
      console.log(`[Futu] 连接成功 - 模式: ${this.mode}`)
      return true

    } catch (error) {
      this.setError(`连接失败: ${error instanceof Error ? error.message : '未知错误'}`)
      throw error
    }
  }

  async disconnect(): Promise<boolean> {
    try {
      if (this.websocket) {
        this.websocket.close()
        this.websocket = undefined
      }

      this.setStatus('disconnected')
      console.log('[Futu] 连接已断开')
      return true

    } catch (error) {
      this.setError(`断开连接失败: ${error instanceof Error ? error.message : '未知错误'}`)
      return false
    }
  }

  isConnected(): boolean {
    return this.status === 'connected'
  }

  async getAccount(): Promise<Account> {
    this.checkConnection()

    try {
      // 模拟API调用
      await this.delay(200)

      // 模拟账户数据
      return {
        id: this.config.account || 'DU1234567',
        name: '富途模拟账户',
        currency: 'USD',
        totalValue: this.mode === 'paper' ? 100000 : 50000,
        availableCash: this.mode === 'paper' ? 85000 : 25000,
        buyingPower: this.mode === 'paper' ? 170000 : 50000,
        positions: await this.getPositions(),
        dayTradingBuyingPower: this.mode === 'paper' ? 340000 : 100000
      }

    } catch (error) {
      throw new ConnectionError(`获取账户信息失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async getPositions(): Promise<Position[]> {
    this.checkConnection()

    try {
      await this.delay(150)

      // 模拟持仓数据
      if (this.mode === 'paper') {
        return [
          {
            symbol: 'AAPL',
            quantity: 100,
            avgCost: 210.50,
            currentPrice: 215.30,
            marketValue: 21530,
            unrealizedPnL: 480,
            realizedPnL: 0
          },
          {
            symbol: 'TSLA',
            quantity: 50,
            avgCost: 185.00,
            currentPrice: 195.20,
            marketValue: 9760,
            unrealizedPnL: 510,
            realizedPnL: 0
          }
        ]
      } else {
        return [
          {
            symbol: 'AAPL',
            quantity: 50,
            avgCost: 208.00,
            currentPrice: 215.30,
            marketValue: 10765,
            unrealizedPnL: 365,
            realizedPnL: 120
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
      await this.delay(100)

      // 模拟订单数据
      const allOrders = [
        {
          id: 'FT20250824001',
          symbol: 'AAPL',
          side: 'buy' as OrderSide,
          type: 'limit' as OrderType,
          quantity: 100,
          price: 210.50,
          status: 'filled' as const,
          filledQuantity: 100,
          avgFillPrice: 210.50,
          commission: 1.5,
          createdAt: '2025-08-24 09:30:15',
          updatedAt: '2025-08-24 09:30:20'
        },
        {
          id: 'FT20250824002',
          symbol: 'TSLA',
          side: 'sell' as OrderSide,
          type: 'market' as OrderType,
          quantity: 50,
          status: 'pending' as const,
          filledQuantity: 0,
          commission: 0,
          createdAt: '2025-08-24 14:20:30'
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
      await this.delay(300)

      // 检查资金充足性（模拟）
      if (side === 'buy') {
        const account = await this.getAccount()
        const orderValue = quantity * (price || 100) // 假设市价为100
        if (orderValue > account.availableCash) {
          throw new OrderError('资金不足')
        }
      }

      // 模拟下单
      const order: Order = {
        id: this.generateOrderId(),
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

      console.log(`[Futu] 订单提交成功: ${symbol} ${side} ${quantity}股`)
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
      await this.delay(200)

      // 模拟撤单
      console.log(`[Futu] 订单撤销成功: ${orderId}`)
      return true

    } catch (error) {
      throw new OrderError(`撤单失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async modifyOrder(orderId: string, quantity?: number, price?: number): Promise<Order> {
    this.checkConnection()

    try {
      await this.delay(250)

      // 模拟改单
      const orders = await this.getOrders()
      const existingOrder = orders.find(o => o.id === orderId)
      
      if (!existingOrder) {
        throw new OrderError('订单不存在')
      }

      const modifiedOrder: Order = {
        ...existingOrder,
        quantity: quantity || existingOrder.quantity,
        price: price || existingOrder.price,
        updatedAt: new Date().toLocaleString('zh-CN')
      }

      console.log(`[Futu] 订单修改成功: ${orderId}`)
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
      await this.delay(100)

      // 模拟行情数据
      const mockQuotes: Record<string, Quote> = {
        'AAPL': {
          symbol: 'AAPL',
          price: 215.30,
          change: 4.80,
          changePercent: 2.28,
          volume: 45623000,
          timestamp: new Date().toISOString(),
          bid: 215.25,
          ask: 215.35,
          bidSize: 100,
          askSize: 200
        },
        'TSLA': {
          symbol: 'TSLA',
          price: 195.20,
          change: -2.15,
          changePercent: -1.09,
          volume: 98234000,
          timestamp: new Date().toISOString(),
          bid: 195.15,
          ask: 195.25,
          bidSize: 150,
          askSize: 100
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
      const quotes = await Promise.all(symbols.map(symbol => this.getQuote(symbol)))
      return quotes
    } catch (error) {
      throw new QuoteError(`批量获取行情失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async subscribeQuotes(symbols: string[], callback: (quotes: Quote[]) => void): Promise<boolean> {
    this.checkConnection()

    try {
      const subscriptionId = symbols.join(',')
      this.quoteCallbacks.set(subscriptionId, callback)

      // 模拟实时行情推送
      const interval = setInterval(async () => {
        try {
          const quotes = await this.getQuotes(symbols)
          // 模拟价格变动
          quotes.forEach(quote => {
            quote.price += (Math.random() - 0.5) * 2
            quote.change = quote.price - (quote.price - quote.change)
            quote.changePercent = (quote.change / (quote.price - quote.change)) * 100
            quote.timestamp = new Date().toISOString()
          })
          callback(quotes)
        } catch (error) {
          console.error('[Futu] 行情推送错误:', error)
        }
      }, 1000)

      // 存储定时器引用以便取消订阅
      ;(this.quoteCallbacks as any)[subscriptionId + '_interval'] = interval

      console.log(`[Futu] 订阅行情成功: ${symbols.join(', ')}`)
      return true

    } catch (error) {
      throw new QuoteError(`订阅行情失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async unsubscribeQuotes(symbols: string[]): Promise<boolean> {
    try {
      const subscriptionId = symbols.join(',')
      const interval = (this.quoteCallbacks as any)[subscriptionId + '_interval']
      
      if (interval) {
        clearInterval(interval)
        delete (this.quoteCallbacks as any)[subscriptionId + '_interval']
      }
      
      this.quoteCallbacks.delete(subscriptionId)

      console.log(`[Futu] 取消订阅行情: ${symbols.join(', ')}`)
      return true

    } catch (error) {
      throw new QuoteError(`取消订阅失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  // 私有辅助方法

  private async authenticate(): Promise<boolean> {
    // 模拟API认证
    await this.delay(500)
    return this.config.apiKey?.startsWith('ft_') || false
  }

  private async connectWebSocket(): Promise<void> {
    // 模拟WebSocket连接
    await this.delay(300)
    // 在实际实现中，这里会建立真实的WebSocket连接
  }

  private checkConnection(): void {
    if (!this.isConnected()) {
      throw new ConnectionError('未连接到券商')
    }
  }

  private async getCurrentPrice(symbol: string): Promise<number> {
    const quote = await this.getQuote(symbol)
    return quote.price
  }

  private calculateCommission(quantity: number, price: number): number {
    // 富途佣金计算（模拟）
    const value = quantity * price
    const commission = Math.max(value * 0.0003, 0.99) // 最低0.99美元
    return this.formatAmount(commission)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}