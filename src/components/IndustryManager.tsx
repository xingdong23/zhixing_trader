'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { BarChart3, TrendingUp, Building2, Users, Eye, EyeOff } from 'lucide-react';
import { StockDataService } from '@/services/stockDataService';
import { Industry, ImportedStock } from '@/types';

export function IndustryManager() {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [stocks, setStocks] = useState<ImportedStock[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [showStocks, setShowStocks] = useState<Record<string, boolean>>({});

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const loadedIndustries = StockDataService.getIndustries();
    const loadedStocks = StockDataService.getImportedStocks();
    
    // 更新行业股票数量
    const updatedIndustries = loadedIndustries.map(industry => ({
      ...industry,
      stockCount: loadedStocks.filter(stock => stock.industryId === industry.id).length
    }));
    
    setIndustries(updatedIndustries);
    setStocks(loadedStocks);
  };

  // 获取行业统计
  const getIndustryStats = () => {
    const totalStocks = stocks.length;
    const totalIndustries = industries.length;
    const avgStocksPerIndustry = totalIndustries > 0 ? (totalStocks / totalIndustries).toFixed(1) : '0';
    const topIndustry = industries.reduce((max, industry) => 
      industry.stockCount > max.stockCount ? industry : max, 
      { stockCount: 0, name: '无' }
    );

    return {
      totalStocks,
      totalIndustries,
      avgStocksPerIndustry,
      topIndustry: topIndustry.name
    };
  };

  // 获取指定行业的股票
  const getStocksByIndustry = (industryId: string) => {
    return stocks.filter(stock => stock.industryId === industryId);
  };

  // 切换股票显示
  const toggleStockDisplay = (industryId: string) => {
    setShowStocks(prev => ({
      ...prev,
      [industryId]: !prev[industryId]
    }));
  };

  // 格式化市值
  const formatMarketCap = (marketCap?: number) => {
    if (!marketCap) return '-';
    if (marketCap >= 1e12) return `${(marketCap / 1e12).toFixed(1)}万亿`;
    if (marketCap >= 1e8) return `${(marketCap / 1e8).toFixed(1)}亿`;
    if (marketCap >= 1e4) return `${(marketCap / 1e4).toFixed(1)}万`;
    return marketCap.toString();
  };

  const stats = getIndustryStats();

  return (
    <div className="space-y-6">
      {/* 统计概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            行业分析概览
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.totalStocks}</div>
              <div className="text-sm text-blue-700">总股票数</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.totalIndustries}</div>
              <div className="text-sm text-green-700">行业数量</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.avgStocksPerIndustry}</div>
              <div className="text-sm text-purple-700">平均每行业</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-lg font-bold text-orange-600">{stats.topIndustry}</div>
              <div className="text-sm text-orange-700">最大行业</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 行业列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            行业分类详情
          </CardTitle>
        </CardHeader>
        <CardContent>
          {industries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无行业数据</p>
              <p className="text-sm">请先导入股票数据</p>
            </div>
          ) : (
            <div className="space-y-4">
              {industries
                .sort((a, b) => b.stockCount - a.stockCount)
                .map((industry) => {
                  const industryStocks = getStocksByIndustry(industry.id);
                  const isExpanded = showStocks[industry.id];
                  
                  return (
                    <div key={industry.id} className="border rounded-lg overflow-hidden">
                      {/* 行业标题 */}
                      <div 
                        className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => toggleStockDisplay(industry.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <div>
                              <h3 className="font-semibold text-gray-800">{industry.name}</h3>
                              {industry.description && (
                                <p className="text-sm text-gray-600">{industry.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-lg font-bold text-blue-600">{industry.stockCount}</div>
                              <div className="text-xs text-gray-500">只股票</div>
                            </div>
                            {isExpanded ? (
                              <EyeOff className="w-4 h-4 text-gray-400" />
                            ) : (
                              <Eye className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 股票列表 */}
                      {isExpanded && industryStocks.length > 0 && (
                        <div className="border-t">
                          <div className="max-h-60 overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                  <th className="px-4 py-2 text-left">代码</th>
                                  <th className="px-4 py-2 text-left">名称</th>
                                  <th className="px-4 py-2 text-left">市场</th>
                                  <th className="px-4 py-2 text-right">价格</th>
                                  <th className="px-4 py-2 text-right">涨跌幅</th>
                                  <th className="px-4 py-2 text-right">市值</th>
                                </tr>
                              </thead>
                              <tbody>
                                {industryStocks.map((stock, index) => (
                                  <tr key={stock.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="px-4 py-2 font-mono text-xs">{stock.symbol}</td>
                                    <td className="px-4 py-2">{stock.name}</td>
                                    <td className="px-4 py-2">
                                      <span className={`px-2 py-1 rounded text-xs ${
                                        stock.market === 'US' ? 'bg-blue-100 text-blue-800' :
                                        stock.market === 'HK' ? 'bg-green-100 text-green-800' :
                                        'bg-red-100 text-red-800'
                                      }`}>
                                        {stock.market}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      {stock.price ? stock.price.toFixed(2) : '-'}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      {stock.changePercent !== undefined ? (
                                        <span className={stock.changePercent >= 0 ? 'text-red-600' : 'text-green-600'}>
                                          {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                                        </span>
                                      ) : '-'}
                                    </td>
                                    <td className="px-4 py-2 text-right text-xs">
                                      {formatMarketCap(stock.marketCap)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
