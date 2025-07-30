// 【知行交易】应用常量定义
// 集中管理所有常量，提高代码可维护性

// ==================== API 配置 ====================
export const API_CONFIG = {
  // 后端API基础地址 - 可通过环境变量配置
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1',
  // 不带版本号的基础地址，用于某些特殊接口
  BASE_URL_NO_VERSION: process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:8000',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

// API端点配置
export const API_ENDPOINTS = {
  // 概念相关
  CONCEPTS: '/concepts/',
  CONCEPTS_INIT_SAMPLE: '/concepts/init-sample-data',
  CONCEPT_RELATIONS: '/concepts/relations',
  CONCEPT_STOCKS: (conceptId: string) => `/concepts/${conceptId}/stocks`,
  CONCEPT_STOCK: (conceptId: string, stockId: string) => `/concepts/${conceptId}/stocks/${stockId}`,
  
  // 股票相关
  STOCKS: '/stocks/',
  STOCKS_IMPORT: '/stocks/import',
  STOCK_DETAIL: (symbol: string) => `/stocks/${symbol}`,
  
  // 策略相关
  STRATEGIES: '/strategies',
  STRATEGY_EXECUTE: (id: string) => `/strategies/${id}/execute`,
  
  // 数据管理相关
  DATA_SYNC: '/data/sync',
  DATA_IMPORT: '/data/import',
  DATABASE_OVERVIEW: '/data/database/overview',
  DATABASE_STOCKS: '/data/database/stocks',
  DATABASE_QUALITY: '/data/database/quality',
  DATABASE_STOCK: (symbol: string, timeframe?: string) => 
    timeframe ? `/data/database/stock/${symbol}?timeframe=${timeframe}` : `/data/database/stock/${symbol}`,
  
  // 数据同步相关
  SYNC_STATUS: '/sync/status',
  SYNC_START: '/sync/start',
  SYNC_STOP: '/sync/stop',
  SYNC_TRIGGER: (forceFullSync: boolean) => `/data/sync/trigger?force_full=${forceFullSync}`,
} as const;

// ==================== 应用配置 ====================
export const APP_CONFIG = {
  NAME: '知行交易',
  VERSION: '4.0.0',
  DESCRIPTION: '智能交易计划与执行系统',
} as const;

// ==================== 界面配置 ====================
export const UI_CONFIG = {
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 200,
  PAGINATION_SIZE: 20,
  MAX_UPLOAD_SIZE: 10 * 1024 * 1024, // 10MB
} as const;

// ==================== 交易配置 ====================
export const TRADING_CONFIG = {
  DEFAULT_RISK_REWARD_RATIO: 2,
  MAX_POSITION_PERCENT: 20,
  DEFAULT_STOP_LOSS_PERCENT: 5,
  DISCIPLINE_LOCK_COOLDOWN: 30, // 分钟
} as const;

// ==================== 数据验证规则 ====================
export const VALIDATION_RULES = {
  // 股票相关
  STOCK_SYMBOL: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 10,
    PATTERN: /^[A-Z0-9.]+$/,
  },
  STOCK_SYMBOL_PATTERN: /^[A-Z0-9]{2,10}$/,
  MAX_STOCK_NAME_LENGTH: 50,
  MAX_IMPORT_SIZE: 1000,
  IMPORT_BATCH_SIZE: 100,
  
  // 策略相关
  MAX_STRATEGY_NAME_LENGTH: 100,
  MAX_STRATEGY_DESCRIPTION_LENGTH: 500,
  MIN_STRATEGY_CONDITIONS: 1,
  MAX_STRATEGY_CONDITIONS: 20,
  
  // 交易相关
  MAX_TRADING_PLAN_NAME_LENGTH: 100,
  MIN_TRADE_QUANTITY: 100,
  MAX_TRADE_QUANTITY: 1000000,
  
  PRICE: {
    MIN: 0.01,
    MAX: 999999.99,
  },
  PERCENTAGE: {
    MIN: -100,
    MAX: 1000,
  },
  
  // 日志相关
  MAX_JOURNAL_LENGTH: 2000,
  MAX_COMMENT_LENGTH: 500,
  
  // 概念相关
  MAX_CONCEPT_NAME_LENGTH: 50,
  MAX_CONCEPT_DESCRIPTION_LENGTH: 200,
} as const;

