import { Concept } from '@/types';

/**
 * 示例概念数据
 * 用于演示概念标签系统功能
 */
export const sampleConcepts: Omit<Concept, 'id' | 'createdAt' | 'updatedAt' | 'stockIds' | 'stockCount'>[] = [
  {
    name: '新能源汽车',
    description: '电动汽车、混合动力汽车等新能源汽车相关公司',
    color: '#10B981'
  },
  {
    name: '传统汽车',
    description: '传统燃油汽车制造商',
    color: '#6B7280'
  },
  {
    name: '人工智能',
    description: 'AI技术、机器学习、深度学习相关公司',
    color: '#8B5CF6'
  },
  {
    name: '芯片半导体',
    description: '半导体设计、制造、设备相关公司',
    color: '#3B82F6'
  },
  {
    name: '云计算',
    description: '云服务、云基础设施相关公司',
    color: '#06B6D4'
  },
  {
    name: '社交媒体',
    description: '社交网络、内容平台相关公司',
    color: '#EC4899'
  },
  {
    name: '电商平台',
    description: '电子商务、在线零售平台',
    color: '#F59E0B'
  },
  {
    name: '金融科技',
    description: '数字支付、区块链、金融服务技术',
    color: '#EF4444'
  },
  {
    name: '生物医药',
    description: '生物技术、制药、医疗设备公司',
    color: '#84CC16'
  },
  {
    name: '清洁能源',
    description: '太阳能、风能、储能等清洁能源',
    color: '#F97316'
  },
  {
    name: '游戏娱乐',
    description: '游戏开发、娱乐内容、流媒体',
    color: '#6366F1'
  },
  {
    name: '航空航天',
    description: '航空、航天、卫星通信相关',
    color: '#14B8A6'
  }
];

/**
 * 概念与股票的映射关系
 * 基于股票代码建立概念关联
 */
export const conceptStockMappings: Record<string, string[]> = {
  '新能源汽车': ['TSLA', 'NIO', 'XPEV', 'LI', 'RIVN', 'LCID'],
  '传统汽车': ['F', 'GM', 'STLA', 'TM'],
  '人工智能': ['NVDA', 'GOOGL', 'MSFT', 'META', 'AMZN', 'TSLA'],
  '芯片半导体': ['NVDA', 'AMD', 'INTC', 'TSM', 'QCOM', 'AVGO'],
  '云计算': ['AMZN', 'MSFT', 'GOOGL', 'CRM', 'ORCL'],
  '社交媒体': ['META', 'SNAP', 'PINS', 'TWTR'],
  '电商平台': ['AMZN', 'SHOP', 'EBAY', 'ETSY'],
  '金融科技': ['SQ', 'PYPL', 'COIN', 'SOFI'],
  '生物医药': ['MRNA', 'PFE', 'JNJ', 'ABBV', 'GILD'],
  '清洁能源': ['ENPH', 'SEDG', 'FSLR', 'NEE'],
  '游戏娱乐': ['NFLX', 'DIS', 'EA', 'ATVI', 'TTWO'],
  '航空航天': ['BA', 'LMT', 'RTX', 'NOC', 'GD']
};

/**
 * 初始化概念数据
 * 创建示例概念并建立与股票的关联关系
 */
export function initializeSampleConcepts(): void {
  // 这个函数将在ConceptService中实现
  // 用于在首次使用时创建示例数据
}

/**
 * 根据股票代码获取推荐的概念
 */
export function getRecommendedConceptsForStock(symbol: string): string[] {
  const recommendedConcepts: string[] = [];
  
  for (const [conceptName, stockSymbols] of Object.entries(conceptStockMappings)) {
    if (stockSymbols.includes(symbol)) {
      recommendedConcepts.push(conceptName);
    }
  }
  
  return recommendedConcepts;
}

/**
 * 获取概念的推荐颜色
 */
export function getConceptColor(conceptName: string): string {
  const concept = sampleConcepts.find(c => c.name === conceptName);
  return concept?.color || '#6B7280';
}

/**
 * 检查是否为热门概念
 */
export function isHotConcept(conceptName: string): boolean {
  const hotConcepts = ['新能源汽车', '人工智能', '芯片半导体', '云计算'];
  return hotConcepts.includes(conceptName);
}

/**
 * 获取概念的详细描述
 */
export function getConceptDescription(conceptName: string): string {
  const concept = sampleConcepts.find(c => c.name === conceptName);
  return concept?.description || '';
}

/**
 * 按类别分组概念
 */
export function getConceptsByCategory(): Record<string, string[]> {
  return {
    '科技类': ['人工智能', '芯片半导体', '云计算', '社交媒体', '电商平台'],
    '汽车类': ['新能源汽车', '传统汽车'],
    '能源类': ['清洁能源'],
    '金融类': ['金融科技'],
    '医疗类': ['生物医药'],
    '娱乐类': ['游戏娱乐'],
    '工业类': ['航空航天']
  };
}

/**
 * 获取概念的投资热度评分 (1-10)
 */
export function getConceptHotness(conceptName: string): number {
  const hotnessMap: Record<string, number> = {
    '人工智能': 10,
    '新能源汽车': 9,
    '芯片半导体': 8,
    '云计算': 8,
    '清洁能源': 7,
    '生物医药': 7,
    '金融科技': 6,
    '电商平台': 6,
    '社交媒体': 5,
    '游戏娱乐': 5,
    '航空航天': 4,
    '传统汽车': 3
  };
  
  return hotnessMap[conceptName] || 5;
}

/**
 * 获取相关概念推荐
 */
export function getRelatedConcepts(conceptName: string): string[] {
  const relatedMap: Record<string, string[]> = {
    '新能源汽车': ['清洁能源', '芯片半导体', '人工智能'],
    '人工智能': ['芯片半导体', '云计算', '新能源汽车'],
    '芯片半导体': ['人工智能', '云计算', '新能源汽车'],
    '云计算': ['人工智能', '芯片半导体', '电商平台'],
    '电商平台': ['云计算', '金融科技', '社交媒体'],
    '金融科技': ['电商平台', '云计算'],
    '生物医药': ['人工智能', '云计算'],
    '清洁能源': ['新能源汽车'],
    '社交媒体': ['电商平台', '游戏娱乐'],
    '游戏娱乐': ['社交媒体', '云计算'],
    '航空航天': ['芯片半导体', '人工智能'],
    '传统汽车': ['新能源汽车']
  };
  
  return relatedMap[conceptName] || [];
}
