// 【知行交易】股票市场模块主界面
// 整合股票池管理、选股策略和选股结果的统一界面

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StockPool } from './StockPool';
import { FutuStockPool } from './FutuStockPool';
import { StockDetail } from './StockDetail';
import { SelectionStrategies } from './SelectionStrategies';
import { TradingRecommendations } from './TradingRecommendations';
import { Stock, SelectionStrategy, DailySelection, SelectedStock, TradingRecommendation } from '@/types';
import { generateSampleStocks } from '@/data/sampleStocks';
import { generateDefaultStrategies } from '@/data/defaultStrategies';
import {
  BarChart3,
  Target,
  TrendingUp,
  Calendar,
  Star,
  ArrowRight,
  Zap,
  Filter
} from 'lucide-react';

interface StockMarketProps {
  onCreateTradingPlan: (stock: Stock) => void; // 跳转到交易计划制定
}

export function StockMarket({ onCreateTradingPlan }: StockMarketProps) {
  const [currentTab, setCurrentTab] = useState<'pool' | 'futu' | 'strategies' | 'results' | 'recommendations'>('pool');
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  
  // 股票池数据
  const [stocks, setStocks] = useState<Stock[]>(() => generateSampleStocks());
  
  // 策略数据
  const [strategies, setStrategies] = useState<SelectionStrategy[]>(() => generateDefaultStrategies());
  
  // 选股结果
  const [dailySelections, setDailySelections] = useState<DailySelection[]>([]);
  const [todaySelection, setTodaySelection] = useState<DailySelection | null>(null);

  // 操作建议数据
  const [recommendations, setRecommendations] = useState<TradingRecommendation[]>([]);

  // 股票池操作
  const handleAddStock = (stockData: Omit<Stock, 'id' | 'addedAt' | 'updatedAt'>) => {
    const newStock: Stock = {
      ...stockData,
      id: `stock_${Date.now()}`,
      addedAt: new Date(),
      updatedAt: new Date()
    };
    setStocks(prev => [...prev, newStock]);
  };

  const handleUpdateStock = (id: string, stockData: Partial<Stock>) => {
    setStocks(prev => prev.map(stock => 
      stock.id === id 
        ? { ...stock, ...stockData, updatedAt: new Date() }
        : stock
    ));
  };

  const handleDeleteStock = (id: string) => {
    setStocks(prev => prev.filter(stock => stock.id !== id));
  };

  // 操作建议操作
  const handleAddRecommendation = (recommendationData: Omit<TradingRecommendation, 'id' | 'publishedAt'>) => {
    const newRecommendation: TradingRecommendation = {
      ...recommendationData,
      id: `rec_${Date.now()}`,
      publishedAt: new Date()
    };
    setRecommendations(prev => [newRecommendation, ...prev]);
  };

  const handleUpdateRecommendation = (id: string, updates: Partial<TradingRecommendation>) => {
    setRecommendations(prev => prev.map(rec =>
      rec.id === id ? { ...rec, ...updates } : rec
    ));
  };

  const handleDeleteRecommendation = (id: string) => {
    setRecommendations(prev => prev.filter(rec => rec.id !== id));
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

  // 运行策略（模拟选股）
  const handleRunStrategy = (strategyId: string): SelectedStock[] => {
    const strategy = strategies.find(s => s.id === strategyId);
    if (!strategy) return [];

    // 模拟选股算法 - 随机选择一些股票作为结果
    const selectedStocks: SelectedStock[] = stocks
      .filter(() => Math.random() > 0.7) // 随机选择30%的股票
      .slice(0, 10) // 最多10只
      .map(stock => ({
        stock,
        score: Math.floor(Math.random() * 40) + 60, // 60-100分
        reasons: [
          '符合技术突破条件',
          '成交量放大明显',
          '基本面良好'
        ].slice(0, Math.floor(Math.random() * 3) + 1),
        suggestedAction: '建议关注，等待更好买点',
        targetPrice: stock.currentPrice ? stock.currentPrice * (1 + Math.random() * 0.2) : undefined,
        stopLoss: stock.currentPrice ? stock.currentPrice * (1 - Math.random() * 0.1) : undefined,
        confidence: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as any
      }))
      .sort((a, b) => b.score - a.score);

    return selectedStocks;
  };

  // 运行所有启用的策略
  const handleRunAllStrategies = () => {
    const activeStrategies = strategies.filter(s => s.isActive);
    const strategyResults = activeStrategies.map(strategy => ({
      strategyId: strategy.id,
      strategyName: strategy.name,
      category: strategy.category,
      selectedStocks: handleRunStrategy(strategy.id),
      totalCount: 0
    }));

    // 计算总数
    strategyResults.forEach(result => {
      result.totalCount = result.selectedStocks.length;
    });

    // 获取跨策略的最佳机会
    const allSelectedStocks = strategyResults.flatMap(result => result.selectedStocks);
    const topOpportunities = allSelectedStocks
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const newSelection: DailySelection = {
      id: `selection_${Date.now()}`,
      date: new Date(),
      strategyResults,
      summary: {
        totalStocks: allSelectedStocks.length,
        totalStrategies: activeStrategies.length,
        topOpportunities
      },
      createdAt: new Date()
    };

    setTodaySelection(newSelection);
    setDailySelections(prev => [newSelection, ...prev.slice(0, 9)]); // 保留最近10次
    setCurrentTab('results');
  };

  // 统计数据
  const stats = useMemo(() => {
    const totalStocks = stocks.length;
    const totalStrategies = strategies.length;
    const activeStrategies = strategies.filter(s => s.isActive).length;
    const todayOpportunities = todaySelection?.summary.totalStocks || 0;

    return {
      totalStocks,
      totalStrategies,
      activeStrategies,
      todayOpportunities
    };
  }, [stocks, strategies, todaySelection]);

  const tabs = [
    { id: 'pool', label: '股票池', icon: BarChart3 },
    { id: 'futu', label: '富途自选股', icon: Star },
    { id: 'strategies', label: '选股策略', icon: Target },
    { id: 'results', label: '选股结果', icon: TrendingUp },
    { id: 'recommendations', label: '操作建议', icon: Zap }
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

        {currentTab === 'futu' && (
          <FutuStockPool
            onCreateTradingPlan={onCreateTradingPlan}
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

        {currentTab === 'results' && (
          <SelectionResults
            todaySelection={todaySelection}
            historicalSelections={dailySelections}
            onCreateTradingPlan={onCreateTradingPlan}
          />
        )}

        {currentTab === 'recommendations' && (
          <TradingRecommendations
            recommendations={recommendations}
            onAddRecommendation={handleAddRecommendation}
            onUpdateRecommendation={handleUpdateRecommendation}
            onDeleteRecommendation={handleDeleteRecommendation}
          />
        )}
      </div>
    </div>
  );
}

// 选股结果展示组件
function SelectionResults({
  todaySelection,
  historicalSelections,
  onCreateTradingPlan
}: {
  todaySelection: DailySelection | null;
  historicalSelections: DailySelection[];
  onCreateTradingPlan: (stock: Stock) => void;
}) {
  const [selectedDate, setSelectedDate] = useState<string>('');

  const displaySelection = selectedDate
    ? historicalSelections.find(s => s.date.toDateString() === new Date(selectedDate).toDateString())
    : todaySelection;

  if (!displaySelection) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">暂无选股结果</p>
          <p className="text-sm text-gray-400">运行策略后查看选股机会</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 日期选择和汇总 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-500" />
              选股结果
            </CardTitle>
            <div className="flex items-center space-x-4">
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">今日结果</option>
                {historicalSelections.map(selection => (
                  <option key={selection.id} value={selection.date.toISOString()}>
                    {selection.date.toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{displaySelection.summary.totalStocks}</p>
              <p className="text-sm text-gray-600">选中股票</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{displaySelection.summary.totalStrategies}</p>
              <p className="text-sm text-gray-600">运行策略</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{displaySelection.summary.topOpportunities.length}</p>
              <p className="text-sm text-gray-600">重点机会</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 最佳机会 */}
      {displaySelection.summary.topOpportunities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="w-5 h-5 mr-2 text-orange-500" />
              今日最佳机会
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {displaySelection.summary.topOpportunities.map((opportunity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-600 rounded-full font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {opportunity.stock.symbol} - {opportunity.stock.name}
                      </h4>
                      <p className="text-sm text-gray-600">{opportunity.suggestedAction}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        {opportunity.reasons.slice(0, 2).map((reason, idx) => (
                          <span key={idx} className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{opportunity.score}/100</p>
                      <p className={`text-sm ${
                        opportunity.confidence === 'high' ? 'text-green-600' :
                        opportunity.confidence === 'medium' ? 'text-yellow-600' :
                        'text-gray-600'
                      }`}>
                        {opportunity.confidence === 'high' ? '高信心' :
                         opportunity.confidence === 'medium' ? '中信心' : '低信心'}
                      </p>
                    </div>
                    <button
                      onClick={() => onCreateTradingPlan(opportunity.stock)}
                      className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      制定计划
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 按策略分组的结果 */}
      <div className="space-y-4">
        {displaySelection.strategyResults.map(result => (
          <Card key={result.strategyId}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{result.strategyName}</span>
                <span className="text-sm text-gray-500">
                  {result.selectedStocks.length} 只股票
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.selectedStocks.length === 0 ? (
                <p className="text-gray-500 text-center py-4">暂无符合条件的股票</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {result.selectedStocks.map((selected, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">
                            {selected.stock.symbol} - {selected.stock.name}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">{selected.suggestedAction}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {selected.reasons.map((reason, idx) => (
                              <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {reason}
                              </span>
                            ))}
                          </div>
                          {selected.targetPrice && (
                            <p className="text-sm text-gray-600 mt-2">
                              目标价: ${selected.targetPrice.toFixed(2)}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end space-y-2 ml-4">
                          <div className="text-right">
                            <p className="font-bold text-gray-900">{selected.score}/100</p>
                            <p className={`text-xs ${
                              selected.confidence === 'high' ? 'text-green-600' :
                              selected.confidence === 'medium' ? 'text-yellow-600' :
                              'text-gray-600'
                            }`}>
                              {selected.confidence === 'high' ? '高' :
                               selected.confidence === 'medium' ? '中' : '低'}
                            </p>
                          </div>
                          <button
                            onClick={() => onCreateTradingPlan(selected.stock)}
                            className="px-2 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                          >
                            制定计划
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
