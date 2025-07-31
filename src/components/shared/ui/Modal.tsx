// 【知行交易】通用模态框组件
// 提供统一的模态框样式和功能

import React from 'react';
import { cn } from '../../../utils/cn';

// ==================== 类型定义 ====================

export interface ModalProps {
  /** 是否显示模态框 */
  open: boolean;
  /** 关闭模态框回调 */
  onClose: () => void;
  /** 模态框标题 */
  title?: React.ReactNode;
  /** 模态框内容 */
  children: React.ReactNode;
  /** 模态框大小 */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** 是否显示关闭按钮 */
  showCloseButton?: boolean;
  /** 是否点击遮罩关闭 */
  closeOnOverlayClick?: boolean;
  /** 是否按ESC关闭 */
  closeOnEscape?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 遮罩层类名 */
  overlayClassName?: string;
  /** 是否居中显示 */
  centered?: boolean;
  /** 是否全屏显示 */
  fullscreen?: boolean;
  /** 动画类型 */
  animation?: 'fade' | 'slide' | 'zoom' | 'none';
  /** z-index值 */
  zIndex?: number;
}

export interface ModalHeaderProps {
  /** 标题 */
  title?: React.ReactNode;
  /** 是否显示关闭按钮 */
  showCloseButton?: boolean;
  /** 关闭回调 */
  onClose?: () => void;
  /** 自定义类名 */
  className?: string;
  /** 子元素 */
  children?: React.ReactNode;
}

export interface ModalBodyProps {
  /** 子元素 */
  children: React.ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 是否有内边距 */
  padding?: boolean;
}

export interface ModalFooterProps {
  /** 子元素 */
  children: React.ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right' | 'between';
}

export interface ConfirmModalProps {
  /** 是否显示 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 确认回调 */
  onConfirm: () => void | Promise<void>;
  /** 标题 */
  title?: string;
  /** 内容 */
  content?: React.ReactNode;
  /** 确认按钮文本 */
  confirmText?: string;
  /** 取消按钮文本 */
  cancelText?: string;
  /** 确认按钮类型 */
  confirmType?: 'primary' | 'danger' | 'warning';
  /** 是否加载中 */
  loading?: boolean;
}

// ==================== 样式映射 ====================

const modalSizes = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-full mx-4',
};

const animations = {
  fade: {
    overlay: {
      enter: 'transition-opacity duration-300 ease-out',
      enterFrom: 'opacity-0',
      enterTo: 'opacity-100',
      leave: 'transition-opacity duration-200 ease-in',
      leaveFrom: 'opacity-100',
      leaveTo: 'opacity-0',
    },
    content: {
      enter: 'transition-all duration-300 ease-out',
      enterFrom: 'opacity-0 scale-95',
      enterTo: 'opacity-100 scale-100',
      leave: 'transition-all duration-200 ease-in',
      leaveFrom: 'opacity-100 scale-100',
      leaveTo: 'opacity-0 scale-95',
    },
  },
  slide: {
    overlay: {
      enter: 'transition-opacity duration-300 ease-out',
      enterFrom: 'opacity-0',
      enterTo: 'opacity-100',
      leave: 'transition-opacity duration-200 ease-in',
      leaveFrom: 'opacity-100',
      leaveTo: 'opacity-0',
    },
    content: {
      enter: 'transition-all duration-300 ease-out',
      enterFrom: 'opacity-0 translate-y-4',
      enterTo: 'opacity-100 translate-y-0',
      leave: 'transition-all duration-200 ease-in',
      leaveFrom: 'opacity-100 translate-y-0',
      leaveTo: 'opacity-0 translate-y-4',
    },
  },
  zoom: {
    overlay: {
      enter: 'transition-opacity duration-300 ease-out',
      enterFrom: 'opacity-0',
      enterTo: 'opacity-100',
      leave: 'transition-opacity duration-200 ease-in',
      leaveFrom: 'opacity-100',
      leaveTo: 'opacity-0',
    },
    content: {
      enter: 'transition-all duration-300 ease-out',
      enterFrom: 'opacity-0 scale-50',
      enterTo: 'opacity-100 scale-100',
      leave: 'transition-all duration-200 ease-in',
      leaveFrom: 'opacity-100 scale-100',
      leaveTo: 'opacity-0 scale-50',
    },
  },
  none: {
    overlay: {
      enter: '',
      enterFrom: '',
      enterTo: '',
      leave: '',
      leaveFrom: '',
      leaveTo: '',
    },
    content: {
      enter: '',
      enterFrom: '',
      enterTo: '',
      leave: '',
      leaveFrom: '',
      leaveTo: '',
    },
  },
};

