// 【知行交易】极简现代化按钮组件
// 专业优雅的交互设计

import React from 'react';
import { cn } from '@/utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline' | 'gradient';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  rounded = 'md',
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = [
    // 基础样式 - 现代化
    'inline-flex items-center justify-center gap-2',
    'font-semibold tracking-tight transition-all duration-200 ease-out',
    'cursor-pointer select-none focus:outline-none',
    'border transform-gpu will-change-transform',
    'relative overflow-hidden',
    // 焦点环 - 简化
    'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary',
    // 禁用状态
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
    'disabled:shadow-none',
    // 响应式宽度
    fullWidth && 'w-full',
  ];

  const variantClasses = {
    primary: [
      'bg-primary text-text-inverse border-primary',
      'shadow-sm hover:shadow-md',
      'hover:-translate-y-0.5 hover:shadow-primary/20',
      'focus-visible:ring-primary/40',
      'active:translate-y-0 active:shadow-sm',
      'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent',
      'before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700',
    ],
    secondary: [
      'bg-bg-secondary border-border-primary text-text-primary',
      'shadow-sm hover:shadow-md',
      'hover:bg-bg-tertiary hover:border-border-accent',
      'hover:-translate-y-0.5',
      'focus-visible:ring-primary/30',
      'active:translate-y-0 active:bg-bg-hover',
    ],
    success: [
      'bg-success text-text-inverse border-success',
      'shadow-sm hover:shadow-md',
      'hover:-translate-y-0.5 hover:shadow-success/20',
      'focus-visible:ring-success/40',
      'active:translate-y-0',
    ],
    danger: [
      'bg-danger text-text-inverse border-danger',
      'shadow-sm hover:shadow-md',
      'hover:-translate-y-0.5 hover:shadow-danger/20',
      'focus-visible:ring-danger/40',
      'active:translate-y-0',
    ],
    ghost: [
      'bg-transparent border-transparent text-text-secondary',
      'hover:bg-bg-hover hover:text-text-primary',
      'focus-visible:ring-primary/20',
      'transition-colors duration-200',
    ],
    outline: [
      'bg-transparent border border-border-primary text-text-primary',
      'hover:bg-bg-secondary hover:border-primary hover:text-primary',
      'focus-visible:ring-primary/20',
      'shadow-sm hover:shadow-md',
    ],
    gradient: [
      'bg-gradient-to-r from-primary via-secondary to-primary',
      'bg-size-200 bg-pos-0 hover:bg-pos-100',
      'text-text-inverse border-transparent',
      'shadow-md hover:shadow-lg',
      'hover:-translate-y-0.5 hover:shadow-primary/25',
      'focus-visible:ring-primary/40',
      'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/15 before:to-transparent',
      'before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-500',
    ],
  };

  const sizeClasses = {
    xs: 'px-2.5 py-1.5 text-xs min-h-[26px] gap-1.5',
    sm: 'px-3 py-2 text-sm min-h-[32px] gap-2',
    md: 'px-4 py-2.5 text-sm min-h-[38px] gap-2.5',
    lg: 'px-6 py-3 text-base min-h-[42px] gap-3',
    xl: 'px-8 py-3.5 text-lg min-h-[48px] gap-3.5',
  };

  const roundedClasses = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  };

  const isDisabled = disabled || loading;

  // 加载状态指示器
  const LoadingSpinner = () => (
    <svg
      className="animate-spin h-4 w-4 text-current"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        roundedClasses[rounded],
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {/* 左侧图标或加载指示器 */}
      {loading ? (
        <LoadingSpinner />
      ) : leftIcon ? (
        <span className="flex-shrink-0">{leftIcon}</span>
      ) : null}
      
      {/* 按钮文本 */}
      <span className="relative z-10 font-medium leading-none">
        {children}
      </span>
      
      {/* 右侧图标 */}
      {!loading && rightIcon && (
        <span className="flex-shrink-0">{rightIcon}</span>
      )}
    </button>
  );
}

export default Button;