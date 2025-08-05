// 【知行交易】股票数据列表组件
// 显示股票数据列表，支持搜索、筛选和删除操作

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui';
import { Button } from '@/components/ui';
import { cn } from '../../utils/cn';

// ==================== 类型定义 ====================

export interface StockDataItem {
  /** 股票代码 */
  symbol: string;
  /** 股票名称 */
  name: string;
  /** 行业 */
  industry: string;
  /** 总记录数 */
  totalRecords: number;
  /** 日线数据数量 */
  dailyRecords: number;
  /** 小时线数据数量 */
  hourlyRecords: number;
  /** 数据状态 */
  status: 'active' | 'inactive' | 'error' | 'updating';
  /** 最后更新时间 */
  lastUpdated: string;
  /** 数据质量评分 */
  qualityScore?: number;
  /** 市值 */
  marketCap?: number;
  /** 是否可删除 */
  deletable?: boolean;
}

export interface StockDataListProps {
  /** 股票数据列表 */
  data: StockDataItem[];
  /** 是否加载中 */
  loading?: boolean;
  /** 错误信息 */
  error?: string;
  /** 删除股票回调 */
  onDeleteStock?: (symbol: string) => Promise<void>;
  /** 刷新回调 */
  onRefresh?: () => void;
  /** 查看详情回调 */
  onViewDetails?: (symbol: string) => void;
  /** 自定义类名 */
  className?: string;
}

// ==================== 常量定义 ====================

/** 状态选项 */
const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'active', label: '活跃' },
  { value: 'inactive', label: '非活跃' },
  { value: 'error', label: '错误' },
  { value: 'updating', label: '更新中' },
];

/** 行业选项（示例） */
const INDUSTRY_OPTIONS = [
  { value: '', label: '全部行业' },
  { value: '银行', label: '银行' },
  { value: '证券', label: '证券' },
  { value: '保险', label: '保险' },
  { value: '房地产', label: '房地产' },
  { value: '医药生物', label: '医药生物' },
  { value: '电子', label: '电子' },
  { value: '计算机', label: '计算机' },
  { value: '通信', label: '通信' },
  { value: '汽车', label: '汽车' },
  { value: '机械设备', label: '机械设备' },
];

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
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

/** 获取状态显示信息 */
const getStatusInfo = (status: StockDataItem['status']) => {
  switch (status) {
    case 'active':
      return {
        label: '活跃',
        className: 'bg-green-100 text-green-800',
        icon: '●',
      };
    case 'inactive':
      return {
        label: '非活跃',
        className: 'bg-gray-100 text-gray-800',
        icon: '○',
      };
    case 'error':
      return {
        label: '错误',
        className: 'bg-red-100 text-red-800',
        icon: '✕',
      };
    case 'updating':
      return {
        label: '更新中',
        className: 'bg-blue-100 text-blue-800',
        icon: '↻',
      };
    default:
      return {
        label: '未知',
        className: 'bg-gray-100 text-gray-800',
        icon: '?',
      };
  }
};

/** 获取质量评分颜色 */
const getQualityScoreColor = (score: number): string => {
  if (score >= 90) return 'text-green-600';
  if (score >= 70) return 'text-yellow-600';
  return 'text-red-600';
};

// ==================== 子组件 ====================

/** 状态标签 */
const StatusBadge: React.FC<{ status: StockDataItem['status'] }> = ({ status }) => {
  const statusInfo = getStatusInfo(status);
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
      statusInfo.className
    )}>
      <span className="text-xs">{statusInfo.icon}</span>
      {statusInfo.label}
    </span>
  );
};

/** 质量评分显示 */
const QualityScore: React.FC<{ score?: number }> = ({ score }) => {
  if (score === undefined) {
    return <span className="text-gray-400">--</span>;
  }
  
  const colorClass = getQualityScoreColor(score);
  
  return (
    <span className={cn('font-medium', colorClass)}>
      {score}%
    </span>
  );
};

/** 数据统计显示 */
const DataStats: React.FC<{ 
  totalRecords: number;
  dailyRecords: number;
  hourlyRecords: number;
}> = ({ totalRecords, dailyRecords, hourlyRecords }) => {
  return (
    <div className="space-y-1">
      <div className="text-sm font-medium">
        总计: {formatNumber(totalRecords)}
      </div>
      <div className="text-xs text-gray-600 space-y-0.5">
        <div>日线: {formatNumber(dailyRecords)}</div>
        <div>小时: {formatNumber(hourlyRecords)}</div>
      </div>
    </div>
  );
};

/** 筛选控件 */
const FilterControls: React.FC<{
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  industryFilter: string;
  onIndustryFilterChange: (value: string) => void;
  onRefresh?: () => void;
  loading?: boolean;
}> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  industryFilter,
  onIndustryFilterChange,
  onRefresh,
  loading,
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="flex flex-col sm:flex-row gap-3 flex-1">
        <input
          placeholder="搜索股票代码或名称..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
          className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-md"
        />
        
        <select
          value={statusFilter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onStatusFilterChange(e.target.value)}
          className="w-full sm:w-32 px-3 py-2 border border-gray-300 rounded-md"
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        
        <select
          value={industryFilter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onIndustryFilterChange(e.target.value)}
          className="w-full sm:w-32 px-3 py-2 border border-gray-300 rounded-md"
        >
          {INDUSTRY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      
      {onRefresh && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
        >
          刷新
        </Button>
      )}
    </div>
  );
};

