"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Plus, Users, TrendingUp } from "lucide-react"
import ExpertOpinionCard, { ExpertOpinion } from "@/components/stocks/ExpertOpinion"
import PriceAlertChart from "@/components/stocks/PriceAlertChart"
import ConsensusHeatmap from "@/components/stocks/ConsensusHeatmap"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface StockData {
  ticker: string
  name: string
  price: number
  change: number
  change_percent: number
  volume: string
  market: string
}

export default function EnhancedStockPage() {
  const params = useParams()
  const router = useRouter()
  const symbol = params.symbol as string

  const [stock, setStock] = useState<StockData | null>(null)
  const [expertOpinions, setExpertOpinions] = useState<ExpertOpinion[]>([])
  const [highlightedOpinionIds, setHighlightedOpinionIds] = useState<string[]>([])
  const [addOpinionDialogOpen, setAddOpinionDialogOpen] = useState(false)

  // Mock K线数据
  const candles = Array.from({ length: 120 }).map((_, i) => {
    const base = 180
    const time = Math.floor(Date.now() / 1000) - (120 - i) * 86400
    const open = base + Math.sin(i / 10) * 5 + (Math.random() - 0.5) * 2
    const close = open + (Math.random() - 0.5) * 4
    const high = Math.max(open, close) + Math.random() * 3
    const low = Math.min(open, close) - Math.random() * 3
    return { time, open, high, low, close }
  })

  // 初始化Mock数据
  useEffect(() => {
    // Mock股票数据
    setStock({
      ticker: symbol.toUpperCase(),
      name: symbol.toUpperCase() === 'AAPL' ? '苹果公司' : symbol.toUpperCase(),
      price: 183.25,
      change: 2.45,
      change_percent: 1.35,
      volume: '52.3M',
      market: 'NASDAQ',
    })

    // Mock专家观点
    const mockOpinions: ExpertOpinion[] = [
      {
        id: '1',
        expertName: '华尔街老王',
        source: 'Twitter',
        sourceUrl: 'https://twitter.com/example',
        timestamp: '2小时前',
        content: 'AAPL 目前处于关键支撑位 180 美元附近。如果能守住这个位置，预计会反弹至 195。但如果跌破 178，需要止损离场。建议在 181-182 区间分批建仓。',
        sentiment: 'bullish',
        priceLevels: [
          { price: 178, type: 'stop_loss', reason: '跌破关键支撑，趋势转弱' },
          { price: 181, type: 'entry', reason: '第一入场位' },
          { price: 182, type: 'add_position', reason: '确认支撑后加仓' },
          { price: 195, type: 'take_profit', reason: '前期高点阻力位' },
        ],
        credibility: 85,
        followers: 125000,
        images: [],
      },
      {
        id: '2',
        expertName: '量化分析师小李',
        source: 'Telegram',
        timestamp: '5小时前',
        content: '根据技术指标，AAPL 的 RSI 已经超卖，MACD 即将金叉。建议在 179-180 区间布局，目标看到 190-192。止损设在 175 下方。',
        sentiment: 'bullish',
        priceLevels: [
          { price: 175, type: 'stop_loss', reason: 'RSI 超卖失效' },
          { price: 179, type: 'entry', reason: '超卖反弹入场' },
          { price: 190, type: 'take_profit', reason: '第一目标位' },
          { price: 192, type: 'take_profit', reason: '第二目标位' },
        ],
        credibility: 78,
        followers: 68000,
      },
      {
        id: '3',
        expertName: '价值投资者张三',
        source: 'Weibo',
        timestamp: '1天前',
        content: '从基本面看，AAPL 的估值已经合理。长期持有者可以在 185 以下分批建仓，不建议追高。如果跌到 170，那是非常好的加仓机会。',
        sentiment: 'neutral',
        priceLevels: [
          { price: 185, type: 'entry', reason: '合理估值区间上限' },
          { price: 170, type: 'add_position', reason: '极佳的长期建仓机会' },
        ],
        credibility: 92,
        followers: 230000,
      },
      {
        id: '4',
        expertName: '短线高手赵四',
        source: 'Twitter',
        timestamp: '8小时前',
        content: '短线来看，AAPL 在 183-185 区间有较强阻力。建议在 182 附近做多，目标 186-188，止损 180。如果突破 188，可以继续持有看 195。',
        sentiment: 'bullish',
        priceLevels: [
          { price: 180, type: 'stop_loss', reason: '短线止损位' },
          { price: 182, type: 'entry', reason: '短线入场' },
          { price: 186, type: 'take_profit', reason: '第一目标' },
          { price: 188, type: 'take_profit', reason: '第二目标，突破后持有' },
          { price: 195, type: 'take_profit', reason: '最终目标' },
        ],
        credibility: 72,
        followers: 45000,
      },
      {
        id: '5',
        expertName: '机构分析师王五',
        source: 'Research Report',
        timestamp: '3天前',
        content: '我们维持 AAPL 的买入评级，目标价 200 美元。建议投资者在 175-185 区间积极配置。如果市场出现恐慌性下跌至 165，那将是极佳的买入机会。',
        sentiment: 'bullish',
        priceLevels: [
          { price: 175, type: 'entry', reason: '建议配置区间下限' },
          { price: 165, type: 'add_position', reason: '恐慌性下跌买入机会' },
          { price: 200, type: 'take_profit', reason: '12个月目标价' },
        ],
        credibility: 88,
        followers: 180000,
      },
    ]

    setExpertOpinions(mockOpinions)
    
    // 默认高亮前两个专家
    setHighlightedOpinionIds([mockOpinions[0].id, mockOpinions[1].id])
  }, [symbol])

  const toggleHighlight = (opinionId: string) => {
    setHighlightedOpinionIds(prev => 
      prev.includes(opinionId)
        ? prev.filter(id => id !== opinionId)
        : [...prev, opinionId]
    )
  }

  const handleAddOpinion = () => {
    // TODO: 实现添加专家观点的逻辑
    setAddOpinionDialogOpen(false)
  }

  if (!stock) {
    return <div className="p-8">加载中...</div>
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card p-4 sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {stock.name} ({stock.ticker})
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  现价: <span className="font-semibold text-foreground">${stock.price}</span>
                </span>
                <span className={`font-semibold ${stock.change_percent >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {stock.change_percent >= 0 ? "+" : ""}
                  {stock.change_percent.toFixed(2)}%
                </span>
                <span>成交量: {stock.volume}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Users className="w-3 h-3" />
              {expertOpinions.length} 位专家
            </Badge>
            <Dialog open={addOpinionDialogOpen} onOpenChange={setAddOpinionDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  添加观点
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>添加专家观点</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>专家名称</Label>
                      <Input placeholder="例如：华尔街老王" />
                    </div>
                    <div>
                      <Label>来源</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="选择来源" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="twitter">Twitter</SelectItem>
                          <SelectItem value="weibo">微博</SelectItem>
                          <SelectItem value="telegram">Telegram</SelectItem>
                          <SelectItem value="other">其他</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>观点内容</Label>
                    <Textarea placeholder="输入专家的分析内容..." rows={4} />
                  </div>
                  <div>
                    <Label>情绪倾向</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="选择情绪" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bullish">看多</SelectItem>
                        <SelectItem value="bearish">看空</SelectItem>
                        <SelectItem value="neutral">中性</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>关键价位</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Input type="number" placeholder="止损价" />
                      <Input type="number" placeholder="入场价" />
                      <Input type="number" placeholder="止盈价" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAddOpinionDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleAddOpinion}>保存</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* 主内容区 - 图表 */}
          <div className="xl:col-span-2 space-y-6">
            {/* 价格提醒可视化图表 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>价格提醒可视化</span>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground font-normal">
                    <TrendingUp className="w-4 h-4" />
                    已选中 {highlightedOpinionIds.length} 位专家
                  </div>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  在K线图上显示多位专家的关键价位
                </p>
              </CardHeader>
              <CardContent>
                <PriceAlertChart
                  candles={candles}
                  expertOpinions={expertOpinions}
                  highlightedOpinionIds={highlightedOpinionIds}
                  currentPrice={stock.price}
                  height={500}
                />
              </CardContent>
            </Card>

            {/* 共识热力图 */}
            <ConsensusHeatmap
              expertOpinions={expertOpinions}
              currentPrice={stock.price}
            />
          </div>

          {/* 侧边栏 - 专家观点列表 */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>专家观点</CardTitle>
                <p className="text-sm text-muted-foreground">
                  点击"在图表显示"按钮可在图表上高亮显示该专家的关键价位
                </p>
              </CardHeader>
            </Card>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">全部</TabsTrigger>
                <TabsTrigger value="bullish">看多</TabsTrigger>
                <TabsTrigger value="bearish">看空</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="space-y-4 mt-4">
                {expertOpinions.map(opinion => (
                  <ExpertOpinionCard
                    key={opinion.id}
                    opinion={opinion}
                    currentPrice={stock.price}
                    onToggleHighlight={toggleHighlight}
                    isHighlighted={highlightedOpinionIds.includes(opinion.id)}
                  />
                ))}
              </TabsContent>
              
              <TabsContent value="bullish" className="space-y-4 mt-4">
                {expertOpinions
                  .filter(op => op.sentiment === 'bullish')
                  .map(opinion => (
                    <ExpertOpinionCard
                      key={opinion.id}
                      opinion={opinion}
                      currentPrice={stock.price}
                      onToggleHighlight={toggleHighlight}
                      isHighlighted={highlightedOpinionIds.includes(opinion.id)}
                    />
                  ))}
              </TabsContent>
              
              <TabsContent value="bearish" className="space-y-4 mt-4">
                {expertOpinions
                  .filter(op => op.sentiment === 'bearish')
                  .map(opinion => (
                    <ExpertOpinionCard
                      key={opinion.id}
                      opinion={opinion}
                      currentPrice={stock.price}
                      onToggleHighlight={toggleHighlight}
                      isHighlighted={highlightedOpinionIds.includes(opinion.id)}
                    />
                  ))}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