const footerAlignments = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
  between: 'justify-between',
};

// ==================== Hooks ====================

/** 模态框状态管理Hook */
export const useModal = (initialOpen = false) => {
  const [open, setOpen] = React.useState(initialOpen);
  
  const openModal = React.useCallback(() => setOpen(true), []);
  const closeModal = React.useCallback(() => setOpen(false), []);
  const toggleModal = React.useCallback(() => setOpen(prev => !prev), []);
  
  return {
    open,
    openModal,
    closeModal,
    toggleModal,
  };
};

/** ESC键关闭Hook */
const useEscapeKey = (onEscape: () => void, enabled = true) => {
  React.useEffect(() => {
    if (!enabled) return;
    
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscape();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onEscape, enabled]);
};

/** 焦点锁定Hook */
const useFocusLock = (enabled = true) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    if (!enabled || !containerRef.current) return;
    
    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      
      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };
    
    // 自动聚焦到第一个可聚焦元素
    firstElement?.focus();
    
    container.addEventListener('keydown', handleTabKey);
    return () => container.removeEventListener('keydown', handleTabKey);
  }, [enabled]);
  
  return containerRef;
};

/** 滚动锁定Hook */
const useScrollLock = (enabled = true) => {
  React.useEffect(() => {
    if (!enabled) return;
    
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [enabled]);
};

// ==================== 子组件 ====================

/** 模态框头部 */
export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  showCloseButton = true,
  onClose,
  className,
  children,
}) => {
  return (
    <div className={cn(
      'flex items-center justify-between p-6 border-b border-gray-200',
      className
    )}>
      <div className="flex-1">
        {title && (
          <h3 className="text-lg font-semibold text-gray-900">
            {title}
          </h3>
        )}
        {children}
      </div>
      
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className="ml-4 text-gray-400 hover:text-gray-600 transition-colors duration-200"
          aria-label="关闭"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

/** 模态框主体 */
export const ModalBody: React.FC<ModalBodyProps> = ({
  children,
  className,
  padding = true,
}) => {
  return (
    <div className={cn(
      'flex-1 overflow-y-auto',
      padding && 'p-6',
      className
    )}>
      {children}
    </div>
  );
};

/** 模态框底部 */
export const ModalFooter: React.FC<ModalFooterProps> = ({
  children,
  className,
  align = 'right',
}) => {
  return (
    <div className={cn(
      'flex items-center gap-3 p-6 border-t border-gray-200',
      footerAlignments[align],
      className
    )}>
      {children}
    </div>
  );
};

// ==================== 主要组件 ====================

/** 基础模态框组件 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className,
  overlayClassName,
  centered = true,
  fullscreen = false,
  animation = 'fade',
  zIndex = 50,
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const focusLockRef = useFocusLock(open);
  
  useScrollLock(open);
  useEscapeKey(onClose, open && closeOnEscape);
  
  React.useEffect(() => {
    if (open) {
      setIsVisible(true);
      setIsAnimating(true);
      // 延迟一帧以确保动画正常播放
      requestAnimationFrame(() => {
        setIsAnimating(false);
      });
    } else {
      setIsAnimating(true);
      // 等待动画完成后隐藏
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsAnimating(false);
      }, animation === 'none' ? 0 : 200);
      return () => clearTimeout(timer);
    }
  }, [open, animation]);
  
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };
  
  if (!isVisible) return null;
  
  const animationConfig = animations[animation];
  const isEntering = open && isAnimating;
  const isLeaving = !open && isAnimating;
  
  return (
    <div
      className={cn(
        'fixed inset-0 flex items-center justify-center',
        `z-${zIndex}`,
        !centered && 'items-start pt-16'
      )}
      style={{ zIndex }}
    >
      {/* 遮罩层 */}
      <div
        className={cn(
          'absolute inset-0 bg-black/50',
          animationConfig.overlay.enter,
          isEntering && animationConfig.overlay.enterFrom,
          !isAnimating && open && animationConfig.overlay.enterTo,
          isLeaving && animationConfig.overlay.leaveFrom,
          isLeaving && animationConfig.overlay.leaveTo,
          overlayClassName
        )}
        onClick={handleOverlayClick}
      />
      
      {/* 模态框内容 */}
      <div
        ref={focusLockRef}
        className={cn(
          'relative bg-white rounded-lg shadow-xl max-h-[90vh] flex flex-col',
          fullscreen ? 'w-full h-full max-w-none max-h-none rounded-none' : modalSizes[size],
          animationConfig.content.enter,
          isEntering && animationConfig.content.enterFrom,
          !isAnimating && open && animationConfig.content.enterTo,
          isLeaving && animationConfig.content.leaveFrom,
          isLeaving && animationConfig.content.leaveTo,
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <ModalHeader
            title={title}
            showCloseButton={showCloseButton}
            onClose={onClose}
          />
        )}
        
        <ModalBody>
          {children}
        </ModalBody>
      </div>
    </div>
  );
};

