# Crypto Trading System

加密货币策略研究、回测、实盘交易系统。

## 目录结构

```
crypto_trading/
├── config/          # 配置中心
├── core/            # 核心引擎
├── strategies/      # 策略库
├── backtest/        # 回测引擎
├── live/            # 实盘交易
├── notifications/   # 通知系统
├── data/            # 数据存储
├── scripts/         # 脚本工具
└── tests/           # 单元测试
```

## 快速开始

```bash
# 安装依赖
pip install -r requirements.txt

# 运行回测
python scripts/run_backtest.py --strategy momentum_v11

# 观察模式
python scripts/start_live.py --strategy momentum_v11 --dry-run

# 实盘交易
python scripts/start_live.py --strategy momentum_v11
```

## 配置

1. 复制 `.env.example` 为 `.env`
2. 配置交易所 API Key
3. 配置飞书 Webhook
