"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, TrendingUp, AlertTriangle, Target, ArrowRight, Filter } from 'lucide-react'

// 通知类型枚举
type NotificationType = 'price_alert' | 'trading_plan' | 'stock_selection' | 'strategy_result'

// 通知状态枚举
type NotificationStatus = 'unread' | 'read'

// 通知数据模型
interface Notification {
  id: string
  type: NotificationType
  title: string
  content: string
  timestamp: string
  status: NotificationStatus
  relatedId?: string // 关联的股票代码、交易计划ID等
  metadata?: {
    symbol?: string
    planId?: string
    strategyName?: string
    price?: number
    targetPrice?: number
    count?: number
  }
}

// 通知分类配置
const notificationCategories = {
  price_alert: {
    label: '价格提醒',
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  trading_plan: {
    label: '交易计划',
    icon: Target,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  stock_selection: {
    label: '选股结果',
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  strategy_result: {
    label: '策略执行',
    icon: Bell,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  }
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [selectedCategory, setSelectedCategory] = useState<NotificationType | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'read'>('all')

  // 模拟通知数据
  useEffect(() => {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'price_alert',
        title: '价格提醒触发',
        content: '苹果(AAPL)股价已跌破$210，达到预设提醒条件',
        timestamp: '2025-08-23 07:15:30',
        status: 'unread',
        relatedId: 'AAPL',
        metadata: {
          symbol: 'AAPL',
          price: 208.5,
          targetPrice: 210
        }
      },
      {
        id: '2',
        type: 'stock_selection',
        title: '今日选股完成',
        content: '龙头战法策略已完成今日选股，共筛选出5只股票',
        timestamp: '2025-08-23 08:30:15',
        status: 'unread',
        metadata: {
          strategyName: '龙头战法',
          count: 5
        }
      },
      {
        id: '3',
        type: 'trading_plan',
        title: '交易计划买入提醒',
        content: '苹果回调买入计划已达到入场条件，建议执行买入操作',
        timestamp: '2025-08-23 09:45:20',
        status: 'read',
        relatedId: '1',
        metadata: {
          planId: '1',
          symbol: 'AAPL',
          price: 210.0
        }
      },
      {
        id: '4',
        type: 'price_alert',
        title: '价格提醒触发',
        content: '特斯拉(TSLA)股价已上涨至$195，突破关键阻力位',
        timestamp: '2025-08-22 14:20:10',
        status: 'read',
        relatedId: 'TSLA',
        metadata: {
          symbol: 'TSLA',
          price: 195.2,
          targetPrice: 195
        }
      },
      {
        id: '5',
        type: 'trading_plan',
        title: '交易计划止盈提醒',
        content: '特斯拉突破追涨计划已达到目标价位，建议考虑止盈',
        timestamp: '2025-08-22 15:30:45',
        status: 'read',
        relatedId: '2',
        metadata: {
          planId: '2',
          symbol: 'TSLA',
          price: 220.0
        }
      },
      {
        id: '6',
        type: 'strategy_result',
        title: '策略执行结果',
        content: '量化策略"均值回归"执行完成，收益率+2.3%',
        timestamp: '2025-08-22 16:00:00',
        status: 'read',
        metadata: {
          strategyName: '均值回归'
        }
      }
    ]
    setNotifications(mockNotifications)
  }, [])

  // 过滤通知
  const filteredNotifications = notifications.filter(notification => {
    const categoryMatch = selectedCategory === 'all' || notification.type === selectedCategory
    const statusMatch = filterStatus === 'all' || notification.status === filterStatus
    return categoryMatch && statusMatch
  })

  // 获取未读通知数量
  const unreadCount = notifications.filter(n => n.status === 'unread').length

  // 标记通知为已读
  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, status: 'read' as NotificationStatus } : n
      )
    )
  }

  // 处理通知点击 - 跳转到相应页面
  const handleNotificationClick = (notification: Notification) => {
    // 标记为已读
    markAsRead(notification.id)
    
    // 根据通知类型跳转到不同页面
    switch (notification.type) {
      case 'price_alert':
        if (notification.metadata?.symbol) {
          router.push(`/stock/${notification.metadata.symbol}`)
        }
        break
      case 'trading_plan':
        if (notification.metadata?.planId) {
          router.push(`/plan/${notification.metadata.planId}`)
        }
        break
      case 'stock_selection':
        // 跳转到选股结果页面（这里假设有一个选股结果页面）
        router.push('/stock-selection')
        break
      case 'strategy_result':
        // 跳转到策略详情页面
        router.push('/strategy')
        break
    }
  }

  // 获取分类统计
  const getCategoryCount = (type: NotificationType) => {
    return notifications.filter(n => n.type === type).length
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Bell className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">通知中心</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-sm">
                {unreadCount} 条未读
              </Badge>
            )}
          </div>
          <p className="text-gray-600">查看所有提醒通知和系统消息</p>
        </div>

        {/* 分类筛选 */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-3 mb-4">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('all')}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              全部通知
              <Badge variant="secondary" className="ml-1">
                {notifications.length}
              </Badge>
            </Button>
            
            {Object.entries(notificationCategories).map(([type, config]) => {
              const count = getCategoryCount(type as NotificationType)
              const IconComponent = config.icon
              
              return (
                <Button
                  key={type}
                  variant={selectedCategory === type ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(type as NotificationType)}
                  className="flex items-center gap-2"
                >
                  <IconComponent className="h-4 w-4" />
                  {config.label}
                  <Badge variant="secondary" className="ml-1">
                    {count}
                  </Badge>
                </Button>
              )
            })}
          </div>

          {/* 状态筛选 */}
          <div className="flex gap-3">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('all')}
            >
              全部状态
            </Button>
            <Button
              variant={filterStatus === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('unread')}
            >
              未读 ({notifications.filter(n => n.status === 'unread').length})
            </Button>
            <Button
              variant={filterStatus === 'read' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('read')}
            >
              已读 ({notifications.filter(n => n.status === 'read').length})
            </Button>
          </div>
        </div>

        {/* 通知列表 */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-500 mb-2">暂无通知</h3>
                <p className="text-gray-400">当前筛选条件下没有找到相关通知</p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map((notification) => {
              const config = notificationCategories[notification.type]
              const IconComponent = config.icon
              
              return (
                <Card
                  key={notification.id}
                  className={`transition-all duration-200 hover:shadow-md cursor-pointer ${
                    notification.status === 'unread' 
                      ? 'ring-2 ring-blue-200 bg-blue-50/50' 
                      : 'hover:bg-gray-50'
                  } ${config.borderColor}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* 图标 */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center`}>
                        <IconComponent className={`h-5 w-5 ${config.color}`} />
                      </div>
                      
                      {/* 内容 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900 truncate">
                                {notification.title}
                              </h3>
                              <Badge
                                variant="outline"
                                className={`text-xs ${config.color} ${config.borderColor}`}
                              >
                                {config.label}
                              </Badge>
                              {notification.status === 'unread' && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                              {notification.content}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>{notification.timestamp}</span>
                              {notification.metadata?.symbol && (
                                <span className="font-medium text-blue-600">
                                  {notification.metadata.symbol}
                                </span>
                              )}
                              {notification.metadata?.price && (
                                <span>
                                  ${notification.metadata.price}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* 箭头图标 */}
                          <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>

        {/* 全部标记为已读按钮 */}
        {unreadCount > 0 && (
          <div className="mt-8 text-center">
            <Button
              variant="outline"
              onClick={() => {
                setNotifications(prev => 
                  prev.map(n => ({ ...n, status: 'read' as NotificationStatus }))
                )
              }}
            >
              全部标记为已读
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}