// 【知行交易】简化版欢迎仪表盘 - 确保可见性
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
      color: 'blue',
      features: ['股票筛选', '技术分析', '概念板块']
    },
    {
      id: 'trading' as MainModule,
      name: '交易管理',
      description: '执行投资决策，管理持仓',
      icon: TrendingUp,
      color: 'green',
      features: ['交易计划', '仓位管理', '风险控制']
    },
    {
      id: 'insights' as MainModule,
      name: '智能复盘',
      description: '学习总结，提升交易技能',
      icon: Brain,
      color: 'purple',
      features: ['交易回顾', '经验总结', '策略优化']
    }
  ];

  const stats = [
    {
      name: '今日收益',
      value: '+1,234.56',
      change: '+2.3%',
      icon: DollarSign,
      color: 'green'
    },
    {
      name: '持仓市值',
      value: '86,420.00',
      change: '+0.8%',
      icon: Activity,
      color: 'blue'
    },
    {
      name: '活跃计划',
      value: '8',
      change: '+2',
      icon: Target,
      color: 'purple'
    },
    {
      name: '交易天数',
      value: '127',
      change: '+1',
      icon: Clock,
      color: 'orange'
    }
  ];

  return (
    <div className="w-full">
      {/* 欢迎区域 */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          欢迎使用知行交易系统
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          专业的股票投资分析与交易管理平台，助您在投资路上知行合一
        </p>
      </div>

      {/* 快速统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white p-6 rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className={`text-sm font-medium mt-1 ${
                  stat.color === 'green' ? 'text-green-600' :
                  stat.color === 'blue' ? 'text-blue-600' :
                  stat.color === 'purple' ? 'text-purple-600' : 'text-orange-600'
                }`}>
                  {stat.change}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${
                stat.color === 'green' ? 'bg-green-100 text-green-600' :
                stat.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                stat.color === 'purple' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'
              }`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 功能模块卡片 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {modules.map((module) => (
          <div
            key={module.id}
            className="bg-white p-8 rounded-lg border-2 border-gray-200 hover:border-blue-300 cursor-pointer transition-colors group"
            onClick={() => onModuleChange(module.id)}
          >
            {/* 图标 */}
            <div className={`w-16 h-16 rounded-lg flex items-center justify-center mb-6 ${
              module.color === 'blue' ? 'bg-blue-100 text-blue-600' :
              module.color === 'green' ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'
            }`}>
              <module.icon className="w-8 h-8" />
            </div>

            {/* 模块信息 */}
            <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
              {module.name}
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {module.description}
            </p>

            {/* 功能列表 */}
            <ul className="space-y-2 mb-6">
              {module.features.map((feature, index) => (
                <li key={index} className="text-sm text-gray-500 flex items-center">
                  <span className="w-2 h-2 bg-gray-300 rounded-full mr-3" />
                  {feature}
                </li>
              ))}
            </ul>

            {/* 操作按钮 */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <span className="text-sm font-medium text-gray-600">立即体验</span>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        ))}
      </div>

      {/* 最近活动 */}
      <div className="bg-white p-8 rounded-lg border-2 border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-6">最近活动</h2>
        <div className="space-y-4">
          {[
            { action: '创建交易计划', target: 'AAPL - 苹果公司', time: '2分钟前', status: 'green' },
            { action: '更新止损价格', target: 'TSLA - 特斯拉', time: '15分钟前', status: 'blue' },
            { action: '完成交易', target: 'MSFT - 微软', time: '1小时前', status: 'purple' },
            { action: '添加关注股票', target: 'NVDA - 英伟达', time: '2小时前', status: 'orange' },
          ].map((activity, index) => (
            <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-4 ${
                  activity.status === 'green' ? 'bg-green-500' :
                  activity.status === 'blue' ? 'bg-blue-500' :
                  activity.status === 'purple' ? 'bg-purple-500' : 'bg-orange-500'
                }`} />
                <div>
                  <p className="font-medium text-gray-900">{activity.action}</p>
                  <p className="text-sm text-gray-500">{activity.target}</p>
                </div>
              </div>
              <span className="text-sm text-gray-400">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}