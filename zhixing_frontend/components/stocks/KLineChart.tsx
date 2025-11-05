"use client"

import { useState, useEffect } from "react"
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, Cell, ReferenceLine, ErrorBar } from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface KLineData {
  datetime: string
  date: string
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  ema8?: number
  ema21?: number
  ema55?: number
  ema100?: number
  ema200?: number
  rsi?: number
}

interface KLineChartProps {
  symbol: string
}


// 计算技术指标
const calculateEMA = (data: KLineData[], period: number): number[] => {
  const ema: (number | undefined)[] = new Array(data.length)
  const multiplier = 2 / (period + 1)
  
  if (data.length === 0) return []
  if (data.length < period) return ema as number[]
  
  // 第一个EMA值使用前period个数据的SMA
  let sum = 0
  for (let i = 0; i < period; i++) {
    sum += data[i].close
  }
  ema[period - 1] = sum / period
  
  // 后续值使用EMA公式
  for (let i = period; i < data.length; i++) {
    ema[i] = (data[i].close * multiplier) + (ema[i - 1]! * (1 - multiplier))
  }
  
  return ema as number[]
}

const calculateRSI = (data: KLineData[], period: number = 14): number[] => {
  const rsi = []
  if (data.length < period + 1) return []
  
  for (let i = period; i < data.length; i++) {
    let gains = 0
    let losses = 0
    
    for (let j = i - period; j < i; j++) {
      const change = data[j + 1].close - data[j].close
      if (change > 0) gains += change
      else losses -= change
    }
    
    const avgGain = gains / period
    const avgLoss = losses / period
    const rs = avgGain / avgLoss
    rsi[i] = 100 - (100 / (1 + rs))
  }
  
  return rsi
}

