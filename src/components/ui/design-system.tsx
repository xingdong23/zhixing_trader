// 【知行交易】设计系统组件库
// 统一的设计系统组件，确保整个应用的视觉一致性

'use client';

import React from 'react';
import { cn } from '@/utils/cn';
import { Card, CardContent } from './Card';

// ==================== 统计卡片组件 ====================

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    type: 'increase' | 'decrease';
    value: number;
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
            <div className="text-primary">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ==================== 标签组件 ====================

interface DesignTagProps {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export const DesignTag: React.FC<DesignTagProps> = ({
  variant = 'default',
  size = 'md',
  children,
  className
}) => {
  const baseStyles = 'inline-flex items-center rounded-full font-medium';
  
  const variantStyles = {
    default: 'bg-surface text-text-secondary border border-border',
    primary: 'bg-primary/20 text-primary border border-primary/30',
    success: 'bg-success/20 text-success border border-success/30',
    warning: 'bg-warning/20 text-warning border border-warning/30',
    danger: 'bg-danger/20 text-danger border border-danger/30'
  };
  
  const sizeStyles = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <span className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}>
      {children}
    </span>
  );
};

// ==================== 徽章组件 ====================

interface DesignBadgeProps {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
  className?: string;
}

export const DesignBadge: React.FC<DesignBadgeProps> = ({
  variant = 'default',
  children,
  className
}) => {
  const baseStyles = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  
  const variantStyles = {
    default: 'bg-surface text-text-secondary',
    primary: 'bg-primary/20 text-primary',
    success: 'bg-success/20 text-success',
    warning: 'bg-warning/20 text-warning',
    danger: 'bg-danger/20 text-danger',
    info: 'bg-info/20 text-info'
  };

  return (
    <span className={cn(baseStyles, variantStyles[variant], className)}>
      {children}
    </span>
  );
};

// ==================== 进度条组件 ====================

interface DesignProgressBarProps {
  value: number;
  max?: number;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const DesignProgressBar: React.FC<DesignProgressBarProps> = ({
  value,
  max = 100,
  variant = 'primary',
  size = 'md',
  showLabel = false,
  className
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  const baseStyles = 'w-full bg-surface rounded-full overflow-hidden';
  
  const sizeStyles = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };
  
  const variantStyles = {
    default: 'bg-primary',
    primary: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger'
  };

  return (
    <div className={cn(baseStyles, sizeStyles[size], className)}>
      <div
        className={cn(
          'h-full rounded-full transition-all duration-300',
          variantStyles[variant]
        )}
        style={{ width: `${percentage}%` }}
      />
      {showLabel && (
        <div className="flex justify-center mt-1">
          <span className="text-xs text-text-muted">{Math.round(percentage)}%</span>
        </div>
      )}
    </div>
  );
};

// ==================== 导出所有组件 ====================

export {
  StatCard as Card,
  DesignTag as Tag,
  DesignBadge as Badge,
  DesignProgressBar as ProgressBar
};