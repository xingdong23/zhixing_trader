'use client';

import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, Trash2, Download, Upload, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { apiGet, apiPost, apiDelete, API_ENDPOINTS } from '../utils/api';
import {
  DatabaseOverview,
  StockDataList,
  QualityReport,
  type DatabaseOverviewData,
  type StockDataItem,
  type QualityReportData,
} from './database';
import { Card, Button } from './shared';
import { cn } from '../utils/cn';

// 数据转换函数
const transformApiData = {
  overview: (apiData: any): DatabaseOverviewData => ({
    dateRange: {
      start: apiData.data_time_range?.earliest || '',
      end: apiData.data_time_range?.latest || '',
    },
    timeframes: apiData.supported_timeframes || [],
    totalRecords: apiData.total_kline_records || 0,
    symbolCount: apiData.total_stocks || 0,
    databaseSize: apiData.memory_usage?.estimated_memory_mb || 0,
    lastUpdated: new Date().toISOString(),
    qualityScore: 85, // 默认质量分数
    activeSymbols: apiData.symbols_with_data || 0,
  }),

  stockData: (apiData: any[]): StockDataItem[] => 
    apiData.map(item => ({
      symbol: item.symbol,
      name: item.name,
      industry: item.industry,
      totalRecords: item.total_records,
      dailyRecords: item.timeframe_data?.['1d']?.count || 0,
      hourlyRecords: item.timeframe_data?.['1h']?.count || 0,
      status: item.data_freshness?.['1d'] ? 'active' : 'inactive',
      lastUpdated: item.timeframe_data?.['1d']?.date_range?.end || '',
      qualityScore: 80, // 默认质量分数
      marketCap: 0, // 默认市值
      deletable: true,
    })),

  qualityReport: (apiData: any): QualityReportData => ({
    statistics: {
      overallScore: apiData.overall_score || 0,
      completenessScore: 85,
      accuracyScore: 90,
      consistencyScore: 80,
      timelinessScore: 75,
      totalRecords: apiData.total_symbols || 0,
      validRecords: apiData.total_symbols - apiData.issues_count || 0,
      problematicRecords: apiData.issues_count || 0,
      lastChecked: new Date().toISOString(),
    },
    issues: apiData.quality_issues?.map((issue: string, index: number) => ({
      id: `issue-${index}`,
      type: 'data_quality',
      severity: 'medium',
      description: issue,
      affectedStocks: 1,
      affectedRecords: 0,
      suggestion: '建议检查数据源',
      autoFixable: false,
      detectedAt: new Date().toISOString(),
    })) || [],
    recommendations: apiData.recommendations || [],
    trends: undefined,
  }),
};

export default function DatabaseAdmin() {
  const [mounted, setMounted] = useState(false);
  const [overview, setOverview] = useState<DatabaseOverviewData | null>(null);
  const [stocks, setStocks] = useState<StockDataItem[]>([]);
  const [qualityReport, setQualityReport] = useState<QualityReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'stocks' | 'quality'>('overview');

  // 加载所有数据
  const loadData = async () => {
    try {
      setLoading(true);
      setError(undefined);

      const [overviewRes, stocksRes, qualityRes] = await Promise.all([
        apiGet(API_ENDPOINTS.DATABASE_OVERVIEW),
        apiGet(API_ENDPOINTS.DATABASE_STOCKS),
        apiGet(API_ENDPOINTS.DATABASE_QUALITY),
      ]);

      const overviewData = await overviewRes.json();
      const stocksData = await stocksRes.json();
      const qualityData = await qualityRes.json();

      if (overviewData.success) {
        setOverview(transformApiData.overview(overviewData.overview));
      }
      if (stocksData.success) {
        setStocks(transformApiData.stockData(stocksData.stocks));
      }
      if (qualityData.success) {
        setQualityReport(transformApiData.qualityReport(qualityData.quality_report));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 刷新数据
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '刷新数据失败');
    } finally {
      setRefreshing(false);
    }
  };

  // 删除股票数据
  const handleDeleteStock = async (symbol: string) => {
    try {
      const url = `${API_ENDPOINTS.DATABASE_STOCK}/${symbol}`;
      const response = await apiDelete(url);
      const data = await response.json();
      
      if (data.success) {
        await loadData(); // 重新加载数据
      } else {
        setError('删除失败: ' + data.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除股票数据失败');
      console.error('删除股票数据失败:', err);
    }
  };

  // 修复质量问题
  const handleFixIssue = async (issueId: string) => {
    try {
      // 这里可以添加修复逻辑
      console.log('修复问题:', issueId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '修复问题失败');
    }
  };

  // 批量修复问题
  const handleBatchFix = async (issueIds: string[]) => {
    try {
      // 这里可以添加批量修复逻辑
      console.log('批量修复问题:', issueIds);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '批量修复失败');
    }
  };

  // 查看股票详情
  const handleViewStockDetails = (symbol: string) => {
    console.log('查看股票详情:', symbol);
  };

  // 组件加载时获取数据
  useEffect(() => {
    setMounted(true);
    loadData();
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
        <div>
          <h2 className="text-xl font-semibold text-gray-900">数据库管理后台</h2>
          <p className="text-gray-600 mt-1">管理股票数据、监控数据质量、查看系统概览</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            loading={refreshing}
            icon={
              <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            }
          >
            {refreshing ? '刷新中...' : '刷新数据'}
          </Button>
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

      {/* 标签页内容 */}
      <div className="space-y-6">
        {selectedTab === 'overview' && (
          <DatabaseOverview
            data={overview}
            loading={loading}
            error={error}
            onRefresh={handleRefresh}
          />
        )}

        {selectedTab === 'stocks' && (
          <StockDataList
            data={stocks}
            loading={loading}
            error={error}
            onDeleteStock={handleDeleteStock}
            onRefresh={handleRefresh}
            onViewDetails={handleViewStockDetails}
          />
        )}

        {selectedTab === 'quality' && (
          <QualityReport
            data={qualityReport}
            loading={loading}
            error={error}
            onRefresh={handleRefresh}
            onFixIssue={handleFixIssue}
            onBatchFix={handleBatchFix}
          />
        )}
      </div>
    </div>
  );
}
