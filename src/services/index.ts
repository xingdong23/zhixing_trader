// 【知行交易】服务层统一导出
// 提供所有业务服务的统一访问入口

// ==================== 核心服务 ====================
export * from './core/base.service';

// ==================== 业务服务 ====================
// 股票服务
export * from './stock/stock.service';
export { stockService } from './stock/stock.service';

// 交易服务
export * from './trading/trading.service';
export { tradingService } from './trading/trading.service';

// 分析服务
export * from './analysis/analysis.service';
export { analysisService } from './analysis/analysis.service';

// 应用服务
export * from './app/app.service';
export { appService } from './app/app.service';

// ==================== 服务集合 ====================

import { stockService } from './stock/stock.service';
import { tradingService } from './trading/trading.service';
import { analysisService } from './analysis/analysis.service';
import { appService } from './app/app.service';

/** 所有业务服务的集合 */
export const services = {
  stock: stockService,
  trading: tradingService,
  analysis: analysisService,
  app: appService,
} as const;

/** 服务类型 */
export type Services = typeof services;

/** 服务名称 */
export type ServiceName = keyof Services;

// ==================== 服务工厂 ====================

/** 服务工厂类 */
export class ServiceFactory {
  private static instance: ServiceFactory;
  private serviceInstances: Map<string, any> = new Map();

  private constructor() {}

  /** 获取服务工厂单例 */
  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }

  /** 获取服务实例 */
  getService<T extends ServiceName>(name: T): Services[T] {
    if (!this.serviceInstances.has(name)) {
      this.serviceInstances.set(name, services[name]);
    }
    return this.serviceInstances.get(name);
  }

  /** 注册自定义服务 */
  registerService<T>(name: string, service: T): void {
    this.serviceInstances.set(name, service);
  }

  /** 清理服务缓存 */
  clearCache(): void {
    this.serviceInstances.clear();
  }

  /** 获取所有已注册的服务名称 */
  getRegisteredServices(): string[] {
    return Array.from(this.serviceInstances.keys());
  }
}

// ==================== 服务工具函数 ====================

/** 获取服务实例的便捷函数 */
export function getService<T extends ServiceName>(name: T): Services[T] {
  return ServiceFactory.getInstance().getService(name);
}

/** 批量获取服务实例 */
export function getServices<T extends ServiceName[]>(
  ...names: T
): { [K in T[number]]: Services[K] } {
  const factory = ServiceFactory.getInstance();
  const result = {} as any;
  
  for (const name of names) {
    result[name] = factory.getService(name);
  }
  
  return result;
}

/** 检查服务是否可用 */
export async function checkServiceHealth(serviceName: ServiceName): Promise<boolean> {
  try {
    const service = getService(serviceName);
    // 这里可以添加具体的健康检查逻辑
    // 例如调用服务的健康检查方法
    return true;
  } catch (error) {
    console.error(`Service ${serviceName} health check failed:`, error);
    return false;
  }
}

/** 批量检查服务健康状态 */
export async function checkAllServicesHealth(): Promise<Record<ServiceName, boolean>> {
  const serviceNames = Object.keys(services) as ServiceName[];
  const results = {} as Record<ServiceName, boolean>;
  
  await Promise.all(
    serviceNames.map(async (name) => {
      results[name] = await checkServiceHealth(name);
    })
  );
  
  return results;
}

// ==================== 服务配置 ====================

/** 服务配置接口 */
export interface ServiceConfig {
  baseURL?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  enableCache?: boolean;
  cacheTimeout?: number;
  enableLogging?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/** 默认服务配置 */
export const defaultServiceConfig: ServiceConfig = {
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:3001/api/v1',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  enableCache: true,
  cacheTimeout: 300000, // 5分钟
  enableLogging: process.env.NODE_ENV === 'development',
  logLevel: 'info',
};

/** 全局服务配置管理器 */
export class ServiceConfigManager {
  private static config: ServiceConfig = { ...defaultServiceConfig };

  /** 获取当前配置 */
  static getConfig(): ServiceConfig {
    return { ...this.config };
  }

