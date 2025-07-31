// 【知行交易】数据库管理组件统一导出
// 提供数据库管理相关的所有组件和类型

// ==================== 组件导出 ====================

// 数据库概览组件
export { default as DatabaseOverview } from './DatabaseOverview';
export type { DatabaseOverviewProps, DatabaseOverviewData } from './DatabaseOverview';

// 股票数据列表组件
export { default as StockDataList } from './StockDataList';
export type { 
  StockDataListProps, 
  StockDataItem 
} from './StockDataList';

// 数据质量报告组件
export { default as QualityReport } from './QualityReport';
export type { 
  QualityReportProps, 
  QualityReportData, 
  QualityIssue, 
  QualityStatistics 
} from './QualityReport';

// ==================== 复合组件 ====================

// 注意：DatabaseAdmin组件已重构为独立文件，不在此模块中导出
// 如需使用DatabaseAdmin，请直接从 '../DatabaseAdmin' 导入

// ==================== 工具函数 ====================

/** 数据库管理工具函数 */
export const databaseUtils = {
  /** 格式化数字显示 */
  formatNumber: (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  },

  /** 格式化日期显示 */
  formatDate: (dateString: string): string => {
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
  },

  /** 计算数据质量评分 */
  calculateQualityScore: (validRecords: number, totalRecords: number): number => {
    if (totalRecords === 0) return 0;
    return Math.round((validRecords / totalRecords) * 100);
  },

  /** 获取质量评分颜色类名 */
  getQualityScoreColor: (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  },

  /** 获取质量评分描述 */
  getQualityScoreDescription: (score: number): string => {
    if (score >= 90) return '优秀';
    if (score >= 70) return '良好';
    if (score >= 50) return '一般';
    return '需要改进';
  },

  /** 获取状态显示信息 */
  getStatusInfo: (status: 'active' | 'inactive' | 'error' | 'updating') => {
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
  },
};

// ==================== 常量导出 ====================

/** 数据库管理相关常量 */
export const DATABASE_CONSTANTS = {
  /** 默认分页大小 */
  DEFAULT_PAGE_SIZE: 20,
  
  /** 支持的时间周期 */
  TIMEFRAMES: ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'] as const,
  
  /** 数据状态选项 */
  STATUS_OPTIONS: [
    { value: '', label: '全部状态' },
    { value: 'active', label: '活跃' },
    { value: 'inactive', label: '非活跃' },
    { value: 'error', label: '错误' },
    { value: 'updating', label: '更新中' },
  ] as const,
  
  /** 质量评分阈值 */
  QUALITY_THRESHOLDS: {
    EXCELLENT: 90,
    GOOD: 70,
    FAIR: 50,
    POOR: 0,
  } as const,
  
  /** 问题严重程度 */
  SEVERITY_LEVELS: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
  } as const,
  
  /** 问题类型 */
  ISSUE_TYPES: {
    MISSING_DATA: 'missing_data',
    DUPLICATE_DATA: 'duplicate_data',
    INVALID_DATA: 'invalid_data',
    OUTDATED_DATA: 'outdated_data',
    INCONSISTENT_DATA: 'inconsistent_data',
  } as const,
};

// ==================== 类型导出 ====================

/** 数据库管理相关类型 */
export type DatabaseStatus = 'active' | 'inactive' | 'error' | 'updating';
export type QualitySeverity = 'low' | 'medium' | 'high' | 'critical';
export type IssueType = 'missing_data' | 'duplicate_data' | 'invalid_data' | 'outdated_data' | 'inconsistent_data';
export type Timeframe = typeof DATABASE_CONSTANTS.TIMEFRAMES[number];

// ==================== 版本信息 ====================

/** 数据库管理组件版本信息 */
export const DATABASE_COMPONENTS_VERSION = '2.0.0';
export const DATABASE_COMPONENTS_INFO = {
  version: DATABASE_COMPONENTS_VERSION,
  description: '数据库管理组件库 - 重构版本',
  features: [
    '模块化组件设计',
    '统一的数据接口',
    '完整的类型支持',
    '丰富的工具函数',
    '响应式布局',
    '无障碍访问支持',
  ],
  components: [
    'DatabaseOverview - 数据库概览',
    'StockDataList - 股票数据列表',
    'QualityReport - 数据质量报告',
    'DatabaseAdmin - 数据库管理主界面',
  ],
};