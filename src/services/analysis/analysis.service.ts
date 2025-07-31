// 【知行交易】分析服务
// 处理选股策略、洞察分析、市场分析和复盘报告

import { 
  StockSelectionStrategy, 
  DailyStockSelection, 
  TradingRecommendation, 
  InsightCard, 
  ReviewReport, 
  MarketSentiment,
  TechnicalCondition,
  FundamentalCondition,
  PriceCondition,
  Stock,
  ApiResponse, 
  PaginatedResponse,
  PaginationParams,
  SortParams,
  FilterParams
} from '../../types';
import { BaseService, ServiceError, PaginatedService, CrudService } from '../core/base.service';

// ==================== 分析服务接口 ====================

/** 选股策略查询参数 */
export interface StrategyQueryParams extends FilterParams {
  name?: string;                      // 策略名称
  type?: string;                      // 策略类型
  isActive?: boolean;                 // 是否激活
  minSuccessRate?: number;            // 最小成功率
  maxSuccessRate?: number;            // 最大成功率
  tags?: string[];                    // 标签
  createdFrom?: string;               // 创建开始日期
  createdTo?: string;                 // 创建结束日期
}

/** 每日选股查询参数 */
export interface DailySelectionQueryParams extends FilterParams {
  strategyId?: string;                // 策略ID
  date?: string;                      // 日期
  dateFrom?: string;                  // 开始日期
  dateTo?: string;                    // 结束日期
  minScore?: number;                  // 最小评分
  maxScore?: number;                  // 最大评分
  hasRecommendations?: boolean;       // 是否有推荐
}

/** 交易推荐查询参数 */
export interface RecommendationQueryParams extends FilterParams {
  symbol?: string;                    // 股票代码
  action?: 'buy' | 'sell' | 'hold';   // 推荐动作
  minConfidence?: number;             // 最小置信度
  maxConfidence?: number;             // 最大置信度
  source?: string;                    // 来源
  dateFrom?: string;                  // 开始日期
  dateTo?: string;                    // 结束日期
  tags?: string[];                    // 标签
}

/** 洞察卡片查询参数 */
export interface InsightQueryParams extends FilterParams {
  type?: string;                      // 洞察类型
  category?: string;                  // 分类
  priority?: 'low' | 'medium' | 'high'; // 优先级
  isRead?: boolean;                   // 是否已读
  dateFrom?: string;                  // 开始日期
  dateTo?: string;                    // 结束日期
  tags?: string[];                    // 标签
}

/** 创建选股策略数据 */
export interface CreateStrategyData {
  name: string;
  description: string;
  type: string;
  technicalConditions?: TechnicalCondition[];
  fundamentalConditions?: FundamentalCondition[];
  priceConditions?: PriceCondition[];
  parameters?: Record<string, any>;
  tags?: string[];
  notes?: string;
}

/** 更新选股策略数据 */
export interface UpdateStrategyData {
  name?: string;
  description?: string;
  technicalConditions?: TechnicalCondition[];
  fundamentalConditions?: FundamentalCondition[];
  priceConditions?: PriceCondition[];
  parameters?: Record<string, any>;
  isActive?: boolean;
  tags?: string[];
  notes?: string;
}

/** 创建交易推荐数据 */
export interface CreateRecommendationData {
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  targetPrice?: number;
  stopLoss?: number;
  confidence: number;
  reasoning: string;
  source: string;
  tags?: string[];
  notes?: string;
}

/** 更新交易推荐数据 */
export interface UpdateRecommendationData {
  action?: 'buy' | 'sell' | 'hold';
  targetPrice?: number;
  stopLoss?: number;
  confidence?: number;
  reasoning?: string;
  tags?: string[];
  notes?: string;
}

/** 选股执行参数 */
export interface ExecuteSelectionParams {
  strategyId: string;
  date?: string;
  marketFilter?: {
    markets?: ('SH' | 'SZ' | 'BJ')[];
    minMarketCap?: number;
    maxMarketCap?: number;
    excludeSymbols?: string[];
  };
  limit?: number;
}

/** 选股结果 */
export interface SelectionResult {
  stocks: Stock[];
  totalCount: number;
  executionTime: number;
  strategy: StockSelectionStrategy;
  metadata: {
    date: string;
    filters: any;
    performance: {
      avgScore: number;
      maxScore: number;
      minScore: number;
    };
  };
}

