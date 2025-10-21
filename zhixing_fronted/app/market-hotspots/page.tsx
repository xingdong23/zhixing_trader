"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  TrendingUp, 
  TrendingDown, 
  Flame, 
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  BarChart3,
  Eye
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

// 板块数据接口
interface Sector {
  id: string
  name: string
  change: number
  volume: number
  heat: number // 热度值 0-100
  trend: "up" | "down" | "stable"
  stocks: Array<{
    symbol: string
    name: string
    change: number
  }>
  tags: string[]
}

// Mock 数据
const mockSectors: Sector[] = [
  {
    id: "ai",
    name: "人工智能",
    change: 8.5,
    volume: 1250000000,
    heat: 95,
    trend: "up",
    stocks: [
      { symbol: "NVDA", name: "英伟达", change: 12.3 },
      { symbol: "MSFT", name: "微软", change: 6.8 },
      { symbol: "GOOGL", name: "谷歌", change: 5.2 }
    ],
    tags: ["ChatGPT", "芯片", "云计算"]
  },
  {
    id: "ev",
    name: "新能源汽车",
    change: 6.2,
    volume: 980000000,
    heat: 88,
    trend: "up",
    stocks: [
      { symbol: "TSLA", name: "特斯拉", change: 8.5 },
      { symbol: "NIO", name: "蔚来", change: 5.3 },
      { symbol: "XPEV", name: "小鹏", change: 4.8 }
    ],
    tags: ["电池", "自动驾驶", "充电桩"]
  },
  {
    id: "biotech",
    name: "生物医药",
    change: 4.8,
    volume: 750000000,
    heat: 75,
    trend: "up",
    stocks: [
      { symbol: "MRNA", name: "Moderna", change: 7.2 },
      { symbol: "BNTX", name: "BioNTech", change: 5.5 },
      { symbol: "PFE", name: "辉瑞", change: 3.1 }
    ],
    tags: ["疫苗", "基因治疗", "创新药"]
  },
  {
    id: "semiconductor",
    name: "半导体",
    change: 3.5,
    volume: 1100000000,
    heat: 82,
    trend: "up",
    stocks: [
      { symbol: "TSM", name: "台积电", change: 4.2 },
      { symbol: "ASML", name: "阿斯麦", change: 3.8 },
      { symbol: "AMD", name: "AMD", change: 2.9 }
    ],
    tags: ["芯片制造", "光刻机", "先进制程"]
  },
  {
    id: "fintech",
    name: "金融科技",
    change: 2.1,
    volume: 650000000,
    heat: 62,
    trend: "stable",
    stocks: [
      { symbol: "SQ", name: "Block", change: 3.2 },
      { symbol: "PYPL", name: "PayPal", change: 1.8 },
      { symbol: "COIN", name: "Coinbase", change: 1.5 }
    ],
    tags: ["支付", "区块链", "数字货币"]
  },
  {
    id: "energy",
    name: "传统能源",
    change: -1.2,
    volume: 850000000,
    heat: 45,
    trend: "down",
    stocks: [
      { symbol: "XOM", name: "埃克森美孚", change: -0.8 },
      { symbol: "CVX", name: "雪佛龙", change: -1.5 },
      { symbol: "COP", name: "康菲石油", change: -1.3 }
    ],
    tags: ["石油", "天然气", "能源转型"]
  },
  {
    id: "retail",
    name: "零售消费",
    change: 1.8,
    volume: 720000000,
    heat: 58,
    trend: "stable",
    stocks: [
      { symbol: "AMZN", name: "亚马逊", change: 2.5 },
      { symbol: "WMT", name: "沃尔玛", change: 1.3 },
      { symbol: "TGT", name: "Target", change: 1.6 }
    ],
    tags: ["电商", "实体零售", "消费升级"]
  },
  {
    id: "cloud",
    name: "云计算",
    change: 5.3,
    volume: 890000000,
    heat: 78,
    trend: "up",
    stocks: [
      { symbol: "AMZN", name: "AWS", change: 6.2 },
      { symbol: "MSFT", name: "Azure", change: 5.8 },
      { symbol: "GOOGL", name: "GCP", change: 4.1 }
    ],
    tags: ["SaaS", "IaaS", "PaaS"]
  }
]

