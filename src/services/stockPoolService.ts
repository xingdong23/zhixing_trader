import { Stock } from '@/types';
import { StockDataService } from './stockDataService';
import { ConceptService } from './conceptService';

/**
 * 股票池统一数据管理服务
 * 整合富途导入数据和现有股票池数据
 */
export class StockPoolService {
  private static readonly STOCK_POOL_KEY = 'zhixing_stock_pool';

  /**
   * 从后端API获取所有股票
   */
  static async getStocksFromAPI(): Promise<Stock[]> {
    try {
      console.log('🔄 从后端API获取股票数据...');
      const response = await fetch('http://localhost:3001/api/v1/stocks/');

      if (!response.ok) {
        console.warn('⚠️ 股票API请求失败，返回空数组');
        return [];
      }

      const result = await response.json();
      if (result.success && result.data.stocks) {
        const stocks = result.data.stocks.map((apiStock: any) => ({
          id: `api_${apiStock.id}`,
          symbol: apiStock.symbol,
          name: apiStock.name,
          market: apiStock.market,
          tags: {
            industry: apiStock.industry_tags || [apiStock.group_name || '未分类'],
            fundamentals: apiStock.fundamental_tags || [],
            marketCap: apiStock.market_cap || 'mid' as const,
            watchLevel: apiStock.watch_level || 'medium' as const
          },
          conceptIds: apiStock.concept_ids || [],
          currentPrice: 0,
          priceChange: 0,
          priceChangePercent: 0,
          volume: 0,
          addedAt: new Date(apiStock.added_at),
          updatedAt: new Date(apiStock.updated_at),
          notes: apiStock.notes || '从数据库加载',
          opinions: []
        }));

        console.log(`✅ 从API获取到 ${stocks.length} 只股票`);
        return stocks;
      }

      console.warn('⚠️ 股票API返回格式不正确，返回空数组');
      return [];
    } catch (error) {
      console.error('❌ 获取股票数据失败:', error);
      return [];
    }
  }

  /**
   * 获取所有股票池股票（包括富途导入的）- 已废弃，请使用getStocksFromAPI
   */
  static getAllStocks(): Stock[] {
    try {
      // 获取现有股票池数据
      const poolData = localStorage.getItem(this.STOCK_POOL_KEY);
      const poolStocks: Stock[] = poolData ? JSON.parse(poolData).map((stock: any) => ({
        ...stock,
        conceptIds: stock.conceptIds || [],
        addedAt: new Date(stock.addedAt),
        updatedAt: new Date(stock.updatedAt)
      })) : [];

      // 获取富途导入的股票
      const importedStocks = StockDataService.getImportedStocks();
      
      // 将富途股票转换为Stock格式
      const convertedImportedStocks: Stock[] = importedStocks.map(importedStock => {
        const stock: Stock = {
          id: importedStock.id,
          symbol: importedStock.symbol,
          name: importedStock.name,
          market: importedStock.market,
          tags: {
            industry: importedStock.industry ? [importedStock.industry.name] : [],
            fundamentals: importedStock.tags.filter(tag => tag !== '富途导入'),
            marketCap: this.determineMarketCapSize(importedStock.marketCap),
            watchLevel: 'medium' as const
          },
          conceptIds: [],
          currentPrice: importedStock.price,
          priceChange: importedStock.change,
          priceChangePercent: importedStock.changePercent,
          volume: importedStock.volume,
          addedAt: importedStock.addedAt,
          updatedAt: importedStock.updatedAt,
          notes: importedStock.notes,
          opinions: []
        };
        return stock;
      });

      // 合并数据，避免重复（以symbol为准）
      const allStocks = [...poolStocks];
      const existingSymbols = new Set(poolStocks.map(s => s.symbol));
      
      convertedImportedStocks.forEach(stock => {
        if (!existingSymbols.has(stock.symbol)) {
          allStocks.push(stock);
        }
      });

      return allStocks;
    } catch (error) {
      console.error('获取股票池数据失败:', error);
      return [];
    }
  }

  /**
   * 保存股票池数据
   */
  static saveStockPool(stocks: Stock[]): void {
    try {
      // 分离富途导入的股票和普通股票池股票
      const futuStocks: Stock[] = [];
      const poolStocks: Stock[] = [];

      stocks.forEach(stock => {
        // 如果股票有富途特征（通过notes或其他标识判断），则归类为富途股票
        if (stock.notes?.includes('从富途导入') || stock.id.startsWith('futu_')) {
          futuStocks.push(stock);
        } else {
          poolStocks.push(stock);
        }
      });

      // 保存普通股票池数据
      localStorage.setItem(this.STOCK_POOL_KEY, JSON.stringify(poolStocks));

      // 更新富途导入的股票数据
      if (futuStocks.length > 0) {
        const importedStocks = futuStocks.map(stock => ({
          id: stock.id,
          symbol: stock.symbol,
          name: stock.name,
          market: stock.market,
          industryId: undefined,
          industry: stock.tags.industry.length > 0 ? {
            id: `industry_${stock.tags.industry[0]}`,
            name: stock.tags.industry[0],
            stockCount: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          } : undefined,
          price: stock.currentPrice || 0,
          change: stock.priceChange || 0,
          changePercent: stock.priceChangePercent || 0,
          volume: stock.volume || 0,
          turnover: 0,
          high: 0,
          low: 0,
          open: 0,
          preClose: 0,
          marketCap: this.parseMarketCap(stock.tags.marketCap),
          peRatio: undefined,
          pbRatio: undefined,
          dividendYield: undefined,
          addedAt: stock.addedAt,
          updatedAt: stock.updatedAt,
          tags: stock.tags.fundamentals,
          notes: stock.notes || ''
        }));

        StockDataService.saveImportedStocks(importedStocks);
      }
    } catch (error) {
      console.error('保存股票池数据失败:', error);
      throw new Error('保存股票池数据失败');
    }
  }

