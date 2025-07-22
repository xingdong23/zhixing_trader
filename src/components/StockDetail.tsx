// 【知行交易】股票详情页面
// 整合股票基础信息和专家意见的详细页面

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StockOpinions } from './StockOpinions';
import { Stock, StockOpinion } from '@/types';
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Star,
  StarOff,
  MessageSquare,
  Info,
  Tag,
  Calendar,
  DollarSign,
  Volume2
} from 'lucide-react';

interface StockDetailProps {
  stock: Stock;
  onBack: () => void;
  onCreateTradingPlan: (stock: Stock) => void;
  onUpdateStock: (id: string, stock: Partial<Stock>) => void;
}

export function StockDetail({ 
  stock, 
  onBack, 
  onCreateTradingPlan,
  onUpdateStock 
}: StockDetailProps) {
  const [currentTab, setCurrentTab] = useState<'overview' | 'opinions'>('overview');
  const [opinions, setOpinions] = useState<StockOpinion[]>(stock.opinions || []);

  const getWatchLevelIcon = (level: string) => {
    switch (level) {
      case 'high': return <Star className="w-4 h-4 text-orange-500 fill-current" />;
      case 'medium': return <Star className="w-4 h-4 text-gray-400" />;
      case 'low': return <StarOff className="w-4 h-4 text-gray-300" />;
      default: return null;
    }
  };

  const getMarketFlag = (market: string) => {
    switch (market) {
      case 'US': return '🇺🇸';
      case 'HK': return '🇭🇰';
      case 'CN': return '🇨🇳';
      default: return '🌐';
    }
  };

  const getPriceChangeColor = (change?: number) => {
    if (!change) return 'text-gray-500';
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getPriceChangeIcon = (change?: number) => {
    if (!change) return null;
    return change >= 0 ? 
      <TrendingUp className="w-4 h-4" /> : 
      <TrendingDown className="w-4 h-4" />;
  };

  const handleAddOpinion = (opinionData: Omit<StockOpinion, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newOpinion: StockOpinion = {
      ...opinionData,
      id: `opinion_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setOpinions(prev => [newOpinion, ...prev]);

    // 更新股票的观点列表
    const updatedStock = {
      ...stock,
      opinions: [newOpinion, ...(stock.opinions || [])]
    };
    onUpdateStock(stock.id, updatedStock);
  };

  const handleUpdateOpinion = (id: string, opinionData: Partial<StockOpinion>) => {
    setOpinions(prev => prev.map(opinion =>
      opinion.id === id
        ? { ...opinion, ...opinionData, updatedAt: new Date() }
        : opinion
    ));

    // 更新股票的观点列表
    const updatedOpinions = opinions.map(opinion =>
      opinion.id === id
        ? { ...opinion, ...opinionData, updatedAt: new Date() }
        : opinion
    );
    onUpdateStock(stock.id, { opinions: updatedOpinions });
  };

  const handleDeleteOpinion = (id: string) => {
    setOpinions(prev => prev.filter(opinion => opinion.id !== id));

    // 更新股票的观点列表
    const updatedOpinions = opinions.filter(opinion => opinion.id !== id);
    onUpdateStock(stock.id, { opinions: updatedOpinions });
  };

  const tabs = [
    { id: 'overview', label: '股票概览', icon: Info },
    { id: 'opinions', label: '专家意见', icon: MessageSquare, count: opinions.filter(op => op.isActive).length }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getMarketFlag(stock.market)}</span>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {stock.symbol}
              </h1>
              <p className="text-gray-600">{stock.name}</p>
            </div>
            {getWatchLevelIcon(stock.tags.watchLevel)}
          </div>
        </div>
        <button
          onClick={() => onCreateTradingPlan(stock)}
          className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <BarChart3 className="w-5 h-5 mr-2" />
          制定交易计划
        </button>
      </div>

      {/* 价格信息卡片 */}
      {stock.currentPrice && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">当前价格</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${stock.currentPrice.toFixed(2)}
                </p>
              </div>
              {stock.priceChange && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">涨跌幅</p>
                  <div className={`flex items-center space-x-2 ${getPriceChangeColor(stock.priceChange)}`}>
                    {getPriceChangeIcon(stock.priceChange)}
                    <span className="text-xl font-bold">
                      {stock.priceChange > 0 ? '+' : ''}{stock.priceChange.toFixed(2)}
                    </span>
                    {stock.priceChangePercent && (
                      <span className="text-lg">
                        ({stock.priceChangePercent > 0 ? '+' : ''}{stock.priceChangePercent.toFixed(2)}%)
                      </span>
                    )}
                  </div>
                </div>
              )}
              {stock.volume && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">成交量</p>
                  <div className="flex items-center space-x-2">
                    <Volume2 className="w-4 h-4 text-gray-500" />
                    <span className="text-xl font-bold text-gray-900">
                      {(stock.volume / 1000000).toFixed(1)}M
                    </span>
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600 mb-1">市值规模</p>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  stock.tags.marketCap === 'large' ? 'bg-blue-100 text-blue-800' :
                  stock.tags.marketCap === 'mid' ? 'bg-green-100 text-green-800' :
                  'bg-orange-100 text-orange-800'
                }`}>
                  {stock.tags.marketCap === 'large' ? '大盘股' :
                   stock.tags.marketCap === 'mid' ? '中盘股' : '小盘股'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 标签页导航 */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  currentTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-2 bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 标签页内容 */}
      <div className="mt-6">
        {currentTab === 'overview' && (
          <StockOverview stock={stock} onUpdateStock={onUpdateStock} />
        )}

        {currentTab === 'opinions' && (
          <StockOpinions
            stockId={stock.id}
            opinions={opinions}
            onAddOpinion={handleAddOpinion}
            onUpdateOpinion={handleUpdateOpinion}
            onDeleteOpinion={handleDeleteOpinion}
          />
        )}
      </div>
    </div>
  );
}

// 股票概览组件
function StockOverview({
  stock,
  onUpdateStock
}: {
  stock: Stock;
  onUpdateStock: (id: string, stock: Partial<Stock>) => void;
}) {
  return (
    <div className="space-y-6">
      {/* 基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="w-5 h-5 mr-2 text-blue-500" />
            基本信息
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">股票信息</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">股票代码:</span>
                  <span className="font-medium">{stock.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">股票名称:</span>
                  <span className="font-medium">{stock.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">交易市场:</span>
                  <span className="font-medium">
                    {stock.market === 'US' ? '美股' :
                     stock.market === 'HK' ? '港股' : 'A股'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">市值规模:</span>
                  <span className="font-medium">
                    {stock.tags.marketCap === 'large' ? '大盘股' :
                     stock.tags.marketCap === 'mid' ? '中盘股' : '小盘股'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">关注程度:</span>
                  <span className="font-medium">
                    {stock.tags.watchLevel === 'high' ? '重点关注' :
                     stock.tags.watchLevel === 'medium' ? '一般关注' : '观察中'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">时间信息</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">添加时间:</span>
                  <span className="font-medium">{stock.addedAt.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">更新时间:</span>
                  <span className="font-medium">{stock.updatedAt.toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 行业标签 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Tag className="w-5 h-5 mr-2 text-green-500" />
            行业标签
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {stock.tags.industry.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 基本面标签 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-purple-500" />
            基本面标签
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {stock.tags.fundamentals.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 备注 */}
      {stock.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-orange-500" />
              备注信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed">{stock.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
