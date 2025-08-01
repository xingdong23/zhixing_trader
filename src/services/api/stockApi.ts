// 【知行交易】股票API服务

import { BaseApiClient } from './baseApi';
import { 
  Stock, 
  Concept, 
  ConceptStockRelation, 
  Industry,
  StockPoolStats,

  ImportedStock
} from '../../types/stock';
import { ApiResponse, PaginatedResponse, ImportResult } from '../../types/api';

/**
 * 股票API服务类
 */
export class StockApiService extends BaseApiClient {
  
  // ==================== 股票基础操作 ====================
  
  /**
   * 获取所有股票
   */
  async getAllStocks(): Promise<ApiResponse<Stock[]>> {
    return this.get<Stock[]>('/api/stocks');
  }
  
  /**
   * 根据ID获取股票详情
   */
  async getStockById(id: string): Promise<ApiResponse<Stock>> {
    return this.get<Stock>(`/api/stocks/${id}`);
  }
  
  /**
   * 根据代码获取股票详情
   */
  async getStockBySymbol(symbol: string): Promise<ApiResponse<Stock>> {
    return this.get<Stock>(`/api/stocks/symbol/${symbol}`);
  }
  
  /**
   * 搜索股票
   */
  async searchStocks(query: string, limit = 20): Promise<ApiResponse<Stock[]>> {
    return this.get<Stock[]>('/api/stocks/search', { q: query, limit });
  }
  
  /**
   * 添加股票到股票池
   */
  async addStock(stock: Partial<Stock>): Promise<ApiResponse<Stock>> {
    return this.post<Stock>('/api/stocks', stock);
  }
  
  /**
   * 更新股票信息
   */
  async updateStock(id: string, updates: Partial<Stock>): Promise<ApiResponse<Stock>> {
    return this.put<Stock>(`/api/stocks/${id}`, updates);
  }
  
  /**
   * 从股票池删除股票
   */
  async deleteStock(id: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/api/stocks/${id}`);
  }
  
  /**
   * 批量添加股票
   */
  async addStocksBatch(stocks: Partial<Stock>[]): Promise<ApiResponse<ImportResult>> {
    return this.post<ImportResult>('/api/stocks/batch', { stocks });
  }
  
  /**
   * 批量删除股票
   */
  async deleteStocksBatch(ids: string[]): Promise<ApiResponse<void>> {
    return this.request<void>('/api/stocks/batch', {
      method: 'DELETE',
      body: { ids }
    });
  }
  
  // ==================== 股票池统计 ====================
  
  /**
   * 获取股票池统计信息
   */
  async getStockPoolStats(): Promise<ApiResponse<StockPoolStats>> {
    return this.get<StockPoolStats>('/api/stocks/stats');
  }
  
  // ==================== 概念板块操作 ====================
  
  /**
   * 获取所有概念
   */
  async getAllConcepts(): Promise<ApiResponse<Concept[]>> {
    return this.get<Concept[]>('/api/concepts');
  }
  
  /**
   * 根据ID获取概念详情
   */
  async getConceptById(id: string): Promise<ApiResponse<Concept>> {
    return this.get<Concept>(`/api/concepts/${id}`);
  }
  
  /**
   * 创建新概念
   */
  async createConcept(concept: Partial<Concept>): Promise<ApiResponse<Concept>> {
    return this.post<Concept>('/api/concepts', concept);
  }
  
  /**
   * 更新概念信息
   */
  async updateConcept(id: string, updates: Partial<Concept>): Promise<ApiResponse<Concept>> {
    return this.put<Concept>(`/api/concepts/${id}`, updates);
  }
  
  /**
   * 删除概念
   */
  async deleteConcept(id: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/api/concepts/${id}`);
  }
  
  /**
   * 获取概念下的股票
   */
  async getStocksByConcept(conceptId: string): Promise<ApiResponse<Stock[]>> {
    return this.get<Stock[]>(`/api/concepts/${conceptId}/stocks`);
  }
  
  /**
   * 添加股票到概念
   */
  async addStockToConcept(
    conceptId: string, 
    stockId: string, 
    weight?: number
  ): Promise<ApiResponse<ConceptStockRelation>> {
    return this.post<ConceptStockRelation>(
      `/api/concepts/${conceptId}/stocks`, 
      { stockId, weight }
    );
  }
  
  /**
   * 从概念中移除股票
   */
  async removeStockFromConcept(
    conceptId: string, 
    stockId: string
  ): Promise<ApiResponse<void>> {
    return this.delete<void>(`/api/concepts/${conceptId}/stocks/${stockId}`);
  }
  
  // ==================== 行业操作 ====================
  
  /**
   * 获取所有行业
   */
  async getAllIndustries(): Promise<ApiResponse<Industry[]>> {
    return this.get<Industry[]>('/api/industries');
  }
  
  /**
   * 根据行业获取股票
   */
  async getStocksByIndustry(industryCode: string): Promise<ApiResponse<Stock[]>> {
    return this.get<Stock[]>(`/api/industries/${industryCode}/stocks`);
  }
  
  // ==================== 数据导入 ====================
  

  
  /**
   * 从CSV导入股票数据
   */
  async importFromCsv(csvData: string): Promise<ApiResponse<ImportResult>> {
    return this.post<ImportResult>('/api/stocks/import/csv', { csvData });
  }
  
  /**
   * 从通用格式导入股票
   */
  async importStocks(stocks: ImportedStock[]): Promise<ApiResponse<ImportResult>> {
    return this.post<ImportResult>('/api/stocks/import', { stocks });
  }
  
  // ==================== 数据同步 ====================
  
  /**
   * 同步股票基础信息
   */
  async syncStockInfo(): Promise<ApiResponse<void>> {
    return this.post<void>('/api/stocks/sync/info');
  }
  
  /**
   * 同步股票价格数据
   */
  async syncStockPrices(): Promise<ApiResponse<void>> {
    return this.post<void>('/api/stocks/sync/prices');
  }
  
  /**
   * 同步概念板块数据
   */
  async syncConceptData(): Promise<ApiResponse<void>> {
    return this.post<void>('/api/stocks/sync/concepts');
  }
  
  /**
   * 全量数据同步
   */
  async syncAllData(): Promise<ApiResponse<void>> {
    return this.post<void>('/api/stocks/sync/all');
  }
  
  // ==================== 实时数据 ====================
  
  /**
   * 获取股票实时价格
   */
  async getRealTimePrice(symbol: string): Promise<ApiResponse<any>> {
    return this.get<any>(`/api/stocks/${symbol}/realtime`);
  }
  
  /**
   * 批量获取实时价格
   */
  async getBatchRealTimePrices(symbols: string[]): Promise<ApiResponse<any[]>> {
    return this.post<any[]>('/api/stocks/realtime/batch', { symbols });
  }
}

// 创建股票API服务实例
export const stockApi = new StockApiService();