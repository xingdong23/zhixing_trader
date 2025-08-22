// 【知行交易】现代化按钮组件
// 专业金融系统UI组件 - Button

import React from 'react';
import { cn } from '@/utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = [
    'inline-flex items-center justify-center gap-2',
    'font-medium transition-all duration-200',
    'cursor-pointer select-none',
    'rounded-lg border',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-primary',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    fullWidth && 'w-full'
  ];

  const variantClasses = {
    primary: [
      'bg-gradient-to-r from-primary to-primary-dark',
      'text-bg-primary border-transparent',
      'shadow-md hover:shadow-glow',
      'hover:-translate-y-0.5 hover:shadow-lg',
      'focus:ring-primary/20'
    ],
    secondary: [
      'bg-bg-secondary border-border-primary',
      'text-text-primary',
      'hover:bg-bg-tertiary hover:border-border-accent',
      'focus:ring-primary/20'
    ],
    success: [
      'bg-success border-transparent',
      'text-bg-primary font-semibold',
      'hover:bg-success/90 hover:-translate-y-0.5',
      'focus:ring-success/20'
    ],
    danger: [
      'bg-danger border-transparent',
      'text-white font-semibold',
      'hover:bg-danger/90 hover:-translate-y-0.5',
      'focus:ring-danger/20'
    ],
    ghost: [
      'bg-transparent border-transparent',
      'text-text-secondary',
      'hover:bg-bg-secondary hover:text-text-primary',
      'focus:ring-primary/20'
    ],
    outline: [
      'bg-transparent border-border-primary',
      'text-text-primary',
      'hover:bg-bg-secondary hover:border-border-accent',
      'focus:ring-primary/20'
    ]
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs min-h-[32px]',
    md: 'px-4 py-2 text-sm min-h-[38px]',
    lg: 'px-6 py-3 text-base min-h-[44px]',
    xl: 'px-8 py-4 text-lg min-h-[52px]'
  };

  const isDisabled = disabled || loading;

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4 text-current"
          fill="none"
          viewBox="0 0 24 24"
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
      )}
      {!loading && leftIcon && leftIcon}
      {children}
      {!loading && rightIcon && rightIcon}
    </button>
  );
}

export default Button;
