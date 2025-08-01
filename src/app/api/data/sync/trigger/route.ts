// Sync Trigger API - 代理到后端API
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_BASE = 'http://localhost:8000/api/v1';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceFullSync = searchParams.get('force_full') === 'true';
    
    const response = await fetch(`${BACKEND_API_BASE}/data/sync/trigger?force_full=${forceFullSync}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`后端API请求失败: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('触发数据同步失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}