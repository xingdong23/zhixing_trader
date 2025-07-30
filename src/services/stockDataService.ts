import { Industry, ImportedStock } from '@/types';

/**
 * 股票数据存储服务
 * 使用localStorage作为持久化存储，后续可迁移到MySQL
 */
export class StockDataService {
// ==================== 行业管理 ====================

  /**
   * 获取所有行业（已废弃，请使用API获取）
   */
  static getIndustries(): Industry[] {
    console.warn('⚠️ getIndustries已废弃，请使用API获取行业数据');
    return [];
  }
  /**
   * 添加或更新行业
   */
  static upsertIndustries(newIndustries: Industry[]): Industry[] {
    console.warn('⚠️ upsertIndustries已废弃，请使用API管理行业数据');
    const existingIndustries: Industry[] = [];
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
    return updatedIndustries;
  }
// ==================== 股票管理 ====================

  /**
   * 获取所有导入的股票（已废弃，请使用API获取）
   */
  static getImportedStocks(): ImportedStock[] {
    console.warn('⚠️ getImportedStocks已废弃，请使用API获取股票数据');
    return [];
  }
  /**
   * 添加股票（避免重复）
   */
  static addStocks(newStocks: ImportedStock[]): ImportedStock[] {
    console.warn('⚠️ addStocks已废弃，请使用API添加股票');
    const existingStocks: ImportedStock[] = [];
    const existingSymbols = new Set(existingStocks.map(s => s.symbol));
    
    // 过滤重复股票
    const uniqueNewStocks = newStocks.filter(stock => !existingSymbols.has(stock.symbol));
    
    const updatedStocks = [...existingStocks, ...uniqueNewStocks];
    
    return updatedStocks;
  }
  /**
   * 清空所有数据（已废弃，请使用API清空数据）
   */
  static clearAllData(): void {
    console.warn('⚠️ clearAllData已废弃，请使用API清空数据');
  }
}
