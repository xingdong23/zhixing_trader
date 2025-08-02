// 【知行交易】股票市场模块主界面
// 整合股票池管理、选股策略和选股结果的统一界面

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { StockPool } from './StockPool';
import { WatchlistImporter } from './WatchlistImporter';
import { ConceptManager } from './ConceptManager';
// import { StockPoolService } from '@/services/stockPoolService'; // 已废弃，使用API管理
import { StockDetail } from './StockDetail';
import { SelectionStrategies } from './SelectionStrategies';
import { Stock, StockSelectionStrategy, StockSelectionResult } from '@/types';
import { SelectedStock } from '@/types/strategy';
import { apiPost, apiGet, apiPut, API_ENDPOINTS, buildApiUrl } from '@/utils/api';
import {
  BarChart3,
  Calendar,
  Filter,
  Tag
} from 'lucide-react';

interface StockMarketProps {
  onCreateTradingPlan: (stock: Stock) => void; // 跳转到交易计划制定
}

export function StockMarket({ onCreateTradingPlan }: StockMarketProps) {
  console.log('🎯 StockMarket组件开始渲染');
  const [currentTab, setCurrentTab] = useState<'pool' | 'import' | 'concepts' | 'strategies'>('pool');
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  
  // 股票池数据
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // 数据初始化状态
  const [isDataInitialized, setIsDataInitialized] = useState(false);

  // 初始化数据库概念数据
  const initDatabaseConcepts = async () => {
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
    }
  };

  // 从后端API获取股票数据
  const fetchStocksFromAPI = async () => {
    console.log('🔄 开始从API获取股票数据...');
    try {
      const response = await apiGet(API_ENDPOINTS.STOCKS);
      console.log('📡 API响应状态:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('📊 API返回数据:', result);

        if (result.success && result.data.stocks) {
          // 转换后端数据格式为前端格式
          const apiStocks = result.data.stocks.map((apiStock: any) => ({
            id: `api_${apiStock.id}`,
            symbol: apiStock.symbol,
            name: apiStock.name,
            market: apiStock.market,
            tags: { 
              industry: [], // 行业标签保留用于兼容
              marketCap: apiStock.market_cap || 'mid' as const, 
              watchLevel: apiStock.watch_level || 'medium' as const 
            },
            conceptIds: apiStock.concept_ids || [], // 添加概念ID字段
            currentPrice: 0,
            priceChange: 0,
            priceChangePercent: 0,
            volume: 0,
            addedAt: new Date(apiStock.added_at),
            updatedAt: new Date(apiStock.updated_at),
            notes: apiStock.notes || '从数据库加载',
            opinions: []
          }));

          console.log(`✅ 从API获取到 ${apiStocks.length} 只股票，设置到状态中...`);
          console.log('📊 转换后的股票数据:', apiStocks);
          setStocks(apiStocks);
          console.log('✅ 股票状态已更新，当前stocks长度:', apiStocks.length);
          return;
        } else {
          console.warn('⚠️ API返回格式不正确:', result);
        }
      } else {
        console.warn('⚠️ API请求失败:', response.status, response.statusText);
      }

      // API获取失败，回退到本地数据
      console.warn('⚠️ API获取股票失败，使用本地数据');
      fallbackToLocalData();

    } catch (error) {
      console.error('❌ 获取股票数据失败:', error);
      fallbackToLocalData();
    }
  };

  // 回退到本地数据（仅在API完全失败时使用）
  const fallbackToLocalData = () => {
    console.warn('⚠️ API完全失败，回退到空数据状态');
    setStocks([]); // 不使用本地存储数据，保持数据一致性
  };
  
  // 策略数据
  const [strategies, setStrategies] = useState<StockSelectionStrategy[]>([]);
  
  // 使用useEffect确保只在客户端执行
  console.log('🔧 准备定义useEffect');
  console.log('🔍 useEffect定义前的状态检查 - isDataInitialized:', isDataInitialized);
  console.log('🔍 useEffect定义前的环境检查 - window存在:', typeof window !== 'undefined');
  
  useEffect(() => {
    console.log('🚀🚀🚀 useEffect终于开始执行了!!! 🚀🚀🚀');
    console.log('🔍 useEffect执行中，当前isDataInitialized:', isDataInitialized);
    console.log('🌍 检查客户端环境:', typeof window !== 'undefined');
    
    // 确保在客户端环境中执行
    if (typeof window !== 'undefined') {
      console.log('🚀🚀🚀 开始初始化数据!!! 🚀🚀🚀');
      if (!isDataInitialized) {
        setIsDataInitialized(true); // 先设置为true，避免重复调用
        fetchStocksFromAPI()
          .then(() => {
            console.log('✅ API数据获取成功');
          })
          .catch((error) => {
            console.error('❌ API数据获取失败:', error);
            setIsDataInitialized(false); // 失败时重置，允许重试
          });
      } else {
        console.log('⚠️ 数据已初始化，跳过重复初始化');
      }
    } else {
      console.log('⚠️ 服务端环境，跳过初始化');
    }
  }, [isDataInitialized]); // 依赖isDataInitialized状态

  // 股票池操作
  const handleAddStock = (stockData: Omit<Stock, 'id' | 'addedAt' | 'updatedAt'>) => {
    // 注意：本地存储功能已废弃，股票数据现在通过API管理
    console.warn('本地存储功能已废弃，添加股票功能需要通过API实现');
    // TODO: 实现通过API添加股票的功能
  };

  const handleUpdateStock = async (id: string, stockData: Partial<Stock>) => {
    try {
      // 找到要更新的股票
      const stockToUpdate = stocks.find(s => s.id === id);
      if (!stockToUpdate) {
        console.error('未找到要更新的股票:', id);
        return;
      }

      // 准备API数据格式
        const apiData = {
          // industry_tags字段已移除
          // fundamental_tags字段已移除，概念通过关联表管理
          market_cap: stockData.tags?.marketCap || stockToUpdate.tags.marketCap,
          watch_level: stockData.tags?.watchLevel || stockToUpdate.tags.watchLevel,
          concept_ids: stockData.conceptIds || stockToUpdate.conceptIds || [], // 添加概念ID数组
          notes: stockData.notes || stockToUpdate.notes
        };

      // 调用后端API更新股票
      const response = await apiPut(API_ENDPOINTS.STOCK_DETAIL(stockToUpdate.symbol), apiData);

      if (response.ok) {
        // API更新成功，重新获取股票数据
        await fetchStocksFromAPI();
        console.log('✅ 股票信息更新成功');
      } else {
        console.error('❌ 股票信息更新失败:', response.status);
        // 注意：本地存储功能已废弃，无法回退到本地更新
        console.warn('本地存储功能已废弃，无法回退到本地更新');
      }
    } catch (error) {
      console.error('❌ 更新股票信息时发生错误:', error);
      // 注意：本地存储功能已废弃，无法回退到本地更新
      console.warn('本地存储功能已废弃，无法回退到本地更新');
    }
  };

  const handleDeleteStock = (id: string) => {
    // 注意：本地存储功能已废弃，删除股票功能需要通过API实现
    console.warn('本地存储功能已废弃，删除股票功能需要通过API实现');
    // TODO: 实现通过API删除股票的功能
  };



  const handleViewStockDetail = (stock: Stock) => {
    setSelectedStock(stock);
  };

  const handleBackToList = () => {
    setSelectedStock(null);
  };

  // 策略操作
  const handleCreateStrategy = (strategyData: Omit<StockSelectionStrategy, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newStrategy: StockSelectionStrategy = {
      ...strategyData,
      id: `strategy_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setStrategies(prev => [...prev, newStrategy]);
  };

  const handleUpdateStrategy = (id: string, strategyData: Partial<StockSelectionStrategy>) => {
    setStrategies(prev => prev.map(strategy => 
      strategy.id === id 
        ? { ...strategy, ...strategyData, updatedAt: new Date() }
        : strategy
    ));
  };

  const handleDeleteStrategy = (id: string) => {
    setStrategies(prev => prev.filter(strategy => strategy.id !== id));
  };

  // 运行策略（调用真实后端API）
  const handleRunStrategy = async (strategyId: string): Promise<StockSelectionResult[]> => {
    try {
      // 将字符串ID转换为整数ID（简单映射）
      const numericId = strategyId.includes('ema55_strategy') ? 1 :
                       strategyId.includes('strategy_') ? parseInt(strategyId.split('_').pop() || '1') : 1;

      const response = await apiPost(API_ENDPOINTS.STRATEGY_EXECUTE(numericId.toString()), {
        stocks: stocks.map(stock => ({
          symbol: stock.symbol,
          name: stock.name,
          currentPrice: stock.currentPrice,
          priceChange: stock.priceChange,
          priceChangePercent: stock.priceChangePercent,
          volume: stock.volume,
          tags: stock.tags,
          conceptIds: stock.conceptIds || []
        }))
      });

      if (!response.ok) {
        throw new Error(`策略执行失败: ${response.status}`);
      }

      const results = await response.json();
      console.log(`策略 ${strategyId} 执行完成，选中 ${results.data?.length || 0} 只股票`);

      // 将SelectedStock转换为StockSelectionResult
      const convertedResults: StockSelectionResult[] = (results.data || []).map((selectedStock: SelectedStock, index: number) => ({
        stockId: selectedStock.stock.id,
        stock: selectedStock.stock,
        score: selectedStock.score,
        rank: index + 1,
        technicalScore: selectedStock.score * 0.4, // 假设技术面占40%
        fundamentalScore: selectedStock.score * 0.4, // 假设基本面占40%
        priceScore: selectedStock.score * 0.2, // 假设价格面占20%
        matchedConditions: selectedStock.reasons || [],
        warnings: [],
        recommendedAction: selectedStock.suggestedAction === 'buy' ? 'buy' : selectedStock.suggestedAction === 'sell' ? 'avoid' : 'watch',
        confidence: selectedStock.confidence || 'medium',
        reasoning: selectedStock.reasons?.join('; ') || selectedStock.suggestedAction || ''
      }));
      
      return convertedResults;

    } catch (error) {
      console.error('执行策略失败:', error);
      // 发生错误时返回空数组
      return [];
    }
  };



  // 统计数据
  const stats = useMemo(() => {
    const totalStocks = stocks.length;
    const totalStrategies = strategies.length;
    const activeStrategies = strategies.filter(s => s.isActive).length;
    const todayOpportunities = 0; // 移除选股结果功能

    return {
      totalStocks,
      totalStrategies,
      activeStrategies,
      todayOpportunities
    };
  }, [stocks, strategies]);

  const tabs = [
    { id: 'pool', label: '股票池', icon: BarChart3 },
    { id: 'import', label: '导入自选股', icon: Calendar },
    { id: 'concepts', label: '概念管理', icon: Tag },
    { id: 'strategies', label: '选股策略', icon: Filter }
  ];

  // 如果选中了股票，显示股票详情页
  if (selectedStock) {
    return (
      <StockDetail
        stock={selectedStock}
        onBack={handleBackToList}
        onCreateTradingPlan={onCreateTradingPlan}
        onUpdateStock={handleUpdateStock}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">

      {/* 统计信息 */}
      <div className="bg-white border border-gray-200 rounded p-4">
        <div className="grid grid-cols-4 gap-8">
          <div className="text-center">
            <p className="text-2xl font-semibold text-gray-900">{stats.totalStocks}</p>
            <p className="text-sm text-gray-600 mt-1">股票池</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-gray-900">{stats.totalStrategies}</p>
            <p className="text-sm text-gray-600 mt-1">选股策略</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-gray-900">{stats.activeStrategies}</p>
            <p className="text-sm text-gray-600 mt-1">启用策略</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-gray-900">{stats.todayOpportunities}</p>
            <p className="text-sm text-gray-600 mt-1">今日机会</p>
          </div>
        </div>
      </div>

      {/* 功能导航 */}
      <div className="bg-white border border-gray-200 rounded">
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex space-x-2">
            {tabs.map(tab => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id as any)}
                  className={`px-4 py-2 text-sm rounded border transition-colors flex items-center space-x-2 ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 标签页内容 */}
      <div className="mt-6">
        {currentTab === 'pool' && (
          <StockPool
            stocks={stocks}
            onAddStock={handleAddStock}
            onUpdateStock={handleUpdateStock}
            onDeleteStock={handleDeleteStock}
            onSelectStock={onCreateTradingPlan}
            onViewDetail={handleViewStockDetail}
          />
        )}

        {currentTab === 'import' && (
          <WatchlistImporter
            onImportComplete={async (importedStocks) => {
              // 导入完成后，重新从API获取股票数据
              await fetchStocksFromAPI();

              // 切换到股票池标签页查看结果
              setCurrentTab('pool');
            }}
          />
        )}

        {currentTab === 'concepts' && (
          <ConceptManager
            onConceptSelect={(conceptId) => {
              // 可以在这里处理概念选择，比如筛选股票池
              setCurrentTab('pool');
            }}
          />
        )}



        {currentTab === 'strategies' && (
          <SelectionStrategies
            strategies={strategies}
            stocks={stocks}
            onCreateStrategy={handleCreateStrategy}
            onUpdateStrategy={handleUpdateStrategy}
            onDeleteStrategy={handleDeleteStrategy}
            onRunStrategy={handleRunStrategy}
          />
        )}




      </div>
    </div>
  );
}



