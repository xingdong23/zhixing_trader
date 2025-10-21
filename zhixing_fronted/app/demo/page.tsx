"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { TrendingUp, Users, BarChart3, Target, ArrowRight } from "lucide-react"

export default function DemoPage() {
  const router = useRouter()

  const demos = [
    {
      title: "股票提醒可视化",
      description: "查看多位专家的止损、止盈、加仓等关键价位，在K线图上可视化展示",
      icon: <TrendingUp className="w-8 h-8 text-blue-600" />,
      path: "/stock-enhanced/AAPL",
      features: [
        "专家观点聚合",
        "价格提醒图表",
        "共识热力图",
        "动态高亮显示"
      ],
      badge: "新功能"
    },
    {
      title: "原版股票详情",
      description: "查看股票的基本信息、K线图、投资笔记时间线",
      icon: <BarChart3 className="w-8 h-8 text-green-600" />,
      path: "/stock/AAPL",
      features: [
        "K线图表",
        "关键指标",
        "投资笔记",
        "快速操作"
      ]
    },
    {
      title: "交易管理",
      description: "管理你的交易计划、执行记录、规则遵守情况",
      icon: <Target className="w-8 h-8 text-purple-600" />,
      path: "/trades",
      features: [
        "交易计划",
        "执行监控",
        "规则检查",
        "统计分析"
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">功能演示</h1>
          <p className="text-xl text-muted-foreground">
            探索智行交易系统的各项功能
          </p>
        </div>

        {/* Demo Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {demos.map((demo, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    {demo.icon}
                    <CardTitle className="text-xl">{demo.title}</CardTitle>
                  </div>
                  {demo.badge && (
                    <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded">
                      {demo.badge}
                    </span>
                  )}
                </div>
                <CardDescription className="text-sm">
                  {demo.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {demo.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {feature}
                    </div>
                  ))}
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => router.push(demo.path)}
                >
                  查看演示
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Links */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-none">
          <CardHeader>
            <CardTitle>快速链接</CardTitle>
            <CardDescription>常用页面快速访问</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" onClick={() => router.push("/")}>
                主页
              </Button>
              <Button variant="outline" onClick={() => router.push("/trades")}>
                交易管理
              </Button>
              <Button variant="outline" onClick={() => router.push("/plan/create")}>
                创建计划
              </Button>
              <Button variant="outline" onClick={() => router.push("/notifications")}>
                通知中心
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              关于股票提醒可视化
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              股票提醒可视化系统是为了解决投资者在社交媒体上看到多个大佬分析时，
              难以整合和对比不同观点的问题。通过将多位专家的止损、止盈、加仓等关键价位
              可视化展示在同一张图表上，帮助投资者：
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>快速识别多位专家的共识价位</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>对比不同专家的策略差异</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>基于多方观点做出更明智的决策</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>追踪价格接近关键位时及时提醒</span>
              </li>
            </ul>
            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-2">使用场景示例</h4>
              <p className="text-sm text-muted-foreground">
                你在推特上看到"华尔街老王"说 AAPL 止损 178，止盈 195；
                又在 Telegram 看到"量化分析师小李"说止损 175，止盈 190-192。
                通过本系统，你可以将这些观点整合在一张图上，发现他们的共识区域在 180 附近，
                从而制定更稳健的交易策略。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
