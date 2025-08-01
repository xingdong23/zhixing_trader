// 【知行交易】交易服务
// 处理交易计划、记录、策略和风险管理

import { 
  TradingPlan, 
  TradingRecord, 
  TradingStrategy, 
  TradingStats, 
  RiskManagement,
  RealTimeLog,
  TradingScript,
  TradingType,
  StrategyType,
  TradeAction,
  TradeStatus,
  DisciplineRating,
  ApiResponse, 
  PaginatedResponse,
  PaginationParams,
  SortParams,
  FilterParams
} from '../../types';
import { BaseService, ServiceError, PaginatedService, CrudService } from '../core/base.service';

// ==================== 交易服务接口 ====================

/** 交易计划查询参数 */
export interface TradingPlanQueryParams extends FilterParams {
  symbol?: string;                    // 股票代码
  tradingType?: TradingType;          // 交易类型
  strategyType?: StrategyType;        // 策略类型
  status?: TradeStatus;             // 状态
  minTargetPrice?: number;            // 最小目标价格
  maxTargetPrice?: number;            // 最大目标价格
  dateFrom?: string;                  // 开始日期
  dateTo?: string;                    // 结束日期
  tags?: string[];                    // 标签
}

/** 交易记录查询参数 */
export interface TradingRecordQueryParams extends FilterParams {
  planId?: string;                    // 计划ID
  symbol?: string;                    // 股票代码
  action?: TradeAction;               // 交易动作
  tradingType?: TradingType;          // 交易类型
  dateFrom?: string;                  // 开始日期
  dateTo?: string;                    // 结束日期
  minAmount?: number;                 // 最小金额
  maxAmount?: number;                 // 最大金额
  profitOnly?: boolean;               // 仅盈利
  lossOnly?: boolean;                 // 仅亏损
}

/** 交易策略查询参数 */
export interface TradingStrategyQueryParams extends FilterParams {
  type?: StrategyType;                // 策略类型
  tradingType?: TradingType;          // 交易类型
  isActive?: boolean;                 // 是否激活
  tags?: string[];                    // 标签
}

/** 创建交易计划数据 */
export interface CreateTradingPlanData {
  symbol: string;
  tradingType: TradingType;
  strategyId?: string;
  targetPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  quantity: number;
  notes?: string;
  tags?: string[];
}

/** 更新交易计划数据 */
export interface UpdateTradingPlanData {
  targetPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  quantity?: number;
  status?: TradeStatus;
  notes?: string;
  tags?: string[];
}

/** 创建交易记录数据 */
export interface CreateTradingRecordData {
  planId?: string;
  symbol: string;
  action: TradeAction;
  price: number;
  quantity: number;
  amount: number;
  tradingType: TradingType;
  notes?: string;
  tags?: string[];
}

/** 更新交易记录数据 */
export interface UpdateTradingRecordData {
  price?: number;
  quantity?: number;
  amount?: number;
  notes?: string;
  tags?: string[];
}

/** 创建交易策略数据 */
export interface CreateTradingStrategyData {
  name: string;
  type: StrategyType;
  tradingType: TradingType;
  description: string;
  rules: string[];
  parameters?: Record<string, any>;
  tags?: string[];
}

/** 更新交易策略数据 */
export interface UpdateTradingStrategyData {
  name?: string;
  description?: string;
  rules?: string[];
  parameters?: Record<string, any>;
  isActive?: boolean;
  tags?: string[];
}

/** 交易执行参数 */
export interface ExecuteTradeParams {
  planId: string;
  action: TradeAction;
  price: number;
  quantity: number;
  notes?: string;
}

/** 风险检查结果 */
export interface RiskCheckResult {
  passed: boolean;
  warnings: string[];
  errors: string[];
  suggestions: string[];
}

// ==================== 交易服务实现 ====================

export class TradingService extends BaseService {

  constructor() {
    super('TradingService');
  }

  // ==================== 交易计划管理 ====================

