# EMA144 策略快速开始指南

## 策略已就绪 ✅

EMA144趋势跟踪策略已经完全实现并测试通过！

## 文件结构

```
bitcoin_trader/
├── app/
│   ├── strategies/
│   │   └── ema144_trend/           # 新策略目录
│   │       ├── __init__.py         # 策略包初始化
│   │       └── strategy.py         # 策略实现（500+ 行）
│   └── config/
│       └── ema144_trend.json       # 策略配置文件
├── backtest/
│   └── configs/
│       └── ema144_trend_1h_6m.json # 回测配置文件
└── docs/
    ├── EMA144_TREND_STRATEGY.md    # 详细文档
    └── EMA144_QUICKSTART.md        # 本文件
```

## 快速运行回测

### 方法1：使用1小时周期（推荐）

```bash
cd /Users/chengzheng/workspace/chuangxin/zhixing_trader/bitcoin_trader

# 运行回测
python backtest/run_backtest.py --config backtest/configs/ema144_trend_1h_6m.json
```

### 方法2：创建自定义配置

复制 `backtest/configs/ema144_trend_1h_6m.json` 并修改参数：

```json
{
  "data": {
    "source": "data/ETHUSDT-5m-6months.csv",
    "timeframe": "30m",              // 改为30分钟
    "resample_from": "5m"
  }
}
```

## 策略核心特点

### 1. 入场逻辑
- **做多**：价格在EMA144上方，回踩至EMA144附近（距离0%-2%）
- **做空**：价格在EMA144下方，反弹至EMA144附近（距离0%-2%）

### 2. 风险控制
- **固定止损**：10%（可配置）
- **固定止盈**：风险回报比3:1
- **移动止盈**：盈利超过2%后激活，跟踪距离5%
- **趋势反转**：价格跌破/突破EMA144强制平仓

### 3. 仓位管理
- 支持两种模式：
  - **保守模式**：基于风险金额计算仓位
  - **激进模式**：使用杠杆放大仓位（50%资金 × 2倍杠杆）
- 连续亏损后自动减仓（每次亏损仓位×0.8）

## 参数优化建议

### 入场参数调整

在 `app/config/ema144_trend.json` 中：

```json
{
  "entry_conditions": {
    "entry_distance_min": -0.005,    // 回踩最小距离（-0.5%）
    "entry_distance_max": 0.02,      // 回踩最大距离（+2%）
    "pullback_lookback": 5           // 回踩确认K线数量
  }
}
```

**优化方向**：
- 震荡市场：缩小距离范围（0.5%-1.5%）
- 趋势市场：扩大距离范围（1%-3%）

### 止损止盈调整

```json
{
  "stop_loss_take_profit": {
    "stop_loss_pct": 0.10,           // 固定止损10%
    "risk_reward_ratio": 3.0,        // 风险回报比
    "trailing_activation_pct": 0.02, // 移动止盈激活阈值
    "trailing_stop_pct": 0.05        // 移动止盈距离
  }
}
```

**优化方向**：
- 低波动品种：减小止损（5%-8%）
- 高波动品种：增大止损（12%-15%）
- 短线交易：降低激活阈值（1%）
- 长线交易：提高激活阈值（3%-5%）

### 风控参数调整

```json
{
  "daily_risk_controls": {
    "max_daily_loss": 0.05,                      // 日亏损5%
    "max_consecutive_losses": 3,                 // 连续亏损3次
    "pause_hours_after_consecutive_loss": 24     // 暂停24小时
  }
}
```

## 不同市场环境配置

### 牛市配置（偏多）
```json
{
  "entry_distance_max": 0.03,      // 允许更大的回踩距离
  "stop_loss_pct": 0.08,           // 更小的止损
  "risk_reward_ratio": 4.0,        // 更高的盈亏比
  "use_ema144_break": false        // 不启用EMA144突破出场
}
```

### 熊市配置（偏空）
```json
{
  "entry_distance_max": 0.03,      // 允许更大的反弹距离
  "stop_loss_pct": 0.08,           // 更小的止损
  "risk_reward_ratio": 4.0,        // 更高的盈亏比
  "use_ema144_break": false        // 不启用EMA144突破出场
}
```

### 震荡市配置
```json
{
  "entry_distance_max": 0.015,     // 更小的进场距离
  "stop_loss_pct": 0.12,           // 更大的止损避免假突破
  "risk_reward_ratio": 2.0,        // 更低的盈亏比
  "use_ema144_break": true,        // 启用EMA144突破出场
  "use_trailing_stop": false       // 关闭移动止盈，使用固定止盈
}
```

## 回测数据要求

### 最小数据量
- 至少200根K线（EMA144需要144+根，建议多准备些）

### 推荐周期
- **30分钟**：日内趋势，每天8-16次交易机会
- **1小时**：短期趋势，每天4-8次交易机会（推荐）
- **4小时**：中期趋势，每天1-2次交易机会
- **1天**：长期趋势，每周1-3次交易机会

### 数据格式
CSV格式，包含以下列：
```
timestamp, open, high, low, close, volume
```

## 查看回测结果

回测完成后，结果保存在：
```
backtest/results/ema144_trend_1h_6m_result_20241030_XXXXXX.json
```

关键指标：
- `total_return`: 总收益率
- `sharpe_ratio`: 夏普比率
- `max_drawdown`: 最大回撤
- `win_rate`: 胜率
- `profit_factor`: 盈亏比

## 常见问题

### Q1: 为什么没有交易信号？
**A**: 检查以下几点：
1. 价格是否在EMA144附近波动（太远不会进场）
2. 是否在回踩/反弹过程中（单边行情没有回踩不会进场）
3. 查看日志中的"等待回踩/反弹"信息

### Q2: 止损太频繁怎么办？
**A**: 
1. 增大止损百分比（10% → 12%-15%）
2. 缩小入场距离范围（只在更接近EMA144时进场）
3. 增加回踩确认K线数量（5 → 8-10）

### Q3: 错过大行情怎么办？
**A**: 
1. 扩大入场距离范围（2% → 3%-4%）
2. 降低移动止盈激活阈值（2% → 1%）
3. 关闭EMA144突破出场（让趋势充分发展）

### Q4: 如何在实盘中使用？
**A**: 
1. 先在历史数据上充分回测
2. 在模拟盘运行1-2周验证
3. 从小资金开始实盘（总资金的10%-20%）
4. 严格执行风控规则

## 下一步

1. **回测验证**：在不同市场环境下测试策略表现
2. **参数优化**：使用网格搜索找到最优参数组合
3. **风险评估**：分析最大回撤、连续亏损等风险指标
4. **实盘测试**：小资金验证策略有效性

## 技术支持

如有问题，请查看：
- 详细文档：`docs/EMA144_TREND_STRATEGY.md`
- 策略源码：`app/strategies/ema144_trend/strategy.py`
- 配置示例：`app/config/ema144_trend.json`

---

**祝交易顺利！** 📈

