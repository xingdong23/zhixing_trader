// 【知行交易】全新现代化对话框组件
// 简洁优雅的弹窗设计

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/utils/cn';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  title?: string;
  description?: string;
  showCloseButton?: boolean;
  closable?: boolean;
  centered?: boolean;
  blur?: boolean;
  animation?: 'fade' | 'scale' | 'slide-up' | 'slide-down';
}

export function Modal({ 
  open, 
  onClose, 
  children, 
  className, 
  size = 'md',
  title,
  description,
  showCloseButton = true,
  closable = true,
  centered = true,
  blur = true,
  animation = 'scale'
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // 防止背景滚动
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  // ESC 键关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closable && open) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, closable, onClose]);

  // 焦点管理
  useEffect(() => {
    if (open && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      firstElement?.focus();
    }
  }, [open]);

  if (!open) return null;

  const sizeClasses = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    '2xl': 'max-w-4xl',
    full: 'max-w-[95vw] max-h-[95vh] w-full h-full'
  };

  const animationClasses = {
    fade: 'animate-fade-in',
    scale: 'animate-scale-in',
    'slide-up': 'animate-slide-up',
    'slide-down': 'animate-slide-down'
  };

  const modalContent = (
    <div 
      className={cn(
        'fixed inset-0 z-[1030] flex p-4',
        centered ? 'items-center justify-center' : 'items-start justify-center pt-16'
      )}
    >
      {/* 背景遮罩 */}
      <div 
        className={cn(
          'absolute inset-0 bg-black/60 transition-opacity duration-300',
          blur && 'backdrop-blur-sm'
        )}
        onClick={closable ? onClose : undefined}
      />
      
      {/* 对话框内容 */}
      <div 
        ref={modalRef}
        className={cn(
          'relative z-10 w-full bg-bg-primary border border-border-primary',
          'rounded-2xl shadow-2xl transition-all duration-300',
          'max-h-[90vh] flex flex-col',
          sizeClasses[size],
          animationClasses[animation],
          className
        )}
      >
        {/* 标题栏 */}
        {(title || description || showCloseButton) && (
          <div className="flex items-start justify-between p-6 pb-4">
            <div className="flex-1">
              {title && (
                <h2 className="text-xl font-bold text-text-primary mb-1">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-sm text-text-secondary leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            
            {showCloseButton && closable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="ml-4 -mt-2 -mr-2 rounded-lg w-8 h-8 p-0 hover:bg-bg-hover"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
        
        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto scrollbar-none">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export interface ModalHeaderProps {
  children: React.ReactNode;
  className?: string;
  borderless?: boolean;
}

export function ModalHeader({ children, className, borderless = false }: ModalHeaderProps) {
  return (
    <div className={cn(
      'px-6 py-4',
      !borderless && 'border-b border-border-secondary',
      className
    )}>
      {children}
    </div>
  );
}

export interface ModalTitleProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function ModalTitle({ children, className, size = 'lg' }: ModalTitleProps) {
  const sizeClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl'
  };

  return (
    <h3 className={cn(
      'font-bold text-text-primary leading-tight',
      sizeClasses[size],
      className
    )}>
      {children}
    </h3>
  );
}

export interface ModalDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalDescription({ children, className }: ModalDescriptionProps) {
  return (
    <p className={cn(
      'text-sm text-text-secondary leading-relaxed mt-1',
      className
    )}>
      {children}
    </p>
  );
}

export interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function ModalBody({ children, className, padding = 'md' }: ModalBodyProps) {
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

export interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
  justify?: 'start' | 'center' | 'end' | 'between';
  borderless?: boolean;
}

export function ModalFooter({ 
  children, 
  className, 
  justify = 'end',
  borderless = false 
}: ModalFooterProps) {
  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between'
  };

  return (
    <div className={cn(
      'px-6 py-4 flex items-center gap-3',
      !borderless && 'border-t border-border-secondary',
      justifyClasses[justify],
      className
    )}>
      {children}
    </div>
  );
}

// 确认对话框组件
export interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'danger',
  loading = false
}: ConfirmModalProps) {
  const handleConfirm = () => {
    onConfirm();
    if (!loading) {
      onClose();
    }
  };

  const variantStyles = {
    danger: 'danger',
    warning: 'secondary',
    info: 'primary'
  } as const;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={title}
      description={description}
    >
      <ModalFooter>
        <Button
          variant="ghost"
          onClick={onClose}
          disabled={loading}
        >
          {cancelText}
        </Button>
        <Button
          variant={variantStyles[variant]}
          onClick={handleConfirm}
          loading={loading}
        >
          {confirmText}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default Modal;