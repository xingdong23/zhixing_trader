// 【知行交易】通用表单组件
// 提供统一的表单样式和功能

import React from 'react';
import { cn } from '../../../utils/cn';

// ==================== 类型定义 ====================

export interface FormFieldProps {
  /** 字段标签 */
  label?: string;
  /** 字段名称 */
  name?: string;
  /** 是否必填 */
  required?: boolean;
  /** 错误信息 */
  error?: string;
  /** 帮助文本 */
  help?: string;
  /** 字段描述 */
  description?: string;
  /** 子元素 */
  children: React.ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 标签位置 */
  labelPosition?: 'top' | 'left' | 'right';
  /** 标签宽度（当位置为left/right时） */
  labelWidth?: string;
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** 输入框变体 */
  variant?: 'default' | 'filled' | 'outline';
  /** 输入框大小 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否有错误 */
  error?: boolean;
  /** 左侧图标 */
  leftIcon?: React.ReactNode;
  /** 右侧图标 */
  rightIcon?: React.ReactNode;
  /** 是否加载中 */
  loading?: boolean;
  /** 自定义类名 */
  className?: string;
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** 文本域变体 */
  variant?: 'default' | 'filled' | 'outline';
  /** 文本域大小 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否有错误 */
  error?: boolean;
  /** 是否自动调整高度 */
  autoResize?: boolean;
  /** 最小行数 */
  minRows?: number;
  /** 最大行数 */
  maxRows?: number;
  /** 自定义类名 */
  className?: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** 选择框变体 */
  variant?: 'default' | 'filled' | 'outline';
  /** 选择框大小 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否有错误 */
  error?: boolean;
  /** 选项列表 */
  options?: Array<{ value: string | number; label: string; disabled?: boolean }>;
  /** 占位符 */
  placeholder?: string;
  /** 自定义类名 */
  className?: string;
}

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** 复选框标签 */
  label?: string;
  /** 复选框大小 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否有错误 */
  error?: boolean;
  /** 是否为中间状态 */
  indeterminate?: boolean;
  /** 自定义类名 */
  className?: string;
}

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** 单选框标签 */
  label?: string;
  /** 单选框大小 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否有错误 */
  error?: boolean;
  /** 自定义类名 */
  className?: string;
}

export interface RadioGroupProps {
  /** 组名称 */
  name: string;
  /** 当前值 */
  value?: string | number;
  /** 值变化回调 */
  onChange?: (value: string | number) => void;
  /** 选项列表 */
  options: Array<{ value: string | number; label: string; disabled?: boolean }>;
  /** 单选框大小 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否有错误 */
  error?: boolean;
  /** 排列方向 */
  direction?: 'horizontal' | 'vertical';
  /** 自定义类名 */
  className?: string;
}

// ==================== 样式映射 ====================

const inputVariants = {
  default: {
    base: 'border-gray-300 bg-white',
    focus: 'focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
    error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
  },
  filled: {
    base: 'border-transparent bg-gray-100',
    focus: 'focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
    error: 'bg-red-50 border-red-500 focus:border-red-500 focus:ring-red-500',
  },
  outline: {
    base: 'border-2 border-gray-200 bg-transparent',
    focus: 'focus:border-blue-500',
    error: 'border-red-500 focus:border-red-500',
  },
};

const inputSizes = {
  sm: {
    input: 'px-3 py-1.5 text-sm',
    icon: 'w-4 h-4',
    height: 'h-8',
  },
  md: {
    input: 'px-4 py-2 text-sm',
    icon: 'w-5 h-5',
    height: 'h-10',
  },
  lg: {
    input: 'px-4 py-3 text-base',
    icon: 'w-6 h-6',
    height: 'h-12',
  },
};

const checkboxSizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

// ==================== 工具函数 ====================

