// 【知行交易】应用状态相关类型定义
// 包含应用状态、UI状态、用户设置等相关类型

import { BaseStats } from './core';
import { TradingStats } from './trading';
import { SelectionStats, RecommendationStats } from './analysis';
import { StockPoolStats } from './stock';

// ==================== 应用模块 ====================

/** 应用模块 */
export enum AppModule {
  DASHBOARD = 'dashboard',           // 主仪表盘
  STOCK_MARKET = 'stock_market',     // 股票市场
  TRADING_MANAGEMENT = 'trading_management', // 交易管理
  REVIEW_CENTER = 'review_center',   // 复盘中心
  RESEARCH_LAB = 'research_lab',     // 智能研究院
  SCRIPT_MANAGER = 'script_manager', // 剧本管理
  SETTINGS = 'settings',             // 系统设置
  DATABASE_ADMIN = 'database_admin'  // 数据库管理
}

/** 子模块映射 */
export interface SubModules {
  [AppModule.DASHBOARD]: 'overview' | 'alerts' | 'quick_actions';
  [AppModule.STOCK_MARKET]: 'stock_pool' | 'selection' | 'recommendations';
  [AppModule.TRADING_MANAGEMENT]: 'plans' | 'tracking' | 'positions';
  [AppModule.REVIEW_CENTER]: 'trade_review' | 'performance' | 'insights';
  [AppModule.RESEARCH_LAB]: 'market_analysis' | 'strategy_research' | 'backtesting';
  [AppModule.SCRIPT_MANAGER]: 'trading_scripts' | 'templates' | 'automation';
  [AppModule.SETTINGS]: 'general' | 'trading' | 'notifications' | 'data';
  [AppModule.DATABASE_ADMIN]: 'tables' | 'queries' | 'backup';
}

// ==================== 应用状态 ====================

/** 应用状态 */
export interface AppState {
  // 当前模块
  currentModule: AppModule;
  currentSubModule?: string;
  
  // 导航历史
  navigationHistory: {
    module: AppModule;
    subModule?: string;
    timestamp: Date;
  }[];
  
  // 加载状态
  isLoading: boolean;
  loadingMessage?: string;
  
  // 错误状态
  error?: {
    message: string;
    code?: string;
    timestamp: Date;
  };
  
  // 通知状态
  notifications: AppNotification[];
  unreadCount: number;
  
  // 用户设置
  settings: UserSettings;
  
  // 数据状态
  dataStatus: {
    lastSyncAt?: Date;
    isOnline: boolean;
    pendingChanges: number;
  };
  
  // 统计数据
  stats: AppStats;
  
  // 快速访问数据
  quickAccess: {
    recentStocks: string[];      // 最近查看的股票
    recentPlans: string[];       // 最近的交易计划
    bookmarkedItems: string[];   // 收藏的项目
    pinnedInsights: string[];    // 置顶的洞察
  };
}

// ==================== 通知系统 ====================

/** 通知类型 */
export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  TRADE_ALERT = 'trade_alert',
  PRICE_ALERT = 'price_alert',
  SYSTEM = 'system'
}

/** 通知优先级 */
export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/** 应用通知 */
export interface AppNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  
  // 内容
  title: string;
  message: string;
  details?: string;
  
  // 关联数据
  relatedId?: string;            // 关联的记录ID
  relatedType?: 'stock' | 'plan' | 'trade' | 'insight';
  
  // 行动按钮
  actions?: {
    label: string;
    action: string;
    style: 'primary' | 'secondary' | 'danger';
  }[];
  
  // 状态
  isRead: boolean;
  isArchived: boolean;
  isPersistent: boolean;         // 是否持久化显示
  
  // 时间
  createdAt: Date;
  readAt?: Date;
  expiresAt?: Date;
  
  // 显示设置
  showInToast: boolean;          // 是否显示为Toast
  showInCenter: boolean;         // 是否显示在通知中心
  autoClose?: number;            // 自动关闭时间(秒)
}

// ==================== 用户设置 ====================

/** 主题设置 */
export interface ThemeSettings {
  mode: 'light' | 'dark' | 'auto';
  primaryColor: string;
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  animations: boolean;
}

/** 交易设置 */
export interface TradingSettings {
  // 默认设置
  defaultTradingType: 'short_term' | 'swing' | 'value';
  defaultRiskLevel: 'low' | 'medium' | 'high';
  defaultStopLoss: number;
  defaultTakeProfit: number;
  
  // 风险控制
  maxDailyLoss: number;
  maxPositionSize: number;
  requireConfirmation: boolean;
  
  // 纪律控制
  enableDisciplineCheck: boolean;
  enableEmotionCheck: boolean;
  cooldownPeriod: number;
  
  // 自动化
  autoSaveEnabled: boolean;
  autoBackupEnabled: boolean;
  autoSyncInterval: number;      // 分钟
}

/** 通知设置 */
export interface NotificationSettings {
  // 全局设置
  enabled: boolean;
  soundEnabled: boolean;
  desktopEnabled: boolean;
  
  // 分类设置
  priceAlerts: boolean;
  tradeAlerts: boolean;
  systemAlerts: boolean;
  marketAlerts: boolean;
  
  // 时间设置
  quietHours: {
    enabled: boolean;
    start: string;               // HH:mm
    end: string;                 // HH:mm
  };
  
