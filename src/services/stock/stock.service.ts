// 【知行交易】股票服务
// 处理股票数据的获取、管理和分析

import { 
  Stock, 
  StockOpinion, 
  StockPoolStats, 
  ImportedStock,
  ApiResponse, 
  PaginatedResponse,
  PaginationParams,
  SortParams,
  FilterParams
} from '../../types';
import { BaseService, ServiceError, PaginatedService, CrudService } from '../core/base.service';

// ==================== 股票服务接口 ====================

/** 股票查询参数 */
export interface StockQueryParams extends FilterParams {
  symbol?: string;              // 股票代码
  name?: string;                // 股票名称
  market?: 'SH' | 'SZ' | 'BJ';  // 市场
  industry?: string;            // 行业
  concept?: string[];           // 概念
  minMarketCap?: number;        // 最小市值
  maxMarketCap?: number;        // 最大市值
  minPrice?: number;            // 最小价格
  maxPrice?: number;            // 最大价格
  tags?: string[];              // 标签
}

/** 股票创建数据 */
export interface CreateStockData {
  symbol: string;
  name: string;
  market: 'SH' | 'SZ' | 'BJ';
  industry?: string;
  concept?: string[];
  tags?: string[];
  notes?: string;
}

/** 股票更新数据 */
export interface UpdateStockData {
  name?: string;
  industry?: string;
  concept?: string[];
  tags?: string[];
  notes?: string;
}

/** 股票价格更新数据 */
export interface StockPriceUpdate {
  price: number;
  change: number;
  volume?: number;
  turnover?: number;
  pe?: number;
  pb?: number;
  marketCap?: number;
}

// ==================== 股票服务实现 ====================

