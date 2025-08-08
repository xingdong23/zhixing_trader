// Stocks Import API - 代理到后端API
import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiUrl, createFetchConfig } from '../../../../config/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(
      // 后端FastAPI路由为 /api/v1/stocks/import
      getBackendApiUrl('stocks/import'),
      createFetchConfig('POST', body)
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`后端API请求失败: ${response.status} ${text}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('批量导入股票失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}


