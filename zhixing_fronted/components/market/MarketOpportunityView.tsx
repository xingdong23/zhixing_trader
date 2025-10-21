"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
  TrendingUp, 
  TrendingDown, 
  Flame, 
  Zap,
  AlertTriangle,
  Activity,
  Target,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  DollarSign,
  BarChart3,
  Lightbulb,
  Clock
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

// 市场指数数据
interface MarketIndex {
  name: string
  value: number
  change: number
  changePercent: number
  status: "bullish" | "bearish" | "neutral"
}

// VIX 恐慌指数
interface VIXData {
  value: number
  level: "low" | "medium" | "high" | "extreme"
  description: string
  suggestion: string
}

// 板块/概念数据
interface Sector {
  id: string
  name: string
  type: "sector" | "concept"
  change: number
  heat: number
  volume: number
  topStocks: Array<{ symbol: string; name: string; change: number }>
  opportunity: string
}

// 交易机会
interface TradingOpportunity {
  id: string
  title: string
  type: "long" | "short" | "neutral"
  confidence: number // 0-100
  reason: string
  targets: string[]
  timeframe: string
  risk: "low" | "medium" | "high"
}

// Mock 数据
const mockMarketIndices: MarketIndex[] = [
  { name: "标普500", value: 4783.45, change: 45.23, changePercent: 0.95, status: "bullish" },
  { name: "纳斯达克", value: 15215.70, change: 125.50, changePercent: 0.83, status: "bullish" },
  { name: "道琼斯", value: 37305.16, change: -52.30, changePercent: -0.14, status: "neutral" },
]

const mockVIX: VIXData = {
  value: 13.5,
  level: "low",
  description: "市场情绪乐观，波动率处于低位",
  suggestion: "适合做多，但需警惕突发风险"
}

const mockSectors: Sector[] = [
  {
    id: "ai",
    name: "人工智能",
    type: "concept",
    change: 8.5,
    heat: 95,
    volume: 1250000000,
    topStocks: [
      { symbol: "NVDA", name: "英伟达", change: 12.3 },
      { symbol: "MSFT", name: "微软", change: 6.8 },
      { symbol: "GOOGL", name: "谷歌", change: 5.2 }
    ],
    opportunity: "AI芯片需求强劲，建议关注龙头股"
  },
  {
    id: "ev",
    name: "新能源汽车",
    type: "sector",
    change: 6.2,
    heat: 88,
    volume: 980000000,
    topStocks: [
      { symbol: "TSLA", name: "特斯拉", change: 8.5 },
      { symbol: "NIO", name: "蔚来", change: 5.3 },
      { symbol: "XPEV", name: "小鹏", change: 4.8 }
    ],
    opportunity: "销量数据超预期，可逢低布局"
  },
  {
    id: "biotech",
    name: "生物医药",
    type: "sector",
    change: 4.8,
    heat: 75,
    volume: 750000000,
    topStocks: [
      { symbol: "MRNA", name: "Moderna", change: 7.2 },
      { symbol: "BNTX", name: "BioNTech", change: 5.5 },
      { symbol: "PFE", name: "辉瑞", change: 3.1 }
    ],
    opportunity: "新药研发进展顺利，中长期看好"
  },
  {
    id: "semiconductor",
    name: "半导体",
    type: "sector",
    change: 3.5,
    heat: 82,
    volume: 1100000000,
    topStocks: [
      { symbol: "TSM", name: "台积电", change: 4.2 },
      { symbol: "ASML", name: "阿斯麦", change: 3.8 },
      { symbol: "AMD", name: "AMD", change: 2.9 }
    ],
    opportunity: "产能扩张，供需改善，可分批建仓"
  }
]

