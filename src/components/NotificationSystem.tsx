// 【知行交易】通知与提醒系统 - 场外监督员
// 实现价格警报、心态警报、复盘提醒等功能

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { 
  TradingPlan, 
  TradeRecord, 
  TradingEmotion,
  AppState 
} from '@/types';
import { 
  Bell, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Brain, 
  Target,
  X,
  Settings,
  Volume2,
  VolumeX
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'price' | 'emotion' | 'review' | 'discipline';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  isRead: boolean;
  actionUrl?: string;
  relatedPlanId?: string;
}

interface NotificationSystemProps {
  activePlans: TradingPlan[];
  activeRecords: TradeRecord[];
  settings: AppState['settings'];
  onUpdateSettings: (settings: Partial<AppState['settings']>) => void;
}

export function NotificationSystem({ 
  activePlans, 
  activeRecords, 
  settings, 
  onUpdateSettings 
}: NotificationSystemProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // 生成通知
  useEffect(() => {
    const newNotifications = generateNotifications(activePlans, activeRecords);
    setNotifications(prev => {
      const existingIds = new Set(prev.map(n => n.id));
      const uniqueNew = newNotifications.filter(n => !existingIds.has(n.id));
      return [...prev, ...uniqueNew].slice(-20); // 保留最近20条
    });
  }, [activePlans, activeRecords]);

  // 模拟价格更新检查
  useEffect(() => {
    if (!settings.notificationsEnabled) return;

    const interval = setInterval(() => {
      activePlans.forEach(plan => {
        // 模拟价格检查
        const entryPrice = plan.positionLayers?.[0]?.targetPrice || 100;
        const currentPrice = entryPrice * (1 + (Math.random() - 0.5) * 0.1);

        // 接近止损警报
        if (Math.abs(currentPrice - plan.globalStopLoss) / entryPrice < 0.02) {
          addNotification({
            id: `price_stop_${plan.id}_${Date.now()}`,
            type: 'price',
            title: '止损价格警报',
            message: `${plan.symbolName} 当前价格 ¥${currentPrice.toFixed(2)} 接近止损价 ¥${plan.globalStopLoss.toFixed(2)}`,
            severity: 'warning',
            timestamp: new Date(),
            isRead: false,
            relatedPlanId: plan.id
          });
        }

        // 接近止盈警报
        const takeProfitPrice = plan.takeProfitLayers?.[0]?.targetPrice || entryPrice * 1.1;
        if (Math.abs(currentPrice - takeProfitPrice) / entryPrice < 0.02) {
          addNotification({
            id: `price_profit_${plan.id}_${Date.now()}`,
            type: 'price',
            title: '止盈价格警报',
            message: `${plan.symbolName} 当前价格 ¥${currentPrice.toFixed(2)} 接近止盈价 ¥${takeProfitPrice.toFixed(2)}`,
            severity: 'success',
            timestamp: new Date(),
            isRead: false,
            relatedPlanId: plan.id
          });
        }
      });
    }, 30000); // 每30秒检查一次

    return () => clearInterval(interval);
  }, [activePlans, settings.notificationsEnabled]);

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 20));
    
    // 浏览器通知
    if (settings.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico'
      });
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        onUpdateSettings({ notificationsEnabled: true });
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'price': return <Target className="w-4 h-4" />;
      case 'emotion': return <Brain className="w-4 h-4" />;
      case 'review': return <Clock className="w-4 h-4" />;
      case 'discipline': return <AlertTriangle className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getNotificationColor = (severity: Notification['severity']) => {
    switch (severity) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  return (
    <>
      {/* 通知铃铛按钮 */}
      <div className="fixed top-4 right-4 z-50">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow border border-gray-200"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
          
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow border border-gray-200"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="fixed top-16 right-4 z-50 w-80">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  通知设置
                </span>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">启用通知</span>
                <button
                  onClick={() => {
                    if (!settings.notificationsEnabled) {
                      requestNotificationPermission();
                    } else {
                      onUpdateSettings({ notificationsEnabled: false });
                    }
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    settings.notificationsEnabled 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {settings.notificationsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  纪律锁定冷却时间 (分钟)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={settings.disciplineLockCooldown}
                  onChange={(e) => onUpdateSettings({ 
                    disciplineLockCooldown: parseInt(e.target.value) || 30 
                  })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">自动生成洞察</span>
                <input
                  type="checkbox"
                  checked={settings.autoGenerateInsights}
                  onChange={(e) => onUpdateSettings({ autoGenerateInsights: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 通知面板 */}
      {showNotifications && (
        <div className="fixed top-16 right-4 z-50 w-96 max-h-96 overflow-hidden">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Bell className="w-5 h-5 mr-2" />
                  通知中心 ({unreadCount})
                </span>
                <div className="flex items-center space-x-2">
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAll}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      清空
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>暂无通知</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => markAsRead(notification.id)}
                        className={`p-3 border-l-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                          getNotificationColor(notification.severity)
                        } ${!notification.isRead ? 'bg-opacity-100' : 'bg-opacity-50'}`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold truncate">
                              {notification.title}
                            </h4>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              {new Date(notification.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

// 生成通知的核心逻辑
function generateNotifications(
  activePlans: TradingPlan[], 
  activeRecords: TradeRecord[]
): Notification[] {
  const notifications: Notification[] = [];
  const now = new Date();

  // 检查是否有需要复盘的交易
  const unReviewedRecords = activeRecords.filter(record => 
    record.status === 'closed' && 
    !record.tradingSummary && 
    record.lastExitTime && now.getTime() - record.lastExitTime.getTime() > 24 * 60 * 60 * 1000 // 超过24小时未复盘
  );

  if (unReviewedRecords.length > 0) {
    notifications.push({
      id: `review_reminder_${now.getTime()}`,
      type: 'review',
      title: '复盘提醒',
      message: `您有 ${unReviewedRecords.length} 笔交易尚未复盘，及时的复盘是成长的关键。`,
      severity: 'warning',
      timestamp: now,
      isRead: false
    });
  }

  // 检查FOMO情绪警告
  const recentFomoPlans = activePlans.filter(plan => 
    plan.emotion === 'fomo' && 
    now.getTime() - plan.createdAt.getTime() < 60 * 60 * 1000 // 1小时内
  );

  if (recentFomoPlans.length >= 2) {
    notifications.push({
      id: `emotion_warning_${now.getTime()}`,
      type: 'emotion',
      title: '情绪警告',
      message: '您最近的交易情绪似乎有些急躁，建议休息一下，回顾您的交易原则。',
      severity: 'error',
      timestamp: now,
      isRead: false
    });
  }

  // 检查纪律锁定提醒
  const lockedPlans = activePlans.filter(plan => plan.disciplineLocked);
  if (lockedPlans.length > 0) {
    notifications.push({
      id: `discipline_locked_${now.getTime()}`,
      type: 'discipline',
      title: '纪律锁定提醒',
      message: `您有 ${lockedPlans.length} 个交易计划处于纪律锁定状态，修改需要冷静期确认。`,
      severity: 'info',
      timestamp: now,
      isRead: false
    });
  }

  return notifications;
}