const getInputClasses = ({
  variant = 'default',
  size = 'md',
  error = false,
  hasLeftIcon = false,
  hasRightIcon = false,
  className = '',
}: {
  variant?: InputProps['variant'];
  size?: InputProps['size'];
  error?: boolean;
  hasLeftIcon?: boolean;
  hasRightIcon?: boolean;
  className?: string;
}) => {
  const variantStyles = inputVariants[variant];
  const sizeStyles = inputSizes[size];
  
  return cn(
    // 基础样式
    'block w-full rounded-md border transition-colors duration-200',
    'placeholder-gray-400 focus:outline-none',
    
    // 变体样式
    variantStyles.base,
    error ? variantStyles.error : variantStyles.focus,
    
    // 大小样式
    sizeStyles.input,
    
    // 图标间距
    hasLeftIcon && 'pl-10',
    hasRightIcon && 'pr-10',
    
    // 禁用状态
    'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
    
    // 自定义类名
    className
  );
};

// ==================== 基础组件 ====================

/** 表单字段容器 */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  required = false,
  error,
  help,
  description,
  children,
  className,
  labelPosition = 'top',
  labelWidth = '120px',
}) => {
  const isHorizontal = labelPosition === 'left' || labelPosition === 'right';
  
  return (
    <div className={cn(
      'space-y-1',
      isHorizontal && 'flex items-start gap-4',
      className
    )}>
      {label && (
        <label
          htmlFor={name}
          className={cn(
            'block text-sm font-medium text-gray-700',
            isHorizontal && 'flex-shrink-0 mt-2',
            labelPosition === 'right' && 'order-2'
          )}
          style={isHorizontal ? { width: labelWidth } : undefined}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className={cn(
        'space-y-1',
        isHorizontal && 'flex-1'
      )}>
        {children}
        
        {description && (
          <p className="text-xs text-gray-500">{description}</p>
        )}
        
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
        
        {help && !error && (
          <p className="text-xs text-gray-500">{help}</p>
        )}
      </div>
    </div>
  );
};

/** 输入框组件 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>((
  {
    variant = 'default',
    size = 'md',
    error = false,
    leftIcon,
    rightIcon,
    loading = false,
    className,
    ...props
  },
  ref
) => {
  const sizeStyles = inputSizes[size];
  
  return (
    <div className="relative">
      {leftIcon && (
        <div className={cn(
          'absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400',
          sizeStyles.icon
        )}>
          {leftIcon}
        </div>
      )}
      
      <input
        ref={ref}
        className={getInputClasses({
          variant,
          size,
          error,
          hasLeftIcon: !!leftIcon,
          hasRightIcon: !!(rightIcon || loading),
          className,
        })}
        {...props}
      />
      
      {(rightIcon || loading) && (
        <div className={cn(
          'absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400',
          sizeStyles.icon
        )}>
          {loading ? (
            <svg className="animate-spin" fill="none" viewBox="0 0 24 24">
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
          ) : (
            rightIcon
          )}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

/** 文本域组件 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>((
  {
    variant = 'default',
    size = 'md',
    error = false,
    autoResize = false,
    minRows = 3,
    maxRows = 10,
    className,
    onChange,
    ...props
  },
  ref
) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  
  React.useImperativeHandle(ref, () => textareaRef.current!);
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (autoResize && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
      const minHeight = lineHeight * minRows;
      const maxHeight = lineHeight * maxRows;
      
      const scrollHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
      textarea.style.height = `${scrollHeight}px`;
    }
    
    onChange?.(e);
  };
  
  return (
    <textarea
      ref={textareaRef}
      className={getInputClasses({
        variant,
        size,
        error,
        className,
      })}
      rows={autoResize ? minRows : props.rows || minRows}
      onChange={handleChange}
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';

/** 选择框组件 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>((
  {
    variant = 'default',
    size = 'md',
    error = false,
    options = [],
    placeholder,
    className,
    children,
    ...props
  },
  ref
) => {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          getInputClasses({ variant, size, error, hasRightIcon: true, className }),
          'appearance-none cursor-pointer'
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
        {children}
      </select>
      
      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
});

Select.displayName = 'Select';

/** 复选框组件 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>((
  {
    label,
    size = 'md',
    error = false,
    indeterminate = false,
    className,
    ...props
  },
  ref
) => {
  const checkboxRef = React.useRef<HTMLInputElement>(null);
  
  React.useImperativeHandle(ref, () => checkboxRef.current!);
  
  React.useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);
  
  return (
    <label className={cn(
      'inline-flex items-center gap-2 cursor-pointer',
      props.disabled && 'cursor-not-allowed opacity-50',
      className
    )}>
      <input
        ref={checkboxRef}
        type="checkbox"
        className={cn(
          'rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0',
          error && 'border-red-500 focus:ring-red-500',
          checkboxSizes[size]
        )}
        {...props}
      />
      {label && (
        <span className="text-sm text-gray-700 select-none">
          {label}
        </span>
      )}
    </label>
  );
});

Checkbox.displayName = 'Checkbox';

/** 单选框组件 */
export const Radio = React.forwardRef<HTMLInputElement, RadioProps>((
  {
    label,
    size = 'md',
    error = false,
    className,
    ...props
  },
  ref
) => {
  return (
    <label className={cn(
      'inline-flex items-center gap-2 cursor-pointer',
      props.disabled && 'cursor-not-allowed opacity-50',
      className
    )}>
      <input
        ref={ref}
        type="radio"
        className={cn(
          'border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0',
          error && 'border-red-500 focus:ring-red-500',
          checkboxSizes[size]
        )}
        {...props}
      />
      {label && (
        <span className="text-sm text-gray-700 select-none">
          {label}
        </span>
      )}
    </label>
  );
});

Radio.displayName = 'Radio';

/** 单选框组组件 */
export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  value,
  onChange,
  options,
  size = 'md',
  error = false,
  direction = 'vertical',
  className,
}) => {
  return (
    <div className={cn(
      'space-y-2',
      direction === 'horizontal' && 'flex flex-wrap gap-4 space-y-0',
      className
    )}>
      {options.map((option) => (
        <Radio
          key={option.value}
          name={name}
          value={option.value}
          label={option.label}
          size={size}
          error={error}
          disabled={option.disabled}
          checked={value === option.value}
          onChange={() => onChange?.(option.value)}
        />
      ))}
    </div>
  );
};

