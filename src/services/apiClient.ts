// 前端API客户端 - 与后端API服务通信
import { API_CONFIG } from '../constants';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}
class ApiClient {
  private baseURL: string;
  private timeout: number;

  constructor(baseURL: string = API_CONFIG.BASE_URL, timeout: number = 10000) {
    this.baseURL = baseURL;
    this.timeout = timeout;
  }

  /**
   * 通用请求方法
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // 使用AbortController来实现超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    config.signal = controller.signal;

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  /**
   * GET请求
   */
  private async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST请求
   */
  private async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

// 创建默认实例
export const apiClient = new ApiClient();

// 导出类型和实例
export { ApiClient };
export default apiClient;
