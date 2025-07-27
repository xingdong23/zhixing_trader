'use client';

import React, { useState, useEffect } from 'react';

interface DatabaseOverview {
  total_stocks: number;
  total_kline_records: number;
  symbols_with_data: number;
  supported_timeframes: string[];
  data_time_range: {
    earliest: string | null;
    latest: string | null;
    span_days: number;
  };
  memory_usage: {
    total_records: number;
    estimated_memory_mb: number;
    symbols_count: number;
  };
}

interface StockDataSummary {
  symbol: string;
  name: string;
  industry: string;
  total_records: number;
  timeframe_data: {
    [key: string]: {
      count: number;
      date_range?: {
        start: string;
        end: string;
      };
      latest_price?: number;
    };
  };
  data_freshness: {
    [key: string]: boolean;
  };
  in_watchlist: boolean;
}

interface QualityReport {
  overall_score: number;
  total_symbols: number;
  issues_count: number;
  stale_data_count: number;
  incomplete_data_count: number;
  quality_issues: string[];
  recommendations: string[];
}

export default function DatabaseAdmin() {
  const [mounted, setMounted] = useState(false);
  const [overview, setOverview] = useState<DatabaseOverview | null>(null);
  const [stocks, setStocks] = useState<StockDataSummary[]>([]);
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'stocks' | 'quality'>('overview');
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  // 获取数据库概览
  const fetchOverview = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/v1/data/database/overview');
      const data = await response.json();
      if (data.success) {
        setOverview(data.overview);
      }
    } catch (error) {
      console.error('获取数据库概览失败:', error);
    }
  };

  // 获取股票数据汇总
  const fetchStocks = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/v1/data/database/stocks');
      const data = await response.json();
      if (data.success) {
        setStocks(data.stocks);
      }
    } catch (error) {
      console.error('获取股票数据失败:', error);
    }
  };

  // 获取数据质量报告
  const fetchQualityReport = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/v1/data/database/quality');
      const data = await response.json();
      if (data.success) {
        setQualityReport(data.quality_report);
      }
    } catch (error) {
      console.error('获取质量报告失败:', error);
    }
  };

  // 删除股票数据
  const deleteStockData = async (symbol: string, timeframe?: string) => {
    if (!confirm(`确定要删除股票 ${symbol} 的${timeframe ? timeframe : '所有'}数据吗？`)) {
      return;
    }

    try {
      const url = timeframe
        ? `http://localhost:3001/api/v1/data/database/stock/${symbol}?timeframe=${timeframe}`
        : `http://localhost:3001/api/v1/data/database/stock/${symbol}`;

      const response = await fetch(url, { method: 'DELETE' });
      const data = await response.json();
      
      if (data.success) {
        alert(data.message);
        fetchStocks(); // 刷新数据
        fetchOverview();
      } else {
        alert('删除失败: ' + data.message);
      }
    } catch (error) {
      console.error('删除股票数据失败:', error);
      alert('删除失败');
    }
  };

  // 组件加载时获取数据
  useEffect(() => {
    setMounted(true);
    fetchOverview();
    fetchStocks();
    fetchQualityReport();
  }, []);

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '无数据';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const formatMemorySize = (mb: number) => {
    if (mb < 1) return `${(mb * 1024).toFixed(1)} KB`;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  const getQualityColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getFreshnessIcon = (isFresh: boolean) => {
    return isFresh ? '🟢' : '🔴';
  };

  // 避免hydration错误
  if (!mounted) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">数据库管理后台</h2>
          <div className="text-sm font-medium text-gray-600">加载中...</div>
        </div>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-50 rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">数据库管理后台</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              fetchOverview();
              fetchStocks();
              fetchQualityReport();
            }}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            刷新数据
          </button>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="flex border-b mb-6">
        {[
          { id: 'overview', label: '数据概览' },
          { id: 'stocks', label: '股票数据' },
          { id: 'quality', label: '质量报告' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              selectedTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 数据概览标签页 */}
      {selectedTab === 'overview' && overview && (
        <div className="space-y-6">
          {/* 概览卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-600">总股票数</div>
              <div className="text-2xl font-bold text-blue-900">{overview.total_stocks}</div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-600">K线记录</div>
              <div className="text-2xl font-bold text-green-900">
                {overview.total_kline_records.toLocaleString()}
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-purple-600">有数据股票</div>
              <div className="text-2xl font-bold text-purple-900">{overview.symbols_with_data}</div>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-sm text-orange-600">内存使用</div>
              <div className="text-2xl font-bold text-orange-900">
                {formatMemorySize(overview.memory_usage.estimated_memory_mb)}
              </div>
            </div>
          </div>

          {/* 详细信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-medium mb-3">数据时间范围</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">最早数据:</span>
                  <span className="ml-2">{formatDateTime(overview.data_time_range.earliest)}</span>
                </div>
                <div>
                  <span className="text-gray-600">最新数据:</span>
                  <span className="ml-2">{formatDateTime(overview.data_time_range.latest)}</span>
                </div>
                <div>
                  <span className="text-gray-600">时间跨度:</span>
                  <span className="ml-2">{overview.data_time_range.span_days} 天</span>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-medium mb-3">支持的时间周期</h3>
              <div className="flex flex-wrap gap-2">
                {overview.supported_timeframes.map(tf => (
                  <span key={tf} className="px-2 py-1 bg-gray-100 text-gray-800 text-sm rounded">
                    {tf}
                  </span>
                ))}
              </div>
              
              <div className="mt-4 text-sm text-gray-600">
                <div>总记录数: {overview.memory_usage.total_records.toLocaleString()}</div>
                <div>符号数量: {overview.memory_usage.symbols_count}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 股票数据标签页 */}
      {selectedTab === 'stocks' && (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 mb-4">
            共 {stocks.length} 只股票有数据，总计 {stocks.reduce((sum, s) => sum + s.total_records, 0).toLocaleString()} 条K线记录
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">股票</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">行业</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">总记录</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">日线</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">小时线</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">数据状态</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stocks.map(stock => (
                  <tr key={stock.symbol} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <div>
                        <div className="font-medium">{stock.symbol}</div>
                        <div className="text-sm text-gray-500">{stock.name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-sm">{stock.industry}</td>
                    <td className="px-4 py-2 text-sm font-medium">{stock.total_records.toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm">
                      {stock.timeframe_data['1d']?.count || 0} 条
                      {stock.timeframe_data['1d']?.latest_price && (
                        <div className="text-xs text-gray-500">
                          ${stock.timeframe_data['1d'].latest_price.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {stock.timeframe_data['1h']?.count || 0} 条
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <div className="flex items-center gap-1">
                        <span title="日线数据新鲜度">{getFreshnessIcon(stock.data_freshness['1d'])}</span>
                        <span title="小时线数据新鲜度">{getFreshnessIcon(stock.data_freshness['1h'])}</span>
                        {stock.in_watchlist && <span title="在自选股中">⭐</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => deleteStockData(stock.symbol, '1d')}
                          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                          title="删除日线数据"
                        >
                          删日线
                        </button>
                        <button
                          onClick={() => deleteStockData(stock.symbol)}
                          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                          title="删除所有数据"
                        >
                          删全部
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 质量报告标签页 */}
      {selectedTab === 'quality' && qualityReport && (
        <div className="space-y-6">
          {/* 质量评分 */}
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">
              <span className={getQualityColor(qualityReport.overall_score)}>
                {qualityReport.overall_score}
              </span>
              <span className="text-gray-400">/100</span>
            </div>
            <div className="text-gray-600">数据质量评分</div>
          </div>

          {/* 统计信息 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{qualityReport.total_symbols}</div>
              <div className="text-sm text-gray-600">总股票数</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">{qualityReport.issues_count}</div>
              <div className="text-sm text-gray-600">发现问题</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{qualityReport.stale_data_count}</div>
              <div className="text-sm text-gray-600">过期数据</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{qualityReport.incomplete_data_count}</div>
              <div className="text-sm text-gray-600">不完整数据</div>
            </div>
          </div>

          {/* 问题列表 */}
          {qualityReport.quality_issues.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-medium mb-3 text-red-600">发现的问题</h3>
              <ul className="space-y-1">
                {qualityReport.quality_issues.map((issue, index) => (
                  <li key={index} className="text-sm text-gray-700 flex items-start">
                    <span className="text-red-500 mr-2">•</span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 建议 */}
          {qualityReport.recommendations.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-medium mb-3 text-blue-600">改进建议</h3>
              <ul className="space-y-1">
                {qualityReport.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-gray-700 flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
