// 【知行交易】预设选股策略
// 这些策略代表了经过验证的选股方法，帮助用户快速发现投资机会

import { SelectionStrategy } from '@/types';

export const defaultStrategies: Omit<SelectionStrategy, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: '平台突破策略',
    description: '股价经过横盘整理后向上突破平台阻力位，伴随成交量放大',
    category: 'breakthrough',
    conditions: {
      technical: [
        {
          type: 'price_breakthrough',
          parameter: 'resistance_level',
          operator: '>',
          value: 1.02,
          description: '突破平台阻力位2%以上'
        },
        {
          type: 'volume',
          parameter: 'volume_ratio',
          operator: '>=',
          value: 2.0,
          description: '成交量放大至少2倍'
        },
        {
          type: 'pattern',
          parameter: 'consolidation_days',
          operator: '>=',
          value: 15,
          description: '横盘整理至少15个交易日'
        }
      ],
      fundamental: [],
      price: [
        {
          type: 'price_range',
          minValue: 5,
          maxValue: 500,
          description: '价格在合理区间内'
        }
      ]
    },
    parameters: {
      timeframe: '1d',
      volumeThreshold: 2.0,
      priceChangeThreshold: 2.0
    },
    isActive: true,
    isSystemDefault: true
  },

  {
    name: '均线突破策略',
    description: '股价向上突破重要均线（20日、60日），确认趋势转强',
    category: 'breakthrough',
    conditions: {
      technical: [
        {
          type: 'moving_average',
          parameter: 'ma20_cross',
          operator: 'cross_above',
          value: 1,
          description: '突破20日均线'
        },
        {
          type: 'moving_average',
          parameter: 'ma_alignment',
          operator: '=',
          value: 1,
          description: '均线多头排列'
        },
        {
          type: 'volume',
          parameter: 'volume_ratio',
          operator: '>=',
          value: 1.5,
          description: '成交量放大1.5倍以上'
        }
      ],
      fundamental: [],
      price: []
    },
    parameters: {
      timeframe: '1d',
      volumeThreshold: 1.5,
      priceChangeThreshold: 1.0
    },
    isActive: true,
    isSystemDefault: true
  },

  {
    name: '强势回调策略',
    description: '近期表现强势的股票出现短期回调，提供较好的上车机会',
    category: 'pullback',
    conditions: {
      technical: [
        {
          type: 'price_change',
          parameter: 'return_30d',
          operator: '>=',
          value: 15,
          description: '近30天涨幅超过15%'
        },
        {
          type: 'price_change',
          parameter: 'return_5d',
          operator: '<=',
          value: -5,
          description: '近5天回调5%以上'
        },
        {
          type: 'moving_average',
          parameter: 'ma20_support',
          operator: '>=',
          value: 0.98,
          description: '价格接近20日均线支撑'
        }
      ],
      fundamental: [
        {
          type: 'revenue_growth',
          operator: '>',
          value: 10,
          description: '营收增长超过10%'
        }
      ],
      price: []
    },
    parameters: {
      timeframe: '1d',
      volumeThreshold: 0.8,
      priceChangeThreshold: -5.0
    },
    isActive: true,
    isSystemDefault: true
  },

  {
    name: '杯柄形态策略',
    description: '识别标准的杯柄形态，等待突破颈线位的买入机会',
    category: 'pattern',
    conditions: {
      technical: [
        {
          type: 'pattern',
          parameter: 'cup_handle_pattern',
          operator: '=',
          value: 1,
          description: '形成标准杯柄形态'
        },
        {
          type: 'volume',
          parameter: 'handle_volume_decline',
          operator: '<=',
          value: 0.7,
          description: '柄部成交量萎缩'
        },
        {
          type: 'price_breakthrough',
          parameter: 'neckline_break',
          operator: '>',
          value: 1.01,
          description: '突破颈线位1%以上'
        }
      ],
      fundamental: [],
      price: []
    },
    parameters: {
      timeframe: '1d',
      volumeThreshold: 1.5,
      priceChangeThreshold: 1.0
    },
    isActive: true,
    isSystemDefault: true
  },

  {
    name: 'MACD金叉策略',
    description: 'MACD指标金叉，配合其他技术指标确认买入信号',
    category: 'indicator',
    conditions: {
      technical: [
        {
          type: 'indicator',
          parameter: 'macd_golden_cross',
          operator: '=',
          value: 1,
          description: 'MACD金叉'
        },
        {
          type: 'indicator',
          parameter: 'macd_histogram',
          operator: '>',
          value: 0,
          description: 'MACD柱状图转正'
        },
        {
          type: 'indicator',
          parameter: 'rsi',
          operator: '>',
          value: 50,
          description: 'RSI大于50'
        }
      ],
      fundamental: [],
      price: []
    },
    parameters: {
      timeframe: '1d',
      volumeThreshold: 1.2,
      priceChangeThreshold: 0.5
    },
    isActive: true,
    isSystemDefault: true
  },

  {
    name: '超卖反弹策略',
    description: '技术指标显示超卖后出现反弹信号，适合短期操作',
    category: 'indicator',
    conditions: {
      technical: [
        {
          type: 'indicator',
          parameter: 'rsi_oversold_recovery',
          operator: '=',
          value: 1,
          description: 'RSI从超卖区域回升'
        },
        {
          type: 'price_level',
          parameter: 'support_level',
          operator: '>=',
          value: 0.98,
          description: '价格接近重要支撑位'
        },
        {
          type: 'pattern',
          parameter: 'reversal_signal',
          operator: '=',
          value: 1,
          description: '出现反转K线信号'
        }
      ],
      fundamental: [],
      price: []
    },
    parameters: {
      timeframe: '1d',
      volumeThreshold: 1.0,
      priceChangeThreshold: 2.0
    },
    isActive: true,
    isSystemDefault: true
  },

  {
    name: '基本面优质策略',
    description: '基于基本面指标筛选优质成长股',
    category: 'fundamental',
    conditions: {
      technical: [],
      fundamental: [
        {
          type: 'roe',
          operator: '>',
          value: 15,
          description: 'ROE大于15%'
        },
        {
          type: 'revenue_growth',
          operator: '>',
          value: 20,
          description: '营收增长超过20%'
        },
        {
          type: 'pe_ratio',
          operator: '<',
          value: 30,
          description: 'PE小于30倍'
        }
      ],
      price: [
        {
          type: 'price_change',
          minValue: -20,
          maxValue: 10,
          description: '近期涨幅适中'
        }
      ]
    },
    parameters: {
      timeframe: '1d',
      volumeThreshold: 1.0,
      priceChangeThreshold: 0
    },
    isActive: true,
    isSystemDefault: true
  }
];

// 生成完整的策略数据（包含ID和时间戳）
export function generateDefaultStrategies(): SelectionStrategy[] {
  return defaultStrategies.map((strategy, index) => ({
    ...strategy,
    id: `default_strategy_${index + 1}`,
    createdAt: new Date(),
    updatedAt: new Date()
  }));
}
