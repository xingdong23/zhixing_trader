// 【知行交易】API相关类型定义

// API响应基础结构
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: number;
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// API错误类型
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// 请求配置
export interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

// 数据同步状态
export interface SyncStatus {
  last_sync_time: string | null;
  is_syncing: boolean;
  sync_progress?: number;
  sync_message?: string;
  error_message?: string;
}

// 数据库操作结果
export interface DatabaseOperationResult {
  success: boolean;
  affected_rows?: number;
  message?: string;
  error?: string;
}

// 批量操作结果
export interface BatchOperationResult<T = any> {
  success: boolean;
  total: number;
  successful: number;
  failed: number;
  results: T[];
  errors: string[];
}

// 文件上传响应
export interface FileUploadResponse {
  success: boolean;
  filename: string;
  url?: string;
  size: number;
  message?: string;
}

// 导入结果
export interface ImportResult {
  success: boolean;
  total: number;
  imported: number;
  skipped: number;
  errors: number;
  details: {
    imported_items: any[];
    skipped_items: any[];
    error_items: { item: any; error: string }[];
  };
}

// WebSocket消息类型
export interface WebSocketMessage {
  type: 'price_update' | 'trade_signal' | 'system_notification' | 'error';
  data: any;
  timestamp: string;
}

// 实时价格更新
export interface PriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
}

// 系统通知
export interface SystemNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

// 健康检查响应
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'up' | 'down';
    redis?: 'up' | 'down';
    external_api: 'up' | 'down';
  };
  version: string;
}

// 缓存配置
export interface CacheConfig {
  ttl: number;           // 缓存时间（秒）
  key: string;          // 缓存键
  enabled: boolean;     // 是否启用缓存
}

// 请求日志
export interface RequestLog {
  id: string;
  method: string;
  url: string;
  status: number;
  duration: number;
  timestamp: string;
  userAgent?: string;
  ip?: string;
}