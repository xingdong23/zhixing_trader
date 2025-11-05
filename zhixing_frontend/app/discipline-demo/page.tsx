"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import TradingDisciplineReminder from "@/components/trading/TradingDisciplineReminder"

export default function DisciplineDemoPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-3xl font-bold">交易纪律提醒 - 样式演示</h1>
            <p className="text-muted-foreground mt-2">
              查看不同样式的交易纪律提醒组件
            </p>
          </div>
        </div>

        {/* Banner 样式 */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Banner 样式 - 横幅通知栏</CardTitle>
              <p className="text-sm text-muted-foreground">
                适合放在页面顶部，作为全局提醒。自动轮播，不可关闭。
              </p>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <TradingDisciplineReminder 
                  variant="banner" 
                  dismissible={false}
                  autoRotate={true}
                  rotateInterval={8}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Card 样式 */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Card 样式 - 独立卡片</CardTitle>
              <p className="text-sm text-muted-foreground">
                适合放在页面内容区域，更加醒目。可选择是否可关闭。
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">不可关闭版本</h3>
                <TradingDisciplineReminder 
                  variant="card" 
                  dismissible={false}
                  autoRotate={true}
                  rotateInterval={10}
                />
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">可关闭版本</h3>
                <TradingDisciplineReminder 
                  variant="card" 
                  dismissible={true}
                  autoRotate={true}
                  rotateInterval={10}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Compact 样式 */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Compact 样式 - 紧凑提示</CardTitle>
              <p className="text-sm text-muted-foreground">
                适合放在侧边栏或空间有限的区域。
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <TradingDisciplineReminder 
                variant="compact" 
                dismissible={false}
                autoRotate={true}
                rotateInterval={6}
              />
              <TradingDisciplineReminder 
                variant="compact" 
                dismissible={true}
                autoRotate={false}
              />
            </CardContent>
          </Card>
        </section>

        {/* 使用场景说明 */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>集成位置说明</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold">主页面（所有页面顶部）</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    使用 Banner 样式，15秒轮播，不可关闭
                  </p>
                  <code className="text-xs bg-muted px-2 py-1 rounded mt-2 inline-block">
                    app/page.tsx
                  </code>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="font-semibold">股票详情页</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    使用 Card 样式，20秒轮播，可关闭
                  </p>
                  <code className="text-xs bg-muted px-2 py-1 rounded mt-2 inline-block">
                    app/stock/[symbol]/page.tsx
                  </code>
                </div>

                <div className="border-l-4 border-red-500 pl-4">
                  <h3 className="font-semibold">交易页面（最重要）</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    使用 Card 样式，12秒轮播（更频繁），不可关闭
                  </p>
                  <code className="text-xs bg-muted px-2 py-1 rounded mt-2 inline-block">
                    components/trades/TradesView.tsx
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 纪律规则列表 */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>交易纪律规则</CardTitle>
              <p className="text-sm text-muted-foreground">
                系统会自动轮播以下5条核心纪律规则
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-lg">
                  <span className="text-2xl">🔴</span>
                  <div>
                    <p className="font-medium text-red-600">宁愿错过，也不要做没有把握的交易</p>
                    <p className="text-xs text-muted-foreground mt-1">防止冲动交易，保护资本</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 rounded-lg">
                  <span className="text-2xl">🔵</span>
                  <div>
                    <p className="font-medium text-blue-600">只做极致压缩 + 回踩EMA55 + 成交量验证的交易</p>
                    <p className="text-xs text-muted-foreground mt-1">坚持高胜率策略，提高成功率</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg">
                  <span className="text-2xl">🟡</span>
                  <div>
                    <p className="font-medium text-amber-600">看不懂的交易不做，只做自己看得懂的</p>
                    <p className="text-xs text-muted-foreground mt-1">避免盲目跟风，保持理性</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-lg">
                  <span className="text-2xl">🟢</span>
                  <div>
                    <p className="font-medium text-green-600">没有赚钱总比亏损好很多，不要光想着盈利</p>
                    <p className="text-xs text-muted-foreground mt-1">资本保护优先，稳健为上</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 rounded-lg">
                  <span className="text-2xl">🟣</span>
                  <div>
                    <p className="font-medium text-purple-600">忍受空仓，等待最佳时机，纪律是盈利的基础</p>
                    <p className="text-xs text-muted-foreground mt-1">培养耐心，等待高概率机会</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