export class StockService extends BaseService implements 
  PaginatedService<Stock>, 
  CrudService<Stock, CreateStockData, UpdateStockData> {

  constructor() {
    super('StockService');
  }

  // ==================== 基础 CRUD 操作 ====================

  /** 获取股票列表 */
  async list(
    pagination?: PaginationParams,
    sort?: SortParams,
    filters?: StockQueryParams
  ): Promise<PaginatedResponse<Stock>> {
    try {
      this.logServiceCall('list', '/stocks', { pagination, sort, filters });
      const queryParams = this.buildPaginationParams(pagination, sort, filters);
      const response = await this.http.get<ApiResponse<PaginatedResponse<Stock>>>(`/stocks${queryParams}`);
      
      return response.data || { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
    } catch (error) {
      this.handleServiceError(error, '获取股票列表');
    }
  }

  /** 根据ID获取股票 */
  async getById(id: string): Promise<ApiResponse<Stock>> {
    try {
      this.validateId(id, '股票ID');
      this.logServiceCall('getById', `/stocks/${id}`);
      
      return await this.http.get<Stock>(`/stocks/${id}`);
    } catch (error) {
      this.handleServiceError(error, '获取股票详情');
    }
  }

  /** 根据股票代码获取股票 */
  async getBySymbol(symbol: string): Promise<ApiResponse<Stock>> {
    try {
      if (!symbol || typeof symbol !== 'string') {
        throw ServiceError.validationError('无效的股票代码');
      }
      
      this.logServiceCall('getBySymbol', `/stocks/symbol/${symbol}`);
      return await this.http.get<Stock>(`/stocks/symbol/${symbol}`);
    } catch (error) {
      this.handleServiceError(error, '根据代码获取股票');
    }
  }

  /** 创建股票 */
  async create(data: CreateStockData): Promise<ApiResponse<Stock>> {
    try {
      this.validateRequired(data, ['symbol', 'name', 'market']);
      this.validateStockData(data);
      this.logServiceCall('create', '/stocks', data);
      
      return await this.http.post<Stock>('/stocks', data);
    } catch (error) {
      this.handleServiceError(error, '创建股票');
    }
  }

  /** 更新股票 */
  async update(id: string, data: UpdateStockData): Promise<ApiResponse<Stock>> {
    try {
      this.validateId(id, '股票ID');
      this.logServiceCall('update', `/stocks/${id}`, data);
      
      return await this.http.put<Stock>(`/stocks/${id}`, data);
    } catch (error) {
      this.handleServiceError(error, '更新股票');
    }
  }

  /** 删除股票 */
  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      this.validateId(id, '股票ID');
      this.logServiceCall('delete', `/stocks/${id}`);
      
      return await this.http.delete<void>(`/stocks/${id}`);
    } catch (error) {
      this.handleServiceError(error, '删除股票');
    }
  }

  // ==================== 股票价格和数据 ====================

  /** 更新股票价格 */
  async updatePrice(id: string, priceData: StockPriceUpdate): Promise<ApiResponse<Stock>> {
    try {
      this.validateId(id, '股票ID');
      this.validateRequired(priceData, ['price', 'change']);
      this.logServiceCall('updatePrice', `/stocks/${id}/price`, priceData);
      
      return await this.http.patch<Stock>(`/stocks/${id}/price`, priceData);
    } catch (error) {
      this.handleServiceError(error, '更新股票价格');
    }
  }

  /** 批量更新股票价格 */
  async batchUpdatePrices(updates: Array<{ id: string; priceData: StockPriceUpdate }>): Promise<ApiResponse<Stock[]>> {
    try {
      if (!Array.isArray(updates) || updates.length === 0) {
        throw ServiceError.validationError('更新数据不能为空');
      }
      
      this.logServiceCall('batchUpdatePrices', '/stocks/batch/prices', { count: updates.length });
      return await this.http.post<Stock[]>('/stocks/batch/prices', { updates });
    } catch (error) {
      this.handleServiceError(error, '批量更新股票价格');
    }
  }



  // ==================== 股票搜索和筛选 ====================

  /** 搜索股票 */
  async search(
    query: string, 
    options?: {
      limit?: number;
      markets?: ('SH' | 'SZ' | 'BJ')[];
      includeDelisted?: boolean;
    }
  ): Promise<ApiResponse<Stock[]>> {
    try {
      if (!query || query.trim().length === 0) {
        throw ServiceError.validationError('搜索关键词不能为空');
      }
      
      const params = {
        q: query.trim(),
        limit: options?.limit || 20,
        markets: options?.markets?.join(','),
        includeDelisted: options?.includeDelisted || false
      };
      
      const queryParams = this.buildQueryParams(params);
      this.logServiceCall('search', `/stocks/search${queryParams}`);
      
      return await this.http.get<Stock[]>(`/stocks/search${queryParams}`);
    } catch (error) {
      this.handleServiceError(error, '搜索股票');
    }
  }

  /** 根据条件筛选股票 */
  async filter(conditions: StockQueryParams): Promise<ApiResponse<Stock[]>> {
    try {
      const queryParams = this.buildQueryParams(conditions);
      this.logServiceCall('filter', `/stocks/filter${queryParams}`);
      
      return await this.http.get<Stock[]>(`/stocks/filter${queryParams}`);
    } catch (error) {
      this.handleServiceError(error, '筛选股票');
    }
  }

  /** 获取热门股票 */
  async getPopular(limit: number = 20): Promise<ApiResponse<Stock[]>> {
    try {
      const queryParams = this.buildQueryParams({ limit });
      this.logServiceCall('getPopular', `/stocks/popular${queryParams}`);
      
      return await this.http.get<Stock[]>(`/stocks/popular${queryParams}`);
    } catch (error) {
      this.handleServiceError(error, '获取热门股票');
    }
  }

  /** 获取涨跌幅排行 */
  async getRanking(
    type: 'gainers' | 'losers' | 'volume' | 'turnover',
    market?: 'SH' | 'SZ' | 'BJ',
    limit: number = 50
  ): Promise<ApiResponse<Stock[]>> {
    try {
      const params = { type, market, limit };
      const queryParams = this.buildQueryParams(params);
      this.logServiceCall('getRanking', `/stocks/ranking${queryParams}`);
      
      return await this.http.get<Stock[]>(`/stocks/ranking${queryParams}`);
    } catch (error) {
      this.handleServiceError(error, '获取股票排行');
    }
  }

  // ==================== 股票标签和分类 ====================

  /** 添加标签 */
  async addTags(id: string, tags: string[]): Promise<ApiResponse<Stock>> {
    try {
      this.validateId(id, '股票ID');
      if (!Array.isArray(tags) || tags.length === 0) {
        throw ServiceError.validationError('标签列表不能为空');
      }
      
      this.logServiceCall('addTags', `/stocks/${id}/tags`, { tags });
      return await this.http.post<Stock>(`/stocks/${id}/tags`, { tags });
    } catch (error) {
      this.handleServiceError(error, '添加股票标签');
    }
  }

  /** 移除标签 */
  async removeTags(id: string, tags: string[]): Promise<ApiResponse<Stock>> {
    try {
      this.validateId(id, '股票ID');
      if (!Array.isArray(tags) || tags.length === 0) {
        throw ServiceError.validationError('标签列表不能为空');
      }
      
      this.logServiceCall('removeTags', `/stocks/${id}/tags`, { tags });
      return await this.http.delete<Stock>(`/stocks/${id}/tags`, { body: { tags } });
    } catch (error) {
      this.handleServiceError(error, '移除股票标签');
    }
  }

  /** 更新备注 */
  async updateNotes(id: string, notes: string): Promise<ApiResponse<Stock>> {
    try {
      this.validateId(id, '股票ID');
      this.logServiceCall('updateNotes', `/stocks/${id}/notes`, { notes });
      
      return await this.http.patch<Stock>(`/stocks/${id}/notes`, { notes });
    } catch (error) {
      this.handleServiceError(error, '更新股票备注');
    }
  }

  // ==================== 股票统计和分析 ====================

  /** 获取股票池统计 */
  async getPoolStats(): Promise<ApiResponse<StockPoolStats>> {
    try {
      this.logServiceCall('getPoolStats', '/stocks/stats');
      return await this.http.get<StockPoolStats>('/stocks/stats');
    } catch (error) {
      this.handleServiceError(error, '获取股票池统计');
    }
  }

  /** 获取股票观点 */
  async getOpinions(
    stockId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<StockOpinion>> {
    try {
      this.validateId(stockId, '股票ID');
      const queryParams = this.buildPaginationParams(pagination);
      this.logServiceCall('getOpinions', `/stocks/${stockId}/opinions${queryParams}`);
      
      const response = await this.http.get<ApiResponse<PaginatedResponse<StockOpinion>>>(`/stocks/${stockId}/opinions${queryParams}`);
      
      return response.data || { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
    } catch (error) {
      this.handleServiceError(error, '获取股票观点');
    }
  }

  // ==================== 数据导入和同步 ====================



  /** 同步股票数据 */
  async syncData(options?: {
    markets?: ('SH' | 'SZ' | 'BJ')[];
    forceUpdate?: boolean;
  }): Promise<ApiResponse<{ updated: number; errors: string[] }>> {
    try {
      this.logServiceCall('syncData', '/stocks/sync', options);
      return await this.http.post('/stocks/sync', options || {});
    } catch (error) {
      this.handleServiceError(error, '同步股票数据');
    }
  }

  // ==================== 私有方法 ====================

  /** 验证股票数据 */
  private validateStockData(data: CreateStockData): void {
    // 验证股票代码格式
    if (!/^[0-9]{6}$/.test(data.symbol)) {
      throw ServiceError.validationError('股票代码必须是6位数字');
    }

    // 验证市场和代码匹配
    const firstDigit = data.symbol.charAt(0);
    switch (data.market) {
      case 'SH':
        if (!['6', '9'].includes(firstDigit)) {
          throw ServiceError.validationError('上海市场股票代码应以6或9开头');
        }
        break;
      case 'SZ':
        if (!['0', '1', '2', '3'].includes(firstDigit)) {
          throw ServiceError.validationError('深圳市场股票代码应以0、1、2或3开头');
        }
        break;
      case 'BJ':
        if (!['4', '8'].includes(firstDigit)) {
          throw ServiceError.validationError('北京市场股票代码应以4或8开头');
        }
        break;
    }

    // 验证股票名称
    if (data.name.length < 2 || data.name.length > 20) {
      throw ServiceError.validationError('股票名称长度应在2-20个字符之间');
    }
  }
}

// ==================== 导出 ====================

export const stockService = new StockService();
export default stockService;