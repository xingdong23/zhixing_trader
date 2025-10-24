import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * 获取市场情绪数据
 * 包括恐慌贪婪指数和标普500基准
 */
export async function GET() {
  try {
    // TODO: 集成老虎证券API
    // 1. 使用老虎证券API获取恐慌贪婪指数
    // 2. 获取标普500指数数据
    
    // Mock数据 - 实际应该从老虎证券API获取
    const fearGreedIndex = Math.floor(Math.random() * 100)
    const sp500Index = 50 // 标普500作为基准值
    
    // 计算情绪等级
    const getSentimentLevel = (index: number) => {
      if (index <= 20) return 'extreme_fear'
      if (index <= 40) return 'fear'
      if (index <= 60) return 'neutral'
      if (index <= 80) return 'greed'
      return 'extreme_greed'
    }
    
    const sentiment = getSentimentLevel(fearGreedIndex)
    const recommendation = fearGreedIndex > sp500Index ? 'small_cap' : 'large_cap'
    
    return NextResponse.json({
      success: true,
      data: {
        fearGreedIndex,
        sp500Index,
        sentiment,
        recommendation,
        timestamp: new Date().toISOString(),
        source: 'mock' // 标记为mock数据
      }
    })
  } catch (error) {
    console.error('获取市场情绪数据失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '获取市场情绪数据失败' 
      },
      { status: 500 }
    )
  }
}

/**
 * 老虎证券API集成说明
 * 
 * 1. 安装老虎证券SDK
 *    npm install tigeropen-client-js
 * 
 * 2. 配置API密钥
 *    在环境变量中设置:
 *    TIGER_API_KEY=your_api_key
 *    TIGER_SECRET_KEY=your_secret_key
 *    TIGER_ACCOUNT=your_account
 * 
 * 3. 调用API获取数据
 *    const client = new TigerClient({
 *      tigerId: process.env.TIGER_API_KEY,
 *      privateKey: process.env.TIGER_SECRET_KEY,
 *      account: process.env.TIGER_ACCOUNT
 *    })
 * 
 * 4. 获取恐慌贪婪指数
 *    const sentiment = await client.getSentimentIndex()
 * 
 * 参考文档: https://quant.itigerup.com/
 */
