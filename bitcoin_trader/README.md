# 🤖 Bitcoin Trader - 加密货币交易回测系统

**最优策略**: EMA Simple Trend 优化版  
**目标**: 300 USDT → 535 USDT (2年，+78.29%收益率)

---

## 🚀 快速开始

### 方式1：使用快捷脚本（最简单）
```bash
cd app/strategies/ema_simple_trend
bash run_backtest.sh
```

### 方式2：直接运行
```bash
python3 backtest/run_backtest.py --config app/strategies/ema_simple_trend/backtest_config.json
```

---

## 📁 项目结构

```
bitcoin_trader/
│
├── app/strategies/ema_simple_trend/    🎯 最优策略（一站式）
│   ├── config.json                     ⚙️ 策略参数
│   ├── backtest_config.json            📊 回测配置
│   ├── strategy.py                     💻 策略代码
│   ├── README.md                       📖 策略原理详解
│   ├── MONTHLY_ANALYSIS.md             📅 月度表现分析
│   └── run_backtest.sh                 🚀 快速回测脚本
│
├── backtest/                           回测引擎
│   ├── core/                           核心模块
│   ├── results/                        回测结果
│   └── run_backtest.py                 运行脚本
│
├── data/                               历史数据
└── PROJECT_STRUCTURE.md                详细项目说明
```

---

## 🎯 策略表现

| 指标 | 数值 |
|------|------|
| 💰 **收益率** | **+78.29%** |
| 🎯 **最终资金** | **535 USDT** |
| ✅ **胜率** | **71.43%** |
| 📊 **盈亏比** | **3.10** |
| 📉 **最大回撤** | **5.38%** |
| 🏅 **评分** | **A+ (100/100)** |

---

## 📖 文档

### 策略相关
- **策略原理详解**: `app/strategies/ema_simple_trend/README.md`
- **月度表现分析**: `app/strategies/ema_simple_trend/MONTHLY_ANALYSIS.md`
- **策略配置说明**: `app/strategies/ema_simple_trend/config.json`

### 项目相关
- **项目结构说明**: `PROJECT_STRUCTURE.md`
- **回测引擎文档**: `backtest/README.md`

---

## 💡 策略原理（极简版）

**EMA Simple Trend** = 趋势跟随策略

```
入场条件：
  • 价格突破 EMA13（中期均线）
  • EMA5 > EMA13 > EMA21（多头排列）
  → 上涨趋势确立，买入

出场条件：
  • 亏损3.2% → 止损
  • 盈利7% → 部分止盈（50%）
  • 盈利16% → 全部止盈
  • 移动止损保护利润
```

**核心优势**：
- ✅ 只做确定性机会（82%时间在等待）
- ✅ 让利润奔跑（最长持仓30个月）
- ✅ 快速止损（3.2%硬止损）
- ✅ 盈亏比3.1（赚得多，亏得少）

---

## 🔬 月度表现特点

### 交易频率
- **有交易月份**: 6个月 (17.6%)
- **无交易月份**: 28个月 (82.4%)
- **平均**: 每6个月交易1次

### 收益来源
- **82.8%的利润**来自**1笔超长持仓**
- 持仓时长：30个月（2023-03 至 2025-10）
- 单笔收益：+194u（从1605u涨到4055u）

**结论**: 这是"等待+持有"型策略，不是"月度交易"型策略

---

## ⚠️ 注意事项

### ✅ 适合
- 有耐心的长期投资者
- 相信趋势的人
- 能坐得住的人
- 2年+投资周期

### ❌ 不适合
- 想每天交易的人
- 喜欢频繁操作的人
- 追求短期暴利的人
- 没有耐心的人

---

## 🛠️ 环境要求

```bash
Python 3.10+
pandas
numpy
```

---

## 📊 回测数据

- **交易对**: ETH/USDT
- **时间周期**: 1小时
- **数据范围**: 2023-01 至 2025-10 (34个月)
- **数据来源**: Binance

---

## 🎓 学习资源

### 新手必读
1. `app/strategies/ema_simple_trend/README.md` - 策略原理（通俗易懂）
2. `app/strategies/ema_simple_trend/MONTHLY_ANALYSIS.md` - 月度表现（真实数据）
3. `PROJECT_STRUCTURE.md` - 项目结构（快速上手）

### 进阶
- 策略代码：`app/strategies/ema_simple_trend/strategy.py`
- 回测引擎：`backtest/core/`

---

## 🚧 未来计划

- [ ] 实盘运行模块
- [ ] 多交易对支持（BTC、SOL等）
- [ ] 实时监控面板
- [ ] 自动化部署

---

## 📞 联系方式

有问题或建议？请查看文档或提交issue。

---

**最后更新**: 2025-10-31  
**状态**: ✅ 已优化并验证，可用于实盘参考
