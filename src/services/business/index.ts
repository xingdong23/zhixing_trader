// 【知行交易】业务服务统一导出

// 各业务模块服务
export { StockBusinessService, stockService } from './stockService';
export { StrategyBusinessService, strategyService } from './strategyService';
export { TradingBusinessService, tradingService } from './tradingService';

// 导入业务服务实例
import { stockService } from './stockService';
import { strategyService } from './strategyService';
import { tradingService } from './tradingService';

// 统一业务服务类
export class BusinessService {
  public stock = stockService;
  public strategy = strategyService;
  public trading = tradingService;

  /**
   * 初始化所有业务服务
   */
  async initialize(): Promise<void> {
    try {
      console.log('正在初始化业务服务...');
      
      // 这里可以添加业务服务的初始化逻辑
      // 例如：预加载缓存数据、建立连接等
      
      console.log('业务服务初始化完成');
    } catch (error) {
      console.error('业务服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 清理所有业务服务资源
   */
  async cleanup(): Promise<void> {
    try {
      console.log('正在清理业务服务资源...');
      
      // 这里可以添加资源清理逻辑
      // 例如：清除缓存、关闭连接等
      
      console.log('业务服务资源清理完成');
    } catch (error) {
      console.error('业务服务资源清理失败:', error);
    }
  }

  /**
   * 获取所有业务服务的健康状态
   */
  async getHealthStatus(): Promise<{
    stock: boolean;
    strategy: boolean;
    trading: boolean;
    overall: boolean;
  }> {
    try {
      // 简化的健康检查，实际应该检查各服务的具体状态
      const status = {
        stock: true,
        strategy: true,
        trading: true,
        overall: true
      };
      
      status.overall = status.stock && status.strategy && status.trading;
      
      return status;
    } catch (error) {
      console.error('获取业务服务健康状态失败:', error);
      return {
        stock: false,
        strategy: false,
        trading: false,
        overall: false
      };
    }
  }
}

// 创建统一业务服务实例
export const businessService = new BusinessService();

// 向后兼容的导出
export default businessService;