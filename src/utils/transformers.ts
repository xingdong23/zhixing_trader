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
        code: String(data.code || '').trim().toUpperCase(),
        name: String(data.name || '').trim(),
        market: data.market || 'A',
        industry: data.industry || '',
        sector: data.sector || '',
        currentPrice: Number(data.currentPrice || data.current_price || 0),
        previousClose: Number(data.previousClose || data.previous_close || 0),
        change: Number(data.change || 0),
        changePercent: Number(data.changePercent || data.change_percent || 0),
        volume: Number(data.volume || 0),
        turnover: Number(data.turnover || 0),
        marketCap: Number(data.marketCap || data.market_cap || 0),
        pe: data.pe ? Number(data.pe) : undefined,
        pb: data.pb ? Number(data.pb) : undefined,
        dividend: data.dividend ? Number(data.dividend) : undefined,
        isActive: Boolean(data.isActive ?? data.is_active ?? true),
        createdAt: data.createdAt || data.created_at || new Date().toISOString(),
        updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
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
        totalCount: Number(data.totalCount || data.total_count || 0),
        totalValue: Number(data.totalValue || data.total_value || 0),
        avgChange: Number(data.avgChange || data.avg_change || 0),
        isActive: Boolean(data.isActive ?? data.is_active ?? true),
        createdAt: data.createdAt || data.created_at || new Date().toISOString(),
        updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
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
        category: data.category || '',
        stocks: Array.isArray(data.stocks)
          ? data.stocks.map(this.transformStock).filter(Boolean)
          : [],
        stockCount: Number(data.stockCount || data.stock_count || 0),
        avgChange: Number(data.avgChange || data.avg_change || 0),
        totalMarketCap: Number(data.totalMarketCap || data.total_market_cap || 0),
        isHot: Boolean(data.isHot ?? data.is_hot ?? false),
        isActive: Boolean(data.isActive ?? data.is_active ?? true),
        createdAt: data.createdAt || data.created_at || new Date().toISOString(),
        updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
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
        conditions: Array.isArray(data.conditions) ? data.conditions : [],
        isActive: Boolean(data.isActive ?? data.is_active ?? true),
        successRate: Number(data.successRate || data.success_rate || 0),
        avgReturn: Number(data.avgReturn || data.avg_return || 0),
        totalRuns: Number(data.totalRuns || data.total_runs || 0),
        lastRunAt: data.lastRunAt || data.last_run_at,
        createdAt: data.createdAt || data.created_at || new Date().toISOString(),
        updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
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
        strategyName: data.strategyName || data.strategy_name || '',
        stock: this.transformStock(data.stock),
        score: Number(data.score || 0),
        confidence: Number(data.confidence || 0),
        reason: data.reason || '',
        signals: Array.isArray(data.signals) ? data.signals : [],
        targetPrice: data.targetPrice ? Number(data.targetPrice) : undefined,
        stopLoss: data.stopLoss ? Number(data.stopLoss) : undefined,
        timeframe: data.timeframe || 'SHORT_TERM',
        createdAt: data.createdAt || data.created_at || new Date().toISOString()
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
        stock: this.transformStock(data.stock),
        action: data.action || 'BUY',
        price: Number(data.price || 0),
        targetPrice: data.targetPrice ? Number(data.targetPrice) : undefined,
        stopLoss: data.stopLoss ? Number(data.stopLoss) : undefined,
        quantity: Number(data.quantity || 0),
        confidence: Number(data.confidence || 0),
        reason: data.reason || '',
        timeframe: data.timeframe || 'SHORT_TERM',
        priority: data.priority || 'MEDIUM',
        status: data.status || 'PENDING',
        validUntil: data.validUntil || data.valid_until,
        createdAt: data.createdAt || data.created_at || new Date().toISOString(),
        updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
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
        stock: this.transformStock(data.stock),
        action: data.action || 'BUY',
        quantity: Number(data.quantity || 0),
        targetPrice: Number(data.targetPrice || data.target_price || 0),
        stopLoss: data.stopLoss ? Number(data.stopLoss) : undefined,
        takeProfit: data.takeProfit ? Number(data.takeProfit) : undefined,
        status: data.status || 'PENDING',
        priority: data.priority || 'MEDIUM',
        notes: data.notes || '',
        strategyId: data.strategyId || data.strategy_id,
        expectedReturn: data.expectedReturn ? Number(data.expectedReturn) : undefined,
        riskLevel: data.riskLevel || data.risk_level || 'MEDIUM',
        validUntil: data.validUntil || data.valid_until,
        createdAt: data.createdAt || data.created_at || new Date().toISOString(),
        updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
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
        stock: this.transformStock(data.stock),
        action: data.action || 'BUY',
        quantity: Number(data.quantity || 0),
        price: Number(data.price || 0),
        amount: Number(data.amount || 0),
        commission: Number(data.commission || 0),
        tax: Number(data.tax || 0),
        netAmount: Number(data.netAmount || data.net_amount || 0),
        status: data.status || 'PENDING',
        executedAt: data.executedAt || data.executed_at,
        notes: data.notes || '',
        emotion: data.emotion,
        disciplineRating: data.disciplineRating || data.discipline_rating,
        createdAt: data.createdAt || data.created_at || new Date().toISOString(),
        updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
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
        tradeId: data.tradeId || data.trade_id || '',
        executionPrice: Number(data.executionPrice || data.execution_price || 0),
        executionQuantity: Number(data.executionQuantity || data.execution_quantity || 0),
        executionTime: data.executionTime || data.execution_time || new Date().toISOString(),
        commission: Number(data.commission || 0),
        tax: Number(data.tax || 0),
        slippage: Number(data.slippage || 0),
        notes: data.notes || '',
        createdAt: data.createdAt || data.created_at || new Date().toISOString()
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