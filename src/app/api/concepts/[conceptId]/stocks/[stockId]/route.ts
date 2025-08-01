// Concept Stock API - 代理到后端API
import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiUrl, createFetchConfig } from '../../../../../../config/api';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { conceptId: string; stockId: string } }
) {
  try {
    const { conceptId, stockId } = params;
    
    const response = await fetch(
      getBackendApiUrl('concepts/${conceptId}/stocks/${stockId}'),
      createFetchConfig('DELETE')
    );

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