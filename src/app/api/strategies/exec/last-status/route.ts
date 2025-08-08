// Strategy Last Exec Status API - 代理后端最近任务状态查询（GET）
import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiUrl, createFetchConfig } from '../../../../../config/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const strategyId = searchParams.get('strategy_id');
    if (!strategyId) {
      return NextResponse.json({ success: false, error: 'missing strategy_id' }, { status: 400 });
    }

    const res = await fetch(
      getBackendApiUrl(`strategies/exec/last-status?strategy_id=${encodeURIComponent(strategyId)}`),
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


