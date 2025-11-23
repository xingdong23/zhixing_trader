// 券商管理器和适配器导出

export * from './base'
export { FutuAdapter } from './futu'
export { TigerAdapter } from './tiger'

import { BrokerFactory } from './base'
import { FutuAdapter } from './futu'
import { TigerAdapter } from './tiger'

// 注册所有支持的券商适配器
BrokerFactory.register('futu', FutuAdapter)
BrokerFactory.register('tiger', TigerAdapter)

// 券商配置模板
export const BROKER_TEMPLATES = {
  futu: {
    name: 'futu',
    displayName: '富途牛牛',
    logo: '🐮',
    description: '富途牛牛是领先的港美股交易平台',
    markets: ['US', 'HK', 'CN'],
    features: {
      autoTrading: true,
      paperTrading: true,
      realTimeData: true,
      optionsTrading: true,
      cryptoTrading: false,
      marginTrading: true,
      fractionalShares: false
    },
    configFields: [
      { 
        key: 'apiKey', 
        label: 'API Key', 
        type: 'password', 
        required: true,
        placeholder: 'ft_api_key_...',
        description: '在富途开发者中心申请的API Key'
      },
      { 
        key: 'host', 
        label: '主机地址', 
        type: 'text', 
        required: true,
        defaultValue: 'openapi.futunn.com',
        description: '富途OpenAPI服务器地址'
      },
      { 
        key: 'port', 
        label: '端口', 
        type: 'number', 
        required: true,
        defaultValue: 11111,
        description: '富途OpenAPI端口号'
      },
      { 
        key: 'account', 
        label: '交易账户', 
        type: 'text', 
        required: true,
        placeholder: 'DU1234567',
        description: '交易账户号码'
      }
    ]
  },
  
  tiger: {
    name: 'tiger',
    displayName: '老虎证券',
    logo: '🐅',
    description: '老虎证券是知名的全球证券交易平台',
    markets: ['US', 'HK', 'CN', 'SG'],
    features: {
      autoTrading: true,
      paperTrading: true,
      realTimeData: true,
      optionsTrading: true,
      cryptoTrading: true,
      marginTrading: true,
      fractionalShares: true
    },
    configFields: [
      { 
        key: 'apiKey', 
        label: 'API Key', 
        type: 'password', 
        required: true,
        placeholder: 'tiger_api_...',
        description: '老虎证券API Key'
      },
      { 
        key: 'apiSecret', 
        label: 'API Secret', 
        type: 'password', 
        required: true,
        placeholder: 'tiger_secret_...',
        description: '老虎证券API Secret'
      },
      { 
        key: 'host', 
        label: '主机地址', 
        type: 'text', 
        required: true,
        defaultValue: 'openapi.tigerbrokers.com',
        description: '老虎证券API服务器地址'
      },
      { 
        key: 'account', 
        label: '交易账户', 
        type: 'text', 
        required: true,
        placeholder: 'TG123456789',
        description: '老虎证券账户号'
      }
    ]
  },
  
  ib: {
    name: 'ib',
    displayName: 'Interactive Brokers',
    logo: '📊',
    description: 'Interactive Brokers是全球领先的电子交易平台',
    markets: ['US', 'HK', 'EU', 'JP', 'SG'],
    features: {
      autoTrading: true,
      paperTrading: true,
      realTimeData: true,
      optionsTrading: true,
      cryptoTrading: false,
      marginTrading: true,
      fractionalShares: false
    },
    configFields: [
      { 
        key: 'host', 
        label: '主机地址', 
        type: 'text', 
        required: true,
        defaultValue: '127.0.0.1',
        description: 'TWS或IB Gateway的IP地址'
      },
      { 
        key: 'port', 
        label: '端口', 
        type: 'number', 
        required: true,
        defaultValue: 7497,
        description: 'TWS端口(7497)或IB Gateway端口(4001)'
      },
      { 
        key: 'account', 
        label: '交易账户', 
        type: 'text', 
        required: true,
        placeholder: 'DU123456',
        description: 'IB账户号码'
      }
    ]
  }
}

// 获取券商模板
export function getBrokerTemplate(brokerType: string) {
  return BROKER_TEMPLATES[brokerType as keyof typeof BROKER_TEMPLATES]
}

