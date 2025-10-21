"use client"

import { useEffect, useRef } from "react"
import { createChart, IChartApi, ISeriesApi, LineStyle } from "lightweight-charts"
import { ExpertOpinion, PriceLevel } from "./ExpertOpinion"

interface Props {
  candles: Array<{
    time: number
    open: number
    high: number
    low: number
    close: number
  }>
  expertOpinions: ExpertOpinion[]
  highlightedOpinionIds: string[]
  height?: number
  currentPrice?: number
}

// 为不同专家分配颜色
const EXPERT_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
]

const PRICE_LEVEL_COLORS = {
  stop_loss: '#ef4444',      // red
  take_profit: '#22c55e',    // green
  add_position: '#3b82f6',   // blue
  reduce_position: '#f97316', // orange
  entry: '#8b5cf6',          // purple
}

export default function PriceAlertChart({ 
  candles, 
  expertOpinions, 
  highlightedOpinionIds,
  height = 600,
  currentPrice 
}: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const lineSeriesRef = useRef<ISeriesApi<"Line">[]>([]) // 追踪所有线系列

  useEffect(() => {
    if (!chartContainerRef.current) return

    // 创建图表
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      rightPriceScale: {
        borderColor: '#e0e0e0',
      },
      timeScale: {
        borderColor: '#e0e0e0',
        timeVisible: true,
      },
      crosshair: {
        mode: 1,
      },
    })

    chartRef.current = chart

    // 添加K线
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    })

    candleSeriesRef.current = candleSeries
    candleSeries.setData(candles)

    // 自适应大小
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      // 清空线系列引用
      lineSeriesRef.current = []
      chart.remove()
    }
  }, [candles, height])

  // 绘制专家观点的价格线
  useEffect(() => {
    if (!chartRef.current) return

    const chart = chartRef.current

    // 清除所有之前添加的价格线
    lineSeriesRef.current.forEach(series => {
      try {
        chart.removeSeries(series)
      } catch (e) {
        // 忽略已经被移除的系列
      }
    })
    lineSeriesRef.current = []

    // 只显示高亮的专家观点
    const highlightedOpinions = expertOpinions.filter(op => 
      highlightedOpinionIds.includes(op.id)
    )

    highlightedOpinions.forEach((opinion, opinionIndex) => {
      const expertColor = EXPERT_COLORS[opinionIndex % EXPERT_COLORS.length]

      opinion.priceLevels.forEach((level) => {
        // 为每个价格位创建水平线
        const lineSeries = chart.addLineSeries({
          color: PRICE_LEVEL_COLORS[level.type],
          lineWidth: 2,
          lineStyle: level.type === 'stop_loss' ? LineStyle.Dashed : 
                     level.type === 'take_profit' ? LineStyle.Solid :
                     LineStyle.Dotted,
          priceLineVisible: false,
          lastValueVisible: true,
          title: `${opinion.expertName} - ${level.type}`,
        })

        // 追踪这个系列
        lineSeriesRef.current.push(lineSeries)

        // 创建水平线数据（使用时间范围）
        const lineData = candles.map(candle => ({
          time: candle.time,
          value: level.price,
        }))

        lineSeries.setData(lineData)

        // 添加价格标记
        lineSeries.createPriceLine({
          price: level.price,
          color: PRICE_LEVEL_COLORS[level.type],
          lineWidth: 2,
          lineStyle: level.type === 'stop_loss' ? LineStyle.Dashed : 
                     level.type === 'take_profit' ? LineStyle.Solid :
                     LineStyle.Dotted,
          axisLabelVisible: true,
          title: `${opinion.expertName.substring(0, 4)} ${level.type}`,
        })
      })
    })

    // 添加当前价格线
    if (currentPrice && candleSeriesRef.current) {
      candleSeriesRef.current.createPriceLine({
        price: currentPrice,
        color: '#6366f1',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: '当前价格',
      })
    }

  }, [expertOpinions, highlightedOpinionIds, currentPrice])

  return (
    <div className="relative">
      <div ref={chartContainerRef} className="w-full" />
      
      {/* 图例 */}
      {highlightedOpinionIds.length > 0 && (
        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg border shadow-sm p-3 space-y-2 max-w-xs">
          <div className="text-xs font-semibold text-muted-foreground mb-2">图表图例</div>
          {expertOpinions
            .filter(op => highlightedOpinionIds.includes(op.id))
            .map((opinion, idx) => {
              const color = EXPERT_COLORS[idx % EXPERT_COLORS.length]
              return (
                <div key={opinion.id} className="flex items-center gap-2 text-xs">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-medium">{opinion.expertName}</span>
                  <span className="text-muted-foreground">
                    ({opinion.priceLevels.length} 个关键位)
                  </span>
                </div>
              )
            })}
          
          <div className="border-t pt-2 mt-2 space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-8 h-0.5 bg-red-500" style={{ borderTop: '2px dashed' }} />
              <span>止损</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-8 h-0.5 bg-green-500" />
              <span>止盈</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-8 h-0.5 bg-blue-500" style={{ borderTop: '2px dotted' }} />
              <span>加仓</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-8 h-0.5 bg-purple-500" style={{ borderTop: '2px dotted' }} />
              <span>入场</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
