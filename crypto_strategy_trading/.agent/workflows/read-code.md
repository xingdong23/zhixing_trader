---
description: 阅读代码，了解当前系统功能模型
---

# 代码阅读指南

本文档帮助你快速了解项目的目录结构和各模块的职责。

## 📁 项目总体结构

```
crypto_strategy_trading/
│
├── freqtrade_bot/               # 🎯 工作目录（所有操作在这里进行）
│   ├── my_strategies/           # 策略开发目录
│   │   ├── blowup/
│   │   └── daily_trend/
│   ├── user_data/               # Freqtrade 框架目录
│   ├── utils/                   # 工具类
│   ├── configs/                 # 配置文件
│   └── scripts/                 # 运维脚本
│
├── data/                        # 📈 历史K线数据（下载后存放这里）
│   ├── DOGEUSDT-5m-merged.csv
│   ├── SOLUSDT-5m-merged.csv
│   └── ...
```

> **注意**: 所有命令都在 `freqtrade_bot/` 目录下执行，数据位于 `../data/`
│
└── .agent/workflows/            # 工作流定义
```

---

## 🎯 my_strategies/ - 策略开发目录

**职责**: 存放所有策略的开发代码，按策略分类

### 当前策略列表

| 策略名 | 描述 | 位置 |
|--------|------|------|
| `blowup` | 5分钟爆破猎手（突破+放量） | `my_strategies/blowup/` |
| `daily_trend` | 日线趋势跟随（EMA金叉）| `my_strategies/daily_trend/` |

### 策略目录结构

```
my_strategies/{strategy_name}/
├── strategy.py       # 策略核心逻辑
├── backtest.py       # 回测脚本（或 backtest/ 目录）
├── bot.py            # 实盘 Bot（可选）
└── config.json       # 配置文件（可选）
```

---

## 📊 user_data/strategies/ - Freqtrade 策略

**职责**: Freqtrade 框架运行时加载的策略（继承 IStrategy）

| 策略文件 | 描述 |
|----------|------|
| `freqai_strategy.py` | FreqAI 机器学习策略 |
| `blowup_hunter_strategy.py` | 爆破猎手 Freqtrade 版 |
| `martingale_ft.py` | 马丁格尔策略 |

---

## 🔧 utils/ - 工具类

| 文件 | 功能 |
|------|------|
| `data_loader.py` | 加载和重采样历史数据 |

---

## 📝 关键入口文件

### 回测

```bash
# 在 freqtrade_bot 目录下操作
cd freqtrade_bot

# Blowup 策略回测
python my_strategies/blowup/backtest/blowup_v2_backtest.py

# 日线趋势回测
python my_strategies/daily_trend/backtest.py

# Freqtrade 回测
sh scripts/run_freqai_backtest.sh 30
```

### 实盘

```bash
# Blowup 实盘 Bot
python my_strategies/blowup/bot.py
```

---

## 🔗 快速查看特定策略

想了解某个策略？按以下顺序阅读：

1. `my_strategies/{name}/strategy.py` - 核心逻辑
2. `my_strategies/{name}/backtest.py` - 回测验证
3. `my_strategies/{name}/bot.py` - 实盘实现
