// 【知行交易】数据质量报告组件
// 显示数据质量分析、问题统计和改进建议

import React, { useState } from 'react';
import { Card } from '@/components/ui';
import { Button } from '@/components/ui';
import { cn } from '../../utils/cn';

// ==================== 类型定义 ====================

export interface QualityIssue {
  /** 问题ID */
  id: string;
  /** 问题类型 */
  type: 'missing_data' | 'duplicate_data' | 'invalid_data' | 'outdated_data' | 'inconsistent_data';
  /** 严重程度 */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** 问题描述 */
  description: string;
  /** 影响的股票数量 */
  affectedStocks: number;
  /** 影响的记录数量 */
  affectedRecords: number;
  /** 建议解决方案 */
  suggestion: string;
  /** 是否可自动修复 */
  autoFixable: boolean;
  /** 发现时间 */
  detectedAt: string;
}

export interface QualityStatistics {
  /** 整体评分 */
  overallScore: number;
  /** 完整性评分 */
  completenessScore: number;
  /** 准确性评分 */
  accuracyScore: number;
  /** 一致性评分 */
  consistencyScore: number;
  /** 及时性评分 */
  timelinessScore: number;
  /** 总记录数 */
  totalRecords: number;
  /** 有效记录数 */
  validRecords: number;
  /** 问题记录数 */
  problematicRecords: number;
  /** 最后检查时间 */
  lastChecked: string;
}

export interface QualityReportData {
  /** 质量统计 */
  statistics: QualityStatistics;
  /** 问题列表 */
  issues: QualityIssue[];
  /** 改进建议 */
  recommendations: string[];
  /** 趋势数据 */
  trends?: {
    date: string;
    score: number;
  }[];
}

export interface QualityReportProps {
  /** 质量报告数据 */
  data: QualityReportData | null;
  /** 是否加载中 */
  loading?: boolean;
  /** 错误信息 */
  error?: string;
  /** 刷新回调 */
  onRefresh?: () => void;
  /** 修复问题回调 */
  onFixIssue?: (issueId: string) => Promise<void>;
  /** 批量修复回调 */
  onBatchFix?: (issueIds: string[]) => Promise<void>;
  /** 自定义类名 */
  className?: string;
}

// ==================== 常量定义 ====================

