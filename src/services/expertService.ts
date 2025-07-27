/**
 * 专家服务
 * 管理专家和专家意见数据
 */

export interface Expert {
  id: number;
  expert_id: string;
  name: string;
  title: string;
  credibility: number;
  specialties: string[];
  description: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpertOpinion {
  id: number;
  opinion_id: string;
  stock_code: string;
  expert_id: string;
  title: string;
  content: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  price_guidances: PriceGuidance[];
  chart_images: string[];
  published_at: string;
  source: string;
  tags: string[];
  is_active: boolean;
  priority: 'high' | 'medium' | 'low';
  is_bookmarked: boolean;
  created_at: string;
  updated_at: string;
}

export interface PriceGuidance {
  type: 'BUY_POINT' | 'TARGET_PRICE' | 'STOP_LOSS' | 'SUPPORT_LEVEL' | 'RESISTANCE_LEVEL';
  price: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  timeframe: string;
}

const API_BASE_URL = 'http://localhost:3001/api/v1';

export class ExpertService {
  /**
   * 获取所有专家
   */
  static async getExperts(): Promise<Expert[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/experts`);
      if (!response.ok) {
        throw new Error('获取专家列表失败');
      }
      const result = await response.json();
      return result.data.experts;
    } catch (error) {
      console.error('获取专家列表失败:', error);
      throw error;
    }
  }

  /**
   * 创建专家
   */
  static async createExpert(expertData: {
    name: string;
    title?: string;
    credibility?: number;
    specialties?: string[];
    description?: string;
    is_verified?: boolean;
  }): Promise<Expert> {
    try {
      const response = await fetch(`${API_BASE_URL}/experts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expertData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '创建专家失败');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('创建专家失败:', error);
      throw error;
    }
  }

  /**
   * 获取专家的意见
   */
  static async getExpertOpinions(expertId: string): Promise<{
    expert: Partial<Expert>;
    opinions: ExpertOpinion[];
    total: number;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/experts/${expertId}/opinions`);
      if (!response.ok) {
        throw new Error('获取专家意见失败');
      }
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('获取专家意见失败:', error);
      throw error;
    }
  }

  /**
   * 创建专家意见
   */
  static async createExpertOpinion(opinionData: {
    stock_code: string;
    expert_id: string;
    title: string;
    content: string;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    price_guidances?: PriceGuidance[];
    chart_images?: string[];
    published_at?: string;
    source?: string;
    tags?: string[];
    priority?: 'high' | 'medium' | 'low';
    is_bookmarked?: boolean;
  }): Promise<ExpertOpinion> {
    try {
      const response = await fetch(`${API_BASE_URL}/experts/opinions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(opinionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '创建专家意见失败');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('创建专家意见失败:', error);
      throw error;
    }
  }

  /**
   * 获取股票的专家意见
   */
  static async getStockExpertOpinions(stockCode: string): Promise<ExpertOpinion[]> {
    try {
      // 这里需要后端提供按股票代码查询意见的API
      // 暂时返回空数组
      return [];
    } catch (error) {
      console.error('获取股票专家意见失败:', error);
      throw error;
    }
  }

  /**
   * 获取专家专长标签
   */
  static getExpertSpecialtyTags(): string[] {
    return [
      '价值投资', '成长投资', '量化交易', '技术分析', '基本面分析',
      '宏观分析', '行业研究', '长期投资', '短线操作', '风险控制',
      '科技股', '消费股', '医药股', '金融股', '新能源', '人工智能',
      '白酒股', '房地产', '制造业', '互联网', '生物医药', '半导体'
    ];
  }

  /**
   * 获取意见标签
   */
  static getOpinionTags(): string[] {
    return [
      '技术分析', '基本面分析', '宏观分析', '行业分析', '财务分析',
      '估值分析', '风险提示', '买入推荐', '卖出建议', '持有观点',
      '短期观点', '中期观点', '长期观点', '业绩预期', '政策影响',
      '市场情绪', '资金流向', '机构观点', '散户情绪', '国际影响'
    ];
  }

  /**
   * 获取情绪类型
   */
  static getSentimentTypes(): Array<{
    value: 'bullish' | 'bearish' | 'neutral';
    label: string;
    color: string;
  }> {
    return [
      { value: 'bullish', label: '看涨', color: '#10B981' },
      { value: 'bearish', label: '看跌', color: '#EF4444' },
      { value: 'neutral', label: '中性', color: '#6B7280' }
    ];
  }

  /**
   * 获取价格指导类型
   */
  static getPriceGuidanceTypes(): Array<{
    value: string;
    label: string;
  }> {
    return [
      { value: 'BUY_POINT', label: '买入点' },
      { value: 'TARGET_PRICE', label: '目标价' },
      { value: 'STOP_LOSS', label: '止损价' },
      { value: 'SUPPORT_LEVEL', label: '支撑位' },
      { value: 'RESISTANCE_LEVEL', label: '阻力位' }
    ];
  }

  /**
   * 获取置信度类型
   */
  static getConfidenceTypes(): Array<{
    value: 'high' | 'medium' | 'low';
    label: string;
    color: string;
  }> {
    return [
      { value: 'high', label: '高', color: '#10B981' },
      { value: 'medium', label: '中', color: '#F59E0B' },
      { value: 'low', label: '低', color: '#EF4444' }
    ];
  }

  /**
   * 格式化专家可信度
   */
  static formatCredibility(credibility: number): {
    level: string;
    color: string;
  } {
    if (credibility >= 90) {
      return { level: '极高', color: '#10B981' };
    } else if (credibility >= 80) {
      return { level: '高', color: '#84CC16' };
    } else if (credibility >= 70) {
      return { level: '中等', color: '#F59E0B' };
    } else if (credibility >= 60) {
      return { level: '一般', color: '#F97316' };
    } else {
      return { level: '较低', color: '#EF4444' };
    }
  }

  /**
   * 格式化情绪
   */
  static formatSentiment(sentiment: string): {
    label: string;
    color: string;
    icon: string;
  } {
    switch (sentiment) {
      case 'bullish':
        return { label: '看涨', color: '#10B981', icon: '📈' };
      case 'bearish':
        return { label: '看跌', color: '#EF4444', icon: '📉' };
      case 'neutral':
        return { label: '中性', color: '#6B7280', icon: '➡️' };
      default:
        return { label: '未知', color: '#6B7280', icon: '❓' };
    }
  }
}
