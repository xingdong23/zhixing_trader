// 【知行交易】策略API服务

import { BaseApiClient } from './baseApi';
import { 
  SelectionStrategy, 
  SelectedStock, 
  DailySelection,
  TradingPlaybook,
  TradingRecommendation
} from '../../types/strategy';
import { ApiResponse, BatchOperationResult } from '../../types/api';

/**
 * 策略API服务类
 */
export class StrategyApiService extends BaseApiClient {
  
  // ==================== 选股策略管理 ====================
  
  /**
   * 获取所有选股策略
   */
  async getAllStrategies(): Promise<ApiResponse<SelectionStrategy[]>> {
    return this.get<SelectionStrategy[]>('/api/strategies');
  }
  
  /**
   * 根据ID获取策略详情
   */
  async getStrategyById(id: string): Promise<ApiResponse<SelectionStrategy>> {
    return this.get<SelectionStrategy>(`/api/strategies/${id}`);
  }
  
  /**
   * 创建新策略
   */
  async createStrategy(strategy: Partial<SelectionStrategy>): Promise<ApiResponse<SelectionStrategy>> {
    return this.post<SelectionStrategy>('/api/strategies', strategy);
  }
  
  /**
   * 更新策略
   */
  async updateStrategy(id: string, updates: Partial<SelectionStrategy>): Promise<ApiResponse<SelectionStrategy>> {
    return this.put<SelectionStrategy>(`/api/strategies/${id}`, updates);
  }
  
