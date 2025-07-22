/**
 * 富途自选股池组件
 * 集成富途OpenAPI数据，显示真实的自选股信息
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useFutuData } from '@/hooks/useFutuData';
import { 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Globe,
  Building2,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

interface FutuStockPoolProps {
  onCreateTradingPlan?: (stock: any) => void;
}

export function FutuStockPool({ onCreateTradingPlan }: FutuStockPoolProps) {
  const [futuData, futuActions] = useFutuData();
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  // 自动选择第一个分组
  useEffect(() => {
    if (futuData.watchlistGroups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(futuData.watchlistGroups[0].groupId);
    }
  }, [futuData.watchlistGroups, selectedGroupId]);

  // 获取当前选中分组的股票
  const currentGroup = futuData.watchlistGroups.find(g => g.groupId === selectedGroupId);
  const currentStocks = currentGroup?.stocks || [];

  // 格式化价格
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  // 格式化涨跌幅
  const formatChangeRate = (rate: number) => {
    const sign = rate >= 0 ? '+' : '';
    return `${sign}${rate.toFixed(2)}%`;
  };

  // 获取涨跌颜色
  const getChangeColor = (changeVal: number) => {
    if (changeVal > 0) return 'text-green-600';
    if (changeVal < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  // 获取市场图标
  const getMarketIcon = (market: string) => {
    switch (market) {
      case 'US': return <DollarSign className="w-4 h-4" />;
      case 'HK': return <Building2 className="w-4 h-4" />;
      case 'CN': return <Globe className="w-4 h-4" />;
      default: return <Globe className="w-4 h-4" />;
    }
  };

  // 连接状态指示器
  const ConnectionStatus = () => (
    <div className="flex items-center gap-2 text-sm">
      {futuData.isConnected ? (
        <>
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-green-600">富途API已连接</span>
        </>
      ) : (
        <>
          <AlertCircle className="w-4 h-4 text-orange-500" />
          <span className="text-orange-600">富途API未连接</span>
        </>
      )}
      {futuData.lastUpdated && (
        <span className="text-gray-500 ml-2">
          <Clock className="w-3 h-3 inline mr-1" />
          {new Date(futuData.lastUpdated).toLocaleTimeString()}
        </span>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 头部信息 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              富途自选股池
            </CardTitle>
            <div className="flex items-center gap-4">
              <ConnectionStatus />
              <button
                onClick={() => futuActions.refreshAll()}
                disabled={futuData.isLoading}
                className="flex items-center gap-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {futuData.isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                刷新数据
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {futuData.error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium">错误</span>
              </div>
              <p className="text-red-600 mt-1">{futuData.error}</p>
            </div>
          )}

          {/* 分组选择 */}
          {futuData.watchlistGroups.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择分组
              </label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {futuData.watchlistGroups.map((group) => (
                  <option key={group.groupId} value={group.groupId}>
                    {group.groupName} ({group.stocks.length} 只股票)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 统计信息 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {futuData.watchlistGroups.length}
              </div>
              <div className="text-sm text-blue-600">分组数量</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {futuData.watchlistGroups.reduce((sum, group) => sum + group.stocks.length, 0)}
              </div>
              <div className="text-sm text-green-600">总股票数</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {Object.keys(futuData.quotes).length}
              </div>
              <div className="text-sm text-purple-600">有行情数据</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 股票列表 */}
      <Card>
        <CardHeader>
          <CardTitle>
            {currentGroup ? `${currentGroup.groupName} (${currentStocks.length} 只股票)` : '选择分组查看股票'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentStocks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {futuData.watchlistGroups.length === 0 ? (
                <div>
                  <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>暂无自选股数据</p>
                  <p className="text-sm mt-2">请确保富途OpenD正在运行并点击刷新数据</p>
                </div>
              ) : (
                <p>该分组暂无股票</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {currentStocks.map((stock) => {
                const quote = futuData.quotes[stock.code];
                return (
                  <div
                    key={stock.code}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getMarketIcon(stock.market)}
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {stock.market}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {stock.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {stock.code}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {quote ? (
                        <>
                          <div className="text-right">
                            <div className="font-medium">
                              {formatPrice(quote.curPrice)}
                            </div>
                            <div className={`text-sm flex items-center gap-1 ${getChangeColor(quote.changeVal || 0)}`}>
                              {(quote.changeVal || 0) > 0 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (quote.changeVal || 0) < 0 ? (
                                <TrendingDown className="w-3 h-3" />
                              ) : (
                                <Minus className="w-3 h-3" />
                              )}
                              {formatChangeRate(quote.changeRate || 0)}
                            </div>
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            <div>成交量: {quote.volume?.toLocaleString() || 'N/A'}</div>
                            <div>更新: {quote.updateTime ? new Date(quote.updateTime).toLocaleTimeString() : 'N/A'}</div>
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-400">
                          暂无行情数据
                        </div>
                      )}

                      {onCreateTradingPlan && (
                        <button
                          onClick={() => onCreateTradingPlan(stock)}
                          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                        >
                          制定计划
                        </button>
                      )}
                    </div>
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
