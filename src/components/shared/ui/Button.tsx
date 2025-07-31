// 【知行交易】通用按钮组件
// 提供统一的按钮样式和功能

import React from 'react';
import { cn } from '../../../utils/cn';

// ==================== 类型定义 ====================

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 按钮变体 */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning';
  /** 按钮大小 */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** 是否加载中 */
  loading?: boolean;
  /** 是否为块级按钮 */
  block?: boolean;
  /** 图标（左侧） */
  icon?: React.ReactNode;
  /** 图标（右侧） */
  rightIcon?: React.ReactNode;
  /** 子元素 */
  children?: React.ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 是否为圆形按钮 */
  round?: boolean;
  /** 是否为方形按钮（仅图标） */
  square?: boolean;
}

export interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  /** 图标 */
  icon: React.ReactNode;
  /** 提示文本 */
  tooltip?: string;
}

export interface ButtonGroupProps {
  /** 子按钮 */
  children: React.ReactNode;
  /** 按钮组大小 */
  size?: ButtonProps['size'];
  /** 按钮组变体 */
  variant?: ButtonProps['variant'];
  /** 自定义类名 */
  className?: string;
  /** 是否垂直排列 */
  vertical?: boolean;
}

// ==================== 样式映射 ====================

const buttonVariants = {
  primary: {
    base: 'bg-blue-600 text-white border-blue-600',
    hover: 'hover:bg-blue-700 hover:border-blue-700',
    active: 'active:bg-blue-800',
    disabled: 'disabled:bg-blue-300 disabled:border-blue-300',
    focus: 'focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
  },
  secondary: {
    base: 'bg-gray-600 text-white border-gray-600',
    hover: 'hover:bg-gray-700 hover:border-gray-700',
    active: 'active:bg-gray-800',
    disabled: 'disabled:bg-gray-300 disabled:border-gray-300',
    focus: 'focus:ring-2 focus:ring-gray-500 focus:ring-offset-2',
  },
  outline: {
    base: 'bg-transparent text-gray-700 border-gray-300',
    hover: 'hover:bg-gray-50 hover:border-gray-400',
    active: 'active:bg-gray-100',
    disabled: 'disabled:text-gray-400 disabled:border-gray-200',
    focus: 'focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
  },
  ghost: {
    base: 'bg-transparent text-gray-700 border-transparent',
    hover: 'hover:bg-gray-100',
    active: 'active:bg-gray-200',
    disabled: 'disabled:text-gray-400',
    focus: 'focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
  },
  danger: {
    base: 'bg-red-600 text-white border-red-600',
    hover: 'hover:bg-red-700 hover:border-red-700',
    active: 'active:bg-red-800',
    disabled: 'disabled:bg-red-300 disabled:border-red-300',
    focus: 'focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
  },
  success: {
    base: 'bg-green-600 text-white border-green-600',
    hover: 'hover:bg-green-700 hover:border-green-700',
    active: 'active:bg-green-800',
    disabled: 'disabled:bg-green-300 disabled:border-green-300',
    focus: 'focus:ring-2 focus:ring-green-500 focus:ring-offset-2',
  },
  warning: {
    base: 'bg-yellow-600 text-white border-yellow-600',
    hover: 'hover:bg-yellow-700 hover:border-yellow-700',
    active: 'active:bg-yellow-800',
    disabled: 'disabled:bg-yellow-300 disabled:border-yellow-300',
    focus: 'focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2',
  },
};

const buttonSizes = {
  xs: {
    padding: 'px-2 py-1',
    text: 'text-xs',
    height: 'h-6',
    iconSize: 'w-3 h-3',
    gap: 'gap-1',
  },
  sm: {
    padding: 'px-3 py-1.5',
    text: 'text-sm',
    height: 'h-8',
    iconSize: 'w-4 h-4',
    gap: 'gap-1.5',
  },
  md: {
    padding: 'px-4 py-2',
    text: 'text-sm',
    height: 'h-10',
    iconSize: 'w-4 h-4',
    gap: 'gap-2',
  },
  lg: {
    padding: 'px-6 py-3',
    text: 'text-base',
    height: 'h-12',
    iconSize: 'w-5 h-5',
    gap: 'gap-2',
  },
  xl: {
    padding: 'px-8 py-4',
    text: 'text-lg',
    height: 'h-14',
    iconSize: 'w-6 h-6',
    gap: 'gap-3',
  },
};

// ==================== 工具函数 ====================

const getButtonClasses = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  block = false,
  round = false,
  square = false,
  className = '',
}: Partial<ButtonProps>) => {
  const variantStyles = buttonVariants[variant];
  const sizeStyles = buttonSizes[size];
  
  return cn(
    // 基础样式
    'inline-flex items-center justify-center font-medium transition-all duration-200',
    'border focus:outline-none',
    
    // 变体样式
    variantStyles.base,
    !disabled && !loading && variantStyles.hover,
    !disabled && !loading && variantStyles.active,
    variantStyles.focus,
    (disabled || loading) && variantStyles.disabled,
    
    // 大小样式
    sizeStyles.text,
    square ? sizeStyles.height : sizeStyles.padding,
    
    // 形状样式
    round ? 'rounded-full' : 'rounded-md',
    square && 'aspect-square',
    
    // 状态样式
    block && 'w-full',
    (disabled || loading) && 'cursor-not-allowed',
    loading && 'relative',
    
    // 自定义类名
    className
  );
};

