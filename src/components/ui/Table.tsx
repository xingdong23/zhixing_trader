// 【知行交易】全新现代化表格组件
// 简洁优雅的数据展示

import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface TableProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'minimal' | 'bordered' | 'striped';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
}

export function Table({ 
  children, 
  className, 
  variant = 'default', 
  size = 'md',
  rounded = true 
}: TableProps) {
  const variantClasses = {
    default: 'bg-bg-primary border border-border-primary',
    minimal: 'bg-transparent',
    bordered: 'border-2 border-border-primary bg-bg-primary',
    striped: 'bg-bg-primary [&_tbody_tr:nth-child(even)]:bg-bg-secondary/50'
  };

  const sizeClasses = {
    sm: '[&_th]:px-3 [&_th]:py-2.5 [&_td]:px-3 [&_td]:py-2.5 text-sm',
    md: '[&_th]:px-4 [&_th]:py-3 [&_td]:px-4 [&_td]:py-3 text-sm',
    lg: '[&_th]:px-6 [&_th]:py-4 [&_td]:px-6 [&_td]:py-4 text-base'
  };

  return (
    <div className={cn(
      'overflow-hidden shadow-sm',
      rounded && 'rounded-xl',
      variant !== 'minimal' && 'border border-border-primary'
    )}>
      <div className="overflow-x-auto scrollbar-none">
        <table className={cn(
          'w-full border-collapse',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}>
          {children}
        </table>
      </div>
    </div>
  );
}

export interface TableHeaderProps {
  children: React.ReactNode;
  className?: string;
  sticky?: boolean;
}

export function TableHeader({ children, className, sticky = false }: TableHeaderProps) {
  return (
    <thead className={cn(
      'bg-gradient-to-r from-bg-secondary to-bg-tertiary',
      sticky && 'sticky top-0 z-10',
      className
    )}>
      {children}
    </thead>
  );
}

export interface TableBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function TableBody({ children, className }: TableBodyProps) {
  return (
    <tbody className={cn(
      'divide-y divide-border-secondary bg-bg-primary',
      className
    )}>
      {children}
    </tbody>
  );
}

export interface TableRowProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
  hover?: boolean;
}

export function TableRow({ 
  children, 
  className, 
  onClick, 
  selected,
  hover = true 
}: TableRowProps) {
  return (
    <tr 
      className={cn(
        'transition-all duration-200',
        onClick && 'cursor-pointer',
        hover && 'hover:bg-bg-hover',
        selected && 'bg-primary/5 border-l-4 border-l-primary shadow-sm',
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export interface TableHeadProps {
  children: React.ReactNode;
  className?: string;
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
  align?: 'left' | 'center' | 'right';
}

export function TableHead({ 
  children, 
  className, 
  sortable, 
  sortDirection,
  onSort,
  align = 'left'
}: TableHeadProps) {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  };

  return (
    <th 
      className={cn(
        'font-semibold text-text-secondary bg-bg-tertiary/50',
        'border-b-2 border-border-primary transition-colors duration-200',
        alignClasses[align],
        sortable && 'cursor-pointer hover:text-text-primary hover:bg-bg-hover select-none',
        className
      )}
      onClick={sortable ? onSort : undefined}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wider font-bold">
          {children}
        </span>
        {sortable && (
          <div className="flex flex-col">
            <ChevronUp 
              className={cn(
                'w-3 h-3 transition-colors duration-200',
                sortDirection === 'asc' 
                  ? 'text-primary' 
                  : 'text-text-tertiary hover:text-text-secondary'
              )} 
            />
            <ChevronDown 
              className={cn(
                'w-3 h-3 -mt-1 transition-colors duration-200',
                sortDirection === 'desc' 
                  ? 'text-primary' 
                  : 'text-text-tertiary hover:text-text-secondary'
              )} 
            />
          </div>
        )}
      </div>
    </th>
  );
}

export interface TableCellProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  variant?: 'default' | 'numeric' | 'action';
}

export function TableCell({ 
  children, 
  className, 
  align = 'left',
  variant = 'default'
}: TableCellProps) {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  };

  const variantClasses = {
    default: 'text-text-primary',
    numeric: 'text-text-primary font-mono font-semibold tabular-nums',
    action: 'text-text-secondary'
  };

  return (
    <td className={cn(
      'border-b border-border-secondary transition-colors duration-200',
      'group-hover:bg-bg-hover',
      alignClasses[align],
      variantClasses[variant],
      className
    )}>
      {children}
    </td>
  );
}

// 专门的数据单元格组件
export interface DataCellProps {
  value: string | number;
  change?: number;
  format?: 'currency' | 'percentage' | 'number' | 'text';
  className?: string;
  precision?: number;
}

export function DataCell({ 
  value, 
  change, 
  format = 'text', 
  className,
  precision = 2
}: DataCellProps) {
  const formatValue = (val: string | number) => {
    if (format === 'currency') {
      return `￥${Number(val).toLocaleString('zh-CN', { minimumFractionDigits: precision })}`;
    }
    if (format === 'percentage') {
      return `${Number(val).toFixed(precision)}%`;
    }
    if (format === 'number') {
      return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: precision });
    }
    return val.toString();
  };

  const getChangeColor = (changeVal?: number) => {
    if (!changeVal || changeVal === 0) return 'text-text-tertiary';
    return changeVal > 0 ? 'text-success' : 'text-danger';
  };

  const getChangePrefix = (changeVal?: number) => {
    if (!changeVal || changeVal === 0) return '';
    return changeVal > 0 ? '+' : '';
  };

  return (
    <TableCell variant="numeric" className={cn('space-y-1', className)}>
      <div className="font-semibold text-text-primary">
        {formatValue(value)}
      </div>
      {change !== undefined && (
        <div className={cn(
          'text-xs font-medium flex items-center gap-1',
          getChangeColor(change)
        )}>
          <span>
            {getChangePrefix(change)}{change.toFixed(precision)}%
          </span>
        </div>
      )}
    </TableCell>
  );
}

// 状态单元格组件
export interface StatusCellProps {
  status: 'active' | 'inactive' | 'pending' | 'success' | 'warning' | 'danger';
  text: string;
  className?: string;
}

export function StatusCell({ status, text, className }: StatusCellProps) {
  const statusStyles = {
    active: 'bg-success/10 text-success border border-success/20',
    inactive: 'bg-text-muted/10 text-text-muted border border-text-muted/20',
    pending: 'bg-warning/10 text-warning border border-warning/20',
    success: 'bg-success/10 text-success border border-success/20',
    warning: 'bg-warning/10 text-warning border border-warning/20',
    danger: 'bg-danger/10 text-danger border border-danger/20'
  };

  return (
    <TableCell className={className}>
      <span className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold',
        statusStyles[status]
      )}>
        {text}
      </span>
    </TableCell>
  );
}

// 操作单元格组件
export interface ActionCellProps {
  children: React.ReactNode;
  className?: string;
}

export function ActionCell({ children, className }: ActionCellProps) {
  return (
    <TableCell variant="action" align="right" className={cn('space-x-2', className)}>
      <div className="flex items-center justify-end gap-2">
        {children}
      </div>
    </TableCell>
  );
}

export default Table;