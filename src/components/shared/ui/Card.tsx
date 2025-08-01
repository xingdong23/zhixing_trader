// 【知行交易】通用卡片组件
// 提供统一的卡片样式和布局

import React from 'react';
import { cn } from '../../../utils/cn';

// ==================== 类型定义 ====================

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 卡片变体 */
  variant?: 'default' | 'outlined' | 'elevated' | 'filled';
  /** 卡片大小 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否可悬停 */
  hoverable?: boolean;
  /** 是否可点击 */
  clickable?: boolean;
  /** 是否显示加载状态 */
  loading?: boolean;
  /** 自定义内边距 */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** 标题 */
  title?: React.ReactNode;
  /** 副标题 */
  subtitle?: React.ReactNode;
  /** 右侧操作区域 */
  extra?: React.ReactNode;
  /** 是否显示分割线 */
  bordered?: boolean;
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 内容区域内边距 */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 是否显示分割线 */
  bordered?: boolean;
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right' | 'between';
}

// ==================== 样式映射 ====================

const cardVariants = {
  default: 'bg-white border border-gray-200 shadow-sm',
  outlined: 'bg-white border-2 border-gray-300',
  elevated: 'bg-white border border-gray-200 shadow-lg',
  filled: 'bg-gray-50 border border-gray-200',
};

const cardSizes = {
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-xl',
};

const cardPaddings = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const contentPaddings = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const footerAligns = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
  between: 'justify-between',
};

// ==================== 主要组件 ====================

/** 卡片根组件 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      hoverable = false,
      clickable = false,
      loading = false,
      padding = 'md',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          // 基础样式
          'relative transition-all duration-200',
          // 变体样式
          cardVariants[variant],
          // 大小样式
          cardSizes[size],
          // 内边距
          cardPaddings[padding],
          // 交互样式
          hoverable && 'hover:shadow-md hover:-translate-y-0.5',
          clickable && 'cursor-pointer hover:shadow-md',
          // 加载状态
          loading && 'overflow-hidden',
          className
        )}
        {...props}
      >
        {loading && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        )}
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

/** 卡片头部组件 */
export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, subtitle, extra, bordered = true, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-start justify-between',
          bordered && 'border-b border-gray-200 pb-4 mb-4',
          className
        )}
        {...props}
      >
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 truncate">
              {subtitle}
            </p>
          )}
          {children}
        </div>
        {extra && (
          <div className="flex-shrink-0 ml-4">
            {extra}
          </div>
        )}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

/** 卡片内容组件 */
export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, padding = 'none', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex-1',
          contentPaddings[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

/** 卡片底部组件 */
export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, bordered = true, align = 'right', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center',
          footerAligns[align],
          bordered && 'border-t border-gray-200 pt-4 mt-4',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

// ==================== 复合组件 ====================

/** 统计卡片组件 */
export interface StatCardProps {
  /** 标题 */
  title: string;
  /** 数值 */
  value: string | number;
  /** 描述 */
  description?: string;
  /** 图标 */
  icon?: React.ReactNode;
  /** 趋势 */
  trend?: {
    value: number;
    isPositive: boolean;
  };
  /** 颜色主题 */
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';
  /** 是否加载中 */
  loading?: boolean;
  /** 点击事件 */
  onClick?: () => void;
}

const statColors = {
  blue: 'bg-blue-50 text-blue-600 border-blue-200',
  green: 'bg-green-50 text-green-600 border-green-200',
  purple: 'bg-purple-50 text-purple-600 border-purple-200',
  orange: 'bg-orange-50 text-orange-600 border-orange-200',
  red: 'bg-red-50 text-red-600 border-red-200',
  gray: 'bg-gray-50 text-gray-600 border-gray-200',
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon,
  trend,
  color = 'blue',
  loading = false,
  onClick,
}) => {
  return (
    <Card
      className={cn(
        'text-center transition-all duration-200',
        statColors[color],
        onClick && 'cursor-pointer hover:shadow-md'
      )}
      loading={loading}
      onClick={onClick}
      padding="md"
    >
      {icon && (
        <div className="flex justify-center mb-2">
          {icon}
        </div>
      )}
      
      <div className="text-sm font-medium mb-1">{title}</div>
      
      <div className="text-2xl font-bold mb-1">
        {loading ? (
          <div className="h-8 bg-current opacity-20 rounded animate-pulse"></div>
        ) : (
          value
        )}
      </div>
      
      {description && (
        <div className="text-xs opacity-75">{description}</div>
      )}
      
      {trend && (
        <div className={cn(
          'text-xs mt-2 flex items-center justify-center gap-1',
          trend.isPositive ? 'text-green-600' : 'text-red-600'
        )}>
          <span>{trend.isPositive ? '↗' : '↘'}</span>
          <span>{Math.abs(trend.value)}%</span>
        </div>
      )}
    </Card>
  );
};

// ==================== 工具函数 ====================

/** 创建加载状态的卡片 */
export const createLoadingCard = (count: number = 1) => {
  return Array.from({ length: count }, (_, index) => (
    <Card key={index} loading className="h-32" />
  ));
};

/** 创建空状态卡片 */
export const EmptyCard: React.FC<{
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}> = ({ title = '暂无数据', description, icon, action }) => {
  return (
    <Card className="text-center py-12">
      {icon && (
        <div className="flex justify-center mb-4 text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-500 mb-4">{description}</p>
      )}
      {action && action}
    </Card>
  );
};

// ==================== 工具函数 ====================

export const cardUtils = {
  /** 获取卡片变体样式 */
  getVariantClass: (variant: CardProps['variant'] = 'default') => cardVariants[variant],
  
  /** 获取卡片大小样式 */
  getSizeClass: (size: CardProps['size'] = 'md') => cardSizes[size],
  
  /** 获取内边距样式 */
  getPaddingClass: (padding: CardProps['padding'] = 'md') => cardPaddings[padding],
  
  /** 创建卡片样式类名 */
  createCardClass: (props: Partial<CardProps> = {}) => {
    const {
      variant = 'default',
      size = 'md',
      padding = 'md',
      hoverable = false,
      clickable = false,
      loading = false
    } = props;
    
    return cn(
      cardVariants[variant],
      cardSizes[size],
      cardPaddings[padding],
      hoverable && 'hover:shadow-md transition-shadow duration-200',
      clickable && 'cursor-pointer hover:shadow-lg transition-all duration-200',
      loading && 'opacity-60 pointer-events-none'
    );
  },
  
  /** 创建统计卡片配置 */
  createStatCardConfig: (color: StatCardProps['color'] = 'blue') => ({
    color,
    className: statColors[color]
  })
};

// ==================== 默认导出 ====================

export default Card;