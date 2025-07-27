// 【知行交易】预设选股策略 - 专注EMA55回踩企稳策略
// 暂时只保留一个策略进行深度调试和完善

import { SelectionStrategy } from '@/types';

export const defaultStrategies: Omit<SelectionStrategy, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'EMA55回踩企稳策略',
    description: '主升浪后回踩EMA55不破，1小时级别企稳确认',
    category: 'pullback',
    conditions: {
      technical: [
        {
          type: 'indicator',
          parameter: 'main_uptrend',
          operator: '>=',
          value: 20,
          description: '前期主升浪涨幅超过20%'
        },
        {
          type: 'moving_average',
          parameter: 'ema55_support',
          operator: '>=',
          value: 0.97,
          description: '回踩EMA55不破（3%容错）'
        },
        {
          type: 'pattern',
          parameter: 'hourly_stabilization',
          operator: '=',
          value: 1,
          description: '1小时级别出现企稳信号'
        },
        {
          type: 'volume',
          parameter: 'pullback_volume_shrink',
          operator: '<=',
          value: 0.8,
          description: '回踩过程成交量萎缩'
        }
      ],
      fundamental: [],
      price: []
    },
    parameters: {
      timeframe: '1h',
      volumeThreshold: 0.8,
      priceChangeThreshold: -8.0,
      stabilizationHours: 4,
      emaLength: 55
    },
    isActive: true,
    isSystemDefault: true
  }
];

// 生成完整的策略数据（包含ID和时间戳）
export function generateDefaultStrategies(): SelectionStrategy[] {
  return defaultStrategies.map((strategy, index) => ({
    ...strategy,
    id: `ema55_strategy_${index + 1}`,
    createdAt: new Date(),
    updatedAt: new Date()
  }));
}


