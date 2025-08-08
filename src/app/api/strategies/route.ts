// Strategies API - 代理到后端API
import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiUrl, createFetchConfig } from '../../../config/api';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(
      getBackendApiUrl('strategies/'),
      createFetchConfig('GET')
    );

    if (!response.ok) {
      throw new Error(`后端API请求失败: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('获取策略列表失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误',
        data: { strategies: [] }
      },
      { status: 500 }
    );
  }
}

// 额外：代理获取任务状态（POST /api/strategies?action=status&task_id=...）
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    if (action === 'status') {
      const taskId = searchParams.get('task_id');
      if (!taskId) return NextResponse.json({ success: false, error: 'missing task_id' }, { status: 400 });
      const res = await fetch(getBackendApiUrl(`strategies/exec/status?task_id=${taskId}`), createFetchConfig('GET'));
      if (!res.ok) return NextResponse.json({ success: false, error: `status ${res.status}` }, { status: 500 });
      const data = await res.json();
      return NextResponse.json(data);
    }
    return NextResponse.json({ success: false, error: 'unknown action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}

// 禁用通过前端创建策略