  /** 获取交易计划列表 */
  async getPlans(
    pagination?: PaginationParams,
    sort?: SortParams,
    filters?: TradingPlanQueryParams
  ): Promise<PaginatedResponse<TradingPlan>> {
    try {
      this.logServiceCall('getPlans', '/trading/plans', { pagination, sort, filters });
      
      const queryParams = this.buildPaginationParams(pagination, sort, filters);
      const response = await this.http.get<TradingPlan[]>(`/trading/plans${queryParams}`);
      
      // 转换为分页格式
      const items = response.data || [];
      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 10;
      
      return {
        items,
        total: items.length,
        page,
        pageSize,
        totalPages: Math.ceil(items.length / pageSize)
      };
    } catch (error) {
      this.handleServiceError(error, '获取交易计划列表');
    }
  }

  /** 根据ID获取交易计划 */
  async getPlanById(id: string): Promise<ApiResponse<TradingPlan>> {
    try {
      this.validateId(id, '交易计划ID');
      this.logServiceCall('getPlanById', `/trading/plans/${id}`);
      
      return await this.http.get<TradingPlan>(`/trading/plans/${id}`);
    } catch (error) {
      this.handleServiceError(error, '获取交易计划详情');
    }
  }

  /** 创建交易计划 */
  async createPlan(data: CreateTradingPlanData): Promise<ApiResponse<TradingPlan>> {
    try {
      this.validateRequired(data, ['symbol', 'tradingType', 'targetPrice', 'quantity']);
      this.validateTradingPlanData(data);
      this.logServiceCall('createPlan', '/trading/plans', data);
      
      return await this.http.post<TradingPlan>('/trading/plans', data);
    } catch (error) {
      this.handleServiceError(error, '创建交易计划');
    }
  }

  /** 更新交易计划 */
  async updatePlan(id: string, data: UpdateTradingPlanData): Promise<ApiResponse<TradingPlan>> {
    try {
      this.validateId(id, '交易计划ID');
      this.logServiceCall('updatePlan', `/trading/plans/${id}`, data);
      
      return await this.http.put<TradingPlan>(`/trading/plans/${id}`, data);
    } catch (error) {
      this.handleServiceError(error, '更新交易计划');
    }
  }

  /** 删除交易计划 */
  async deletePlan(id: string): Promise<ApiResponse<void>> {
    try {
      this.validateId(id, '交易计划ID');
      this.logServiceCall('deletePlan', `/trading/plans/${id}`);
      
      return await this.http.delete<void>(`/trading/plans/${id}`);
    } catch (error) {
      this.handleServiceError(error, '删除交易计划');
    }
  }

  /** 激活交易计划 */
  async activatePlan(id: string): Promise<ApiResponse<TradingPlan>> {
    try {
      this.validateId(id, '交易计划ID');
      this.logServiceCall('activatePlan', `/trading/plans/${id}/activate`);
      
      return await this.http.post<TradingPlan>(`/trading/plans/${id}/activate`);
    } catch (error) {
      this.handleServiceError(error, '激活交易计划');
    }
  }

  /** 暂停交易计划 */
  async pausePlan(id: string): Promise<ApiResponse<TradingPlan>> {
    try {
      this.validateId(id, '交易计划ID');
      this.logServiceCall('pausePlan', `/trading/plans/${id}/pause`);
      
      return await this.http.post<TradingPlan>(`/trading/plans/${id}/pause`);
    } catch (error) {
      this.handleServiceError(error, '暂停交易计划');
    }
  }

  /** 完成交易计划 */
  async completePlan(id: string): Promise<ApiResponse<TradingPlan>> {
    try {
      this.validateId(id, '交易计划ID');
      this.logServiceCall('completePlan', `/trading/plans/${id}/complete`);
      
      return await this.http.post<TradingPlan>(`/trading/plans/${id}/complete`);
    } catch (error) {
      this.handleServiceError(error, '完成交易计划');
    }
  }

