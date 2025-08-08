// Data Sync Retry Failed - 代理后端重试失败股票
import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiUrl, createFetchConfig } from '../../../../config/api';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceFull = searchParams.get('force_full') === 'true';
    const res = await fetch(getBackendApiUrl(`data/sync/retry-failed?force_full=${String(forceFull)}`), createFetchConfig('POST'));
    if (!res.ok) return NextResponse.json({ success: false, error: `backend ${res.status}` }, { status: 500 });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}


