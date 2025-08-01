// 【知行交易】交易业务服务

import { tradingApi } from '../api';
import { TradingPlan, TradeRecord, ExecutionRecord, TradingStats, LiveJournal, DisciplineStatus, TradeStatus, StrategyType } from '../../types/trading';
import { ApiResponse } from '../../types/api';
import { VALIDATION_RULES, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../constants';

/**
 * 交易业务服务类
 * 封装交易相关的业务逻辑，提供高级交易操作
 */
export class TradingBusinessService {
  
  // ==================== 交易计划管理 ====================
  
  /**
   * 获取活跃交易计划（带统计信息）
   */
  async getActiveTradingPlans(): Promise<{
    plans: TradingPlan[];
    stats: {
      total: number;
      active: number;
      pending: number;
      completed: number;
      totalValue: number;
    };
  }> {
    try {
      const response = await tradingApi.getAllTradingPlans();
      
      if (!response.success) {
        throw new Error(response.error || ERROR_MESSAGES.FETCH_TRADING_PLANS_FAILED);
      }
      
      const plans = response.data || [];
      const stats = this.calculatePlanStats(plans);
      
      return { plans, stats };
    } catch (error) {
      console.error('获取交易计划失败:', error);
      throw error;
    }
  }
  
  /**
   * 创建交易计划（带风险检查）
   */
  async createTradingPlan(
    planData: Partial<TradingPlan>,
    skipRiskCheck: boolean = false
  ): Promise<TradingPlan> {
    // 验证计划数据
    this.validateTradingPlanData(planData);
    
    try {
      // 风险检查
      if (!skipRiskCheck) {
        await this.performRiskCheck(planData);
      }
      
      // 设置默认值
      const completePlanData = this.setTradingPlanDefaults(planData);
      
      const response = await tradingApi.createTradingPlan(completePlanData);
      
      if (!response.success) {
        throw new Error(response.error || ERROR_MESSAGES.CREATE_TRADING_PLAN_FAILED);
      }
      
      return response.data!;
    } catch (error) {
      console.error('创建交易计划失败:', error);
      throw error;
    }
  }
  
  /**
   * 智能执行交易计划
   */
  async executeTradingPlan(
    planId: string,
    executionData: Partial<ExecutionRecord>
  ): Promise<ExecutionRecord> {
    try {
      // 获取交易计划
      const planResponse = await tradingApi.getTradingPlanById(planId);
      if (!planResponse.success || !planResponse.data) {
        throw new Error('交易计划不存在');
      }
      
      const plan = planResponse.data;
      
      // 验证计划状态
      if (plan.status !== 'active') {
        throw new Error('只能执行活跃状态的交易计划');
      }
      
      // 验证执行数据
      this.validateExecutionData(executionData, plan);
      
      // 添加执行记录
      const response = await tradingApi.addExecutionRecord(planId, executionData);
      
      if (!response.success) {
        throw new Error(response.error || ERROR_MESSAGES.ADD_EXECUTION_FAILED);
      }
      
      // 检查是否需要更新计划状态
      await this.checkAndUpdatePlanStatus(plan, response.data!);
      
      return response.data!;
    } catch (error) {
      console.error('执行交易计划失败:', error);
      throw error;
    }
  }
  
  /**
   * 批量创建交易计划（基于推荐）
   */
  async createPlansFromRecommendations(
    recommendations: any[],
    defaultSettings?: Partial<TradingPlan>
  ): Promise<{
    success: TradingPlan[];
    failed: { recommendation: any; error: string }[];
  }> {
    const success: TradingPlan[] = [];
    const failed: { recommendation: any; error: string }[] = [];
    
    for (const recommendation of recommendations) {
      try {
        const planData: Partial<TradingPlan> = {
          symbol: recommendation.stockSymbol,
          symbolName: recommendation.stockName,
          positionLayers: [{
            id: `layer-1-${Date.now()}`,
            layerIndex: 1,
            targetPrice: recommendation.entryPrice || recommendation.currentPrice,
            positionPercent: 10, // 默认10%仓位
            executed: false
          }],
          takeProfitLayers: [{
            id: `tp-1-${Date.now()}`,
            layerIndex: 1,
            targetPrice: recommendation.takeProfit?.[0] || recommendation.currentPrice * 1.1,
            sellPercent: 100,
            executed: false
          }],
          globalStopLoss: recommendation.stopLoss,
          maxTotalPosition: 10,
          maxLossPercent: 5,
          riskRewardRatio: 2,
          strategyType: 'SINGLE_ENTRY' as const,
          trailingStopEnabled: false,
          buyingLogic: {
            technical: recommendation.technicalAnalysis || '技术分析',
            fundamental: '基本面分析',
            news: '消息面分析'
          },
          ...defaultSettings
        };
        
        const plan = await this.createTradingPlan(planData, true); // 跳过风险检查以提高批量处理速度
        success.push(plan);
      } catch (error) {
        failed.push({
          recommendation,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return { success, failed };
  }
  
  // ==================== 交易记录管理 ====================
  
  /**
   * 获取交易历史（带筛选和分页）
   */
  async getTradingHistory(
    filters?: {
      stockSymbol?: string;
      dateFrom?: Date;
      dateTo?: Date;
      status?: string;
      minProfit?: number;
      maxLoss?: number;
    },
    pagination?: {
      page: number;
      pageSize: number;
    }
  ): Promise<{
    records: TradeRecord[];
    total: number;
    summary: {
      totalTrades: number;
      winRate: number;
      totalProfit: number;
      averageProfit: number;
    };
  }> {
    try {
      // 构建查询参数
      const response = await tradingApi.getAllTradeRecords();
      
      if (!response.success) {
        throw new Error(response.error || ERROR_MESSAGES.FETCH_TRADE_RECORDS_FAILED);
      }
      
      const records = response.data || [];
      const summary = this.calculateTradeSummary(records);
      
      return {
        records,
        total: records.length,
        summary
      };
    } catch (error) {
      console.error('获取交易历史失败:', error);
      throw error;
    }
  }
  
  /**
   * 分析交易表现
   */
  async analyzeTradingPerformance(period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<{
    overview: TradingStats;
    trends: {
      profitTrend: number[];
      winRateTrend: number[];
      volumeTrend: number[];
    };
    topPerformers: { symbol: string; profit: number; winRate: number }[];
    worstPerformers: { symbol: string; loss: number; winRate: number }[];
  }> {
    try {
      const [overviewResponse, trendsData] = await Promise.all([
        tradingApi.getTradingStats(period),
        this.getTradingTrends(period)
      ]);
      
      if (!overviewResponse.success) {
        throw new Error(overviewResponse.error || '获取交易统计失败');
      }
      
      const overview = overviewResponse.data || this.getDefaultTradingStats();
      
      // 获取个股表现
      const stockPerformance = await this.getStockPerformance(period);
      
      return {
        overview,
        trends: trendsData,
        topPerformers: stockPerformance.top,
        worstPerformers: stockPerformance.worst
      };
    } catch (error) {
      console.error('分析交易表现失败:', error);
      throw error;
    }
  }
  
  // ==================== 纪律管理 ====================
  
  /**
   * 检查交易纪律
   */
  async checkTradingDiscipline(planId: string): Promise<DisciplineStatus> {
    try {
      const response = await tradingApi.getDisciplineStatus(planId);
      
      if (!response.success) {
        throw new Error(response.error || '获取纪律状态失败');
      }
      
      return response.data || this.getDefaultDisciplineStatus();
    } catch (error) {
      console.error('检查交易纪律失败:', error);
      throw error;
    }
  }
  
  /**
   * 记录纪律违规
   */
  async recordDisciplineViolation(
    planId: string,
    violationType: string,
    description: string,
    severity: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<void> {
    try {
      const violationData = {
        type: violationType,
        description,
        severity,
        timestamp: new Date()
      };
      
      const response = await tradingApi.recordDisciplineViolation(planId, violationData);
      
      if (!response.success) {
        throw new Error(response.error || '记录纪律违规失败');
      }
    } catch (error) {
      console.error('记录纪律违规失败:', error);
      throw error;
    }
  }
  
  // ==================== 实时交易日志 ====================
  
  /**
   * 添加交易日志
   */
  async addTradingJournal(
    journalData: Partial<LiveJournal>
  ): Promise<LiveJournal> {
    try {
      // 验证日志数据
      this.validateJournalData(journalData);
      
      if (!journalData.tradeId) {
        throw new Error('交易ID不能为空');
      }
      
      const response = await tradingApi.addLiveJournal(journalData.tradeId, journalData);
      
      if (!response.success) {
        throw new Error(response.error || ERROR_MESSAGES.ADD_JOURNAL_FAILED);
      }
      
      return response.data!;
    } catch (error) {
      console.error('添加交易日志失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取今日交易日志
   */
  async getTodayJournals(): Promise<LiveJournal[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await tradingApi.getLiveJournals(today);
      
      if (!response.success) {
        console.warn('获取今日日志失败:', response.error);
        return [];
      }
      
      return response.data || [];
    } catch (error) {
      console.error('获取今日日志异常:', error);
      return [];
    }
  }
  
  // ==================== 数据验证 ====================
  
  private validateTradingPlanData(planData: Partial<TradingPlan>): void {
    if (!planData.symbol) {
      throw new Error('股票代码不能为空');
    }
    
    if (!planData.strategyType) {
      throw new Error('策略类型不能为空');
    }
    
    if (planData.maxTotalPosition && planData.maxTotalPosition <= 0) {
      throw new Error('最大总仓位必须大于0');
    }
    
    if (planData.globalStopLoss && planData.globalStopLoss <= 0) {
      throw new Error('全局止损价格必须大于0');
    }
  }
  
  private validateExecutionData(executionData: Partial<ExecutionRecord>, plan: TradingPlan): void {
    if (!executionData.price || executionData.price <= 0) {
      throw new Error('执行价格必须大于0');
    }
    
    if (!executionData.quantity || executionData.quantity <= 0) {
      throw new Error('执行数量必须大于0');
    }
    
    // 基本的执行数据验证
    if (!executionData.type) {
      throw new Error('执行类型不能为空');
    }
  }
  
  private validateJournalData(journalData: Partial<LiveJournal>): void {
    if (!journalData.observation || journalData.observation.trim().length === 0) {
      throw new Error('观察记录不能为空');
    }
    
    if (journalData.observation.length > VALIDATION_RULES.MAX_JOURNAL_LENGTH) {
      throw new Error(`观察记录不能超过${VALIDATION_RULES.MAX_JOURNAL_LENGTH}个字符`);
    }
  }
  
  // ==================== 工具方法 ====================
  
  private calculatePlanStats(plans: TradingPlan[]) {
    const total = plans.length;
    const active = plans.filter(p => p.status === TradeStatus.ACTIVE).length;
    const pending = plans.filter(p => p.status === TradeStatus.PLANNING).length;
    const completed = plans.filter(p => p.status === TradeStatus.CLOSED).length;
    
    const totalValue = plans
      .filter(p => p.status === TradeStatus.ACTIVE && p.maxTotalPosition)
      .reduce((sum, p) => sum + (p.maxTotalPosition || 0), 0);
    
    return { total, active, pending, completed, totalValue };
  }
  
  private setTradingPlanDefaults(planData: Partial<TradingPlan>): Partial<TradingPlan> {
    return {
      status: TradeStatus.PLANNING,
      strategyType: StrategyType.TECHNICAL,
      maxTotalPosition: 0.1,
      maxLossPercent: 0.05,
      riskRewardRatio: 2,
      trailingStopEnabled: false,
      disciplineLocked: false,
      ...planData
    };
  }
  
  private async performRiskCheck(planData: Partial<TradingPlan>): Promise<void> {
    try {
      // 如果有planId则进行风险检查
      if (planData.id) {
        const response = await tradingApi.performRiskCheck(planData.id);
        
        if (!response.success) {
          throw new Error(response.error || '风险检查失败');
        }
        
        const riskResult = response.data;
        if (riskResult && riskResult.riskLevel === 'high') {
          throw new Error(`风险过高: ${riskResult.warnings?.join(', ')}`);
        }
      }
      
      // 基本风险检查逻辑
      if (planData.maxTotalPosition && planData.maxTotalPosition > 0.5) {
        throw new Error('单个股票最大仓位不能超过50%');
      }
      
      if (planData.maxLossPercent && planData.maxLossPercent > 0.1) {
        throw new Error('单笔交易最大亏损不能超过10%');
      }
    } catch (error) {
      console.error('风险检查失败:', error);
      throw error;
    }
  }
  
  private async checkAndUpdatePlanStatus(plan: TradingPlan, execution: ExecutionRecord): Promise<void> {
    // 检查是否需要更新计划状态
    if (execution.type === 'BUY' && plan.status === TradeStatus.PLANNING) {
      await tradingApi.updateTradingPlan(plan.id, { status: TradeStatus.ACTIVE });
    }
  }
  
  private buildTradeHistoryQuery(filters?: any, pagination?: any): any {
    const query: any = {};
    
    if (filters) {
      if (filters.stockSymbol) query.stockSymbol = filters.stockSymbol;
      if (filters.dateFrom) query.dateFrom = filters.dateFrom.toISOString();
      if (filters.dateTo) query.dateTo = filters.dateTo.toISOString();
      if (filters.status) query.status = filters.status;
    }
    
    if (pagination) {
      query.page = pagination.page;
      query.pageSize = pagination.pageSize;
    }
    
    return query;
  }
  
  private calculateTradeSummary(records: TradeRecord[]) {
    const totalTrades = records.length;
    const winningTrades = records.filter(r => (r.totalPnL || 0) > 0).length;
    const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
    const totalProfit = records.reduce((sum, r) => sum + (r.totalPnL || 0), 0);
    const averageProfit = totalTrades > 0 ? totalProfit / totalTrades : 0;
    
    return { totalTrades, winRate, totalProfit, averageProfit };
  }
  
  private async getTradingTrends(period: string) {
    // 简化实现，实际应该从API获取
    return {
      profitTrend: [],
      winRateTrend: [],
      volumeTrend: []
    };
  }
  
  private async getStockPerformance(period: string) {
    // 简化实现，实际应该从API获取
    return {
      top: [],
      worst: []
    };
  }
  
  private getDefaultTradingStats(): TradingStats {
    return {
      totalCount: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalProfit: 0,
      totalLoss: 0,
      netProfit: 0,
      avgProfit: 0,
      avgLoss: 0,
      profitFactor: 0,
      totalPnL: 0,
      totalPnLPercent: 0,
      avgWinPercent: 0,
      avgLossPercent: 0,
      avgRiskRewardRatio: 0,
      maxDrawdown: 0,
      maxConsecutiveLosses: 0,
      maxConsecutiveWins: 0,
      byTradingType: {
        short_term: { trades: 0, winRate: 0, avgReturn: 0, totalProfit: 0 },
        swing: { trades: 0, winRate: 0, avgReturn: 0, totalProfit: 0 },
        value: { trades: 0, winRate: 0, avgReturn: 0, totalProfit: 0 }
      },
      disciplineScore: 0,
      planFollowRate: 0,
      emotionalTrades: 0,
      perfectExecutions: 0,
      poorExecutions: 0,
      avgHoldingPeriod: 0,
      avgHoldingDays: 0,
      tradingFrequency: 0,
      emotionBreakdown: {
        calm: 0,
        fomo: 0,
        fear: 0,
        greed: 0,
        revenge: 0,
        confident: 0,
        uncertain: 0
      },
      sourceBreakdown: {
        self_analysis: 0,
        friend_recommend: 0,
        news_media: 0,
        social_media: 0,
        professional_report: 0,
        technical_signal: 0
      },
      lastUpdated: new Date()
    };
  }
  
  private getDefaultDisciplineStatus(): DisciplineStatus {
    return {
      overallScore: 80,
      entryDiscipline: 80,
      exitDiscipline: 80,
      positionDiscipline: 80,
      violations: [],
      lastUpdated: new Date()
    };
  }
}

// 创建交易业务服务实例
export const tradingService = new TradingBusinessService();