// 热度颜色映射
function getHeatColor(heat: number): string {
  if (heat >= 80) return "from-red-500 to-orange-500"
  if (heat >= 60) return "from-orange-500 to-yellow-500"
  if (heat >= 40) return "from-yellow-500 to-green-500"
  return "from-green-500 to-blue-500"
}

// 热度等级
function getHeatLevel(heat: number): { label: string; color: string } {
  if (heat >= 80) return { label: "极热", color: "text-red-600" }
  if (heat >= 60) return { label: "热门", color: "text-orange-600" }
  if (heat >= 40) return { label: "温和", color: "text-yellow-600" }
  return { label: "冷门", color: "text-blue-600" }
}

// 热力图卡片
function HeatmapCard({ sector, size = "normal" }: { sector: Sector; size?: "small" | "normal" | "large" }) {
  const heatLevel = getHeatLevel(sector.heat)
  const sizeClasses = {
    small: "h-32",
    normal: "h-40",
    large: "h-48"
  }

  return (
    <Link href={`/categories/${sector.id}`}>
      <Card 
        className={cn(
          "relative overflow-hidden cursor-pointer transition-all hover:scale-105 hover:shadow-xl border-2",
          sizeClasses[size],
          sector.trend === "up" && "border-green-200 hover:border-green-400",
          sector.trend === "down" && "border-red-200 hover:border-red-400",
          sector.trend === "stable" && "border-gray-200 hover:border-gray-400"
        )}
      >
        {/* 背景渐变 */}
        <div 
          className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-10",
            getHeatColor(sector.heat)
          )}
        />
        
        <CardContent className="relative h-full p-4 flex flex-col justify-between">
          {/* 头部 */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">{sector.name}</h3>
              <div className="flex items-center gap-2">
                <Badge variant={sector.change >= 0 ? "default" : "destructive"} className="text-xs">
                  {sector.change >= 0 ? "+" : ""}{sector.change.toFixed(2)}%
                </Badge>
                <Badge variant="outline" className={cn("text-xs", heatLevel.color)}>
                  <Flame className="w-3 h-3 mr-1" />
                  {heatLevel.label}
                </Badge>
              </div>
            </div>
            {sector.trend === "up" && <TrendingUp className="w-6 h-6 text-green-600" />}
            {sector.trend === "down" && <TrendingDown className="w-6 h-6 text-red-600" />}
            {sector.trend === "stable" && <Activity className="w-6 h-6 text-gray-600" />}
          </div>

          {/* 热度条 */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>热度</span>
              <span>{sector.heat}/100</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={cn("h-full bg-gradient-to-r transition-all", getHeatColor(sector.heat))}
                style={{ width: `${sector.heat}%` }}
              />
            </div>
          </div>

          {/* 标签 */}
          <div className="flex flex-wrap gap-1">
            {sector.tags.slice(0, 3).map((tag, idx) => (
              <span key={idx} className="text-xs px-2 py-0.5 bg-white/50 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

// 排行榜
function RankingList({ sectors, title }: { sectors: Sector[]; title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sectors.slice(0, 10).map((sector, index) => (
            <Link key={sector.id} href={`/categories/${sector.id}`}>
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                {/* 排名 */}
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                  index === 0 && "bg-gradient-to-br from-yellow-400 to-orange-500 text-white",
                  index === 1 && "bg-gradient-to-br from-gray-300 to-gray-400 text-white",
                  index === 2 && "bg-gradient-to-br from-orange-400 to-orange-600 text-white",
                  index > 2 && "bg-muted text-muted-foreground"
                )}>
                  {index + 1}
                </div>

                {/* 板块信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{sector.name}</span>
                    <Badge variant="outline" className="text-xs">
                      <Flame className="w-3 h-3 mr-1" />
                      {sector.heat}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {sector.stocks.slice(0, 3).map((stock, idx) => (
                      <span key={idx} className="text-xs text-muted-foreground">
                        {stock.symbol}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 涨跌幅 */}
                <div className="text-right">
                  <div className={cn(
                    "font-bold text-lg",
                    sector.change >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {sector.change >= 0 ? "+" : ""}{sector.change.toFixed(2)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(sector.volume / 100000000).toFixed(1)}亿
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function MarketHotspotsPage() {
  const [timeRange, setTimeRange] = useState<"1d" | "1w" | "multi">("1d")

  // 根据时间范围排序
  const sortedSectors = [...mockSectors].sort((a, b) => {
    if (timeRange === "1d") return b.change - a.change
    if (timeRange === "1w") return b.heat - a.heat
    return b.volume - a.volume
  })

  const topSectors = sortedSectors.slice(0, 8)
  const hotSectors = sortedSectors.filter(s => s.heat >= 70)
  const risingSectors = sortedSectors.filter(s => s.change > 3)

  return (
    <div className="min-h-screen bg-background p-6">
      {/* 页面头部 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Flame className="w-8 h-8 text-orange-500" />
              市场热点板块
            </h1>
            <p className="text-muted-foreground mt-1">
              实时追踪市场热点，把握短线机会
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              <Zap className="w-4 h-4 mr-1 text-yellow-500" />
              实时更新
            </Badge>
            <Badge variant="outline" className="text-sm">
              <Eye className="w-4 h-4 mr-1 text-blue-500" />
              {mockSectors.length} 个板块
            </Badge>
          </div>
        </div>
      </div>

      {/* 时间维度切换 */}
      <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)} className="mb-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="1d" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            1日热点
          </TabsTrigger>
          <TabsTrigger value="1w" className="flex items-center gap-2">
            <Flame className="w-4 h-4" />
            1周热点
          </TabsTrigger>
          <TabsTrigger value="multi" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            多日热点
          </TabsTrigger>
        </TabsList>

        {/* 1日热点 */}
        <TabsContent value="1d" className="space-y-6">
          <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="w-6 h-6 text-orange-500" />
                <div>
                  <h2 className="text-xl font-bold">今日最热板块</h2>
                  <p className="text-sm text-muted-foreground">基于今日涨跌幅排序</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {topSectors.map((sector) => (
                  <HeatmapCard key={sector.id} sector={sector} />
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RankingList sectors={sortedSectors} title="今日涨幅榜" />
            <RankingList 
              sectors={[...mockSectors].sort((a, b) => b.volume - a.volume)} 
              title="今日成交额榜" 
            />
          </div>
        </TabsContent>

        {/* 1周热点 */}
        <TabsContent value="1w" className="space-y-6">
          <Card className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <Flame className="w-6 h-6 text-red-500" />
                <div>
                  <h2 className="text-xl font-bold">本周持续热门</h2>
                  <p className="text-sm text-muted-foreground">基于一周热度值排序</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {hotSectors.map((sector) => (
                  <HeatmapCard key={sector.id} sector={sector} size="large" />
                ))}
              </div>
            </CardContent>
          </Card>

          <RankingList 
            sectors={[...mockSectors].sort((a, b) => b.heat - a.heat)} 
            title="本周热度榜" 
          />
        </TabsContent>

        {/* 多日热点 */}
        <TabsContent value="multi" className="space-y-6">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-6 h-6 text-green-500" />
                <div>
                  <h2 className="text-xl font-bold">持续上涨板块</h2>
                  <p className="text-sm text-muted-foreground">多日保持上涨趋势的板块</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {risingSectors.map((sector) => (
                  <HeatmapCard key={sector.id} sector={sector} />
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RankingList 
              sectors={risingSectors} 
              title="连续上涨榜" 
            />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-green-600" />
                  强势板块特征
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-500" />
                      热度持续 ≥ 70
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {hotSectors.length} 个板块保持高热度
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      涨幅 &gt; 3%
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {risingSectors.length} 个板块持续上涨
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-purple-500" />
                      成交活跃
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      平均成交额 {(mockSectors.reduce((sum, s) => sum + s.volume, 0) / mockSectors.length / 100000000).toFixed(1)} 亿
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
