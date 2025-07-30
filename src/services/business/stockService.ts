// 【知行交易】股票业务服务

import { stockApi } from '../api';
import { Stock, Concept, StockPoolStats, ImportedStock } from '../../types/stock';
import { ApiResponse, ImportResult } from '../../types/api';
import { VALIDATION_RULES, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../constants';

/**
 * 股票业务服务类
 * 封装股票相关的业务逻辑，提供高级业务操作
 */
export class StockBusinessService {
  
  // ==================== 股票池管理 ====================
  
  /**
   * 获取股票池数据（带缓存和错误处理）
   */
  async getStockPool(): Promise<{ stocks: Stock[]; stats: StockPoolStats }> {
    try {
      const [stocksResponse, statsResponse] = await Promise.all([
        stockApi.getAllStocks(),
        stockApi.getStockPoolStats()
      ]);
      
      if (!stocksResponse.success) {
        throw new Error(stocksResponse.error || ERROR_MESSAGES.FETCH_STOCKS_FAILED);
      }
      
      if (!statsResponse.success) {
        throw new Error(statsResponse.error || ERROR_MESSAGES.FETCH_STATS_FAILED);
      }
      
      return {
        stocks: stocksResponse.data || [],
        stats: statsResponse.data || this.getDefaultStats()
      };
    } catch (error) {
      console.error('获取股票池失败:', error);
      throw error;
    }
  }
  
  /**
   * 智能添加股票（带验证和去重）
   */
  async addStockToPool(stockData: Partial<Stock>): Promise<Stock> {
    // 验证股票数据
    this.validateStockData(stockData);
    
    try {
      // 检查是否已存在
      if (stockData.symbol) {
        const existingResponse = await stockApi.getStockBySymbol(stockData.symbol);
        if (existingResponse.success && existingResponse.data) {
          throw new Error(`股票 ${stockData.symbol} 已存在于股票池中`);
        }
      }
      
      // 添加股票
      const response = await stockApi.addStock(stockData);
      if (!response.success) {
        throw new Error(response.error || ERROR_MESSAGES.ADD_STOCK_FAILED);
      }
      
      return response.data!;
    } catch (error) {
      console.error('添加股票失败:', error);
      throw error;
    }
  }
  
  /**
   * 批量导入股票（带进度回调）
   */
  async importStocks(
    stocks: ImportedStock[],
    onProgress?: (progress: number, current: number, total: number) => void
  ): Promise<ImportResult> {
    try {
      // 验证导入数据
      this.validateImportData(stocks);
      
      // 分批处理（避免单次请求过大）
      const batchSize = VALIDATION_RULES.IMPORT_BATCH_SIZE;
      const batches = this.chunkArray(stocks, batchSize);
      
      let totalImported = 0;
      let totalSkipped = 0;
      let totalErrors = 0;
      const allResults: any[] = [];
      const allErrors: string[] = [];
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        try {
          const response = await stockApi.importStocks(batch);
          
          if (response.success && response.data) {
            const result = response.data;
            totalImported += result.imported;
            totalSkipped += result.skipped;
            totalErrors += result.errors;
            allResults.push(...result.details.imported_items);
            allErrors.push(...result.details.error_items.map(item => item.error));
          }
        } catch (error) {
          console.error(`批次 ${i + 1} 导入失败:`, error);
          totalErrors += batch.length;
          allErrors.push(`批次 ${i + 1} 导入失败: ${error}`);
        }
        
        // 更新进度
        if (onProgress) {
          const progress = ((i + 1) / batches.length) * 100;
          const current = (i + 1) * batchSize;
          onProgress(progress, Math.min(current, stocks.length), stocks.length);
        }
      }
      
      return {
        success: totalErrors < stocks.length,
        total: stocks.length,
        imported: totalImported,
        skipped: totalSkipped,
        errors: totalErrors,
        details: {
          imported_items: allResults,
          skipped_items: [],
          error_items: allErrors.map(error => ({ item: null, error }))
        }
      };
    } catch (error) {
      console.error('批量导入失败:', error);
      throw error;
    }
  }
  
  /**
   * 智能搜索股票（支持多种搜索方式）
   */
  async searchStocks(query: string): Promise<Stock[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }
    
    try {
      const response = await stockApi.searchStocks(query.trim());
      
      if (!response.success) {
        console.warn('搜索股票失败:', response.error);
        return [];
      }
      
      return response.data || [];
    } catch (error) {
      console.error('搜索股票异常:', error);
      return [];
    }
  }
  
  // ==================== 概念板块管理 ====================
  
  /**
   * 获取概念板块数据
   */
  async getConceptsWithStocks(): Promise<Concept[]> {
    try {
      const response = await stockApi.getAllConcepts();
      
      if (!response.success) {
        throw new Error(response.error || ERROR_MESSAGES.FETCH_CONCEPTS_FAILED);
      }
      
      return response.data || [];
    } catch (error) {
      console.error('获取概念板块失败:', error);
      throw error;
    }
  }
  
  /**
   * 创建概念板块（带验证）
   */
  async createConcept(conceptData: Partial<Concept>): Promise<Concept> {
    // 验证概念数据
    this.validateConceptData(conceptData);
    
    try {
      const response = await stockApi.createConcept(conceptData);
      
      if (!response.success) {
        throw new Error(response.error || ERROR_MESSAGES.CREATE_CONCEPT_FAILED);
      }
      
      return response.data!;
    } catch (error) {
      console.error('创建概念失败:', error);
      throw error;
    }
  }
  
  /**
   * 管理概念股票关系
   */
  async manageConceptStocks(
    conceptId: string,
    stocksToAdd: string[],
    stocksToRemove: string[]
  ): Promise<void> {
    try {
      // 并行处理添加和删除操作
      const operations = [];
      
      // 添加股票到概念
      for (const stockId of stocksToAdd) {
        operations.push(
          stockApi.addStockToConcept(conceptId, stockId)
        );
      }
      
      // 从概念中移除股票
      for (const stockId of stocksToRemove) {
        operations.push(
          stockApi.removeStockFromConcept(conceptId, stockId)
        );
      }
      
      const results = await Promise.allSettled(operations);
      
      // 检查是否有失败的操作
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        console.warn('部分概念股票关系操作失败:', failures);
      }
    } catch (error) {
      console.error('管理概念股票关系失败:', error);
      throw error;
    }
  }
  
  // ==================== 数据验证 ====================
  
  private validateStockData(stockData: Partial<Stock>): void {
    if (!stockData.symbol) {
      throw new Error('股票代码不能为空');
    }
    
    if (!stockData.name) {
      throw new Error('股票名称不能为空');
    }
    
    // 验证股票代码格式
    if (!VALIDATION_RULES.STOCK_SYMBOL_PATTERN.test(stockData.symbol)) {
      throw new Error('股票代码格式不正确');
    }
  }
  
  private validateConceptData(conceptData: Partial<Concept>): void {
    if (!conceptData.name) {
      throw new Error('概念名称不能为空');
    }
    
    if (conceptData.name.length > VALIDATION_RULES.MAX_CONCEPT_NAME_LENGTH) {
      throw new Error(`概念名称不能超过${VALIDATION_RULES.MAX_CONCEPT_NAME_LENGTH}个字符`);
    }
  }
  
  private validateImportData(stocks: ImportedStock[]): void {
    if (!stocks || stocks.length === 0) {
      throw new Error('导入数据不能为空');
    }
    
    if (stocks.length > VALIDATION_RULES.MAX_IMPORT_SIZE) {
      throw new Error(`单次导入不能超过${VALIDATION_RULES.MAX_IMPORT_SIZE}条记录`);
    }
    
    // 验证必要字段
    for (let i = 0; i < stocks.length; i++) {
      const stock = stocks[i];
      if (!stock.symbol || !stock.name) {
        throw new Error(`第${i + 1}行数据缺少必要字段（股票代码或名称）`);
      }
    }
  }
  
  // ==================== 工具方法 ====================
  
  private getDefaultStats(): StockPoolStats {
    return {
      totalStocks: 0,
      byMarket: {},
      byIndustry: {},
      byWatchLevel: {},
      recentlyAdded: 0,
      lastUpdated: new Date()
    };
  }
  
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// 创建股票业务服务实例
export const stockService = new StockBusinessService();