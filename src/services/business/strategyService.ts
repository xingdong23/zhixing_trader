// 【知行交易】策略业务服务

import { strategyApi } from '../api';
import { SelectionStrategy, SelectedStock, DailySelection, TradingPlaybook, TradingRecommendation } from '../../types/strategy';
import { ApiResponse } from '../../types/api';
import { VALIDATION_RULES, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../constants';

/**
 * 策略业务服务类
 * 封装策略相关的业务逻辑，提供高级策略操作
 */
export class StrategyBusinessService {
  
  // ==================== 选股策略管理 ====================
  
  /**
   * 获取所有策略（带状态统计）
   */
  async getAllStrategiesWithStats(): Promise<{
    strategies: SelectionStrategy[];
    stats: {
      total: number;
      active: number;
      inactive: number;
      lastRunTime?: Date;
    };
  }> {
    try {
      const response = await strategyApi.getAllStrategies();
      
      if (!response.success) {
        throw new Error(response.error || ERROR_MESSAGES.FETCH_STRATEGIES_FAILED);
      }
      
      const strategies = response.data || [];
      const stats = this.calculateStrategyStats(strategies);
      
      return { strategies, stats };
    } catch (error) {
      console.error('获取策略列表失败:', error);
      throw error;
    }
  }
  
  /**
   * 创建策略（带验证和默认值）
   */
  async createStrategy(strategyData: Partial<SelectionStrategy>): Promise<SelectionStrategy> {
    throw new Error('前端已禁用创建策略');
  }
  
  /**
   * 智能运行策略（单个或批量）
   */
  async runStrategies(
    strategyIds?: string[],
    onProgress?: (progress: number, current: number, total: number, currentStrategy?: string) => void
  ): Promise<{
    success: boolean;
    results: DailySelection[];
    errors: string[];
  }> {
    try {
      let targetStrategies: string[];
      
      if (strategyIds && strategyIds.length > 0) {
        targetStrategies = strategyIds;
      } else {
        // 获取所有启用的策略
        const strategiesResponse = await strategyApi.getAllStrategies();
        if (!strategiesResponse.success) {
          throw new Error('获取策略列表失败');
        }
        
        targetStrategies = (strategiesResponse.data || [])
          .filter(strategy => strategy.isActive)
          .map(strategy => strategy.id);
      }
      
      if (targetStrategies.length === 0) {
        return {
          success: true,
          results: [],
          errors: ['没有可运行的策略']
        };
      }
      
      const results: DailySelection[] = [];
      const errors: string[] = [];
      
      // 逐个运行策略（避免并发过多）
      for (let i = 0; i < targetStrategies.length; i++) {
        const strategyId = targetStrategies[i];
        
        try {
          // 获取策略信息用于进度显示
          const strategyResponse = await strategyApi.getStrategyById(strategyId);
          const strategyName = strategyResponse.data?.name || strategyId;
          
          // 更新进度
          if (onProgress) {
            onProgress(
              (i / targetStrategies.length) * 100,
              i,
              targetStrategies.length,
              strategyName
            );
          }
          
          // 运行策略
          const runResponse = await strategyApi.runStrategy(strategyId);
          
          if (runResponse.success && runResponse.data) {
            // 将SelectedStock[]包装成DailySelection格式
            const dailySelection: DailySelection = {
              id: `${strategyId}-${new Date().toISOString().split('T')[0]}`,
              date: new Date(),
              strategyResults: [{
                strategyId,
                strategyName,
                category: strategyResponse.data?.category || 'unknown',
                selectedStocks: runResponse.data,
                totalCount: runResponse.data.length
              }],
              summary: {
                totalStocks: runResponse.data.length,
                totalStrategies: 1,
                topOpportunities: runResponse.data.slice(0, 5) // 取前5个作为最佳机会
              },
              createdAt: new Date()
            };
            results.push(dailySelection);
          } else {
            errors.push(`策略 ${strategyName} 运行失败: ${runResponse.error}`);
          }
        } catch (error) {
          console.error(`运行策略 ${strategyId} 失败:`, error);
          errors.push(`策略 ${strategyId} 运行异常: ${error}`);
        }
      }
      
      // 完成进度
      if (onProgress) {
        onProgress(100, targetStrategies.length, targetStrategies.length);
      }
      
      return {
        success: errors.length < targetStrategies.length,
        results,
        errors
      };
    } catch (error) {
      console.error('运行策略失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取今日选股结果（带缓存）
   */
  async getTodaySelections(): Promise<DailySelection[]> {
    try {
      const response = await strategyApi.getTodaySelection();
      
      if (!response.success) {
        console.warn('获取今日选股结果失败:', response.error);
        return [];
      }
      
      return response.data ? [response.data] : [];
    } catch (error) {
      console.error('获取今日选股结果异常:', error);
      return [];
    }
  }
  
  /**
   * 获取策略表现统计
   */
  async getStrategyPerformance(strategyId: string, days: number = 30): Promise<{
    totalRuns: number;
    successRate: number;
    averageStocks: number;
    bestDay?: { date: string; stockCount: number };
    worstDay?: { date: string; stockCount: number };
    recentTrend: 'up' | 'down' | 'stable';
  }> {
    try {
      const response = await strategyApi.getStrategyPerformance(strategyId);
      
      if (!response.success) {
        throw new Error(response.error || '获取策略表现失败');
      }
      
      return response.data || this.getDefaultPerformance();
    } catch (error) {
      console.error('获取策略表现失败:', error);
      return this.getDefaultPerformance();
    }
  }
  
  // ==================== 交易剧本管理 ====================
  
  /**
   * 获取所有交易剧本
   */
  async getAllPlaybooks(): Promise<TradingPlaybook[]> {
    try {
      const response = await strategyApi.getAllPlaybooks();
      
      if (!response.success) {
        throw new Error(response.error || ERROR_MESSAGES.FETCH_PLAYBOOKS_FAILED);
      }
      
      return response.data || [];
    } catch (error) {
      console.error('获取交易剧本失败:', error);
      throw error;
    }
  }
  
  /**
   * 创建交易剧本（带模板支持）
   */
  async createPlaybook(
    playbookData: Partial<TradingPlaybook>,
    templateId?: string
  ): Promise<TradingPlaybook> {
    try {
      let completeData = playbookData;
      
      // 如果指定了模板，先获取模板数据
      if (templateId) {
        const templateResponse = await strategyApi.getPlaybookById(templateId);
        if (templateResponse.success && templateResponse.data) {
          const template = templateResponse.data;
          completeData = {
            ...template,
            ...playbookData,
            id: undefined, // 清除模板ID
            name: playbookData.name || `${template.name} - 副本`,
            createdAt: undefined,
            updatedAt: undefined
          };
        }
      }
      
      // 验证剧本数据
      this.validatePlaybookData(completeData);
      
      const response = await strategyApi.createPlaybook(completeData);
      
      if (!response.success) {
        throw new Error(response.error || ERROR_MESSAGES.CREATE_PLAYBOOK_FAILED);
      }
      
      return response.data!;
    } catch (error) {
      console.error('创建交易剧本失败:', error);
      throw error;
    }
  }
  
  // ==================== 交易推荐管理 ====================
  
  /**
   * 获取今日交易推荐
   */
  async getTodayRecommendations(): Promise<TradingRecommendation[]> {
    try {
      const response = await strategyApi.getTodayRecommendations();
      
      if (!response.success) {
        console.warn('获取今日推荐失败:', response.error);
        return [];
      }
      
      return response.data || [];
    } catch (error) {
      console.error('获取今日推荐异常:', error);
      return [];
    }
  }
  
  /**
   * 生成智能推荐（基于选股结果和剧本）
   */
  async generateSmartRecommendations(): Promise<TradingRecommendation[]> {
    try {
      // 获取今日选股结果
      const selections = await this.getTodaySelections();
      if (selections.length === 0) {
        return [];
      }
      
      // 获取可用的交易剧本
      const playbooks = await this.getAllPlaybooks();
      if (playbooks.length === 0) {
        return [];
      }
      
      const recommendations: TradingRecommendation[] = [];
      
      // 为每个选股结果匹配合适的剧本
      for (const selection of selections) {
        for (const strategyResult of selection.strategyResults) {
          for (const stock of strategyResult.selectedStocks) {
            // 简单的剧本匹配逻辑（可以根据需要扩展）
            const suitablePlaybook = this.findSuitablePlaybook(stock, playbooks);
          
            if (suitablePlaybook) {
              const currentPrice = stock.stock.currentPrice || 0;
               const recommendation: Partial<TradingRecommendation> = {
                 stockId: stock.stock.id,
                 stockSymbol: stock.stock.symbol,
                 stockName: stock.stock.name,
                 type: 'daily',
                 action: 'buy',
                 currentPrice: currentPrice,
                 entryPrice: stock.targetPrice || currentPrice,
                 stopLoss: stock.stopLoss || currentPrice * 0.95,
                 takeProfit: [stock.targetPrice || currentPrice * 1.1],
                 reason: stock.reasons.join('; '),
                 technicalAnalysis: stock.suggestedAction,
                 riskLevel: stock.confidence === 'high' ? 'low' : stock.confidence === 'medium' ? 'medium' : 'high',
                 positionSize: '5%',
                 timeframe: '1-3天',
                 publishedAt: new Date(),
                 expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时后过期
                 status: 'active',
                 confidence: Math.round(stock.score / 10) // 转换为1-10分
               };
              
              // 创建推荐
              const createResponse = await strategyApi.createRecommendation(recommendation);
              if (createResponse.success && createResponse.data) {
                recommendations.push(createResponse.data);
              }
            }
          }
        }
      }
      
      return recommendations;
    } catch (error) {
      console.error('生成智能推荐失败:', error);
      throw error;
    }
  }
  
  // ==================== 数据验证 ====================
  
  private validateStrategyData(strategyData: Partial<SelectionStrategy>): void {
    if (!strategyData.name) {
      throw new Error('策略名称不能为空');
    }
    
    if (strategyData.name.length > VALIDATION_RULES.MAX_STRATEGY_NAME_LENGTH) {
      throw new Error(`策略名称不能超过${VALIDATION_RULES.MAX_STRATEGY_NAME_LENGTH}个字符`);
    }
    
    if (!strategyData.conditions || 
        (strategyData.conditions.technical.length === 0 && 
         strategyData.conditions.fundamental.length === 0 && 
         strategyData.conditions.price.length === 0)) {
      throw new Error('策略条件不能为空');
    }
  }
  
  private validatePlaybookData(playbookData: Partial<TradingPlaybook>): void {
    if (!playbookData.name) {
      throw new Error('剧本名称不能为空');
    }
    
    if (!playbookData.template) {
      throw new Error('剧本模板不能为空');
    }
    
    if (!playbookData.template.buyingLogicTemplate) {
      throw new Error('买入逻辑模板不能为空');
    }
  }
  
  // ==================== 工具方法 ====================
  
  private calculateStrategyStats(strategies: SelectionStrategy[]) {
    const total = strategies.length;
    const active = strategies.filter(s => s.isActive).length;
    const inactive = total - active;
    
    // 找到最近更新时间作为最近运行时间的替代
    const lastUpdateTimes = strategies
      .map(s => s.updatedAt)
      .filter(time => time)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    return {
      total,
      active,
      inactive,
      lastRunTime: lastUpdateTimes.length > 0 ? new Date(lastUpdateTimes[0]) : undefined
    };
  }
  
  private setStrategyDefaults(strategyData: Partial<SelectionStrategy>): Partial<SelectionStrategy> {
    return {
      isActive: true,
      isSystemDefault: false,
      ...strategyData
    };
  }
  
  private getDefaultPerformance() {
    return {
      totalRuns: 0,
      successRate: 0,
      averageStocks: 0,
      recentTrend: 'stable' as const
    };
  }
  
  private findSuitablePlaybook(stock: SelectedStock, playbooks: TradingPlaybook[]): TradingPlaybook | null {
    // 简单的匹配逻辑，可以根据需要扩展
    // 例如：根据股票的行业、市值、技术指标等匹配合适的剧本
    
    if (playbooks.length === 0) return null;
    
    // 优先选择默认剧本或评分最高的剧本
    const defaultPlaybook = playbooks.find(p => p.isSystemDefault);
    if (defaultPlaybook) return defaultPlaybook;
    
    // 返回第一个可用的剧本
    return playbooks[0];
  }
}

// 创建策略业务服务实例
export const strategyService = new StrategyBusinessService();