/** 市场分析参数 */
export interface MarketAnalysisParams {
  date?: string;
  markets?: ('SH' | 'SZ' | 'BJ')[];
  includeIndices?: boolean;
  includeSectors?: boolean;
  includeHotConcepts?: boolean;
}

// ==================== 分析服务实现 ====================

export class AnalysisService extends BaseService {

  constructor() {
    super('AnalysisService');
  }

  // ==================== 选股策略管理 ====================

  /** 获取选股策略列表 */
  async getStrategies(
    pagination?: PaginationParams,
    sort?: SortParams,
    filters?: StrategyQueryParams
  ): Promise<PaginatedResponse<StockSelectionStrategy>> {
    try {
      this.logServiceCall('getStrategies', '/analysis/strategies', { pagination, sort, filters });
      
      const queryParams = this.buildPaginationParams(pagination, sort, filters);
      const response = await this.http.get<StockSelectionStrategy[]>(`/analysis/strategies${queryParams}`);
      
      return response as PaginatedResponse<StockSelectionStrategy>;
    } catch (error) {
      this.handleServiceError(error, '获取选股策略列表');
    }
  }

  /** 根据ID获取选股策略 */
  async getStrategyById(id: string): Promise<ApiResponse<StockSelectionStrategy>> {
    try {
      this.validateId(id, '选股策略ID');
      this.logServiceCall('getStrategyById', `/analysis/strategies/${id}`);
      
      return await this.http.get<StockSelectionStrategy>(`/analysis/strategies/${id}`);
    } catch (error) {
      this.handleServiceError(error, '获取选股策略详情');
    }
  }

  /** 创建选股策略 */
  async createStrategy(data: CreateStrategyData): Promise<ApiResponse<StockSelectionStrategy>> {
    try {
      this.validateRequired(data, ['name', 'description', 'type']);
      this.validateStrategyData(data);
      this.logServiceCall('createStrategy', '/analysis/strategies', data);
      
      return await this.http.post<StockSelectionStrategy>('/analysis/strategies', data);
    } catch (error) {
      this.handleServiceError(error, '创建选股策略');
    }
  }

  /** 更新选股策略 */
  async updateStrategy(id: string, data: UpdateStrategyData): Promise<ApiResponse<StockSelectionStrategy>> {
    try {
      this.validateId(id, '选股策略ID');
      this.logServiceCall('updateStrategy', `/analysis/strategies/${id}`, data);
      
      return await this.http.put<StockSelectionStrategy>(`/analysis/strategies/${id}`, data);
    } catch (error) {
      this.handleServiceError(error, '更新选股策略');
    }
  }

  /** 删除选股策略 */
  async deleteStrategy(id: string): Promise<ApiResponse<void>> {
    try {
      this.validateId(id, '选股策略ID');
      this.logServiceCall('deleteStrategy', `/analysis/strategies/${id}`);
      
      return await this.http.delete<void>(`/analysis/strategies/${id}`);
    } catch (error) {
      this.handleServiceError(error, '删除选股策略');
    }
  }

  /** 激活/停用选股策略 */
  async toggleStrategy(id: string, isActive: boolean): Promise<ApiResponse<StockSelectionStrategy>> {
    try {
      this.validateId(id, '选股策略ID');
      this.logServiceCall('toggleStrategy', `/analysis/strategies/${id}/toggle`, { isActive });
      
      return await this.http.patch<StockSelectionStrategy>(`/analysis/strategies/${id}/toggle`, { isActive });
    } catch (error) {
      this.handleServiceError(error, '切换选股策略状态');
    }
  }

  /** 执行选股策略 */
  async executeStrategy(params: ExecuteSelectionParams): Promise<ApiResponse<SelectionResult>> {
    try {
      this.validateRequired(params, ['strategyId']);
      this.validateId(params.strategyId, '选股策略ID');
      this.logServiceCall('executeStrategy', '/analysis/strategies/execute', params);
      
      return await this.http.post<SelectionResult>('/analysis/strategies/execute', params);
    } catch (error) {
      this.handleServiceError(error, '执行选股策略');
    }
  }