  // ==================== 交易记录管理 ====================

  /** 获取交易记录列表 */
  async getRecords(
    pagination?: PaginationParams,
    sort?: SortParams,
    filters?: TradingRecordQueryParams
  ): Promise<PaginatedResponse<TradingRecord>> {
    try {
      this.logServiceCall('getRecords', '/trading/records', { pagination, sort, filters });
      
      const queryParams = this.buildPaginationParams(pagination, sort, filters);
      const response = await this.http.get<TradingRecord[]>(`/trading/records${queryParams}`);
      
      // 转换为分页格式
      const items = response.data || [];
      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 10;
      
      return {
        items,
        total: items.length,
        page,
        pageSize,
        totalPages: Math.ceil(items.length / pageSize)
      };
    } catch (error) {
      this.handleServiceError(error, '获取交易记录列表');
    }
  }

  /** 根据ID获取交易记录 */
  async getRecordById(id: string): Promise<ApiResponse<TradingRecord>> {
    try {
      this.validateId(id, '交易记录ID');
      this.logServiceCall('getRecordById', `/trading/records/${id}`);
      
      return await this.http.get<TradingRecord>(`/trading/records/${id}`);
    } catch (error) {
      this.handleServiceError(error, '获取交易记录详情');
    }
  }

  /** 创建交易记录 */
  async createRecord(data: CreateTradingRecordData): Promise<ApiResponse<TradingRecord>> {
    try {
      this.validateRequired(data, ['symbol', 'action', 'price', 'quantity', 'amount', 'tradingType']);
      this.validateTradingRecordData(data);
      this.logServiceCall('createRecord', '/trading/records', data);
      
      return await this.http.post<TradingRecord>('/trading/records', data);
    } catch (error) {
      this.handleServiceError(error, '创建交易记录');
    }
  }

  /** 更新交易记录 */
  async updateRecord(id: string, data: UpdateTradingRecordData): Promise<ApiResponse<TradingRecord>> {
    try {
      this.validateId(id, '交易记录ID');
      this.logServiceCall('updateRecord', `/trading/records/${id}`, data);
      
      return await this.http.put<TradingRecord>(`/trading/records/${id}`, data);
    } catch (error) {
      this.handleServiceError(error, '更新交易记录');
    }
  }

  /** 删除交易记录 */
  async deleteRecord(id: string): Promise<ApiResponse<void>> {
    try {
      this.validateId(id, '交易记录ID');
      this.logServiceCall('deleteRecord', `/trading/records/${id}`);
      
      return await this.http.delete<void>(`/trading/records/${id}`);
    } catch (error) {
      this.handleServiceError(error, '删除交易记录');
    }
  }

  /** 执行交易 */
  async executeTrade(params: ExecuteTradeParams): Promise<ApiResponse<TradingRecord>> {
    try {
      this.validateRequired(params, ['planId', 'action', 'price', 'quantity']);
      this.logServiceCall('executeTrade', '/trading/execute', params);
      
      return await this.http.post<TradingRecord>('/trading/execute', params);
    } catch (error) {
      this.handleServiceError(error, '执行交易');
    }
  }

  // ==================== 交易策略管理 ====================

  /** 获取交易策略列表 */
  async getStrategies(
    pagination?: PaginationParams,
    sort?: SortParams,
    filters?: TradingStrategyQueryParams
  ): Promise<PaginatedResponse<TradingStrategy>> {
    try {
      this.logServiceCall('getStrategies', '/trading/strategies', { pagination, sort, filters });
      
      const queryParams = this.buildPaginationParams(pagination, sort, filters);
      const response = await this.http.get<TradingStrategy[]>(`/trading/strategies${queryParams}`);
      
      // 转换为分页格式
      const items = response.data || [];
      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 10;
      
      return {
        items,
        total: items.length,
        page,
        pageSize,
        totalPages: Math.ceil(items.length / pageSize)
      };
    } catch (error) {
      this.handleServiceError(error, '获取交易策略列表');
    }
  }

