// 前端API客户端 - 与后端API服务通信

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface StockInfo {
  code: string;
  name: string;
  market: 'US' | 'HK' | 'CN';
  lotSize: number;
  secType: string;
}

export interface WatchlistGroup {
  groupId: string;
  groupName: string;
  stocks: StockInfo[];
}

export interface QuoteData {
  code: string;
  name: string;
  curPrice: number;
  prevClosePrice: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  turnover: number;
  changeVal: number;
  changeRate: number;
  amplitude: number;
  updateTime: string;
}

class ApiClient {
  private baseURL: string;
  private timeout: number;

  constructor(baseURL: string = 'http://localhost:3001', timeout: number = 10000) {
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

  // ==================== 健康检查 ====================

  /**
   * 检查API服务器健康状态
   */
  async checkHealth(): Promise<ApiResponse> {
    return this.get('/api/health');
  }

  /**
   * 获取API服务器状态
   */
  async getStatus(): Promise<ApiResponse> {
    return this.get('/api/status');
  }

  // ==================== 自选股相关 ====================

  /**
   * 获取自选股列表
   */
  async getWatchlist(): Promise<ApiResponse<WatchlistGroup[]>> {
    return this.get<WatchlistGroup[]>('/api/watchlist');
  }

  /**
   * 获取自选股分组
   */
  async getWatchlistGroups(): Promise<ApiResponse<WatchlistGroup[]>> {
    return this.get<WatchlistGroup[]>('/api/watchlist/groups');
  }

  /**
   * 获取指定分组的股票
   */
  async getGroupStocks(groupId: string): Promise<ApiResponse<WatchlistGroup>> {
    return this.get<WatchlistGroup>(`/api/watchlist/groups/${groupId}`);
  }

  /**
   * 刷新自选股数据
   */
  async refreshWatchlist(): Promise<ApiResponse<WatchlistGroup[]>> {
    return this.post<WatchlistGroup[]>('/api/watchlist/refresh');
  }

  /**
   * 获取自选股统计信息
   */
  async getWatchlistStats(): Promise<ApiResponse> {
    return this.get('/api/watchlist/stats');
  }

  // ==================== 行情相关 ====================

  /**
   * 获取行情数据
   */
  async getQuotes(codes?: string[]): Promise<ApiResponse<QuoteData[]>> {
    const query = codes ? `?codes=${codes.join(',')}` : '';
    return this.get<QuoteData[]>(`/api/quotes${query}`);
  }

  /**
   * 获取单个股票的详细行情
   */
  async getQuoteDetail(code: string): Promise<ApiResponse<QuoteData>> {
    return this.get<QuoteData>(`/api/quotes/${code}`);
  }

  /**
   * 订阅实时行情推送
   */
  async subscribeQuotes(codes: string[]): Promise<ApiResponse> {
    return this.post('/api/quotes/subscribe', { codes });
  }

  /**
   * 取消订阅实时行情推送
   */
  async unsubscribeQuotes(codes: string[]): Promise<ApiResponse> {
    return this.post('/api/quotes/unsubscribe', { codes });
  }

  /**
   * 获取行情统计信息
   */
  async getQuoteStats(): Promise<ApiResponse> {
    return this.get('/api/quotes/stats');
  }

  // ==================== 工具方法 ====================

  /**
   * 检查API连接状态
   */
  async isConnected(): Promise<boolean> {
    try {
      const response = await this.checkHealth();
      return response.success;
    } catch (error) {
      return false;
    }
  }

  /**
   * 等待API服务可用
   */
  async waitForConnection(maxAttempts: number = 10, interval: number = 2000): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      if (await this.isConnected()) {
        return true;
      }
      
      if (i < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    
    return false;
  }

  /**
   * 批量获取行情数据（自动分批）
   */
  async getBatchQuotes(codes: string[], batchSize: number = 50): Promise<QuoteData[]> {
    const results: QuoteData[] = [];
    
    for (let i = 0; i < codes.length; i += batchSize) {
      const batch = codes.slice(i, i + batchSize);
      const response = await this.getQuotes(batch);
      
      if (response.success && response.data) {
        results.push(...response.data);
      }
    }
    
    return results;
  }

  /**
   * 设置基础URL
   */
  setBaseURL(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * 设置请求超时时间
   */
  setTimeout(timeout: number) {
    this.timeout = timeout;
  }
}

// 创建默认实例
export const apiClient = new ApiClient();

// 导出类型和实例
export { ApiClient };
export default apiClient;