/** 问题类型配置 */
const ISSUE_TYPE_CONFIG = {
  missing_data: {
    label: '数据缺失',
    icon: '📊',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  duplicate_data: {
    label: '重复数据',
    icon: '📋',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  invalid_data: {
    label: '无效数据',
    icon: '❌',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  outdated_data: {
    label: '过期数据',
    icon: '⏰',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  inconsistent_data: {
    label: '数据不一致',
    icon: '⚠️',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
};

/** 严重程度配置 */
const SEVERITY_CONFIG = {
  low: {
    label: '低',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    priority: 1,
  },
  medium: {
    label: '中',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    priority: 2,
  },
  high: {
    label: '高',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    priority: 3,
  },
  critical: {
    label: '严重',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    priority: 4,
  },
};

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

/** 获取评分颜色 */
const getScoreColor = (score: number): string => {
  if (score >= 90) return 'text-green-600';
  if (score >= 70) return 'text-yellow-600';
  if (score >= 50) return 'text-orange-600';
  return 'text-red-600';
};

/** 获取评分描述 */
const getScoreDescription = (score: number): string => {
  if (score >= 90) return '优秀';
  if (score >= 70) return '良好';
  if (score >= 50) return '一般';
  return '需要改进';
};

// ==================== 子组件 ====================

/** 评分卡片 */
const ScoreCard: React.FC<{
  title: string;
  score: number;
  icon: React.ReactNode;
}> = ({ title, score, icon }) => {
  const colorClass = getScoreColor(score);
  const description = getScoreDescription(score);
  
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-gray-700">{title}</span>
        </div>
      </div>
      <div className="flex items-end gap-2">
        <div className={cn('text-2xl font-bold', colorClass)}>
          {score}%
        </div>
        <div className="text-sm text-gray-600 mb-1">
          {description}
        </div>
      </div>
    </div>
  );
};

/** 问题卡片 */
const IssueCard: React.FC<{
  issue: QualityIssue;
  onFix?: (issueId: string) => Promise<void>;
  isFixing?: boolean;
}> = ({ issue, onFix, isFixing = false }) => {
  const typeConfig = ISSUE_TYPE_CONFIG[issue.type];
  const severityConfig = SEVERITY_CONFIG[issue.severity];
  
  return (
    <div className={cn(
      'p-4 rounded-lg border-l-4',
      typeConfig.bgColor,
      typeConfig.borderColor
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{typeConfig.icon}</span>
            <span className={cn('font-medium', typeConfig.color)}>
              {typeConfig.label}
            </span>
            <span className={cn(
              'px-2 py-1 rounded-full text-xs font-medium',
              severityConfig.bgColor,
              severityConfig.color
            )}>
              {severityConfig.label}
            </span>
          </div>
          
          <p className="text-sm text-gray-700 mb-3">
            {issue.description}
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-3 text-xs text-gray-600">
            <div>
              <span className="font-medium">影响股票:</span> {issue.affectedStocks}
            </div>
            <div>
              <span className="font-medium">影响记录:</span> {formatNumber(issue.affectedRecords)}
            </div>
          </div>
          
          <div className="bg-white bg-opacity-50 p-3 rounded text-sm">
            <div className="font-medium text-gray-700 mb-1">建议解决方案:</div>
            <div className="text-gray-600">{issue.suggestion}</div>
          </div>
          
          <div className="mt-2 text-xs text-gray-500">
            发现时间: {formatDate(issue.detectedAt)}
          </div>
        </div>
        
        {issue.autoFixable && onFix && (
          <div className="ml-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onFix(issue.id)}


            >
              {isFixing ? '修复中...' : '自动修复'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

/** 改进建议列表 */
const RecommendationsList: React.FC<{ recommendations: string[] }> = ({ recommendations }) => {
  return (
    <div className="space-y-3">
      {recommendations.map((recommendation, index) => (
        <div key={index} className="flex items-start gap-3">
          <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
            {index + 1}
          </div>
          <div className="text-sm text-gray-700">
            {recommendation}
          </div>
        </div>
      ))}
    </div>
  );
};

// ==================== 主要组件 ====================

/** 数据质量报告组件 */
export const QualityReport: React.FC<QualityReportProps> = ({
  data,
  loading = false,
  error,
  onRefresh,
  onFixIssue,
  onBatchFix,
  className,
}) => {
  const [fixingIssues, setFixingIssues] = useState<Set<string>>(new Set());
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());

  // 处理修复单个问题
  const handleFixIssue = async (issueId: string) => {
    if (!onFixIssue) return;
    
    setFixingIssues(prev => new Set(prev).add(issueId));
    try {
      await onFixIssue(issueId);
    } finally {
      setFixingIssues(prev => {
        const newSet = new Set(prev);
        newSet.delete(issueId);
        return newSet;
      });
    }
  };

  // 处理批量修复
  const handleBatchFix = async () => {
    if (!onBatchFix || selectedIssues.size === 0) return;
    
    const issueIds = Array.from(selectedIssues);
    setFixingIssues(prev => new Set([...prev, ...issueIds]));
    
    try {
      await onBatchFix(issueIds);
      setSelectedIssues(new Set());
    } finally {
      setFixingIssues(prev => {
        const newSet = new Set(prev);
        issueIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  };

  // 切换问题选择
  const toggleIssueSelection = (issueId: string) => {
    setSelectedIssues(prev => {
      const newSet = new Set(prev);
      if (newSet.has(issueId)) {
        newSet.delete(issueId);
      } else {
        newSet.add(issueId);
      }
      return newSet;
    });
  };

  // 获取可自动修复的问题
  const autoFixableIssues = data?.issues.filter(issue => issue.autoFixable) || [];
  const selectedAutoFixableIssues = autoFixableIssues.filter(issue => selectedIssues.has(issue.id));

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
      {/* 标题和操作 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">数据质量报告</h2>
        <div className="flex items-center gap-3">
          {onBatchFix && selectedAutoFixableIssues.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleBatchFix}

            >
              批量修复 ({selectedAutoFixableIssues.length})
            </Button>
          )}
          
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
      </div>

      {data && (
        <>
          {/* 质量评分概览 */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">质量评分概览</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <ScoreCard
                  title="整体评分"
                  score={data.statistics.overallScore}
                  icon={
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  }
                />
                
                <ScoreCard
                  title="完整性"
                  score={data.statistics.completenessScore}
                  icon={
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
                
                <ScoreCard
                  title="准确性"
                  score={data.statistics.accuracyScore}
                  icon={
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  }
                />
                
                <ScoreCard
                  title="一致性"
                  score={data.statistics.consistencyScore}
                  icon={
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>
                  }
                />
                
                <ScoreCard
                  title="及时性"
                  score={data.statistics.timelinessScore}
                  icon={
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="font-medium text-gray-700">总记录数</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatNumber(data.statistics.totalRecords)}
                  </div>
                </div>
                
                <div className="bg-green-50 p-3 rounded">
                  <div className="font-medium text-gray-700">有效记录</div>
                  <div className="text-lg font-semibold text-green-600">
                    {formatNumber(data.statistics.validRecords)}
                  </div>
                </div>
                
                <div className="bg-red-50 p-3 rounded">
                  <div className="font-medium text-gray-700">问题记录</div>
                  <div className="text-lg font-semibold text-red-600">
                    {formatNumber(data.statistics.problematicRecords)}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 text-xs text-gray-500">
                最后检查时间: {formatDate(data.statistics.lastChecked)}
              </div>
            </div>
          </Card>

          {/* 问题列表 */}
          {data.issues.length > 0 && (
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    发现的问题 ({data.issues.length})
                  </h3>
                  
                  {autoFixableIssues.length > 0 && (
                    <div className="text-sm text-gray-600">
                      {autoFixableIssues.length} 个问题可自动修复
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  {data.issues
                    .sort((a, b) => SEVERITY_CONFIG[b.severity].priority - SEVERITY_CONFIG[a.severity].priority)
                    .map((issue) => (
                      <div key={issue.id} className="flex items-start gap-3">
                        {issue.autoFixable && onBatchFix && (
                          <div className="flex-shrink-0 pt-4">
                            <input
                              type="checkbox"
                              checked={selectedIssues.has(issue.id)}
                              onChange={() => toggleIssueSelection(issue.id)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </div>
                        )}
                        
                        <div className="flex-1">
                          <IssueCard
                            issue={issue}
                            onFix={onFixIssue ? handleFixIssue : undefined}
                            isFixing={fixingIssues.has(issue.id)}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </Card>
          )}

          {/* 改进建议 */}
          {data.recommendations.length > 0 && (
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  改进建议
                </h3>
                <RecommendationsList recommendations={data.recommendations} />
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

// ==================== 默认导出 ====================

export default QualityReport;