  /** 更新配置 */
  static updateConfig(updates: Partial<ServiceConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /** 重置为默认配置 */
  static resetConfig(): void {
    this.config = { ...defaultServiceConfig };
  }

  /** 获取特定配置项 */
  static get<K extends keyof ServiceConfig>(key: K): ServiceConfig[K] {
    return this.config[key];
  }

  /** 设置特定配置项 */
  static set<K extends keyof ServiceConfig>(key: K, value: ServiceConfig[K]): void {
    this.config[key] = value;
  }
}

// ==================== 服务初始化 ====================

/** 服务初始化选项 */
export interface ServiceInitOptions {
  config?: Partial<ServiceConfig>;
  enableHealthCheck?: boolean;
  healthCheckInterval?: number;
}

/** 初始化所有服务 */
export async function initializeAllServices(options: ServiceInitOptions = {}): Promise<void> {
  try {
    // 更新配置
    if (options.config) {
      ServiceConfigManager.updateConfig(options.config);
    }

    // 执行健康检查
    if (options.enableHealthCheck) {
      const healthResults = await checkAllServicesHealth();
      const unhealthyServices = Object.entries(healthResults)
        .filter(([, isHealthy]) => !isHealthy)
        .map(([name]) => name);

      if (unhealthyServices.length > 0) {
        console.warn('以下服务健康检查失败:', unhealthyServices);
      }

      // 设置定期健康检查
      if (options.healthCheckInterval && options.healthCheckInterval > 0) {
        setInterval(async () => {
          await checkAllServicesHealth();
        }, options.healthCheckInterval);
      }
    }

    console.log('服务层初始化完成');
  } catch (error) {
    console.error('服务层初始化失败:', error);
    throw error;
  }
}

// ==================== 类型导出 ====================

export type {
  // 基础服务类型
  ServiceError,
  ServiceErrorType,
  ServiceConfig as BaseServiceConfig,
  HttpMethod,
  PaginatedService,
  CrudService,
} from './core/base.service';

export type {
  // 股票服务类型
  StockQueryParams,
  CreateStockData,
  UpdateStockData,
  StockPriceUpdate,
} from './stock/stock.service';

export type {
  // 交易服务类型
  TradingPlanQueryParams,
  TradingRecordQueryParams,
  TradingStrategyQueryParams,
  CreateTradingPlanData,
  UpdateTradingPlanData,
  CreateTradingRecordData,
  UpdateTradingRecordData,
  CreateTradingStrategyData,
  UpdateTradingStrategyData,
  ExecuteTradeParams,
  RiskCheckResult,
} from './trading/trading.service';

export type {
  // 分析服务类型
  StrategyQueryParams,
  DailySelectionQueryParams,
  RecommendationQueryParams,
  InsightQueryParams,
  CreateStrategyData,
  UpdateStrategyData,
  CreateRecommendationData,
  UpdateRecommendationData,
  ExecuteSelectionParams,
  SelectionResult,
} from './analysis/analysis.service';

export type {
  // 应用服务类型
  NotificationQueryParams,
  CreateNotificationData,
  AppStatsQueryParams,
  UserActivity,
  HealthCheckResult,
} from './app/app.service';

// ==================== 版本信息 ====================

/** 服务层版本信息 */
export const SERVICE_LAYER_VERSION = '2.0.0';

/** 服务层重构信息 */
export const SERVICE_LAYER_INFO = {
  version: SERVICE_LAYER_VERSION,
  refactoredAt: '2024-12-19',
  features: [
    '模块化服务架构',
    '统一的基础服务类',
    '完整的错误处理',
    '内置缓存机制',
    'HTTP客户端封装',
    '服务健康检查',
    '配置管理',
    '类型安全',
  ],
  services: {
    stock: '股票数据管理服务',
    trading: '交易计划和记录服务',
    analysis: '选股策略和分析服务',
    app: '应用状态和设置服务',
  },
} as const;

// ==================== 服务管理器（向后兼容） ====================

/** 服务管理器 - 向后兼容的服务管理接口 */
export class ServiceManager {
  private static instance: ServiceManager;
  private initialized = false;

  private constructor() {}

  static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  /**
   * 初始化所有服务
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('服务已经初始化过了');
      return;
    }

    try {
      console.log('正在初始化服务层...');
      
      // 使用新的服务初始化方法
      await initializeAllServices({
        enableHealthCheck: true,
        healthCheckInterval: 60000, // 1分钟检查一次
      });
      
      this.initialized = true;
      console.log('服务层初始化完成');
    } catch (error) {
      console.error('服务层初始化失败:', error);
      throw error;
    }
  }

  /**
   * 清理所有服务资源
   */
  async cleanup(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      console.log('正在清理服务层资源...');
      
      // 清理服务工厂缓存
      ServiceFactory.getInstance().clearCache();
      
      this.initialized = false;
      console.log('服务层资源清理完成');
    } catch (error) {
      console.error('服务层资源清理失败:', error);
    }
  }

  /**
   * 检查服务健康状态
   */
  async checkHealth(): Promise<{
    stock: boolean;
    trading: boolean;
    analysis: boolean;
    app: boolean;
    overall: boolean;
  }> {
    try {
      const healthResults = await checkAllServicesHealth();
      
      const health = {
        stock: healthResults.stock || false,
        trading: healthResults.trading || false,
        analysis: healthResults.analysis || false,
        app: healthResults.app || false,
        overall: false
      };
      
      health.overall = health.stock && health.trading && health.analysis && health.app;
      
      return health;
    } catch (error) {
      console.error('服务健康检查失败:', error);
      return {
        stock: false,
        trading: false,
        analysis: false,
        app: false,
        overall: false
      };
    }
  }

  /**
   * 重启所有服务
   */
  async restart(): Promise<void> {
    console.log('正在重启服务层...');
    await this.cleanup();
    await this.initialize();
    console.log('服务层重启完成');
  }

  /**
   * 获取初始化状态
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// ==================== 便捷导出 ====================

// 创建服务管理器实例（向后兼容）
export const serviceManager = ServiceManager.getInstance();

// 便捷的初始化函数
export const initializeServices = () => serviceManager.initialize();
export const cleanupServices = () => serviceManager.cleanup();
export const checkServicesHealth = () => serviceManager.checkHealth();

// ==================== 默认导出 ====================

// 默认导出新的服务集合
export default services;