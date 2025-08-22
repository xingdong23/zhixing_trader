// 【知行交易】现代化首页仪表板
// 专业金融系统主页面

'use client';

import React from 'react';
import { BarChart3, TrendingUp, Brain, ArrowRight, DollarSign, Activity, Target, Clock, Zap, TrendingDown } from 'lucide-react';
import { MainModule } from './TopNavigation';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { cn } from '@/utils/cn';

interface WelcomeDashboardProps {
  onModuleChange: (module: MainModule) => void;
}

export function WelcomeDashboard({ onModuleChange }: WelcomeDashboardProps) {
  // 模拟数据
  const statsData = [
    { 
      icon: DollarSign, 
      title: '今日收益', 
      value: '+1,234.56', 
      change: '+2.3%', 
      isPositive: true,
      subtitle: '昨日收益 +823.45'
    },
    { 
      icon: Activity, 
      title: '总资产', 
      value: '186,420.00', 
      change: '+0.8%', 
      isPositive: true,
      subtitle: '可用资金 45,678.90'
    },
    { 
      icon: Target, 
      title: '活跃计划', 
      value: '8', 
      change: '+2', 
      isPositive: true,
      subtitle: '待执行 3个'
    },
    { 
      icon: Clock, 
      title: '交易天数', 
      value: '127', 
      change: '+1', 
      isPositive: true,
      subtitle: '连续盈利 12天'
    }
  ];

  const moduleData = [
    {
      id: 'market' as MainModule,
      icon: BarChart3,
      title: '市场分析',
      description: '智能选股与市场数据分析，发现投资机会',
      features: ['策略选股', '技术分析', '概念板块', '市场监控'],
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-500/10 to-cyan-500/10'
    },
    {
      id: 'trading' as MainModule,
      icon: TrendingUp,
      title: '交易管理',
      description: '交易计划制定与执行，精准管理每一笔交易',
      features: ['交易计划', '仓位管理', '风险控制', '实时监控'],
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-500/10 to-emerald-500/10'
    },
    {
      id: 'insights' as MainModule,
      icon: Brain,
      title: '智能复盘',
      description: '交易结果分析与策略优化，提升交易技能',
      features: ['交易回顾', '盈亏分析', '策略优化', '经验总结'],
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-500/10 to-pink-500/10'
    }
  ];

  const recentActivities = [
    { action: '执行交易计划', target: '贵州茅台 (600519)', time: '2分钟前', type: 'success' },
    { action: '触发止损预警', target: '中国平安 (601318)', time: '15分钟前', type: 'warning' },
    { action: '完成盈利卖出', target: '招商银行 (600036)', time: '1小时前', type: 'success' },
    { action: '新增关注股票', target: '比亚迪 (002594)', time: '2小时前', type: 'info' }
  ];

  return (
    <div className="space-y-8">
      {/* 欢迎标题 */}
      <div className="text-center py-12 relative">
        {/* 背景装饰 */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-success/5 rounded-2xl"></div>
        
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">欢迎使用知行交易</span>
          </h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
            专业的量化交易系统，让每一次投资都有据可依
          </p>
          
          {/* 快速操作按钮 */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button 
              variant="primary" 
              size="lg" 
              leftIcon={<Zap className="w-5 h-5" />}
              onClick={() => onModuleChange('market')}
            >
              开始选股
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => onModuleChange('trading')}
            >
              查看交易
            </Button>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} variant="gradient" className="group hover:scale-105 transition-transform duration-200">
              <CardContent padding="md">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-text-secondary mb-1">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-text-primary mb-1 number">
                      {stat.value}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-sm font-medium',
                        stat.isPositive ? 'status-success' : 'status-danger'
                      )}>
                        {stat.change}
                      </span>
                      {stat.isPositive ? (
                        <TrendingUp className="w-4 h-4 status-success" />
                      ) : (
                        <TrendingDown className="w-4 h-4 status-danger" />
                      )}
                    </div>
                    <p className="text-xs text-text-tertiary mt-2">
                      {stat.subtitle}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-bg-tertiary rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Icon className="w-6 h-6 text-text-secondary group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 功能模块 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {moduleData.map((module) => {
          const Icon = module.icon;
          return (
            <Card 
              key={module.id}
              interactive
              className="group cursor-pointer overflow-hidden relative"
              onClick={() => onModuleChange(module.id)}
            >
              {/* 背景渐变 */}
              <div className={cn(
                'absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-20 rounded-full blur-2xl transition-opacity group-hover:opacity-30',
                module.bgGradient
              )}></div>
              
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br',
                    module.gradient
                  )}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <CardTitle size="lg" className="group-hover:text-primary transition-colors">
                      {module.title}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-text-secondary mb-6 leading-relaxed">
                  {module.description}
                </p>
                
                <div className="space-y-3 mb-6">
                  {module.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      <span className="text-sm text-text-secondary">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-border-secondary">
                  <span className="text-sm font-medium text-text-secondary group-hover:text-primary transition-colors">
                    立即体验
                  </span>
                  <ArrowRight className="w-5 h-5 text-text-tertiary group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 最近活动 */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle size="lg">最近活动</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => {
              const typeColors = {
                success: 'bg-success text-bg-primary',
                warning: 'bg-warning text-bg-primary',
                info: 'bg-primary text-bg-primary',
                danger: 'bg-danger text-white'
              };
              
              return (
                <div key={index} className="flex items-center justify-between py-3 px-1 hover:bg-bg-hover rounded-lg transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      typeColors[activity.type as keyof typeof typeColors]
                    )}></div>
                    <div>
                      <p className="font-medium text-text-primary">{activity.action}</p>
                      <p className="text-sm text-text-secondary">{activity.target}</p>
                    </div>
                  </div>
                  <span className="text-sm text-text-tertiary">{activity.time}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}