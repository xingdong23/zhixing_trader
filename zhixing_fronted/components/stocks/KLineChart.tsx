"use client"

import { useState, useEffect } from "react"
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, Cell, ReferenceLine } from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface KLineData {
  datetime: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface KLineChartProps {
  symbol: string
}

// K线图自定义蜡烛图组件
const CandlestickBar = (props: any) => {
  const { payload, x, y, width, height } = props
  if (!payload) return null

  const { open, close, high, low } = payload
  const isUp = close >= open
  const color = isUp ? "#10B981" : "#EF4444" // 绿涨红跌
  
  // 计算价格范围和比例
  const priceRange = high - low
  if (priceRange === 0) return null
  
  const scale = height / priceRange
  const centerX = x + width / 2
  
  // 计算各个价格点的Y坐标
  const highY = y + (high - high) * scale
  const lowY = y + (high - low) * scale
  const openY = y + (high - open) * scale
  const closeY = y + (high - close) * scale
  
  const bodyTop = Math.min(openY, closeY)
  const bodyBottom = Math.max(openY, closeY)
  const bodyHeight = bodyBottom - bodyTop
  
  return (
    <g>
      {/* 上影线 */}
      <line
        x1={centerX}
        y1={highY}
        x2={centerX}
        y2={bodyTop}
        stroke={color}
        strokeWidth="1"
      />
      {/* 下影线 */}
      <line
        x1={centerX}
        y1={bodyBottom}
        x2={centerX}
        y2={lowY}
        stroke={color}
        strokeWidth="1"
      />
      {/* K线实体 */}
      <rect
        x={x + width * 0.1}
        y={bodyTop}
        width={width * 0.8}
        height={Math.max(bodyHeight, 1)} // 确保至少有1像素高度
        fill={isUp ? "#10B981" : "#EF4444"}
        stroke={color}
        strokeWidth="0.5"
        fillOpacity={isUp ? 0.3 : 1}
      />
    </g>
  )
}

export default function KLineChart({ symbol }: KLineChartProps) {
  const [klineData, setKlineData] = useState<KLineData[]>([])
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState("1d")
  const [days, setDays] = useState(252)

  const fetchKlineData = async () => {
    try {
      setLoading(true)
      const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
      const response = await fetch(
        `${base}/api/v1/market-data/klines/${symbol}?timeframe=${timeframe}&days=${days}`
      )
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success && result.data?.klines) {
        const formattedData = result.data.klines.map((kline: any) => ({
          datetime: kline.datetime,
          date: new Date(kline.datetime).toLocaleDateString('zh-CN'),
          time: new Date(kline.datetime).toLocaleString('zh-CN'),
          open: parseFloat(kline.open),
          high: parseFloat(kline.high),
          low: parseFloat(kline.low),
          close: parseFloat(kline.close),
          volume: parseInt(kline.volume || 0)
        }))
        setKlineData(formattedData)
      } else {
        console.error('K线数据格式错误:', result)
        // 使用mock数据作为fallback
        generateMockData()
      }
    } catch (error) {
      console.error('获取K线数据失败:', error)
      // 使用mock数据作为fallback
      generateMockData()
    } finally {
      setLoading(false)
    }
  }

  const generateMockData = () => {
    const mockData: KLineData[] = []
    const basePrice = 100
    let currentPrice = basePrice
    
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (days - i))
      
      // 生成随机的价格变动
      const change = (Math.random() - 0.5) * 10
      currentPrice = Math.max(currentPrice + change, 10) // 确保价格不会太低
      
      const open = currentPrice
      const close = Math.max(open + (Math.random() - 0.5) * 8, 10)
      const high = Math.max(open, close) + Math.random() * 5
      const low = Math.min(open, close) - Math.random() * 5
      const volume = Math.floor(Math.random() * 1000000) + 100000
      
      mockData.push({
        datetime: date.toISOString(),
        date: date.toLocaleDateString('zh-CN'),
        time: date.toLocaleString('zh-CN'),
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(Math.max(low, 1).toFixed(2)), // 确保最低价不为负
        close: parseFloat(close.toFixed(2)),
        volume: volume
      })
      
      currentPrice = close
    }
    
    console.log('使用模拟K线数据，共', mockData.length, '条')
    setKlineData(mockData)
  }

  useEffect(() => {
    if (symbol) {
      fetchKlineData()
    }
  }, [symbol, timeframe, days])

  const formatTooltipValue = (value: any, name: string) => {
    if (name === 'volume') {
      return [value.toLocaleString(), '成交量']
    }
    return [value?.toFixed(2), name]
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.time}</p>
          <div className="space-y-1 text-sm">
            <p>开盘: <span className="font-medium">${data.open?.toFixed(2)}</span></p>
            <p>最高: <span className="font-medium text-green-600">${data.high?.toFixed(2)}</span></p>
            <p>最低: <span className="font-medium text-red-600">${data.low?.toFixed(2)}</span></p>
            <p>收盘: <span className="font-medium">${data.close?.toFixed(2)}</span></p>
            <p>成交量: <span className="font-medium">{data.volume?.toLocaleString()}</span></p>
          </div>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>K线图</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <span className="text-muted-foreground">加载K线数据中...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>K线图</CardTitle>
          <div className="flex gap-2">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">日线</SelectItem>
                <SelectItem value="1h">小时</SelectItem>
                <SelectItem value="15m">15分</SelectItem>
                <SelectItem value="5m">5分</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={days.toString()} onValueChange={(value) => setDays(parseInt(value))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30天</SelectItem>
                <SelectItem value="90">90天</SelectItem>
                <SelectItem value="180">半年</SelectItem>
                <SelectItem value="252">一年</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={fetchKlineData}>
              刷新
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {klineData.length > 0 ? (
          <div className="space-y-4">
            {/* K线图 */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={klineData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    fontSize={12}
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    yAxisId="price"
                    domain={['dataMin - 5', 'dataMax + 5']} 
                    fontSize={12}
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <YAxis 
                    yAxisId="volume"
                    orientation="right"
                    domain={[0, 'dataMax']}
                    fontSize={10}
                    tick={{ fontSize: 8 }}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                    width={60}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  
                  {/* K线蜡烛图 */}
                  <Bar 
                    dataKey="close" 
                    yAxisId="price"
                    shape={<CandlestickBar />}
                    fill="transparent"
                  />
                  
                  {/* 成交量柱状图 */}
                  <Bar 
                    dataKey="volume" 
                    yAxisId="volume"
                    fill="#E5E7EB" 
                    opacity={0.3}
                    maxBarSize={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* 数据统计 */}
            <div className="flex justify-between text-sm text-muted-foreground bg-muted/50 p-3 rounded">
              <span>数据点: {klineData.length}</span>
              <span>时间范围: {klineData[0]?.date} - {klineData[klineData.length - 1]?.date}</span>
              <span>最新价格: ${klineData[klineData.length - 1]?.close?.toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <div className="h-96 flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">暂无K线数据</p>
              <Button variant="outline" onClick={fetchKlineData}>重新加载</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
