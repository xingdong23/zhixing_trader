# 压缩→扩张突破策略 (Compression → Expansion Breakout Strategy)

## 策略概述

基于X平台大佬的交易策略，专注于捕捉"High Tight Flags"、"Big Base Breakouts"和"Stage 2 Transitions"。

### 核心理念

**Compression → Expansion（压缩→扩张）**

当波动率收缩、价格收紧、EMA对齐、成交量确认时，这就是下一波动量浪潮通常开始的地方。

## 策略要素

### 1. 强势上涨（Strong Move Up）
- 历史涨幅：10%+
- 成交量放大：1.1倍+
- EMA多头排列：9 > 21 > 50

### 2. 盘整阶段（Basing Phase）
- 时间：20-50个周期
- 成交量干涸：< 70%平均成交量
- 价格形态：更高的低点（Higher Lows）
- EMA支撑：50%时间在50 EMA上方
- 波动率收缩：< 70%

### 3. 紧密区间（Tight Range）
- 最近10个周期波动率 < 2%

### 4. EMA对齐（EMA Alignment）
- 9 EMA > 21 EMA > 50 EMA
- 三条EMA都在上升

### 5. 突破确认（Breakout Confirmation）
- 价格突破盘整区间高点
- 成交量放大1.5倍+
- 收盘价接近最高价（0.5%以内）
- 价格在9 EMA之上

## 入场策略

采用**评分机制**（满分5分，至少2分入场）：
1. 强势上涨：+1分（必需）
2. 盘整阶段：+1分
3. 紧密区间：+1分
4. EMA对齐：+1分
5. 突破确认：+1分

## 出场策略

1. **硬止损**：-3%（最高优先级）
2. **第二次止盈**：+10%全部平仓
3. **第一次止盈**：+5%部分平仓50%
4. **跌破9 EMA**：首次回调机会（盈利时）
5. **跌破21 EMA**：趋势反转（保护利润）

## EMA含义

- **9日 EMA** = 动量（Momentum）
- **21日 EMA** = 结构（Structure）
- **50日 EMA** = 趋势确认（Trend Confirmation）

当三条EMA都在上升且对齐时，表明趋势健康。

## 回测结果

### 测试配置
- 数据：ETHUSDT 1小时K线
- 周期：2024-05-01 至 2024-10-28（6个月）
- 初始资金：300 USDT
- 杠杆：1x
- 手续费：0.05%/0.02%

### 测试结果
```
总收益率：-3.53%
交易次数：2次
胜率：0%
最大回撤：3.53%
```

### 问题分析

1. **交易频率过低**：6个月只有2次交易机会
   - 原因：条件过于严格，特别是需要同时满足多个条件
   - 改进方向：进一步优化评分机制或放宽部分条件

2. **入场时机问题**：两次交易都是亏损
   - 第1次：3649入场 → 3535止损（-3.12%）
   - 第2次：2546入场 → 2450止损（-3.69%）
   - 原因：可能在假突破时入场

3. **止损正常工作**：两次都在-3%左右止损，符合预期

## 优化方向

### 短期优化
1. 调整评分机制，允许更灵活的组合
2. 减少必需条件，增加可选条件
3. 优化盘整阶段识别逻辑

### 中期优化
1. 添加假突破过滤
2. 结合更多市场环境判断（趋势强度、波动率环境等）
3. 优化止盈策略，提高盈亏比

### 长期优化
1. 机器学习模型识别最佳入场点
2. 自适应参数调整
3. 多时间框架确认

## 使用方法

### 回测
```bash
cd /Users/chengzheng/workspace/chuangxin/zhixing_trader/bitcoin_trader
python backtest/run_backtest.py --config backtest/configs/compression_expansion_1h_6m.json
```

### 配置文件位置
- 策略配置：`app/config/compression_expansion.json`
- 回测配置：`backtest/configs/compression_expansion_1h_6m.json`
- 策略代码：`app/strategies/compression_expansion/strategy.py`

## 参考资料

策略来源：X平台交易大佬的$MU案例分析

核心观点：
> "The bigger the base, the higher in space."
> （底部越大，空间越高）

---

**注意**：这是一个迭代开发中的策略，当前版本尚未盈利。建议继续优化后再考虑实盘使用。

