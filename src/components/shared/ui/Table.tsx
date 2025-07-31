// 【知行交易】通用表格组件
// 提供统一的表格样式和功能

import React from 'react';
import { cn } from '../../../utils/cn';

// ==================== 类型定义 ====================

export interface Column<T = any> {
  /** 列的唯一标识 */
  key: string;
  /** 列标题 */
  title: React.ReactNode;
  /** 数据索引 */
  dataIndex?: keyof T;
  /** 自定义渲染函数 */
  render?: (value: any, record: T, index: number) => React.ReactNode;
  /** 列宽度 */
  width?: string | number;
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right';
  /** 是否可排序 */
  sortable?: boolean;
  /** 排序函数 */
  sorter?: (a: T, b: T) => number;
  /** 是否固定列 */
  fixed?: 'left' | 'right';
  /** 列的CSS类名 */
  className?: string;
  /** 表头CSS类名 */
  headerClassName?: string;
}

export interface TableProps<T = any> {
  /** 表格数据 */
  data: T[];
  /** 列配置 */
  columns: Column<T>[];
  /** 表格大小 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否显示边框 */
  bordered?: boolean;
  /** 是否显示斑马纹 */
  striped?: boolean;
  /** 是否可悬停 */
  hoverable?: boolean;
  /** 是否加载中 */
  loading?: boolean;
  /** 空数据时的显示内容 */
  emptyText?: React.ReactNode;
  /** 行的唯一标识字段 */
  rowKey?: keyof T | ((record: T) => string);
  /** 行点击事件 */
  onRowClick?: (record: T, index: number) => void;
  /** 行的CSS类名 */
  rowClassName?: string | ((record: T, index: number) => string);
  /** 表格容器的CSS类名 */
  className?: string;
  /** 是否显示表头 */
  showHeader?: boolean;
  /** 排序状态 */
  sortState?: {
    key: string;
    direction: 'asc' | 'desc';
  };
  /** 排序变化回调 */
  onSortChange?: (key: string, direction: 'asc' | 'desc') => void;
}

export interface TableHeaderProps {
  columns: Column[];
  size: 'sm' | 'md' | 'lg';
  sortState?: {
    key: string;
    direction: 'asc' | 'desc';
  };
  onSortChange?: (key: string, direction: 'asc' | 'desc') => void;
}

export interface TableBodyProps<T = any> {
  data: T[];
  columns: Column<T>[];
  size: 'sm' | 'md' | 'lg';
  hoverable: boolean;
  striped: boolean;
  rowKey: keyof T | ((record: T) => string);
  onRowClick?: (record: T, index: number) => void;
  rowClassName?: string | ((record: T, index: number) => string);
  emptyText: React.ReactNode;
}

// ==================== 样式映射 ====================

const tableSizes = {
  sm: {
    cell: 'px-2 py-1 text-xs',
    header: 'px-2 py-2 text-xs',
  },
  md: {
    cell: 'px-4 py-2 text-sm',
    header: 'px-4 py-2 text-xs',
  },
  lg: {
    cell: 'px-6 py-3 text-base',
    header: 'px-6 py-3 text-sm',
  },
};

const alignClasses = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

// ==================== 工具函数 ====================

const getRowKey = <T,>(record: T, index: number, rowKey: keyof T | ((record: T) => string)): string => {
  if (typeof rowKey === 'function') {
    return rowKey(record);
  }
  return String(record[rowKey] || index);
};

const getCellValue = <T,>(record: T, column: Column<T>): any => {
  if (column.dataIndex) {
    return record[column.dataIndex];
  }
  return record;
};

// ==================== 子组件 ====================

/** 表格头部组件 */
const TableHeader: React.FC<TableHeaderProps> = ({
  columns,
  size,
  sortState,
  onSortChange,
}) => {
  const handleSort = (column: Column) => {
    if (!column.sortable || !onSortChange) return;
    
    const currentDirection = sortState?.key === column.key ? sortState.direction : null;
    const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
    
    onSortChange(column.key, newDirection);
  };

  return (
    <thead className="bg-gray-50">
      <tr>
        {columns.map((column) => {
          const isSorted = sortState?.key === column.key;
          const sortDirection = isSorted ? sortState.direction : null;
          
          return (
            <th
              key={column.key}
              className={cn(
                tableSizes[size].header,
                'font-medium text-gray-500 uppercase tracking-wider',
                alignClasses[column.align || 'left'],
                column.sortable && 'cursor-pointer hover:bg-gray-100 select-none',
                column.headerClassName
              )}
              style={{ width: column.width }}
              onClick={() => handleSort(column)}
            >
              <div className="flex items-center gap-1">
                <span>{column.title}</span>
                {column.sortable && (
                  <span className="text-gray-400">
                    {sortDirection === 'asc' ? '↑' : sortDirection === 'desc' ? '↓' : '↕'}
                  </span>
                )}
              </div>
            </th>
          );
        })}
      </tr>
    </thead>
  );
};

