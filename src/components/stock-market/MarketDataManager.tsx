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
  // 分页
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface MarketDataActions {
  // 股票操作
  fetchStocks: (opts?: { page?: number; pageSize?: number; conceptId?: string }) => Promise<void>;
  addStock: (stockData: Omit<Stock, 'id' | 'addedAt' | 'updatedAt'>) => Promise<void>;
  updateStock: (id: string, stockData: Partial<Stock>) => Promise<void>;
  deleteStock: (id: string) => Promise<void>;
  // 分页操作
  changePage: (page: number) => Promise<void>;
  changePageSize: (pageSize: number) => Promise<void>;
  
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
    // 概念关联通过后端关联表维护，这里显式传递 concept_ids 以便后端更新关联
    concept_ids: stock.conceptIds,
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
    error: null,
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
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
  const fetchStocks = useCallback(async (opts?: { page?: number; pageSize?: number; conceptId?: string }) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      console.log('🔄 开始从API获取股票数据...');
      const page = opts?.page ?? state.page;
      const pageSize = opts?.pageSize ?? state.pageSize;
      const conceptId = opts?.conceptId;
      const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (conceptId) qs.set('concept_id', conceptId);
      const endpoint = `${API_ENDPOINTS.STOCKS}?${qs.toString()}`;
      console.log('📍 请求URL:', endpoint);
      const response = await apiGet(endpoint);
      
      console.log('📡 API响应状态:', response.status, response.statusText);
      
      if (response.ok) {
        const result = await response.json();
        console.log('📦 API响应数据:', result);
        
        if (result.success && result.data && result.data.stocks) {
          console.log('📊 原始股票数据:', result.data.stocks);
          const apiStocks = result.data.stocks.map(transformApiStockToStock);
          console.log('🔄 转换后的股票数据:', apiStocks);
          
          setState(prev => ({
            ...prev,
            stocks: apiStocks,
            isLoading: false,
            lastUpdated: new Date(),
            error: null,
            page: result.data.page ?? page,
            pageSize: result.data.pageSize ?? pageSize,
            total: result.data.total ?? apiStocks.length,
            totalPages: result.data.totalPages ?? Math.ceil((result.data.total ?? apiStocks.length) / (result.data.pageSize ?? pageSize))
          }));
          
          console.log(`✅ 从API获取到 ${apiStocks.length} 只股票`);
          return;
        } else {
          console.error('❌ API返回格式不正确:', { success: result.success, data: result.data });
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
  }, [state.page, state.pageSize]);

  const changePage = useCallback(async (page: number) => {
    await fetchStocks({ page });
  }, [fetchStocks]);

  const changePageSize = useCallback(async (pageSize: number) => {
    // 切到第1页
    await fetchStocks({ page: 1, pageSize });
  }, [fetchStocks]);

  // 从后端获取策略列表
  const fetchStrategies = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await apiGet(API_ENDPOINTS.STRATEGIES);
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }
      const result = await response.json();
      // 兼容多种结构：
      // 1) { success, data: { strategies: [...] } }
      // 2) { strategies: [...] }
      // 3) { data: [...] }
      let rawList = result?.data?.strategies ?? result?.strategies ?? result?.data ?? [];
      if (!Array.isArray(rawList)) {
        rawList = [];
      }
      const normalized: StockSelectionStrategy[] = (rawList || []).map((s: any) => ({
        id: String(s.id),
        name: s.name,
        description: s.description || '',
        category: s.category || 'indicator',
        // 将后端的 category 映射为前端分组用的 tradingType
        tradingType: (s.category === 'pullback') ? 'swing' : (s.category || 'swing'),
        // 兼容旧结构需要的字段
        technicalConditions: [],
        fundamentalConditions: [],
        priceConditions: [],
        conditions: { technical: [], fundamental: [], price: [] },
        parameters: {
          timeframe: s.timeframe || '1d',
          volumeThreshold: 0,
          priceChangeThreshold: 0,
          stabilizationHours: s.configuration?.parameters?.stabilization_hours,
          emaLength: s.configuration?.parameters?.ema_period,
          tolerancePercent: s.configuration?.parameters?.pullback_tolerance,
        },
        markets: ['US'],
        industries: [],
        sortBy: 'name',
        sortOrder: 'asc',
        maxResults: 1000,
        usageCount: 0,
        isActive: Boolean(s.enabled),
        isDefault: false,
        isSystemDefault: Boolean(s.is_system_default),
        createdAt: new Date(s.created_at || Date.now()),
        updatedAt: new Date(s.updated_at || Date.now()),
      }));

      setState(prev => ({
        ...prev,
        strategies: normalized,
        isLoading: false,
        lastUpdated: new Date(),
        error: null,
      }));
    } catch (error) {
      console.error('❌ 获取策略数据失败:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : '获取策略数据失败',
      }));
    }
  }, []);

  // 添加股票
  const addStock = useCallback(async (_stockData: Omit<Stock, 'id' | 'addedAt' | 'updatedAt'>) => {
    console.warn('添加股票功能请使用后端API，前端本地存储已废弃');
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
  const deleteStock = useCallback(async (_id: string) => {
    console.warn('删除股票功能请使用后端API，前端本地存储已废弃');
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
      const numericId = parseInt(strategyId, 10) || 1;

      const response = await apiPost(API_ENDPOINTS.STRATEGY_EXECUTE(numericId.toString()));

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
    await Promise.all([
      fetchStocks(),
      fetchStrategies(),
    ]);
  }, [fetchStocks, fetchStrategies]);

  // 初始化数据
  const initializeData = useCallback(async () => {
    if (state.isInitialized) return;
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await initDatabaseConcepts();
      await Promise.all([
        fetchStocks(),
        fetchStrategies(),
      ]);
      
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
  }, [state.isInitialized, initDatabaseConcepts, fetchStocks, fetchStrategies]);

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
      changePage,
      changePageSize,
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