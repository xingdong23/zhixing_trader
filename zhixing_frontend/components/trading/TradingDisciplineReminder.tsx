"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle, Shield, Brain, X, Target, BookOpen, TrendingUp, AlertCircle, Quote, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WisdomManager, WISDOM_CATEGORIES, type WisdomCategory } from "@/types/tradingWisdom"

// 图标映射
const ICON_MAP: Record<string, any> = {
  Shield,
  Brain,
  Target,
  AlertTriangle,
  Quote,
  BookOpen,
  TrendingUp,
  AlertCircle,
  Star
}

// 颜色映射（根据分类）
const COLOR_MAP: Record<WisdomCategory, { color: string; bgColor: string }> = {
  discipline: {
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
  },
  psychology: {
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800"
  },
  strategy: {
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
  },
  risk: {
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800"
  },
  quote: {
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
  },
  book: {
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800"
  },
  experience: {
    color: "text-cyan-600",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-800"
  },
  lesson: {
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
  },
  custom: {
    color: "text-gray-600",
    bgColor: "bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800"
  }
}

interface DisciplineRule {
  id: string
  text: string
  icon: any
  color: string
  bgColor: string
  source?: string
  author?: string
}

interface TradingDisciplineReminderProps {
  variant?: "banner" | "card" | "compact"
  dismissible?: boolean
  autoRotate?: boolean
  rotateInterval?: number // 秒
}

export default function TradingDisciplineReminder({
  variant = "banner",
  dismissible = false,
  autoRotate = true,
  rotateInterval = 10
}: TradingDisciplineReminderProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDismissed, setIsDismissed] = useState(false)
  const [disciplineRules, setDisciplineRules] = useState<DisciplineRule[]>([])

  // 从智慧库加载激活的智慧
  useEffect(() => {
    const loadWisdoms = () => {
      const activeWisdoms = WisdomManager.getActive()
      
      // 转换为 DisciplineRule 格式
      const rules: DisciplineRule[] = activeWisdoms.map(wisdom => {
        const category = WISDOM_CATEGORIES[wisdom.category]
        const colors = COLOR_MAP[wisdom.category]
        const iconName = category.defaultIcon
        const icon = ICON_MAP[iconName] || Shield
        
        return {
          id: wisdom.id,
          text: wisdom.content,
          icon,
          color: colors.color,
          bgColor: colors.bgColor,
          source: wisdom.source,
          author: wisdom.author
        }
      })
      
      setDisciplineRules(rules)
    }
    
    loadWisdoms()
    
    // 监听 storage 事件，当智慧库更新时重新加载
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "trading_wisdom_library") {
        loadWisdoms()
      }
    }
    
    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  // 记录显示
  useEffect(() => {
    if (disciplineRules.length > 0 && disciplineRules[currentIndex]) {
      WisdomManager.recordDisplay(disciplineRules[currentIndex].id)
    }
  }, [currentIndex, disciplineRules])

  const currentRule = disciplineRules[currentIndex]

  // 自动轮播
  useEffect(() => {
    if (!autoRotate || isDismissed || disciplineRules.length === 0) return

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % disciplineRules.length)
    }, rotateInterval * 1000)

    return () => clearInterval(timer)
  }, [autoRotate, rotateInterval, isDismissed, disciplineRules.length])

  if (isDismissed || disciplineRules.length === 0) return null
  if (!currentRule) return null

  // Banner 样式 - 顶部横幅
  if (variant === "banner") {
    const Icon = currentRule.icon
    return (
      <div className={`relative border-b-2 ${currentRule.bgColor} px-6 py-4 transition-all duration-500`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Icon className={`w-6 h-6 ${currentRule.color} flex-shrink-0`} />
            <p className={`text-base font-semibold ${currentRule.color}`}>
              ⚠️ 交易纪律提醒：{currentRule.text}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {disciplineRules.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentIndex
                      ? `${currentRule.color.replace('text-', 'bg-')} w-6`
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  aria-label={`切换到第 ${idx + 1} 条`}
                />
              ))}
            </div>
            {dismissible && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDismissed(true)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Card 样式 - 卡片形式
  if (variant === "card") {
    const Icon = currentRule.icon
    return (
      <Card className={`${currentRule.bgColor} border-2 transition-all duration-500`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Icon className={`w-8 h-8 ${currentRule.color} flex-shrink-0 mt-1`} />
            <div className="flex-1">
              <h3 className={`text-lg font-bold ${currentRule.color} mb-2`}>
                交易纪律提醒
              </h3>
              <p className={`text-base font-medium ${currentRule.color}`}>
                {currentRule.text}
              </p>
            </div>
            {dismissible && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDismissed(true)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="flex gap-1 mt-4">
            {disciplineRules.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1 rounded-full transition-all ${
                  idx === currentIndex
                    ? `${currentRule.color.replace('text-', 'bg-')} flex-1`
                    : 'bg-gray-300 dark:bg-gray-600 w-8'
                }`}
                aria-label={`切换到第 ${idx + 1} 条`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Compact 样式 - 紧凑形式
  const Icon = currentRule.icon
  return (
    <div className={`relative border ${currentRule.bgColor} rounded-lg px-4 py-3 transition-all duration-500`}>
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${currentRule.color} flex-shrink-0`} />
        <p className={`text-sm font-medium ${currentRule.color} flex-1`}>
          {currentRule.text}
        </p>
        {dismissible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDismissed(true)}
            className="h-6 w-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  )
}
