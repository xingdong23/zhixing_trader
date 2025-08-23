// 【知行交易】极简现代化卡片组件
// 专业优雅的容器设计

import React from 'react';
import { cn } from '@/utils/cn';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
  variant?: 'default' | 'elevated' | 'outlined' | 'glass' | 'minimal';
  hover?: 'none' | 'lift' | 'scale' | 'glow' | 'border';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export function Card({ 
  children, 
  className, 
  onClick, 
  interactive = false,
  variant = 'default',
  hover = 'lift',
  padding = 'none'
}: CardProps) {
  const baseClasses = [
    'relative overflow-hidden transition-all duration-200 ease-out',
    'transform-gpu will-change-transform',
    (onClick || interactive) && 'cursor-pointer',
  ];

  const variantClasses = {
    default: [
      'bg-bg-primary border border-border-primary',
      'rounded-lg shadow-xs hover:shadow-sm',
    ],
    elevated: [
      'bg-bg-primary border border-border-primary',
      'rounded-lg shadow-sm hover:shadow-md',
    ],
    outlined: [
      'bg-bg-primary border border-border-primary',
      'rounded-lg hover:border-border-accent',
    ],
    glass: [
      'bg-bg-primary/90 backdrop-blur-sm border border-border-primary/60',
      'rounded-lg shadow-sm hover:shadow-md',
    ],
    minimal: [
      'bg-bg-secondary border-0',
      'rounded-md hover:bg-bg-hover',
    ],
  };

  const hoverClasses = {
    none: '',
    lift: 'hover:-translate-y-0.5',
    scale: 'hover:scale-[1.01]',
    glow: 'hover:shadow-md hover:shadow-primary/10',
    border: 'hover:border-primary',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  };

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        hover !== 'none' && hoverClasses[hover],
        paddingClasses[padding],
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  borderless?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CardHeader({ 
  children, 
  className, 
  borderless = false,
  size = 'md'
}: CardHeaderProps) {
  const sizeClasses = {
    sm: 'p-3 pb-2',
    md: 'p-4 pb-3',
    lg: 'p-6 pb-4',
  };

  return (
    <div 
      className={cn(
        sizeClasses[size],
        !borderless && 'border-b border-border-secondary',
        className
      )}
    >
      {children}
    </div>
  );
}

export interface CardContentProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function CardContent({ 
  children, 
  className, 
  size = 'md' 
}: CardContentProps) {
  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div className={cn(sizeClasses[size], className)}>
      {children}
    </div>
  );
}

export interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  gradient?: boolean;
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
}

export function CardTitle({ 
  children, 
  className, 
  size = 'lg',
  gradient = false,
  weight = 'semibold'
}: CardTitleProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
  };

  const weightClasses = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };

  return (
    <h3 
      className={cn(
        sizeClasses[size],
        weightClasses[weight],
        'leading-tight tracking-tight',
        gradient ? 'gradient-text' : 'text-text-primary',
        className
      )}
    >
      {children}
    </h3>
  );
}

export interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function CardDescription({ 
  children, 
  className,
  size = 'sm'
}: CardDescriptionProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <p className={cn(
      sizeClasses[size],
      'text-text-secondary mt-1.5 leading-relaxed',
      className
    )}>
      {children}
    </p>
  );
}

export interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
  borderless?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CardFooter({ 
  children, 
  className, 
  borderless = false,
  size = 'md'
}: CardFooterProps) {
  const sizeClasses = {
    sm: 'p-3 pt-2',
    md: 'p-4 pt-3',
    lg: 'p-6 pt-4',
  };

  return (
    <div 
      className={cn(
        sizeClasses[size],
        !borderless && 'border-t border-border-secondary',
        className
      )}
    >
      {children}
    </div>
  );
}

// 专用卡片变体组件
export function StatCard({ 
  children, 
  className, 
  ...props 
}: CardProps) {
  return (
    <Card
      variant="elevated"
      hover="lift"
      className={cn(
        'bg-gradient-to-br from-bg-primary to-bg-secondary/50',
        'border-border-secondary hover:border-primary/20',
        'hover:shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );
}

export function FeatureCard({ 
  children, 
  className, 
  ...props 
}: CardProps) {
  return (
    <Card
      variant="outlined"
      hover="glow"
      className={cn(
        'hover:border-primary/30 group',
        'transition-all duration-200',
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );
}

export function GlassCard({ 
  children, 
  className, 
  ...props 
}: CardProps) {
  return (
    <Card
      variant="glass"
      hover="scale"
      className={cn(
        'backdrop-blur-md bg-bg-primary/80',
        'border-border-primary/40',
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );
}

// 添加默认导出
export default Card;