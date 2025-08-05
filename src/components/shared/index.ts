// 【知行交易】共享组件统一导出
// 提供所有共享组件的统一入口

// ==================== UI 基础组件 ====================

// 卡片组件
export {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  type CardProps,
  type CardHeaderProps,
  type CardContentProps,
} from '@/components/ui/Card';

// 表格组件
// Table is not ready in ui; re-export nothing to avoid breakage

// 按钮组件
export { Button, type ButtonProps } from '@/components/ui/Button';

// 表单组件
export { Input, Textarea, type InputProps, type TextareaProps } from '@/components/ui/Form';

// 模态框组件
export { Modal, type ModalProps } from '@/components/ui/Modal';

// ==================== 业务组件 ====================

// 数据库管理组件（将要重构）
// export { DatabaseAdmin } from './business/DatabaseAdmin';

// 股票市场组件（将要重构）
// export { StockMarket } from './business/StockMarket';

// ==================== 布局组件 ====================

// 页面布局
// export { PageLayout } from './layout/PageLayout';

// 侧边栏
// export { Sidebar } from './layout/Sidebar';

// 导航栏
// export { Navbar } from './layout/Navbar';

// ==================== 工具组件 ====================

// 加载状态
// export { Loading } from './utils/Loading';

// 错误边界
// export { ErrorBoundary } from './utils/ErrorBoundary';

// 空状态
// export { EmptyState } from './utils/EmptyState';

// ==================== 类型集合 ====================
// 注意：类型集合已通过各个模块的 export 语句导出，无需重复定义
// 所有类型定义请参考各模块的具体导出

// ==================== 工具函数集合 ====================

// 先导入所有工具函数
// utils removed in minimal ui extraction

// 类型已在上方的组件导出中包含，无需重复导出

/** 所有工具函数集合 */
export const sharedUtils = {} as const;

// ==================== 常量定义 ====================

/** 组件默认配置 */
export const DEFAULT_COMPONENT_CONFIG = {
  card: {
    variant: 'default' as const,
    size: 'md' as const,
    padding: 'md' as const,
  },
  table: {
    size: 'md' as const,
    bordered: true,
    striped: false,
    hoverable: true,
  },
  button: {
    variant: 'primary' as const,
    size: 'md' as const,
    loading: false,
    block: false,
  },
  form: {
    variant: 'default' as const,
    size: 'md' as const,
    labelPosition: 'top' as const,
  },
  modal: {
    size: 'md' as const,
    centered: true,
    animation: 'fade' as const,
    closeOnOverlayClick: true,
    closeOnEscape: true,
  },
} as const;

/** 组件尺寸选项 */
export const COMPONENT_SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

/** 组件变体选项 */
export const COMPONENT_VARIANTS = {
  card: ['default', 'outlined', 'elevated', 'filled'] as const,
  button: ['primary', 'secondary', 'outline', 'ghost', 'danger', 'success', 'warning'] as const,
  form: ['default', 'filled', 'outline'] as const,
} as const;

// ==================== 版本信息 ====================

/** 共享组件库版本 */
export const SHARED_COMPONENTS_VERSION = '1.0.0';

/** 重构信息 */
export const REFACTOR_INFO = {
  version: '1.0.0',
  date: '2024-01-01',
  description: '共享组件库重构，提供统一的UI组件和业务组件',
  changes: [
    '创建统一的UI基础组件（Card、Table、Button、Form、Modal）',
    '提供一致的设计系统和样式规范',
    '支持主题定制和响应式设计',
    '包含完整的TypeScript类型定义',
    '提供丰富的工具函数和预设组件',
  ],
  migration: {
    from: '原有分散的组件实现',
    to: '统一的共享组件库',
    breaking: false,
    notes: '向后兼容，逐步迁移现有组件',
  },
};

// ==================== 默认导出 ====================

/** 默认导出最常用的组件 */
const SharedComponents = {
  // 工具函数
  utils: sharedUtils,
  // 配置
  config: DEFAULT_COMPONENT_CONFIG,
  // 版本信息
  version: SHARED_COMPONENTS_VERSION,
};

export default SharedComponents;