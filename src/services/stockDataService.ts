import { Industry, ImportedStock } from '@/types';

/**
 * 股票数据存储服务
 * 使用localStorage作为持久化存储，后续可迁移到MySQL
 */
export class StockDataService {
  private static readonly INDUSTRIES_KEY = 'zhixing_industries';
  private static readonly STOCKS_KEY = 'zhixing_imported_stocks';

  // ==================== 行业管理 ====================

  /**
   * 获取所有行业
   */
  static getIndustries(): Industry[] {
    try {
      const data = localStorage.getItem(this.INDUSTRIES_KEY);
      if (!data) return [];
      
      const industries = JSON.parse(data);
      // 转换日期字符串为Date对象
      return industries.map((industry: any) => ({
        ...industry,
        createdAt: new Date(industry.createdAt),
        updatedAt: new Date(industry.updatedAt)
      }));
    } catch (error) {
      console.error('获取行业数据失败:', error);
      return [];
    }
  }

  /**
   * 保存行业数据
   */
  static saveIndustries(industries: Industry[]): void {
    try {
      localStorage.setItem(this.INDUSTRIES_KEY, JSON.stringify(industries));
    } catch (error) {
      console.error('保存行业数据失败:', error);
      throw new Error('保存行业数据失败');
    }
  }

  /**
   * 添加或更新行业
   */
  static upsertIndustries(newIndustries: Industry[]): Industry[] {
    const existingIndustries = this.getIndustries();
    const industryMap = new Map<string, Industry>();

    // 添加现有行业
    existingIndustries.forEach(industry => {
      industryMap.set(industry.name, industry);
    });

    // 添加或更新新行业
    newIndustries.forEach(newIndustry => {
      const existing = industryMap.get(newIndustry.name);
      if (existing) {
        // 更新现有行业
        existing.stockCount = newIndustry.stockCount;
        existing.updatedAt = new Date();
        if (newIndustry.description) {
          existing.description = newIndustry.description;
        }
      } else {
        // 添加新行业
        industryMap.set(newIndustry.name, newIndustry);
      }
    });

    const updatedIndustries = Array.from(industryMap.values());
    this.saveIndustries(updatedIndustries);
    return updatedIndustries;
  }

  /**
   * 根据名称查找行业
   */
  static findIndustryByName(name: string): Industry | undefined {
    const industries = this.getIndustries();
    return industries.find(industry => industry.name === name);
  }

  // ==================== 股票管理 ====================

  /**
   * 获取所有导入的股票
   */
  static getImportedStocks(): ImportedStock[] {
    try {
      const data = localStorage.getItem(this.STOCKS_KEY);
      if (!data) return [];
      
      const stocks = JSON.parse(data);
      // 转换日期字符串为Date对象
      return stocks.map((stock: any) => ({
        ...stock,
        addedAt: new Date(stock.addedAt),
        updatedAt: new Date(stock.updatedAt),
        industry: stock.industry ? {
          ...stock.industry,
          createdAt: new Date(stock.industry.createdAt),
          updatedAt: new Date(stock.industry.updatedAt)
        } : undefined
      }));
    } catch (error) {
      console.error('获取股票数据失败:', error);
      return [];
    }
  }

  /**
   * 保存股票数据
   */
  static saveImportedStocks(stocks: ImportedStock[]): void {
    try {
      localStorage.setItem(this.STOCKS_KEY, JSON.stringify(stocks));
    } catch (error) {
      console.error('保存股票数据失败:', error);
      throw new Error('保存股票数据失败');
    }
  }

  /**
   * 添加股票（避免重复）
   */
  static addStocks(newStocks: ImportedStock[]): ImportedStock[] {
    const existingStocks = this.getImportedStocks();
    const existingSymbols = new Set(existingStocks.map(s => s.symbol));
    
    // 过滤重复股票
    const uniqueNewStocks = newStocks.filter(stock => !existingSymbols.has(stock.symbol));
    
    const updatedStocks = [...existingStocks, ...uniqueNewStocks];
    this.saveImportedStocks(updatedStocks);
    
    return updatedStocks;
  }

  /**
   * 根据行业分组股票
   */
  static getStocksByIndustry(): Record<string, ImportedStock[]> {
    const stocks = this.getImportedStocks();
    const grouped: Record<string, ImportedStock[]> = {};

    stocks.forEach(stock => {
      const industryName = stock.industry?.name || '未分类';
      if (!grouped[industryName]) {
        grouped[industryName] = [];
      }
      grouped[industryName].push(stock);
    });

    return grouped;
  }

  /**
   * 获取股票统计信息
   */
  static getStockStats(): {
    totalStocks: number;
    byMarket: Record<string, number>;
    byIndustry: Record<string, number>;
    recentlyAdded: number;
  } {
    const stocks = this.getImportedStocks();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      totalStocks: stocks.length,
      byMarket: {} as Record<string, number>,
      byIndustry: {} as Record<string, number>,
      recentlyAdded: 0
    };

    stocks.forEach(stock => {
      // 按市场统计
      stats.byMarket[stock.market] = (stats.byMarket[stock.market] || 0) + 1;
      
      // 按行业统计
      const industryName = stock.industry?.name || '未分类';
      stats.byIndustry[industryName] = (stats.byIndustry[industryName] || 0) + 1;
      
      // 最近添加统计
      if (stock.addedAt >= sevenDaysAgo) {
        stats.recentlyAdded++;
      }
    });

    return stats;
  }

  /**
   * 删除股票
   */
  static deleteStock(stockId: string): ImportedStock[] {
    const stocks = this.getImportedStocks();
    const updatedStocks = stocks.filter(stock => stock.id !== stockId);
    this.saveImportedStocks(updatedStocks);
    return updatedStocks;
  }

  /**
   * 更新股票信息
   */
  static updateStock(stockId: string, updates: Partial<ImportedStock>): ImportedStock[] {
    const stocks = this.getImportedStocks();
    const updatedStocks = stocks.map(stock => {
      if (stock.id === stockId) {
        return {
          ...stock,
          ...updates,
          updatedAt: new Date()
        };
      }
      return stock;
    });
    
    this.saveImportedStocks(updatedStocks);
    return updatedStocks;
  }

  /**
   * 清空所有数据
   */
  static clearAllData(): void {
    try {
      localStorage.removeItem(this.INDUSTRIES_KEY);
      localStorage.removeItem(this.STOCKS_KEY);
    } catch (error) {
      console.error('清空数据失败:', error);
      throw new Error('清空数据失败');
    }
  }

  /**
   * 导出数据（用于备份）
   */
  static exportData(): {
    industries: Industry[];
    stocks: ImportedStock[];
    exportedAt: Date;
  } {
    return {
      industries: this.getIndustries(),
      stocks: this.getImportedStocks(),
      exportedAt: new Date()
    };
  }

  /**
   * 导入数据（用于恢复）
   */
  static importData(data: {
    industries: Industry[];
    stocks: ImportedStock[];
  }): void {
    this.saveIndustries(data.industries);
    this.saveImportedStocks(data.stocks);
  }
}
