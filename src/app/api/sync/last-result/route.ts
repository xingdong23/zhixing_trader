// Data Sync Last Result - 代理后端最近同步结果
import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiUrl, createFetchConfig } from '../../../../config/api';

export async function GET(_request: NextRequest) {
  try {
    const res = await fetch(getBackendApiUrl('data/sync/last-result'), createFetchConfig('GET'));
    if (!res.ok) return NextResponse.json({ success: false, error: `backend ${res.status}` }, { status: 500 });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}


