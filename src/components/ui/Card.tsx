// 【知行交易】现代化卡片组件
// 专业金融系统UI组件 - Card

import React from 'react';
import { cn } from '@/utils/cn';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
  variant?: 'default' | 'gradient' | 'glass' | 'outline';
  glow?: boolean;
}

export function Card({ 
  children, 
  className, 
  onClick, 
  interactive = false,
  variant = 'default',
  glow = false
}: CardProps) {
  const baseClasses = [
    'rounded-lg transition-all duration-200',
    onClick && 'cursor-pointer',
    interactive && 'hover:-translate-y-1 hover:shadow-lg'
  ];

  const variantClasses = {
    default: [
      'bg-bg-secondary border border-border-secondary',
      'shadow-sm hover:border-border-primary'
    ],
    gradient: [
      'bg-gradient-to-br from-bg-secondary to-bg-tertiary',
      'border border-border-secondary shadow-md'
    ],
    glass: [
      'bg-bg-secondary/50 backdrop-filter backdrop-blur-xl',
      'border border-border-secondary/50'
    ],
    outline: [
      'bg-transparent border-2 border-border-primary',
      'hover:border-border-accent hover:bg-bg-secondary/30'
    ]
  };

  const glowClasses = glow ? 'shadow-glow' : '';

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        glowClasses,
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
}

export function CardHeader({ children, className, borderless = false }: CardHeaderProps) {
  return (
    <div 
      className={cn(
        'p-6 pb-4',
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
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function CardContent({ children, className, padding = 'md' }: CardContentProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <div className={cn(paddingClasses[padding], className)}>
      {children}
    </div>
  );
}

export interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  gradient?: boolean;
}

export function CardTitle({ children, className, size = 'lg', gradient = false }: CardTitleProps) {
  const sizeClasses = {
    sm: 'text-base font-semibold',
    md: 'text-lg font-semibold',
    lg: 'text-xl font-bold',
    xl: 'text-2xl font-bold'
  };

  return (
    <h3 
      className={cn(
        sizeClasses[size],
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
}

export function CardDescription({ children, className }: CardDescriptionProps) {
  return (
    <p className={cn('text-sm text-text-secondary mt-2 leading-relaxed', className)}>
      {children}
    </p>
  );
}

export interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
  borderless?: boolean;
}

export function CardFooter({ children, className, borderless = false }: CardFooterProps) {
  return (
    <div 
      className={cn(
        'p-6 pt-4',
        !borderless && 'border-t border-border-secondary',
        className
      )}
    >
      {children}
    </div>
  );
}
