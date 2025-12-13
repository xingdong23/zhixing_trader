# Freqtrade Bot 策略模块

本模块集成了 Freqtrade 框架与 FreqAI 机器学习能力，按策略分类组织代码。

## 目录结构

```
freqtrade_bot/
├── my_strategies/           # 策略开发目录 (按策略分类)
│   ├── blowup/              # 5分钟爆破猎手策略
│   │   ├── strategy.py      # 策略核心代码
│   │   ├── bot.py           # 实盘 Bot
│   │   └── backtest/        # 回测脚本 (v1-v4)
│   └── daily_trend/         # 日线趋势跟随策略
│       └── backtest.py
│
├── utils/                   # 共享工具
│   └── data_loader.py       # 数据加载器
│
├── user_data/               # Freqtrade 标准目录
│   ├── strategies/          # Freqtrade 运行时策略
│   ├── freqaimodels/        # AI 模型
│   ├── backtest_results/    # 回测结果
│   └── data/                # 数据缓存
│
├── configs/                 # 配置文件
├── scripts/                 # 运维脚本
├── feature_bridge/          # 特征桥接
└── fine_tuning/             # 模型微调
```

## 快速开始

```bash
# 运行 Blowup 策略回测
python my_strategies/blowup/backtest/blowup_v2_backtest.py

# 运行日线趋势策略回测
python my_strategies/daily_trend/backtest.py

# 运行实盘 Bot (需配置 API)
python my_strategies/blowup/bot.py
```

## 策略说明

| 策略 | 描述 | 时间周期 |
|------|------|----------|
| **blowup** | 5分钟爆破猎手，突破+放量信号 | 5分钟 |
| **daily_trend** | EMA金叉/死叉趋势跟随 | 日线 |

## FreqAI 工作流程

1. **数据准备**: `sh scripts/run_download.sh 30`
2. **回测**: `sh scripts/run_freqai_backtest.sh 30`
3. **模拟交易**: `sh scripts/run_freqai_live.sh dry-run`

## 配置说明

- `configs/config_okx.json` - 交易所配置
- `configs/config_freqai.json` - AI 模型参数
