// 【知行交易】策略相关类型定义

import { Stock, TradingEmotion, InformationSource } from './index';

// 技术条件
export interface TechnicalCondition {
  type: 'price_breakthrough' | 'moving_average' | 'volume' | 'indicator' | 'pattern';
  parameter: string;           // 参数名称，如 'ma20', 'rsi', 'volume_ratio'
  operator: '>' | '<' | '>=' | '<=' | '=' | 'cross_above' | 'cross_below';
  value: number;
  description: string;         // 条件描述
}

// 基本面条件
export interface FundamentalCondition {
  type: 'pe_ratio' | 'pb_ratio' | 'roe' | 'revenue_growth' | 'profit_growth';
  operator: '>' | '<' | '>=' | '<=' | '=';
  value: number;
  description: string;
}

// 价格条件
export interface PriceCondition {
  type: 'price_range' | 'price_change' | 'price_level';
  minValue?: number;
  maxValue?: number;
  description: string;
}

// 选股策略
export interface SelectionStrategy {
  id: string;
  name: string;                // 策略名称
  description: string;         // 策略描述
  category: 'breakthrough' | 'pullback' | 'pattern' | 'indicator' | 'fundamental';

  // 策略条件
  conditions: {
    technical: TechnicalCondition[];
    fundamental: FundamentalCondition[];
    price: PriceCondition[];
  };

  // 策略参数
  parameters: {
    timeframe: string;         // 时间周期
    volumeThreshold: number;   // 成交量阈值
    priceChangeThreshold: number; // 价格变化阈值

    // 均线相关
    entanglementDays?: number; // 均线缠绕天数
    pullbackDays?: number;     // 回踩确认天数

    // EMA相关
    stabilizationHours?: number; // 企稳确认小时数
    emaLength?: number;        // EMA周期长度

    // 趋势线相关
    trendlineDays?: number;    // 趋势线形成天数

    // 其他参数
    confirmationPeriods?: number; // 确认周期数
    tolerancePercent?: number;    // 容错百分比
  };

  // 策略状态
  isActive: boolean;           // 是否启用
  isSystemDefault: boolean;    // 是否为系统预设

  // 元数据
  createdAt: Date;
  updatedAt: Date;
}

// 选中的股票
export interface SelectedStock {
  stock: Stock;
  score: number;               // 匹配分数 (0-100)
  reasons: string[];           // 选中原因
  suggestedAction: string;     // 建议操作
  targetPrice?: number;        // 目标价格
  stopLoss?: number;          // 建议止损价
  confidence: 'high' | 'medium' | 'low'; // 信心度
}

// 每日选股结果
export interface DailySelection {
  id: string;
  date: Date;

  // 策略执行结果
  strategyResults: {
    strategyId: string;
    strategyName: string;
    category: string;
    selectedStocks: SelectedStock[];
    totalCount: number;
  }[];

  // 汇总信息
  summary: {
    totalStocks: number;
    totalStrategies: number;
    topOpportunities: SelectedStock[]; // 最佳机会（跨策略）
  };

  createdAt: Date;
}

// 交易剧本
export interface TradingPlaybook {
  id: string;
  name: string;              // 剧本名称
  description: string;       // 剧本描述
  createdAt: Date;
  updatedAt: Date;
  
  // 剧本模板
  template: {
    buyingLogicTemplate: {
      technical: string;
      fundamental: string;
      news: string;
    };
    riskManagementTemplate: {
      stopLossRatio: number;   // 止损比例
      takeProfitRatio: number; // 止盈比例
    };
    recommendedEmotion: TradingEmotion;
    recommendedSource: InformationSource;
  };
  
  // 剧本表现
  performance: {
    totalTrades: number;       // 总交易次数
    winRate: number;          // 胜率
    avgPnLPercent: number;    // 平均盈亏百分比
    avgRiskRewardRatio: number; // 平均风险收益比
    totalPnL: number;         // 总盈亏
  };
  
  // 标签和分类
  tags: string[];
  
  // 系统标识
  isSystemDefault: boolean;
}

// 交易推荐
export interface TradingRecommendation {
  id: string;
  stockId: string;
  stockSymbol: string;
  stockName: string;

  // 推荐类型
  type: 'daily' | 'weekly';
  action: 'buy' | 'sell' | 'hold';

  // 价格信息
  currentPrice: number;
  entryPrice: number;          // 建议买入价
  stopLoss: number;           // 止损价
  takeProfit: number[];       // 止盈价格（可多个）

  // 分析内容
  reason: string;             // 操作理由
  technicalAnalysis: string;  // 技术面分析
  riskLevel: 'low' | 'medium' | 'high';  // 风险等级

  // 操作建议
  positionSize: string;       // 建议仓位大小
  timeframe: string;          // 持有时间框架

  // 时间信息
  publishedAt: Date;
  expiresAt: Date;           // 建议过期时间
  status: 'active' | 'expired' | 'executed' | 'cancelled';
  confidence: number;        // 信心度 1-10

  // 执行表现
  performance?: {
    entryExecuted: boolean;
    entryPrice?: number;
    currentReturn?: number;
    maxReturn?: number;
    maxDrawdown?: number;
  };
}