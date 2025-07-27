// 富途API - 获取用户自选股列表
import { NextRequest, NextResponse } from 'next/server';

const FUTU_API_BASE = 'https://openapi.futunn.com';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupName = searchParams.get('groupName') || '';
    
    // 这里需要配置富途API的认证信息
    const headers = {
      'Content-Type': 'application/json',
      // 'Authorization': `Bearer ${process.env.FUTU_API_TOKEN}`, // 需要在环境变量中配置
      // 'X-API-Key': process.env.FUTU_API_KEY, // 需要在环境变量中配置
    };

    const response = await fetch(`${FUTU_API_BASE}/v1/quote/get-user-security`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        groupName: groupName
      })
    });

    if (!response.ok) {
      throw new Error(`富途API请求失败: ${response.status}`);
    }

    const data = await response.json();
    
    // 转换富途API响应格式为应用所需格式
    const transformedData = {
      success: true,
      data: data.data?.securityList?.map((security: any) => ({
        symbol: security.code,
        name: security.name,
        market: security.market,
        price: security.price || 0,
        change: security.change || 0,
        changePercent: security.changeRate || 0,
        volume: security.volume || 0,
        turnover: security.turnover || 0,
        high: security.high || 0,
        low: security.low || 0,
        open: security.open || 0,
        preClose: security.preClose || 0,
      })) || []
    };

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('获取自选股列表失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误',
        data: []
      },
      { status: 500 }
    );
  }
}