export default function KLineChart({ symbol }: KLineChartProps) {
  const [klineData, setKlineData] = useState<KLineData[]>([])
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState("1d")
  const [days, setDays] = useState(252)
  
  // EMA指标显示状态
  const [emaVisibility, setEmaVisibility] = useState({
    ema8: true,
    ema21: true,
    ema55: true,
    ema100: true,
    ema200: true
  })
  
  // 切换EMA指标显示状态
  const toggleEmaVisibility = (emaType: keyof typeof emaVisibility) => {
    setEmaVisibility(prev => ({
      ...prev,
      [emaType]: !prev[emaType]
    }))
  }

  // 简化的蜡烛图组件 - 让Recharts处理坐标
  const CandlestickShape = (props: any) => {
    const { payload, x, y, width, height } = props
    if (!payload) return null

    const { open, close, high, low } = payload
    const isUp = close > open
    const isFlat = close === open
    
    // 绿涨红跌
    const color = isUp ? "#00AA44" : isFlat ? "#888888" : "#FF4444"
    
    const centerX = x + width / 2
    const bodyWidth = Math.max(width * 0.7, 2)
    const bodyLeft = centerX - bodyWidth / 2
    
    // 这里的y和height是Recharts基于close值计算的
    // 我们需要根据实际的OHLC值重新计算位置
    
    // 计算价格范围和比例 - 使用当前图表的实际数据范围
    const allPrices = klineData.flatMap(d => [d.open, d.high, d.low, d.close])
    const minPrice = Math.min(...allPrices)
    const maxPrice = Math.max(...allPrices)
    const priceRange = maxPrice - minPrice
    
    if (priceRange === 0) return null
    
    // 根据图表高度计算实际的Y坐标
    const chartHeight = height // 这是整个图表区域的高度
    const topY = y - (close - minPrice) / priceRange * chartHeight // 图表顶部
    
    const highY = topY + (maxPrice - high) / priceRange * chartHeight
    const lowY = topY + (maxPrice - low) / priceRange * chartHeight
    const openY = topY + (maxPrice - open) / priceRange * chartHeight
    const closeY = topY + (maxPrice - close) / priceRange * chartHeight
    
    const bodyTop = Math.min(openY, closeY)
    const bodyBottom = Math.max(openY, closeY)
    const bodyHeight = Math.max(Math.abs(bodyBottom - bodyTop), 1)
    
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
          x={bodyLeft}
          y={bodyTop}
          width={bodyWidth}
          height={bodyHeight}
          fill={color}
          stroke={color}
          strokeWidth="0.5"
          fillOpacity={isUp ? 0.8 : 1}
        />
        {/* 平盘时的横线 */}
        {isFlat && (
          <line
            x1={bodyLeft}
            y1={closeY}
            x2={bodyLeft + bodyWidth}
            y2={closeY}
            stroke={color}
            strokeWidth="2"
          />
        )}
      </g>
    )
  }

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
        const rawData = result.data.klines.map((kline: any) => ({
          datetime: kline.datetime,
          date: new Date(kline.datetime).toLocaleDateString('zh-CN'),
          time: new Date(kline.datetime).toLocaleString('zh-CN'),
          open: parseFloat(kline.open),
          high: parseFloat(kline.high),
          low: parseFloat(kline.low),
          close: parseFloat(kline.close),
          volume: parseInt(kline.volume || 0)
        }))
        
        // 计算技术指标
        const ema8 = calculateEMA(rawData, 8)
        const ema21 = calculateEMA(rawData, 21)
        const ema55 = calculateEMA(rawData, 55)
        const ema100 = calculateEMA(rawData, 100)
        const ema200 = calculateEMA(rawData, 200)
        const rsi = calculateRSI(rawData, 14)
        
        // 添加技术指标到数据
        const formattedData = rawData.map((item, index) => ({
          ...item,
          ema8: ema8[index],
          ema21: ema21[index],
          ema55: ema55[index],
          ema100: ema100[index],
          ema200: ema200[index],
          rsi: rsi[index]
        }))
        
        console.log('API数据EMA示例:', {
          dataLength: formattedData.length,
          lastData: formattedData[formattedData.length - 1],
          ema8: ema8.slice(-5),
          ema21: ema21.slice(-5)
        })
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
    
    // 为mock数据计算技术指标
    const ema8 = calculateEMA(mockData, 8)
    const ema21 = calculateEMA(mockData, 21)
    const ema55 = calculateEMA(mockData, 55)
    const ema100 = calculateEMA(mockData, 100)
    const ema200 = calculateEMA(mockData, 200)
    const rsi = calculateRSI(mockData, 14)
    
    const enhancedMockData = mockData.map((item, index) => ({
      ...item,
      ema8: ema8[index],
      ema21: ema21[index],
      ema55: ema55[index],
      ema100: ema100[index],
      ema200: ema200[index],
      rsi: rsi[index]
    }))
    
        console.log('使用模拟K线数据，共', enhancedMockData.length, '条')
        console.log('EMA数据示例:', {
          ema8: ema8.slice(-5),
          ema21: ema21.slice(-5),
          ema55: ema55.slice(-5),
          ema100: ema100.slice(-5),
          ema200: ema200.slice(-5)
        })
        setKlineData(enhancedMockData)
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
      const isUp = data.close > data.open
      const changeColor = isUp ? "#00AA44" : "#FF4444"
      
      return (
        <div className="bg-black/90 text-white p-3 border border-gray-600 rounded-lg shadow-xl text-xs">
          <p className="font-medium text-yellow-400 mb-2">{data.time}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div>开盘: <span className="text-cyan-400">${data.open?.toFixed(2)}</span></div>
            <div>收盘: <span style={{color: changeColor}}>${data.close?.toFixed(2)}</span></div>
            <div>最高: <span className="text-red-400">${data.high?.toFixed(2)}</span></div>
            <div>最低: <span className="text-green-400">${data.low?.toFixed(2)}</span></div>
            <div className="col-span-2">成交量: <span className="text-gray-300">{data.volume?.toLocaleString()}</span></div>
            {(data.ema8 || data.ema21 || data.ema55 || data.ema100 || data.ema200) && (
              <div className="col-span-2 mt-1 pt-1 border-t border-gray-600">
                <div className="flex gap-4 text-xs">
                  {data.ema8 && <span>EMA8: <span className="text-white">{data.ema8.toFixed(2)}</span></span>}
                  {data.ema21 && <span>EMA21: <span className="text-yellow-400">{data.ema21.toFixed(2)}</span></span>}
                </div>
                <div className="flex gap-4 text-xs mt-1">
                  {data.ema55 && <span>EMA55: <span className="text-purple-400">{data.ema55.toFixed(2)}</span></span>}
                  {data.ema100 && <span>EMA100: <span className="text-cyan-400">{data.ema100.toFixed(2)}</span></span>}
                </div>
                <div className="flex gap-4 text-xs mt-1">
                  {data.ema200 && <span>EMA200: <span className="text-orange-400">{data.ema200.toFixed(2)}</span></span>}
                  {data.rsi && <span>RSI: <span className="text-orange-300">{data.rsi.toFixed(1)}</span></span>}
                </div>
              </div>
            )}
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
          <div className="space-y-2">
            {/* 主K线图区域 */}
            <div className="h-96 bg-black rounded-lg p-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart 
                  data={klineData} 
                  margin={{ top: 10, right: 60, left: 10, bottom: 10 }}
                  style={{ background: '#000000' }}
                >
                  <CartesianGrid 
                    strokeDasharray="1 1" 
                    stroke="#333333" 
                    opacity={0.5}
                    horizontal={true}
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="date" 
                    fontSize={10}
                    tick={{ fontSize: 10, fill: '#CCCCCC' }}
                    interval="preserveStartEnd"
                    axisLine={{ stroke: '#333333' }}
                    tickLine={{ stroke: '#333333' }}
                  />
                  <YAxis 
                    yAxisId="price"
                    domain={['dataMin - 2', 'dataMax + 2']} 
                    fontSize={10}
                    tick={{ fontSize: 10, fill: '#CCCCCC' }}
                    tickFormatter={(value) => `${value.toFixed(2)}`}
                    axisLine={{ stroke: '#333333' }}
                    tickLine={{ stroke: '#333333' }}
                    width={50}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  
                  {/* EMA均线 - 条件渲染 */}
                  {emaVisibility.ema8 && (
                    <Line 
                      type="monotone" 
                      dataKey="ema8" 
                      stroke="#FFFFFF" 
                      strokeWidth={2}
                      dot={false}
                      connectNulls={true}
                      yAxisId="price"
                    />
                  )}
                  {emaVisibility.ema21 && (
                    <Line 
                      type="monotone" 
                      dataKey="ema21" 
                      stroke="#FFFF00" 
                      strokeWidth={2}
                      dot={false}
                      connectNulls={true}
                      yAxisId="price"
                    />
                  )}
                  {emaVisibility.ema55 && (
                    <Line 
                      type="monotone" 
                      dataKey="ema55" 
                      stroke="#FF00FF" 
                      strokeWidth={2}
                      dot={false}
                      connectNulls={true}
                      yAxisId="price"
                    />
                  )}
                  {emaVisibility.ema100 && (
                    <Line 
                      type="monotone" 
                      dataKey="ema100" 
                      stroke="#00FFFF" 
                      strokeWidth={2}
                      dot={false}
                      connectNulls={true}
                      yAxisId="price"
                    />
                  )}
                  {emaVisibility.ema200 && (
                    <Line 
                      type="monotone" 
                      dataKey="ema200" 
                      stroke="#FFA500" 
                      strokeWidth={2}
                      dot={false}
                      connectNulls={true}
                      yAxisId="price"
                    />
                  )}
                  
                  {/* K线蜡烛图 - 使用自定义渲染 */}
                  <Bar 
                    dataKey="close" 
                    yAxisId="price"
                    fill="transparent"
                    shape={<CandlestickShape />}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* 成交量图区域 */}
            <div className="h-24 bg-black rounded-lg p-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart 
                  data={klineData} 
                  margin={{ top: 5, right: 60, left: 10, bottom: 5 }}
                  style={{ background: '#000000' }}
                >
                  <CartesianGrid 
                    strokeDasharray="1 1" 
                    stroke="#333333" 
                    opacity={0.3}
                    horizontal={true}
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="date" 
                    fontSize={8}
                    tick={{ fontSize: 8, fill: '#CCCCCC' }}
                    interval="preserveStartEnd"
                    axisLine={{ stroke: '#333333' }}
                    tickLine={{ stroke: '#333333' }}
                  />
                  <YAxis 
                    domain={[0, 'dataMax']}
                    fontSize={8}
                    tick={{ fontSize: 8, fill: '#CCCCCC' }}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                    axisLine={{ stroke: '#333333' }}
                    tickLine={{ stroke: '#333333' }}
                    width={50}
                  />
                  
                  {/* 成交量柱状图 */}
                  <Bar dataKey="volume" fill="#666666" opacity={0.8} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* RSI指标区域 */}
            <div className="h-20 bg-black rounded-lg p-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart 
                  data={klineData} 
                  margin={{ top: 5, right: 60, left: 10, bottom: 5 }}
                  style={{ background: '#000000' }}
                >
                  <CartesianGrid 
                    strokeDasharray="1 1" 
                    stroke="#333333" 
                    opacity={0.3}
                    horizontal={true}
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="date" 
                    fontSize={8}
                    tick={{ fontSize: 8, fill: '#CCCCCC' }}
                    interval="preserveStartEnd"
                    axisLine={{ stroke: '#333333' }}
                    tickLine={{ stroke: '#333333' }}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    fontSize={8}
                    tick={{ fontSize: 8, fill: '#CCCCCC' }}
                    axisLine={{ stroke: '#333333' }}
                    tickLine={{ stroke: '#333333' }}
                    width={50}
                  />
                  
                  {/* RSI超买超卖线 */}
                  <ReferenceLine y={70} stroke="#FF6666" strokeDasharray="2 2" />
                  <ReferenceLine y={30} stroke="#66FF66" strokeDasharray="2 2" />
                  <ReferenceLine y={50} stroke="#666666" strokeDasharray="1 1" />
                  
                  {/* RSI线 */}
                  <Line 
                    type="monotone" 
                    dataKey="rsi" 
                    stroke="#FFAA00" 
                    strokeWidth={1}
                    dot={false}
                    connectNulls={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* 指标说明 - 可点击切换 */}
            <div className="bg-gray-900 text-white p-3 rounded-lg">
              <div className="flex flex-wrap gap-4 text-xs">
                {/* EMA指标 */}
                <button
                  onClick={() => toggleEmaVisibility('ema8')}
                  className={`flex items-center gap-2 px-2 py-1 rounded transition-all hover:bg-gray-700 ${
                    emaVisibility.ema8 ? 'bg-gray-800' : 'bg-gray-600 opacity-50'
                  }`}
                >
                  <div className={`w-3 h-0.5 ${emaVisibility.ema8 ? 'bg-white' : 'bg-gray-500'}`}></div>
                  <span>EMA8</span>
                </button>
                <button
                  onClick={() => toggleEmaVisibility('ema21')}
                  className={`flex items-center gap-2 px-2 py-1 rounded transition-all hover:bg-gray-700 ${
                    emaVisibility.ema21 ? 'bg-gray-800' : 'bg-gray-600 opacity-50'
                  }`}
                >
                  <div className={`w-3 h-0.5 ${emaVisibility.ema21 ? 'bg-yellow-400' : 'bg-gray-500'}`}></div>
                  <span>EMA21</span>
                </button>
                <button
                  onClick={() => toggleEmaVisibility('ema55')}
                  className={`flex items-center gap-2 px-2 py-1 rounded transition-all hover:bg-gray-700 ${
                    emaVisibility.ema55 ? 'bg-gray-800' : 'bg-gray-600 opacity-50'
                  }`}
                >
                  <div className={`w-3 h-0.5 ${emaVisibility.ema55 ? 'bg-purple-400' : 'bg-gray-500'}`}></div>
                  <span>EMA55</span>
                </button>
                <button
                  onClick={() => toggleEmaVisibility('ema100')}
                  className={`flex items-center gap-2 px-2 py-1 rounded transition-all hover:bg-gray-700 ${
                    emaVisibility.ema100 ? 'bg-gray-800' : 'bg-gray-600 opacity-50'
                  }`}
                >
                  <div className={`w-3 h-0.5 ${emaVisibility.ema100 ? 'bg-cyan-400' : 'bg-gray-500'}`}></div>
                  <span>EMA100</span>
                </button>
                <button
                  onClick={() => toggleEmaVisibility('ema200')}
                  className={`flex items-center gap-2 px-2 py-1 rounded transition-all hover:bg-gray-700 ${
                    emaVisibility.ema200 ? 'bg-gray-800' : 'bg-gray-600 opacity-50'
                  }`}
                >
                  <div className={`w-3 h-0.5 ${emaVisibility.ema200 ? 'bg-orange-400' : 'bg-gray-500'}`}></div>
                  <span>EMA200</span>
                </button>
                
                {/* 涨跌颜色说明 */}
                <div className="flex items-center gap-2 ml-4">
                  <div className="w-2 h-2 bg-green-500 rounded-sm"></div>
                  <span>涨</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-sm"></div>
                  <span>跌</span>
                </div>
              </div>
            </div>

            {/* 数据统计 */}
            <div className="flex justify-between text-sm text-muted-foreground bg-muted/50 p-3 rounded">
              <span>数据点: {klineData.length}</span>
              <span>时间范围: {klineData[0]?.date} - {klineData[klineData.length - 1]?.date}</span>
              <span>最新价格: ${klineData[klineData.length - 1]?.close?.toFixed(2)}</span>
              {klineData[klineData.length - 1]?.rsi && (
                <span>RSI: {klineData[klineData.length - 1].rsi.toFixed(1)}</span>
              )}
            </div>
            
            {/* 调试信息 - 临时显示EMA数据 */}
            {klineData.length > 0 && (
              <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
                <div>EMA8: {klineData[klineData.length - 1]?.ema8?.toFixed(2) || 'N/A'}</div>
                <div>EMA21: {klineData[klineData.length - 1]?.ema21?.toFixed(2) || 'N/A'}</div>
                <div>EMA55: {klineData[klineData.length - 1]?.ema55?.toFixed(2) || 'N/A'}</div>
                <div>EMA100: {klineData[klineData.length - 1]?.ema100?.toFixed(2) || 'N/A'}</div>
                <div>EMA200: {klineData[klineData.length - 1]?.ema200?.toFixed(2) || 'N/A'}</div>
              </div>
            )}
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
