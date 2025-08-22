'use client';

import React from 'react';
import { BarChart3, TrendingUp, Brain, ArrowRight, DollarSign, Activity, Target, Clock } from 'lucide-react';
import { MainModule } from './TopNavigation';

interface WelcomeDashboardProps {
  onModuleChange: (module: MainModule) => void;
}

export function WelcomeDashboard({ onModuleChange }: WelcomeDashboardProps) {
  return (
    <div>
      {/* 欢迎标题 */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: 'bold', 
          color: '#1f2937', 
          marginBottom: '16px' 
        }}>
          欢迎使用知行交易系统
        </h1>
        <p style={{ 
          fontSize: '18px', 
          color: '#6b7280', 
          maxWidth: '600px', 
          margin: '0 auto' 
        }}>
          专业的股票投资分析与交易管理平台，助您在投资路上知行合一
        </p>
      </div>

      {/* 统计卡片 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '24px',
        marginBottom: '48px'
      }}>
        {[
          { icon: DollarSign, title: '今日收益', value: '+1,234.56', change: '+2.3%', color: '#059669' },
          { icon: Activity, title: '持仓市值', value: '86,420.00', change: '+0.8%', color: '#3b82f6' },
          { icon: Target, title: '活跃计划', value: '8', change: '+2', color: '#7c3aed' },
          { icon: Clock, title: '交易天数', value: '127', change: '+1', color: '#ea580c' }
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                    {stat.title}
                  </p>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '4px' }}>
                    {stat.value}
                  </p>
                  <p style={{ fontSize: '14px', color: stat.color, fontWeight: '500' }}>
                    {stat.change}
                  </p>
                </div>
                <div style={{ 
                  padding: '12px', 
                  borderRadius: '8px', 
                  background: stat.color + '20',
                  color: stat.color
                }}>
                  <Icon size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 功能模块 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '32px',
        marginBottom: '48px'
      }}>
        {[
          {
            id: 'market' as MainModule,
            icon: BarChart3,
            title: '市场分析',
            description: '发现投资机会，分析市场趋势',
            features: ['股票筛选', '技术分析', '概念板块'],
            color: '#3b82f6'
          },
          {
            id: 'trading' as MainModule,
            icon: TrendingUp,
            title: '交易管理',
            description: '执行投资决策，管理持仓',
            features: ['交易计划', '仓位管理', '风险控制'],
            color: '#059669'
          },
          {
            id: 'insights' as MainModule,
            icon: Brain,
            title: '智能复盘',
            description: '学习总结，提升交易技能',
            features: ['交易回顾', '经验总结', '策略优化'],
            color: '#7c3aed'
          }
        ].map((module) => {
          const Icon = module.icon;
          return (
            <div 
              key={module.id}
              className="card"
              onClick={() => onModuleChange(module.id)}
              style={{ 
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
              }}
            >
              {/* 图标 */}
              <div style={{ 
                width: '60px', 
                height: '60px', 
                background: module.color + '20',
                color: module.color,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px'
              }}>
                <Icon size={28} />
              </div>

              {/* 标题和描述 */}
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: 'bold', 
                color: '#1f2937', 
                marginBottom: '8px' 
              }}>
                {module.title}
              </h3>
              <p style={{ 
                color: '#6b7280', 
                marginBottom: '20px',
                lineHeight: '1.6'
              }}>
                {module.description}
              </p>

              {/* 功能列表 */}
              <ul style={{ marginBottom: '24px' }}>
                {module.features.map((feature, index) => (
                  <li key={index} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    fontSize: '14px',
                    color: '#6b7280',
                    marginBottom: '8px'
                  }}>
                    <div style={{ 
                      width: '6px', 
                      height: '6px', 
                      background: '#d1d5db', 
                      borderRadius: '50%' 
                    }} />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* 操作区域 */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                paddingTop: '16px',
                borderTop: '1px solid #f3f4f6'
              }}>
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>
                  立即体验
                </span>
                <ArrowRight size={16} style={{ color: '#9ca3af' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 最近活动 */}
      <div className="card">
        <h2 style={{ 
          fontSize: '20px', 
          fontWeight: 'bold', 
          color: '#1f2937', 
          marginBottom: '24px' 
        }}>
          最近活动
        </h2>
        <div>
          {[
            { action: '创建交易计划', target: 'AAPL - 苹果公司', time: '2分钟前', color: '#059669' },
            { action: '更新止损价格', target: 'TSLA - 特斯拉', time: '15分钟前', color: '#3b82f6' },
            { action: '完成交易', target: 'MSFT - 微软', time: '1小时前', color: '#7c3aed' },
            { action: '添加关注股票', target: 'NVDA - 英伟达', time: '2小时前', color: '#ea580c' }
          ].map((activity, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              paddingBottom: '16px',
              marginBottom: '16px',
              borderBottom: index < 3 ? '1px solid #f3f4f6' : 'none'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '12px', 
                  height: '12px', 
                  background: activity.color, 
                  borderRadius: '50%' 
                }} />
                <div>
                  <p style={{ fontWeight: '500', color: '#1f2937', marginBottom: '2px' }}>
                    {activity.action}
                  </p>
                  <p style={{ fontSize: '14px', color: '#6b7280' }}>
                    {activity.target}
                  </p>
                </div>
              </div>
              <span style={{ fontSize: '14px', color: '#9ca3af' }}>
                {activity.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}