/** 表格主体组件 */
const TableBody = <T,>({
  data,
  columns,
  size,
  hoverable,
  striped,
  rowKey,
  onRowClick,
  rowClassName,
  emptyText,
}: TableBodyProps<T>) => {
  if (data.length === 0) {
    return (
      <tbody>
        <tr>
          <td
            colSpan={columns.length}
            className="px-6 py-12 text-center text-gray-500"
          >
            {emptyText}
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody className="bg-white divide-y divide-gray-200">
      {data.map((record, index) => {
        const key = getRowKey(record, index, rowKey);
        const className = typeof rowClassName === 'function' 
          ? rowClassName(record, index) 
          : rowClassName;

        return (
          <tr
            key={key}
            className={cn(
              'transition-colors duration-150',
              hoverable && 'hover:bg-gray-50',
              striped && index % 2 === 1 && 'bg-gray-25',
              onRowClick && 'cursor-pointer',
              className
            )}
            onClick={() => onRowClick?.(record, index)}
          >
            {columns.map((column) => {
              const value = getCellValue(record, column);
              const content = column.render 
                ? column.render(value, record, index)
                : value;

              return (
                <td
                  key={column.key}
                  className={cn(
                    tableSizes[size].cell,
                    alignClasses[column.align || 'left'],
                    column.className
                  )}
                  style={{ width: column.width }}
                >
                  {content}
                </td>
              );
            })}
          </tr>
        );
      })}
    </tbody>
  );
};

// ==================== 主要组件 ====================

/** 表格组件 */
export const Table = <T,>({
  data,
  columns,
  size = 'md',
  bordered = true,
  striped = false,
  hoverable = true,
  loading = false,
  emptyText = '暂无数据',
  rowKey = 'id' as keyof T,
  onRowClick,
  rowClassName,
  className,
  showHeader = true,
  sortState,
  onSortChange,
}: TableProps<T>) => {
  return (
    <div className={cn('relative', className)}>
      {loading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className={cn(
          'min-w-full',
          bordered && 'border border-gray-200'
        )}>
          {showHeader && (
            <TableHeader
              columns={columns}
              size={size}
              sortState={sortState}
              onSortChange={onSortChange}
            />
          )}
          <TableBody
            data={data}
            columns={columns}
            size={size}
            hoverable={hoverable}
            striped={striped}
            rowKey={rowKey}
            onRowClick={onRowClick}
            rowClassName={rowClassName}
            emptyText={emptyText}
          />
        </table>
      </div>
    </div>
  );
};

// ==================== 高级组件 ====================

/** 带分页的表格组件 */
export interface PaginatedTableProps<T = any> extends Omit<TableProps<T>, 'data'> {
  /** 所有数据 */
  allData: T[];
  /** 每页显示数量 */
  pageSize?: number;
  /** 当前页码 */
  currentPage?: number;
  /** 页码变化回调 */
  onPageChange?: (page: number) => void;
  /** 是否显示分页信息 */
  showPagination?: boolean;
}

export const PaginatedTable = <T,>({
  allData,
  pageSize = 10,
  currentPage = 1,
  onPageChange,
  showPagination = true,
  ...tableProps
}: PaginatedTableProps<T>) => {
  const totalPages = Math.ceil(allData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentData = allData.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange?.(page);
    }
  };

  return (
    <div className="space-y-4">
      <Table {...tableProps} data={currentData} />
      
      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            显示 {startIndex + 1} 到 {Math.min(endIndex, allData.length)} 条，
            共 {allData.length} 条记录
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            
            <span className="text-sm text-gray-700">
              第 {currentPage} 页，共 {totalPages} 页
            </span>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== 工具函数导出 ====================

/** 创建基础列配置 */
export const createColumn = <T,>(config: Column<T>): Column<T> => config;

/** 创建操作列 */
export const createActionColumn = <T,>({
  title = '操作',
  width = 120,
  actions,
}: {
  title?: string;
  width?: number;
  actions: (record: T, index: number) => React.ReactNode;
}): Column<T> => ({
  key: 'actions',
  title,
  width,
  align: 'center',
  render: (_, record, index) => (
    <div className="flex items-center justify-center gap-1">
      {actions(record, index)}
    </div>
  ),
});

/** 创建状态列 */
export const createStatusColumn = <T,>({
  title = '状态',
  dataIndex,
  statusMap,
}: {
  title?: string;
  dataIndex: keyof T;
  statusMap: Record<string, { label: string; color: string }>;
}): Column<T> => ({
  key: String(dataIndex),
  title,
  dataIndex,
  align: 'center',
  render: (value) => {
    const status = statusMap[value] || { label: value, color: 'gray' };
    return (
      <span className={cn(
        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
        `bg-${status.color}-100 text-${status.color}-800`
      )}>
        {status.label}
      </span>
    );
  },
});

// ==================== 默认导出 ====================

export default Table;