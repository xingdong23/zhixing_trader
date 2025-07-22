// React Hook for managing Futu API data

import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient, { WatchlistGroup, QuoteData, ApiResponse } from '@/services/apiClient';

export interface FutuDataState {
  // 连接状态
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  
  // 自选股数据
  watchlistGroups: WatchlistGroup[];
  watchlistStats: any;
  
  // 行情数据
  quotes: Record<string, QuoteData>;
  quoteStats: any;
  
  // 最后更新时间
  lastUpdated: Date | null;
}

export interface FutuDataActions {
  // 连接管理
  checkConnection: () => Promise<boolean>;
  refreshConnection: () => Promise<void>;
  
  // 自选股操作
  loadWatchlist: () => Promise<void>;
  refreshWatchlist: () => Promise<void>;
  getGroupStocks: (groupId: string) => Promise<WatchlistGroup | null>;
  
  // 行情操作
  loadQuotes: (codes?: string[]) => Promise<void>;
  getQuoteDetail: (code: string) => Promise<QuoteData | null>;
  subscribeQuotes: (codes: string[]) => Promise<void>;
  unsubscribeQuotes: (codes: string[]) => Promise<void>;
  
  // 数据刷新
  refreshAll: () => Promise<void>;
}

export function useFutuData(): [FutuDataState, FutuDataActions] {
  const [state, setState] = useState<FutuDataState>({
    isConnected: false,
    isLoading: false,
    error: null,
    watchlistGroups: [],
    watchlistStats: null,
    quotes: {},
    quoteStats: null,
    lastUpdated: null,
  });

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  /**
   * 更新状态的辅助函数
   */
  const updateState = useCallback((updates: Partial<FutuDataState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * 设置错误状态
   */
  const setError = useCallback((error: string | null) => {
    updateState({ error, isLoading: false });
  }, [updateState]);

  /**
   * 检查API连接状态
   */
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const isConnected = await apiClient.isConnected();
      updateState({ isConnected });
      return isConnected;
    } catch (error) {
      console.error('Failed to check connection:', error);
      updateState({ isConnected: false });
      return false;
    }
  }, [updateState]);

  /**
   * 刷新连接
   */
  const refreshConnection = useCallback(async (): Promise<void> => {
    updateState({ isLoading: true, error: null });
    
    try {
      const connected = await apiClient.waitForConnection(5, 2000);
      updateState({ 
        isConnected: connected, 
        isLoading: false,
        error: connected ? null : 'Failed to connect to API server'
      });
    } catch (error) {
      setError(`Connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [updateState, setError]);

  /**
   * 加载自选股数据
   */
  const loadWatchlist = useCallback(async (): Promise<void> => {
    try {
      updateState({ isLoading: true, error: null });
      
      const [groupsResponse, statsResponse] = await Promise.all([
        apiClient.getWatchlistGroups(),
        apiClient.getWatchlistStats()
      ]);

      if (groupsResponse.success) {
        updateState({ 
          watchlistGroups: groupsResponse.data || [],
          watchlistStats: statsResponse.success ? statsResponse.data : null,
          lastUpdated: new Date(),
          isLoading: false
        });
      } else {
        setError(`Failed to load watchlist: ${groupsResponse.error}`);
      }
    } catch (error) {
      setError(`Failed to load watchlist: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [updateState, setError]);

  /**
   * 刷新自选股数据
   */
  const refreshWatchlist = useCallback(async (): Promise<void> => {
    try {
      updateState({ isLoading: true, error: null });
      
      const response = await apiClient.refreshWatchlist();
      
      if (response.success) {
        // 重新加载数据
        await loadWatchlist();
      } else {
        setError(`Failed to refresh watchlist: ${response.error}`);
      }
    } catch (error) {
      setError(`Failed to refresh watchlist: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [updateState, setError, loadWatchlist]);

  /**
   * 获取指定分组的股票
   */
  const getGroupStocks = useCallback(async (groupId: string): Promise<WatchlistGroup | null> => {
    try {
      const response = await apiClient.getGroupStocks(groupId);
      
      if (response.success) {
        return response.data || null;
      } else {
        console.error(`Failed to get group stocks: ${response.error}`);
        return null;
      }
    } catch (error) {
      console.error(`Failed to get group stocks: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }, []);

  /**
   * 加载行情数据
   */
  const loadQuotes = useCallback(async (codes?: string[]): Promise<void> => {
    try {
      updateState({ isLoading: true, error: null });
      
      const response = await apiClient.getQuotes(codes);
      
      if (response.success && response.data) {
        const quotesMap = response.data.reduce((acc, quote) => {
          acc[quote.code] = quote;
          return acc;
        }, {} as Record<string, QuoteData>);
        
        updateState({ 
          quotes: { ...state.quotes, ...quotesMap },
          lastUpdated: new Date(),
          isLoading: false
        });
      } else {
        setError(`Failed to load quotes: ${response.error}`);
      }
    } catch (error) {
      setError(`Failed to load quotes: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [updateState, setError, state.quotes]);

  /**
   * 获取单个股票的详细行情
   */
  const getQuoteDetail = useCallback(async (code: string): Promise<QuoteData | null> => {
    try {
      const response = await apiClient.getQuoteDetail(code);
      
      if (response.success && response.data) {
        // 更新本地缓存
        updateState({
          quotes: { ...state.quotes, [code]: response.data }
        });
        
        return response.data;
      } else {
        console.error(`Failed to get quote detail: ${response.error}`);
        return null;
      }
    } catch (error) {
      console.error(`Failed to get quote detail: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }, [updateState, state.quotes]);

  /**
   * 订阅实时行情
   */
  const subscribeQuotes = useCallback(async (codes: string[]): Promise<void> => {
    try {
      const response = await apiClient.subscribeQuotes(codes);
      
      if (!response.success) {
        console.error(`Failed to subscribe quotes: ${response.error}`);
      }
    } catch (error) {
      console.error(`Failed to subscribe quotes: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, []);

  /**
   * 取消订阅实时行情
   */
  const unsubscribeQuotes = useCallback(async (codes: string[]): Promise<void> => {
    try {
      const response = await apiClient.unsubscribeQuotes(codes);
      
      if (!response.success) {
        console.error(`Failed to unsubscribe quotes: ${response.error}`);
      }
    } catch (error) {
      console.error(`Failed to unsubscribe quotes: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, []);

  /**
   * 刷新所有数据
   */
  const refreshAll = useCallback(async (): Promise<void> => {
    updateState({ isLoading: true, error: null });
    
    try {
      // 并行刷新自选股和行情数据
      await Promise.all([
        refreshWatchlist(),
        loadQuotes()
      ]);
    } catch (error) {
      setError(`Failed to refresh data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [updateState, setError, refreshWatchlist, loadQuotes]);

  /**
   * 初始化数据加载
   */
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      
      const initializeData = async () => {
        // 检查连接
        const connected = await checkConnection();
        
        if (connected) {
          // 加载初始数据
          await Promise.all([
            loadWatchlist(),
            loadQuotes()
          ]);
        }
      };

      initializeData();
    }
  }, [checkConnection, loadWatchlist, loadQuotes]);

  /**
   * 设置定时刷新
   */
  useEffect(() => {
    if (state.isConnected) {
      // 每30秒刷新一次行情数据
      refreshIntervalRef.current = setInterval(() => {
        if (state.watchlistGroups.length > 0) {
          const allCodes = state.watchlistGroups.flatMap(group => 
            group.stocks.map(stock => stock.code)
          );
          loadQuotes(allCodes);
        }
      }, 30000);
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [state.isConnected, state.watchlistGroups, loadQuotes]);

  const actions: FutuDataActions = {
    checkConnection,
    refreshConnection,
    loadWatchlist,
    refreshWatchlist,
    getGroupStocks,
    loadQuotes,
    getQuoteDetail,
    subscribeQuotes,
    unsubscribeQuotes,
    refreshAll,
  };

  return [state, actions];
}
