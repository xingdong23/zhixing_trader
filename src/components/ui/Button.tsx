import React from 'react'
import { cn } from '@/utils/cn'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ className, variant = 'primary', size = 'md', ...props }: ButtonProps) {
  const base = 'btn disabled:opacity-50 disabled:pointer-events-none'
  const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'border-2 border-border text-text-primary hover:border-primary hover:bg-surface-light',
    ghost: 'text-text-primary hover:bg-surface-light',
    danger: 'bg-danger text-white hover:bg-danger-dark shadow-lg hover:shadow-xl',
    success: 'bg-success text-white hover:bg-success-dark shadow-lg hover:shadow-xl',
  }
  const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  }
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props} />
  )
}

export default Button
