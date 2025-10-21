"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExpertOpinion, PriceLevel } from "./ExpertOpinion"
import { Badge } from "@/components/ui/badge"

interface Props {
  expertOpinions: ExpertOpinion[]
  currentPrice: number
  priceRange?: { min: number; max: number }
}

interface PriceZone {
  price: number
  count: number
  types: { [key: string]: number }
  experts: string[]
}

export default function ConsensusHeatmap({ expertOpinions, currentPrice, priceRange }: Props) {
  // 计算价格区间
  const allPrices = expertOpinions.flatMap(op => op.priceLevels.map(l => l.price))
  const minPrice = priceRange?.min || Math.min(...allPrices, currentPrice * 0.9)
  const maxPrice = priceRange?.max || Math.max(...allPrices, currentPrice * 1.1)
  
  // 将价格分成若干区间
  const zones = 20
  const step = (maxPrice - minPrice) / zones
  
  // 统计每个区间的关键位数量
  const priceZones: PriceZone[] = []
  
  for (let i = 0; i < zones; i++) {
    const zonePrice = minPrice + step * i
    const zoneMax = zonePrice + step
    
    const levelsInZone: Array<{ level: PriceLevel; expert: string }> = []
    
    expertOpinions.forEach(opinion => {
      opinion.priceLevels.forEach(level => {
        if (level.price >= zonePrice && level.price < zoneMax) {
          levelsInZone.push({ level, expert: opinion.expertName })
        }
      })
    })
    
    if (levelsInZone.length > 0) {
      const types: { [key: string]: number } = {}
      levelsInZone.forEach(({ level }) => {
        types[level.type] = (types[level.type] || 0) + 1
      })
      
      priceZones.push({
        price: zonePrice + step / 2,
        count: levelsInZone.length,
        types,
        experts: [...new Set(levelsInZone.map(l => l.expert))],
      })
    }
  }
  
  // 找出最大数量用于归一化
  const maxCount = Math.max(...priceZones.map(z => z.count), 1)
  
  // 找出共识最强的区域（多个专家都标记的价位）
  const consensusZones = priceZones
    .filter(z => z.experts.length >= 2)
    .sort((a, b) => b.experts.length - a.experts.length)
    .slice(0, 5)
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>价格共识热力图</span>
          <Badge variant="secondary" className="text-xs">
            {expertOpinions.length} 位专家
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          显示多位专家关注的关键价位区域
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 热力图 */}
        <div className="relative h-64 border rounded-lg p-4 bg-gradient-to-b from-gray-50 to-white">
          {/* 当前价格线 */}
          <div 
            className="absolute left-0 right-0 border-t-2 border-blue-600 z-10"
            style={{
              top: `${((maxPrice - currentPrice) / (maxPrice - minPrice)) * 100}%`
            }}
          >
            <div className="absolute -top-3 right-4 bg-blue-600 text-white text-xs px-2 py-0.5 rounded">
              当前 ${currentPrice.toFixed(2)}
            </div>
          </div>
          
          {/* 价格区间热力条 */}
          {priceZones.map((zone, idx) => {
            const intensity = zone.count / maxCount
            const position = ((maxPrice - zone.price) / (maxPrice - minPrice)) * 100
            
            // 根据类型确定颜色
            const hasStopLoss = zone.types['stop_loss'] || 0
            const hasTakeProfit = zone.types['take_profit'] || 0
            const hasEntry = zone.types['entry'] || 0
            
            let color = 'bg-gray-400'
            if (hasStopLoss > hasTakeProfit && hasStopLoss > hasEntry) {
              color = 'bg-red-500'
            } else if (hasTakeProfit > hasStopLoss && hasTakeProfit > hasEntry) {
              color = 'bg-green-500'
            } else if (hasEntry > 0) {
              color = 'bg-purple-500'
            }
            
            return (
              <div
                key={idx}
                className={`absolute left-0 h-1 ${color} rounded-r-full transition-all hover:h-2 cursor-pointer group`}
                style={{
                  top: `${position}%`,
                  width: `${20 + intensity * 80}%`,
                  opacity: 0.3 + intensity * 0.7,
                }}
                title={`$${zone.price.toFixed(2)} - ${zone.count} 个关键位`}
              >
                <div className="hidden group-hover:block absolute left-full ml-2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-20">
                  ${zone.price.toFixed(2)} - {zone.experts.join(', ')}
                </div>
              </div>
            )
          })}
          
          {/* 价格刻度 */}
          <div className="absolute right-0 top-0 bottom-0 w-16 flex flex-col justify-between text-xs text-muted-foreground">
            <span>${maxPrice.toFixed(0)}</span>
            <span>${((maxPrice + minPrice) / 2).toFixed(0)}</span>
            <span>${minPrice.toFixed(0)}</span>
          </div>
        </div>
        
        {/* 共识区域列表 */}
        {consensusZones.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-muted-foreground">
              强共识区域 ({consensusZones.length})
            </div>
            {consensusZones.map((zone, idx) => {
              const distance = ((zone.price - currentPrice) / currentPrice * 100).toFixed(2)
              const isAbove = zone.price > currentPrice
              
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">${zone.price.toFixed(2)}</span>
                      <Badge variant="secondary" className="text-xs">
                        {zone.experts.length} 位专家
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {zone.experts.join(' • ')}
                    </div>
                    <div className="flex gap-2 text-xs">
                      {zone.types['stop_loss'] && (
                        <span className="text-red-600">止损 ×{zone.types['stop_loss']}</span>
                      )}
                      {zone.types['take_profit'] && (
                        <span className="text-green-600">止盈 ×{zone.types['take_profit']}</span>
                      )}
                      {zone.types['entry'] && (
                        <span className="text-purple-600">入场 ×{zone.types['entry']}</span>
                      )}
                      {zone.types['add_position'] && (
                        <span className="text-blue-600">加仓 ×{zone.types['add_position']}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-semibold ${isAbove ? 'text-green-600' : 'text-red-600'}`}>
                      {isAbove ? '+' : ''}{distance}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      距当前价
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        
        {/* 统计信息 */}
        <div className="grid grid-cols-4 gap-2 pt-2 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {priceZones.reduce((sum, z) => sum + (z.types['stop_loss'] || 0), 0)}
            </div>
            <div className="text-xs text-muted-foreground">止损位</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {priceZones.reduce((sum, z) => sum + (z.types['take_profit'] || 0), 0)}
            </div>
            <div className="text-xs text-muted-foreground">止盈位</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {priceZones.reduce((sum, z) => sum + (z.types['entry'] || 0), 0)}
            </div>
            <div className="text-xs text-muted-foreground">入场位</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {priceZones.reduce((sum, z) => sum + (z.types['add_position'] || 0), 0)}
            </div>
            <div className="text-xs text-muted-foreground">加仓位</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
