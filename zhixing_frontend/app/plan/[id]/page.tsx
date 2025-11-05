"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  ArrowLeft, 
  Plus, 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  DollarSign, 
  BarChart3,
  Camera,
  Upload,
  X,
  ExternalLink,
  Bell
} from "lucide-react"
import { Label } from "@/components/ui/label"

interface TradingPlanNote {
  id: string
  user: string
  text: string
  date: string
  type: "comment" | "execution" | "analysis" | "risk" | "screenshot"
  attachments?: {
    type: 'image' | 'file'
    url: string
    name: string
    size?: number
  }[]
}

interface TradingPlan {
  id: string
  name: string
  ticker: string
  entry: number
  tp: number
  sl: number
  status: "等待入场" | "已入场" | "已完成"
  reason: string
  strategy: string
  riskLevel: "low" | "medium" | "high"
  positionSize: number
  notes: TradingPlanNote[]
  createdAt: string
  updatedAt: string
}

export default function TradingPlanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const planId = params.id as string
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [plan, setPlan] = useState<TradingPlan | null>(null)
  const [newNote, setNewNote] = useState({
    text: "",
    type: "comment" as const,
  })
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  const [showAlertDialog, setShowAlertDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [alertConfig, setAlertConfig] = useState({
    price: '',
    condition: 'below' as 'above' | 'below',
    type: 'price' as 'price' | 'volume'
  })
  const [editConfig, setEditConfig] = useState({
    name: '',
    entry: '',
    tp: '',
    sl: '',
    reason: ''
  })

  // 初始化模拟数据
  useEffect(() => {
    const mockPlan: TradingPlan = {
      id: planId,
      name: "AAPL 苹果回调买入计划",
      ticker: "AAPL",
      entry: 210.0,
      tp: 230.0,
      sl: 195.0,
      status: "等待入场",
      reason: "技术面回调至关键支撑位，基本面依然强劲，适合中线持有",
      strategy: "趋势突破",
      riskLevel: "medium",
      positionSize: 1000,
      createdAt: "2025-08-23",
      updatedAt: "2024-01-15 14:20",
      notes: [
        {
          id: "1",
          user: "自己",
          text: "计划创建，等待价格突破260阻力位后入场",
          date: "2024-01-15 10:30",
          type: "comment",
        },
        {
          id: "2",
          user: "系统",
          text: "风险提醒：当前RSI已达70，注意超买风险",
          date: "2024-01-15 14:20",
          type: "risk",
        },
      ],
    }
    setPlan(mockPlan)
    
    setEditConfig({
      name: mockPlan.name,
      entry: mockPlan.entry.toString(),
      tp: mockPlan.tp.toString(),
      sl: mockPlan.sl.toString(),
      reason: mockPlan.reason
    })
  }, [planId])

  // 文件上传处理
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setUploadedFiles(prev => [...prev, ...files])
  }

  // 移除文件
  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  // 截图功能
  const handleScreenshot = async () => {
    try {
      if ('mediaDevices' in navigator && 'getDisplayMedia' in navigator.mediaDevices) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        })
        
        const video = document.createElement('video')
        video.srcObject = stream
        video.play()
        
        video.addEventListener('loadedmetadata', () => {
          const canvas = document.createElement('canvas')
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(video, 0, 0)
          
          stream.getTracks().forEach(track => track.stop())
          
          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], `screenshot-${Date.now()}.png`, { type: 'image/png' })
              setUploadedFiles(prev => [...prev, file])
            }
          }, 'image/png')
        })
      } else {
        alert('您的浏览器不支持自动截图功能，请手动截图后上传文件')
      }
    } catch (error) {
      const confirmed = confirm('无法自动截图，是否打开文件选择器上传图片？')
      if (confirmed) {
        fileInputRef.current?.click()
      }
    }
  }

  // 添加笔记
  const addNote = () => {
    if (!plan || (!newNote.text.trim() && uploadedFiles.length === 0)) return

    const attachments = uploadedFiles.map(file => ({
      type: file.type.startsWith('image/') ? 'image' as const : 'file' as const,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }))

    const note: TradingPlanNote = {
      id: Date.now().toString(),
      user: "自己",
      text: newNote.text,
      date: new Date().toLocaleString("zh-CN"),
      type: newNote.type === 'comment' && attachments.some(a => a.type === 'image') ? 'screenshot' : newNote.type,
      attachments: attachments.length > 0 ? attachments : undefined
    }

    setPlan({
      ...plan,
      notes: [...plan.notes, note],
      updatedAt: new Date().toLocaleString("zh-CN"),
    })

    setNewNote({ text: "", type: "comment" })
    setUploadedFiles([])
    setShowNoteDialog(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 快速操作函数
  const viewStockDetail = () => {
    if (plan?.ticker) {
      window.open(`/stock/${plan.ticker}`, '_blank')
    }
  }

  const simulateTrading = () => {
    if (!plan) return
    
    const tradeNote: TradingPlanNote = {
      id: Date.now().toString(),
      user: "系统",
      text: `已启动模拟交易: ${plan.ticker} 入场价 $${plan.entry}`,
      date: new Date().toLocaleString("zh-CN"),
      type: "execution",
    }

    setPlan({
      ...plan,
      notes: [...plan.notes, tradeNote],
      updatedAt: new Date().toLocaleString("zh-CN"),
    })
  }

  const performRiskAnalysis = () => {
    if (!plan) return
    
    const riskRewardRatio = plan.tp && plan.sl ? ((plan.tp - plan.entry) / (plan.entry - plan.sl)).toFixed(2) : "N/A"
    const potentialLoss = ((plan.entry - plan.sl) * plan.positionSize).toFixed(2)
    
    const analysisNote: TradingPlanNote = {
      id: Date.now().toString(),
      user: "系统",
      text: `风险分析报告: 风险回报比 1:${riskRewardRatio}, 最大潜在亏损 $${potentialLoss}, 建议位置不超过总资产的20%`,
      date: new Date().toLocaleString("zh-CN"),
      type: "analysis",
    }

    setPlan({
      ...plan,
      notes: [...plan.notes, analysisNote],
      updatedAt: new Date().toLocaleString("zh-CN"),
    })
  }

  const setAlert = () => {
    if (!plan || !alertConfig.price) return

    const alertNote: TradingPlanNote = {
      id: Date.now().toString(),
      user: "系统",
      text: `已设置价格提醒: 当 ${plan.ticker} ${alertConfig.condition === 'above' ? '高于' : '低于'} $${alertConfig.price} 时通知`,
      date: new Date().toLocaleString("zh-CN"),
      type: "risk",
    }

    setPlan({
      ...plan,
      notes: [...plan.notes, alertNote],
      updatedAt: new Date().toLocaleString("zh-CN"),
    })

    setShowAlertDialog(false)
    setAlertConfig({ price: '', condition: 'below', type: 'price' })
  }

  if (!plan) {
    return <div className="p-8">加载中...</div>
  }

  const riskRewardRatio = plan.tp && plan.sl ? ((plan.tp - plan.entry) / (plan.entry - plan.sl)).toFixed(2) : "N/A"
  const potentialProfit = ((plan.tp - plan.entry) * plan.positionSize).toFixed(2)
  const potentialLoss = ((plan.entry - plan.sl) * plan.positionSize).toFixed(2)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{plan.name}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{plan.ticker}</span>
                <Badge
                  variant={plan.status === "等待入场" ? "secondary" : plan.status === "已入场" ? "default" : "outline"}
                >
                  {plan.status}
                </Badge>
                <span>策略: {plan.strategy}</span>
                <span>创建: {plan.createdAt}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setShowEditDialog(true)}>编辑计划</Button>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="xl:col-span-2 space-y-6">
            {/* Trading Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    交易参数
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-muted rounded">
                        <div className="text-sm text-muted-foreground">入场价</div>
                        <div className="text-lg font-bold">${plan.entry}</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded">
                        <div className="text-sm text-muted-foreground">目标价</div>
                        <div className="text-lg font-bold text-green-600">${plan.tp}</div>
                      </div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded">
                      <div className="text-sm text-muted-foreground">止损价</div>
                      <div className="text-lg font-bold text-red-600">${plan.sl}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    风险分析
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">风险回报比</span>
                      <span className="font-semibold">1:{riskRewardRatio}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">仓位大小</span>
                      <span className="font-semibold">{plan.positionSize} 股</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">潜在盈利</span>
                      <span className="font-semibold text-green-600">+${potentialProfit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">潜在亏损</span>
                      <span className="font-semibold text-red-600">-${potentialLoss}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Trading Reason */}
            <Card>
              <CardHeader>
                <CardTitle>交易理由</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{plan.reason}</p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Quick Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>快速操作</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={viewStockDetail}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  查看股票详情
                </Button>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => setShowAlertDialog(true)}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  设置提醒
                </Button>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={simulateTrading}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  模拟交易
                </Button>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={performRiskAnalysis}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  风险分析
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>交易笔记</CardTitle>
                <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      添加
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>添加交易笔记</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="noteType">笔记类型</Label>
                        <Select
                          value={newNote.type}
                          onValueChange={(value: any) => setNewNote({ ...newNote, type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="comment">一般评论</SelectItem>
                            <SelectItem value="analysis">技术分析</SelectItem>
                            <SelectItem value="execution">执行记录</SelectItem>
                            <SelectItem value="risk">风险提醒</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="noteText">笔记内容</Label>
                        <Textarea
                          id="noteText"
                          value={newNote.text}
                          onChange={(e) => setNewNote({ ...newNote, text: e.target.value })}
                          placeholder="记录交易想法、市场观察、执行情况等..."
                          rows={4}
                        />
                      </div>
                      
                      <div>
                        <Label>附件（支持截图、图片、文档）</Label>
                        <div className="mt-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/*,.pdf,.doc,.docx,.txt"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              上传文件
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleScreenshot}
                            >
                              <Camera className="w-4 h-4 mr-2" />
                              截图
                            </Button>
                          </div>
                        </div>
                        
                        {uploadedFiles.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {uploadedFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between p-2 border rounded">
                                <div className="flex items-center gap-2">
                                  {file.type.startsWith('image/') ? (
                                    <Camera className="w-4 h-4 text-blue-500" />
                                  ) : (
                                    <Upload className="w-4 h-4 text-gray-500" />
                                  )}
                                  <span className="text-sm">{file.name}</span>
                                  <span className="text-xs text-gray-500">
                                    ({(file.size / 1024).toFixed(1)} KB)
                                  </span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFile(index)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setShowNoteDialog(false)
                            setNewNote({ text: "", type: "comment" })
                            setUploadedFiles([])
                          }}
                        >
                          取消
                        </Button>
                        <Button onClick={addNote}>添加笔记</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {plan.notes.map((note) => (
                    <div
                      key={note.id}
                      className={`p-4 rounded-lg border-l-4 ${
                        note.type === "risk"
                          ? "border-l-red-500 bg-red-50"
                          : note.type === "execution"
                            ? "border-l-blue-500 bg-blue-50"
                            : note.type === "analysis"
                              ? "border-l-green-500 bg-green-50"
                              : note.type === "screenshot"
                                ? "border-l-purple-500 bg-purple-50"
                                : "border-l-gray-500 bg-muted"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{note.user}</span>
                          <Badge variant="outline" className="text-xs">
                            {note.type === "comment"
                              ? "评论"
                              : note.type === "analysis"
                                ? "分析"
                                : note.type === "execution"
                                  ? "执行"
                                  : note.type === "screenshot"
                                    ? "截图"
                                    : "风险"}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{note.date}</span>
                      </div>
                      {note.text && <p className="text-sm mb-3">{note.text}</p>}
                      
                      {note.attachments && note.attachments.length > 0 && (
                        <div className="space-y-2">
                          {note.attachments.map((attachment, index) => (
                            <div key={index}>
                              {attachment.type === 'image' ? (
                                <div className="border rounded-lg overflow-hidden">
                                  <img 
                                    src={attachment.url} 
                                    alt={attachment.name}
                                    className="max-w-full h-auto max-h-64 object-contain"
                                  />
                                  <div className="p-2 bg-gray-50 text-xs text-gray-600">
                                    {attachment.name}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 p-2 border rounded bg-gray-50">
                                  <Upload className="w-4 h-4 text-gray-500" />
                                  <span className="text-sm">{attachment.name}</span>
                                  <Button variant="ghost" size="sm" className="ml-auto">
                                    <ExternalLink className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* 设置提醒对话框 */}
      <Dialog open={showAlertDialog} onOpenChange={setShowAlertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>设置价格提醒</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>股票代码</Label>
              <Input value={plan?.ticker} disabled className="bg-gray-50" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="alertCondition">提醒条件</Label>
                <Select
                  value={alertConfig.condition}
                  onValueChange={(value: 'above' | 'below') => 
                    setAlertConfig({ ...alertConfig, condition: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">价格高于</SelectItem>
                    <SelectItem value="below">价格低于</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="alertPrice">目标价格</Label>
                <Input
                  id="alertPrice"
                  type="number"
                  step="0.01"
                  value={alertConfig.price}
                  onChange={(e) => setAlertConfig({ ...alertConfig, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <Alert>
              <Bell className="h-4 w-4" />
              <AlertDescription>
                当 {plan?.ticker} 的价格{alertConfig.condition === 'above' ? '高于' : '低于'} 
                ${alertConfig.price || '___'} 时，系统将发送提醒通知。
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAlertDialog(false)}>
                取消
              </Button>
              <Button onClick={setAlert} disabled={!alertConfig.price}>
                设置提醒
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}