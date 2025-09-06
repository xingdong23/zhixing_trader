"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Target,
  Clock,
  DollarSign,
  Activity,
  Settings
} from 'lucide-react'

// 策略执行结果数据模型
interface StrategyResult {
  id: string
  name: string
  type: string
  status: 'running' | 'paused' | 'stopped'
  totalReturn: number
  dailyReturn: number
  winRate: number
  sharpeRatio: number
  maxDrawdown: number
  totalTrades: number
  successTrades: number
  avgHoldingDays: number
  lastExecuted: string
  description: string
}

// 策略执行记录
interface ExecutionRecord {
  id: string
  timestamp: string
  action: string
  symbol: string
  price: number
  quantity: number
  result: 'profit' | 'loss' | 'pending'
  pnl?: number
}

export default function StrategyPage() {
  const [strategies, setStrategies] = useState<StrategyResult[]>([])
  const [executionRecords, setExecutionRecords] = useState<ExecutionRecord[]>([])
  const [selectedStrategy, setSelectedStrategy] = useState<string>('')

  // 模拟策略数据
  useEffect(() => {
    const mockStrategies: StrategyResult[] = [
      {
        id: '1',
        name: '均值回归策略',
        type: '量化策略',
        status: 'running',
        totalReturn: 15.8,
        dailyReturn: 2.3,
        winRate: 68.5,
        sharpeRatio: 1.45,
        maxDrawdown: -8.2,
        totalTrades: 156,
        successTrades: 107,
        avgHoldingDays: 3.2,
        lastExecuted: '2025-08-23 16:00:00',
        description: '基于统计学均值回归原理，寻找短期偏离长期均值的股票进行反向操作'
      },
      {
        id: '2',
        name: '龙头战法',
        type: '选股策略',
        status: 'running',
        totalReturn: 22.4,
        dailyReturn: 0.0,
        winRate: 72.3,
        sharpeRatio: 1.62,
        maxDrawdown: -12.5,
        totalTrades: 89,
        successTrades: 64,
        avgHoldingDays: 7.8,
        lastExecuted: '2025-08-23 08:30:15',
        description: '专注于挖掘各行业龙头股票，在技术面突破时进行买入操作'
      },
      {
        id: '3',
        name: '动量追踪策略',
        type: '量化策略',
        status: 'paused',
        totalReturn: 8.9,
        dailyReturn: -1.2,
        winRate: 58.7,
        sharpeRatio: 0.89,
        maxDrawdown: -15.8,
        totalTrades: 234,
        successTrades: 137,
        avgHoldingDays: 2.1,
        lastExecuted: '2025-08-22 15:45:30',
        description: '跟踪市场动量，在趋势确立后进行追涨杀跌操作'
      }
    ]

    const mockRecords: ExecutionRecord[] = [
      {
        id: '1',
        timestamp: '2025-08-23 16:00:00',
        action: '买入',
        symbol: 'AAPL',
        price: 210.50,
        quantity: 100,
        result: 'pending'
      },
      {
        id: '2',
        timestamp: '2025-08-23 14:30:15',
        action: '卖出',
        symbol: 'TSLA',
        price: 195.20,
        quantity: 50,
        result: 'profit',
        pnl: 485.50
      },
      {
        id: '3',
        timestamp: '2025-08-23 11:15:45',
        action: '买入',
        symbol: 'NVDA',
        price: 485.00,
        quantity: 20,
        result: 'pending'
      },
      {
        id: '4',
        timestamp: '2025-08-22 15:45:30',
        action: '卖出',
        symbol: 'META',
        price: 298.80,
        quantity: 30,
        result: 'loss',
        pnl: -156.90
      }
    ]

    setStrategies(mockStrategies)
    setExecutionRecords(mockRecords)
    setSelectedStrategy(mockStrategies[0].id)
  }, [])

  const currentStrategy = strategies.find(s => s.id === selectedStrategy)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'stopped': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running': return '运行中'
      case 'paused': return '已暂停'
      case 'stopped': return '已停止'
      default: return '未知'
    }
  }

  const getResultColor = (result: string) => {
    switch (result) {
      case 'profit': return 'text-green-600'
      case 'loss': return 'text-red-600'
      case 'pending': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  const getResultText = (result: string) => {
    switch (result) {
      case 'profit': return '盈利'
      case 'loss': return '亏损'
      case 'pending': return '待结算'
      default: return '未知'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">策略管理中心</h1>
          </div>
          <p className="text-gray-600">监控和管理您的量化交易策略执行情况</p>
        </div>

        {/* 策略选择 */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-3">
            {strategies.map(strategy => (
              <Button
                key={strategy.id}
                variant={selectedStrategy === strategy.id ? 'default' : 'outline'}
                onClick={() => setSelectedStrategy(strategy.id)}
                className="flex items-center gap-2"
              >
                <Activity className="h-4 w-4" />
                {strategy.name}
                <Badge 
                  className={`ml-1 ${getStatusColor(strategy.status)}`}
                >
                  {getStatusText(strategy.status)}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        {currentStrategy && (
          <>
            {/* 策略概述 */}
            <Card className="mb-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">{currentStrategy.name}</CardTitle>
                    <p className="text-gray-600 mt-2">{currentStrategy.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(currentStrategy.status)}>
                      {getStatusText(currentStrategy.status)}
                    </Badge>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      设置
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* 关键指标 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">总收益率</p>
                      <p className={`text-2xl font-bold ${
                        currentStrategy.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {currentStrategy.totalReturn >= 0 ? '+' : ''}{currentStrategy.totalReturn}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">日收益率</p>
                      <p className={`text-2xl font-bold ${
                        currentStrategy.dailyReturn >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {currentStrategy.dailyReturn >= 0 ? '+' : ''}{currentStrategy.dailyReturn}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Target className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">胜率</p>
                      <p className="text-2xl font-bold text-gray-900">{currentStrategy.winRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">夏普比率</p>
                      <p className="text-2xl font-bold text-gray-900">{currentStrategy.sharpeRatio}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 详细统计 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>交易统计</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">总交易次数</span>
                      <span className="font-medium">{currentStrategy.totalTrades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">成功交易</span>
                      <span className="font-medium text-green-600">{currentStrategy.successTrades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">失败交易</span>
                      <span className="font-medium text-red-600">
                        {currentStrategy.totalTrades - currentStrategy.successTrades}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">平均持仓天数</span>
                      <span className="font-medium">{currentStrategy.avgHoldingDays} 天</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">最大回撤</span>
                      <span className="font-medium text-red-600">{currentStrategy.maxDrawdown}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>执行信息</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">策略类型</span>
                      <Badge variant="outline">{currentStrategy.type}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">运行状态</span>
                      <Badge className={getStatusColor(currentStrategy.status)}>
                        {getStatusText(currentStrategy.status)}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">最后执行</span>
                      <span className="font-medium">{currentStrategy.lastExecuted}</span>
                    </div>
                    <div className="pt-4">
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1">
                          启动策略
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          暂停策略
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 执行记录 */}
            <Card>
              <CardHeader>
                <CardTitle>最近执行记录</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {executionRecords.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${
                          record.result === 'profit' ? 'bg-green-500' : 
                          record.result === 'loss' ? 'bg-red-500' : 'bg-blue-500'
                        }`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{record.action}</span>
                            <span className="text-blue-600 font-medium">{record.symbol}</span>
                            <Badge variant="outline" className="text-xs">
                              ${record.price}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{record.timestamp}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-medium">数量: {record.quantity}</p>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${getResultColor(record.result)}`}>
                            {getResultText(record.result)}
                          </span>
                          {record.pnl && (
                            <span className={`font-medium ${
                              record.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {record.pnl >= 0 ? '+' : ''}${record.pnl}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}