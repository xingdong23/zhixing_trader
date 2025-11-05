"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Settings, 
  Zap, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  TrendingUp,
  DollarSign,
  Clock,
  Activity
} from 'lucide-react'

// 券商类型枚举
type BrokerType = 'futu' | 'tiger' | 'ib' | 'huatai' | 'dongfang' | 'zhongxin' | 'custom'

// 交易环境类型
type TradingMode = 'paper' | 'live'

// 连接状态
type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error'

// 券商配置接口
interface BrokerConfig {
  id: string
  name: string
  type: BrokerType
  displayName: string
  logo?: string
  status: ConnectionStatus
  mode: TradingMode
  config: {
    apiKey?: string
    apiSecret?: string
    appId?: string
    host?: string
    port?: number
    account?: string
    market?: string[]
  }
  features: {
    autoTrading: boolean
    paperTrading: boolean
    realTimeData: boolean
    optionsTrading: boolean
    cryptoTrading: boolean
  }
  lastConnected?: string
  balance?: {
    total: number
    available: number
    currency: string
  }
}

// 交易执行记录
interface TradeExecution {
  id: string
  planId: string
  planName: string
  symbol: string
  action: 'buy' | 'sell'
  quantity: number
  price: number
  executedAt: string
  status: 'pending' | 'filled' | 'cancelled' | 'failed'
  brokerId: string
  mode: TradingMode
  orderId?: string
  commission?: number
  error?: string
}

// 系统状态
interface SystemStatus {
  autoTradingEnabled: boolean
  totalActivePlans: number
  executedToday: number
  errorCount: number
  lastExecution?: string
}

