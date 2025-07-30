/**
 * 数据转换工具函数
 * 提供统一的数据转换逻辑
 */

import { Stock, Concept } from '../types/stock';
import { TradingRecommendation } from '../types/strategy';
import { TradingPlan, TradeRecord, ExecutionRecord } from '../types/trading';

// 临时接口定义
interface StockPool {
  id: string;
  name: string;
  description?: string;
  stocks: Stock[];
  createdAt: Date;
  updatedAt: Date;
}

interface Strategy {
  id: string;
  name: string;
  description?: string;
  type: string;
  parameters: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface SelectionResult {
  id: string;
  strategyId: string;
  stocks: Stock[];
  score: number;
  createdAt: Date;
}

/**
 * 转换选项接口
 */
export interface TransformOptions {
  includeNulls?: boolean;
  dateFormat?: string;
  numberPrecision?: number;
  stringTrim?: boolean;
}

/**
 * 数据转换工具类
 */
export class DataTransformer {
  /**
   * 转换API响应数据为前端模型
   */
  static transformApiResponse<T>(data: any, transformer: (item: any) => T): T[] {
    if (!Array.isArray(data)) {
      return [];
    }
    
    return data.map(transformer).filter(Boolean);
  }
  
  /**
   * 转换股票数据
   */
  static transformStock(data: any): Stock | null {
    if (!data || typeof data !== 'object') {
      return null;
    }
    
    try {
      return {
        id: data.id || '',
        symbol: String(data.code || data.symbol || '').trim().toUpperCase(),
        name: String(data.name || '').trim(),
        market: data.market || 'CN',
        tags: {
          industry: data.industry ? [data.industry] : [],
          fundamentals: [],
          marketCap: data.marketCap > 100000000000 ? 'large' : data.marketCap > 10000000000 ? 'mid' : 'small',
          watchLevel: 'medium'
        },
        conceptIds: data.conceptIds || [],
        currentPrice: data.currentPrice || data.current_price,
        priceChange: data.change,
        priceChangePercent: data.changePercent || data.change_percent,
        volume: data.volume,
        addedAt: data.addedAt ? new Date(data.addedAt) : new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
        notes: data.notes,
        opinions: data.opinions || []
      };
    } catch (error) {
      console.error('Error transforming stock data:', error);
      return null;
    }
  }
  
  /**
   * 转换股票池数据
   */
  static transformStockPool(data: any): StockPool | null {
    if (!data || typeof data !== 'object') {
      return null;
    }
    
    try {
      return {
        id: data.id || '',
        name: String(data.name || '').trim(),
        description: data.description || '',
        stocks: Array.isArray(data.stocks) 
          ? data.stocks.map(this.transformStock).filter(Boolean)
          : [],
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
      };
    } catch (error) {
      console.error('Error transforming stock pool data:', error);
      return null;
    }
  }
  
  /**
   * 转换概念数据
   */
  static transformConcept(data: any): Concept | null {
    if (!data || typeof data !== 'object') {
      return null;
    }
    
    try {
      return {
        id: data.id || '',
        name: String(data.name || '').trim(),
        description: data.description || '',
        color: data.color || '',
        stockIds: Array.isArray(data.stockIds) ? data.stockIds : [],
        stockCount: Number(data.stockCount || data.stock_count || 0),
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
      };
    } catch (error) {
      console.error('Error transforming concept data:', error);
      return null;
    }
  }
  
  /**
   * 转换策略数据
   */
  static transformStrategy(data: any): Strategy | null {
    if (!data || typeof data !== 'object') {
      return null;
    }
    
    try {
      return {
        id: data.id || '',
        name: String(data.name || '').trim(),
        description: data.description || '',
        type: data.type || 'TECHNICAL',
        parameters: data.parameters || {},
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
      };
    } catch (error) {
      console.error('Error transforming strategy data:', error);
      return null;
    }
  }
  
  /**
   * 转换选股结果数据
   */
  static transformSelectionResult(data: any): SelectionResult | null {
    if (!data || typeof data !== 'object') {
      return null;
    }
    
    try {
      return {
        id: data.id || '',
        strategyId: data.strategyId || data.strategy_id || '',
        stocks: Array.isArray(data.stocks) 
          ? data.stocks.map(this.transformStock).filter(Boolean)
          : [],
        score: Number(data.score || 0),
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
      };
    } catch (error) {
      console.error('Error transforming selection result data:', error);
      return null;
    }
  }
  
