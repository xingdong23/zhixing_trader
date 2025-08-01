// Concept Stock API - 代理到后端API
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_BASE = 'http://localhost:8000/api/v1';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { conceptId: string; stockId: string } }
) {
  try {
    const { conceptId, stockId } = params;
    
    const response = await fetch(`${BACKEND_API_BASE}/concepts/${conceptId}/stocks/${stockId}`, {
      method: 'DELETE',
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
    console.error('删除概念股票失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}