export default function TradingPage() {
  const [brokers, setBrokers] = useState<BrokerConfig[]>([])
  const [selectedBroker, setSelectedBroker] = useState<BrokerConfig | null>(null)
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    autoTradingEnabled: false,
    totalActivePlans: 0,
    executedToday: 0,
    errorCount: 0
  })
  const [executions, setExecutions] = useState<TradeExecution[]>([])
  const [showBrokerDialog, setShowBrokerDialog] = useState(false)
  const [editingBroker, setEditingBroker] = useState<BrokerConfig | null>(null)

  // 初始化模拟数据
  useEffect(() => {
    const mockBrokers: BrokerConfig[] = [
      {
        id: '1',
        name: 'futu',
        type: 'futu',
        displayName: '富途牛牛',
        logo: '🐮',
        status: 'connected',
        mode: 'paper',
        config: {
          apiKey: 'ft_api_key_***',
          host: 'openapi.futunn.com',
          port: 11111,
          account: 'DU1234567',
          market: ['HK', 'US', 'CN']
        },
        features: {
          autoTrading: true,
          paperTrading: true,
          realTimeData: true,
          optionsTrading: true,
          cryptoTrading: false
        },
        lastConnected: '2025-08-24 10:30:15',
        balance: {
          total: 100000,
          available: 85000,
          currency: 'USD'
        }
      },
      {
        id: '2',
        name: 'tiger',
        type: 'tiger',
        displayName: '老虎证券',
        logo: '🐅',
        status: 'disconnected',
        mode: 'live',
        config: {
          apiKey: 'tiger_api_***',
          host: 'openapi.tigerbrokers.com',
          account: 'TG123456789',
          market: ['US', 'HK', 'CN']
        },
        features: {
          autoTrading: true,
          paperTrading: true,
          realTimeData: true,
          optionsTrading: true,
          cryptoTrading: true
        }
      },
      {
        id: '3',
        name: 'ib',
        type: 'ib',
        displayName: 'Interactive Brokers',
        logo: '📊',
        status: 'error',
        mode: 'paper',
        config: {
          host: '127.0.0.1',
          port: 7497,
          account: 'DU123456',
          market: ['US', 'HK', 'EU', 'JP']
        },
        features: {
          autoTrading: true,
          paperTrading: true,
          realTimeData: true,
          optionsTrading: true,
          cryptoTrading: false
        }
      }
    ]

    const mockExecutions: TradeExecution[] = [
      {
        id: '1',
        planId: '1',
        planName: '苹果回调买入计划',
        symbol: 'AAPL',
        action: 'buy',
        quantity: 100,
        price: 210.50,
        executedAt: '2025-08-24 09:30:15',
        status: 'filled',
        brokerId: '1',
        mode: 'paper',
        orderId: 'FT20250824001',
        commission: 1.5
      },
      {
        id: '2',
        planId: '2',
        planName: '特斯拉突破追涨',
        symbol: 'TSLA',
        action: 'sell',
        quantity: 50,
        price: 195.20,
        executedAt: '2025-08-24 14:20:30',
        status: 'pending',
        brokerId: '1',
        mode: 'paper',
        orderId: 'FT20250824002'
      }
    ]

    setBrokers(mockBrokers)
    setExecutions(mockExecutions)
    setSystemStatus({
      autoTradingEnabled: true,
      totalActivePlans: 5,
      executedToday: 3,
      errorCount: 1,
      lastExecution: '2025-08-24 14:20:30'
    })
  }, [])

  // 获取状态颜色
  const getStatusColor = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected': return 'text-green-600 bg-green-50 border-green-200'
      case 'disconnected': return 'text-gray-600 bg-gray-50 border-gray-200'
      case 'connecting': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'error': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4" />
      case 'disconnected': return <XCircle className="h-4 w-4" />
      case 'connecting': return <RotateCcw className="h-4 w-4 animate-spin" />
      case 'error': return <AlertTriangle className="h-4 w-4" />
      default: return <XCircle className="h-4 w-4" />
    }
  }

  const getStatusText = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected': return '已连接'
      case 'disconnected': return '未连接'
      case 'connecting': return '连接中'
      case 'error': return '连接错误'
      default: return '未知'
    }
  }

  const getModeText = (mode: TradingMode) => {
    return mode === 'paper' ? '模拟盘' : '实盘'
  }

  const getModeColor = (mode: TradingMode) => {
    return mode === 'paper' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
  }

  // 连接/断开券商
  const toggleBrokerConnection = (brokerId: string) => {
    setBrokers(prev => prev.map(broker => {
      if (broker.id === brokerId) {
        const newStatus: ConnectionStatus = broker.status === 'connected' ? 'disconnected' : 'connecting'
        return { ...broker, status: newStatus }
      }
      return broker
    }))

    // 模拟连接过程
    if (brokers.find(b => b.id === brokerId)?.status !== 'connected') {
      setTimeout(() => {
        setBrokers(prev => prev.map(broker => {
          if (broker.id === brokerId) {
            return { 
              ...broker, 
              status: 'connected',
              lastConnected: new Date().toLocaleString('zh-CN')
            }
          }
          return broker
        }))
      }, 2000)
    }
  }

  // 切换交易模式
  const toggleTradingMode = (brokerId: string) => {
    setBrokers(prev => prev.map(broker => {
      if (broker.id === brokerId) {
        return { ...broker, mode: broker.mode === 'paper' ? 'live' : 'paper' }
      }
      return broker
    }))
  }

  // 切换自动交易
  const toggleAutoTrading = () => {
    setSystemStatus(prev => ({
      ...prev,
      autoTradingEnabled: !prev.autoTradingEnabled
    }))
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          {/* 页面标题 */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">交易执行中心</h1>
            </div>
            <p className="text-gray-600">管理券商连接、配置交易环境并监控自动执行</p>
          </div>

          {/* 系统状态卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  systemStatus.autoTradingEnabled ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {systemStatus.autoTradingEnabled ? (
                    <Play className="h-5 w-5 text-green-600" />
                  ) : (
                    <Pause className="h-5 w-5 text-gray-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600">自动交易</p>
                  <p className={`text-lg font-bold ${
                    systemStatus.autoTradingEnabled ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {systemStatus.autoTradingEnabled ? '运行中' : '已暂停'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">活跃计划</p>
                  <p className="text-2xl font-bold text-gray-900">{systemStatus.totalActivePlans}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">今日执行</p>
                  <p className="text-2xl font-bold text-gray-900">{systemStatus.executedToday}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">错误次数</p>
                  <p className="text-2xl font-bold text-red-600">{systemStatus.errorCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 系统控制 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>系统控制</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">自动交易执行</h3>
                <p className="text-sm text-gray-600">
                  启用后，系统将根据交易计划自动执行买卖操作
                </p>
              </div>
              <Button
                onClick={toggleAutoTrading}
                variant={systemStatus.autoTradingEnabled ? 'destructive' : 'default'}
                className="flex items-center gap-2"
              >
                {systemStatus.autoTradingEnabled ? (
                  <>
                    <Pause className="h-4 w-4" />
                    暂停自动交易
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    启用自动交易
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 券商管理 */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>券商管理</CardTitle>
              <Button onClick={() => setShowBrokerDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                添加券商
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {brokers.map((broker) => (
                <div key={broker.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl">{broker.logo}</div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-gray-900">{broker.displayName}</h3>
                          <Badge className={getStatusColor(broker.status)}>
                            {getStatusIcon(broker.status)}
                            <span className="ml-1">{getStatusText(broker.status)}</span>
                          </Badge>
                          <Badge className={getModeColor(broker.mode)}>
                            {getModeText(broker.mode)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span>账户: {broker.config.account}</span>
                          <span>市场: {broker.config.market?.join(', ')}</span>
                          {broker.lastConnected && (
                            <span>上次连接: {broker.lastConnected}</span>
                          )}
                        </div>
                        {broker.balance && (
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                            <span>总资产: ${broker.balance.total.toLocaleString()}</span>
                            <span>可用资金: ${broker.balance.available.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleTradingMode(broker.id)}
                        disabled={broker.status !== 'connected'}
                      >
                        切换到{broker.mode === 'paper' ? '实盘' : '模拟盘'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleBrokerConnection(broker.id)}
                      >
                        {broker.status === 'connected' ? '断开' : '连接'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingBroker(broker)
                          setShowBrokerDialog(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {broker.status === 'error' && (
                    <Alert className="mt-3 border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-700">
                        连接失败: API密钥无效或网络连接异常
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 执行记录 */}
        <Card>
          <CardHeader>
            <CardTitle>最近执行记录</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {executions.map((execution) => (
                <div key={execution.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900">{execution.symbol}</span>
                        <Badge variant={execution.action === 'buy' ? 'default' : 'destructive'}>
                          {execution.action === 'buy' ? '买入' : '卖出'}
                        </Badge>
                        <Badge variant={execution.status === 'filled' ? 'default' : 'secondary'}>
                          {execution.status === 'filled' ? '已成交' : 
                           execution.status === 'pending' ? '待成交' : 
                           execution.status === 'cancelled' ? '已取消' : '失败'}
                        </Badge>
                        <Badge className={getModeColor(execution.mode)}>
                          {getModeText(execution.mode)}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        计划: {execution.planName} | 数量: {execution.quantity} | 价格: ${execution.price}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {execution.executedAt} | 订单号: {execution.orderId}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        ${(execution.quantity * execution.price).toLocaleString()}
                      </div>
                      {execution.commission && (
                        <div className="text-sm text-gray-600">
                          手续费: ${execution.commission}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 添加/编辑券商对话框 */}
        <Dialog open={showBrokerDialog} onOpenChange={setShowBrokerDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingBroker ? '编辑券商配置' : '添加新券商'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* 券商选择 */}
              <div>
                <Label>券商类型</Label>
                <Select defaultValue={editingBroker?.type || 'futu'}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择券商" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="futu">富途牛牛</SelectItem>
                    <SelectItem value="tiger">老虎证券</SelectItem>
                    <SelectItem value="ib">Interactive Brokers</SelectItem>
                    <SelectItem value="huatai">华泰证券</SelectItem>
                    <SelectItem value="dongfang">东方财富</SelectItem>
                    <SelectItem value="zhongxin">中信证券</SelectItem>
                    <SelectItem value="custom">自定义</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* API配置 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>API Key</Label>
                  <Input 
                    type="password" 
                    placeholder="输入API Key"
                    defaultValue={editingBroker?.config.apiKey}
                  />
                </div>
                <div>
                  <Label>API Secret</Label>
                  <Input 
                    type="password" 
                    placeholder="输入API Secret"
                    defaultValue={editingBroker?.config.apiSecret}
                  />
                </div>
              </div>

              {/* 连接配置 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>主机地址</Label>
                  <Input 
                    placeholder="例如: openapi.futunn.com"
                    defaultValue={editingBroker?.config.host}
                  />
                </div>
                <div>
                  <Label>端口</Label>
                  <Input 
                    type="number" 
                    placeholder="例如: 11111"
                    defaultValue={editingBroker?.config.port}
                  />
                </div>
              </div>

              {/* 账户配置 */}
              <div>
                <Label>交易账户</Label>
                <Input 
                  placeholder="输入交易账户号"
                  defaultValue={editingBroker?.config.account}
                />
              </div>

              {/* 功能配置 */}
              <div>
                <Label>支持功能</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked />
                    <span>自动交易</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked />
                    <span>模拟交易</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked />
                    <span>实时行情</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" />
                    <span>期权交易</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowBrokerDialog(false)}>
                  取消
                </Button>
                <Button onClick={() => setShowBrokerDialog(false)}>
                  {editingBroker ? '保存' : '添加'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      </div>
    </div>
  )
}