// 【知行交易】交易API服务

import { BaseApiClient } from './baseApi';
import { 
  TradingPlan, 
  TradeRecord, 
  TradingStats,
  ExecutionRecord
} from '../../types/trading';
import { LiveJournal, DisciplineStatus } from '../../types';
import { ApiResponse, BatchOperationResult } from '../../types/api';

/**
 * 交易API服务类
 */
export class TradingApiService extends BaseApiClient {
  
  // ==================== 交易计划管理 ====================
  
  /**
   * 获取所有交易计划
   */
  async getAllTradingPlans(): Promise<ApiResponse<TradingPlan[]>> {
    return this.get<TradingPlan[]>('/api/trading/plans');
  }
  
  /**
   * 根据ID获取交易计划
   */
  async getTradingPlanById(id: string): Promise<ApiResponse<TradingPlan>> {
    return this.get<TradingPlan>(`/api/trading/plans/${id}`);
  }
  
  /**
   * 创建交易计划
   */
  async createTradingPlan(plan: Partial<TradingPlan>): Promise<ApiResponse<TradingPlan>> {
    return this.post<TradingPlan>('/api/trading/plans', plan);
  }
  
  /**
   * 更新交易计划
   */
  async updateTradingPlan(id: string, updates: Partial<TradingPlan>): Promise<ApiResponse<TradingPlan>> {
    return this.put<TradingPlan>(`/api/trading/plans/${id}`, updates);
  }
  