// ==================== 预设模态框组件 ====================

/** 确认模态框 */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  onClose,
  onConfirm,
  title = '确认操作',
  content = '确定要执行此操作吗？',
  confirmText = '确认',
  cancelText = '取消',
  confirmType = 'primary',
  loading = false,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  
  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('确认操作失败:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const confirmButtonClass = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
  }[confirmType];
  
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      closeOnOverlayClick={!isLoading && !loading}
      closeOnEscape={!isLoading && !loading}
    >
      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          {content}
        </div>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading || loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={isLoading || loading}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              confirmButtonClass
            )}
          >
            {(isLoading || loading) && (
              <svg className="w-4 h-4 mr-2 animate-spin inline" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

/** 信息模态框 */
export interface InfoModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  content: React.ReactNode;
  type?: 'info' | 'success' | 'warning' | 'error';
  buttonText?: string;
}

export const InfoModal: React.FC<InfoModalProps> = ({
  open,
  onClose,
  title,
  content,
  type = 'info',
  buttonText = '知道了',
}) => {
  const typeConfig = {
    info: {
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: title || '信息',
    },
    success: {
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: title || '成功',
    },
    warning: {
      icon: (
        <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      title: title || '警告',
    },
    error: {
      icon: (
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: title || '错误',
    },
  }[type];
  
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          {typeConfig.icon}
          <span>{typeConfig.title}</span>
        </div>
      }
      size="sm"
    >
      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          {content}
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors duration-200"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ==================== 工具函数导出 ====================

/** 模态框工具函数 */
export const modalUtils = {
  /** 创建确认对话框 */
  confirm: (options: Omit<ConfirmModalProps, 'open' | 'onClose'>) => {
    return new Promise<boolean>((resolve) => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      
      const cleanup = () => {
        document.body.removeChild(container);
      };
      
      const handleConfirm = async () => {
        try {
          await options.onConfirm();
          resolve(true);
        } catch (error) {
          resolve(false);
        } finally {
          cleanup();
        }
      };
      
      const handleClose = () => {
        resolve(false);
        cleanup();
      };
      
      // 这里需要使用React渲染，实际项目中可能需要配合状态管理
      // 这只是一个示例实现
    });
  },
  
  /** 获取模态框样式类 */
  getModalClasses: (size: ModalProps['size'] = 'md') => modalSizes[size],
  
  /** 获取动画类 */
  getAnimationClasses: (animation: ModalProps['animation'] = 'fade') => animations[animation],
};

// ==================== 默认导出 ====================

export default Modal;