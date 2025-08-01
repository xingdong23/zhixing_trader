// Individual Concept API - 代理到后端API
import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiUrl, createFetchConfig } from '../../../../config/api';

export async function GET(
  request: NextRequest,
  { params }: { params: { conceptId: string } }
) {
  try {
    const { conceptId } = params;
    
    const response = await fetch(
      getBackendApiUrl('concepts/${conceptId}'),
      createFetchConfig('GET')
    );

    if (!response.ok) {
      throw new Error(`后端API请求失败: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('获取概念详情失败:', error);
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
  { params }: { params: { conceptId: string } }
) {
  try {
    const { conceptId } = params;
    const body = await request.json();
    
    const response = await fetch(
      getBackendApiUrl('concepts/${conceptId}'),
      createFetchConfig('PUT', body)
    );

    if (!response.ok) {
      throw new Error(`后端API请求失败: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('更新概念失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { conceptId: string } }
) {
  try {
    const { conceptId } = params;
    
    const response = await fetch(
      getBackendApiUrl('concepts/${conceptId}'),
      createFetchConfig('DELETE')
    );

    if (!response.ok) {
      throw new Error(`后端API请求失败: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('删除概念失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}