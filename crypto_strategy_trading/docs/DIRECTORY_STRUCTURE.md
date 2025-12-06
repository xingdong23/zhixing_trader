# 项目目录结构说明

本文档详细说明 crypto_strategy_trading 项目的目录结构和各模块职责。

## 📁 总体结构概览

```
crypto_strategy_trading/
│
├── strategies/              # 🎯 交易策略核心代码
├── backtest/                # 📊 回测系统
├── live_trading/            # 💹 实盘交易
├── ai/                      # 🤖 AI/机器学习模块
├── data/                    # 📈 历史K线数据
├── docs/                    # 📖 项目文档
├── utils/                   # 🔧 通用工具
├── scripts/                 # 🛠️ 辅助脚本
├── logs/                    # 📝 运行日志
│
├── .agent/workflows/        # ⚙️ 标准化工作流
├── .env                     # 🔐 环境变量/API密钥
├── README.md                # 项目说明
└── run_*.sh                 # 启动脚本
```

---

## 🎯 strategies/ - 策略目录

**职责**: 存放所有交易策略的核心算法代码和配置

### 目录结构

```
strategies/
├── __init__.py              # 策略模块初始化
│
├── martingale_sniper/       # 马丁格尔狙击策略
│   ├── __init__.py
│   ├── strategy_single.py   # 策略主逻辑（单仓位模式）
│   ├── config.json          # BTC配置
│   └── config_doge.json     # DOGE配置
│
├── ai_gambler/              # AI赌徒策略（ML辅助决策）
│   ├── strategy.py          # 策略逻辑
│   └── config.json          # 配置文件
│
├── pumpkin_soup/            # 南瓜汤策略
│   └── [多个子策略文件]
│
├── vwap_mean_reversion/     # VWAP均值回归
│   └── ...
│
└── backup/                  # 旧版/备份策略
```

### 策略开发规范

每个策略必须包含：
1. `strategy.py` - 实现 `analyze()` 方法返回交易信号
2. `config.json` - 定义策略参数
3. `__init__.py` - 模块初始化

---

## 📊 backtest/ - 回测系统

**职责**: 使用历史数据测试和验证策略

### 目录结构

```
backtest/
├── README.md                # 回测系统说明文档
├── run_backtest.py          # 🚀 回测主程序入口
├── __init__.py
│
├── configs/                 # 回测配置文件
│   ├── ai_gambler_doge.json        # AI赌徒DOGE配置
│   ├── ai_gambler_doge_2022.json   # 2022年回测
│   ├── ai_gambler_doge_2023.json   # 2023年回测
│   ├── lottery_scalping_backtest.json
│   ├── vwap_backtest_runner.json
│   └── vwap_strategy_config.json
│
├── core/                    # 回测引擎核心
│   ├── __init__.py
│   ├── backtest_engine.py   # 回测引擎（模拟交易）
│   ├── data_loader.py       # 数据加载（读取CSV）
│   ├── multi_asset_engine.py # 多资产引擎
│   └── performance_analyzer.py # 性能分析
│
├── scripts/                 # 专用回测脚本
│   ├── run_martingale_sniper.py   # 马丁策略回测
│   ├── run_pump_hunter.py         # 泵猎手回测
│   ├── run_fusion_backtest.py     # 融合策略回测
│   ├── pumpkin_soup/              # 南瓜汤专用脚本
│   └── ...
│
├── utils/                   # 数据处理工具
│   ├── README.md            # 工具说明
│   ├── download_binance_data.py   # 🔽 下载币安数据
│   ├── merge_data.py              # 合并CSV文件
│   ├── merge_2021_data.py         # 2021数据合并
│   ├── merge_2024_full.py         # 2024完整数据
│   ├── resample_data.py           # 数据重采样
│   └── ...
│
└── results/                 # 回测结果输出
    ├── backtest_result_*.json
    └── backtest_report_*.txt
```

### 使用方法

```bash
# 运行回测
python backtest/run_backtest.py --config backtest/configs/xxx.json

# 下载数据
python backtest/utils/download_binance_data.py
```

---

## 💹 live_trading/ - 实盘交易

**职责**: 连接交易所API执行真实交易

### 目录结构

