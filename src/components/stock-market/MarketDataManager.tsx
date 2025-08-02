// 【知行交易】股票市场数据管理组件
// 处理股票数据的获取、更新、缓存和状态管理

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Stock, StockSelectionStrategy } from '@/types';
import { apiPost, apiGet, apiPut, API_ENDPOINTS } from '@/utils/api';

// 类型定义
export interface MarketDataState {
  stocks: Stock[];
  strategies: StockSelectionStrategy[];
  isLoading: boolean;
  isInitialized: boolean;
  lastUpdated: Date | null;
  error: string | null;
}

export interface MarketDataActions {
  // 股票操作
  fetchStocks: () => Promise<void>;
  addStock: (stockData: Omit<Stock, 'id' | 'addedAt' | 'updatedAt'>) => Promise<void>;
  updateStock: (id: string, stockData: Partial<Stock>) => Promise<void>;
  deleteStock: (id: string) => Promise<void>;
  
  // 策略操作
  createStrategy: (strategyData: Omit<StockSelectionStrategy, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateStrategy: (id: string, strategyData: Partial<StockSelectionStrategy>) => void;
  deleteStrategy: (id: string) => void;
  runStrategy: (strategyId: string) => Promise<any[]>;
  runAllStrategies: () => Promise<void>;
  
  // 数据管理
  refreshData: () => Promise<void>;
  initializeData: () => Promise<void>;
  clearError: () => void;
}

export interface UseMarketDataResult {
  state: MarketDataState;
  actions: MarketDataActions;
}

// 数据转换函数
function transformApiStockToStock(apiStock: any): Stock {
  return {
    id: `api_${apiStock.id}`,
    symbol: apiStock.symbol,
    name: apiStock.name,
    market: apiStock.market,
    tags: {
        industry: apiStock.industry || [], // 行业标签数组
        marketCap: apiStock.market_cap || 'mid' as const,
        watchLevel: apiStock.watch_level || 'medium' as const
      },
    conceptIds: apiStock.concept_ids || [], // 概念ID数组
    currentPrice: 0,
    priceChange: 0,
    priceChangePercent: 0,
    volume: 0,
    addedAt: new Date(apiStock.added_at),
    updatedAt: new Date(apiStock.updated_at),
    notes: apiStock.notes || '从数据库加载',
    opinions: []
  };
}

function transformStockToApiData(stock: Stock) {
  return {
    // industry_tags字段已移除
    // fundamental_tags字段已移除，概念通过关联表管理
    market_cap: stock.tags.marketCap,
    watch_level: stock.tags.watchLevel,
    // concept_ids字段已移除
    notes: stock.notes
  };
}

// 自定义Hook
export function useMarketData(): UseMarketDataResult {
  const [state, setState] = useState<MarketDataState>({
    stocks: [],
    strategies: [],
    isLoading: false,
    isInitialized: false,
    lastUpdated: null,
    error: null
  });

  // 初始化概念数据
  const initDatabaseConcepts = useCallback(async () => {
    try {
      const response = await apiPost(API_ENDPOINTS.CONCEPTS_INIT_SAMPLE);
      const result = await response.json();
      if (result.success) {
        console.log('✅ 概念数据初始化成功:', result.message);
      } else {
        console.warn('⚠️ 概念数据初始化失败:', result.error);
      }
    } catch (error) {
      console.error('❌ 初始化概念数据失败:', error);
      throw error;
    }
  }, []);

  // 获取股票数据
  const fetchStocks = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      console.log('🔄 开始从API获取股票数据...');
      const response = await apiGet(API_ENDPOINTS.STOCKS);
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data.stocks) {
          const apiStocks = result.data.stocks.map(transformApiStockToStock);
          
          setState(prev => ({
            ...prev,
            stocks: apiStocks,
            isLoading: false,
            lastUpdated: new Date(),
            error: null
          }));
          
          console.log(`✅ 从API获取到 ${apiStocks.length} 只股票`);
          return;
        } else {
          throw new Error('API返回格式不正确');
        }
      } else {
        throw new Error(`API请求失败: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ 获取股票数据失败:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : '获取股票数据失败'
      }));
    }
  }, []);

  // 添加股票
  const addStock = useCallback(async (stockData: Omit<Stock, 'id' | 'addedAt' | 'updatedAt'>) => {
    console.warn('本地存储功能已废弃，添加股票功能需要通过API实现');
    // TODO: 实现通过API添加股票的功能
  }, []);

  // 更新股票
  const updateStock = useCallback(async (id: string, stockData: Partial<Stock>) => {
    try {
      const stockToUpdate = state.stocks.find(s => s.id === id);
      if (!stockToUpdate) {
        throw new Error('未找到要更新的股票');
      }

      const apiData = {
        ...transformStockToApiData(stockToUpdate),
        ...transformStockToApiData({ ...stockToUpdate, ...stockData } as Stock)
      };

      const response = await apiPut(API_ENDPOINTS.STOCK_DETAIL(stockToUpdate.symbol), apiData);

      if (response.ok) {
        await fetchStocks(); // 重新获取数据
        console.log('✅ 股票信息更新成功');
      } else {
        throw new Error(`股票信息更新失败: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ 更新股票信息时发生错误:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '更新股票失败'
      }));
    }
  }, [state.stocks, fetchStocks]);

  // 删除股票
  const deleteStock = useCallback(async (id: string) => {
    console.warn('本地存储功能已废弃，删除股票功能需要通过API实现');
    // TODO: 实现通过API删除股票的功能
  }, []);

  // 创建策略
  const createStrategy = useCallback((strategyData: Omit<StockSelectionStrategy, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newStrategy: StockSelectionStrategy = {
      ...strategyData,
      id: `strategy_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setState(prev => ({
      ...prev,
      strategies: [...prev.strategies, newStrategy]
    }));
  }, []);

  // 更新策略
  const updateStrategy = useCallback((id: string, strategyData: Partial<StockSelectionStrategy>) => {
    setState(prev => ({
      ...prev,
      strategies: prev.strategies.map(strategy => 
        strategy.id === id 
          ? { ...strategy, ...strategyData, updatedAt: new Date() }
          : strategy
      )
    }));
  }, []);

  // 删除策略
  const deleteStrategy = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      strategies: prev.strategies.filter(strategy => strategy.id !== id)
    }));
  }, []);

  // 运行策略
  const runStrategy = useCallback(async (strategyId: string) => {
    try {
      const numericId = strategyId.includes('ema55_strategy') ? 1 :
                       strategyId.includes('strategy_') ? parseInt(strategyId.split('_').pop() || '1') : 1;

      const response = await apiPost(API_ENDPOINTS.STRATEGY_EXECUTE(numericId.toString()), {
        stocks: state.stocks.map(stock => ({
          symbol: stock.symbol,
          name: stock.name,
          currentPrice: stock.currentPrice,
          priceChange: stock.priceChange,
          priceChangePercent: stock.priceChangePercent,
          volume: stock.volume,
          tags: stock.tags
          // conceptIds 字段已移除，概念关联通过 concept_stock_relations 表管理
        }))
      });

      if (!response.ok) {
        throw new Error(`策略执行失败: ${response.status}`);
      }

      const results = await response.json();
      console.log(`策略 ${strategyId} 执行完成，选中 ${results.data?.length || 0} 只股票`);
      return results.data || [];
    } catch (error) {
      console.error('执行策略失败:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '执行策略失败'
      }));
      return [];
    }
  }, [state.stocks]);

  // 运行所有策略
  const runAllStrategies = useCallback(async () => {
    const activeStrategies = state.strategies.filter(s => s.isActive);
    
    try {
      const strategyPromises = activeStrategies.map(strategy => runStrategy(strategy.id));
      await Promise.all(strategyPromises);
      console.log('✅ 所有策略执行完成');
    } catch (error) {
      console.error('❌ 执行所有策略失败:', error);
    }
  }, [state.strategies, runStrategy]);

  // 刷新数据
  const refreshData = useCallback(async () => {
    await fetchStocks();
  }, [fetchStocks]);

  // 初始化数据
  const initializeData = useCallback(async () => {
    if (state.isInitialized) return;
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await initDatabaseConcepts();
      await fetchStocks();
      
      setState(prev => ({
        ...prev,
        isInitialized: true,
        isLoading: false
      }));
      
      console.log('✅ 数据初始化完成');
    } catch (error) {
      console.error('❌ 数据初始化失败:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : '数据初始化失败'
      }));
    }
  }, [state.isInitialized, initDatabaseConcepts, fetchStocks]);

  // 清除错误
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // 自动初始化
  useEffect(() => {
    if (!state.isInitialized) {
      initializeData();
    }
  }, [state.isInitialized, initializeData]);

  return {
    state,
    actions: {
      fetchStocks,
      addStock,
      updateStock,
      deleteStock,
      createStrategy,
      updateStrategy,
      deleteStrategy,
      runStrategy,
      runAllStrategies,
      refreshData,
      initializeData,
      clearError
    }
  };
}

// 默认导出
export default useMarketData;

// 工具函数导出
export const marketDataUtils = {
  transformApiStockToStock,
  transformStockToApiData,
  
  // 计算统计信息
  calculateStats: (stocks: Stock[], strategies: StockSelectionStrategy[]) => {
    return {
      totalStocks: stocks.length,
      totalStrategies: strategies.length,
      activeStrategies: strategies.filter(s => s.isActive).length,
      todayOpportunities: 0 // 暂时移除选股结果功能
    };
  },
  
  // 验证股票数据
  validateStock: (stock: Partial<Stock>): boolean => {
    return !!(stock.symbol && stock.name && stock.market);
  },
  
  // 验证策略数据
  validateStrategy: (strategy: Partial<StockSelectionStrategy>): boolean => {
    return !!(strategy.name && strategy.description);
  }
};