/**
 * 交易剧本服务
 * 管理交易剧本数据
 */

export interface TradingPlaybook {
  id: number;
  playbook_id: string;
  name: string;
  description: string;
  template: PlaybookTemplate;
  tags: string[];
  is_system_default: boolean;
  is_active: boolean;
  usage_count: number;
  performance: PlaybookPerformance;
  created_at: string;
  updated_at: string;
}

export interface PlaybookTemplate {
  buyingLogicTemplate: {
    technical: string;
    fundamental: string;
    news: string;
  };
  riskManagementTemplate: {
    stopLossRatio: number;
    takeProfitRatio: number;
  };
  recommendedEmotion: string;
  recommendedSource: string;
}

export interface PlaybookPerformance {
  totalTrades: number;
  winRate: number;
  avgPnLPercent: number;
  avgRiskRewardRatio: number;
  totalPnL: number;
}

const API_BASE_URL = 'http://localhost:3001/api/v1';

export class PlaybookService {
  /**
   * 获取所有交易剧本
   */
  static async getPlaybooks(): Promise<TradingPlaybook[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/playbooks`);
      if (!response.ok) {
        throw new Error('获取交易剧本列表失败');
      }
      const result = await response.json();
      return result.data.playbooks;
    } catch (error) {
      console.error('获取交易剧本列表失败:', error);
      throw error;
    }
  }

  /**
   * 创建交易剧本
   */
  static async createPlaybook(playbookData: {
    name: string;
    description?: string;
    template: PlaybookTemplate;
    tags?: string[];
    is_system_default?: boolean;
    performance?: PlaybookPerformance;
  }): Promise<TradingPlaybook> {
    try {
      const response = await fetch(`${API_BASE_URL}/playbooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(playbookData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '创建交易剧本失败');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('创建交易剧本失败:', error);
      throw error;
    }
  }

  /**
   * 更新交易剧本
   */
  static async updatePlaybook(playbookId: string, playbookData: Partial<{
    name: string;
    description: string;
    template: PlaybookTemplate;
    tags: string[];
    is_active: boolean;
    performance: PlaybookPerformance;
  }>): Promise<TradingPlaybook> {
    try {
      const response = await fetch(`${API_BASE_URL}/playbooks/${playbookId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(playbookData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '更新交易剧本失败');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('更新交易剧本失败:', error);
      throw error;
    }
  }

  /**
   * 删除交易剧本
   */
  static async deletePlaybook(playbookId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/playbooks/${playbookId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '删除交易剧本失败');
      }
    } catch (error) {
      console.error('删除交易剧本失败:', error);
      throw error;
    }
  }

  /**
   * 使用交易剧本（增加使用次数）
   */
  static async usePlaybook(playbookId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/playbooks/${playbookId}/use`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '使用交易剧本失败');
      }
    } catch (error) {
      console.error('使用交易剧本失败:', error);
      throw error;
    }
  }

  /**
   * 获取推荐的交易情绪类型
   */
  static getRecommendedEmotions(): Array<{
    value: string;
    label: string;
    description: string;
    color: string;
  }> {
    return [
      {
        value: 'CONFIDENT',
        label: '自信',
        description: '对交易机会有充分信心',
        color: '#10B981'
      },
      {
        value: 'CALM',
        label: '冷静',
        description: '保持理性和冷静的心态',
        color: '#3B82F6'
      },
      {
        value: 'CAUTIOUS',
        label: '谨慎',
        description: '需要谨慎观察和小心操作',
        color: '#F59E0B'
      },
      {
        value: 'PATIENT',
        label: '耐心',
        description: '需要耐心等待最佳时机',
        color: '#8B5CF6'
      }
    ];
  }

  /**
   * 获取推荐的信息来源类型
   */
  static getRecommendedSources(): Array<{
    value: string;
    label: string;
    description: string;
  }> {
    return [
      {
        value: 'SELF_ANALYSIS',
        label: '自主分析',
        description: '基于自己的技术和基本面分析'
      },
      {
        value: 'NEWS_MEDIA',
        label: '新闻媒体',
        description: '基于新闻和媒体报道'
      },
      {
        value: 'EXPERT_OPINION',
        label: '专家意见',
        description: '基于专家和分析师的观点'
      },
      {
        value: 'SOCIAL_SENTIMENT',
        label: '社交情绪',
        description: '基于社交媒体和市场情绪'
      },
      {
        value: 'INSTITUTIONAL_RESEARCH',
        label: '机构研究',
        description: '基于机构研究报告'
      }
    ];
  }

  /**
   * 获取剧本标签选项
   */
  static getPlaybookTags(): string[] {
    return [
      // 技术分析类
      '技术分析', '趋势跟踪', '均线系统', '突破', '回调', '支撑阻力',
      '形态分析', '量价分析', '动量指标', '震荡指标',
      
      // 基本面类
      '基本面分析', '价值投资', '成长投资', '财务分析', '行业分析',
      '估值分析', '业绩驱动', '政策受益',
      
      // 时间周期类
      '短线', '中线', '长线', '日内', '波段',
      
      // 市场类型类
      '牛市', '熊市', '震荡市', '题材炒作', '概念股',
      
      // 风险类型类
      '低风险', '中风险', '高风险', '稳健型', '激进型',
      
      // 策略类型类
      '追涨', '抄底', '高抛低吸', '网格交易', '定投策略'
    ];
  }

  /**
   * 获取剧本分类
   */
  static getPlaybookCategories(): Array<{
    value: string;
    label: string;
    description: string;
  }> {
    return [
      {
        value: 'trend_following',
        label: '趋势跟踪',
        description: '跟随市场趋势的交易策略'
      },
      {
        value: 'mean_reversion',
        label: '均值回归',
        description: '基于价格回归均值的策略'
      },
      {
        value: 'breakout',
        label: '突破策略',
        description: '基于价格突破的交易机会'
      },
      {
        value: 'pullback',
        label: '回调策略',
        description: '在趋势中寻找回调买入机会'
      },
      {
        value: 'momentum',
        label: '动量策略',
        description: '基于价格动量的交易策略'
      },
      {
        value: 'value',
        label: '价值投资',
        description: '基于基本面价值的长期投资'
      },
      {
        value: 'growth',
        label: '成长投资',
        description: '投资高成长性的公司'
      },
      {
        value: 'event_driven',
        label: '事件驱动',
        description: '基于特定事件的交易机会'
      }
    ];
  }

  /**
   * 计算风险收益比
   */
  static calculateRiskRewardRatio(stopLossRatio: number, takeProfitRatio: number): number {
    if (stopLossRatio <= 0) return 0;
    return takeProfitRatio / stopLossRatio;
  }

  /**
   * 格式化绩效数据
   */
  static formatPerformance(performance: PlaybookPerformance): {
    winRateText: string;
    winRateColor: string;
    pnlText: string;
    pnlColor: string;
    riskRewardText: string;
    riskRewardColor: string;
  } {
    const winRateColor = performance.winRate >= 60 ? '#10B981' : 
                        performance.winRate >= 40 ? '#F59E0B' : '#EF4444';
    
    const pnlColor = performance.avgPnLPercent >= 0 ? '#10B981' : '#EF4444';
    
    const riskRewardColor = performance.avgRiskRewardRatio >= 2 ? '#10B981' : 
                           performance.avgRiskRewardRatio >= 1 ? '#F59E0B' : '#EF4444';

    return {
      winRateText: `${performance.winRate.toFixed(1)}%`,
      winRateColor,
      pnlText: `${performance.avgPnLPercent >= 0 ? '+' : ''}${performance.avgPnLPercent.toFixed(2)}%`,
      pnlColor,
      riskRewardText: `1:${performance.avgRiskRewardRatio.toFixed(2)}`,
      riskRewardColor
    };
  }
}
