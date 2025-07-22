// 【知行交易】示例专家数据
// 提供一些知名投资专家的基础信息

import { Expert, ExpertOpinion, PriceGuidanceType } from '@/types';

export const sampleExperts: Omit<Expert, 'id' | 'createdAt'>[] = [
  {
    name: '巴菲特',
    title: '股神·价值投资大师',
    credibility: 95,
    specialties: ['价值投资', '长期投资', '基本面分析'],
    description: '伯克希尔·哈撒韦公司CEO，全球最成功的价值投资者之一',
    isVerified: true
  },
  
  {
    name: '段永平',
    title: '步步高创始人·投资家',
    credibility: 90,
    specialties: ['价值投资', '消费股', '科技股'],
    description: '步步高、OPPO、vivo创始人，网易、苹果等重仓投资者',
    isVerified: true
  },
  
  {
    name: '张磊',
    title: '高瓴资本创始人',
    credibility: 88,
    specialties: ['成长投资', '科技股', '医疗健康'],
    description: '高瓴资本创始人兼CEO，专注长期价值投资',
    isVerified: true
  },
  
  {
    name: '林园',
    title: '私募基金经理',
    credibility: 82,
    specialties: ['医药股', '消费股', '价值投资'],
    description: '知名私募基金经理，擅长医药和消费领域投资',
    isVerified: true
  },
  
  {
    name: '但斌',
    title: '东方港湾投资管理公司董事长',
    credibility: 80,
    specialties: ['白酒股', '消费股', '长期投资'],
    description: '东方港湾投资管理公司董事长，茅台等白酒股坚定持有者',
    isVerified: true
  },
  
  {
    name: '徐翔',
    title: '量化交易专家',
    credibility: 75,
    specialties: ['量化交易', '技术分析', '短线操作'],
    description: '知名量化交易专家，擅长技术分析和短线操作',
    isVerified: false
  },
  
  {
    name: '李大霄',
    title: '英大证券首席经济学家',
    credibility: 70,
    specialties: ['宏观分析', '市场预测', '蓝筹股'],
    description: '英大证券首席经济学家，经常发表市场观点',
    isVerified: true
  },
  
  {
    name: '任泽平',
    title: '经济学家',
    credibility: 78,
    specialties: ['宏观经济', '房地产', '新能源'],
    description: '知名经济学家，对宏观经济和行业趋势有深入研究',
    isVerified: true
  }
];

// 生成完整的专家数据
export function generateSampleExperts(): Expert[] {
  return sampleExperts.map((expert, index) => ({
    ...expert,
    id: `expert_${index + 1}`,
    createdAt: new Date()
  }));
}

// 示例专家意见数据
export const sampleExpertOpinions: Omit<ExpertOpinion, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    stockId: 'stock_aapl_1',
    expertId: 'expert_1', // 巴菲特
    title: '苹果公司长期价值依然突出',
    content: '苹果公司拥有强大的品牌护城河和忠实的用户群体。尽管iPhone销量可能面临周期性波动，但服务业务的持续增长为公司提供了稳定的现金流。建议长期持有，短期波动不必过分关注。',
    sentiment: 'bullish',
    priceGuidances: [
      {
        type: PriceGuidanceType.BUY_POINT,
        price: 170,
        confidence: 'high',
        reasoning: '相对于其现金流和品牌价值，当前估值合理',
        timeframe: '长期持有'
      },
      {
        type: PriceGuidanceType.TARGET_PRICE,
        price: 220,
        confidence: 'medium',
        reasoning: '基于未来3年的业务增长预期',
        timeframe: '3年内'
      }
    ],
    chartImages: [],
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2天前
    source: '伯克希尔股东大会',
    tags: ['价值投资', '长期持有', '基本面分析'],
    isActive: true,
    priority: 'high',
    isBookmarked: false
  },
  
  {
    stockId: 'stock_tsla_2',
    expertId: 'expert_3', // 张磊
    title: '特斯拉：电动车革命的领导者',
    content: '特斯拉不仅是一家汽车公司，更是一家科技公司。其在电池技术、自动驾驶、能源存储等领域的创新能力将为长期增长提供动力。当前估值虽然较高，但考虑到其技术领先优势和市场前景，仍具备投资价值。',
    sentiment: 'bullish',
    priceGuidances: [
      {
        type: PriceGuidanceType.BUY_POINT,
        price: 200,
        confidence: 'medium',
        reasoning: '技术创新和市场领导地位支撑估值',
        timeframe: '1-2年'
      },
      {
        type: PriceGuidanceType.STOP_LOSS,
        price: 150,
        confidence: 'high',
        reasoning: '跌破关键技术支撑位需要重新评估',
        timeframe: '短期'
      }
    ],
    chartImages: [],
    publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5天前
    source: '高瓴资本年度报告',
    tags: ['成长投资', '科技创新', '新能源'],
    isActive: true,
    priority: 'high',
    isBookmarked: true
  },
  
  {
    stockId: 'stock_nvda_3',
    expertId: 'expert_2', // 段永平
    title: 'NVIDIA：AI时代的核心受益者',
    content: 'NVIDIA在AI芯片领域的技术领先优势明显，随着AI应用的普及，对高性能计算芯片的需求将持续增长。公司的护城河深厚，短期估值虽高，但长期价值值得关注。',
    sentiment: 'bullish',
    priceGuidances: [
      {
        type: PriceGuidanceType.TARGET_PRICE,
        price: 1000,
        confidence: 'medium',
        reasoning: 'AI市场爆发式增长的受益者',
        timeframe: '2-3年'
      },
      {
        type: PriceGuidanceType.SUPPORT_LEVEL,
        price: 700,
        confidence: 'high',
        reasoning: '重要技术支撑位，跌破需谨慎',
        timeframe: '短期'
      }
    ],
    chartImages: [],
    publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1天前
    source: '投资者交流会',
    tags: ['AI概念', '技术领先', '长期价值'],
    isActive: true,
    priority: 'high',
    isBookmarked: false
  }
];

// 生成完整的专家意见数据
export function generateSampleExpertOpinions(): ExpertOpinion[] {
  return sampleExpertOpinions.map((opinion, index) => ({
    ...opinion,
    id: `opinion_${index + 1}`,
    createdAt: new Date(opinion.publishedAt),
    updatedAt: new Date()
  }));
}

// 专家专长标签
export const expertSpecialtyTags = [
  '价值投资', '成长投资', '量化交易', '技术分析', '基本面分析',
  '宏观分析', '行业研究', '长期投资', '短线操作', '风险控制',
  '科技股', '消费股', '医药股', '金融股', '新能源', '人工智能',
  '白酒股', '房地产', '制造业', '互联网', '生物医药', '半导体'
];

// 意见标签
export const opinionTags = [
  '技术分析', '基本面分析', '宏观分析', '行业分析', '财务分析',
  '估值分析', '风险提示', '买入推荐', '卖出建议', '持有观点',
  '短期观点', '中期观点', '长期观点', '业绩预期', '政策影响',
  '市场情绪', '资金流向', '机构观点', '散户情绪', '国际影响'
];