  // 频率控制
  maxNotificationsPerHour: number;
  groupSimilarNotifications: boolean;
}

/** 数据设置 */
export interface DataSettings {
  // 同步设置
  autoSync: boolean;
  syncInterval: number;          // 分钟
  syncOnStartup: boolean;
  
  // 存储设置
  localStorageEnabled: boolean;
  maxLocalStorageSize: number;   // MB
  autoCleanup: boolean;
  retentionDays: number;
  
  // 导入导出
  autoBackup: boolean;
  backupInterval: number;        // 小时
  maxBackupFiles: number;
  
  // 性能设置
  enableCaching: boolean;
  cacheTimeout: number;          // 分钟
  lazyLoading: boolean;
}

/** 用户设置 */
export interface UserSettings {
  // 基本信息
  userId?: string;
  username?: string;
  email?: string;
  
  // 界面设置
  theme: ThemeSettings;
  
  // 功能设置
  trading: TradingSettings;
  notifications: NotificationSettings;
  data: DataSettings;
  
  // 个性化设置
  dashboard: {
    layout: 'grid' | 'list';
    widgets: string[];           // 启用的小部件
    refreshInterval: number;     // 秒
  };
  
  // 快捷键设置
  shortcuts: Record<string, string>;
  
  // 隐私设置
  privacy: {
    shareUsageData: boolean;
    enableAnalytics: boolean;
    enableCrashReporting: boolean;
  };
  
  // 实验性功能
  experimental: {
    enableBetaFeatures: boolean;
    enableDebugMode: boolean;
    features: string[];          // 启用的实验性功能
  };
  
  // 元数据
  version: string;
  lastUpdated: Date;
  firstLoginAt?: Date;
  lastLoginAt?: Date;
}

// ==================== 应用统计 ====================

/** 应用统计 */
export interface AppStats extends BaseStats {
  // 使用统计
  totalSessions: number;
  avgSessionDuration: number;    // 分钟
  totalUsageTime: number;        // 小时
  
  // 功能使用
  moduleUsage: Record<AppModule, {
    visits: number;
    timeSpent: number;           // 分钟
    lastVisit: Date;
  }>;
  
  // 数据统计
  dataStats: {
    totalStocks: number;
    totalPlans: number;
    totalTrades: number;
    totalInsights: number;
  };
  
  // 业务统计
  trading: TradingStats;
  selection: SelectionStats;
  recommendation: RecommendationStats;
  stockPool: StockPoolStats;
  
  // 性能统计
  performance: {
    avgLoadTime: number;         // 毫秒
    errorRate: number;           // 百分比
    crashCount: number;
    lastCrashAt?: Date;
  };
  
  // 用户行为
  userBehavior: {
    mostUsedFeatures: string[];
    preferredTradingType: string;
    avgDecisionTime: number;     // 秒
    planExecutionRate: number;   // 百分比
  };
}

// ==================== UI状态 ====================

/** 模态框状态 */
export interface ModalState {
  isOpen: boolean;
  type?: 'create_plan' | 'edit_plan' | 'confirm_trade' | 'settings' | 'help';
  data?: any;
  onClose?: () => void;
  onConfirm?: (data: any) => void;
}

/** 侧边栏状态 */
export interface SidebarState {
  isOpen: boolean;
  isCollapsed: boolean;
  activeSection?: string;
  pinnedItems: string[];
}

/** 表格状态 */
export interface TableState {
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
  filters: Record<string, any>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  selectedRows: string[];
}

/** 搜索状态 */
export interface SearchState {
  query: string;
  filters: Record<string, any>;
  results: any[];
  isLoading: boolean;
  hasMore: boolean;
  lastSearchAt?: Date;
}

/** UI状态 */
export interface UIState {
  // 布局状态
  sidebar: SidebarState;
  modal: ModalState;
  
  // 组件状态
  tables: Record<string, TableState>;
  search: SearchState;
  
  // 视图状态
  viewMode: 'grid' | 'list' | 'card';
  density: 'compact' | 'normal' | 'comfortable';
  
  // 交互状态
  isSelectionMode: boolean;
  dragAndDrop: {
    isDragging: boolean;
    draggedItem?: any;
    dropTarget?: string;
  };
  
  // 响应式状态
  screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isMobile: boolean;
  isTablet: boolean;
  
  // 焦点状态
  focusedElement?: string;
  keyboardNavigation: boolean;
}

// ==================== 会话状态 ====================

/** 会话信息 */
export interface SessionInfo {
  sessionId: string;
  userId?: string;
  startTime: Date;
  lastActivity: Date;
  
  // 设备信息
  device: {
    type: 'desktop' | 'tablet' | 'mobile';
    os: string;
    browser: string;
    screen: {
      width: number;
      height: number;
    };
  };
  
  // 网络状态
  network: {
    isOnline: boolean;
    connectionType?: string;
    speed?: 'slow' | 'fast';
  };
  
  // 应用状态
  version: string;
  buildNumber: string;
  environment: 'development' | 'staging' | 'production';
  
  // 使用统计
  pageViews: number;
  actionsPerformed: number;
  errorsEncountered: number;
}

// ==================== 导出类型集合 ====================

export type AppConfig = UserSettings | ThemeSettings | TradingSettings | NotificationSettings | DataSettings;
export type AppUIState = UIState | ModalState | SidebarState | TableState | SearchState;
export type AppData = AppState | AppStats | SessionInfo;