'use client';

import React from 'react';
import { AppLayout } from '@/components/layout';

interface StatCard {
  title: string;
  value: string;
  color?: 'success' | 'danger' | 'primary';
}

const statsData: StatCard[] = [
  { title: '总收益率', value: '+25.8%', color: 'success' },
  { title: '胜率', value: '68%', color: 'primary' },
  { title: '平均盈亏比', value: '2.1', color: 'primary' },
  { title: '最大回撤', value: '-8.2%', color: 'danger' }
];

const goodPoints = [
  '在趋势股票上的止盈策略执行到位，捕获了大部分利润。',
  '对"龙头战法"模式的识别准确率较高。',
  '风险控制意识增强，及时止损避免了更大损失。',
  '选股质量有所提升，重点关注基本面优秀的公司。'
];

const badPoints = [
  '在震荡行情中容易追高，导致不必要亏损。',
  '对"新能源"板块的交易存在情绪化倾向，建议严格按计划执行。',
  '仓位管理需要优化，单只股票仓位过重。',
  '缺乏对宏观经济环境变化的及时反应。'
];

export default function ReviewPage() {
  const getStatColor = (color?: string) => {
    switch (color) {
      case 'success': return 'text-success';
      case 'danger': return 'text-danger';
      case 'primary': return 'text-primary';
      default: return 'text-text-primary';
    }
  };

  return (
    <AppLayout title="交易复盘">
      <div className="space-y-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsData.map((stat, index) => (
            <div key={index} className="card text-center">
              <h4 className="text-sm font-medium text-text-secondary mb-2">
                {stat.title}
              </h4>
              <p className={`text-2xl font-bold ${getStatColor(stat.color)}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* 账户净值曲线 */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-text-primary">账户净值曲线</h3>
          </div>
          <div className="h-80 bg-bg-primary rounded-lg border border-border-primary p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-text-secondary">图表功能开发中...</p>
              <p className="text-sm text-text-tertiary mt-2">将集成 ApexCharts 显示详细的净值走势</p>
            </div>
          </div>
        </div>

        {/* AI 分析结果 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 做得好的点 */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-text-primary">做得好的点 (AI分析)</h3>
            </div>
            <ul className="space-y-3">
              {goodPoints.map((point, index) => (
                <li key={index} className="flex items-start gap-3 py-2 border-b border-border-primary last:border-b-0">
                  <span className="text-success text-lg">✅</span>
                  <span className="text-text-primary text-sm leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 待改进的点 */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-text-primary">待改进的点 (AI分析)</h3>
            </div>
            <ul className="space-y-3">
              {badPoints.map((point, index) => (
                <li key={index} className="flex items-start gap-3 py-2 border-b border-border-primary last:border-b-0">
                  <span className="text-danger text-lg">❌</span>
                  <span className="text-text-primary text-sm leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
