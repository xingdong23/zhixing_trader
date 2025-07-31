// 【知行交易】基础服务类
// 提供所有服务的基础功能和通用方法

import { ApiResponse, PaginationParams, PaginatedResponse, SortParams, FilterParams } from '../../types';

// ==================== 基础服务配置 ====================

/** 服务配置 */
export interface ServiceConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableCache: boolean;
  cacheTimeout: number;
}

/** 默认服务配置 */
export const DEFAULT_SERVICE_CONFIG: ServiceConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
  enableCache: true,
  cacheTimeout: 300000 // 5分钟
};

// ==================== 错误处理 ====================

/** 服务错误类型 */
export enum ServiceErrorType {
  NETWORK_ERROR = 'network_error',
  TIMEOUT_ERROR = 'timeout_error',
  VALIDATION_ERROR = 'validation_error',
  AUTHORIZATION_ERROR = 'authorization_error',
  NOT_FOUND_ERROR = 'not_found_error',
  SERVER_ERROR = 'server_error',
  UNKNOWN_ERROR = 'unknown_error'
}

/** 服务错误 */
export class ServiceError extends Error {
  constructor(
    public type: ServiceErrorType,
    public message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ServiceError';
  }

  /** 创建网络错误 */
  static networkError(message: string, details?: any): ServiceError {
    return new ServiceError(ServiceErrorType.NETWORK_ERROR, message, 'NETWORK_ERROR', details);
  }

  /** 创建超时错误 */
  static timeoutError(message: string = '请求超时'): ServiceError {
    return new ServiceError(ServiceErrorType.TIMEOUT_ERROR, message, 'TIMEOUT_ERROR');
  }

  /** 创建验证错误 */
  static validationError(message: string, details?: any): ServiceError {
    return new ServiceError(ServiceErrorType.VALIDATION_ERROR, message, 'VALIDATION_ERROR', details);
  }

  /** 创建授权错误 */
  static authorizationError(message: string = '未授权访问'): ServiceError {
    return new ServiceError(ServiceErrorType.AUTHORIZATION_ERROR, message, 'AUTHORIZATION_ERROR');
  }

  /** 创建未找到错误 */
  static notFoundError(message: string = '资源未找到'): ServiceError {
    return new ServiceError(ServiceErrorType.NOT_FOUND_ERROR, message, 'NOT_FOUND_ERROR');
  }

  /** 创建服务器错误 */
  static serverError(message: string = '服务器内部错误', details?: any): ServiceError {
    return new ServiceError(ServiceErrorType.SERVER_ERROR, message, 'SERVER_ERROR', details);
  }
}

// ==================== 缓存管理 ====================

/** 缓存项 */
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

/** 简单内存缓存 */
export class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();

  /** 设置缓存 */
  set<T>(key: string, data: T, ttl: number = 300000): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiry: now + ttl
    });
  }

  /** 获取缓存 */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /** 删除缓存 */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /** 清空缓存 */
  clear(): void {
    this.cache.clear();
  }

  /** 清理过期缓存 */
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  /** 获取缓存统计 */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// ==================== HTTP 客户端 ====================

/** HTTP 方法 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/** 请求选项 */
export interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  useCache?: boolean;
  cacheKey?: string;
  cacheTtl?: number;
}

/** HTTP 客户端 */
export class HttpClient {
  private cache = new MemoryCache();

  constructor(private config: ServiceConfig = DEFAULT_SERVICE_CONFIG) {}