const mockOpportunities: TradingOpportunity[] = [
  {
    id: "1",
    title: "AI板块突破新高",
    type: "long",
    confidence: 85,
    reason: "英伟达财报超预期，带动整个AI板块上涨。技术面突破关键阻力位，成交量放大。",
    targets: ["NVDA", "MSFT", "GOOGL"],
    timeframe: "短期 (1-2周)",
    risk: "medium"
  },
  {
    id: "2",
    title: "新能源汽车回调买入",
    type: "long",
    confidence: 72,
    reason: "近期回调至重要支撑位，销量数据超预期，政策支持力度加大。",
    targets: ["TSLA", "NIO", "XPEV"],
    timeframe: "中期 (1-2月)",
    risk: "low"
  },
  {
    id: "3",
    title: "传统能源承压",
    type: "short",
    confidence: 68,
    reason: "油价下跌，新能源替代加速，板块整体走弱。",
    targets: ["XOM", "CVX"],
    timeframe: "短期 (1周)",
    risk: "high"
  }
]

// VIX 等级配置
const vixConfig = {
  low: { color: "text-green-600", bg: "bg-green-50", label: "低恐慌", icon: TrendingUp },
  medium: { color: "text-yellow-600", bg: "bg-yellow-50", label: "中等恐慌", icon: Minus },
  high: { color: "text-orange-600", bg: "bg-orange-50", label: "高恐慌", icon: AlertTriangle },
  extreme: { color: "text-red-600", bg: "bg-red-50", label: "极度恐慌", icon: TrendingDown }
}