// ==================== 复合组件 ====================

/** 搜索输入框 */
export const SearchInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'leftIcon' | 'type'>>((
  props,
  ref
) => {
  return (
    <Input
      ref={ref}
      type="search"
      leftIcon={
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      }
      placeholder="搜索..."
      {...props}
    />
  );
});

SearchInput.displayName = 'SearchInput';

/** 密码输入框 */
export const PasswordInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'rightIcon' | 'type'>>((
  props,
  ref
) => {
  const [showPassword, setShowPassword] = React.useState(false);
  
  return (
    <Input
      ref={ref}
      type={showPassword ? 'text' : 'password'}
      rightIcon={
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="text-gray-400 hover:text-gray-600"
        >
          {showPassword ? (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
            </svg>
          ) : (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      }
      {...props}
    />
  );
});

PasswordInput.displayName = 'PasswordInput';

// ==================== 工具函数导出 ====================

/** 表单验证工具 */
export const formUtils = {
  /** 验证必填字段 */
  required: (value: any) => {
    if (value === null || value === undefined || value === '') {
      return '此字段为必填项';
    }
    return null;
  },
  
  /** 验证邮箱格式 */
  email: (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailRegex.test(value)) {
      return '请输入有效的邮箱地址';
    }
    return null;
  },
  
  /** 验证最小长度 */
  minLength: (min: number) => (value: string) => {
    if (value && value.length < min) {
      return `最少需要 ${min} 个字符`;
    }
    return null;
  },
  
  /** 验证最大长度 */
  maxLength: (max: number) => (value: string) => {
    if (value && value.length > max) {
      return `最多允许 ${max} 个字符`;
    }
    return null;
  },
  
  /** 验证数字范围 */
  numberRange: (min: number, max: number) => (value: number) => {
    if (value !== undefined && (value < min || value > max)) {
      return `数值必须在 ${min} 到 ${max} 之间`;
    }
    return null;
  },
};

// ==================== 默认导出 ====================

export default FormField;