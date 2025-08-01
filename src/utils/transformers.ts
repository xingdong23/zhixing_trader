/**
 * 数据转换工具函数
 * 提供统一的数据转换逻辑
 */

import { Stock, Concept } from '../types/stock';
import { TradingRecommendation } from '../types/analysis';
import { TradingPlan, TradeRecord, ExecutionRecord, TradingType } from '../types/trading';
import { MarketCap, WatchLevel, TradingEmotion, TradeStatus } from '../types/core';

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
          marketCap: data.marketCap > 100000000000 ? MarketCap.LARGE : data.marketCap > 10000000000 ? MarketCap.MID : MarketCap.SMALL,
          watchLevel: WatchLevel.MEDIUM
        },
        conceptIds: data.conceptIds || [],
        currentPrice: data.currentPrice || data.current_price,
        priceChange: data.change,
        priceChangePercent: data.changePercent || data.change_percent,
        volume: data.volume,
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
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
        // BaseEntity 属性
        id: data.id || `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(data.createdAt || Date.now()),
        updatedAt: new Date(data.updatedAt || Date.now()),
        
        // TaggedEntity 属性
        tags: data.tags || [],
        
        // TradingRecommendation 必需属性
        stockId: data.stockId || data.stock_id || '',
        stock: data.stock || { id: data.stockId || '', symbol: data.symbol || '', name: data.name || '' },
        type: data.type || 'BUY',
        source: data.source || 'ALGORITHM',
        confidence: Number(data.confidence || 50),
        priority: data.priority || 'medium',
        
        // 价格信息
        currentPrice: Number(data.currentPrice || data.price || 0),
        targetPrice: data.targetPrice ? Number(data.targetPrice) : undefined,
        stopLoss: data.stopLoss ? Number(data.stopLoss) : undefined,
        priceRange: data.priceRange || undefined,
        
        // 推荐理由
        title: data.title || '交易推荐',
        summary: data.summary || '',
        reasoning: data.reasoning || [],
        risks: data.risks || [],
        catalysts: data.catalysts || [],
        
        // 时间信息
        timeframe: data.timeframe || '',
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        
        // 跟踪信息
        isActive: data.isActive !== undefined ? data.isActive : true,
        isFollowed: data.isFollowed || false,
        followedAt: data.followedAt ? new Date(data.followedAt) : undefined,
        
        // 结果跟踪
        actualReturn: data.actualReturn ? Number(data.actualReturn) : undefined,
        maxReturn: data.maxReturn ? Number(data.maxReturn) : undefined,
        minReturn: data.minReturn ? Number(data.minReturn) : undefined,
        
        // 用户反馈
        userRating: data.userRating ? Number(data.userRating) : undefined,
        userNotes: data.userNotes || undefined
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
        tags: data.tags || [],
        notes: data.notes || '',
        stockId: data.symbol || data.stockId || '',
        strategyId: data.strategyId,
        tradingType: data.tradingType || TradingType.SHORT_TERM,
        title: data.title || '',
        description: data.description || '',
        entryPrice: Number(data.entryPrice || 0),
        stopLoss: Number(data.stopLoss || 0),
        takeProfit: Number(data.takeProfit || 0),
        plannedQuantity: Number(data.plannedQuantity || 0),
        maxInvestment: Number(data.maxInvestment || 0),
        addPositionLevels: data.addPositionLevels || [],
        takeProfitLevels: data.takeProfitLevels || [],
        entryConditions: data.entryConditions || [],
        exitConditions: data.exitConditions || [],
        status: data.status || TradeStatus.PLANNING,
        isActive: Boolean(data.isActive !== false),
        executedAt: data.executedAt ? new Date(data.executedAt) : undefined,
        actualEntryPrice: data.actualEntryPrice ? Number(data.actualEntryPrice) : undefined,
        actualQuantity: data.actualQuantity ? Number(data.actualQuantity) : undefined,
        maxLossAmount: Number(data.maxLossAmount || 0),
        riskLevel: data.riskLevel || 'medium',
        emotion: data.emotion || TradingEmotion.CALM,
        disciplineScore: data.disciplineScore ? Number(data.disciplineScore) : undefined,
        tradingRecords: data.tradingRecords || []
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
        // BaseEntity 属性
        id: data.id || '',
        createdAt: new Date(data.createdAt || data.created_at || Date.now()),
        updatedAt: new Date(data.updatedAt || data.updated_at || Date.now()),
        
        // TaggedEntity 属性
        tags: data.tags || [],
        
        // NotedEntity 属性
        notes: data.notes || '',
        
        // 计划关联
        planId: data.planId || data.plan_id || '',
        
        // 必需属性
        stockId: data.stockId || '',
        tradingType: data.tradingType || 'SHORT_TERM',
        
        // 交易基本信息
        action: data.action || 'BUY',
        quantity: Number(data.quantity || 0),
        price: Number(data.price || 0),
        amount: Number(data.amount || 0),
        commission: Number(data.commission || 0),
        
        // 时间信息
        executedAt: new Date(data.executedAt || Date.now()),
        
        // 市场信息
        marketPrice: Number(data.marketPrice || 0),
        marketCondition: data.marketCondition || '',
        
        // 决策信息
        reasoning: data.reasoning || '',
        emotion: data.emotion || 'CALM',
        infoSource: data.infoSource || 'SELF_RESEARCH',
        
        // 纪律评估
        followedPlan: Boolean(data.followedPlan !== false),
        disciplineRating: data.disciplineRating || data.discipline_rating || 'GOOD',
        disciplineNotes: data.disciplineNotes || data.discipline_notes || '',
        
        // 结果评估
        isProfit: data.isProfit,
        profitAmount: data.profitAmount ? Number(data.profitAmount) : undefined,
        profitRate: data.profitRate ? Number(data.profitRate) : undefined,
        
        // 复盘标记
        isReviewed: Boolean(data.isReviewed || false),
        reviewNotes: data.reviewNotes,
        reviewScore: data.reviewScore ? Number(data.reviewScore) : undefined
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
      // ExecutionRecord 需要更多必需属性，暂时返回基础结构
      return {
        id: data.id || `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        planId: data.planId || '',
        action: data.action || 'BUY',
        price: Number(data.price || data.execution_price || 0),
        quantity: Number(data.quantity || data.execution_quantity || 0),
        amount: Number(data.amount || 0),
        executedAt: new Date(data.executedAt || data.execution_time || Date.now()),
        status: data.status || 'COMPLETED',
        createdAt: new Date(data.createdAt || Date.now()),
        updatedAt: new Date(data.updatedAt || Date.now()),
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