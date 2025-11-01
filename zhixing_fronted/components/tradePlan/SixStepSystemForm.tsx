"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target, Clock, CheckCircle, BarChart3, Eye } from "lucide-react";
import { SixStepTradingSystem } from "@/lib/tradePlan";

interface SixStepSystemFormProps {
  value: SixStepTradingSystem;
  onChange: (system: SixStepTradingSystem) => void;
  currentPrice: number;
}

export default function SixStepSystemForm({ value, onChange, currentPrice }: SixStepSystemFormProps) {
  const [currentStep, setCurrentStep] = useState(1);

  const updateStep = (step: keyof SixStepTradingSystem, data: any) => {
    onChange({ ...value, [step]: { ...value[step], ...data } });
  };

  const steps = [
    { num: 1, title: "分辨趋势", icon: TrendingUp, color: "text-green-600" },
    { num: 2, title: "找关键位", icon: Target, color: "text-blue-600" },
    { num: 3, title: "入场时机", icon: Clock, color: "text-orange-600" },
    { num: 4, title: "制定计划", icon: BarChart3, color: "text-purple-600" },
    { num: 5, title: "严格执行", icon: CheckCircle, color: "text-red-600" },
    { num: 6, title: "复盘总结", icon: Eye, color: "text-cyan-600" },
  ];

  return (
    <div className="space-y-6">
      {/* 步骤导航 - 优化版 */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-2">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.num;
              const isCompleted = currentStep > step.num;
              return (
                <div key={step.num} className="flex items-center flex-1">
                  <button
                    onClick={() => setCurrentStep(step.num)}
                    className={`relative w-full group transition-all duration-300 ${
                      isActive ? 'scale-105' : 'hover:scale-102'
                    }`}
                  >
                    <div className={`flex flex-col items-center p-3 rounded-xl transition-all ${
                      isActive 
                        ? 'bg-white dark:bg-gray-800 shadow-lg ring-2 ring-blue-500' 
                        : isCompleted
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : 'bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800'
                    }`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all ${
                        isActive 
                          ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-lg' 
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                      </div>
                      <div className={`text-xs font-medium text-center ${
                        isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        <div className="hidden sm:block">{step.title}</div>
                        <div className="sm:hidden">步骤{step.num}</div>
                      </div>
                    </div>
                  </button>
                  {index < steps.length - 1 && (
                    <div className={`h-0.5 w-4 mx-1 transition-all ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 第一步：分辨趋势 */}
      {currentStep === 1 && (
        <Card className="border-2 border-green-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-normal opacity-90">STEP 1</div>
                <div className="text-2xl font-bold">分辨趋势</div>
              </div>
            </div>
            <p className="text-green-50 text-sm ml-15">准确判断市场趋势方向，顺势而为以提高交易成功率</p>
          </div>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>趋势方向 *</Label>
                <Select
                  value={value.step1_trend.direction}
                  onValueChange={(v: any) => updateStep("step1_trend", { direction: v })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="选择趋势方向" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uptrend">上升趋势</SelectItem>
                    <SelectItem value="downtrend">下降趋势</SelectItem>
                    <SelectItem value="sideways">横盘震荡</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>参考周期 *</Label>
                <Select
                  value={value.step1_trend.timeframe}
                  onValueChange={(v: any) => updateStep("step1_trend", { timeframe: v })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="选择周期" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">短期（日线）</SelectItem>
                    <SelectItem value="medium">中期（周线）</SelectItem>
                    <SelectItem value="long">长期（月线）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>使用的指标 *</Label>
              <Input
                placeholder="例如：K线形态、均线、趋势线、MACD等"
                value={value.step1_trend.indicators}
                onChange={(e) => updateStep("step1_trend", { indicators: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>趋势分析描述 *</Label>
              <Textarea
                placeholder="详细描述趋势判断的依据..."
                value={value.step1_trend.analysis}
                onChange={(e) => updateStep("step1_trend", { analysis: e.target.value })}
                rows={4}
                className="mt-1.5"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 第二步：找关键位 */}
      {currentStep === 2 && (
        <Card className="border-2 border-blue-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Target className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-normal opacity-90">STEP 2</div>
                <div className="text-2xl font-bold">找关键位</div>
              </div>
            </div>
            <p className="text-blue-50 text-sm ml-15">识别支撑、阻力等关键价格区域，为交易提供可靠依据</p>
          </div>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>支撑位 *</Label>
                <Input
                  placeholder="例如：$245, $240"
                  value={value.step2_keyLevels.supportLevels}
                  onChange={(e) => updateStep("step2_keyLevels", { supportLevels: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>阻力位 *</Label>
                <Input
                  placeholder="例如：$280, $295"
                  value={value.step2_keyLevels.resistanceLevels}
                  onChange={(e) => updateStep("step2_keyLevels", { resistanceLevels: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div>
              <Label>关键形态</Label>
              <Input
                placeholder="例如：头肩顶、双底、三重顶等"
                value={value.step2_keyLevels.keyPatterns}
                onChange={(e) => updateStep("step2_keyLevels", { keyPatterns: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>关键位分析 *</Label>
              <Textarea
                placeholder="详细分析支撑阻力位的有效性..."
                value={value.step2_keyLevels.analysis}
                onChange={(e) => updateStep("step2_keyLevels", { analysis: e.target.value })}
                rows={4}
                className="mt-1.5"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 第三步：入场时机 */}
      {currentStep === 3 && (
        <Card className="border-2 border-orange-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-normal opacity-90">STEP 3</div>
                <div className="text-2xl font-bold">入场时机</div>
              </div>
            </div>
            <p className="text-orange-50 text-sm ml-15">等待趋势确认与关键位的有效突破，选择最佳入场点</p>
          </div>
          <CardContent className="space-y-4 pt-6">
            <div>
              <Label>入场类型 *</Label>
              <Select
                value={value.step3_entryTiming.entryType}
                onValueChange={(v: any) => updateStep("step3_entryTiming", { entryType: v })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="选择入场类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakout">突破入场（金K）</SelectItem>
                  <SelectItem value="pullback">回调入场（均线）</SelectItem>
                  <SelectItem value="pattern">形态入场</SelectItem>
                  <SelectItem value="volume">量能入场</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>入场信号（可多选）</Label>
              <div className="mt-2 space-y-2">
                {["后跌古法", "看涨古法", "穿形线", "突破强线", "放量突破", "MACD金叉"].map((signal) => (
                  <div key={signal} className="flex items-center space-x-2">
                    <Checkbox
                      checked={value.step3_entryTiming.entrySignals.includes(signal)}
                      onCheckedChange={(checked) => {
                        const signals = checked
                          ? [...value.step3_entryTiming.entrySignals, signal]
                          : value.step3_entryTiming.entrySignals.filter((s) => s !== signal);
                        updateStep("step3_entryTiming", { entrySignals: signals });
                      }}
                    />
                    <Label className="font-normal">{signal}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={value.step3_entryTiming.waitForConfirmation}
                onCheckedChange={(checked) =>
                  updateStep("step3_entryTiming", { waitForConfirmation: checked })
                }
              />
              <Label>等待趋势确认与关键位有效突破</Label>
            </div>
            <div>
              <Label>具体入场条件 *</Label>
              <Textarea
                placeholder="详细描述入场的具体条件..."
                value={value.step3_entryTiming.entryConditions}
                onChange={(e) => updateStep("step3_entryTiming", { entryConditions: e.target.value })}
                rows={4}
                className="mt-1.5"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 第四步：制定交易计划 */}
      {currentStep === 4 && (
        <Card className="border-2 border-purple-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-normal opacity-90">STEP 4</div>
                <div className="text-2xl font-bold">制定交易计划</div>
              </div>
            </div>
            <p className="text-purple-50 text-sm ml-15">明确入场、止损、止盈及仓位管理，构建清晰交易策略</p>
          </div>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>入场价 *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={value.step4_tradePlan.entryPrice || currentPrice}
                  onChange={(e) =>
                    updateStep("step4_tradePlan", { entryPrice: parseFloat(e.target.value) || 0 })
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>止损价 *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={value.step4_tradePlan.stopLoss}
                  onChange={(e) =>
                    updateStep("step4_tradePlan", { stopLoss: parseFloat(e.target.value) || 0 })
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>止盈价 *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={value.step4_tradePlan.takeProfit}
                  onChange={(e) =>
                    updateStep("step4_tradePlan", { takeProfit: parseFloat(e.target.value) || 0 })
                  }
                  className="mt-1.5"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>仓位（%）*</Label>
                <Input
                  type="number"
                  value={value.step4_tradePlan.positionSize}
                  onChange={(e) =>
                    updateStep("step4_tradePlan", { positionSize: parseFloat(e.target.value) || 0 })
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>方向 *</Label>
                <Select
                  value={value.step4_tradePlan.direction}
                  onValueChange={(v: any) => updateStep("step4_tradePlan", { direction: v })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="long">做多</SelectItem>
                    <SelectItem value="short">做空</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>入场理由 *</Label>
              <Textarea
                placeholder="详细说明为什么在这个价位入场..."
                value={value.step4_tradePlan.entryReason}
                onChange={(e) => updateStep("step4_tradePlan", { entryReason: e.target.value })}
                rows={4}
                className="mt-1.5"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 第五步：严格执行 */}
      {currentStep === 5 && (
        <Card className="border-2 border-red-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-rose-500 text-white p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-normal opacity-90">STEP 5</div>
                <div className="text-2xl font-bold">严格执行</div>
              </div>
            </div>
            <p className="text-red-50 text-sm ml-15">严格遵循交易计划，保持纪律性，避免情绪干扰</p>
          </div>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-3">
              <Label>纪律检查清单</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={value.step5_execution.disciplineChecklist.followPlan}
                    onCheckedChange={(checked) =>
                      updateStep("step5_execution", {
                        disciplineChecklist: {
                          ...value.step5_execution.disciplineChecklist,
                          followPlan: checked,
                        },
                      })
                    }
                  />
                  <Label className="font-normal">是否严格按计划执行</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={value.step5_execution.disciplineChecklist.emotionControl}
                    onCheckedChange={(checked) =>
                      updateStep("step5_execution", {
                        disciplineChecklist: {
                          ...value.step5_execution.disciplineChecklist,
                          emotionControl: checked,
                        },
                      })
                    }
                  />
                  <Label className="font-normal">情绪控制是否良好</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={value.step5_execution.disciplineChecklist.noImpulsive}
                    onCheckedChange={(checked) =>
                      updateStep("step5_execution", {
                        disciplineChecklist: {
                          ...value.step5_execution.disciplineChecklist,
                          noImpulsive: checked,
                        },
                      })
                    }
                  />
                  <Label className="font-normal">没有冲动交易</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={value.step5_execution.disciplineChecklist.recordKept}
                    onCheckedChange={(checked) =>
                      updateStep("step5_execution", {
                        disciplineChecklist: {
                          ...value.step5_execution.disciplineChecklist,
                          recordKept: checked,
                        },
                      })
                    }
                  />
                  <Label className="font-normal">是否记录完整</Label>
                </div>
              </div>
            </div>
            <div>
              <Label>执行备注</Label>
              <Textarea
                placeholder="记录执行过程中的想法、情绪变化等..."
                value={value.step5_execution.executionNotes}
                onChange={(e) => updateStep("step5_execution", { executionNotes: e.target.value })}
                rows={4}
                className="mt-1.5"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 第六步：复盘总结 */}
      {currentStep === 6 && (
        <Card className="border-2 border-cyan-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Eye className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-normal opacity-90">STEP 6</div>
                <div className="text-2xl font-bold">复盘总结</div>
              </div>
            </div>
            <p className="text-cyan-50 text-sm ml-15">分析交易结果，总结经验教训，持续优化交易体系</p>
          </div>
          <CardContent className="space-y-4 pt-6">
            <div>
              <Label className="font-semibold">技术分析复盘</Label>
              <div className="mt-2 space-y-2">
                {[
                  { key: "trendCorrect", label: "趋势判断是否准确" },
                  { key: "keyLevelsCorrect", label: "关键位识别是否正确" },
                  { key: "entryTimingGood", label: "入场时机是否合适" },
                  { key: "analysisEffective", label: "形态分析是否有效" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center space-x-2">
                    <Checkbox
                      checked={value.step6_review.technicalAnalysis[item.key as keyof typeof value.step6_review.technicalAnalysis]}
                      onCheckedChange={(checked) =>
                        updateStep("step6_review", {
                          technicalAnalysis: {
                            ...value.step6_review.technicalAnalysis,
                            [item.key]: checked,
                          },
                        })
                      }
                    />
                    <Label className="font-normal">{item.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="font-semibold">仓位管理复盘</Label>
              <div className="mt-2 space-y-2">
                {[
                  { key: "positionSizeReasonable", label: "仓位大小是否合理" },
                  { key: "stopLossAppropriate", label: "止损设置是否恰当" },
                  { key: "takeProfitReasonable", label: "止盈策略是否有效" },
                  { key: "riskControlGood", label: "风险控制是否合理" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center space-x-2">
                    <Checkbox
                      checked={value.step6_review.positionManagement[item.key as keyof typeof value.step6_review.positionManagement]}
                      onCheckedChange={(checked) =>
                        updateStep("step6_review", {
                          positionManagement: {
                            ...value.step6_review.positionManagement,
                            [item.key]: checked,
                          },
                        })
                      }
                    />
                    <Label className="font-normal">{item.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="font-semibold">情绪管理复盘</Label>
              <div className="mt-2 space-y-2">
                {[
                  { key: "followedPlan", label: "是否严格执行计划" },
                  { key: "emotionStable", label: "情绪控制是否良好" },
                  { key: "impulsiveTrading", label: "是否有冲动交易" },
                  { key: "disciplineGood", label: "纪律性是否合格" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center space-x-2">
                    <Checkbox
                      checked={value.step6_review.emotionManagement[item.key as keyof typeof value.step6_review.emotionManagement]}
                      onCheckedChange={(checked) =>
                        updateStep("step6_review", {
                          emotionManagement: {
                            ...value.step6_review.emotionManagement,
                            [item.key]: checked,
                          },
                        })
                      }
                    />
                    <Label className="font-normal">{item.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>经验教训</Label>
              <Textarea
                placeholder="总结本次交易的经验教训..."
                value={value.step6_review.lessonsLearned}
                onChange={(e) => updateStep("step6_review", { lessonsLearned: e.target.value })}
                rows={3}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>改进建议</Label>
              <Textarea
                placeholder="对交易体系的改进建议..."
                value={value.step6_review.improvements}
                onChange={(e) => updateStep("step6_review", { improvements: e.target.value })}
                rows={3}
                className="mt-1.5"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 导航按钮 - 优化版 */}
      <Card className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-2">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="px-6 h-11 font-medium disabled:opacity-50"
            >
              ← 上一步
            </Button>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-4 py-2 text-base font-semibold bg-white dark:bg-gray-800">
                步骤 {currentStep} / 6
              </Badge>
              <div className="text-xs text-gray-500">
                {Math.round((currentStep / 6) * 100)}% 完成
              </div>
            </div>
            
            <Button
              onClick={() => setCurrentStep(Math.min(6, currentStep + 1))}
              disabled={currentStep === 6}
              className="px-6 h-11 font-medium bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50"
            >
              {currentStep === 6 ? '完成 ✓' : '下一步 →'}
            </Button>
          </div>
          
          {/* 进度条 */}
          <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / 6) * 100}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
