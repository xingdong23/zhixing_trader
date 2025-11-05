// Mock股票数据

export interface MockStock {
  id: number;
  symbol: string;
  name: string;
  market?: string;
  group_name?: string;
  concepts?: string[];
  updated_at?: string;
  price?: number | null;
  change_percent?: number | null;
}

export const mockStocks: MockStock[] = [
  {
    id: 1,
    symbol: "AAPL",
    name: "苹果公司",
    market: "NASDAQ",
    group_name: "科技股",
    concepts: ["消费电子", "人工智能", "移动支付"],
    price: 182.30,
    change_percent: 2.15,
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    symbol: "TSLA",
    name: "特斯拉",
    market: "NASDAQ",
    group_name: "新能源",
    concepts: ["电动车", "自动驾驶", "储能"],
    price: 258.50,
    change_percent: -1.85,
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    symbol: "NVDA",
    name: "英伟达",
    market: "NASDAQ",
    group_name: "科技股",
    concepts: ["芯片", "人工智能", "云计算"],
    price: 495.20,
    change_percent: 3.42,
    updated_at: new Date().toISOString(),
  },
  {
    id: 4,
    symbol: "MSFT",
    name: "微软",
    market: "NASDAQ",
    group_name: "科技股",
    concepts: ["云计算", "办公软件", "人工智能"],
    price: 378.50,
    change_percent: 1.25,
    updated_at: new Date().toISOString(),
  },
  {
    id: 5,
    symbol: "META",
    name: "Meta Platforms",
    market: "NASDAQ",
    group_name: "科技股",
    concepts: ["社交媒体", "虚拟现实", "广告"],
    price: 342.80,
    change_percent: -0.65,
    updated_at: new Date().toISOString(),
  },
  {
    id: 6,
    symbol: "GOOGL",
    name: "谷歌",
    market: "NASDAQ",
    group_name: "科技股",
    concepts: ["搜索引擎", "云计算", "人工智能"],
    price: 140.25,
    change_percent: 0.85,
    updated_at: new Date().toISOString(),
  },
  {
    id: 7,
    symbol: "AMZN",
    name: "亚马逊",
    market: "NASDAQ",
    group_name: "科技股",
    concepts: ["电商", "云计算", "物流"],
    price: 178.90,
    change_percent: 1.50,
    updated_at: new Date().toISOString(),
  },
  {
    id: 8,
    symbol: "AMD",
    name: "超威半导体",
    market: "NASDAQ",
    group_name: "科技股",
    concepts: ["芯片", "处理器", "数据中心"],
    price: 152.30,
    change_percent: 2.80,
    updated_at: new Date().toISOString(),
  },
  {
    id: 9,
    symbol: "BABA",
    name: "阿里巴巴",
    market: "NYSE",
    group_name: "中概股",
    concepts: ["电商", "云计算", "金融科技"],
    price: 78.45,
    change_percent: -2.30,
    updated_at: new Date().toISOString(),
  },
  {
    id: 10,
    symbol: "NFLX",
    name: "Netflix",
    market: "NASDAQ",
    group_name: "科技股",
    concepts: ["流媒体", "内容制作", "订阅服务"],
    price: 485.60,
    change_percent: 1.95,
    updated_at: new Date().toISOString(),
  },
  {
    id: 11,
    symbol: "DIS",
    name: "迪士尼",
    market: "NYSE",
    group_name: "消费股",
    concepts: ["娱乐", "主题公园", "流媒体"],
    price: 92.15,
    change_percent: 0.45,
    updated_at: new Date().toISOString(),
  },
  {
    id: 12,
    symbol: "BA",
    name: "波音",
    market: "NYSE",
    group_name: "工业股",
    concepts: ["航空航天", "国防", "制造业"],
    price: 175.80,
    change_percent: -1.20,
    updated_at: new Date().toISOString(),
  },
  {
    id: 13,
    symbol: "JPM",
    name: "摩根大通",
    market: "NYSE",
    group_name: "金融股",
    concepts: ["银行", "投资", "资产管理"],
    price: 168.90,
    change_percent: 0.75,
    updated_at: new Date().toISOString(),
  },
  {
    id: 14,
    symbol: "V",
    name: "Visa",
    market: "NYSE",
    group_name: "金融股",
    concepts: ["支付", "金融科技", "信用卡"],
    price: 258.40,
    change_percent: 1.10,
    updated_at: new Date().toISOString(),
  },
  {
    id: 15,
    symbol: "JNJ",
    name: "强生",
    market: "NYSE",
    group_name: "医疗股",
    concepts: ["制药", "医疗器械", "消费品"],
    price: 156.25,
    change_percent: -0.35,
    updated_at: new Date().toISOString(),
  },
  {
    id: 16,
    symbol: "PFE",
    name: "辉瑞",
    market: "NYSE",
    group_name: "医疗股",
    concepts: ["制药", "生物科技", "疫苗"],
    price: 28.75,
    change_percent: 0.55,
    updated_at: new Date().toISOString(),
  },
  {
    id: 17,
    symbol: "XOM",
    name: "埃克森美孚",
    market: "NYSE",
    group_name: "能源股",
    concepts: ["石油", "天然气", "能源"],
    price: 104.30,
    change_percent: -0.95,
    updated_at: new Date().toISOString(),
  },
  {
    id: 18,
    symbol: "CVX",
    name: "雪佛龙",
    market: "NYSE",
    group_name: "能源股",
    concepts: ["石油", "天然气", "可再生能源"],
    price: 148.60,
    change_percent: -1.40,
    updated_at: new Date().toISOString(),
  },
  {
    id: 19,
    symbol: "KO",
    name: "可口可乐",
    market: "NYSE",
    group_name: "消费股",
    concepts: ["饮料", "快消品", "品牌"],
    price: 60.45,
    change_percent: 0.25,
    updated_at: new Date().toISOString(),
  },
  {
    id: 20,
    symbol: "PEP",
    name: "百事可乐",
    market: "NASDAQ",
    group_name: "消费股",
    concepts: ["饮料", "快消品", "食品"],
    price: 168.20,
    change_percent: 0.60,
    updated_at: new Date().toISOString(),
  },
];

