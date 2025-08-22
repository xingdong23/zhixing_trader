// 【知行交易】现代化表格组件
// 专业金融系统UI组件 - Table

import React from 'react';
import { cn } from '@/utils/cn';

export interface TableProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'bordered' | 'striped';
  size?: 'sm' | 'md' | 'lg';
}

export function Table({ children, className, variant = 'default', size = 'md' }: TableProps) {
  const variantClasses = {
    default: 'border-border-secondary',
    bordered: 'border border-border-primary',
    striped: 'border-border-secondary [&_tbody_tr:nth-child(even)]:bg-bg-tertiary/30'
  };

  const sizeClasses = {
    sm: '[&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-2 text-xs',
    md: '[&_th]:px-4 [&_th]:py-3 [&_td]:px-4 [&_td]:py-3 text-sm',
    lg: '[&_th]:px-6 [&_th]:py-4 [&_td]:px-6 [&_td]:py-4 text-base'
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border-secondary">
      <div className="overflow-x-auto">
        <table className={cn(
          'table w-full',
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
}

export function TableHeader({ children, className }: TableHeaderProps) {
  return (
    <thead className={cn('bg-bg-tertiary', className)}>
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
    <tbody className={cn('divide-y divide-border-secondary', className)}>
      {children}
    </tbody>
  );
}

export interface TableRowProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}

export function TableRow({ children, className, onClick, selected }: TableRowProps) {
  return (
    <tr 
      className={cn(
        'transition-colors duration-150',
        onClick && 'cursor-pointer hover:bg-bg-hover',
        selected && 'bg-primary/10 border-l-2 border-l-primary',
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
  sortDirection?: 'asc' | 'desc';
  onSort?: () => void;
}

export function TableHead({ 
  children, 
  className, 
  sortable, 
  sortDirection,
  onSort 
}: TableHeadProps) {
  return (
    <th 
      className={cn(
        'text-left text-xs font-semibold uppercase tracking-wider',
        'text-text-secondary bg-bg-tertiary',
        sortable && 'cursor-pointer hover:text-text-primary select-none',
        className
      )}
      onClick={sortable ? onSort : undefined}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortable && (
          <div className="flex flex-col">
            <svg 
              className={cn(
                'w-3 h-3 transition-colors',
                sortDirection === 'asc' ? 'text-primary' : 'text-text-tertiary'
              )} 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
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
}

export function TableCell({ children, className, align = 'left' }: TableCellProps) {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  };

  return (
    <td className={cn(
      'text-text-primary border-b border-border-secondary',
      alignClasses[align],
      className
    )}>
      {children}
    </td>
  );
}

// 数据显示组件
export interface DataCellProps {
  value: string | number;
  change?: number;
  format?: 'currency' | 'percentage' | 'number';
  className?: string;
}

export function DataCell({ value, change, format, className }: DataCellProps) {
  const formatValue = (val: string | number) => {
    if (format === 'currency') {
      return `￥${Number(val).toFixed(2)}`;
    }
    if (format === 'percentage') {
      return `${Number(val).toFixed(2)}%`;
    }
    return val.toString();
  };

  const getChangeColor = (changeVal?: number) => {
    if (!changeVal) return 'text-text-secondary';
    return changeVal > 0 ? 'status-success' : changeVal < 0 ? 'status-danger' : 'text-text-secondary';
  };

  return (
    <TableCell className={cn('number font-medium', className)}>
      <div className="flex flex-col">
        <span className="text-text-primary">
          {formatValue(value)}
        </span>
        {change !== undefined && (
          <span className={cn('text-xs', getChangeColor(change))}>
            {change > 0 && '+'}{change.toFixed(2)}%
          </span>
        )}
      </div>
    </TableCell>
  );
}

export default Table;