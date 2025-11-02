"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ArrowLeft, ArrowRight, Save, CheckCircle, AlertTriangle, TrendingUp, Target, Clock, FileText, Shield, BarChart3 } from "lucide-react"
import { toast } from "sonner"

// 6步交易体系的步骤定义
const TRADING_STEPS = [
  { 
    id: 1, 
    name: "分析趋势", 
    icon: TrendingUp, 
    description: "准确判断市场趋势方向",
    color: "text-green-600"
  },
  { 
    id: 2, 
    name: "找关键位", 
    icon: Target, 
    description: "识别支撑、阻力等关键价格区域",
    color: "text-blue-600"
  },
  { 
    id: 3, 
    name: "入场时机", 
    icon: Clock, 
    description: "等待趋势确认与关键位突破",
    color: "text-orange-600"
  },
  { 
    id: 4, 
    name: "制定计划", 
    icon: FileText, 
    description: "明确入场、止损、止盈及仓位管理",
    color: "text-purple-600"
  },
  { 
    id: 5, 
    name: "执行检查", 
    icon: Shield, 
    description: "交易前强制检查清单",
    color: "text-red-600"
  },
  { 
    id: 6, 
    name: "确认保存", 
    icon: CheckCircle, 
    description: "复盘计划，确认无误后保存",
    color: "text-cyan-600"
  },
]

