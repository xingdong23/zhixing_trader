import React from 'react'
import { cn } from '@/utils/cn'

export interface TableProps {
  children: React.ReactNode
  className?: string
}

export function Table({ children, className }: TableProps) {
  return (
    <div className={cn('overflow-hidden rounded-lg', className)}>
      <table className="w-full border-collapse">
        {children}
      </table>
    </div>
  )
}

export interface TableHeaderProps {
  children: React.ReactNode
  className?: string
}

export function TableHeader({ children, className }: TableHeaderProps) {
  return <thead className={cn('', className)}>{children}</thead>
}

export interface TableBodyProps {
  children: React.ReactNode
  className?: string
}

export function TableBody({ children, className }: TableBodyProps) {
  return <tbody className={cn('', className)}>{children}</tbody>
}

export interface TableRowProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function TableRow({ children, className, onClick }: TableRowProps) {
  return (
    <tr 
      className={cn(
        'border-b hover:bg-[rgba(30,41,59,0.6)] transition-colors duration-150',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

export interface TableHeadProps {
  children: React.ReactNode
  className?: string
}

export function TableHead({ children, className }: TableHeadProps) {
  return (
    <th className={cn(
      'px-6 py-4 text-left text-xs font-medium text-[#94a3b8] uppercase tracking-wider',
      className
    )}>
      {children}
    </th>
  )
}

export interface TableCellProps {
  children: React.ReactNode
  className?: string
}

export function TableCell({ children, className }: TableCellProps) {
  return (
    <td className={cn(
      'px-6 py-4 text-sm text-[#e2e8f0] whitespace-nowrap',
      className
    )}>
      {children}
    </td>
  )
}

export interface TableCaptionProps {
  children: React.ReactNode
  className?: string
}

export function TableCaption({ children, className }: TableCaptionProps) {
  return (
    <caption className={cn(
      'mt-4 text-sm text-[#94a3b8] text-center',
      className
    )}>
      {children}
    </caption>
  )
}