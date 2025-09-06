'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, AlertCircle, Calendar, Brain, Eye, AlertTriangle, CheckCircle } from 'lucide-react'

interface Notification {
  id: string
  type: 'stock_selection' | 'price_alert' | 'trading_plan' | 'strategy'
  title: string
  message: string
  timestamp: string
  read: boolean
}

interface TodoItem {
  id: string
  type: 'review_selection' | 'confirm_alert' | 'update_plan' | 'check_strategy'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  completed: boolean
  dueDate?: string
}

export function NotificationCenter() {
  const [activeTab, setActiveTab] = useState<'notifications' | 'todos'>('notifications')
  
  // 这里可以从API获取真实数据，暂时使用少量示例数据
  const [notifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'stock_selection',
      title: '新股票入选',
      message: 'AAPL 符合龙头战法条件，已加入自选',
      timestamp: '2 分钟前',
      read: false
    }
  ])

  const [todos] = useState<TodoItem[]>([
    {
      id: '1',
      type: 'review_selection',
      title: '审核股票选择',
      description: '检查昨日新增的3只股票是否符合策略要求',
      priority: 'high',
      completed: false,
      dueDate: '今天'
    }
  ])

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'stock_selection': return <TrendingUp className="w-4 h-4" />
      case 'price_alert': return <AlertCircle className="w-4 h-4" />
      case 'trading_plan': return <Calendar className="w-4 h-4" />
      case 'strategy': return <Brain className="w-4 h-4" />
    }
  }

  const getTodoIcon = (type: TodoItem['type']) => {
    switch (type) {
      case 'review_selection': return <Eye className="w-4 h-4" />
      case 'confirm_alert': return <AlertTriangle className="w-4 h-4" />
      case 'update_plan': return <Calendar className="w-4 h-4" />
      case 'check_strategy': return <CheckCircle className="w-4 h-4" />
    }
  }

  const getPriorityColor = (priority: TodoItem['priority']) => {
    switch (priority) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-gray-600'
    }
  }

  return (
    <div className="relative">
      {/* 堆叠纸张效果的背景层 */}
      <div className="absolute top-1 left-1 w-full h-full bg-white border border-gray-200 rounded-lg shadow-sm transform rotate-1 z-0"></div>
      <div className="absolute top-0.5 left-0.5 w-full h-full bg-white border border-gray-200 rounded-lg shadow-sm transform -rotate-0.5 z-0"></div>
      
      {/* 主要内容卡片 */}
      <Card className="relative bg-white border-gray-300 shadow-lg z-10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-800">通知中心</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'notifications' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('notifications')}
                className="text-xs"
              >
                通知 {notifications.filter(n => !n.read).length > 0 && (
                  <Badge variant="destructive" className="ml-1 px-1 text-xs">
                    {notifications.filter(n => !n.read).length}
                  </Badge>
                )}
              </Button>
              <Button
                variant={activeTab === 'todos' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('todos')}
                className="text-xs"
              >
                待办 {todos.filter(t => !t.completed).length > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1 text-xs">
                    {todos.filter(t => !t.completed).length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {activeTab === 'notifications' ? (
            <div className="space-y-2">
              {notifications.length === 0 ? (
                <p className="text-center text-gray-500 py-4 text-sm">暂无通知</p>
              ) : (
                notifications.map((notification, index) => (
                  <div
                    key={notification.id}
                    className={`relative p-3 rounded-lg border transition-all hover:shadow-md ${
                      !notification.read 
                        ? 'bg-gradient-to-r from-blue-50 to-white border-blue-200 shadow-sm' 
                        : 'bg-gradient-to-r from-gray-50 to-white border-gray-200'
                    }`}
                    style={{
                      transform: `translateY(${index * -1}px)`,
                      zIndex: notifications.length - index
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1 rounded-full bg-white shadow-sm">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm text-gray-800">{notification.title}</p>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {notification.timestamp}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 leading-relaxed">{notification.message}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {todos.length === 0 ? (
                <p className="text-center text-gray-500 py-4 text-sm">暂无待办事项</p>
              ) : (
                todos.map((todo, index) => (
                  <div
                    key={todo.id}
                    className={`relative p-3 rounded-lg border transition-all hover:shadow-md ${
                      todo.completed 
                        ? 'bg-gradient-to-r from-green-50 to-white border-green-200 opacity-70' 
                        : 'bg-gradient-to-r from-white to-gray-50 border-gray-200 shadow-sm'
                    }`}
                    style={{
                      transform: `translateY(${index * -1}px)`,
                      zIndex: todos.length - index
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1 rounded-full bg-white shadow-sm">
                        {getTodoIcon(todo.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`font-medium text-sm ${todo.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                            {todo.title}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-xs ${getPriorityColor(todo.priority)}`}>
                              {todo.priority}
                            </Badge>
                            {todo.dueDate && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                {todo.dueDate}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 leading-relaxed">{todo.description}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
