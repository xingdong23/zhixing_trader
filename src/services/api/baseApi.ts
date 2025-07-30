// 【知行交易】基础API客户端

import { ApiResponse, RequestConfig, ApiError } from '../../types/api';
import { API_CONFIG } from '../../constants';

// HTTP方法类型
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// 请求选项
interface RequestOptions extends RequestConfig {
  method?: HttpMethod;
  body?: any;
  params?: Record<string, any>;
}

// 基础API客户端类
export class BaseApiClient {
  private baseURL: string;
  private defaultConfig: RequestConfig;

  constructor(baseURL?: string, config?: RequestConfig) {
    this.baseURL = baseURL || API_CONFIG.BASE_URL;
    this.defaultConfig = {
      timeout: 10000,
      retries: 3,
      retryDelay: 1000,
      headers: {
        'Content-Type': 'application/json',
      },
      ...config,
    };
  }

  /**
   * 发送HTTP请求
   */
  async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const config = { ...this.defaultConfig, ...options };
    const url = this.buildUrl(endpoint, options.params);

    try {
      const response = await this.executeRequest(url, config);
      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * GET请求
   */
  async get<T = any>(
    endpoint: string,
    params?: Record<string, any>,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'GET',
      params,
      ...config,
    });
  }

  /**
   * POST请求
   */
  async post<T = any>(
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data,
      ...config,
    });
  }

  /**
   * PUT请求
   */
  async put<T = any>(
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data,
      ...config,
    });
  }

  /**
   * DELETE请求
   */
  async delete<T = any>(
    endpoint: string,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      ...config,
    });
  }

  /**
   * 构建完整URL
   */
  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(endpoint, this.baseURL);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return url.toString();
  }

  /**
   * 执行HTTP请求（带重试机制）
   */
  private async executeRequest(
    url: string,
    config: RequestOptions
  ): Promise<Response> {
    const { retries = 0, retryDelay = 1000 } = config;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);

        const response = await fetch(url, {
          method: config.method || 'GET',
          headers: config.headers,
          body: config.body ? JSON.stringify(config.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        
        if (!response.ok && attempt < retries) {
          await this.delay(retryDelay * Math.pow(2, attempt)); // 指数退避
          continue;
        }
        
        return response;
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        await this.delay(retryDelay * Math.pow(2, attempt));
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  /**
   * 处理响应
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const data = await response.json();
      
      if (response.ok) {
        return {
          success: true,
          data,
          code: response.status,
        };
      } else {
        return {
          success: false,
          error: data.message || data.error || 'Request failed',
          code: response.status,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to parse response',
        code: response.status,
      };
    }
  }

  /**
   * 处理错误
   */
  private handleError(error: any): ApiResponse {
    console.error('API Request Error:', error);
    
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'Request timeout',
        code: 408,
      };
    }
    
    return {
      success: false,
      error: error.message || 'Network error',
      code: 0,
    };
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 设置默认请求头
   */
  setDefaultHeader(key: string, value: string): void {
    this.defaultConfig.headers = {
      ...this.defaultConfig.headers,
      [key]: value,
    };
  }

  /**
   * 移除默认请求头
   */
  removeDefaultHeader(key: string): void {
    if (this.defaultConfig.headers) {
      delete this.defaultConfig.headers[key];
    }
  }
}

// 创建默认API客户端实例
export const apiClient = new BaseApiClient();