// ==================== 错误消息 ====================
export const ERROR_MESSAGES = {
  // 网络错误
  NETWORK_ERROR: '网络连接失败，请检查网络设置',
  TIMEOUT_ERROR: '请求超时，请稍后重试',
  SERVER_ERROR: '服务器错误，请稍后重试',
  
  // 认证错误
  UNAUTHORIZED: '未授权访问，请重新登录',
  FORBIDDEN: '权限不足，无法执行此操作',
  
  // 数据错误
  VALIDATION_ERROR: '输入数据格式不正确',
  INVALID_DATA: '数据格式不正确',
  MISSING_REQUIRED_FIELD: '缺少必填字段',
  DUPLICATE_ENTRY: '数据已存在',
  NOT_FOUND: '请求的资源不存在',
  TIMEOUT: '请求超时，请重试',
  
  // 股票相关错误
  FETCH_STOCKS_FAILED: '获取股票数据失败',
  ADD_STOCK_FAILED: '添加股票失败',
  UPDATE_STOCK_FAILED: '更新股票失败',
  DELETE_STOCK_FAILED: '删除股票失败',
  IMPORT_STOCKS_FAILED: '导入股票失败',
  FETCH_STATS_FAILED: '获取统计数据失败',
  
  // 概念相关错误
  FETCH_CONCEPTS_FAILED: '获取概念数据失败',
  CREATE_CONCEPT_FAILED: '创建概念失败',
  UPDATE_CONCEPT_FAILED: '更新概念失败',
  DELETE_CONCEPT_FAILED: '删除概念失败',
  
  // 策略相关错误
  FETCH_STRATEGIES_FAILED: '获取策略列表失败',
  CREATE_STRATEGY_FAILED: '创建策略失败',
  UPDATE_STRATEGY_FAILED: '更新策略失败',
  DELETE_STRATEGY_FAILED: '删除策略失败',
  RUN_STRATEGY_FAILED: '运行策略失败',
  FETCH_SELECTIONS_FAILED: '获取选股结果失败',
  
  // 剧本相关错误
  FETCH_PLAYBOOKS_FAILED: '获取交易剧本失败',
  CREATE_PLAYBOOK_FAILED: '创建交易剧本失败',
  UPDATE_PLAYBOOK_FAILED: '更新交易剧本失败',
  DELETE_PLAYBOOK_FAILED: '删除交易剧本失败',
  
  // 交易相关错误
  FETCH_TRADING_PLANS_FAILED: '获取交易计划失败',
  CREATE_TRADING_PLAN_FAILED: '创建交易计划失败',
  UPDATE_TRADING_PLAN_FAILED: '更新交易计划失败',
  DELETE_TRADING_PLAN_FAILED: '删除交易计划失败',
  ADD_EXECUTION_FAILED: '添加执行记录失败',
  FETCH_TRADE_RECORDS_FAILED: '获取交易记录失败',
  ADD_JOURNAL_FAILED: '添加交易日志失败',
  
  // 系统相关错误
  SYNC_FAILED: '数据同步失败',
  BACKUP_FAILED: '数据备份失败',
  RESTORE_FAILED: '数据恢复失败',
} as const;

// ==================== 成功消息 ====================
export const SUCCESS_MESSAGES = {
  // 通用消息
  SAVE_SUCCESS: '保存成功',
  DELETE_SUCCESS: '删除成功',
  UPDATE_SUCCESS: '更新成功',
  IMPORT_SUCCESS: '导入成功',
  SYNC_SUCCESS: '同步成功',
  
  // 股票相关
  STOCK_ADDED: '股票添加成功',
  STOCK_UPDATED: '股票更新成功',
  STOCK_DELETED: '股票删除成功',
  STOCKS_IMPORTED: '股票导入成功',
  
  // 概念相关
  CONCEPT_CREATED: '概念创建成功',
  CONCEPT_UPDATED: '概念更新成功',
  CONCEPT_DELETED: '概念删除成功',
  
  // 策略相关
  STRATEGY_CREATED: '策略创建成功',
  STRATEGY_UPDATED: '策略更新成功',
  STRATEGY_DELETED: '策略删除成功',
  STRATEGY_RUN_SUCCESS: '策略运行成功',
  
  // 剧本相关
  PLAYBOOK_CREATED: '交易剧本创建成功',
  PLAYBOOK_UPDATED: '交易剧本更新成功',
  PLAYBOOK_DELETED: '交易剧本删除成功',
  
  // 交易相关
  TRADING_PLAN_CREATED: '交易计划创建成功',
  TRADING_PLAN_UPDATED: '交易计划更新成功',
  TRADING_PLAN_DELETED: '交易计划删除成功',
  EXECUTION_ADDED: '执行记录添加成功',
  JOURNAL_ADDED: '交易日志添加成功',
  
  // 系统相关
  BACKUP_SUCCESS: '数据备份成功',
  RESTORE_SUCCESS: '数据恢复成功',
} as const;

// ==================== 路由配置 ====================
export const ROUTES = {
  HOME: '/',
  STOCK_MARKET: '/stock-market',
  TRADING_PLANS: '/trading-plans',
  TRADE_TRACKING: '/trade-tracking',
  INSIGHTS: '/insights',
  SETTINGS: '/settings',
} as const;

// ==================== 本地存储键 ====================
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'zhixing_user_preferences',
  TRADING_SETTINGS: 'zhixing_trading_settings',
  CACHE_TIMESTAMP: 'zhixing_cache_timestamp',
} as const;

// ==================== 主题配置 ====================
export const THEME_CONFIG = {
  COLORS: {
    PRIMARY: '#3b82f6',
    SUCCESS: '#10b981',
    WARNING: '#f59e0b',
    ERROR: '#ef4444',
    INFO: '#6366f1',
  },
  BREAKPOINTS: {
    SM: '640px',
    MD: '768px',
    LG: '1024px',
    XL: '1280px',
  },
} as const;