// ==================== 加载动画组件 ====================

const LoadingSpinner: React.FC<{ size: ButtonProps['size'] }> = ({ size = 'md' }) => {
  const iconSize = buttonSizes[size].iconSize;
  
  return (
    <svg
      className={cn('animate-spin', iconSize)}
      xmlns="http://www.w3.org/2000/svg"
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
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

// ==================== 主要组件 ====================

/** 基础按钮组件 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    block = false,
    icon,
    rightIcon,
    children,
    className,
    round = false,
    square = false,
    disabled,
    ...props
  },
  ref
) => {
  const isDisabled = disabled || loading;
  const sizeStyles = buttonSizes[size];
  
  return (
    <button
      ref={ref}
      className={getButtonClasses({
        variant,
        size,
        loading,
        disabled: isDisabled,
        block,
        round,
        square,
        className,
      })}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <>
          <LoadingSpinner size={size} />
          {children && !square && (
            <span className="ml-2 opacity-70">{children}</span>
          )}
        </>
      ) : (
        <>
          {icon && (
            <span className={cn(sizeStyles.iconSize, children && sizeStyles.gap)}>
              {icon}
            </span>
          )}
          {children && !square && <span>{children}</span>}
          {rightIcon && (
            <span className={cn(sizeStyles.iconSize, children && sizeStyles.gap)}>
              {rightIcon}
            </span>
          )}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';

// ==================== 图标按钮组件 ====================

/** 图标按钮组件 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>((
  {
    icon,
    tooltip,
    size = 'md',
    variant = 'ghost',
    round = true,
    ...props
  },
  ref
) => {
  const button = (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      round={round}
      square
      icon={icon}
      {...props}
    />
  );
  
  if (tooltip) {
    return (
      <div className="relative group">
        {button}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
          {tooltip}
        </div>
      </div>
    );
  }
  
  return button;
});

IconButton.displayName = 'IconButton';

// ==================== 按钮组组件 ====================

/** 按钮组组件 */
export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  size,
  variant,
  className,
  vertical = false,
}) => {
  return (
    <div
      className={cn(
        'inline-flex',
        vertical ? 'flex-col' : 'flex-row',
        '[&>button]:rounded-none',
        vertical ? (
          '[&>button:first-child]:rounded-t-md [&>button:last-child]:rounded-b-md [&>button:not(:last-child)]:border-b-0'
        ) : (
          '[&>button:first-child]:rounded-l-md [&>button:last-child]:rounded-r-md [&>button:not(:last-child)]:border-r-0'
        ),
        className
      )}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === Button) {
          return React.cloneElement(child as React.ReactElement<ButtonProps>, {
            size: size || child.props.size,
            variant: variant || child.props.variant,
          });
        }
        return child;
      })}
    </div>
  );
};

// ==================== 预设按钮组件 ====================

/** 确认按钮 */
export const ConfirmButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="primary" {...props} />
);

/** 取消按钮 */
export const CancelButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="outline" {...props} />
);

/** 删除按钮 */
export const DeleteButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="danger" {...props} />
);

/** 提交按钮 */
export const SubmitButton: React.FC<Omit<ButtonProps, 'type'>> = (props) => (
  <Button type="submit" variant="primary" {...props} />
);

/** 重置按钮 */
export const ResetButton: React.FC<Omit<ButtonProps, 'type'>> = (props) => (
  <Button type="reset" variant="outline" {...props} />
);

// ==================== 复合按钮组件 ====================

/** 带确认的删除按钮 */
export interface ConfirmDeleteButtonProps extends Omit<ButtonProps, 'onClick'> {
  /** 确认回调 */
  onConfirm: () => void | Promise<void>;
  /** 确认提示文本 */
  confirmText?: string;
  /** 确认按钮文本 */
  confirmButtonText?: string;
  /** 取消按钮文本 */
  cancelButtonText?: string;
}

export const ConfirmDeleteButton: React.FC<ConfirmDeleteButtonProps> = ({
  onConfirm,
  confirmText = '确定要删除吗？此操作不可撤销。',
  confirmButtonText = '删除',
  cancelButtonText = '取消',
  children = '删除',
  ...props
}) => {
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  
  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
      setShowConfirm(false);
    } catch (error) {
      console.error('删除操作失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (showConfirm) {
    return (
      <div className="inline-flex flex-col gap-2 p-3 bg-white border border-red-200 rounded-lg shadow-lg">
        <p className="text-sm text-gray-700">{confirmText}</p>
        <div className="flex gap-2">
          <Button
            variant="danger"
            size="sm"
            loading={loading}
            onClick={handleConfirm}
          >
            {confirmButtonText}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => setShowConfirm(false)}
          >
            {cancelButtonText}
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <DeleteButton
      {...props}
      onClick={() => setShowConfirm(true)}
    >
      {children}
    </DeleteButton>
  );
};

// ==================== 工具函数导出 ====================

/** 创建按钮配置 */
export const createButtonConfig = (config: Partial<ButtonProps>) => config;

/** 按钮样式工具 */
export const buttonUtils = {
  getVariantClasses: (variant: ButtonProps['variant'] = 'primary') => buttonVariants[variant],
  getSizeClasses: (size: ButtonProps['size'] = 'md') => buttonSizes[size],
  getButtonClasses,
};

// ==================== 默认导出 ====================

export default Button;