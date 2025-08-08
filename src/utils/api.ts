// 【知行交易】API工具函数
// 统一管理所有API请求，提供一致的接口调用方式

import { API_CONFIG, API_ENDPOINTS } from '../constants';

/**
 * 构建完整的API URL
 * @param endpoint - API端点路径
 * @param useVersion - 是否使用带版本号的基础URL，默认为true
 * @returns 完整的API URL
 */
export function buildApiUrl(endpoint: string, useVersion: boolean = true): string {
  // 统一在浏览器环境走Next同源API路由，避免CORS；SSR/Node侧直连后端
  const isBrowser = typeof window !== 'undefined';

  // 确保endpoint以/开头
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (isBrowser) {
    // 走Next API代理，例如 /api/concepts → src/app/api/concepts/route.ts
    return `/api${normalizedEndpoint}`;
  }

  // 服务器端渲染或脚本环境直连后端
  const baseUrl = useVersion ? API_CONFIG.BASE_URL : API_CONFIG.BASE_URL_NO_VERSION;
  if (useVersion) {
    return `${baseUrl}${normalizedEndpoint}`;
  } else {
    return `${baseUrl}/api/v1${normalizedEndpoint}`;
  }
}

/**
 * 发送GET请求
 * @param endpoint - API端点
 * @param options - 请求选项
 * @returns Promise<Response>
 */
export async function apiGet(endpoint: string, options?: RequestInit): Promise<Response> {
  const url = buildApiUrl(endpoint);
  
  return fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
}

/**
 * 发送POST请求
 * @param endpoint - API端点
 * @param data - 请求数据
 * @param options - 请求选项
 * @returns Promise<Response>
 */
export async function apiPost(endpoint: string, data?: any, options?: RequestInit): Promise<Response> {
  const url = buildApiUrl(endpoint);
  
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  });
}

/**
 * 发送PUT请求
 * @param endpoint - API端点
 * @param data - 请求数据
 * @param options - 请求选项
 * @returns Promise<Response>
 */
export async function apiPut(endpoint: string, data?: any, options?: RequestInit): Promise<Response> {
  const url = buildApiUrl(endpoint);
  
  return fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  });
}

/**
 * 发送DELETE请求
 * @param endpoint - API端点
 * @param options - 请求选项
 * @returns Promise<Response>
 */
export async function apiDelete(endpoint: string, options?: RequestInit): Promise<Response> {
  const url = buildApiUrl(endpoint);
  
  return fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
}

/**
 * API响应处理工具
 * @param response - fetch响应对象
 * @returns 解析后的JSON数据
 */
export async function handleApiResponse<T = any>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  
  return response.text() as any;
}

/**
 * 便捷的API调用函数，自动处理响应
 * @param endpoint - API端点
 * @param options - 请求选项
 * @returns 解析后的数据
 */
export async function apiCall<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await apiGet(endpoint, options);
  return handleApiResponse<T>(response);
}

// 导出API端点常量，方便使用
export { API_ENDPOINTS };