  /**
   * 删除交易计划
   */
  async deleteTradingPlan(id: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/api/trading/plans/${id}`);
  }
  
  /**
   * 激活交易计划
   */
  async activateTradingPlan(id: string): Promise<ApiResponse<TradingPlan>> {
    return this.put<TradingPlan>(`/api/trading/plans/${id}/activate`);
  }
  
  /**
   * 取消交易计划
   */
  async cancelTradingPlan(id: string, reason?: string): Promise<ApiResponse<TradingPlan>> {
    return this.put<TradingPlan>(`/api/trading/plans/${id}/cancel`, { reason });
  }
  
  /**
   * 根据股票代码获取交易计划
   */
  async getTradingPlansBySymbol(symbol: string): Promise<ApiResponse<TradingPlan[]>> {
    return this.get<TradingPlan[]>(`/api/trading/plans/symbol/${symbol}`);
  }
  
  // ==================== 交易记录管理 ====================
  
  /**
   * 获取所有交易记录
   */
  async getAllTradeRecords(): Promise<ApiResponse<TradeRecord[]>> {
    return this.get<TradeRecord[]>('/api/trading/records');
  }
  
  /**
   * 根据ID获取交易记录
   */
  async getTradeRecordById(id: string): Promise<ApiResponse<TradeRecord>> {
    return this.get<TradeRecord>(`/api/trading/records/${id}`);
  }
  
  /**
   * 根据计划ID获取交易记录
   */
  async getTradeRecordsByPlanId(planId: string): Promise<ApiResponse<TradeRecord[]>> {
    return this.get<TradeRecord[]>(`/api/trading/records/plan/${planId}`);
  }
  
  /**
   * 创建交易记录
   */
  async createTradeRecord(record: Partial<TradeRecord>): Promise<ApiResponse<TradeRecord>> {
    return this.post<TradeRecord>('/api/trading/records', record);
  }
  
  /**
   * 更新交易记录
   */
  async updateTradeRecord(id: string, updates: Partial<TradeRecord>): Promise<ApiResponse<TradeRecord>> {
    return this.put<TradeRecord>(`/api/trading/records/${id}`, updates);
  }
  
  /**
   * 删除交易记录
   */
  async deleteTradeRecord(id: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/api/trading/records/${id}`);
  }
  
  // ==================== 执行记录管理 ====================
  
  /**
   * 添加执行记录
   */
  async addExecutionRecord(
    tradeId: string, 
    execution: Partial<ExecutionRecord>
  ): Promise<ApiResponse<ExecutionRecord>> {
    return this.post<ExecutionRecord>(`/api/trading/records/${tradeId}/executions`, execution);
  }
  
  /**
   * 更新执行记录
   */
  async updateExecutionRecord(
    tradeId: string, 
    executionId: string, 
    updates: Partial<ExecutionRecord>
  ): Promise<ApiResponse<ExecutionRecord>> {
    return this.put<ExecutionRecord>(
      `/api/trading/records/${tradeId}/executions/${executionId}`, 
      updates
    );
  }
  
  /**
   * 删除执行记录
   */
  async deleteExecutionRecord(
    tradeId: string, 
    executionId: string
  ): Promise<ApiResponse<void>> {
    return this.delete<void>(`/api/trading/records/${tradeId}/executions/${executionId}`);
  }
  
  // ==================== 纪律管理 ====================
  
  /**
   * 获取纪律状态
   */
  async getDisciplineStatus(planId: string): Promise<ApiResponse<DisciplineStatus>> {
    return this.get<DisciplineStatus>(`/api/trading/plans/${planId}/discipline`);
  }
  
  /**
   * 更新纪律状态
   */
  async updateDisciplineStatus(
    planId: string, 
    status: Partial<DisciplineStatus>
  ): Promise<ApiResponse<DisciplineStatus>> {
    return this.put<DisciplineStatus>(`/api/trading/plans/${planId}/discipline`, status);
  }
  
  /**
   * 记录纪律违规
   */
  async recordDisciplineViolation(
    planId: string, 
    violation: any
  ): Promise<ApiResponse<DisciplineStatus>> {
    return this.post<DisciplineStatus>(
      `/api/trading/plans/${planId}/discipline/violations`, 
      violation
    );
  }
  
  // ==================== 实时交易日志 ====================
  
  /**
   * 获取交易日志
   */
  async getLiveJournals(tradeId: string): Promise<ApiResponse<LiveJournal[]>> {
    return this.get<LiveJournal[]>(`/api/trading/records/${tradeId}/journals`);
  }
  
  /**
   * 添加交易日志
   */
  async addLiveJournal(
    tradeId: string, 
    journal: Partial<LiveJournal>
  ): Promise<ApiResponse<LiveJournal>> {
    return this.post<LiveJournal>(`/api/trading/records/${tradeId}/journals`, journal);
  }
  
  /**
   * 更新交易日志
   */
  async updateLiveJournal(
    tradeId: string, 
    journalId: string, 
    updates: Partial<LiveJournal>
  ): Promise<ApiResponse<LiveJournal>> {
    return this.put<LiveJournal>(
      `/api/trading/records/${tradeId}/journals/${journalId}`, 
      updates
    );
  }
  
  /**
   * 删除交易日志
   */
  async deleteLiveJournal(
    tradeId: string, 
    journalId: string
  ): Promise<ApiResponse<void>> {
    return this.delete<void>(`/api/trading/records/${tradeId}/journals/${journalId}`);
  }
  
  // ==================== 交易统计 ====================
  
  /**
   * 获取交易统计
   */
  async getTradingStats(
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<TradingStats>> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    return this.get<TradingStats>('/api/trading/stats', params);
  }
  
  /**
   * 获取月度统计
   */
  async getMonthlyStats(year: number, month: number): Promise<ApiResponse<TradingStats>> {
    return this.get<TradingStats>(`/api/trading/stats/monthly/${year}/${month}`);
  }
  
  /**
   * 获取年度统计
   */
  async getYearlyStats(year: number): Promise<ApiResponse<TradingStats>> {
    return this.get<TradingStats>(`/api/trading/stats/yearly/${year}`);
  }
  
  /**
   * 获取个股交易统计
   */
  async getStockTradingStats(symbol: string): Promise<ApiResponse<any>> {
    return this.get<any>(`/api/trading/stats/stock/${symbol}`);
  }
  
  // ==================== 风险管理 ====================
  
  /**
   * 获取当前风险敞口
   */
  async getCurrentRiskExposure(): Promise<ApiResponse<any>> {
    return this.get<any>('/api/trading/risk/exposure');
  }
  
  /**
   * 获取仓位分析
   */
  async getPositionAnalysis(): Promise<ApiResponse<any>> {
    return this.get<any>('/api/trading/risk/positions');
  }
  
  /**
   * 风险检查
   */
  async performRiskCheck(planId: string): Promise<ApiResponse<any>> {
    return this.post<any>(`/api/trading/risk/check/${planId}`);
  }
  
  // ==================== 批量操作 ====================
  
  /**
   * 批量创建交易计划
   */
  async createTradingPlansBatch(
    plans: Partial<TradingPlan>[]
  ): Promise<ApiResponse<BatchOperationResult<TradingPlan>>> {
    return this.post<BatchOperationResult<TradingPlan>>('/api/trading/plans/batch', { plans });
  }
  
  /**
   * 批量更新交易状态
   */
  async updateTradeStatusBatch(
    updates: { id: string; status: any }[]
  ): Promise<ApiResponse<BatchOperationResult<TradeRecord>>> {
    return this.put<BatchOperationResult<TradeRecord>>('/api/trading/records/batch/status', { updates });
  }
}

// 创建交易API服务实例
export const tradingApi = new TradingApiService();