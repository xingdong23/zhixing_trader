// Strategy Exec Status API - 代理后端任务状态查询（GET）
import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiUrl, createFetchConfig } from '../../../../../../config/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('task_id');
    if (!taskId) {
      return NextResponse.json({ success: false, error: 'missing task_id' }, { status: 400 });
    }

    const res = await fetch(
      getBackendApiUrl(`strategies/exec/status?task_id=${encodeURIComponent(taskId)}`),
      createFetchConfig('GET')
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json({ success: false, error: `backend ${res.status} ${text}` }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}


