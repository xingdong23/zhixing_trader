/**
 * 选股策略服务
 * 管理选股策略数据
 */

export interface SelectionStrategy {
  id: number;
  strategy_id: string;
  name: string;
  description: string;
  category: string;
  conditions: StrategyConditions;
  parameters: StrategyParameters;
  is_active: boolean;
  is_system_default: boolean;
  usage_count: number;
  success_rate: number;
  created_at: string;
  updated_at: string;
}

export interface StrategyConditions {
  technical: TechnicalCondition[];
  fundamental: FundamentalCondition[];
  price: PriceCondition[];
}

export interface TechnicalCondition {
  type: string;
  parameter: string;
  operator: string;
  value: number | string;
  description: string;
}

export interface FundamentalCondition {
  type: string;
  parameter: string;
  operator: string;
  value: number | string;
  description: string;
}

export interface PriceCondition {
  type: string;
  parameter: string;
  operator: string;
  value: number;
  description: string;
}

export interface StrategyParameters {
  timeframe?: string;
  volumeThreshold?: number;
  priceChangeThreshold?: number;
  stabilizationHours?: number;
  emaLength?: number;
  [key: string]: any;
}

export interface SelectionResult {
  stock_code: string;
  stock_name: string;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
}

const API_BASE_URL = 'http://localhost:3001/api/v1';

