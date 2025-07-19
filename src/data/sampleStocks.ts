// 【知行交易】示例股票数据
// 提供一些示例股票数据用于演示和测试

import { Stock } from '@/types';

export const sampleStocks: Omit<Stock, 'id' | 'addedAt' | 'updatedAt'>[] = [
  // 美股科技股
  {
    symbol: 'AAPL',
    name: '苹果公司',
    market: 'US',
    tags: {
      industry: ['消费电子', '科技硬件'],
      fundamentals: ['基本面优秀', '财务健康', '龙头企业'],
      marketCap: 'large',
      watchLevel: 'high'
    },
    currentPrice: 185.25,
    priceChange: 2.15,
    priceChangePercent: 1.17,
    volume: 45230000,
    notes: '全球最大的科技公司，iPhone业务稳定'
  },
  
  {
    symbol: 'TSLA',
    name: '特斯拉',
    market: 'US',
    tags: {
      industry: ['新能源汽车', '电动车'],
      fundamentals: ['高成长', '创新能力强'],
      marketCap: 'large',
      watchLevel: 'high'
    },
    currentPrice: 248.50,
    priceChange: -3.20,
    priceChangePercent: -1.27,
    volume: 89450000,
    notes: '电动车龙头，自动驾驶技术领先'
  },

  {
    symbol: 'NVDA',
    name: '英伟达',
    market: 'US',
    tags: {
      industry: ['半导体', 'AI芯片', '人工智能'],
      fundamentals: ['基本面优秀', '高成长', '技术领先'],
      marketCap: 'large',
      watchLevel: 'high'
    },
    currentPrice: 875.30,
    priceChange: 15.80,
    priceChangePercent: 1.84,
    volume: 32100000,
    notes: 'AI芯片龙头，受益于AI浪潮'
  },

  {
    symbol: 'MSFT',
    name: '微软',
    market: 'US',
    tags: {
      industry: ['软件', '云计算', '人工智能'],
      fundamentals: ['基本面优秀', '财务健康', '龙头企业'],
      marketCap: 'large',
      watchLevel: 'high'
    },
    currentPrice: 420.15,
    priceChange: 5.25,
    priceChangePercent: 1.27,
    volume: 28900000,
    notes: '云计算和AI领域的重要玩家'
  },

  {
    symbol: 'GOOGL',
    name: '谷歌A',
    market: 'US',
    tags: {
      industry: ['互联网', '搜索引擎', '人工智能'],
      fundamentals: ['基本面优秀', '现金流强劲'],
      marketCap: 'large',
      watchLevel: 'medium'
    },
    currentPrice: 165.80,
    priceChange: -1.45,
    priceChangePercent: -0.87,
    volume: 19800000,
    notes: '搜索和广告业务稳定，AI投入巨大'
  },

  // 新兴科技股
  {
    symbol: 'PLTR',
    name: 'Palantir',
    market: 'US',
    tags: {
      industry: ['大数据', '人工智能', '政府服务'],
      fundamentals: ['高成长', '技术领先'],
      marketCap: 'mid',
      watchLevel: 'medium'
    },
    currentPrice: 25.40,
    priceChange: 0.85,
    priceChangePercent: 3.46,
    volume: 45600000,
    notes: '大数据分析平台，政府和企业客户'
  },

  {
    symbol: 'RKLB',
    name: 'Rocket Lab',
    market: 'US',
    tags: {
      industry: ['航空航天', '卫星发射'],
      fundamentals: ['高成长', '创新技术'],
      marketCap: 'small',
      watchLevel: 'medium'
    },
    currentPrice: 8.75,
    priceChange: 0.32,
    priceChangePercent: 3.80,
    volume: 12300000,
    notes: '小型卫星发射服务提供商'
  },

  // 量子计算概念
  {
    symbol: 'IBM',
    name: 'IBM',
    market: 'US',
    tags: {
      industry: ['量子计算', '云计算', '企业服务'],
      fundamentals: ['转型中', '技术积累深厚'],
      marketCap: 'large',
      watchLevel: 'low'
    },
    currentPrice: 195.60,
    priceChange: 2.10,
    priceChangePercent: 1.08,
    volume: 8900000,
    notes: '量子计算技术领先，但整体业务转型中'
  },

  {
    symbol: 'IONQ',
    name: 'IonQ',
    market: 'US',
    tags: {
      industry: ['量子计算'],
      fundamentals: ['早期阶段', '技术潜力大'],
      marketCap: 'small',
      watchLevel: 'medium'
    },
    currentPrice: 12.30,
    priceChange: -0.45,
    priceChangePercent: -3.53,
    volume: 2100000,
    notes: '纯量子计算公司，技术路线独特'
  },

  // 核能概念
  {
    symbol: 'CCJ',
    name: 'Cameco',
    market: 'US',
    tags: {
      industry: ['核能', '铀矿'],
      fundamentals: ['资源稀缺', '核能复兴'],
      marketCap: 'mid',
      watchLevel: 'medium'
    },
    currentPrice: 45.80,
    priceChange: 1.25,
    priceChangePercent: 2.81,
    volume: 5600000,
    notes: '全球最大的铀生产商之一'
  },

  // 生物医药
  {
    symbol: 'MRNA',
    name: 'Moderna',
    market: 'US',
    tags: {
      industry: ['生物医药', 'mRNA技术'],
      fundamentals: ['技术领先', '管线丰富'],
      marketCap: 'mid',
      watchLevel: 'medium'
    },
    currentPrice: 85.40,
    priceChange: -2.15,
    priceChangePercent: -2.46,
    volume: 7800000,
    notes: 'mRNA疫苗技术平台，多个在研项目'
  },

  // 清洁能源
  {
    symbol: 'ENPH',
    name: 'Enphase Energy',
    market: 'US',
    tags: {
      industry: ['太阳能', '清洁能源', '储能'],
      fundamentals: ['高成长', '技术领先'],
      marketCap: 'mid',
      watchLevel: 'medium'
    },
    currentPrice: 125.70,
    priceChange: 3.45,
    priceChangePercent: 2.82,
    volume: 3200000,
    notes: '太阳能逆变器和储能系统领导者'
  }
];

// 生成完整的股票数据（包含ID和时间戳）
export function generateSampleStocks(): Stock[] {
  return sampleStocks.map((stock, index) => ({
    ...stock,
    id: `stock_${stock.symbol.toLowerCase()}_${index + 1}`,
    addedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // 随机过去30天内
    updatedAt: new Date()
  }));
}

// 行业标签选项
export const industryTags = [
  '人工智能', '量子计算', '核能', '新能源汽车', '太阳能', '风能',
  '半导体', '芯片设计', '消费电子', '软件', '云计算', '大数据',
  '生物医药', 'mRNA技术', '基因治疗', '医疗器械',
  '航空航天', '卫星通信', '无人机', '空中出租车',
  '互联网', '电商', '社交媒体', '游戏', '流媒体',
  '金融科技', '数字货币', '区块链', '支付',
  '新材料', '锂电池', '储能', '氢能源'
];

// 基本面标签选项
export const fundamentalTags = [
  '基本面优秀', '财务健康', '高成长', '价值低估', '龙头企业',
  '技术领先', '创新能力强', '现金流强劲', '盈利稳定', '分红稳定',
  '管理层优秀', '护城河深厚', '市场份额领先', '品牌价值高',
  '转型中', '早期阶段', '技术潜力大', '政策受益', '资源稀缺'
];
