'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout';
import { Plus } from 'lucide-react';

interface Strategy {
  id: string;
  name: string;
  type: string;
  description: string;
  script: string;
  notes: Array<{ text: string; date: string }>;
  cases: Array<{ title: string; img: string }>;
  applications: Array<{ text: string; date: string }>;
  rules: string[];
}

const mockStrategies: Strategy[] = [
  {
    id: 's1',
    name: '龙头战法',
    type: '短线策略',
    description: '寻找市场最强板块的领涨股，在首次回调时介入。',
    script: `// 1. 识别最强板块
const strongest_sector = find_strongest_sector(last_5_days);

// 2. 在板块中找到领涨股
const leader_stock = find_sector_leader(strongest_sector);

// 3. 等待首次回调信号
if (is_first_pullback(leader_stock, '5-day-ma')) {
  execute_buy(leader_stock, '20% of capital');
}`,
    notes: [{ text: '核心是识别真正的板块效应，而非个股行情。', date: '2025-08-20' }],
    cases: [{ title: '2025年AI行情启动', img: '/placeholder-chart.png' }],
    applications: [{ text: '大佬A在最近的访谈中强调了跟随市场合力的重要性，与此策略思想一致。', date: '2025-08-22' }],
    rules: ['趋势向上', '科技龙头']
  },
  {
    id: 's2',
    name: '趋势突破',
    type: '波段策略',
    description: '监控股票价格是否有效突破关键阻力位（如年线、前期高点）。',
    script: `// 监控股票池
for (stock in watchlist) {
  // 检查是否突破年线
  if (cross_above(stock.price, stock.ma(250))) {
    // 确认成交量放大
    if (stock.volume > stock.avg_volume(30) * 1.5) {
      execute_buy(stock, '15% of capital');
    }
  }
}`,
    notes: [],
    cases: [],
    applications: [],
    rules: ['周线突破']
  },
  {
    id: 's3',
    name: '熊市抗跌精选',
    type: '长线策略',
    description: '寻找在大盘下跌期间，依然保持强势或率先企稳的股票。',
    script: `// 1. 定义大盘下跌周期
const bear_market = market_index.is_down_20_percent_from_peak();

// 2. 筛选相对强势股
if (bear_market) {
  const strong_stocks = find_relative_strength(watchlist, market_index, '90_days');
  // 3. 在强势股中寻找买点
  recommend(strong_stocks);
}`,
    notes: [],
    cases: [],
    applications: [],
    rules: ['价值投资']
  }
];

export default function StrategiesPage() {
  const [strategies] = useState<Strategy[]>(mockStrategies);

  const handleCreateStrategy = () => {
    // TODO: 打开创建策略模态框
    console.log('Create strategy clicked');
  };

  const handleViewStrategy = (strategyId: string) => {
    // TODO: 打开策略详情模态框
    console.log('View strategy:', strategyId);
  };

  return (
    <AppLayout title="策略管理">
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-text-primary">策略管理</h3>
          <button 
            className="btn"
            onClick={handleCreateStrategy}
          >
            <Plus className="w-4 h-4" />
            新建策略
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {strategies.map((strategy) => (
            <div 
              key={strategy.id}
              className="
                relative bg-bg-primary border border-border-primary rounded-xl p-4 
                transition-all duration-200 hover:-translate-y-1 hover:shadow-lg cursor-pointer
              "
              onClick={() => handleViewStrategy(strategy.id)}
            >
              {/* 策略类型标签 */}
              <div className="absolute top-4 right-4">
                <span className="px-2 py-1 text-xs bg-primary text-white rounded-md">
                  {strategy.type}
                </span>
              </div>

              {/* 策略内容 */}
              <div className="pr-16">
                <h4 className="text-lg font-semibold text-primary mb-2">
                  {strategy.name}
                </h4>
                <p className="text-sm text-text-secondary mb-4 line-clamp-3">
                  {strategy.description}
                </p>
                
                <button className="btn-secondary btn-sm w-full">
                  查看详情
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