  /** 回测选股策略 */
  async backtestStrategy(
    strategyId: string, 
    params: {
      startDate: string;
      endDate: string;
      initialCapital?: number;
      commission?: number;
    }
  ): Promise<ApiResponse<any>> {
    try {
      this.validateId(strategyId, '选股策略ID');
      this.validateRequired(params, ['startDate', 'endDate']);
      this.logServiceCall('backtestStrategy', `/analysis/strategies/${strategyId}/backtest`, params);
      
      return await this.http.post(`/analysis/strategies/${strategyId}/backtest`, params);
    } catch (error) {
      this.handleServiceError(error, '回测选股策略');
    }
  }

  // ==================== 每日选股管理 ====================

  /** 获取每日选股列表 */
  async getDailySelections(
    pagination?: PaginationParams,
    sort?: SortParams,
    filters?: DailySelectionQueryParams
  ): Promise<PaginatedResponse<DailyStockSelection>> {
    try {
      this.logServiceCall('getDailySelections', '/analysis/daily-selections', { pagination, sort, filters });
      
      const queryParams = this.buildPaginationParams(pagination, sort, filters);
      const response = await this.http.get<DailyStockSelection[]>(`/analysis/daily-selections${queryParams}`);
      
      return response as PaginatedResponse<DailyStockSelection>;
    } catch (error) {
      this.handleServiceError(error, '获取每日选股列表');
    }
  }

  /** 根据ID获取每日选股 */
  async getDailySelectionById(id: string): Promise<ApiResponse<DailyStockSelection>> {
    try {
      this.validateId(id, '每日选股ID');
      this.logServiceCall('getDailySelectionById', `/analysis/daily-selections/${id}`);
      
      return await this.http.get<DailyStockSelection>(`/analysis/daily-selections/${id}`);
    } catch (error) {
      this.handleServiceError(error, '获取每日选股详情');
    }
  }

  /** 获取今日选股 */
  async getTodaySelections(): Promise<ApiResponse<DailyStockSelection[]>> {
    try {
      this.logServiceCall('getTodaySelections', '/analysis/daily-selections/today');
      return await this.http.get<DailyStockSelection[]>('/analysis/daily-selections/today');
    } catch (error) {
      this.handleServiceError(error, '获取今日选股');
    }
  }

  /** 获取最新选股 */
  async getLatestSelections(limit: number = 10): Promise<ApiResponse<DailyStockSelection[]>> {
    try {
      const queryParams = this.buildQueryParams({ limit });
      this.logServiceCall('getLatestSelections', `/analysis/daily-selections/latest${queryParams}`);
      
      return await this.http.get<DailyStockSelection[]>(`/analysis/daily-selections/latest${queryParams}`);
    } catch (error) {
      this.handleServiceError(error, '获取最新选股');
    }
  }

  // ==================== 交易推荐管理 ====================

  /** 获取交易推荐列表 */
  async getRecommendations(
    pagination?: PaginationParams,
    sort?: SortParams,
    filters?: RecommendationQueryParams
  ): Promise<PaginatedResponse<TradingRecommendation>> {
    try {
      this.logServiceCall('getRecommendations', '/analysis/recommendations', { pagination, sort, filters });
      
      const queryParams = this.buildPaginationParams(pagination, sort, filters);
      const response = await this.http.get<TradingRecommendation[]>(`/analysis/recommendations${queryParams}`);
      
      return response as PaginatedResponse<TradingRecommendation>;
    } catch (error) {
      this.handleServiceError(error, '获取交易推荐列表');
    }
  }

  /** 根据ID获取交易推荐 */
  async getRecommendationById(id: string): Promise<ApiResponse<TradingRecommendation>> {
    try {
      this.validateId(id, '交易推荐ID');
      this.logServiceCall('getRecommendationById', `/analysis/recommendations/${id}`);
      
      return await this.http.get<TradingRecommendation>(`/analysis/recommendations/${id}`);
    } catch (error) {
      this.handleServiceError(error, '获取交易推荐详情');
    }
  }

  /** 创建交易推荐 */
  async createRecommendation(data: CreateRecommendationData): Promise<ApiResponse<TradingRecommendation>> {
    try {
      this.validateRequired(data, ['symbol', 'action', 'confidence', 'reasoning', 'source']);
      this.validateRecommendationData(data);
      this.logServiceCall('createRecommendation', '/analysis/recommendations', data);
      
      return await this.http.post<TradingRecommendation>('/analysis/recommendations', data);
    } catch (error) {
      this.handleServiceError(error, '创建交易推荐');
    }
  }

