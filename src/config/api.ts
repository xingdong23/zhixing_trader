// 【知行交易】API配置文件
// 统一管理所有API相关配置，避免硬编码

/**
 * 后端API配置
 * 通过环境变量配置，支持不同环境的灵活切换
 */
export const BACKEND_API_CONFIG = {
  // 后端API基础地址
  BASE_URL: process.env.BACKEND_API_BASE_URL || 'http://localhost:8000/api/v1',
  
  // 请求超时时间
  TIMEOUT: 30000,
  
  // 默认请求头
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
  },
} as const;



/**
 * 获取后端API完整URL
 * @param endpoint API端点
 * @returns 完整的API URL
 */
export function getBackendApiUrl(endpoint: string): string {
  const baseUrl = BACKEND_API_CONFIG.BASE_URL;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${baseUrl}/${cleanEndpoint}`;
}

/**
 * 创建标准的fetch配置
 * @param method HTTP方法
 * @param body 请求体
 * @returns fetch配置对象
 */
export function createFetchConfig(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: any
): RequestInit {
  const config: RequestInit = {
    method,
    headers: BACKEND_API_CONFIG.DEFAULT_HEADERS,
  };
  
  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }
  
  return config;
}