// Stock Detail API - 代理到后端API
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_BASE = 'http://localhost:8000/api/v1';

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const { symbol } = params;
    
    const response = await fetch(`${BACKEND_API_BASE}/stocks/${symbol}`, {
      method: 'GET',
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
    console.error('获取股票详情失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const { symbol } = params;
    const body = await request.json();
    
    const response = await fetch(`${BACKEND_API_BASE}/stocks/${symbol}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`后端API请求失败: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('更新股票详情失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}