export default function MarketOpportunityView() {
  const [selectedTab, setSelectedTab] = useState<"overview" | "sectors" | "opportunities">("overview")

  const vixStyle = vixConfig[mockVIX.level]
  const VixIcon = vixStyle.icon

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Eye className="w-6 h-6 text-primary" />
            市场机会
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            实时追踪市场动态，发现交易机会
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Clock className="w-4 h-4 mr-1" />
          实时更新
        </Badge>
      </div>

      {/* 大盘概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            大盘趋势
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mockMarketIndices.map((index) => (
              <div key={index.name} className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{index.name}</span>
                  {index.status === "bullish" && <TrendingUp className="w-5 h-5 text-green-600" />}
                  {index.status === "bearish" && <TrendingDown className="w-5 h-5 text-red-600" />}
                  {index.status === "neutral" && <Minus className="w-5 h-5 text-gray-600" />}
                </div>
                <div className="text-2xl font-bold mb-1">
                  {index.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-sm font-medium",
                  index.change >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {index.change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {index.change >= 0 ? "+" : ""}{index.change.toFixed(2)} ({index.changePercent >= 0 ? "+" : ""}{index.changePercent.toFixed(2)}%)
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* VIX 恐慌指数 */}
      <Card className={cn("border-2", vixStyle.bg)}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className={cn("p-3 rounded-full", vixStyle.bg)}>
              <VixIcon className={cn("w-8 h-8", vixStyle.color)} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-bold">VIX 恐慌指数</h3>
                <Badge variant="outline" className={vixStyle.color}>
                  {vixStyle.label}
                </Badge>
              </div>
              <div className="text-3xl font-bold mb-2">{mockVIX.value}</div>
              <p className="text-sm text-muted-foreground mb-2">{mockVIX.description}</p>
              <div className="flex items-center gap-2 text-sm">
                <Lightbulb className="w-4 h-4 text-yellow-600" />
                <span className="font-medium">建议：</span>
                <span>{mockVIX.suggestion}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 标签页 */}
      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">综合概览</TabsTrigger>
          <TabsTrigger value="sectors">热门板块</TabsTrigger>
          <TabsTrigger value="opportunities">交易机会</TabsTrigger>
        </TabsList>

        {/* 综合概览 */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 热门板块 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  今日热门板块
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockSectors.slice(0, 4).map((sector, index) => (
                    <Link key={sector.id} href={`/categories/${sector.id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                          index === 0 && "bg-gradient-to-br from-yellow-400 to-orange-500 text-white",
                          index === 1 && "bg-gradient-to-br from-gray-300 to-gray-400 text-white",
                          index === 2 && "bg-gradient-to-br from-orange-400 to-orange-600 text-white",
                          index > 2 && "bg-muted text-muted-foreground"
                        )}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{sector.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {sector.type === "sector" ? "板块" : "概念"}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {sector.topStocks.slice(0, 2).map(s => s.symbol).join(", ")}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={cn(
                            "font-bold",
                            sector.change >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {sector.change >= 0 ? "+" : ""}{sector.change.toFixed(2)}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            热度 {sector.heat}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 交易机会 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-500" />
                  推荐交易机会
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockOpportunities.slice(0, 3).map((opp) => (
                    <div key={opp.id} className="p-3 rounded-lg border">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            opp.type === "long" ? "default" : 
                            opp.type === "short" ? "destructive" : "secondary"
                          }>
                            {opp.type === "long" ? "做多" : opp.type === "short" ? "做空" : "中性"}
                          </Badge>
                          <span className="font-semibold text-sm">{opp.title}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {opp.confidence}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{opp.reason}</p>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">标的:</span>
                          <span className="font-medium">{opp.targets.slice(0, 2).join(", ")}</span>
                        </div>
                        <Badge variant="outline" className={cn(
                          "text-xs",
                          opp.risk === "low" && "text-green-600",
                          opp.risk === "medium" && "text-yellow-600",
                          opp.risk === "high" && "text-red-600"
                        )}>
                          {opp.risk === "low" ? "低风险" : opp.risk === "medium" ? "中风险" : "高风险"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 热门板块详情 */}
        <TabsContent value="sectors" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockSectors.map((sector) => (
              <Card key={sector.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold">{sector.name}</h3>
                        <Badge variant="outline">
                          {sector.type === "sector" ? "板块" : "概念"}
                        </Badge>
                      </div>
                      <div className={cn(
                        "text-2xl font-bold",
                        sector.change >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {sector.change >= 0 ? "+" : ""}{sector.change.toFixed(2)}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span>热度</span>
                      </div>
                      <div className="text-xl font-bold">{sector.heat}</div>
                    </div>
                  </div>

                  {/* 热度条 */}
                  <div className="mb-4">
                    <Progress value={sector.heat} className="h-2" />
                  </div>

                  {/* 龙头股票 */}
                  <div className="space-y-2 mb-4">
                    <div className="text-sm font-medium text-muted-foreground">龙头股票</div>
                    {sector.topStocks.map((stock) => (
                      <div key={stock.symbol} className="flex items-center justify-between text-sm">
                        <span>{stock.symbol} - {stock.name}</span>
                        <span className={cn(
                          "font-medium",
                          stock.change >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {stock.change >= 0 ? "+" : ""}{stock.change.toFixed(2)}%
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* 机会分析 */}
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{sector.opportunity}</p>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="mt-4 flex gap-2">
                    <Link href={`/categories/${sector.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        查看详情
                      </Button>
                    </Link>
                    <Button size="sm" className="flex-1">
                      添加关注
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 交易机会详情 */}
        <TabsContent value="opportunities" className="space-y-4">
          {mockOpportunities.map((opp) => (
            <Card key={opp.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold">{opp.title}</h3>
                      <Badge variant={
                        opp.type === "long" ? "default" : 
                        opp.type === "short" ? "destructive" : "secondary"
                      }>
                        {opp.type === "long" ? "做多机会" : opp.type === "short" ? "做空机会" : "中性观望"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>时间框架: {opp.timeframe}</span>
                      <span>•</span>
                      <Badge variant="outline" className={cn(
                        opp.risk === "low" && "text-green-600",
                        opp.risk === "medium" && "text-yellow-600",
                        opp.risk === "high" && "text-red-600"
                      )}>
                        {opp.risk === "low" ? "低风险" : opp.risk === "medium" ? "中风险" : "高风险"}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground mb-1">置信度</div>
                    <div className="text-3xl font-bold text-primary">{opp.confidence}%</div>
                  </div>
                </div>

                {/* 分析原因 */}
                <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                  <div className="font-medium mb-2">分析依据</div>
                  <p className="text-sm text-muted-foreground">{opp.reason}</p>
                </div>

                {/* 推荐标的 */}
                <div className="mb-4">
                  <div className="font-medium mb-2">推荐标的</div>
                  <div className="flex flex-wrap gap-2">
                    {opp.targets.map((target) => (
                      <Link key={target} href={`/stock/${target}`}>
                        <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
                          {target}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <DollarSign className="w-4 h-4 mr-1" />
                    创建交易计划
                  </Button>
                  <Button variant="outline" size="sm">
                    <BarChart3 className="w-4 h-4 mr-1" />
                    查看分析
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
