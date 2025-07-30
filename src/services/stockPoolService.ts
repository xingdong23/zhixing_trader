import { Stock } from '@/types';
import { apiGet, API_ENDPOINTS } from '@/utils/api';

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
      const response = await apiGet(API_ENDPOINTS.STOCKS);

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
}
