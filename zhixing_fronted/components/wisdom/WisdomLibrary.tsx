"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { 
  Plus, Search, Edit, Trash2, Eye, EyeOff, Download, Upload, 
  RefreshCw, Star, BookOpen, Shield, Brain, Target, AlertTriangle,
  TrendingUp, AlertCircle, Quote
} from "lucide-react"
import { 
  TradingWisdom, 
  WisdomCategory, 
  WisdomManager, 
  WISDOM_CATEGORIES 
} from "@/types/tradingWisdom"
import { toast } from "sonner"

const CATEGORY_ICONS: Record<WisdomCategory, any> = {
  discipline: Shield,
  psychology: Brain,
  strategy: Target,
  risk: AlertTriangle,
  quote: Quote,
  book: BookOpen,
  experience: TrendingUp,
  lesson: AlertCircle,
  custom: Star
}

export default function WisdomLibrary() {
  const [wisdoms, setWisdoms] = useState<TradingWisdom[]>([])
  const [filteredWisdoms, setFilteredWisdoms] = useState<TradingWisdom[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<WisdomCategory | "all">("all")
  const [showDialog, setShowDialog] = useState(false)
  const [editingWisdom, setEditingWisdom] = useState<TradingWisdom | null>(null)
  const [formData, setFormData] = useState<Partial<TradingWisdom>>({
    content: "",
    category: "discipline",
    importance: 3,
    isActive: true
  })

  // 加载数据
  useEffect(() => {
    loadWisdoms()
  }, [])

  // 筛选和搜索
  useEffect(() => {
    let result = wisdoms

    // 按分类筛选
    if (selectedCategory !== "all") {
      result = result.filter(w => w.category === selectedCategory)
    }

    // 搜索
    if (searchQuery) {
      result = WisdomManager.search(searchQuery)
      if (selectedCategory !== "all") {
        result = result.filter(w => w.category === selectedCategory)
      }
    }

    setFilteredWisdoms(result)
  }, [wisdoms, searchQuery, selectedCategory])

  const loadWisdoms = () => {
    setWisdoms(WisdomManager.getAll())
  }

  const handleAdd = () => {
    setEditingWisdom(null)
    setFormData({
      content: "",
      category: "discipline",
      importance: 3,
      isActive: true
    })
    setShowDialog(true)
  }

  const handleEdit = (wisdom: TradingWisdom) => {
    setEditingWisdom(wisdom)
    setFormData(wisdom)
    setShowDialog(true)
  }

  const handleSave = () => {
    if (!formData.content?.trim()) {
      toast.error("请输入智慧内容")
      return
    }

    if (editingWisdom) {
      // 更新
      WisdomManager.update(editingWisdom.id, formData)
      toast.success("更新成功")
    } else {
      // 新增
      WisdomManager.add(formData as any)
      toast.success("添加成功")
    }

    loadWisdoms()
    setShowDialog(false)
  }

  const handleDelete = (id: string) => {
    if (confirm("确定要删除这条智慧吗？")) {
      WisdomManager.delete(id)
      toast.success("删除成功")
      loadWisdoms()
    }
  }

  const handleToggleActive = (id: string) => {
    WisdomManager.toggleActive(id)
    loadWisdoms()
  }

  const handleExport = () => {
    const json = WisdomManager.exportToJSON()
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `trading-wisdom-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("导出成功")
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string
        if (WisdomManager.importFromJSON(json)) {
          loadWisdoms()
          toast.success("导入成功")
        } else {
          toast.error("导入失败：数据格式不正确")
        }
      } catch (error) {
        toast.error("导入失败")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  const handleReset = () => {
    if (confirm("确定要重置为默认智慧库吗？这将删除所有自定义内容！")) {
      WisdomManager.reset()
      loadWisdoms()
      toast.success("已重置为默认")
    }
  }

  const stats = {
    total: wisdoms.length,
    active: wisdoms.filter(w => w.isActive).length,
    byCategory: Object.keys(WISDOM_CATEGORIES).reduce((acc, cat) => {
      acc[cat as WisdomCategory] = wisdoms.filter(w => w.category === cat).length
      return acc
    }, {} as Record<WisdomCategory, number>)
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
              <p className="text-sm text-muted-foreground mt-1">总智慧数</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              <p className="text-sm text-muted-foreground mt-1">已激活</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">
                {stats.byCategory.discipline + stats.byCategory.psychology}
              </p>
              <p className="text-sm text-muted-foreground mt-1">纪律&心理</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-600">
                {stats.byCategory.quote + stats.byCategory.book}
              </p>
              <p className="text-sm text-muted-foreground mt-1">名言&读书</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 操作栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* 搜索 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索智慧内容、来源、标签..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* 分类筛选 */}
            <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                {Object.entries(WISDOM_CATEGORIES).map(([key, cat]) => (
                  <SelectItem key={key} value={key}>
                    {cat.name} ({stats.byCategory[key as WisdomCategory] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 操作按钮 */}
            <div className="flex gap-2">
              <Button onClick={handleAdd}>
                <Plus className="w-4 h-4 mr-2" />
                添加智慧
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="outline" asChild>
                <label>
                  <Upload className="w-4 h-4" />
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 智慧列表 */}
      <div className="grid grid-cols-1 gap-4">
        {filteredWisdoms.map((wisdom) => {
          const category = WISDOM_CATEGORIES[wisdom.category]
          const Icon = CATEGORY_ICONS[wisdom.category]
          
          return (
            <Card key={wisdom.id} className={!wisdom.isActive ? "opacity-50" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  {/* 图标和重要程度 */}
                  <div className="flex flex-col items-center gap-2">
                    <div className={`p-3 rounded-lg bg-opacity-10 ${category.defaultColor.replace('text-', 'bg-')}`}>
                      <Icon className={`w-6 h-6 ${category.defaultColor}`} />
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < wisdom.importance
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <p className="text-lg font-medium leading-relaxed">{wisdom.content}</p>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(wisdom.id)}
                        >
                          {wisdom.isActive ? (
                            <Eye className="w-4 h-4 text-green-600" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(wisdom)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(wisdom.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>

                    {/* 元数据 */}
                    <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground">
                      <Badge variant="secondary">{category.name}</Badge>
                      {wisdom.author && (
                        <span className="flex items-center gap-1">
                          <Quote className="w-3 h-3" />
                          {wisdom.author}
                        </span>
                      )}
                      {wisdom.source && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {wisdom.source}
                        </span>
                      )}
                      {wisdom.tags && wisdom.tags.length > 0 && (
                        <div className="flex gap-1">
                          {wisdom.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {wisdom.displayCount && wisdom.displayCount > 0 && (
                        <span className="text-xs">
                          显示 {wisdom.displayCount} 次
                        </span>
                      )}
                    </div>

                    {/* 笔记 */}
                    {wisdom.notes && (
                      <p className="mt-2 text-sm text-muted-foreground italic border-l-2 border-gray-300 pl-3">
                        {wisdom.notes}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {filteredWisdoms.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无智慧内容</p>
              <Button className="mt-4" onClick={handleAdd}>
                <Plus className="w-4 h-4 mr-2" />
                添加第一条智慧
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 添加/编辑对话框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingWisdom ? "编辑智慧" : "添加新智慧"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 内容 */}
            <div>
              <Label>智慧内容 *</Label>
              <Textarea
                placeholder="输入交易智慧、心得、名言..."
                value={formData.content || ""}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={3}
                className="mt-1"
              />
            </div>

            {/* 分类和重要程度 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>分类 *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v as WisdomCategory })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(WISDOM_CATEGORIES).map(([key, cat]) => (
                      <SelectItem key={key} value={key}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>重要程度 *</Label>
                <Select
                  value={String(formData.importance)}
                  onValueChange={(v) => setFormData({ ...formData, importance: Number(v) as any })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((level) => (
                      <SelectItem key={level} value={String(level)}>
                        {Array.from({ length: level }).map((_, i) => "⭐").join("")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 来源和作者 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>来源（可选）</Label>
                <Input
                  placeholder="书名、网站、课程..."
                  value={formData.source || ""}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>作者（可选）</Label>
                <Input
                  placeholder="作者、导师..."
                  value={formData.author || ""}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            {/* 标签 */}
            <div>
              <Label>标签（可选）</Label>
              <Input
                placeholder="用逗号分隔，如：止损,仓位管理,心态"
                value={formData.tags?.join(",") || ""}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean)
                })}
                className="mt-1"
              />
            </div>

            {/* 个人笔记 */}
            <div>
              <Label>个人笔记（可选）</Label>
              <Textarea
                placeholder="记录你对这条智慧的理解和感悟..."
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="mt-1"
              />
            </div>

            {/* 是否激活 */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                在交易纪律提醒中显示
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>
              {editingWisdom ? "更新" : "添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
