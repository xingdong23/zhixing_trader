import React from 'react'
import { cn } from '@/utils/cn'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>
export function Input({ className, ...props }: InputProps) {
  return <input className={cn('w-full px-4 py-3 bg-surface border-2 border-border rounded-lg text-text-primary focus:outline-none focus:border-primary transition-all duration-200', className)} {...props} />
}

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>
export function Textarea({ className, ...props }: TextareaProps) {
  return <textarea className={cn('w-full px-4 py-3 bg-surface border-2 border-border rounded-lg text-text-primary focus:outline-none focus:border-primary transition-all duration-200 resize-none', className)} {...props} />
}

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>
export function Select({ className, ...props }: SelectProps) {
  return <select className={cn('w-full px-4 py-3 bg-surface border-2 border-border rounded-lg text-text-primary focus:outline-none focus:border-primary transition-all duration-200 cursor-pointer', className)} {...props} />
}