export default function CreateTradingPlanWizard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState(1)
  
  // 交易计划数据
  const [plan, setPlan] = useState({
    // 基本信息
    name: "",
    ticker: searchParams.get("ticker") || "",
    
    // 步骤1: 分析趋势
    trendAnalysis: {
      marketTrend: "" as "uptrend" | "downtrend" | "sideways" | "",
      timeframe: "" as "short" | "medium" | "long" | "",
      trendStrength: 5, // 1-10
      trendConfirmed: false,
    },
    
    // 步骤2: 找关键位
    keyLevels: {
      currentPrice: "",
      supportLevel: "",
      resistanceLevel: "",
      pivotPoints: [] as string[],
      positionType: "" as "low" | "middle" | "high" | "", // 当前位置
    },
    
    // 步骤3: 入场时机
    entryTiming: {
      entryType: "" as "breakout" | "pullback" | "support" | "pattern" | "",
      technicalSignals: [] as string[],
      volumeConfirmed: false,
      macdGoldenCross: false,
      priceAboveMA: false,
    },
    
    // 步骤4: 制定计划
    tradingPlan: {
      entry: "",
      entryCondition: "",
      tp: "",
      tpCondition: "",
      sl: "",
      slCondition: "",
      positionSize: "",
      strategy: "",
      riskLevel: "medium" as "low" | "medium" | "high",
      reason: searchParams.get("note")
        ? `基于${searchParams.get("author")}的观点: ${decodeURIComponent(searchParams.get("note") || "")}`
        : "",
    },
    
    // 步骤5: 执行检查清单
    preTradeChecklist: {
      // 机会判断
      isFamiliarPattern: false,
      meetsSelectionCriteria: false,
      canExplainLogic: false,
      
      // 位置判断
      isKeyLevelEntry: false,
      knowsPosition: false,
      hasStopLoss: false,
      
      // 情绪检查
      emotionScore: 5, // 1-10
      isCalm: false,
      recentWinRate: "",
      
      // 市场状态
      vixNormal: true,
      volatilityOk: true,
      noWeakLeaders: true,
    },
  })

  // 步骤进度
  const progress = (currentStep / TRADING_STEPS.length) * 100

  // 前进到下一步
  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < TRADING_STEPS.length) {
        setCurrentStep(currentStep + 1)
      }
    }
  }

  // 返回上一步
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // 验证当前步骤
  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1: // 分析趋势
        if (!plan.trendAnalysis.marketTrend) {
          toast.error("请选择市场趋势方向")
          return false
        }
        if (!plan.trendAnalysis.timeframe) {
          toast.error("请选择交易周期")
          return false
        }
        return true
      
      case 2: // 找关键位
        if (!plan.keyLevels.currentPrice) {
          toast.error("请输入当前价格")
          return false
        }
        if (!plan.keyLevels.supportLevel || !plan.keyLevels.resistanceLevel) {
          toast.error("请输入支撑位和阻力位")
          return false
        }
        return true
      
      case 3: // 入场时机
        if (!plan.entryTiming.entryType) {
          toast.error("请选择入场类型")
          return false
        }
        return true
      
      case 4: // 制定计划
        if (!plan.tradingPlan.entry || !plan.tradingPlan.tp || !plan.tradingPlan.sl) {
          toast.error("请填写完整的交易参数（入场、止盈、止损）")
          return false
        }
        if (!plan.tradingPlan.positionSize) {
          toast.error("请输入仓位大小")
          return false
        }
        return true
      
      case 5: // 执行检查
        const criticalChecks = [
          plan.preTradeChecklist.isFamiliarPattern,
          plan.preTradeChecklist.meetsSelectionCriteria,
          plan.preTradeChecklist.canExplainLogic,
          plan.preTradeChecklist.isKeyLevelEntry,
          plan.preTradeChecklist.knowsPosition,
          plan.preTradeChecklist.isCalm,
        ]
        
        const failedCount = criticalChecks.filter(check => !check).length
        if (failedCount > 0) {
          toast.warning(`还有 ${failedCount} 项关键检查未通过，建议重新审视交易计划`)
          return true // 允许继续但发出警告
        }
        
        if (plan.preTradeChecklist.emotionScore > 7) {
          toast.error("情绪评分过高，建议冷静10分钟后再交易")
          return false
        }
        return true
      
      default:
        return true
    }
  }

  // 保存交易计划
  const handleSave = () => {
    console.log("保存交易计划:", plan)
    toast.success("✅ 交易计划已保存！")
    
    // 保存到localStorage（实际应该保存到后端）
    const existingPlans = JSON.parse(localStorage.getItem('trading_plans') || '[]')
    existingPlans.push({
      ...plan,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      status: 'pending'
    })
    localStorage.setItem('trading_plans', JSON.stringify(existingPlans))
    
    // 返回上一页
    router.back()
  }

  // 渲染当前步骤内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <Step1TrendAnalysis plan={plan} setPlan={setPlan} />
      case 2:
        return <Step2KeyLevels plan={plan} setPlan={setPlan} />
      case 3:
        return <Step3EntryTiming plan={plan} setPlan={setPlan} />
      case 4:
        return <Step4TradingPlan plan={plan} setPlan={setPlan} />
      case 5:
        return <Step5PreTradeChecklist plan={plan} setPlan={setPlan} />
      case 6:
        return <Step6ReviewAndSave plan={plan} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* 头部 */}
      <header className="border-b bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回
              </Button>
              <div>
                <h1 className="text-2xl font-bold">通过6个步骤搭建交易体系</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">告别盲目交易，迈向稳定盈利</p>
              </div>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              步骤 {currentStep}/{TRADING_STEPS.length}
            </Badge>
          </div>
          
          {/* 进度条 */}
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </header>

      {/* 步骤指示器 */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          {TRADING_STEPS.map((step, index) => {
            const Icon = step.icon
            const isActive = currentStep === step.id
            const isCompleted = currentStep > step.id
            
            return (
              <div key={step.id} className="flex-1 relative">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all ${
                      isActive
                        ? "bg-blue-600 border-blue-600 text-white scale-110 shadow-lg"
                        : isCompleted
                        ? "bg-green-600 border-green-600 text-white"
                        : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <Icon className="w-6 h-6" />
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p className={`text-sm font-medium ${isActive ? "text-blue-600 dark:text-blue-400" : ""}`}>
                      {step.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">
                      {step.description}
                    </p>
                  </div>
                </div>
                
                {/* 连接线 */}
                {index < TRADING_STEPS.length - 1 && (
                  <div
                    className={`absolute top-7 left-[60%] w-full h-0.5 -z-10 ${
                      isCompleted ? "bg-green-600" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* 当前步骤内容 */}
        <div className="max-w-4xl mx-auto">
          {renderStepContent()}
        </div>

        {/* 导航按钮 */}
        <div className="flex justify-between mt-8 max-w-4xl mx-auto">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            上一步
          </Button>
          
          {currentStep < TRADING_STEPS.length ? (
            <Button onClick={handleNext}>
              下一步
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              保存交易计划
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ==================== 步骤1: 分析趋势 ====================
function Step1TrendAnalysis({ plan, setPlan }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-green-600" />
          步骤1: 分析趋势
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          准确判断市场趋势方向，顺势而为以提高交易成功率
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 基本信息 */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="ticker">股票代码 *</Label>
            <Input
              id="ticker"
              value={plan.ticker}
              onChange={(e) => setPlan({ ...plan, ticker: e.target.value.toUpperCase() })}
              placeholder="如：AAPL, TSLA"
              className="text-lg"
            />
          </div>
          
          <div>
            <Label htmlFor="planName">计划名称 (可选)</Label>
            <Input
              id="planName"
              value={plan.name}
              onChange={(e) => setPlan({ ...plan, name: e.target.value })}
              placeholder="如：TSLA 突破买入计划"
            />
          </div>
        </div>

        <div className="border-t pt-6 space-y-4">
          <h3 className="font-semibold text-lg">1. 定周期 - 确定交易时间框架</h3>
          
          <div>
            <Label>参考周期: 你随的是哪一波的势？*</Label>
            <Select
              value={plan.trendAnalysis.timeframe}
              onValueChange={(value: any) => 
                setPlan({ ...plan, trendAnalysis: { ...plan.trendAnalysis, timeframe: value }})
              }
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="选择交易周期" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">短线 (1-5天)</SelectItem>
                <SelectItem value="medium">中线 (1-4周)</SelectItem>
                <SelectItem value="long">长线 (1个月以上)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500 mt-1">
              交易周期：入场信号、止盈、止损所在的周期
            </p>
          </div>
        </div>

        <div className="border-t pt-6 space-y-4">
          <h3 className="font-semibold text-lg">2. 分清楚现在所处的阶段</h3>
          
          <div>
            <Label>当前市场趋势 *</Label>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {[
                { value: "uptrend", label: "📈 上升趋势", desc: "看K线形态的强弱" },
                { value: "downtrend", label: "📉 下降趋势", desc: "看均线与价格关系" },
                { value: "sideways", label: "➡️ 横盘震荡", desc: "看趋势的延续性" },
              ].map((trend) => (
                <Card
                  key={trend.value}
                  className={`cursor-pointer transition-all ${
                    plan.trendAnalysis.marketTrend === trend.value
                      ? "ring-2 ring-blue-600 bg-blue-50 dark:bg-blue-950"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                  onClick={() =>
                    setPlan({
                      ...plan,
                      trendAnalysis: { ...plan.trendAnalysis, marketTrend: trend.value },
                    })
                  }
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl mb-1">{trend.label}</div>
                    <p className="text-xs text-gray-500">{trend.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <Label>趋势强度评估 (1-10分) *</Label>
            <div className="flex items-center gap-4 mt-2">
              <input
                type="range"
                min="1"
                max="10"
                value={plan.trendAnalysis.trendStrength}
                onChange={(e) =>
                  setPlan({
                    ...plan,
                    trendAnalysis: { ...plan.trendAnalysis, trendStrength: Number(e.target.value) },
                  })
                }
                className="flex-1"
              />
              <Badge variant="outline" className="text-lg w-12 justify-center">
                {plan.trendAnalysis.trendStrength}
              </Badge>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>弱趋势</span>
              <span>中等</span>
              <span>强趋势</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="trendConfirmed"
              checked={plan.trendAnalysis.trendConfirmed}
              onCheckedChange={(checked) =>
                setPlan({
                  ...plan,
                  trendAnalysis: { ...plan.trendAnalysis, trendConfirmed: checked },
                })
              }
            />
            <Label htmlFor="trendConfirmed" className="cursor-pointer">
              趋势已确认（看反转或延续信号）
            </Label>
          </div>
        </div>

        {/* 提示信息 */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">💡 分析提示</h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• <strong>裸K</strong>：看K线形态的强弱</li>
            <li>• <strong>均线</strong>：看价格与均线的关系</li>
            <li>• <strong>趋势线</strong>：看趋势的延续性</li>
            <li>• <strong>形态</strong>：看反转或延续信号</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

// ==================== 步骤2: 找关键位 ====================
function Step2KeyLevels({ plan, setPlan }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-6 h-6 text-blue-600" />
          步骤2: 找关键位置
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          识别支撑、阻力等关键价格区域，为交易提供可靠依据
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">1. 水平关键位</h3>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="currentPrice">当前价格 *</Label>
              <Input
                id="currentPrice"
                type="number"
                step="0.01"
                value={plan.keyLevels.currentPrice}
                onChange={(e) =>
                  setPlan({
                    ...plan,
                    keyLevels: { ...plan.keyLevels, currentPrice: e.target.value },
                  })
                }
                placeholder="245.00"
              />
            </div>
            
            <div>
              <Label htmlFor="supportLevel">主要支撑位 *</Label>
              <Input
                id="supportLevel"
                type="number"
                step="0.01"
                value={plan.keyLevels.supportLevel}
                onChange={(e) =>
                  setPlan({
                    ...plan,
                    keyLevels: { ...plan.keyLevels, supportLevel: e.target.value },
                  })
                }
                placeholder="230.00"
              />
              <p className="text-xs text-gray-500 mt-1">做多不破空，只开空单，不平多单</p>
            </div>
            
            <div>
              <Label htmlFor="resistanceLevel">主要阻力位 *</Label>
              <Input
                id="resistanceLevel"
                type="number"
                step="0.01"
                value={plan.keyLevels.resistanceLevel}
                onChange={(e) =>
                  setPlan({
                    ...plan,
                    keyLevels: { ...plan.keyLevels, resistanceLevel: e.target.value },
                  })
                }
                placeholder="280.00"
              />
              <p className="text-xs text-gray-500 mt-1">做空不做多，只开多单，不平空单</p>
            </div>
          </div>

          {/* 价格位置可视化 */}
          {plan.keyLevels.currentPrice && plan.keyLevels.supportLevel && plan.keyLevels.resistanceLevel && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 my-4">
              <div className="relative h-64">
                {/* 阻力位 */}
                <div className="absolute top-4 left-0 right-0 flex items-center">
                  <div className="flex-1 border-t-2 border-dashed border-red-500" />
                  <Badge className="bg-red-600 text-white ml-2">
                    阻力位: ${plan.keyLevels.resistanceLevel}
                  </Badge>
                </div>
                
                {/* 当前价格 */}
                <div
                  className="absolute left-0 right-0 flex items-center transition-all"
                  style={{
                    top: `${
                      ((Number(plan.keyLevels.resistanceLevel) - Number(plan.keyLevels.currentPrice)) /
                        (Number(plan.keyLevels.resistanceLevel) - Number(plan.keyLevels.supportLevel))) *
                      (256 - 64) +
                      16
                    }px`,
                  }}
                >
                  <div className="flex-1 border-t-2 border-blue-500" />
                  <Badge className="bg-blue-600 text-white ml-2">
                    当前: ${plan.keyLevels.currentPrice}
                  </Badge>
                </div>
                
                {/* 支撑位 */}
                <div className="absolute bottom-4 left-0 right-0 flex items-center">
                  <div className="flex-1 border-t-2 border-dashed border-green-500" />
                  <Badge className="bg-green-600 text-white ml-2">
                    支撑位: ${plan.keyLevels.supportLevel}
                  </Badge>
                </div>
                
                {/* 趋势线 */}
                <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-yellow-500" />
                <p className="absolute left-12 top-1/2 transform -translate-y-1/2 text-sm text-yellow-600 font-medium">
                  趋势线
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t pt-6 space-y-4">
          <h3 className="font-semibold text-lg">2. 形态识别</h3>
          
          <div>
            <Label>主要观察反转形态</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {[
                { label: "头肩顶底", desc: "强线，1-2倍颈线到极值" },
                { label: "V形顶底", desc: "强线，1倍颈线到极值" },
                { label: "双重顶底", desc: "强线，1-3倍颈线到极值" },
                { label: "三重顶底", desc: "强线，2-3倍颈线到极值" },
              ].map((pattern) => (
                <Card key={pattern.label} className="p-3">
                  <div className="font-medium">{pattern.label}</div>
                  <p className="text-xs text-gray-500 mt-1">{pattern.desc}</p>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <Label>当前价格位置评估 *</Label>
            <Select
              value={plan.keyLevels.positionType}
              onValueChange={(value: any) =>
                setPlan({
                  ...plan,
                  keyLevels: { ...plan.keyLevels, positionType: value },
                })
              }
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="选择当前位置" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">✅ 低位（接近支撑位）- 风险小</SelectItem>
                <SelectItem value="middle">⚡ 中位（支撑阻力之间）- 风险中等</SelectItem>
                <SelectItem value="high">⚠️ 高位（接近阻力位）- 需要窄止损</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 提示信息 */}
        {plan.keyLevels.positionType === "high" && (
          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-yellow-900 dark:text-yellow-100">⚠️ 高位入场提示</h4>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                  当前价格接近阻力位，建议设置更窄的止损，或等待回调后再入场
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ==================== 步骤3: 入场时机 ====================
function Step3EntryTiming({ plan, setPlan }: any) {
  const signals = [
    "后明星、看涨吞没、锤形线、刺透",
    "黄昏星、看跌吞没、流行线、乌云盖顶",
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-6 h-6 text-orange-600" />
          步骤3: 找入场时机
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          等待趋势确认与关键位的有效突破，选择最佳入场点
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>入场类型 *</Label>
          <Select
            value={plan.entryTiming.entryType}
            onValueChange={(value: any) =>
              setPlan({
                ...plan,
                entryTiming: { ...plan.entryTiming, entryType: value },
              })
            }
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="选择入场方式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="breakout">
                <div className="flex flex-col items-start py-1">
                  <span className="font-medium">📊 第一种：金K</span>
                  <span className="text-xs text-gray-500">做多只用看：后明星、看涨吞没、锤形线、刺透</span>
                  <span className="text-xs text-gray-500">做空只用看：黄昏星、看跌吞没、流行线、乌云盖顶</span>
                </div>
              </SelectItem>
              <SelectItem value="pullback">
                <div className="flex flex-col items-start py-1">
                  <span className="font-medium">📈 第二种：量能</span>
                  <span className="text-xs text-gray-500">关键位放大量，突破颈线放大量，量价背离</span>
                </div>
              </SelectItem>
              <SelectItem value="support">
                <div className="flex flex-col items-start py-1">
                  <span className="font-medium">📉 第三种：均线</span>
                  <span className="text-xs text-gray-500">金叉死叉（Vegas隧道、常规）排列</span>
                </div>
              </SelectItem>
              <SelectItem value="pattern">
                <div className="flex flex-col items-start py-1">
                  <span className="font-medium">🔄 第四种：形态</span>
                  <span className="text-xs text-gray-500">突破颈线</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 技术信号确认 */}
        <div className="border-t pt-6 space-y-4">
          <h3 className="font-semibold text-lg">技术信号确认</h3>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="volumeConfirmed"
                checked={plan.entryTiming.volumeConfirmed}
                onCheckedChange={(checked) =>
                  setPlan({
                    ...plan,
                    entryTiming: { ...plan.entryTiming, volumeConfirmed: checked },
                  })
                }
              />
              <Label htmlFor="volumeConfirmed" className="cursor-pointer">
                成交量放大确认（关键位或突破时）
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="macdGoldenCross"
                checked={plan.entryTiming.macdGoldenCross}
                onCheckedChange={(checked) =>
                  setPlan({
                    ...plan,
                    entryTiming: { ...plan.entryTiming, macdGoldenCross: checked },
                  })
                }
              />
              <Label htmlFor="macdGoldenCross" className="cursor-pointer">
                MACD金叉（做多）或死叉（做空）
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="priceAboveMA"
                checked={plan.entryTiming.priceAboveMA}
                onCheckedChange={(checked) =>
                  setPlan({
                    ...plan,
                    entryTiming: { ...plan.entryTiming, priceAboveMA: checked },
                  })
                }
              />
              <Label htmlFor="priceAboveMA" className="cursor-pointer">
                价格站上关键均线（如EMA55、SMA20）
              </Label>
            </div>
          </div>
        </div>

        {/* 入场时机核心提示 */}
        <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-2">🎯 入场时机的核心</h4>
          <p className="text-sm text-orange-800 dark:text-orange-200">
            等待趋势确认与关键位的有效突破。不要急于入场，要等待市场给出明确的信号。
          </p>
        </div>

        {/* 入场类型说明卡片 */}
        {plan.entryTiming.entryType && (
          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-2">
                当前选择的入场方式：
                {plan.entryTiming.entryType === "breakout" && "金K信号"}
                {plan.entryTiming.entryType === "pullback" && "量能信号"}
                {plan.entryTiming.entryType === "support" && "均线信号"}
                {plan.entryTiming.entryType === "pattern" && "形态突破"}
              </h4>
              <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                {plan.entryTiming.entryType === "breakout" && (
                  <>
                    <p>✅ 做多信号：后明星、看涨吞没、锤形线、刺透</p>
                    <p>✅ 做空信号：黄昏星、看跌吞没、流行线、乌云盖顶</p>
                  </>
                )}
                {plan.entryTiming.entryType === "pullback" && (
                  <>
                    <p>✅ 关键位成交量放大</p>
                    <p>✅ 突破颈线时成交量放大</p>
                    <p>✅ 警惕量价背离</p>
                  </>
                )}
                {plan.entryTiming.entryType === "support" && (
                  <>
                    <p>✅ 金叉死叉（Vegas隧道、常规）</p>
                    <p>✅ 均线排列（多头/空头）</p>
                  </>
                )}
                {plan.entryTiming.entryType === "pattern" && (
                  <>
                    <p>✅ 突破颈线确认</p>
                    <p>✅ 等待回踩不破确认有效性</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}

// ==================== 步骤4: 制定交易计划 ====================
function Step4TradingPlan({ plan, setPlan }: any) {
  const [showEntryBuilder, setShowEntryBuilder] = useState(false)
  const [showTpBuilder, setShowTpBuilder] = useState(false)
  const [showSlBuilder, setShowSlBuilder] = useState(false)

  // 计算风险回报比
  const calculateRiskReward = () => {
    const entry = Number.parseFloat(plan.tradingPlan.entry)
    const tp = Number.parseFloat(plan.tradingPlan.tp)
    const sl = Number.parseFloat(plan.tradingPlan.sl)
    
    if (!entry || !tp || !sl || entry === sl) return null
    
    const reward = Math.abs(tp - entry)
    const risk = Math.abs(entry - sl)
    const ratio = reward / risk
    
    return {
      ratio: ratio.toFixed(2),
      reward,
      risk,
      isGood: ratio >= 2,
    }
  }

  const riskReward = calculateRiskReward();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-purple-600" />
          步骤4: 制定交易计划
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          明确入场、止损、止盈及仓位管理，构建清晰交易策略
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 一个完整的交易计划包括 */}
        <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-3">
            📋 一个完整的交易计划包括：
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-white dark:bg-gray-900 rounded p-3 text-center">
              <div className="font-semibold text-purple-600">标的</div>
              <div className="text-xs text-gray-500 mt-1">红杆</div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded p-3 text-center">
              <div className="font-semibold text-blue-600">理由</div>
              <div className="text-xs text-gray-500 mt-1">入场时机</div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded p-3 text-center">
              <div className="font-semibold text-green-600">仓位</div>
              <div className="text-xs text-gray-500 mt-1">止盈</div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded p-3 text-center">
              <div className="font-semibold text-orange-600">方向</div>
              <div className="text-xs text-gray-500 mt-1">止损</div>
            </div>
          </div>
          <div className="mt-3 text-center bg-white dark:bg-gray-900 rounded p-2">
            <span className="text-sm text-gray-600">后手</span>
          </div>
        </div>

        {/* 交易参数 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="entry">入场价格 *</Label>
            <Input
              id="entry"
              type="number"
              step="0.01"
              value={plan.tradingPlan.entry}
              onChange={(e) =>
                setPlan({
                  ...plan,
                  tradingPlan: { ...plan.tradingPlan, entry: e.target.value },
                })
              }
              placeholder="245.00"
            />
          </div>

          <div>
            <Label htmlFor="tp">目标价格（止盈）*</Label>
            <Input
              id="tp"
              type="number"
              step="0.01"
              value={plan.tradingPlan.tp}
              onChange={(e) =>
                setPlan({
                  ...plan,
                  tradingPlan: { ...plan.tradingPlan, tp: e.target.value },
                })
              }
              placeholder="280.00"
            />
          </div>

          <div>
            <Label htmlFor="sl">止损价格 *</Label>
            <Input
              id="sl"
              type="number"
              step="0.01"
              value={plan.tradingPlan.sl}
              onChange={(e) =>
                setPlan({
                  ...plan,
                  tradingPlan: { ...plan.tradingPlan, sl: e.target.value },
                })
              }
              placeholder="230.00"
            />
          </div>
        </div>

        {/* 风险回报比显示 */}
        {riskReward && (
          <Card className={riskReward.isGood ? "bg-green-50 dark:bg-green-950" : "bg-yellow-50 dark:bg-yellow-950"}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">风险回报比</p>
                  <p className="text-3xl font-bold">
                    1:{riskReward.ratio}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-green-600 dark:text-green-400">
                    潜在收益: ${riskReward.reward.toFixed(2)}
                  </p>
                  <p className="text-red-600 dark:text-red-400">
                    潜在风险: ${riskReward.risk.toFixed(2)}
                  </p>
                </div>
                <div>
                  {riskReward.isGood ? (
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-12 h-12 text-yellow-600" />
                  )}
                </div>
              </div>
              {!riskReward.isGood && (
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-2">
                  ⚠️ 建议风险回报比至少为 1:2
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* 仓位和策略 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="positionSize">仓位大小（股数或金额）*</Label>
            <Input
              id="positionSize"
              type="number"
              value={plan.tradingPlan.positionSize}
              onChange={(e) =>
                setPlan({
                  ...plan,
                  tradingPlan: { ...plan.tradingPlan, positionSize: e.target.value },
                })
              }
              placeholder="1000"
            />
          </div>

          <div>
            <Label htmlFor="strategy">策略类型</Label>
            <Select
              value={plan.tradingPlan.strategy}
              onValueChange={(value) =>
                setPlan({
                  ...plan,
                  tradingPlan: { ...plan.tradingPlan, strategy: value },
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="选择策略类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="趋势突破">趋势突破</SelectItem>
                <SelectItem value="均线策略">均线策略</SelectItem>
                <SelectItem value="支撑阻力">支撑阻力</SelectItem>
                <SelectItem value="形态突破">形态突破</SelectItem>
                <SelectItem value="其他">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 技术指标条件（可选） */}
        <div className="border-t pt-6 space-y-4">
          <h3 className="font-semibold text-lg">技术指标条件（可选）</h3>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="entryCondition">入场触发条件</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowEntryBuilder(!showEntryBuilder)}
              >
                快速选择
              </Button>
            </div>
            <Input
              id="entryCondition"
              value={plan.tradingPlan.entryCondition}
              onChange={(e) =>
                setPlan({
                  ...plan,
                  tradingPlan: { ...plan.tradingPlan, entryCondition: e.target.value },
                })
              }
              placeholder="如：price 突破 EMA(55)"
            />
            {showEntryBuilder && (
              <Card className="mt-2 p-3">
                <Select
                  onValueChange={(value) => {
                    setPlan({
                      ...plan,
                      tradingPlan: { ...plan.tradingPlan, entryCondition: value },
                    })
                    setShowEntryBuilder(false)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择入场技术条件" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price 突破 EMA(55)">突破EMA55均线</SelectItem>
                    <SelectItem value="price 回踩 EMA(20) 且 RSI(14) &lt; 50">回踩EMA20且RSI&lt;50</SelectItem>
                    <SelectItem value="MACD金叉 且 成交量 &gt; 昨日1.5倍">MACD金叉且放量</SelectItem>
                    <SelectItem value="price &gt; SMA(20) 且 KDJ金叉">站上SMA20且KDJ金叉</SelectItem>
                  </SelectContent>
                </Select>
              </Card>
            )}
          </div>
        </div>

        {/* 交易理由 */}
        <div>
          <Label htmlFor="reason">交易理由（详细描述）</Label>
          <Textarea
            id="reason"
            value={plan.tradingPlan.reason}
            onChange={(e) =>
              setPlan({
                ...plan,
                tradingPlan: { ...plan.tradingPlan, reason: e.target.value },
              })
            }
            placeholder="详细描述交易理由、技术分析、基本面分析等..."
            rows={4}
          />
        </div>

        {/* 严格执行的核心 */}
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">⚠️ 严格执行的核心</h4>
          <div className="text-sm text-red-800 dark:text-red-200 space-y-2">
            <p><strong>第一种：正向发展（浮盈）</strong></p>
            <p className="ml-4">
              可以考虑：移动止损？分批止盈？<br />
              滚动加仓？统一止盈？
            </p>
            
            <p className="mt-3"><strong>第二种：反向发展（浮亏）</strong></p>
            <p className="ml-4 text-red-600 dark:text-red-400 font-semibold">
              带着止损，考虑补仓（<span className="underline">不建议这种操作</span>）<br />
              也可以用坐波那梯重置一下撤有超过61%
            </p>
            
            <p className="mt-3"><strong>第三种：行情停滞</strong></p>
            <p className="ml-4">
              浮盈：可以考虑先拿或者减合为主<br />
              浮亏：可以考虑先拿或者减合为多头
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ==================== 步骤5: 交易前检查清单 ====================
function Step5PreTradeChecklist({ plan, setPlan }: any) {
  const criticalChecks = [
    { key: "isFamiliarPattern", label: "这是我熟悉的交易模式吗？", required: true },
    { key: "meetsSelectionCriteria", label: "符合我的选股标准吗？", required: true },
    { key: "canExplainLogic", label: "我能清楚解释这笔交易的逻辑吗？", required: false },
  ]

  const positionChecks = [
    { key: "isKeyLevelEntry", label: "是在关键位置埋伏，而不是追涨吗？", required: true },
    { key: "knowsPosition", label: "我清楚自己是在相对低位还是高位吗？", required: false },
    { key: "hasStopLoss", label: "如果是高位，我设置了窄止损了吗？", required: false },
  ]

  const emotionChecks = [
    { key: "isCalm", label: "我现在是冷静的，不是被情绪驱动的吗？", required: true },
  ]

  const failedCriticalCount = criticalChecks.filter(
    (check) => check.required && !plan.preTradeChecklist[check.key]
  ).length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-red-600" />
          步骤5: 交易前强制检查清单
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          严格遵循交易纪律，保持冷静，避免情绪干扰
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 市场状况 */}
        <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <BarChart3 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-3">📊 当前市场状况</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">VIX指数:</span>
                  <span className="ml-2 font-semibold">15.21</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">UVXY偏离度:</span>
                  <span className="ml-2 font-semibold">+32.3%</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">近期胜率:</span>
                  <span className="ml-2 font-semibold">53.5%</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">连续失败:</span>
                  <span className="ml-2 font-semibold text-red-600">3次 ⚠️ 需警惕</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 机会判断 */}
        <div className="border-t pt-4">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" />
            机会判断
          </h3>
          <div className="space-y-3">
            {criticalChecks.map((check) => (
              <div
                key={check.key}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                <Checkbox
                  id={check.key}
                  checked={plan.preTradeChecklist[check.key]}
                  onCheckedChange={(checked) =>
                    setPlan({
                      ...plan,
                      preTradeChecklist: {
                        ...plan.preTradeChecklist,
                        [check.key]: checked,
                      },
                    })
                  }
                  className="mt-0.5"
                />
                <Label htmlFor={check.key} className="cursor-pointer flex-1">
                  {check.label}
                  {check.required && <Badge className="ml-2 bg-red-600">必答</Badge>}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* 位置判断 */}
        <div className="border-t pt-4">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            位置判断
          </h3>
          <div className="space-y-3">
            {positionChecks.map((check) => (
              <div
                key={check.key}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                <Checkbox
                  id={check.key}
                  checked={plan.preTradeChecklist[check.key]}
                  onCheckedChange={(checked) =>
                    setPlan({
                      ...plan,
                      preTradeChecklist: {
                        ...plan.preTradeChecklist,
                        [check.key]: checked,
                      },
                    })
                  }
                  className="mt-0.5"
                />
                <Label htmlFor={check.key} className="cursor-pointer flex-1">
                  {check.label}
                  {check.required && <Badge className="ml-2 bg-red-600">必答</Badge>}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* 情绪检查 */}
        <div className="border-t pt-4">
          <h3 className="font-semibold text-lg mb-4">🧠 情绪检查</h3>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900">
              <Checkbox
                id="isCalm"
                checked={plan.preTradeChecklist.isCalm}
                onCheckedChange={(checked) =>
                  setPlan({
                    ...plan,
                    preTradeChecklist: {
                      ...plan.preTradeChecklist,
                      isCalm: checked,
                    },
                  })
                }
                className="mt-0.5"
              />
              <Label htmlFor="isCalm" className="cursor-pointer flex-1">
                我现在是冷静的，不是被情绪驱动的吗？
                <Badge className="ml-2 bg-red-600">必答</Badge>
              </Label>
            </div>

            <div>
              <Label>情绪自评 (1-10分)</Label>
              <div className="flex items-center gap-4 mt-2">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={plan.preTradeChecklist.emotionScore}
                  onChange={(e) =>
                    setPlan({
                      ...plan,
                      preTradeChecklist: {
                        ...plan.preTradeChecklist,
                        emotionScore: Number(e.target.value),
                      },
                    })
                  }
                  className="flex-1"
                />
                <Badge
                  variant="outline"
                  className={`text-lg w-16 justify-center ${
                    plan.preTradeChecklist.emotionScore <= 3
                      ? "bg-green-100 text-green-800"
                      : plan.preTradeChecklist.emotionScore <= 7
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {plan.preTradeChecklist.emotionScore}
                </Badge>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>冷静 ✅</span>
                <span>正常 ⚡</span>
                <span>冲动 🚨</span>
              </div>
              
              {plan.preTradeChecklist.emotionScore > 7 && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    🚨 情绪评分过高，建议冷静10分钟后再交易
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 警告提示 */}
        {failedCriticalCount > 0 && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-900 dark:text-red-100">
                  ⚠️ 还有 {failedCriticalCount} 项关键检查未通过
                </h4>
                <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                  建议重新审视交易计划，确保符合所有关键条件后再执行交易
                </p>
              </div>
            </div>
          </div>
        )}

        {failedCriticalCount === 0 && plan.preTradeChecklist.emotionScore <= 7 && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900 dark:text-green-100">
                  ✅ 所有关键检查项已通过！
                </h4>
                <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                  可以进入下一步，复盘确认后即可保存交易计划
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ==================== 步骤6: 复盘总结 ====================
function Step6ReviewAndSave({ plan }: any) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-cyan-600" />
            步骤6: 复盘总结
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            最后确认，确保交易计划完整无误
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 交易体系的本质 */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
            <h3 className="text-2xl font-bold mb-4">交易体系的本质</h3>
            <p className="text-lg mb-2">知行合一的纪律体系</p>
            <p className="text-gray-600 dark:text-gray-400">
              把交易行为转化为规则化、习惯化的过程
            </p>
            
            <div className="mt-6 p-4 bg-white dark:bg-gray-900 rounded-lg">
              <h4 className="font-semibold text-green-600 mb-2">最终目标</h4>
              <p className="text-sm">
                不追求完美时机，而求持续累积，有迹可循的稳定盈利
              </p>
            </div>
          </div>

          {/* 复盘流程 */}
          <div>
            <h3 className="font-semibold text-lg mb-4">复盘流程</h3>
            <div className="grid grid-cols-4 gap-3">
              {[
                { name: "优化体系", color: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300" },
                { name: "总结经验", color: "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300" },
                { name: "分析得失", color: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300" },
                { name: "记录交易", color: "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300" },
              ].map((step, index) => (
                <div key={index} className={`${step.color} rounded-lg p-4 text-center font-medium flex items-center justify-center`}>
                  {step.name}
                </div>
              ))}
            </div>
          </div>

          {/* 成功交易的关键 */}
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-950 dark:to-pink-950 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-3 text-center">成功交易的关键</h3>
            <p className="text-center text-xl font-medium">
              持续学习 + 严格执行 + 不断复盘 = 稳定盈利
            </p>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
              交易是一场马拉松，而不是短跑
            </p>
          </div>

          {/* 交易计划总览 */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-4">📋 交易计划总览</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 技术分析 */}
              <Card className="bg-green-50 dark:bg-green-950">
                <CardHeader>
                  <CardTitle className="text-green-800 dark:text-green-200">技术分析</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p><strong>趋势判断:</strong> {plan.trendAnalysis.marketTrend === "uptrend" ? "上升" : plan.trendAnalysis.marketTrend === "downtrend" ? "下降" : "横盘"}</p>
                  <p><strong>交易周期:</strong> {plan.trendAnalysis.timeframe === "short" ? "短线" : plan.trendAnalysis.timeframe === "medium" ? "中线" : "长线"}</p>
                  <p><strong>趋势强度:</strong> {plan.trendAnalysis.trendStrength}/10</p>
                  <p><strong>趋势确认:</strong> {plan.trendAnalysis.trendConfirmed ? "✅" : "❌"}</p>
                </CardContent>
              </Card>

              {/* 仓位管理 */}
              <Card className="bg-blue-50 dark:bg-blue-950">
                <CardHeader>
                  <CardTitle className="text-blue-800 dark:text-blue-200">仓位管理</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p><strong>当前价格:</strong> ${plan.keyLevels.currentPrice}</p>
                  <p><strong>支撑位:</strong> ${plan.keyLevels.supportLevel}</p>
                  <p><strong>阻力位:</strong> ${plan.keyLevels.resistanceLevel}</p>
                  <p><strong>位置评估:</strong> {plan.keyLevels.positionType === "low" ? "低位" : plan.keyLevels.positionType === "middle" ? "中位" : "高位"}</p>
                </CardContent>
              </Card>

              {/* 心态管理 */}
              <Card className="bg-purple-50 dark:bg-purple-950">
                <CardHeader>
                  <CardTitle className="text-purple-800 dark:text-purple-200">心态管理</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p><strong>是否严格执行计划:</strong> {plan.preTradeChecklist.isFamiliarPattern ? "✅" : "⚠️"}</p>
                  <p><strong>情绪控制是否良好:</strong> {plan.preTradeChecklist.isCalm && plan.preTradeChecklist.emotionScore <= 7 ? "✅" : "⚠️"}</p>
                  <p><strong>是否有冲动交易:</strong> {plan.preTradeChecklist.emotionScore > 7 ? "⚠️ 是" : "✅ 否"}</p>
                  <p><strong>纪律性是否保持:</strong> {plan.preTradeChecklist.canExplainLogic ? "✅" : "⚠️"}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 交易参数总览 */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-4">交易参数</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded">
                <p className="text-gray-600 dark:text-gray-400">股票代码</p>
                <p className="text-xl font-bold mt-1">{plan.ticker || "-"}</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded">
                <p className="text-gray-600 dark:text-gray-400">入场价格</p>
                <p className="text-xl font-bold mt-1">${plan.tradingPlan.entry || "-"}</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded">
                <p className="text-gray-600 dark:text-gray-400">止盈价格</p>
                <p className="text-xl font-bold mt-1">${plan.tradingPlan.tp || "-"}</p>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-950 rounded">
                <p className="text-gray-600 dark:text-gray-400">止损价格</p>
                <p className="text-xl font-bold mt-1">${plan.tradingPlan.sl || "-"}</p>
              </div>
            </div>
          </div>

          {/* 确认提示 */}
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900 dark:text-green-100">
                  准备完成
                </h4>
                <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                  请确认以上信息无误后，点击"保存交易计划"按钮完成创建
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

