// Strategy Execute API - 代理到后端API
import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiUrl, createFetchConfig } from '../../../../../config/api';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const mode = new URL(request.url).searchParams.get('mode') || 'async';
    const backendPath = mode === 'sync' ? `strategies/${id}/execute` : `strategies/${id}/execute-async`;
    const response = await fetch(getBackendApiUrl(backendPath), createFetchConfig('POST'));

    if (!response.ok) {
      throw new Error(`后端API请求失败: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('执行策略失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}