  /** 根据ID获取交易策略 */
  async getStrategyById(id: string): Promise<ApiResponse<TradingStrategy>> {
    try {
      this.validateId(id, '交易策略ID');
      this.logServiceCall('getStrategyById', `/trading/strategies/${id}`);
      
      return await this.http.get<TradingStrategy>(`/trading/strategies/${id}`);
    } catch (error) {
      this.handleServiceError(error, '获取交易策略详情');
    }
  }

  /** 创建交易策略 */
  async createStrategy(data: CreateTradingStrategyData): Promise<ApiResponse<TradingStrategy>> {
    try {
      this.validateRequired(data, ['name', 'type', 'tradingType', 'description', 'rules']);
      this.logServiceCall('createStrategy', '/trading/strategies', data);
      
      return await this.http.post<TradingStrategy>('/trading/strategies', data);
    } catch (error) {
      this.handleServiceError(error, '创建交易策略');
    }
  }

  /** 更新交易策略 */
  async updateStrategy(id: string, data: UpdateTradingStrategyData): Promise<ApiResponse<TradingStrategy>> {
    try {
      this.validateId(id, '交易策略ID');
      this.logServiceCall('updateStrategy', `/trading/strategies/${id}`, data);
      
      return await this.http.put<TradingStrategy>(`/trading/strategies/${id}`, data);
    } catch (error) {
      this.handleServiceError(error, '更新交易策略');
    }
  }

  /** 删除交易策略 */
  async deleteStrategy(id: string): Promise<ApiResponse<void>> {
    try {
      this.validateId(id, '交易策略ID');
      this.logServiceCall('deleteStrategy', `/trading/strategies/${id}`);
      
      return await this.http.delete<void>(`/trading/strategies/${id}`);
    } catch (error) {
      this.handleServiceError(error, '删除交易策略');
    }
  }

  // ==================== 风险管理 ====================

  /** 获取风险管理配置 */
  async getRiskManagement(): Promise<ApiResponse<RiskManagement>> {
    try {
      this.logServiceCall('getRiskManagement', '/trading/risk');
      return await this.http.get<RiskManagement>('/trading/risk');
    } catch (error) {
      this.handleServiceError(error, '获取风险管理配置');
    }
  }

  /** 更新风险管理配置 */
  async updateRiskManagement(data: Partial<RiskManagement>): Promise<ApiResponse<RiskManagement>> {
    try {
      this.logServiceCall('updateRiskManagement', '/trading/risk', data);
      return await this.http.put<RiskManagement>('/trading/risk', data);
    } catch (error) {
      this.handleServiceError(error, '更新风险管理配置');
    }
  }

  /** 风险检查 */
  async checkRisk(params: ExecuteTradeParams): Promise<ApiResponse<RiskCheckResult>> {
    try {
      this.validateRequired(params, ['planId', 'action', 'price', 'quantity']);
      this.logServiceCall('checkRisk', '/trading/risk/check', params);
      
      return await this.http.post<RiskCheckResult>('/trading/risk/check', params);
    } catch (error) {
      this.handleServiceError(error, '风险检查');
    }
  }

  // ==================== 交易统计和分析 ====================

  /** 获取交易统计 */
  async getStats(
    dateFrom?: string,
    dateTo?: string,
    tradingType?: TradingType
  ): Promise<ApiResponse<TradingStats>> {
    try {
      const params = { dateFrom, dateTo, tradingType };
      const queryParams = this.buildQueryParams(params);
      this.logServiceCall('getStats', `/trading/stats${queryParams}`);
      
      return await this.http.get<TradingStats>(`/trading/stats${queryParams}`);
    } catch (error) {
      this.handleServiceError(error, '获取交易统计');
    }
  }

