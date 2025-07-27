// 【知行交易】股票市场模块主界面
// 整合股票池管理、选股策略和选股结果的统一界面

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StockPool } from './StockPool';
import { WatchlistImporter } from './WatchlistImporter';
import { IndustryManager } from './IndustryManager';
import { ConceptManager } from './ConceptManager';
import { StockPoolService } from '@/services/stockPoolService';
import { ConceptService } from '@/services/conceptService';
import { StockDetail } from './StockDetail';
import { runConceptTests } from '@/utils/testConceptSystem';
import { SelectionStrategies } from './SelectionStrategies';
import DataSyncManager from './DataSyncManager';
import DatabaseAdmin from './DatabaseAdmin';
import { Stock, SelectionStrategy } from '@/types';
import { generateSampleStocks } from '@/data/sampleStocks';
import { generateDefaultStrategies } from '@/data/defaultStrategies';
import {
  BarChart3,
  Target,
  Calendar,
  Filter,
  Tag,
  Database
} from 'lucide-react';

interface StockMarketProps {
  onCreateTradingPlan: (stock: Stock) => void; // 跳转到交易计划制定
}

export function StockMarket({ onCreateTradingPlan }: StockMarketProps) {
  const [currentTab, setCurrentTab] = useState<'pool' | 'import' | 'concepts' | 'strategies' | 'sync' | 'database'>('pool');
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  
  // 股票池数据
  const [stocks, setStocks] = useState<Stock[]>([]);

  // 初始化股票数据
  useEffect(() => {
    // 清除所有本地存储数据，确保只使用数据库数据
    localStorage.removeItem('stockPool');
    localStorage.removeItem('concepts');
    localStorage.removeItem('conceptStockRelations');

    // 初始化数据库中的概念数据
    initDatabaseConcepts();

    // 只从后端API获取真实的股票数据，不使用任何示例数据
    fetchStocksFromAPI();
  }, []);

  // 初始化数据库概念数据
  const initDatabaseConcepts = async () => {
    try {
      console.log('🔄 初始化数据库概念数据...');
      const response = await fetch('http://localhost:3001/api/v1/concepts/init-sample-data', {
        method: 'POST'
      });
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
      const response = await fetch('http://localhost:3001/api/v1/stocks/');
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
              industry: [apiStock.group_name || '未分类'],
              fundamentals: [],
              technical: []
            },
            conceptIds: [],
            watchLevel: 'normal' as const,
            currentPrice: 0,
            priceChange: 0,
            priceChangePercent: 0,
            volume: 0,
            addedAt: new Date(apiStock.added_at),
            updatedAt: new Date(apiStock.updated_at),
            notes: '从数据库加载',
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
  const [strategies, setStrategies] = useState<SelectionStrategy[]>(() => generateDefaultStrategies());
  


  // 股票池操作
  const handleAddStock = (stockData: Omit<Stock, 'id' | 'addedAt' | 'updatedAt'>) => {
    const updatedStocks = StockPoolService.addStock(stockData);
    setStocks(updatedStocks);
  };

  const handleUpdateStock = (id: string, stockData: Partial<Stock>) => {
    const updatedStocks = StockPoolService.updateStock(id, stockData);
    setStocks(updatedStocks);
  };

  const handleDeleteStock = (id: string) => {
    const updatedStocks = StockPoolService.deleteStock(id);
    setStocks(updatedStocks);
  };



  const handleViewStockDetail = (stock: Stock) => {
    setSelectedStock(stock);
  };

  const handleBackToList = () => {
    setSelectedStock(null);
  };

  // 策略操作
  const handleCreateStrategy = (strategyData: Omit<SelectionStrategy, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newStrategy: SelectionStrategy = {
      ...strategyData,
      id: `strategy_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setStrategies(prev => [...prev, newStrategy]);
  };

  const handleUpdateStrategy = (id: string, strategyData: Partial<SelectionStrategy>) => {
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
  const handleRunStrategy = async (strategyId: string): Promise<void> => {
    try {
      // 将字符串ID转换为整数ID（简单映射）
      const numericId = strategyId.includes('ema55_strategy') ? 1 :
                       strategyId.includes('strategy_') ? parseInt(strategyId.split('_').pop() || '1') : 1;

      const response = await fetch(`http://localhost:3001/api/v1/strategies/${numericId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`策略执行失败: ${response.status}`);
      }

      const results = await response.json();
      console.log(`策略 ${strategyId} 执行完成，选中 ${results.data?.length || 0} 只股票`);

    } catch (error) {
      console.error('执行策略失败:', error);
    }
  };

  // 运行所有启用的策略
  const handleRunAllStrategies = async () => {
    const activeStrategies = strategies.filter(s => s.isActive);

    // 并行执行所有策略
    const strategyPromises = activeStrategies.map(async strategy => {
      await handleRunStrategy(strategy.id);
    });

    await Promise.all(strategyPromises);

    // 运行完成后，可以在选股策略页面查看结果
    setCurrentTab('strategies');
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
    { id: 'strategies', label: '选股策略', icon: Filter },
    { id: 'sync', label: '数据同步', icon: Target },
    { id: 'database', label: '数据库管理', icon: Database }
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
          <div className="flex items-center justify-between">
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
            <button
              onClick={handleRunAllStrategies}
              disabled={strategies.filter(s => s.isActive).length === 0}
              className="px-3 py-1 bg-gray-800 text-white text-sm rounded hover:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              运行所有策略
            </button>
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
            onImportComplete={(importedStocks) => {
              // 导入完成后，重新加载所有股票数据
              const allStocks = StockPoolService.getAllStocks();
              setStocks(allStocks);

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



        {currentTab === 'sync' && (
          <DataSyncManager />
        )}

        {currentTab === 'database' && (
          <DatabaseAdmin />
        )}
      </div>
    </div>
  );
}



