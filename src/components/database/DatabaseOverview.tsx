// 【知行交易】数据库概览组件
// 显示数据库基本信息和统计数据

import React from 'react';
import { Card, StatCard } from '../shared';
import { cn } from '../../utils/cn';

// ==================== 类型定义 ====================

export interface DatabaseOverviewData {
  /** 数据时间范围 */
  dateRange: {
    start: string;
    end: string;
  };
  /** 支持的时间周期 */
  timeframes: string[];
  /** 总记录数 */
  totalRecords: number;
  /** 符号数量 */
  symbolCount: number;
  /** 数据库大小 */
  databaseSize?: string;
  /** 最后更新时间 */
  lastUpdated?: string;
  /** 数据质量评分 */
  qualityScore?: number;
  /** 活跃符号数 */
  activeSymbols?: number;
}

export interface DatabaseOverviewProps {
  /** 概览数据 */
  data: DatabaseOverviewData | null;
  /** 是否加载中 */
  loading?: boolean;
  /** 错误信息 */
  error?: string;
  /** 刷新回调 */
  onRefresh?: () => void;
  /** 自定义类名 */
  className?: string;
}

// ==================== 工具函数 ====================

/** 格式化数字 */
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

/** 格式化日期 */
const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleDateString('zh-CN');
  } catch {
    return dateString;
  }
};

/** 获取质量评分颜色 */
const getQualityScoreColor = (score: number): string => {
  if (score >= 90) return 'text-green-600';
  if (score >= 70) return 'text-yellow-600';
  return 'text-red-600';
};

/** 获取质量评分描述 */
const getQualityScoreDescription = (score: number): string => {
  if (score >= 90) return '优秀';
  if (score >= 70) return '良好';
  if (score >= 50) return '一般';
  return '需要改进';
};

// ==================== 子组件 ====================

/** 数据范围信息 */
const DateRangeInfo: React.FC<{ dateRange: DatabaseOverviewData['dateRange'] }> = ({ dateRange }) => {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">数据时间范围</h4>
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>{formatDate(dateRange.start)}</span>
        <span className="text-gray-400">至</span>
        <span>{formatDate(dateRange.end)}</span>
      </div>
    </div>
  );
};

/** 时间周期信息 */
const TimeframesInfo: React.FC<{ timeframes: string[] }> = ({ timeframes }) => {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">支持的时间周期</h4>
      <div className="flex flex-wrap gap-1">
        {timeframes.map((timeframe) => (
          <span
            key={timeframe}
            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
          >
            {timeframe}
          </span>
        ))}
      </div>
    </div>
  );
};

/** 质量评分显示 */
const QualityScore: React.FC<{ score: number }> = ({ score }) => {
  const colorClass = getQualityScoreColor(score);
  const description = getQualityScoreDescription(score);
  
  return (
    <div className="flex items-center gap-2">
      <div className={cn('text-2xl font-bold', colorClass)}>
        {score}%
      </div>
      <div className="text-sm text-gray-600">
        {description}
      </div>
    </div>
  );
};

// ==================== 主要组件 ====================

/** 数据库概览组件 */
export const DatabaseOverview: React.FC<DatabaseOverviewProps> = ({
  data,
  loading = false,
  error,
  onRefresh,
  className,
}) => {
  if (error) {
    return (
      <Card className={cn('border-red-200', className)}>
        <div className="p-6 text-center">
          <div className="text-red-600 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">加载失败</h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors duration-200"
            >
              重试
            </button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* 标题和刷新按钮 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">数据库概览</h2>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <svg
              className={cn('w-4 h-4', loading && 'animate-spin')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            刷新
          </button>
        )}
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="总记录数"
          value={data ? formatNumber(data.totalRecords) : '--'}
          loading={loading}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        
        <StatCard
          title="符号数量"
          value={data ? data.symbolCount.toString() : '--'}
          loading={loading}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          }
        />
        
        {data?.activeSymbols !== undefined && (
          <StatCard
            title="活跃符号"
            value={data.activeSymbols.toString()}
            loading={loading}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
        )}
        
        {data?.qualityScore !== undefined && (
          <StatCard
            title="数据质量"
            value={`${data.qualityScore}%`}
            description={getQualityScoreDescription(data.qualityScore)}
            loading={loading}
            color={data.qualityScore >= 90 ? 'green' : data.qualityScore >= 70 ? 'orange' : 'red'}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            }
          />
        )}
      </div>

      {/* 详细信息 */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card loading={loading}>
            <div className="p-6 space-y-4">
              <DateRangeInfo dateRange={data.dateRange} />
              
              {data.lastUpdated && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">最后更新</h4>
                  <div className="text-sm text-gray-600">
                    {formatDate(data.lastUpdated)}
                  </div>
                </div>
              )}
              
              {data.databaseSize && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">数据库大小</h4>
                  <div className="text-sm text-gray-600">
                    {data.databaseSize}
                  </div>
                </div>
              )}
            </div>
          </Card>
          
          <Card loading={loading}>
            <div className="p-6">
              <TimeframesInfo timeframes={data.timeframes} />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

// ==================== 默认导出 ====================

export default DatabaseOverview;