  /** 更新交易推荐 */
  async updateRecommendation(id: string, data: UpdateRecommendationData): Promise<ApiResponse<TradingRecommendation>> {
    try {
      this.validateId(id, '交易推荐ID');
      this.logServiceCall('updateRecommendation', `/analysis/recommendations/${id}`, data);
      
      return await this.http.put<TradingRecommendation>(`/analysis/recommendations/${id}`, data);
    } catch (error) {
      this.handleServiceError(error, '更新交易推荐');
    }
  }

  /** 删除交易推荐 */
  async deleteRecommendation(id: string): Promise<ApiResponse<void>> {
    try {
      this.validateId(id, '交易推荐ID');
      this.logServiceCall('deleteRecommendation', `/analysis/recommendations/${id}`);
      
      return await this.http.delete<void>(`/analysis/recommendations/${id}`);
    } catch (error) {
      this.handleServiceError(error, '删除交易推荐');
    }
  }

  /** 获取股票推荐 */
  async getStockRecommendations(symbol: string): Promise<ApiResponse<TradingRecommendation[]>> {
    try {
      if (!symbol || !/^[0-9]{6}$/.test(symbol)) {
        throw ServiceError.validationError('无效的股票代码');
      }
      
      this.logServiceCall('getStockRecommendations', `/analysis/recommendations/stock/${symbol}`);
      return await this.http.get<TradingRecommendation[]>(`/analysis/recommendations/stock/${symbol}`);
    } catch (error) {
      this.handleServiceError(error, '获取股票推荐');
    }
  }

  // ==================== 洞察分析管理 ====================

  /** 获取洞察卡片列表 */
  async getInsights(
    pagination?: PaginationParams,
    sort?: SortParams,
    filters?: InsightQueryParams
  ): Promise<PaginatedResponse<InsightCard>> {
    try {
      this.logServiceCall('getInsights', '/analysis/insights', { pagination, sort, filters });
      
      const queryParams = this.buildPaginationParams(pagination, sort, filters);
      const response = await this.http.get<InsightCard[]>(`/analysis/insights${queryParams}`);
      
      return response as PaginatedResponse<InsightCard>;
    } catch (error) {
      this.handleServiceError(error, '获取洞察卡片列表');
    }
  }

  /** 根据ID获取洞察卡片 */
  async getInsightById(id: string): Promise<ApiResponse<InsightCard>> {
    try {
      this.validateId(id, '洞察卡片ID');
      this.logServiceCall('getInsightById', `/analysis/insights/${id}`);
      
      return await this.http.get<InsightCard>(`/analysis/insights/${id}`);
    } catch (error) {
      this.handleServiceError(error, '获取洞察卡片详情');
    }
  }

  /** 标记洞察为已读 */
  async markInsightAsRead(id: string): Promise<ApiResponse<InsightCard>> {
    try {
      this.validateId(id, '洞察卡片ID');
      this.logServiceCall('markInsightAsRead', `/analysis/insights/${id}/read`);
      
      return await this.http.patch<InsightCard>(`/analysis/insights/${id}/read`);
    } catch (error) {
      this.handleServiceError(error, '标记洞察为已读');
    }
  }

  /** 获取未读洞察数量 */
  async getUnreadInsightCount(): Promise<ApiResponse<{ count: number }>> {
    try {
      this.logServiceCall('getUnreadInsightCount', '/analysis/insights/unread/count');
      return await this.http.get<{ count: number }>('/analysis/insights/unread/count');
    } catch (error) {
      this.handleServiceError(error, '获取未读洞察数量');
    }
  }

  // ==================== 市场分析 ====================

  /** 获取市场情绪分析 */
  async getMarketSentiment(params?: MarketAnalysisParams): Promise<ApiResponse<MarketSentiment>> {
    try {
      const queryParams = this.buildQueryParams(params || {});
      this.logServiceCall('getMarketSentiment', `/analysis/market/sentiment${queryParams}`);
      
      return await this.http.get<MarketSentiment>(`/analysis/market/sentiment${queryParams}`);
    } catch (error) {
      this.handleServiceError(error, '获取市场情绪分析');
    }
  }