// Mock API响应函数
export function getMockStocks(options: {
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: string;
  priceMin?: number;
  priceMax?: number;
  changePercentMin?: number;
  changePercentMax?: number;
}) {
  const {
    page = 1,
    pageSize = 20,
    sortField = "updated_at",
    sortOrder = "desc",
    priceMin,
    priceMax,
    changePercentMin,
    changePercentMax,
  } = options;

  // 筛选
  let filtered = [...mockStocks];

  if (priceMin !== undefined) {
    filtered = filtered.filter(s => (s.price || 0) >= priceMin);
  }
  if (priceMax !== undefined) {
    filtered = filtered.filter(s => (s.price || 0) <= priceMax);
  }
  if (changePercentMin !== undefined) {
    filtered = filtered.filter(s => (s.change_percent || 0) >= changePercentMin);
  }
  if (changePercentMax !== undefined) {
    filtered = filtered.filter(s => (s.change_percent || 0) <= changePercentMax);
  }

  // 排序
  if (sortField === "price") {
    filtered.sort((a, b) => {
      const aVal = a.price || 0;
      const bVal = b.price || 0;
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });
  } else if (sortField === "change_percent") {
    filtered.sort((a, b) => {
      const aVal = a.change_percent || 0;
      const bVal = b.change_percent || 0;
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });
  }

  // 分页
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paged = filtered.slice(start, end);

  return {
    items: paged,
    total: filtered.length,
    page,
    page_size: pageSize,
    pages: Math.ceil(filtered.length / pageSize),
  };
}