export class SelectionStrategyService {
  /**
   * 获取所有选股策略
   */
  static async getSelectionStrategies(): Promise<SelectionStrategy[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/selection-strategies`);
      if (!response.ok) {
        throw new Error('获取选股策略列表失败');
      }
      const result = await response.json();
      return result.data.strategies;
    } catch (error) {
      console.error('获取选股策略列表失败:', error);
      throw error;
    }
  }

  /**
   * 创建选股策略
   */
  static async createSelectionStrategy(strategyData: {
    name: string;
    description?: string;
    category: string;
    conditions: StrategyConditions;
    parameters?: StrategyParameters;
    is_system_default?: boolean;
  }): Promise<SelectionStrategy> {
    try {
      const response = await fetch(`${API_BASE_URL}/selection-strategies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(strategyData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '创建选股策略失败');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('创建选股策略失败:', error);
      throw error;
    }
  }

  /**
   * 更新选股策略
   */
  static async updateSelectionStrategy(strategyId: string, strategyData: Partial<{
    name: string;
    description: string;
    category: string;
    conditions: StrategyConditions;
    parameters: StrategyParameters;
    is_active: boolean;
    success_rate: number;
  }>): Promise<SelectionStrategy> {
    try {
      const response = await fetch(`${API_BASE_URL}/selection-strategies/${strategyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(strategyData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '更新选股策略失败');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('更新选股策略失败:', error);
      throw error;
    }
  }

  /**
   * 删除选股策略
   */
  static async deleteSelectionStrategy(strategyId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/selection-strategies/${strategyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '删除选股策略失败');
      }
    } catch (error) {
      console.error('删除选股策略失败:', error);
      throw error;
    }
  }

  /**
   * 执行选股策略
   */
  static async executeSelectionStrategy(strategyId: string): Promise<{
    strategy_id: string;
    strategy_name: string;
    execution_time: string;
    results: SelectionResult[];
    total_results: number;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/selection-strategies/${strategyId}/execute`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '执行选股策略失败');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('执行选股策略失败:', error);
      throw error;
    }
  }

  /**
   * 获取策略分类
   */
  static getStrategyCategories(): Array<{
    value: string;
    label: string;
    description: string;
  }> {
    return [
      {
        value: 'pullback',
        label: '回调策略',
        description: '在上升趋势中寻找回调买入机会'
      },
      {
        value: 'breakthrough',
        label: '突破策略',
        description: '基于价格突破的选股策略'
      },
      {
        value: 'pattern',
        label: '形态策略',
        description: '基于技术形态的选股策略'
      },
      {
        value: 'momentum',
        label: '动量策略',
        description: '基于价格动量的选股策略'
      },
      {
        value: 'value',
        label: '价值策略',
        description: '基于基本面价值的选股策略'
      },
      {
        value: 'growth',
        label: '成长策略',
        description: '基于成长性的选股策略'
      },
      {
        value: 'technical',
        label: '技术策略',
        description: '纯技术分析的选股策略'
      },
      {
        value: 'fundamental',
        label: '基本面策略',
        description: '基于基本面分析的选股策略'
      }
    ];
  }

  /**
   * 获取技术条件类型
   */
  static getTechnicalConditionTypes(): Array<{
    value: string;
    label: string;
    description: string;
  }> {
    return [
      {
        value: 'indicator',
        label: '技术指标',
        description: '基于技术指标的条件'
      },
      {
        value: 'moving_average',
        label: '移动平均线',
        description: '基于移动平均线的条件'
      },
      {
        value: 'pattern',
        label: '技术形态',
        description: '基于技术形态的条件'
      },
      {
        value: 'volume',
        label: '成交量',
        description: '基于成交量的条件'
      },
      {
        value: 'price_action',
        label: '价格行为',
        description: '基于价格行为的条件'
      }
    ];
  }

  /**
   * 获取操作符类型
   */
  static getOperatorTypes(): Array<{
    value: string;
    label: string;
  }> {
    return [
      { value: '>', label: '大于' },
      { value: '>=', label: '大于等于' },
      { value: '<', label: '小于' },
      { value: '<=', label: '小于等于' },
      { value: '=', label: '等于' },
      { value: '!=', label: '不等于' },
      { value: 'between', label: '介于' },
      { value: 'in', label: '包含于' },
      { value: 'not_in', label: '不包含于' }
    ];
  }

  /**
   * 获取时间周期选项
   */
  static getTimeframeOptions(): Array<{
    value: string;
    label: string;
  }> {
    return [
      { value: '1m', label: '1分钟' },
      { value: '5m', label: '5分钟' },
      { value: '15m', label: '15分钟' },
      { value: '30m', label: '30分钟' },
      { value: '1h', label: '1小时' },
      { value: '4h', label: '4小时' },
      { value: '1d', label: '日线' },
      { value: '1w', label: '周线' },
      { value: '1M', label: '月线' }
    ];
  }

  /**
   * 格式化成功率
   */
  static formatSuccessRate(successRate: number): {
    text: string;
    color: string;
    level: string;
  } {
    const rate = successRate * 100;
    
    if (rate >= 80) {
      return { text: `${rate.toFixed(1)}%`, color: '#10B981', level: '优秀' };
    } else if (rate >= 60) {
      return { text: `${rate.toFixed(1)}%`, color: '#84CC16', level: '良好' };
    } else if (rate >= 40) {
      return { text: `${rate.toFixed(1)}%`, color: '#F59E0B', level: '一般' };
    } else {
      return { text: `${rate.toFixed(1)}%`, color: '#EF4444', level: '较差' };
    }
  }

  /**
   * 格式化置信度
   */
  static formatConfidence(confidence: string): {
    label: string;
    color: string;
    icon: string;
  } {
    switch (confidence) {
      case 'high':
        return { label: '高', color: '#10B981', icon: '🔥' };
      case 'medium':
        return { label: '中', color: '#F59E0B', icon: '⚡' };
      case 'low':
        return { label: '低', color: '#EF4444', icon: '⚠️' };
      default:
        return { label: '未知', color: '#6B7280', icon: '❓' };
    }
  }

  /**
   * 验证策略条件
   */
  static validateStrategyConditions(conditions: StrategyConditions): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 检查是否至少有一个条件
    const totalConditions = 
      conditions.technical.length + 
      conditions.fundamental.length + 
      conditions.price.length;

    if (totalConditions === 0) {
      errors.push('至少需要设置一个选股条件');
    }

    // 验证技术条件
    conditions.technical.forEach((condition, index) => {
      if (!condition.type || !condition.parameter || !condition.operator) {
        errors.push(`技术条件 ${index + 1} 缺少必要字段`);
      }
    });

    // 验证基本面条件
    conditions.fundamental.forEach((condition, index) => {
      if (!condition.type || !condition.parameter || !condition.operator) {
        errors.push(`基本面条件 ${index + 1} 缺少必要字段`);
      }
    });

    // 验证价格条件
    conditions.price.forEach((condition, index) => {
      if (!condition.type || !condition.parameter || !condition.operator) {
        errors.push(`价格条件 ${index + 1} 缺少必要字段`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
