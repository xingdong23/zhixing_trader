// 【知行交易】全新现代化表单组件
// 简洁优雅的输入设计

import React, { forwardRef } from 'react';
import { cn } from '@/utils/cn';

// Input 组件 - 全新设计
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  success?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'minimal' | 'filled';
  inputSize?: 'sm' | 'md' | 'lg';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    error, 
    success,
    leftIcon, 
    rightIcon, 
    variant = 'default',
    inputSize = 'md',
    ...props 
  }, ref) => {
    const baseClasses = [
      'w-full font-medium transition-all duration-200',
      'rounded-lg border focus:outline-none',
      'placeholder:text-text-tertiary',
      'disabled:opacity-60 disabled:cursor-not-allowed',
    ];

    const variantClasses = {
      default: [
        'bg-bg-primary border-border-primary',
        'focus:border-primary focus:ring-2 focus:ring-primary/20',
        'hover:border-border-accent'
      ],
      minimal: [
        'bg-transparent border-0 border-b-2 border-border-primary',
        'focus:border-primary rounded-none',
        'px-0 hover:border-border-accent'
      ],
      filled: [
        'bg-bg-secondary border-border-secondary',
        'focus:bg-bg-primary focus:border-primary focus:ring-2 focus:ring-primary/20',
        'hover:bg-bg-primary'
      ]
    };

    const sizeClasses = {
      sm: 'px-3 py-2 text-sm h-9',
      md: 'px-4 py-2.5 text-sm h-10',
      lg: 'px-4 py-3 text-base h-12'
    };

    const stateClasses = error 
      ? 'border-danger focus:border-danger focus:ring-danger/20' 
      : success 
      ? 'border-success focus:border-success focus:ring-success/20'
      : '';

    return (
      <div className="relative group">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
            <div className="text-text-tertiary group-focus-within:text-primary transition-colors">
              {leftIcon}
            </div>
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            baseClasses,
            variantClasses[variant],
            sizeClasses[inputSize],
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            stateClasses,
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
            <div className="text-text-tertiary group-focus-within:text-primary transition-colors">
              {rightIcon}
            </div>
          </div>
        )}
        
        {/* 底部装饰线 */}
        {variant === 'default' && (
          <div className="absolute bottom-0 left-0 h-0.5 bg-primary transform scale-x-0 group-focus-within:scale-x-100 transition-transform duration-300 rounded-full" />
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Textarea 组件 - 全新设计
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  success?: boolean;
  variant?: 'default' | 'minimal' | 'filled';
  resize?: 'none' | 'both' | 'horizontal' | 'vertical';
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className, 
    error, 
    success,
    variant = 'default',
    resize = 'vertical',
    ...props 
  }, ref) => {
    const baseClasses = [
      'w-full px-4 py-3 font-medium transition-all duration-200',
      'rounded-lg border focus:outline-none',
      'placeholder:text-text-tertiary min-h-[100px]',
      'disabled:opacity-60 disabled:cursor-not-allowed',
    ];

    const variantClasses = {
      default: [
        'bg-bg-primary border-border-primary',
        'focus:border-primary focus:ring-2 focus:ring-primary/20',
        'hover:border-border-accent'
      ],
      minimal: [
        'bg-transparent border-0 border-b-2 border-border-primary',
        'focus:border-primary rounded-none px-0',
        'hover:border-border-accent'
      ],
      filled: [
        'bg-bg-secondary border-border-secondary',
        'focus:bg-bg-primary focus:border-primary focus:ring-2 focus:ring-primary/20',
        'hover:bg-bg-primary'
      ]
    };

    const resizeClasses = {
      none: 'resize-none',
      both: 'resize',
      horizontal: 'resize-x',
      vertical: 'resize-y'
    };

    const stateClasses = error 
      ? 'border-danger focus:border-danger focus:ring-danger/20' 
      : success 
      ? 'border-success focus:border-success focus:ring-success/20'
      : '';

    return (
      <div className="relative group">
        <textarea
          ref={ref}
          className={cn(
            baseClasses,
            variantClasses[variant],
            resizeClasses[resize],
            stateClasses,
            className
          )}
          {...props}
        />
        
        {/* 底部装饰线 */}
        {variant === 'default' && (
          <div className="absolute bottom-0 left-0 h-0.5 bg-primary transform scale-x-0 group-focus-within:scale-x-100 transition-transform duration-300 rounded-full" />
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// Select 组件 - 全新设计
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  success?: boolean;
  variant?: 'default' | 'minimal' | 'filled';
  selectSize?: 'sm' | 'md' | 'lg';
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ 
    className, 
    error,
    success, 
    children, 
    variant = 'default',
    selectSize = 'md',
    ...props 
  }, ref) => {
    const baseClasses = [
      'w-full font-medium transition-all duration-200',
      'rounded-lg border focus:outline-none appearance-none',
      'bg-no-repeat bg-right pr-10',
      'disabled:opacity-60 disabled:cursor-not-allowed',
    ];

    const variantClasses = {
      default: [
        'bg-bg-primary border-border-primary',
        'focus:border-primary focus:ring-2 focus:ring-primary/20',
        'hover:border-border-accent'
      ],
      minimal: [
        'bg-transparent border-0 border-b-2 border-border-primary',
        'focus:border-primary rounded-none px-0',
        'hover:border-border-accent'
      ],
      filled: [
        'bg-bg-secondary border-border-secondary',
        'focus:bg-bg-primary focus:border-primary focus:ring-2 focus:ring-primary/20',
        'hover:bg-bg-primary'
      ]
    };

    const sizeClasses = {
      sm: 'px-3 py-2 text-sm h-9',
      md: 'px-4 py-2.5 text-sm h-10',
      lg: 'px-4 py-3 text-base h-12'
    };

    const stateClasses = error 
      ? 'border-danger focus:border-danger focus:ring-danger/20' 
      : success 
      ? 'border-success focus:border-success focus:ring-success/20'
      : '';

    // 使用现代化的下拉箭头
    const arrowIcon = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTUgNy41TDEwIDEyLjVMMTUgNy41IiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+`;

    return (
      <div className="relative group">
        <select
          ref={ref}
          className={cn(
            baseClasses,
            variantClasses[variant],
            sizeClasses[selectSize],
            stateClasses,
            className
          )}
          style={{ 
            backgroundImage: `url("${arrowIcon}")`,
            backgroundPosition: 'right 12px center',
            backgroundSize: '20px'
          }}
          {...props}
        >
          {children}
        </select>
        
        {/* 底部装饰线 */}
        {variant === 'default' && (
          <div className="absolute bottom-0 left-0 h-0.5 bg-primary transform scale-x-0 group-focus-within:scale-x-100 transition-transform duration-300 rounded-full" />
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

// Label 组件 - 全新设计
export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
  weight?: 'normal' | 'medium' | 'semibold';
}

export function Label({ 
  className, 
  children, 
  required, 
  size = 'md',
  weight = 'medium',
  ...props 
}: LabelProps) {
  const sizeClasses = {
    sm: 'text-xs mb-1.5',
    md: 'text-sm mb-2',
    lg: 'text-base mb-2.5'
  };

  const weightClasses = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold'
  };

  return (
    <label
      className={cn(
        'block text-text-primary tracking-tight',
        sizeClasses[size],
        weightClasses[weight],
        className
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="text-danger ml-1 font-semibold">*</span>
      )}
    </label>
  );
}

// FormField 组件 - 全新设计
export interface FormFieldProps {
  children: React.ReactNode;
  className?: string;
  spacing?: 'sm' | 'md' | 'lg';
}

export function FormField({ 
  children, 
  className, 
  spacing = 'md' 
}: FormFieldProps) {
  const spacingClasses = {
    sm: 'space-y-1.5',
    md: 'space-y-2',
    lg: 'space-y-3'
  };

  return (
    <div className={cn(spacingClasses[spacing], className)}>
      {children}
    </div>
  );
}

// FieldError 组件 - 全新设计
export interface FieldErrorProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

export function FieldError({ 
  children, 
  className, 
  size = 'sm' 
}: FieldErrorProps) {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm'
  };

  return (
    <p className={cn(
      sizeClasses[size],
      'text-danger mt-1.5 font-medium flex items-start gap-1.5',
      className
    )}>
      <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {children}
    </p>
  );
}

// FieldSuccess 组件 - 新增
export interface FieldSuccessProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

export function FieldSuccess({ 
  children, 
  className, 
  size = 'sm' 
}: FieldSuccessProps) {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm'
  };

  return (
    <p className={cn(
      sizeClasses[size],
      'text-success mt-1.5 font-medium flex items-start gap-1.5',
      className
    )}>
      <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      {children}
    </p>
  );
}

// FieldHint 组件 - 新增
export interface FieldHintProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

export function FieldHint({ 
  children, 
  className, 
  size = 'sm' 
}: FieldHintProps) {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm'
  };

  return (
    <p className={cn(
      sizeClasses[size],
      'text-text-tertiary mt-1.5 leading-relaxed',
      className
    )}>
      {children}
    </p>
  );
}