  /** 获取实时日志 */
  async getRealTimeLogs(
    pagination?: PaginationParams,
    filters?: { level?: string; dateFrom?: string; dateTo?: string }
  ): Promise<PaginatedResponse<RealTimeLog>> {
    try {
      const queryParams = this.buildPaginationParams(pagination, undefined, filters);
      this.logServiceCall('getRealTimeLogs', `/trading/logs${queryParams}`);
      
      const response = await this.http.get<RealTimeLog[]>(`/trading/logs${queryParams}`);
      
      // 转换为分页格式
      const items = response.data || [];
      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 10;
      
      return {
        items,
        total: items.length,
        page,
        pageSize,
        totalPages: Math.ceil(items.length / pageSize)
      };
    } catch (error) {
      this.handleServiceError(error, '获取实时日志');
    }
  }

  /** 获取交易剧本 */
  async getScripts(
    pagination?: PaginationParams,
    filters?: { type?: string; isActive?: boolean }
  ): Promise<PaginatedResponse<TradingScript>> {
    try {
      const queryParams = this.buildPaginationParams(pagination, undefined, filters);
      this.logServiceCall('getScripts', `/trading/scripts${queryParams}`);
      
      const response = await this.http.get<TradingScript[]>(`/trading/scripts${queryParams}`);
      
      // 转换为分页格式
      const items = response.data || [];
      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 10;
      
      return {
        items: items,
        total: items.length,
        page,
        pageSize,
        totalPages: Math.ceil(items.length / pageSize)
      };
    } catch (error) {
      this.handleServiceError(error, '获取交易剧本');
    }
  }

  /** 获取活跃计划 */
  async getActivePlans(): Promise<ApiResponse<TradingPlan[]>> {
    try {
      this.logServiceCall('getActivePlans', '/trading/plans/active');
      return await this.http.get<TradingPlan[]>('/trading/plans/active');
    } catch (error) {
      this.handleServiceError(error, '获取活跃计划');
    }
  }

  /** 获取今日交易 */
  async getTodayTrades(): Promise<ApiResponse<TradingRecord[]>> {
    try {
      this.logServiceCall('getTodayTrades', '/trading/records/today');
      return await this.http.get<TradingRecord[]>('/trading/records/today');
    } catch (error) {
      this.handleServiceError(error, '获取今日交易');
    }
  }

  // ==================== 私有方法 ====================

  /** 验证交易计划数据 */
  private validateTradingPlanData(data: CreateTradingPlanData): void {
    if (data.targetPrice <= 0) {
      throw ServiceError.validationError('目标价格必须大于0');
    }

    if (data.quantity <= 0) {
      throw ServiceError.validationError('交易数量必须大于0');
    }

    if (data.stopLoss && data.stopLoss <= 0) {
      throw ServiceError.validationError('止损价格必须大于0');
    }

    if (data.takeProfit && data.takeProfit <= 0) {
      throw ServiceError.validationError('止盈价格必须大于0');
    }

    // 验证股票代码格式
    if (!/^[0-9]{6}$/.test(data.symbol)) {
      throw ServiceError.validationError('股票代码必须是6位数字');
    }
  }

  /** 验证交易记录数据 */
  private validateTradingRecordData(data: CreateTradingRecordData): void {
    if (data.price <= 0) {
      throw ServiceError.validationError('交易价格必须大于0');
    }

    if (data.quantity <= 0) {
      throw ServiceError.validationError('交易数量必须大于0');
    }

    if (data.amount <= 0) {
      throw ServiceError.validationError('交易金额必须大于0');
    }

    // 验证股票代码格式
    if (!/^[0-9]{6}$/.test(data.symbol)) {
      throw ServiceError.validationError('股票代码必须是6位数字');
    }

    // 验证金额和价格数量的一致性
    const calculatedAmount = data.price * data.quantity;
    if (Math.abs(data.amount - calculatedAmount) > 0.01) {
      throw ServiceError.validationError('交易金额与价格数量不匹配');
    }
  }
}

// ==================== 导出 ====================

export const tradingService = new TradingService();
export default tradingService;