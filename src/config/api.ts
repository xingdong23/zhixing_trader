/**
 * API配置文件
 */

// API基础URL配置
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// API端点配置
export const API_ENDPOINTS = {
  // 概念相关
  concepts: `${API_BASE_URL}/api/v1/concepts/`,
  conceptById: (id: string) => `${API_BASE_URL}/api/v1/concepts/${id}`,
  conceptStocks: (id: string) => `${API_BASE_URL}/api/v1/concepts/${id}/stocks`,
  conceptStock: (conceptId: string, stockId: string) => `${API_BASE_URL}/api/v1/concepts/${conceptId}/stocks/${stockId}`,
  
  // 股票相关
  stocks: `${API_BASE_URL}/api/v1/stocks/`,
  stockById: (symbol: string) => `${API_BASE_URL}/api/v1/stocks/${symbol}`,
  
  // 专家相关
  experts: `${API_BASE_URL}/api/v1/experts/`,
  expertById: (id: string) => `${API_BASE_URL}/api/v1/experts/${id}`,
  
  // 其他端点可以在这里添加
} as const;
