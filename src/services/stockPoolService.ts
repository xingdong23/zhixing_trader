import { Stock } from '@/types';
import { StockDataService } from './stockDataService';
import { ConceptService } from './conceptService';

/**
 * 股票池统一数据管理服务
 * 整合富途导入数据和现有股票池数据
 */
export class StockPoolService {
  /**
   * 从后端API获取所有股票
   */
  static async getStocksFromAPI(): Promise<Stock[]> {
    try {
      console.log('🔄 从后端API获取股票数据...');
      const response = await fetch('http://localhost:8000/api/v1/stocks/');

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
   * 保存股票池数据（已废弃，数据现在通过API自动同步）
   */
  static saveStockPool(stocks: Stock[]): void {
    console.warn('⚠️ saveStockPool已废弃，数据现在通过API自动同步');
  }

  /**
   * 添加股票到股票池
   */
  static addStock(stock: Omit<Stock, 'id' | 'addedAt' | 'updatedAt'>): Stock[] {
    console.warn('⚠️ addStock已废弃，请使用API添加股票');
    const stocks: Stock[] = [];
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
    console.warn('⚠️ updateStock已废弃，请使用API更新股票');
    return [];
  }

  /**
   * 删除股票
   */
  static deleteStock(id: string): Stock[] {
    console.warn('⚠️ deleteStock已废弃，请使用API删除股票');
    return [];
  }
}
