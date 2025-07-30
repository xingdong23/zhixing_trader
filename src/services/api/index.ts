// 【知行交易】API服务统一导出

// 基础API客户端
export { BaseApiClient, apiClient } from './baseApi';

// 各业务模块API服务
export { StockApiService, stockApi } from './stockApi';
export { StrategyApiService, strategyApi } from './strategyApi';
export { TradingApiService, tradingApi } from './tradingApi';
export { SystemApiService, systemApi } from './systemApi';

// 导入API实例
import { stockApi } from './stockApi';
import { strategyApi } from './strategyApi';
import { tradingApi } from './tradingApi';
import { systemApi } from './systemApi';

// 统一API服务类
export class ApiService {
  public stock = stockApi;
  public strategy = strategyApi;
  public trading = tradingApi;
  public system = systemApi;

  /**
   * 设置所有API服务的认证token
   */
  setAuthToken(token: string): void {
    this.stock.setDefaultHeader('Authorization', `Bearer ${token}`);
    this.strategy.setDefaultHeader('Authorization', `Bearer ${token}`);
    this.trading.setDefaultHeader('Authorization', `Bearer ${token}`);
    this.system.setDefaultHeader('Authorization', `Bearer ${token}`);
  }

  /**
   * 移除所有API服务的认证token
   */
  removeAuthToken(): void {
    this.stock.removeDefaultHeader('Authorization');
    this.strategy.removeDefaultHeader('Authorization');
    this.trading.removeDefaultHeader('Authorization');
    this.system.removeDefaultHeader('Authorization');
  }

  /**
   * 设置所有API服务的基础URL
   */
  setBaseURL(baseURL: string): void {
    // 注意：这里需要重新创建实例，因为BaseApiClient的baseURL是在构造函数中设置的
    console.warn('setBaseURL: 需要重新创建API服务实例以更改基础URL');
  }
}

// 创建统一API服务实例
export const api = new ApiService();

// 向后兼容的导出
export default api;