  /**
   * 转换交易推荐数据
   */
  static transformTradingRecommendation(data: any): TradingRecommendation | null {
    if (!data || typeof data !== 'object') {
      return null;
    }
    
    try {
      return {
        id: data.id || '',
        stockId: data.stockId || data.stock_id || '',
        stockSymbol: data.stockSymbol || data.stock_symbol || '',
        stockName: data.stockName || data.stock_name || '',
        type: data.type || 'daily',
        action: data.action || 'buy',
        currentPrice: Number(data.currentPrice || data.price || 0),
        entryPrice: Number(data.entryPrice || data.price || 0),
        stopLoss: Number(data.stopLoss || 0),
        takeProfit: Array.isArray(data.takeProfit) ? data.takeProfit.map(Number) : [Number(data.targetPrice || 0)],
        reason: data.reason || '',
        technicalAnalysis: data.technicalAnalysis || data.technical_analysis || '',
        riskLevel: data.riskLevel || data.risk_level || 'medium',
        positionSize: data.positionSize || data.position_size || '',
        timeframe: data.timeframe || '',
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : new Date(),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: data.status || 'active',
        confidence: Number(data.confidence || 5)
      };
    } catch (error) {
      console.error('Error transforming trading recommendation data:', error);
      return null;
    }
  }
  
  /**
   * 转换交易计划数据
   */
  static transformTradingPlan(data: any): TradingPlan | null {
    if (!data || typeof data !== 'object') {
      return null;
    }
    
    try {
      return {
        id: data.id || '',
        createdAt: new Date(data.createdAt || data.created_at || Date.now()),
        updatedAt: new Date(data.updatedAt || data.updated_at || Date.now()),
        symbol: data.symbol || '',
        symbolName: data.symbolName || data.symbol_name || '',
        strategyType: data.strategyType || data.strategy_type || 'SINGLE_ENTRY',
        positionLayers: data.positionLayers || [],
        maxTotalPosition: Number(data.maxTotalPosition || data.max_total_position || 0),
        takeProfitLayers: data.takeProfitLayers || [],
        trailingStopEnabled: Boolean(data.trailingStopEnabled || data.trailing_stop_enabled),
        trailingStopPercent: data.trailingStopPercent ? Number(data.trailingStopPercent) : undefined,
        globalStopLoss: Number(data.globalStopLoss || data.global_stop_loss || 0),
        maxLossPercent: Number(data.maxLossPercent || data.max_loss_percent || 0),
        riskRewardRatio: Number(data.riskRewardRatio || data.risk_reward_ratio || 0),
        buyingLogic: {
          technical: data.buyingLogic?.technical || data.buying_logic?.technical || '',
          fundamental: data.buyingLogic?.fundamental || data.buying_logic?.fundamental || '',
          news: data.buyingLogic?.news || data.buying_logic?.news || ''
        },
        emotion: data.emotion || 'CALM',
        informationSource: data.informationSource || data.information_source || 'SELF_ANALYSIS',
        disciplineLocked: Boolean(data.disciplineLocked || data.discipline_locked),
        disciplineStatus: data.disciplineStatus || {
          overallScore: 0,
          entryDiscipline: 0,
          exitDiscipline: 0,
          positionDiscipline: 0,
          violations: [],
          lastUpdated: new Date()
        },
        planQualityScore: Number(data.planQualityScore || data.plan_quality_score || 0),
        chartSnapshot: data.chartSnapshot || data.chart_snapshot,
        playbookId: data.playbookId || data.playbook_id,
        status: data.status || 'PLANNING'
      };
    } catch (error) {
      console.error('Error transforming trading plan data:', error);
      return null;
    }
  }
  
  /**
   * 转换交易记录数据
   */
  static transformTradeRecord(data: any): TradeRecord | null {
    if (!data || typeof data !== 'object') {
      return null;
    }
    
    try {
      return {
        id: data.id || '',
        planId: data.planId || data.plan_id || '',
        createdAt: new Date(data.createdAt || data.created_at || Date.now()),
        updatedAt: new Date(data.updatedAt || data.updated_at || Date.now()),
        executions: data.executions || [],
        currentPosition: Number(data.currentPosition || data.current_position || 0),
        averageEntryPrice: Number(data.averageEntryPrice || data.average_entry_price || 0),
        totalInvested: Number(data.totalInvested || data.total_invested || 0),
        unrealizedPnL: Number(data.unrealizedPnL || data.unrealized_pnl || 0),
        realizedPnL: Number(data.realizedPnL || data.realized_pnl || 0),
        totalPnL: Number(data.totalPnL || data.total_pnl || 0),
        totalPnLPercent: Number(data.totalPnLPercent || data.total_pnl_percent || 0),
        firstEntryTime: data.firstEntryTime ? new Date(data.firstEntryTime) : undefined,
        lastExitTime: data.lastExitTime ? new Date(data.lastExitTime) : undefined,
        disciplineRating: data.disciplineRating || data.discipline_rating || 'GOOD',
        disciplineNotes: data.disciplineNotes || data.discipline_notes || '',
        tradingSummary: data.tradingSummary || data.trading_summary || '',
        lessonsLearned: data.lessonsLearned || data.lessons_learned || '',
        status: data.status || 'PLANNING'
      };
    } catch (error) {
      console.error('Error transforming trade record data:', error);
      return null;
    }
  }
  