  /**
   * 添加股票到股票池
   */
  static addStock(stock: Omit<Stock, 'id' | 'addedAt' | 'updatedAt'>): Stock[] {
    const stocks = this.getAllStocks();
    const newStock: Stock = {
      ...stock,
      conceptIds: stock.conceptIds || [],
      id: `pool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      addedAt: new Date(),
      updatedAt: new Date()
    };

    const updatedStocks = [...stocks, newStock];
    this.saveStockPool(updatedStocks);

    // 自动为股票分配推荐的概念标签
    try {
      ConceptService.autoAssignConceptsToStock(newStock.id, newStock.symbol);
    } catch (error) {
      console.warn('自动分配概念标签失败:', error);
    }

    return updatedStocks;
  }

  /**
   * 更新股票信息
   */
  static updateStock(id: string, updates: Partial<Stock>): Stock[] {
    const stocks = this.getAllStocks();
    const updatedStocks = stocks.map(stock => {
      if (stock.id === id) {
        return {
          ...stock,
          ...updates,
          updatedAt: new Date()
        };
      }
      return stock;
    });
    
    this.saveStockPool(updatedStocks);
    return updatedStocks;
  }

  /**
   * 删除股票
   */
  static deleteStock(id: string): Stock[] {
    const stocks = this.getAllStocks();
    const updatedStocks = stocks.filter(stock => stock.id !== id);
    this.saveStockPool(updatedStocks);
    return updatedStocks;
  }

  /**
   * 获取所有使用的行业标签
   */
  static getAllIndustryTags(): string[] {
    const stocks = this.getAllStocks();
    const tags = new Set<string>();
    
    stocks.forEach(stock => {
      stock.tags.industry.forEach(tag => tags.add(tag));
    });
    
    return Array.from(tags).sort();
  }

  /**
   * 获取所有使用的基本面标签
   */
  static getAllFundamentalTags(): string[] {
    const stocks = this.getAllStocks();
    const tags = new Set<string>();

    stocks.forEach(stock => {
      stock.tags.fundamentals.forEach(tag => tags.add(tag));
    });

    return Array.from(tags).sort();
  }

  /**
   * 获取所有概念标签
   */
  static async getAllConcepts(): Promise<Array<{ id: string; name: string; stockCount: number }>> {
    const concepts = await ConceptService.getConcepts();
    return concepts.map((concept: any) => ({
      id: concept.id,
      name: concept.name,
      stockCount: concept.stockCount
    }));
  }

  /**
   * 根据概念筛选股票
   */
  static getStocksByConcept(conceptId: string): Stock[] {
    const stocks = this.getAllStocks();
    return stocks.filter(stock => stock.conceptIds.includes(conceptId));
  }

  /**
   * 根据多个概念筛选股票（交集）
   */
  static getStocksByConceptsIntersection(conceptIds: string[]): Stock[] {
    if (conceptIds.length === 0) return this.getAllStocks();

    const stocks = this.getAllStocks();
    return stocks.filter(stock =>
      conceptIds.every(conceptId => stock.conceptIds.includes(conceptId))
    );
  }

  /**
   * 根据多个概念筛选股票（并集）
   */
  static getStocksByConceptsUnion(conceptIds: string[]): Stock[] {
    if (conceptIds.length === 0) return this.getAllStocks();

    const stocks = this.getAllStocks();
    return stocks.filter(stock =>
      conceptIds.some(conceptId => stock.conceptIds.includes(conceptId))
    );
  }

  /**
   * 根据市值确定规模
   */
  private static determineMarketCapSize(marketCap?: number): 'large' | 'mid' | 'small' {
    if (!marketCap) return 'small';
    if (marketCap >= 1e11) return 'large';  // 1000亿以上
    if (marketCap >= 1e10) return 'mid';    // 100亿以上
    return 'small';
  }

  /**
   * 解析市值规模为数值
   */
  private static parseMarketCap(marketCapSize: 'large' | 'mid' | 'small'): number | undefined {
    switch (marketCapSize) {
      case 'large': return 1e11;
      case 'mid': return 1e10;
      case 'small': return 1e9;
      default: return undefined;
    }
  }

  /**
   * 清空所有数据
   */
  static clearAllData(): void {
    try {
      localStorage.removeItem(this.STOCK_POOL_KEY);
      StockDataService.clearAllData();
    } catch (error) {
      console.error('清空数据失败:', error);
      throw new Error('清空数据失败');
    }
  }

  /**
   * 自动建立股票和概念的关联关系（已废弃 - 现在使用数据库API）
   */
  static autoEstablishConceptRelations(): void {
    console.warn('autoEstablishConceptRelations 方法已废弃，请使用数据库API');
  }

  /**
   * 导出所有数据
   */
  static exportAllData(): {
    stockPool: Stock[];
    importedStocks: any[];
    industries: any[];
    exportedAt: Date;
  } {
    return {
      stockPool: this.getAllStocks(),
      importedStocks: StockDataService.getImportedStocks(),
      industries: StockDataService.getIndustries(),
      exportedAt: new Date()
    };
  }
}