  /**
   * 删除策略
   */
  async deleteStrategy(id: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/api/strategies/${id}`);
  }
  
  /**
   * 启用/禁用策略
   */
  async toggleStrategy(id: string, isActive: boolean): Promise<ApiResponse<SelectionStrategy>> {
    return this.put<SelectionStrategy>(`/api/strategies/${id}/toggle`, { isActive });
  }
  
  /**
   * 复制策略
   */
  async cloneStrategy(id: string, newName: string): Promise<ApiResponse<SelectionStrategy>> {
    return this.post<SelectionStrategy>(`/api/strategies/${id}/clone`, { name: newName });
  }
  
  // ==================== 策略执行 ====================
  
  /**
   * 运行单个策略
   */
  async runStrategy(id: string): Promise<ApiResponse<SelectedStock[]>> {
    return this.post<SelectedStock[]>(`/api/strategies/${id}/execute`);
  }
  
  /**
   * 运行所有启用的策略
   */
  async runAllActiveStrategies(): Promise<ApiResponse<DailySelection>> {
    return this.post<DailySelection>('/api/strategies/run-all');
  }
  
  /**
   * 获取策略运行历史
   */
  async getStrategyHistory(
    id: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<ApiResponse<DailySelection[]>> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    return this.get<DailySelection[]>(`/api/strategies/${id}/history`, params);
  }
  
  /**
   * 获取策略表现统计
   */
  async getStrategyPerformance(id: string): Promise<ApiResponse<any>> {
    return this.get<any>(`/api/strategies/${id}/performance`);
  }
  
  // ==================== 每日选股结果 ====================
  
  /**
   * 获取今日选股结果
   */
  async getTodaySelection(): Promise<ApiResponse<DailySelection>> {
    return this.get<DailySelection>('/api/selections/today');
  }
  
  /**
   * 获取指定日期的选股结果
   */
  async getSelectionByDate(date: string): Promise<ApiResponse<DailySelection>> {
    return this.get<DailySelection>(`/api/selections/${date}`);
  }
  
  /**
   * 获取选股历史
   */
  async getSelectionHistory(
    startDate?: string, 
    endDate?: string,
    limit = 30
  ): Promise<ApiResponse<DailySelection[]>> {
    const params: any = { limit };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    return this.get<DailySelection[]>('/api/selections/history', params);
  }
  
  /**
   * 删除选股结果
   */
  async deleteSelection(id: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/api/selections/${id}`);
  }
  
  // ==================== 交易剧本管理 ====================
  
  /**
   * 获取所有交易剧本
   */
  async getAllPlaybooks(): Promise<ApiResponse<TradingPlaybook[]>> {
    return this.get<TradingPlaybook[]>('/api/playbooks');
  }
  
  /**
   * 根据ID获取剧本详情
   */
  async getPlaybookById(id: string): Promise<ApiResponse<TradingPlaybook>> {
    return this.get<TradingPlaybook>(`/api/playbooks/${id}`);
  }
  
  /**
   * 创建新剧本
   */
  async createPlaybook(playbook: Partial<TradingPlaybook>): Promise<ApiResponse<TradingPlaybook>> {
    return this.post<TradingPlaybook>('/api/playbooks', playbook);
  }
  
  /**
   * 更新剧本
   */
  async updatePlaybook(id: string, updates: Partial<TradingPlaybook>): Promise<ApiResponse<TradingPlaybook>> {
    return this.put<TradingPlaybook>(`/api/playbooks/${id}`, updates);
  }
  
  /**
   * 删除剧本
   */
  async deletePlaybook(id: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/api/playbooks/${id}`);
  }
  
  /**
   * 获取剧本表现统计
   */
  async getPlaybookPerformance(id: string): Promise<ApiResponse<any>> {
    return this.get<any>(`/api/playbooks/${id}/performance`);
  }
  
  // ==================== 交易推荐 ====================
  
  /**
   * 获取今日推荐
   */
  async getTodayRecommendations(): Promise<ApiResponse<TradingRecommendation[]>> {
    return this.get<TradingRecommendation[]>('/api/recommendations/today');
  }
  
  /**
   * 获取周推荐
   */
  async getWeeklyRecommendations(): Promise<ApiResponse<TradingRecommendation[]>> {
    return this.get<TradingRecommendation[]>('/api/recommendations/weekly');
  }
  
  /**
   * 根据ID获取推荐详情
   */
  async getRecommendationById(id: string): Promise<ApiResponse<TradingRecommendation>> {
    return this.get<TradingRecommendation>(`/api/recommendations/${id}`);
  }
  
  /**
   * 创建新推荐
   */
  async createRecommendation(
    recommendation: Partial<TradingRecommendation>
  ): Promise<ApiResponse<TradingRecommendation>> {
    return this.post<TradingRecommendation>('/api/recommendations', recommendation);
  }
  
  /**
   * 更新推荐状态
   */
  async updateRecommendationStatus(
    id: string, 
    status: TradingRecommendation['status']
  ): Promise<ApiResponse<TradingRecommendation>> {
    return this.put<TradingRecommendation>(`/api/recommendations/${id}/status`, { status });
  }
  
  /**
   * 获取推荐历史
   */
  async getRecommendationHistory(
    startDate?: string,
    endDate?: string,
    type?: 'daily' | 'weekly'
  ): Promise<ApiResponse<TradingRecommendation[]>> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (type) params.type = type;
    
    return this.get<TradingRecommendation[]>('/api/recommendations/history', params);
  }
  
  /**
   * 获取推荐表现统计
   */
  async getRecommendationPerformance(): Promise<ApiResponse<any>> {
    return this.get<any>('/api/recommendations/performance');
  }
  
  // ==================== 策略回测 ====================
  
  /**
   * 运行策略回测
   */
  async runBacktest(
    strategyId: string,
    startDate: string,
    endDate: string,
    initialCapital = 100000
  ): Promise<ApiResponse<any>> {
    return this.post<any>(`/api/strategies/${strategyId}/backtest`, {
      startDate,
      endDate,
      initialCapital
    });
  }
  
  /**
   * 获取回测结果
   */
  async getBacktestResult(backtestId: string): Promise<ApiResponse<any>> {
    return this.get<any>(`/api/backtests/${backtestId}`);
  }
  
  /**
   * 获取策略的所有回测历史
   */
  async getStrategyBacktests(strategyId: string): Promise<ApiResponse<any[]>> {
    return this.get<any[]>(`/api/strategies/${strategyId}/backtests`);
  }
}

// 创建策略API服务实例
export const strategyApi = new StrategyApiService();