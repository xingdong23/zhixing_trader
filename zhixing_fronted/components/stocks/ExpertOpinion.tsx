"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import { TrendingUp, TrendingDown, AlertTriangle, Target, Plus, Minus } from "lucide-react"

export interface PriceLevel {
  price: number
  type: 'stop_loss' | 'take_profit' | 'add_position' | 'reduce_position' | 'entry'
  reason?: string
}

export interface ExpertOpinion {
  id: string
  expertName: string
  expertAvatar?: string
  source: string // 'twitter', 'weibo', 'telegram', etc.
  sourceUrl?: string
  timestamp: string
  content: string
  sentiment: 'bullish' | 'bearish' | 'neutral'
  
  // 价格关键位
  priceLevels: PriceLevel[]
  
  // 图片/图表
  images?: string[]
  
  // 可信度/影响力
  credibility?: number // 0-100
  followers?: number
}

interface Props {
  opinion: ExpertOpinion
  currentPrice: number
  onToggleHighlight?: (opinionId: string) => void
  isHighlighted?: boolean
}

const getPriceLevelIcon = (type: PriceLevel['type']) => {
  switch (type) {
    case 'stop_loss':
      return <AlertTriangle className="w-4 h-4 text-red-500" />
    case 'take_profit':
      return <Target className="w-4 h-4 text-green-500" />
    case 'add_position':
      return <Plus className="w-4 h-4 text-blue-500" />
    case 'reduce_position':
      return <Minus className="w-4 h-4 text-orange-500" />
    case 'entry':
      return <TrendingUp className="w-4 h-4 text-purple-500" />
  }
}

const getPriceLevelLabel = (type: PriceLevel['type']) => {
  switch (type) {
    case 'stop_loss':
      return '止损'
    case 'take_profit':
      return '止盈'
    case 'add_position':
      return '加仓'
    case 'reduce_position':
      return '减仓'
    case 'entry':
      return '入场'
  }
}

const getPriceLevelColor = (type: PriceLevel['type']) => {
  switch (type) {
    case 'stop_loss':
      return 'bg-red-500/10 text-red-700 border-red-500/20'
    case 'take_profit':
      return 'bg-green-500/10 text-green-700 border-green-500/20'
    case 'add_position':
      return 'bg-blue-500/10 text-blue-700 border-blue-500/20'
    case 'reduce_position':
      return 'bg-orange-500/10 text-orange-700 border-orange-500/20'
    case 'entry':
      return 'bg-purple-500/10 text-purple-700 border-purple-500/20'
  }
}

export default function ExpertOpinionCard({ opinion, currentPrice, onToggleHighlight, isHighlighted }: Props) {
  const sentimentIcon = opinion.sentiment === 'bullish' ? (
    <TrendingUp className="w-4 h-4 text-green-600" />
  ) : opinion.sentiment === 'bearish' ? (
    <TrendingDown className="w-4 h-4 text-red-600" />
  ) : null

  const sentimentColor = opinion.sentiment === 'bullish' 
    ? 'bg-green-500/10 text-green-700 border-green-500/20'
    : opinion.sentiment === 'bearish'
    ? 'bg-red-500/10 text-red-700 border-red-500/20'
    : 'bg-gray-500/10 text-gray-700 border-gray-500/20'

  return (
    <Card className={`transition-all ${isHighlighted ? 'ring-2 ring-primary shadow-lg' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 bg-primary/10 flex items-center justify-center text-primary font-semibold">
              {opinion.expertAvatar ? (
                <img src={opinion.expertAvatar} alt={opinion.expertName} />
              ) : (
                opinion.expertName.charAt(0)
              )}
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{opinion.expertName}</span>
                {opinion.credibility && opinion.credibility > 80 && (
                  <Badge variant="secondary" className="text-xs">
                    认证
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{opinion.source}</span>
                <span>•</span>
                <span>{opinion.timestamp}</span>
                {opinion.followers && (
                  <>
                    <span>•</span>
                    <span>{(opinion.followers / 1000).toFixed(1)}K 关注</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleHighlight?.(opinion.id)}
            className={isHighlighted ? 'bg-primary/10' : ''}
          >
            {isHighlighted ? '取消高亮' : '在图表显示'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 观点内容 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge className={sentimentColor}>
              {sentimentIcon}
              <span className="ml-1">
                {opinion.sentiment === 'bullish' ? '看多' : opinion.sentiment === 'bearish' ? '看空' : '中性'}
              </span>
            </Badge>
          </div>
          <p className="text-sm leading-relaxed">{opinion.content}</p>
        </div>

        {/* 图片 */}
        {opinion.images && opinion.images.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {opinion.images.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={`分析图 ${idx + 1}`}
                className="rounded-lg border w-full h-32 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => window.open(img, '_blank')}
              />
            ))}
          </div>
        )}

        {/* 价格关键位 */}
        {opinion.priceLevels.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-muted-foreground">关键价位</div>
            <div className="grid grid-cols-1 gap-2">
              {opinion.priceLevels.map((level, idx) => {
                const distance = ((level.price - currentPrice) / currentPrice * 100).toFixed(2)
                const isAbove = level.price > currentPrice
                
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2 rounded-lg border ${getPriceLevelColor(level.type)}`}
                  >
                    <div className="flex items-center gap-2">
                      {getPriceLevelIcon(level.type)}
                      <span className="text-sm font-medium">{getPriceLevelLabel(level.type)}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">${level.price.toFixed(2)}</div>
                      <div className={`text-xs ${isAbove ? 'text-green-600' : 'text-red-600'}`}>
                        {isAbove ? '+' : ''}{distance}%
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {opinion.priceLevels.some(l => l.reason) && (
              <div className="text-xs text-muted-foreground space-y-1 mt-2">
                {opinion.priceLevels.filter(l => l.reason).map((level, idx) => (
                  <div key={idx}>
                    • {getPriceLevelLabel(level.type)}: {level.reason}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 来源链接 */}
        {opinion.sourceUrl && (
          <Button
            variant="link"
            size="sm"
            className="p-0 h-auto text-xs"
            onClick={() => window.open(opinion.sourceUrl, '_blank')}
          >
            查看原文 →
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
