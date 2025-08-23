'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout';
import { Plus, Eye } from 'lucide-react';

interface TradingPlan {
  id: number;
  ticker: string;
  name: string;
  type: string;
  status: string;
  entry: number;
  tp: number;
  sl: number;
  date: string;
  reason: string;
  notes: Array<{
    user: string;
    text: string;
    date: string;
    type: 'comment' | 'opinion';
  }>;
}

const mockPlans: TradingPlan[] = [
  {
    id: 1,
    ticker: 'AAPL',
    name: '苹果',
    type: '波段',
    status: '持仓中',
    entry: 210.50,
    tp: 230.00,
    sl: 205.00,
    date: '2025-08-20',
    reason: '周线突破，均线多头排列',
    notes: [
      { user: '大佬A', text: '认为该股有潜力达到$250，基本面强劲。', date: '2025-08-21', type: 'opinion' },
      { user: '自己', text: '价格已达第一目标位，上移止损。', date: '2025-08-22', type: 'comment' }
    ]
  },
  {
    id: 2,
    ticker: 'NVDA',
    name: '英伟达',
    type: '短期',
    status: '已止盈',
    entry: 125.80,
    tp: 135.00,
    sl: 122.00,
    date: '2025-08-15',
    reason: '财报后放量突破',
    notes: []
  },
  {
    id: 3,
    ticker: 'TSLA',
    name: '特斯拉',
    type: '波段',
    status: '待触发',
    entry: 180.00,
    tp: 200.00,
    sl: 175.00,
    date: '2025-08-23',
    reason: '箱体下沿支撑有效',
    notes: []
  }
];

export default function PlansPage() {
  const [plans] = useState<TradingPlan[]>(mockPlans);

  const getStatusColor = (status: string) => {
    const colors = {
      '持仓中': 'bg-warning text-white',
      '已止盈': 'bg-success text-white',
      '已止损': 'bg-danger text-white',
      '待触发': 'bg-bg-hover text-text-secondary'
    };
    return colors[status as keyof typeof colors] || 'bg-bg-hover text-text-secondary';
  };

  const handleCreatePlan = () => {
    // TODO: 打开创建计划模态框
    console.log('Create plan clicked');
  };

  const handleViewPlan = (planId: number) => {
    // TODO: 打开计划详情模态框
    console.log('View plan:', planId);
  };

  return (
    <AppLayout title="交易计划">
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-text-primary">交易计划管理</h3>
          <button 
            className="btn"
            onClick={handleCreatePlan}
          >
            <Plus className="w-4 h-4" />
            新建计划
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary">
                <th className="text-left py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  股票
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  类型
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  状态
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  开仓价
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  止盈/止损
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  创建日期
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr 
                  key={plan.id}
                  className="border-b border-border-primary hover:bg-bg-secondary transition-colors duration-200"
                >
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium text-text-primary">{plan.name}</div>
                      <div className="text-xs text-text-secondary">{plan.ticker}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-text-primary">
                    {plan.type}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(plan.status)}`}>
                      {plan.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-text-primary">
                    {plan.entry.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 font-mono text-text-primary">
                    {plan.tp.toFixed(2)} / {plan.sl.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-text-secondary">
                    {plan.date}
                  </td>
                  <td className="py-3 px-4">
                    <button 
                      onClick={() => handleViewPlan(plan.id)}
                      className="btn-secondary btn-sm"
                    >
                      <Eye className="w-4 h-4" />
                      详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