// 获取所有支持的券商
export function getSupportedBrokers() {
  return Object.values(BROKER_TEMPLATES)
}

// 验证券商配置
export function validateBrokerConfig(brokerType: string, config: Record<string, any>): { valid: boolean; errors: string[] } {
  const template = getBrokerTemplate(brokerType)
  if (!template) {
    return { valid: false, errors: ['不支持的券商类型'] }
  }

  const errors: string[] = []
  
  for (const field of template.configFields) {
    if (field.required && (!config[field.key] || config[field.key].toString().trim() === '')) {
      errors.push(`${field.label}不能为空`)
    }
    
    if (field.type === 'number' && config[field.key] && isNaN(Number(config[field.key]))) {
      errors.push(`${field.label}必须是数字`)
    }
  }

  return { valid: errors.length === 0, errors }
}

// 创建券商实例的工厂函数
export function createBrokerInstance(brokerType: string, config: Record<string, any>, mode: 'paper' | 'live' = 'paper') {
  try {
    return BrokerFactory.create(brokerType, config, mode)
  } catch (error) {
    console.error(`创建券商实例失败:`, error)
    throw error
  }
}

// 券商状态管理器
export class BrokerManager {
  private instances: Map<string, any> = new Map()
  private configs: Map<string, any> = new Map()

  // 添加券商配置
  addBrokerConfig(id: string, brokerType: string, config: Record<string, any>, mode: 'paper' | 'live' = 'paper') {
    // 验证配置
    const validation = validateBrokerConfig(brokerType, config)
    if (!validation.valid) {
      throw new Error(`配置验证失败: ${validation.errors.join(', ')}`)
    }

    // 创建实例
    const instance = createBrokerInstance(brokerType, config, mode)
    
    this.instances.set(id, instance)
    this.configs.set(id, { brokerType, config, mode })
    
    return instance
  }

  // 获取券商实例
  getBrokerInstance(id: string) {
    return this.instances.get(id)
  }

  // 获取券商配置
  getBrokerConfig(id: string) {
    return this.configs.get(id)
  }

  // 移除券商
  removeBroker(id: string) {
    const instance = this.instances.get(id)
    if (instance && typeof instance.disconnect === 'function') {
      instance.disconnect().catch(console.error)
    }
    
    this.instances.delete(id)
    this.configs.delete(id)
  }

  // 获取所有券商ID
  getAllBrokerIds() {
    return Array.from(this.instances.keys())
  }

  // 连接所有券商
  async connectAll() {
    const results = []
    for (const [id, instance] of this.instances) {
      try {
        if (typeof instance.connect === 'function') {
          await instance.connect()
          results.push({ id, success: true })
        }
      } catch (error) {
        results.push({ id, success: false, error: error instanceof Error ? error.message : '未知错误' })
      }
    }
    return results
  }

  // 断开所有券商
  async disconnectAll() {
    const results = []
    for (const [id, instance] of this.instances) {
      try {
        if (typeof instance.disconnect === 'function') {
          await instance.disconnect()
          results.push({ id, success: true })
        }
      } catch (error) {
        results.push({ id, success: false, error: error instanceof Error ? error.message : '未知错误' })
      }
    }
    return results
  }

  // 切换交易模式
  switchTradingMode(id: string, mode: 'paper' | 'live') {
    const instance = this.instances.get(id)
    const config = this.configs.get(id)
    
    if (instance && config && typeof instance.setMode === 'function') {
      instance.setMode(mode)
      config.mode = mode
      return true
    }
    
    return false
  }

  // 获取所有券商状态
  getAllBrokerStatus() {
    const status = []
    for (const [id, instance] of this.instances) {
      const config = this.configs.get(id)
      status.push({
        id,
        brokerType: config?.brokerType,
        mode: config?.mode,
        connected: typeof instance.isConnected === 'function' ? instance.isConnected() : false,
        status: typeof instance.getStatus === 'function' ? instance.getStatus() : 'unknown',
        lastError: typeof instance.getLastError === 'function' ? instance.getLastError() : undefined
      })
    }
    return status
  }
}

// 全局券商管理器实例
export const globalBrokerManager = new BrokerManager()