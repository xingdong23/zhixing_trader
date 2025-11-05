'use client'

import { useState, useEffect, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, AlertCircle, Calendar, Brain, Eye, AlertTriangle, CheckCircle, Bell } from 'lucide-react'

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
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭通知面板
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])
  
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
    <div ref={containerRef} className="relative z-50">
      {/* 通知按钮 */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-5 h-5" />
        {(notifications.filter(n => !n.read).length > 0 || todos.filter(t => !t.completed).length > 0) && (
          <Badge variant="destructive" className="absolute -top-1 -right-1 px-1 min-w-[1.25rem] h-5 text-xs">
            {notifications.filter(n => !n.read).length + todos.filter(t => !t.completed).length}
          </Badge>
        )}
      </Button>
      
      {/* 悬浮通知面板 */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 z-50">
          {/* 简单的堆叠纸张背景效果 */}
          <div className="absolute top-1 left-1 w-full h-full bg-gray-100 rounded-lg shadow-sm"></div>
          <div className="absolute top-0.5 left-0.5 w-full h-full bg-gray-50 rounded-lg shadow-sm"></div>
          
          {/* 主卡片 */}
          <Card className="relative bg-white shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>通知中心</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={activeTab === 'notifications' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('notifications')}
                  >
                    通知 {notifications.filter(n => !n.read).length > 0 && (
                      <Badge variant="destructive" className="ml-1 px-1">
                        {notifications.filter(n => !n.read).length}
                      </Badge>
                    )}
                  </Button>
                  <Button
                    variant={activeTab === 'todos' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('todos')}
                  >
                    待办 {todos.filter(t => !t.completed).length > 0 && (
                      <Badge variant="secondary" className="ml-1 px-1">
                        {todos.filter(t => !t.completed).length}
                      </Badge>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {activeTab === 'notifications' ? (
                <div className="space-y-3">
                  {notifications.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">暂无通知</p>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 border rounded-lg ${!notification.read ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm">{notification.title}</p>
                              <span className="text-xs text-gray-500">{notification.timestamp}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {todos.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">暂无待办事项</p>
                  ) : (
                    todos.map((todo) => (
                      <div
                        key={todo.id}
                        className={`p-3 border rounded-lg ${todo.completed ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {getTodoIcon(todo.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`font-medium text-sm ${todo.completed ? 'line-through text-gray-500' : ''}`}>
                                {todo.title}
                              </p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={`text-xs ${getPriorityColor(todo.priority)}`}>
                                  {todo.priority}
                                </Badge>
                                {todo.dueDate && (
                                  <span className="text-xs text-gray-500">{todo.dueDate}</span>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{todo.description}</p>
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
      )}
    </div>
  )
}
