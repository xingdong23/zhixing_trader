import type { NoteTag, NoteWithId } from "./types";

export const mockTags: NoteTag[] = [
  { id: 1, name: "盈利", color: "#10b981", count: 23 },
  { id: 2, name: "亏损", color: "#ef4444", count: 12 },
  { id: 3, name: "技术分析", color: "#3b82f6", count: 45 },
  { id: 4, name: "基本面", color: "#8b5cf6", count: 28 },
  { id: 5, name: "心态记录", color: "#f59e0b", count: 19 },
  { id: 6, name: "重要教训", color: "#ef4444", count: 8 },
  { id: 7, name: "待验证", color: "#f59e0b", count: 10 },
];

export const mockNotes: NoteWithId[] = [
  {
    id: 1,
    type: "stock",
    title: "AAPL - 苹果公司基本面分析",
    content: `## 基本面

- Q3财报超预期，营收增长12%
- iPhone 15 系列销售强劲
- 服务业务持续增长

## 技术面

- 突破月线阻力位 $180
- MACD金叉，动能良好
- 支撑位：$172

## 交易想法

- 回调到$175附近分批买入
- 目标价：$195
- 止损：$170`,
    isStarred: true,
    tags: [mockTags[0], mockTags[2]],
    createdAt: "2024-10-15T14:30:00Z",
    relatedId: "AAPL",
    relatedInfo: {
      type: "stock",
      label: "AAPL - 苹果公司",
      link: "/stock/AAPL",
    },
  },
  {
    id: 2,
    type: "market",
    title: "美股大盘观察 - 震荡行情",
    content: `## 市场情况

- 纳斯达克震荡，科技股活跃
- 成交量萎缩，观望情绪浓厚
- VIX指数下降，恐慌情绪缓解

## 板块轮动

- AI概念股领涨
- 传统能源股回调
- 消费股表现平淡

## 操作建议

- 短线操作为主
- 控制仓位，降低风险
- 关注科技股龙头`,
    isStarred: false,
    tags: [mockTags[4]],
    createdAt: "2024-10-15T18:00:00Z",
    relatedId: "US_MARKET",
    relatedInfo: {
      type: "market",
      label: "美股市场",
    },
  },
  {
    id: 3,
    type: "trade",
    title: "TSLA 突破交易复盘",
    content: `## 入场理由

- 突破三角形整理
- 成交量放大
- 马斯克发布利好消息

## 实际执行

- 入场：$265
- 出场：$278
- 盈利：+4.9%

## 教训

- 追高买入风险大
- 下次等待回调
- 严格执行止损`,
    isStarred: true,
    tags: [mockTags[0], mockTags[5]],
    createdAt: "2024-10-14T10:30:00Z",
    relatedId: "TSLA",
    relatedInfo: {
      type: "trade",
      label: "TSLA 交易",
      link: "/trades/12346",
    },
  },
  {
    id: 4,
    type: "pattern",
    title: "杯柄形态 (Cup and Handle) 研究",
    content: `## 形态特征

1. 圆弧底（杯底）
2. 小幅回调（手柄）
3. 突破颈线位

## 成功要素

- 形成时间：4-12周
- 回调幅度：10-15%
- 突破时放量

## 实战案例

- NVDA 2024年3月：成功率 85%
- META 2024年2月：成功率 78%

## 注意事项

- 假突破风险
- 需要配合基本面
- 止损设在手柄低点`,
    isStarred: false,
    tags: [mockTags[6]],
    createdAt: "2024-10-12T09:15:00Z",
    relatedId: "CUP_HANDLE",
    relatedInfo: {
      type: "pattern",
      label: "杯柄形态",
    },
  },
  {
    id: 5,
    type: "strategy",
    title: "动量突破策略详解",
    content: `## 策略核心

1. 识别强势股
2. 等待整理突破
3. 突破时重仓买入
4. 快速止盈止损

## 选股条件

- 近期涨幅 > 20%
- 成交量持续放大
- 基本面良好

## 风控规则

- 单笔止损 < 2%
- 最大持仓 < 30%
- 快进快出

## 回测数据

- 胜率：62%
- 盈亏比：2.3:1
- 年化收益：35%`,
    isStarred: true,
    tags: [mockTags[6], mockTags[2]],
    createdAt: "2024-10-10T20:00:00Z",
    relatedId: "MOMENTUM_BREAKOUT",
    relatedInfo: {
      type: "strategy",
      label: "动量突破策略",
      link: "/strategy/momentum-breakout",
    },
  },
  {
    id: 6,
    type: "misc",
    title: "《股票大作手回忆录》读书笔记",
    content: `## 核心观点

1. 顺势而为，不要逆势操作
2. 耐心等待最佳时机
3. 严格止损，保护本金

## 印象深刻的话

"市场永远是对的，错的只有自己"

## 应用到实盘

- 建立趋势跟踪系统
- 制定严格的止损策略
- 控制情绪，避免冲动交易`,
    isStarred: false,
    tags: [],
    createdAt: "2024-10-08T20:00:00Z",
  },
];