  /**
   * 转换执行记录数据
   */
  static transformExecutionRecord(data: any): ExecutionRecord | null {
    if (!data || typeof data !== 'object') {
      return null;
    }
    
    try {
      return {
        id: data.id || '',
        type: data.type || 'BUY',
        layerId: data.layerId || data.layer_id,
        price: Number(data.price || data.execution_price || 0),
        quantity: Number(data.quantity || data.execution_quantity || 0),
        amount: Number(data.amount || 0),
        timestamp: new Date(data.timestamp || data.execution_time || Date.now()),
        deviation: Number(data.deviation || 0),
        notes: data.notes || ''
      };
    } catch (error) {
      console.error('Error transforming execution record data:', error);
      return null;
    }
  }
  
  /**
   * 转换为API请求格式
   */
  static toApiFormat(data: any, options: TransformOptions = {}): any {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    const {
      includeNulls = false,
      stringTrim = true
    } = options;
    
    const result: any = {};
    
    for (const [key, value] of Object.entries(data)) {
      // 跳过null/undefined值（如果不包含nulls）
      if (!includeNulls && (value === null || value === undefined)) {
        continue;
      }
      
      // 转换驼峰命名为下划线命名
      const apiKey = this.camelToSnake(key);
      
      // 处理字符串
      if (typeof value === 'string' && stringTrim) {
        result[apiKey] = value.trim();
      }
      // 处理日期
      else if (value instanceof Date) {
        result[apiKey] = value.toISOString();
      }
      // 处理数组
      else if (Array.isArray(value)) {
        result[apiKey] = value.map(item => this.toApiFormat(item, options));
      }
      // 处理对象
      else if (value && typeof value === 'object') {
        result[apiKey] = this.toApiFormat(value, options);
      }
      // 其他类型直接赋值
      else {
        result[apiKey] = value;
      }
    }
    
    return result;
  }
  
  /**
   * 驼峰命名转下划线命名
   */
  static camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
  
  /**
   * 下划线命名转驼峰命名
   */
  static snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
  
  /**
   * 深度克隆对象
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item)) as unknown as T;
    }
    
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    
    return cloned;
  }
  
  /**
   * 合并对象
   */
  static mergeObjects<T extends object>(target: T, ...sources: Partial<T>[]): T {
    const result = this.deepClone(target);
    
    for (const source of sources) {
      if (source && typeof source === 'object') {
        for (const key in source) {
          if (source.hasOwnProperty(key)) {
            const value = source[key];
            if (value !== undefined) {
              (result as any)[key] = value;
            }
          }
        }
      }
    }
    
    return result;
  }
  
  /**
   * 提取对象的指定字段
   */
  static pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const result = {} as Pick<T, K>;
    
    for (const key of keys) {
      if (key in obj) {
        result[key] = obj[key];
      }
    }
    
    return result;
  }
  
  /**
   * 排除对象的指定字段
   */
  static omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const result = { ...obj } as any;
    
    for (const key of keys) {
      delete result[key];
    }
    
    return result;
  }
  
  /**
   * 数组转换为映射
   */
  static arrayToMap<T, K extends keyof T>(array: T[], keyField: K): Map<T[K], T> {
    const map = new Map<T[K], T>();
    
    for (const item of array) {
      map.set(item[keyField], item);
    }
    
    return map;
  }
  
  /**
   * 数组分组
   */
  static groupBy<T, K extends keyof T>(array: T[], keyField: K): Record<string, T[]> {
    const groups: Record<string, T[]> = {};
    
    for (const item of array) {
      const key = String(item[keyField]);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    }
    
    return groups;
  }
  
  /**
   * 数组去重
   */
  static uniqueBy<T, K extends keyof T>(array: T[], keyField: K): T[] {
    const seen = new Set();
    return array.filter(item => {
      const key = item[keyField];
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}

/**
 * 导出常用转换函数
 */
export const transformStock = DataTransformer.transformStock;
export const transformStockPool = DataTransformer.transformStockPool;
export const transformConcept = DataTransformer.transformConcept;
export const transformStrategy = DataTransformer.transformStrategy;
export const transformSelectionResult = DataTransformer.transformSelectionResult;
export const transformTradingRecommendation = DataTransformer.transformTradingRecommendation;
export const transformTradingPlan = DataTransformer.transformTradingPlan;
export const transformTradeRecord = DataTransformer.transformTradeRecord;
export const transformExecutionRecord = DataTransformer.transformExecutionRecord;
export const toApiFormat = DataTransformer.toApiFormat;
export const camelToSnake = DataTransformer.camelToSnake;
export const snakeToCamel = DataTransformer.snakeToCamel;
export const deepClone = DataTransformer.deepClone;
export const mergeObjects = DataTransformer.mergeObjects;
export const pick = DataTransformer.pick;
export const omit = DataTransformer.omit;
export const arrayToMap = DataTransformer.arrayToMap;
export const groupBy = DataTransformer.groupBy;
export const uniqueBy = DataTransformer.uniqueBy;