// ==================== 主要组件 ====================

/** 股票数据列表组件 */
export const StockDataList: React.FC<StockDataListProps> = ({
  data,
  loading = false,
  error,
  onDeleteStock,
  onRefresh,
  onViewDetails,
  className,
}) => {
  // 状态管理
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [sortField, setSortField] = useState<keyof StockDataItem>('symbol');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // 筛选和排序数据
  const filteredAndSortedData = useMemo(() => {
    let filtered = data;

    // 搜索筛选
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.symbol.toLowerCase().includes(term) ||
          item.name.toLowerCase().includes(term)
      );
    }

    // 状态筛选
    if (statusFilter) {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    // 行业筛选
    if (industryFilter) {
      filtered = filtered.filter((item) => item.industry === industryFilter);
    }

    // 排序
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const result = aValue.localeCompare(bValue);
        return sortDirection === 'asc' ? result : -result;
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        const result = aValue - bValue;
        return sortDirection === 'asc' ? result : -result;
      }
      
      return 0;
    });

    return filtered;
  }, [data, searchTerm, statusFilter, industryFilter, sortField, sortDirection]);

  // 表格列配置
  const columns = useMemo(() => [
    {
      key: 'symbol',
      title: '股票代码',
      sortable: true,
      render: (item: StockDataItem) => (
        <div className="space-y-1">
          <div className="font-medium text-gray-900">{item.symbol}</div>
          <div className="text-sm text-gray-600">{item.name}</div>
        </div>
      ),
    },
    {
      key: 'industry',
      title: '行业',
      sortable: true,
      render: (item: StockDataItem) => (
        <span className="text-sm text-gray-700">{item.industry}</span>
      ),
    },
    {
      key: 'totalRecords',
      title: '数据统计',
      sortable: true,
      render: (item: StockDataItem) => (
        <DataStats
          totalRecords={item.totalRecords}
          dailyRecords={item.dailyRecords}
          hourlyRecords={item.hourlyRecords}
        />
      ),
    },
    {
      key: 'status',
      title: '状态',
      sortable: true,
      render: (item: StockDataItem) => <StatusBadge status={item.status} />,
    },
    {
      key: 'qualityScore',
      title: '质量评分',
      sortable: true,
      render: (item: StockDataItem) => <QualityScore score={item.qualityScore} />,
    },
    {
      key: 'lastUpdated',
      title: '最后更新',
      sortable: true,
      render: (item: StockDataItem) => (
        <span className="text-sm text-gray-600">
          {formatDate(item.lastUpdated)}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      render: (item: StockDataItem) => (
        <div className="flex items-center gap-2">
          {onViewDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetails(item.symbol)}
            >
              查看
            </Button>
          )}
          
          {onDeleteStock && item.deletable !== false && (
                            <Button variant="danger" size="sm" onClick={() => onDeleteStock(item.symbol)}>
                              删除
                            </Button>
                          )}
        </div>
      ),
    },
  ], [onDeleteStock, onViewDetails]);

  // 处理排序
  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    setSortField(key as keyof StockDataItem);
    setSortDirection(direction);
  };

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
            <Button onClick={onRefresh}>
              重试
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* 标题和筛选控件 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">股票数据列表</h2>
          <div className="text-sm text-gray-600">
            共 {filteredAndSortedData.length} 条记录
          </div>
        </div>
        
        <FilterControls
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          industryFilter={industryFilter}
          onIndustryFilterChange={setIndustryFilter}
          onRefresh={onRefresh}
          loading={loading}
        />
      </div>

      {/* 数据表格 */}
      <Card>
        <div className="min-h-[400px]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 px-3">股票代码</th>
                  <th className="py-2 px-3">行业</th>
                  <th className="py-2 px-3">数据统计</th>
                  <th className="py-2 px-3">状态</th>
                  <th className="py-2 px-3">质量评分</th>
                  <th className="py-2 px-3">最后更新</th>
                  <th className="py-2 px-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-500">暂无股票数据</td>
                  </tr>
                ) : (
                  filteredAndSortedData.map((item) => (
                    <tr key={item.symbol} className="border-t">
                      <td className="py-2 px-3">
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900">{item.symbol}</div>
                          <div className="text-xs text-gray-600">{item.name}</div>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-sm text-gray-700">{item.industry}</span>
                      </td>
                      <td className="py-2 px-3">
                        <DataStats totalRecords={item.totalRecords} dailyRecords={item.dailyRecords} hourlyRecords={item.hourlyRecords} />
                      </td>
                      <td className="py-2 px-3">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="py-2 px-3">
                        <QualityScore score={item.qualityScore} />
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-sm text-gray-600">{formatDate(item.lastUpdated)}</span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          {onViewDetails && (
                            <Button variant="ghost" size="sm" onClick={() => onViewDetails(item.symbol)}>
                              查看
                            </Button>
                          )}
                          {onDeleteStock && item.deletable !== false && (
                            <Button variant="danger" size="sm" onClick={() => onDeleteStock(item.symbol)}>
                              删除
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ==================== 默认导出 ====================

export default StockDataList;