"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  DollarSign,
  Minus
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { JudgmentType } from "./TimelineNotes"

interface AddTimelineNoteDialogProps {
  open: boolean
  onClose: () => void
  onSave: (note: {
    author: string
    content: string
    judgmentType: JudgmentType
    priceTarget?: number
    currentPrice?: number
  }) => void
  currentPrice?: number
}

const judgmentOptions: Array<{
  type: JudgmentType
  label: string
  icon: React.ReactNode
  color: string
  description: string
}> = [
  {
    type: "bullish",
    label: "看涨",
    icon: <TrendingUp className="w-5 h-5" />,
    color: "text-green-600 bg-green-50 hover:bg-green-100 border-green-200",
    description: "预期价格上涨"
  },
  {
    type: "bearish",
    label: "看跌",
    icon: <TrendingDown className="w-5 h-5" />,
    color: "text-red-600 bg-red-50 hover:bg-red-100 border-red-200",
    description: "预期价格下跌"
  },
  {
    type: "neutral",
    label: "中性",
    icon: <Minus className="w-5 h-5" />,
    color: "text-gray-600 bg-gray-50 hover:bg-gray-100 border-gray-200",
    description: "观望或震荡"
  },
  {
    type: "price_target",
    label: "价格目标",
    icon: <DollarSign className="w-5 h-5" />,
    color: "text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200",
    description: "设定目标价位"
  },
  {
    type: "risk",
    label: "风险提示",
    icon: <AlertTriangle className="w-5 h-5" />,
    color: "text-orange-600 bg-orange-50 hover:bg-orange-100 border-orange-200",
    description: "潜在风险警示"
  },
  {
    type: "entry",
    label: "入场点",
    icon: <TrendingUp className="w-5 h-5" />,
    color: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-200",
    description: "建议买入时机"
  },
  {
    type: "exit",
    label: "出场点",
    icon: <TrendingDown className="w-5 h-5" />,
    color: "text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-200",
    description: "建议卖出时机"
  }
]

export default function AddTimelineNoteDialog({
  open,
  onClose,
  onSave,
  currentPrice
}: AddTimelineNoteDialogProps) {
  const [author, setAuthor] = useState("")
  const [content, setContent] = useState("")
  const [judgmentType, setJudgmentType] = useState<JudgmentType>("bullish")
  const [priceTarget, setPriceTarget] = useState("")

  const handleSave = () => {
    if (!content.trim() || !author.trim()) {
      return
    }

    onSave({
      author: author.trim(),
      content: content.trim(),
      judgmentType,
      priceTarget: priceTarget ? parseFloat(priceTarget) : undefined,
      currentPrice
    })

    // 重置表单
    setAuthor("")
    setContent("")
    setJudgmentType("bullish")
    setPriceTarget("")
    onClose()
  }

  const handleClose = () => {
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>添加投资笔记</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 作者 */}
          <div className="space-y-2">
            <Label htmlFor="author">作者 / 来源</Label>
            <Input
              id="author"
              placeholder="例如：张三、某财经博主、自己的分析"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </div>

          {/* 判断类型 */}
          <div className="space-y-3">
            <Label>判断类型</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {judgmentOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => setJudgmentType(option.type)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                    judgmentType === option.type
                      ? option.color + " ring-2 ring-offset-2 ring-current"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  )}
                >
                  <div className={cn(
                    judgmentType === option.type ? option.color.split(" ")[0] : "text-gray-400"
                  )}>
                    {option.icon}
                  </div>
                  <div className="text-center">
                    <div className={cn(
                      "font-medium text-sm",
                      judgmentType === option.type ? option.color.split(" ")[0] : "text-gray-700"
                    )}>
                      {option.label}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {option.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 价格目标（仅在选择价格目标时显示） */}
          {judgmentType === "price_target" && (
            <div className="space-y-2">
              <Label htmlFor="priceTarget">目标价格 (USD)</Label>
              <div className="flex gap-3 items-center">
                <Input
                  id="priceTarget"
                  type="number"
                  step="0.01"
                  placeholder="例如：180.50"
                  value={priceTarget}
                  onChange={(e) => setPriceTarget(e.target.value)}
                  className="flex-1"
                />
                {currentPrice && priceTarget && (
                  <div className="text-sm text-muted-foreground whitespace-nowrap">
                    当前: ${currentPrice.toFixed(2)}
                    <span className={cn(
                      "ml-2 font-medium",
                      parseFloat(priceTarget) > currentPrice ? "text-green-600" : "text-red-600"
                    )}>
                      {parseFloat(priceTarget) > currentPrice ? "+" : ""}
                      {(((parseFloat(priceTarget) - currentPrice) / currentPrice) * 100).toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 笔记内容 */}
          <div className="space-y-2">
            <Label htmlFor="content">笔记内容</Label>
            <Textarea
              id="content"
              placeholder="记录你的分析、判断依据、技术指标、基本面因素等..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px]"
            />
            <p className="text-xs text-muted-foreground">
              提示：详细记录你的判断依据，方便后续回顾和讨论
            </p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!content.trim() || !author.trim()}
          >
            保存笔记
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