```
live_trading/
├── __init__.py
│
├── common/                  # 🔧 公共组件
│   ├── __init__.py
│   ├── base_trader.py       # 交易基类（API连接、订单）
│   ├── db_logger.py         # SQLite日志
│   ├── mysql_logger.py      # MySQL日志
│   └── utils.py             # 工具函数
│
├── martingale_sniper/       # 马丁狙击交易器
│   ├── __init__.py
│   ├── trader.py            # 多仓位交易器
│   └── trader_single.py     # 单仓位交易器
│
├── pumpkin_soup/            # 南瓜汤交易器
│   ├── executor.py          # 订单执行器
│   ├── runner.py            # 策略运行器
│   ├── start.sh             # 启动脚本
│   ├── watchdog.sh          # 进程监控
│   └── .env.example         # 环境变量示例
│
├── ema_simple_trend/        # EMA趋势交易器
│   └── ...
│
└── pump_hunter/             # 泵猎手交易器
    └── ...
```

### 使用方法

```bash
# 启动交易
python -m live_trading.martingale_sniper.trader_single
./run_martingale.sh
```

---

## 🤖 ai/ - AI/机器学习模块

**职责**: 特征工程、模型训练、参数优化、策略验证

### 目录结构

```
ai/
├── __init__.py
│
├── mining/                  # 📐 特征工程
│   ├── __init__.py
│   ├── feature_factory.py   # 特征工厂（生成技术指标特征）
│   └── volatility_miner.py  # 波动率挖掘
│
├── model/                   # 🧠 模型训练和存储
│   ├── __init__.py
│   ├── train_lgbm.py        # LightGBM训练脚本
│   ├── lgbm_model_*.txt     # 模型文件
│   ├── best_features_*.json # 最佳特征配置
│   └── volatility_model_*.joblib  # 模型权重
│
├── optimization/            # ⚡ 参数优化（Optuna）
│   ├── __init__.py
│   └── martingale_sniper/   # 马丁策略优化
│       ├── optuna_martingale.py   # 基础优化
│       ├── optuna_deep.py         # 深度优化
│       ├── optuna_robust.py       # 稳健优化
│       ├── best_params_*.json     # 最佳参数
│       └── best_params_deep_*.json
│
└── verification/            # ✅ 验证脚本
    ├── __init__.py
    └── martingale_sniper/
        ├── verify_best_params.py      # 验证最佳参数
        ├── verify_long_term.py        # 长期验证
        ├── verify_market_regimes.py   # 市场环境验证
        └── verify_multi_timeframe.py  # 多周期验证
```

### 使用方法

```bash
# 参数优化
python ai/optimization/martingale_sniper/optuna_martingale.py

# 模型训练
python ai/model/train_lgbm.py

# 验证参数
python ai/verification/martingale_sniper/verify_best_params.py
```

---

## 📈 data/ - 数据目录

**职责**: 存放历史K线数据

### 文件命名规范

```
{SYMBOL}-{TIMEFRAME}-{描述}.csv

示例:
├── DOGEUSDT-5m-merged.csv       # DOGE 5分钟合并数据
├── BTCUSDT-1h-merged.csv        # BTC 1小时合并数据
├── BTCUSDT-5m-2024-10-01.csv    # 单日数据
├── ETHUSDT-1h-ALL.csv           # 全部历史
└── ...
```

### 数据获取

```bash
# 下载数据
python backtest/utils/download_binance_data.py

# 合并数据
python backtest/utils/merge_data.py
```

---

## 📖 docs/ - 文档目录

存放项目文档、策略说明、分析报告等。

---

## 🔧 utils/ - 通用工具

```
utils/
├── __init__.py
├── logger.py            # 日志配置（支持Telegram通知）
├── market_regime.py     # 市场环境识别
├── test_telegram.py     # Telegram测试
└── get_chat_id.sh       # 获取Telegram Chat ID
```

---

## ⚙️ .agent/workflows/ - 标准化工作流

定义了AI助手执行任务的标准流程：

| 工作流 | 命令 | 用途 |
|--------|------|------|
| `/new-strategy` | 新增策略 | 创建新策略的完整流程 |
| `/backtest` | 回测策略 | 回测一个策略 |
| `/optimize-strategy` | 优化参数 | 使用Optuna优化 |
| `/deploy-live` | 实盘部署 | 部署到线上 |
| `/train-model` | 训练模型 | 训练ML模型 |
| `/read-code` | 阅读代码 | 了解项目结构 |

---

## 🔐 配置文件

| 文件 | 用途 |
|------|------|
| `.env` | API密钥、Telegram配置 |
| `strategies/*/config.json` | 策略参数 |
| `backtest/configs/*.json` | 回测配置 |

---

## 🚀 启动脚本

| 脚本 | 用途 |
|------|------|
| `run_martingale.sh` | 马丁策略（BTC） |
| `run_martingale_doge.sh` | 马丁策略（DOGE） |
| `run_pump_hunter.sh` | 泵猎手策略 |
| `run_live.sh` | 通用实盘启动 |
