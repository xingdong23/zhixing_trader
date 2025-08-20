// 【知行交易】设计系统组件库
// 统一的设计系统组件，确保整个应用的视觉一致性

'use client';

import React from 'react';
import { cn } from '@/utils/cn';



// ==================== 输入框组件 ====================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className,
  ...props
}) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted">
            {leftIcon}
          </div>
        )}
        
        <input
          className={cn(
            'w-full p-3 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent',
            'bg-surface text-text-primary placeholder:text-text-muted',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            error && 'border-danger focus:ring-danger',
            className
          )}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted">
            {rightIcon}
          </div>
        )}
      </div>
      
      {(error || helperText) && (
        <p className={cn('text-sm', error ? 'text-danger' : 'text-text-muted')}>
          {error || helperText}
        </p>
      )}
    </div>
  );
};

// ==================== 选择框组件 ====================

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  options,
  className,
  ...props
}) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      
      <select
        className={cn(
          'w-full p-3 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent',
          'bg-surface text-text-primary',
          error && 'border-danger focus:ring-danger',
          className
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {(error || helperText) && (
        <p className={cn('text-sm', error ? 'text-danger' : 'text-text-muted')}>
          {error || helperText}
        </p>
      )}
    </div>
  );
};

// ==================== 状态标签组件 ====================

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'error' | 'warning' | 'success' | 'info' | 'updating';
  text?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  text, 
  className 
}) => {
  const statusConfig = {
    active: { 
      label: text || '活跃', 
      className: 'bg-success/20 text-success' 
    },
    inactive: { 
      label: text || '非活跃', 
      className: 'bg-surface text-text-secondary' 
    },
    error: { 
      label: text || '错误', 
      className: 'bg-danger/20 text-danger' 
    },
    warning: { 
      label: text || '警告', 
      className: 'bg-warning/20 text-warning' 
    },
    success: { 
      label: text || '成功', 
      className: 'bg-success/20 text-success' 
    },
    info: { 
      label: text || '信息', 
      className: 'bg-info/20 text-info' 
    },
    updating: { 
      label: text || '更新中', 
      className: 'bg-info/20 text-info' 
    }
  };

  const config = statusConfig[status];

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
      config.className,
      className
    )}>
      {config.label}
    </span>
  );
};

// ==================== 统计卡片组件 ====================

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon?: React.ReactNode;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon,
  className
}) => {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-muted">{title}</p>
            <p className="text-2xl font-bold text-text-primary mt-1">
              {value}
            </p>
            {change && (
              <p className={cn(
                'text-sm mt-1',
                change.type === 'increase' ? 'text-success' : 'text-danger'
              )}>
                {change.type === 'increase' ? '+' : ''}{change.value}%
              </p>
            )}
          </div>
          {icon && (
            <div className="p-2 bg-primary/10 rounded-lg">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ==================== 加载组件 ====================

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={cn('animate-spin border-2 border-primary border-t-transparent rounded-full', sizeClasses[size], className)} />
  );
};

// ==================== 空状态组件 ====================

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  icon,
  className
}) => {
  return (
    <div className={cn('text-center py-12', className)}>
      {icon && (
        <div className="mx-auto mb-4 text-text-muted">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-text-primary mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-text-muted mb-6">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  );
};

// ==================== 导出所有组件 ====================

export {
  Button,
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  Input,
  Select,
  StatusBadge,
  StatCard,
  LoadingSpinner,
  EmptyState
};