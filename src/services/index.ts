// 【知行交易】服务层统一导出

// API服务层
export * from './api';
export { api as apiService } from './api';

// 业务服务层
export * from './business';
export { businessService } from './business';

// 服务层管理器
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
      
      // 初始化业务服务
      const { businessService } = await import('./business');
      await businessService.initialize();
      
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
      
      // 清理业务服务
      const { businessService } = await import('./business');
      await businessService.cleanup();
      
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
    api: boolean;
    business: boolean;
    overall: boolean;
  }> {
    try {
      const { businessService } = await import('./business');
      const businessHealth = await businessService.getHealthStatus();
      
      const health = {
        api: true, // 简化的API健康检查
        business: businessHealth.overall,
        overall: true
      };
      
      health.overall = health.api && health.business;
      
      return health;
    } catch (error) {
      console.error('服务健康检查失败:', error);
      return {
        api: false,
        business: false,
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

// 创建服务管理器实例
export const serviceManager = ServiceManager.getInstance();

// 便捷的初始化函数
export const initializeServices = () => serviceManager.initialize();
export const cleanupServices = () => serviceManager.cleanup();
export const checkServicesHealth = () => serviceManager.checkHealth();

// 向后兼容的导出
export default serviceManager;