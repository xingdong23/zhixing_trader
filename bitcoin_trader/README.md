# Bitcoin Trader

基于 CCXT 的比特币自动交易系统，支持 OKX 模拟盘和实盘交易。

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 配置 OKX API

复制 `.env.example` 为 `.env`，填入你的 OKX API 配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# OKX 配置
OKX_API_KEY=your_api_key
OKX_API_SECRET=your_api_secret
OKX_PASSPHRASE=your_passphrase
OKX_TESTNET=True  # True=模拟盘, False=实盘
```

### 3. 运行交易

#### 方式 1: 使用快速启动脚本（交互式）

```bash
bash 快速启动-OKX模拟盘.sh
```

#### 方式 2: 直接运行 Python 脚本

```bash
# Paper Trading (不执行真实订单)
python3 run_okx_paper_trading.py

# Live Trading (执行真实订单，在模拟盘)
python3 run_okx_live_demo.py
```

## 项目结构

```
bitcoin_trader/
├── app/                          # 核心代码
│   ├── core/
│   │   ├── strategies/          # 交易策略
│   │   ├── trading_bot.py       # 交易机器人
│   │   ├── trading_engine.py    # 交易引擎
│   │   ├── market_monitor.py    # 行情监控
│   │   └── risk_manager.py      # 风险管理
│   └── config.py                # 配置管理
├── examples/
│   └── okx_demo_trading.py      # OKX 交易示例
├── run_okx_paper_trading.py     # Paper Trading 启动脚本
├── run_okx_live_demo.py         # Live Trading 启动脚本
└── 快速启动-OKX模拟盘.sh         # 快速启动脚本
```

## 交易策略

**稳健盈利策略** (SteadyProfitStrategy)

- 趋势跟踪 + 震荡识别
- 动态仓位管理
- ATR 止损
- 严格风控

## 风险控制

- ✓ 最大仓位限制
- ✓ 日亏损限制
- ✓ 交易次数限制
- ✓ 连续亏损限制
- ✓ ATR 动态止损

## 风险提示

⚠️ **重要**：

- 本系统仅供学习研究
- 加密货币交易有高风险
- 请先在模拟盘充分测试
- 实盘交易风险自负

## 技术栈

- Python 3.8+
- CCXT (交易所接口)
- asyncio (异步编程)

## 许可证

MIT License