  /** 发送请求 */
  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.config.timeout,
      retryAttempts = this.config.retryAttempts,
      retryDelay = this.config.retryDelay,
      useCache = this.config.enableCache && method === 'GET',
      cacheKey = `${method}:${endpoint}:${JSON.stringify(body || {})}`,
      cacheTtl = this.config.cacheTimeout
    } = options;

    // 检查缓存
    if (useCache) {
      const cached = this.cache.get<ApiResponse<T>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // 构建请求
    const url = `${this.config.baseUrl}${endpoint}`;
    const requestInit: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    };

    // 执行请求（带重试）
    let lastError: Error;
    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...requestInit,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw await this.handleHttpError(response);
        }

        const result: ApiResponse<T> = await response.json();

        // 缓存成功响应
        if (useCache && result.success) {
          this.cache.set(cacheKey, result, cacheTtl);
        }

        return result;
      } catch (error) {
        lastError = error as Error;

        // 最后一次尝试失败
        if (attempt === retryAttempts) {
          throw this.handleRequestError(lastError);
        }

        // 等待后重试
        if (retryDelay > 0) {
          await this.delay(retryDelay * (attempt + 1));
        }
      }
    }

    throw this.handleRequestError(lastError!);
  }

  /** GET 请求 */
  async get<T>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /** POST 请求 */
  async post<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  /** PUT 请求 */
  async put<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  /** DELETE 请求 */
  async delete<T>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /** PATCH 请求 */
  async patch<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  /** 处理 HTTP 错误 */
  private async handleHttpError(response: Response): Promise<ServiceError> {
    const status = response.status;
    let message = response.statusText;
    let details: any;

    try {
      const errorData = await response.json();
      message = errorData.message || errorData.error || message;
      details = errorData;
    } catch {
      // 忽略 JSON 解析错误
    }

    switch (status) {
      case 400:
        return ServiceError.validationError(message, details);
      case 401:
      case 403:
        return ServiceError.authorizationError(message);
      case 404:
        return ServiceError.notFoundError(message);
      case 500:
      case 502:
      case 503:
      case 504:
        return ServiceError.serverError(message, details);
      default:
        return ServiceError.serverError(`HTTP ${status}: ${message}`, details);
    }
  }

  /** 处理请求错误 */
  private handleRequestError(error: Error): ServiceError {
    if (error.name === 'AbortError') {
      return ServiceError.timeoutError();
    }

    if (error instanceof ServiceError) {
      return error;
    }

    if (error.message.includes('fetch')) {
      return ServiceError.networkError('网络连接失败', error);
    }

    return ServiceError.serverError(error.message, error);
  }

  /** 延迟函数 */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /** 清理缓存 */
  clearCache(): void {
    this.cache.clear();
  }

  /** 获取缓存统计 */
  getCacheStats(): { size: number; keys: string[] } {
    return this.cache.getStats();
  }
}

// ==================== 基础服务类 ====================

/** 基础服务抽象类 */
export abstract class BaseService {
  protected http: HttpClient;
  protected serviceName: string;

  constructor(serviceName: string, config?: Partial<ServiceConfig>) {
    this.serviceName = serviceName;
    this.http = new HttpClient({ ...DEFAULT_SERVICE_CONFIG, ...config });
  }

  /** 构建查询参数 */
  protected buildQueryParams(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(item => searchParams.append(key, String(item)));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  /** 构建分页查询参数 */
  protected buildPaginationParams(
    pagination?: PaginationParams,
    sort?: SortParams,
    filters?: FilterParams
  ): string {
    const params: Record<string, any> = {};

    if (pagination) {
      params.page = pagination.page;
      params.pageSize = pagination.pageSize;
    }

    if (sort) {
      params.sortBy = sort.field;
      params.sortOrder = sort.order;
    }

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params[key] = value;
        }
      });
    }

    return this.buildQueryParams(params);
  }

  /** 验证必需参数 */
  protected validateRequired(params: Record<string, any>, requiredFields: string[]): void {
    const missing = requiredFields.filter(field => 
      params[field] === undefined || params[field] === null || params[field] === ''
    );

    if (missing.length > 0) {
      throw ServiceError.validationError(
        `缺少必需参数: ${missing.join(', ')}`,
        { missing, provided: Object.keys(params) }
      );
    }
  }

  /** 验证ID格式 */
  protected validateId(id: string, fieldName: string = 'id'): void {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw ServiceError.validationError(`无效的${fieldName}: ${id}`);
    }
  }

  /** 记录服务调用 */
  protected logServiceCall(method: string, endpoint: string, params?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${this.serviceName}] ${method} ${endpoint}`, params);
    }
  }

  /** 处理服务错误 */
  protected handleServiceError(error: any, context: string): never {
    if (error instanceof ServiceError) {
      throw error;
    }

    console.error(`[${this.serviceName}] ${context}:`, error);
    throw ServiceError.serverError(`${context}失败: ${error.message}`, error);
  }

  /** 获取服务统计 */
  getServiceStats(): {
    serviceName: string;
    cacheStats: { size: number; keys: string[] };
  } {
    return {
      serviceName: this.serviceName,
      cacheStats: this.http.getCacheStats()
    };
  }

  /** 清理服务缓存 */
  clearCache(): void {
    this.http.clearCache();
  }
}

// ==================== 分页服务混入 ====================

/** 分页服务接口 */
export interface PaginatedService<T> {
  list(
    pagination?: PaginationParams,
    sort?: SortParams,
    filters?: FilterParams
  ): Promise<PaginatedResponse<T>>;
}

/** CRUD 服务接口 */
export interface CrudService<T, CreateData = Partial<T>, UpdateData = Partial<T>> {
  getById(id: string): Promise<ApiResponse<T>>;
  create(data: CreateData): Promise<ApiResponse<T>>;
  update(id: string, data: UpdateData): Promise<ApiResponse<T>>;
  delete(id: string): Promise<ApiResponse<void>>;
}

// ==================== 导出 ====================

export { DEFAULT_SERVICE_CONFIG as defaultConfig };
export type { ServiceConfig, RequestOptions };