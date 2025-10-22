# 交易纪律提醒组件

## 概述

`TradingDisciplineReminder` 是一个用于在交易系统中显示交易纪律提醒的组件。它帮助交易者保持纪律，避免冲动交易。

## 设计理念

基于以下交易心理学原则：

1. **宁愿错过，也不要做没有把握的交易** - 防止冲动交易
2. **只做极致压缩 + 回踩EMA55 + 成交量验证的交易** - 坚持高胜率策略
3. **看不懂的交易不做，只做自己看得懂的** - 避免盲目跟风
4. **没有赚钱总比亏损好很多** - 保护资本为先
5. **忍受空仓，等待最佳时机** - 培养耐心

## 使用方式

### 基本用法

```tsx
import TradingDisciplineReminder from "@/components/trading/TradingDisciplineReminder"

// 横幅样式（顶部通知栏）
<TradingDisciplineReminder 
  variant="banner" 
  dismissible={false}
  autoRotate={true}
  rotateInterval={15}
/>

// 卡片样式（独立卡片）
<TradingDisciplineReminder 
  variant="card" 
  dismissible={true}
  autoRotate={true}
  rotateInterval={20}
/>

// 紧凑样式（小型提示）
<TradingDisciplineReminder 
  variant="compact" 
  dismissible={true}
/>
```

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `variant` | `"banner" \| "card" \| "compact"` | `"banner"` | 显示样式 |
| `dismissible` | `boolean` | `false` | 是否可关闭 |
| `autoRotate` | `boolean` | `true` | 是否自动轮播 |
| `rotateInterval` | `number` | `10` | 轮播间隔（秒） |

## 集成位置

### 1. 主页面（`app/page.tsx`）
- **位置**: 所有页面顶部
- **样式**: `banner` 横幅
- **配置**: 不可关闭，15秒轮播

### 2. 股票详情页（`app/stock/[symbol]/page.tsx`）
- **位置**: 页面内容顶部
- **样式**: `card` 卡片
- **配置**: 可关闭，20秒轮播

### 3. 交易页面（`components/trades/TradesView.tsx`）
- **位置**: 交易列表顶部
- **样式**: `card` 卡片
- **配置**: 不可关闭，12秒轮播（更频繁提醒）

## 视觉设计

每条纪律规则都有独特的颜色主题：

- 🔴 **红色** - 风险警告（不要冲动交易）
- 🔵 **蓝色** - 策略提醒（坚持高胜率策略）
- 🟡 **黄色** - 理性思考（只做看得懂的）
- 🟢 **绿色** - 资本保护（不亏损优先）
- 🟣 **紫色** - 耐心培养（忍受空仓）

## 自定义

如需添加新的纪律规则，编辑 `disciplineRules` 数组：

```tsx
const disciplineRules: DisciplineRule[] = [
  {
    id: "your-rule-id",
    text: "你的纪律规则文本",
    icon: YourIcon,
    color: "text-your-color-600",
    bgColor: "bg-your-color-50 dark:bg-your-color-950/20 border-your-color-200"
  },
  // ...
]
```

## 心理学效果

- **视觉提醒**: 醒目的颜色和图标吸引注意
- **重复强化**: 自动轮播不断强化纪律意识
- **情绪管理**: 在关键交易页面提供冷静思考的机会
- **行为矫正**: 长期使用可培养良好交易习惯

## 最佳实践

1. **在交易前必看页面放置** - 确保交易者在下单前看到提醒
2. **不同页面使用不同样式** - 避免视觉疲劳
3. **关键页面不可关闭** - 强制阅读重要提醒
4. **适当的轮播间隔** - 既要提醒又不能太频繁打扰

## 未来扩展

- [ ] 根据用户交易历史个性化提醒
- [ ] 添加违规次数统计
- [ ] 集成到交易确认对话框
- [ ] 支持自定义规则
- [ ] 添加语音提醒选项
