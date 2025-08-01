// Concepts Init Sample API - 代理到后端API
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_BASE = 'http://localhost:8000/api/v1';

export async function POST(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_API_BASE}/concepts/init-sample-data`, {
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
    console.error('初始化概念数据失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}