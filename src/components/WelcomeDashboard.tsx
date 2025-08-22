// 【知行交易】欢迎仪表盘 - 现代化首页
'use client';

import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Brain, 
  ArrowRight,
  Activity,
  DollarSign,
  Target,
  Clock
} from 'lucide-react';
import { MainModule } from './TopNavigation';

interface WelcomeDashboardProps {
  onModuleChange: (module: MainModule) => void;
}

export function WelcomeDashboard({ onModuleChange }: WelcomeDashboardProps) {
  const modules = [
    {
      id: 'market' as MainModule,
      name: '市场分析',
      description: '发现投资机会，分析市场趋势',
      icon: BarChart3,
      color: 'from-blue-500 to-cyan-500',
      features: ['股票筛选', '技术分析', '概念板块']
    },
    {
      id: 'trading' as MainModule,
      name: '交易管理',
      description: '执行投资决策，管理持仓',
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-500',
      features: ['交易计划', '仓位管理', '风险控制']
    },
    {
      id: 'insights' as MainModule,
      name: '智能复盘',
      description: '学习总结，提升交易技能',
      icon: Brain,
      color: 'from-purple-500 to-pink-500',
      features: ['交易回顾', '经验总结', '策略优化']
    }
  ];

  const stats = [
    {
      name: '今日收益',
      value: '+1,234.56',
      change: '+2.3%',
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      name: '持仓市值',
      value: '86,420.00',
      change: '+0.8%',
      icon: Activity,
      color: 'text-blue-600'
    },
    {
      name: '活跃计划',
      value: '8',
      change: '+2',
      icon: Target,
      color: 'text-purple-600'
    },
    {
      name: '交易天数',
      value: '127',
      change: '+1',
      icon: Clock,
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="space-y-8">
      {/* 欢迎区域 */}
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          欢迎使用知行交易系统
        </h1>
        <p className="text-lg text-slate-600 mb-8">
          专业的股票投资分析与交易管理平台，助您在投资路上知行合一
        </p>
      </div>

      {/* 快速统计 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">{stat.name}</p>
                <p className="text-2xl font-semibold text-slate-900 mt-1">{stat.value}</p>
                <p className={`text-sm font-medium ${stat.color} mt-1`}>{stat.change}</p>
              </div>
              <div className={`p-3 rounded-xl bg-slate-50 ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 功能模块卡片 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {modules.map((module) => (
          <div
            key={module.id}
            className="group bg-white rounded-2xl p-8 shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 cursor-pointer"
            onClick={() => onModuleChange(module.id)}
          >
            {/* 图标和渐变背景 */}
            <div className={`w-16 h-16 bg-gradient-to-br ${module.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
              <module.icon className="w-8 h-8 text-white" />
            </div>

            {/* 模块信息 */}
            <h3 className="text-xl font-semibold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
              {module.name}
            </h3>
            <p className="text-slate-600 mb-6 leading-relaxed">
              {module.description}
            </p>

            {/* 功能列表 */}
            <ul className="space-y-2 mb-6">
              {module.features.map((feature, index) => (
                <li key={index} className="text-sm text-slate-500 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                  {feature}
                </li>
              ))}
            </ul>

            {/* 操作按钮 */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-sm font-medium text-slate-600">立即体验</span>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        ))}
      </div>

      {/* 最近活动 */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
        <h2 className="text-xl font-semibold text-slate-900 mb-6">最近活动</h2>
        <div className="space-y-4">
          {[
            { action: '创建交易计划', target: 'AAPL - 苹果公司', time: '2分钟前', status: 'active' },
            { action: '更新止损价格', target: 'TSLA - 特斯拉', time: '15分钟前', status: 'updated' },
            { action: '完成交易', target: 'MSFT - 微软', time: '1小时前', status: 'completed' },
            { action: '添加关注股票', target: 'NVDA - 英伟达', time: '2小时前', status: 'added' },
          ].map((activity, index) => (
            <div key={index} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${
                  activity.status === 'active' ? 'bg-green-500' :
                  activity.status === 'updated' ? 'bg-blue-500' :
                  activity.status === 'completed' ? 'bg-purple-500' : 'bg-orange-500'
                }`} />
                <div>
                  <p className="font-medium text-slate-900">{activity.action}</p>
                  <p className="text-sm text-slate-500">{activity.target}</p>
                </div>
              </div>
              <span className="text-sm text-slate-400">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
