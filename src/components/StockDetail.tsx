// 【知行交易】股票详情页面
// 整合股票基础信息和专家意见的详细页面

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
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
      case 'high': return <Star className="w-4 h-4 text-accent fill-current" />;
      case 'medium': return <Star className="w-4 h-4 text-text-muted" />;
      case 'low': return <StarOff className="w-4 h-4 text-text-muted" />;
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
    if (!change) return 'text-text-muted';
    return change >= 0 ? 'text-success' : 'text-danger';
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
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getMarketFlag(stock.market)}</span>
            <div>
              <h1 className="text-3xl font-bold text-text-primary">
                {stock.symbol}
              </h1>
              <p className="text-text-secondary">{stock.name}</p>
            </div>
            {getWatchLevelIcon(stock.tags.watchLevel)}
          </div>
        </div>
        <button
          onClick={() => onCreateTradingPlan(stock)}
          className="flex items-center px-6 py-3 bg-primary text-text-inverse rounded-lg hover:bg-primary-light transition-colors"
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
                <p className="text-sm text-text-secondary mb-1">当前价格</p>
                <p className="text-3xl font-bold text-text-primary">
                  ${stock.currentPrice.toFixed(2)}
                </p>
              </div>
              {stock.priceChange && (
                <div>
                  <p className="text-sm text-text-secondary mb-1">涨跌幅</p>
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
                  <p className="text-sm text-text-secondary mb-1">成交量</p>
                  <div className="flex items-center space-x-2">
                    <Volume2 className="w-4 h-4 text-text-muted" />
                    <span className="text-xl font-bold text-text-primary">
                      {(stock.volume / 1000000).toFixed(1)}M
                    </span>
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm text-text-secondary mb-1">市值规模</p>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  stock.tags.marketCap === 'large' ? 'bg-info/10 text-info' :
                  stock.tags.marketCap === 'mid' ? 'bg-success/10 text-success' :
                  'bg-warning/10 text-warning'
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
      <div className="border-b border">
        <nav className="flex space-x-8">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  currentTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-text-secondary hover:border'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-2 bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 标签页内容 */}
      <div>
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
            <Info className="w-5 h-5 mr-2 text-info" />
            基本信息
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-text-primary mb-3">股票信息</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">股票代码:</span>
                  <span className="font-medium text-text-primary">{stock.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">股票名称:</span>
                  <span className="font-medium text-text-primary">{stock.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">交易市场:</span>
                  <span className="font-medium text-text-primary">
                    {stock.market === 'US' ? '美股' :
                     stock.market === 'HK' ? '港股' : 'A股'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">市值规模:</span>
                  <span className="font-medium text-text-primary">
                    {stock.tags.marketCap === 'large' ? '大盘股' :
                     stock.tags.marketCap === 'mid' ? '中盘股' : '小盘股'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">关注程度:</span>
                  <span className="font-medium text-text-primary">
                    {stock.tags.watchLevel === 'high' ? '重点关注' :
                     stock.tags.watchLevel === 'medium' ? '一般关注' : '观察中'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-text-primary mb-3">时间信息</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">添加时间:</span>
                  <span className="font-medium text-text-primary">{stock.addedAt.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">更新时间:</span>
                  <span className="font-medium text-text-primary">{stock.updatedAt.toLocaleDateString()}</span>
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
            <Tag className="w-5 h-5 mr-2 text-success" />
            行业标签
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {stock.tags.industry.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-info/10 text-info text-sm rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 概念标签 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-accent" />
            概念标签
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {stock.conceptIds && stock.conceptIds.length > 0 ? (
              stock.conceptIds.map((conceptId, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-accent/10 text-accent text-sm rounded-full"
                >
                  {conceptId}
                </span>
              ))
            ) : (
              <span className="text-text-muted text-sm">暂无概念标签</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 备注 */}
      {stock.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-warning" />
              备注信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-text-secondary leading-relaxed">{stock.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