  /** 获取复盘报告 */
  async getReviewReports(
    pagination?: PaginationParams,
    filters?: { dateFrom?: string; dateTo?: string; type?: string }
  ): Promise<PaginatedResponse<ReviewReport>> {
    try {
      const queryParams = this.buildPaginationParams(pagination, undefined, filters);
      this.logServiceCall('getReviewReports', `/analysis/reviews${queryParams}`);
      
      const response = await this.http.get<ReviewReport[]>(`/analysis/reviews${queryParams}`);
      return response as PaginatedResponse<ReviewReport>;
    } catch (error) {
      this.handleServiceError(error, '获取复盘报告');
    }
  }

  /** 生成复盘报告 */
  async generateReviewReport(
    params: {
      date: string;
      type: 'daily' | 'weekly' | 'monthly';
      includeStrategies?: boolean;
      includeTrades?: boolean;
      includeMarket?: boolean;
    }
  ): Promise<ApiResponse<ReviewReport>> {
    try {
      this.validateRequired(params, ['date', 'type']);
      this.logServiceCall('generateReviewReport', '/analysis/reviews/generate', params);
      
      return await this.http.post<ReviewReport>('/analysis/reviews/generate', params);
    } catch (error) {
      this.handleServiceError(error, '生成复盘报告');
    }
  }

  // ==================== 数据分析和统计 ====================

  /** 获取策略性能统计 */
  async getStrategyPerformance(
    strategyId?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<ApiResponse<any>> {
    try {
      const params = { strategyId, dateFrom, dateTo };
      const queryParams = this.buildQueryParams(params);
      this.logServiceCall('getStrategyPerformance', `/analysis/performance${queryParams}`);
      
      return await this.http.get(`/analysis/performance${queryParams}`);
    } catch (error) {
      this.handleServiceError(error, '获取策略性能统计');
    }
  }

  /** 获取选股成功率 */
  async getSelectionSuccessRate(
    strategyId: string,
    period: 'week' | 'month' | 'quarter' | 'year' = 'month'
  ): Promise<ApiResponse<{ successRate: number; totalSelections: number; profitableSelections: number }>> {
    try {
      this.validateId(strategyId, '选股策略ID');
      const queryParams = this.buildQueryParams({ period });
      this.logServiceCall('getSelectionSuccessRate', `/analysis/strategies/${strategyId}/success-rate${queryParams}`);
      
      return await this.http.get(`/analysis/strategies/${strategyId}/success-rate${queryParams}`);
    } catch (error) {
      this.handleServiceError(error, '获取选股成功率');
    }
  }

  // ==================== 私有方法 ====================

  /** 验证选股策略数据 */
  private validateStrategyData(data: CreateStrategyData): void {
    if (data.name.length < 2 || data.name.length > 50) {
      throw ServiceError.validationError('策略名称长度应在2-50个字符之间');
    }

    if (data.description.length < 10 || data.description.length > 500) {
      throw ServiceError.validationError('策略描述长度应在10-500个字符之间');
    }

    // 验证至少有一种条件
    const hasConditions = (
      (data.technicalConditions && data.technicalConditions.length > 0) ||
      (data.fundamentalConditions && data.fundamentalConditions.length > 0) ||
      (data.priceConditions && data.priceConditions.length > 0)
    );

    if (!hasConditions) {
      throw ServiceError.validationError('策略必须至少包含一种筛选条件');
    }
  }

  /** 验证交易推荐数据 */
  private validateRecommendationData(data: CreateRecommendationData): void {
    // 验证股票代码格式
    if (!/^[0-9]{6}$/.test(data.symbol)) {
      throw ServiceError.validationError('股票代码必须是6位数字');
    }

    // 验证置信度范围
    if (data.confidence < 0 || data.confidence > 100) {
      throw ServiceError.validationError('置信度必须在0-100之间');
    }

    // 验证推理说明长度
    if (data.reasoning.length < 10 || data.reasoning.length > 1000) {
      throw ServiceError.validationError('推理说明长度应在10-1000个字符之间');
    }

    // 验证价格
    if (data.targetPrice && data.targetPrice <= 0) {
      throw ServiceError.validationError('目标价格必须大于0');
    }

    if (data.stopLoss && data.stopLoss <= 0) {
      throw ServiceError.validationError('止损价格必须大于0');
    }
  }
}

// ==================== 导出 ====================

export const analysisService = new AnalysisService();
export default analysisService;