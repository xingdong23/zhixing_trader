# CCXT 集成指南

## 📚 目录

- [概述](#概述)
- [核心模块](#核心模块)
- [快速开始](#快速开始)
- [详细使用](#详细使用)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)

---

## 概述

本项目已完整集成 **ccxt** 库，实现了自动化加密货币量化交易的完整功能。

### ✨ 核心功能

- ✅ **交易执行引擎** - 市价单、限价单、止损止盈
- ✅ **实时行情监控** - WebSocket 实时数据流
- ✅ **风险管理系统** - 仓位控制、资金管理
- ✅ **自动交易机器人** - 策略自动执行
- ✅ **多交易对支持** - 同时管理多个交易对

### 🏗️ 架构图

```
┌─────────────────────────────────────────────────────────┐
│                   Trading Bot                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Strategy   │  │ Risk Manager │  │Market Monitor│ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         │                  │                  │         │
│         └──────────────────┴──────────────────┘         │
│                          │                               │
│                  ┌───────▼────────┐                     │
│                  │Trading Engine  │                     │
│                  └───────┬────────┘                     │
└──────────────────────────┼──────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │    CCXT     │
                    │  Exchange   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Binance   │
                    │   OKX etc.  │
                    └─────────────┘
```

---

## 核心模块

### 1. 交易执行引擎 (`trading_engine.py`)

负责订单执行和持仓管理。

**主要功能：**
- 市价单执行
- 限价单执行
- 止损止盈设置
- 持仓跟踪
- 订单管理

**示例代码：**

```python
from app.core.trading_engine import TradingEngine, OrderSide
import ccxt.async_support as ccxt_async

# 创建交易所实例
exchange = ccxt_async.binance({
    'apiKey': 'your_api_key',
    'secret': 'your_api_secret',
    'enableRateLimit': True
})

# 创建交易引擎
engine = TradingEngine(exchange)

# 执行市价单
order = await engine.execute_market_order(
    symbol='BTC/USDT',
    side=OrderSide.BUY,
    amount=0.01
)

# 设置止损
stop_order = await engine.set_stop_loss(
    symbol='BTC/USDT',
    side=OrderSide.SELL,
    amount=0.01,
    stop_price=49000
)

# 查看持仓
positions = engine.get_positions()
```

### 2. 实时行情监控 (`market_monitor.py`)

实时监控市场数据。

**主要功能：**
- Ticker 实时行情
- 订单簿监控
- 成交数据流
- K线数据更新

**示例代码：**

```python
from app.core.market_monitor import MarketMonitor, KlineMonitor

# 创建监控器
market_monitor = MarketMonitor(exchange)
kline_monitor = KlineMonitor(exchange)

# 启动监控
await market_monitor.start()
await kline_monitor.start()

# 订阅行情
def on_ticker(ticker):
    print(f"价格: {ticker['last']}")

await market_monitor.subscribe_ticker('BTC/USDT', on_ticker)

# 订阅K线
await kline_monitor.subscribe_kline('BTC/USDT', '15m')

# 获取K线数据
klines = kline_monitor.get_klines('BTC/USDT', '15m', limit=100)
```

### 3. 风险管理器 (`risk_manager.py`)

控制交易风险。

**主要功能：**
- 仓位计算
- 风险检查
- 交易频率控制
- 连续亏损保护
- 资金管理

**示例代码：**

```python
from app.core.risk_manager import RiskManager, RiskLimits

# 配置风险限制
limits = RiskLimits(
    max_position_size=0.1,      # 最大仓位
    max_daily_loss=0.03,        # 日最大亏损3%
    max_trades_per_day=10,      # 每日最多10笔
    max_consecutive_losses=3    # 最多连续亏损3次
)

# 创建风险管理器
risk_manager = RiskManager(
    initial_capital=10000.0,
    limits=limits
)

# 计算仓位大小
position_size = risk_manager.calculate_position_size(
    symbol='BTC/USDT',
    entry_price=50000,
    stop_loss=49000,
    risk_percent=0.01  # 风险1%
)

# 检查是否允许交易
allowed, reason = risk_manager.check_trade_allowed(
    symbol='BTC/USDT',
    side='buy',
    amount=position_size,
    price=50000
)

# 记录交易
risk_manager.record_trade({
    'symbol': 'BTC/USDT',
    'side': 'buy',
    'amount': 0.05,
    'price': 50000,
    'pnl': 500
})

# 获取风险报告
print(risk_manager.get_risk_report())
```

### 4. 自动交易机器人 (`trading_bot.py`)

整合所有模块的自动交易系统。

**主要功能：**
- 策略自动执行
- 实时监控
- 自动开平仓
- 风险控制
- 性能统计

**示例代码：**

```python
from app.core.trading_bot import TradingBot
from app.core.strategies import SteadyProfitStrategy

# 创建策略
strategy = SteadyProfitStrategy()

# 创建机器人
bot = TradingBot(
    exchange=exchange,
    strategy=strategy,
    symbol='BTC/USDT',
    timeframe='15m',
    initial_capital=10000.0,
    risk_limits=limits,
    config={
        'mode': 'paper',        # paper=模拟, live=实盘
        'check_interval': 60    # 检查间隔(秒)
    }
)

# 启动机器人
await bot.start()

# 获取状态
status = bot.get_status()
print(bot.get_performance_report())

# 停止机器人
await bot.stop()
```

---

## 快速开始

### 1. 安装依赖

```bash
cd bitcoin_trader
pip install -r requirements.txt
```

### 2. 配置环境变量

创建 `.env` 文件：

```bash
# Binance 配置
BINANCE_API_KEY=your_api_key
BINANCE_API_SECRET=your_api_secret
BINANCE_TESTNET=True  # 使用测试网

# OKX 配置（可选）
OKX_API_KEY=your_api_key
OKX_API_SECRET=your_api_secret
OKX_PASSPHRASE=your_passphrase
OKX_TESTNET=True
```

### 3. 运行示例

```bash
# 运行完整示例
python examples/auto_trading_example.py

# 或运行稳健盈利策略示例
python examples/steady_profit_example.py
```

---

## 详细使用

### 场景1: 简单的自动交易

```python
import asyncio
import ccxt.async_support as ccxt_async
from app.core.trading_bot import TradingBot
from app.core.strategies import SteadyProfitStrategy
from app.core.risk_manager import RiskLimits

async def simple_trading():
    # 1. 创建交易所
    exchange = ccxt_async.binance({
        'apiKey': 'your_key',
        'secret': 'your_secret',
        'enableRateLimit': True
    })
    exchange.set_sandbox_mode(True)  # 测试网
    
    try:
        # 2. 创建策略和机器人
        strategy = SteadyProfitStrategy()
        
        bot = TradingBot(
            exchange=exchange,
            strategy=strategy,
            symbol='BTC/USDT',
            timeframe='15m',
            initial_capital=10000.0,
            config={'mode': 'paper'}
        )
        
        # 3. 启动并运行
        await bot.start()
        
    finally:
        await exchange.close()

asyncio.run(simple_trading())
```

### 场景2: 多交易对交易

```python
from app.core.trading_bot import MultiSymbolTradingBot

async def multi_symbol_trading():
    exchange = ccxt_async.binance({...})
    
    # 配置多个交易对
    configs = [
        {
            'symbol': 'BTC/USDT',
            'strategy': SteadyProfitStrategy(),
            'timeframe': '15m',
            'mode': 'paper'
        },
        {
            'symbol': 'ETH/USDT',
            'strategy': SteadyProfitStrategy(),
            'timeframe': '15m',
            'mode': 'paper'
        }
    ]
    
    # 创建多交易对机器人
    multi_bot = MultiSymbolTradingBot(
        exchange=exchange,
        strategy_configs=configs,
        initial_capital=20000.0
    )
    
    await multi_bot.start()

asyncio.run(multi_symbol_trading())
```

### 场景3: 自定义策略参数

```python
# 保守型策略
conservative_params = {
    "base_position_ratio": 0.005,   # 0.5% 仓位
    "震荡市_系数": 0.2,
    "单边市_系数": 0.5,
    "max_daily_loss": 0.01,         # 1% 日亏损
    "atr_multiplier": 2.0,          # 更宽的止损
}

strategy = SteadyProfitStrategy(parameters=conservative_params)

# 激进型策略
aggressive_params = {
    "base_position_ratio": 0.02,    # 2% 仓位
    "震荡市_系数": 0.5,
    "单边市_系数": 1.0,
    "max_daily_loss": 0.05,         # 5% 日亏损
    "atr_multiplier": 1.2,          # 更紧的止损
}

strategy = SteadyProfitStrategy(parameters=aggressive_params)
```

### 场景4: 实盘交易（谨慎使用）

```python
async def live_trading():
    # ⚠️ 实盘交易 - 真实资金！
    exchange = ccxt_async.binance({
        'apiKey': 'your_key',
        'secret': 'your_secret',
        'enableRateLimit': True
    })
    # 不设置 sandbox_mode，使用主网
    
    # 严格的风险限制
    risk_limits = RiskLimits(
        max_position_size=0.01,     # 小仓位
        max_daily_loss=0.01,        # 1% 日亏损
        max_trades_per_day=5,
        max_consecutive_losses=2
    )
    
    bot = TradingBot(
        exchange=exchange,
        strategy=strategy,
        symbol='BTC/USDT',
        timeframe='15m',
        initial_capital=1000.0,     # 小资金测试
        risk_limits=risk_limits,
        config={'mode': 'live'}     # 实盘模式
    )
    
    await bot.start()
```

---

## 最佳实践

### 1. 测试流程

```
1. 本地回测 → 2. 测试网模拟 → 3. 小资金实盘 → 4. 正式运行
```

**步骤说明：**

```python
# 步骤1: 本地回测
# 使用历史数据测试策略
python scripts/backtest.py --strategy steady_profit --days 30

# 步骤2: 测试网模拟
exchange.set_sandbox_mode(True)
config = {'mode': 'paper'}

# 步骤3: 小资金实盘
config = {'mode': 'live'}
initial_capital = 100.0  # 100 USDT 测试

# 步骤4: 正式运行
initial_capital = 10000.0  # 增加资金
```

### 2. 风险控制建议

```python
# 保守型配置（推荐新手）
RiskLimits(
    max_position_size=0.01,         # 单笔最大0.01 BTC
    max_position_value=500.0,       # 单笔最大500 USDT
    max_total_position=0.2,         # 总仓位20%
    max_daily_loss=0.01,            # 日亏损1%
    max_trades_per_day=5,           # 每日5笔
    max_consecutive_losses=2        # 连续亏损2次停止
)

# 中等型配置
RiskLimits(
    max_position_size=0.05,
    max_position_value=2000.0,
    max_total_position=0.3,
    max_daily_loss=0.02,
    max_trades_per_day=10,
    max_consecutive_losses=3
)

# 激进型配置（需要经验）
RiskLimits(
    max_position_size=0.1,
    max_position_value=5000.0,
    max_total_position=0.5,
    max_daily_loss=0.05,
    max_trades_per_day=20,
    max_consecutive_losses=4
)
```

### 3. 监控和日志

```python
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('trading.log'),
        logging.StreamHandler()
    ]
)

# 定期检查状态
async def monitor_bot(bot):
    while True:
        status = bot.get_status()
        print(bot.get_performance_report())
        
        # 检查异常情况
        stats = status['statistics']['risk']
        if stats['pnl']['daily'] < -stats['capital']['current'] * 0.03:
            logger.warning("日亏损超过3%，建议停止交易")
        
        await asyncio.sleep(300)  # 每5分钟检查
```

### 4. 错误处理

```python
async def robust_trading():
    max_retries = 3
    retry_delay = 60
    
    for attempt in range(max_retries):
        try:
            exchange = ccxt_async.binance({...})
            bot = TradingBot(...)
            
            await bot.start()
            break
            
        except ccxt_async.NetworkError as e:
            logger.error(f"网络错误: {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(retry_delay)
                continue
            else:
                raise
                
        except ccxt_async.ExchangeError as e:
            logger.error(f"交易所错误: {e}")
            raise
            
        except Exception as e:
            logger.error(f"未知错误: {e}", exc_info=True)
            raise
            
        finally:
            if exchange:
                await exchange.close()
```

---

## 常见问题

### Q1: 如何获取 API 密钥？

**Binance:**
1. 登录 Binance 账户
2. 进入 API 管理页面
3. 创建新的 API 密钥
4. 设置权限（需要交易权限）
5. 保存密钥（仅显示一次）

**测试网:**
- Binance Testnet: https://testnet.binance.vision/
- 可以获取测试用的 API 密钥和测试币

### Q2: 模拟交易和实盘交易的区别？

```python
# 模拟交易 (Paper Trading)
config = {'mode': 'paper'}
# - 不执行真实订单
# - 用于测试策略
# - 无资金风险

# 实盘交易 (Live Trading)
config = {'mode': 'live'}
# - 执行真实订单
# - 使用真实资金
# - 有资金风险
```

### Q3: 如何调整策略参数？

参考 `稳健盈利策略.md` 文档，主要参数：

```python
parameters = {
    "base_position_ratio": 0.01,    # 基础仓位比例
    "max_daily_loss": 0.03,         # 最大日亏损
    "atr_multiplier": 1.5,          # ATR止损倍数
    "sentiment_threshold_high": 75, # 情绪阈值
    "sentiment_threshold_low": 25,
}
```

### Q4: 如何处理网络问题？

```python
# 1. 启用速率限制
exchange = ccxt_async.binance({
    'enableRateLimit': True,  # 自动限速
    'rateLimit': 1000         # 毫秒
})

# 2. 设置超时
exchange.timeout = 30000  # 30秒

# 3. 重试机制
exchange.options['recvWindow'] = 60000
```

### Q5: 如何备份交易数据？

```python
# 定期保存交易历史
import json
from datetime import datetime

def backup_trading_data(bot):
    status = bot.get_status()
    
    backup_data = {
        'timestamp': datetime.now().isoformat(),
        'status': status,
        'risk_report': bot.risk_manager.get_statistics()
    }
    
    filename = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(filename, 'w') as f:
        json.dump(backup_data, f, indent=2)
```

### Q6: 支持哪些交易所？

目前已测试支持：
- ✅ Binance (币安)
- ✅ OKX (欧易)
- 🔄 其他 ccxt 支持的交易所（需要测试）

添加新交易所：

```python
# 在 config.py 中添加配置
NEW_EXCHANGE_API_KEY: Optional[str] = None
NEW_EXCHANGE_API_SECRET: Optional[str] = None

# 在 exchange_manager.py 中添加支持
elif exchange_name == 'new_exchange':
    config['apiKey'] = settings.NEW_EXCHANGE_API_KEY
    config['secret'] = settings.NEW_EXCHANGE_API_SECRET
```

---

## 📞 获取帮助

- 查看示例代码: `examples/auto_trading_example.py`
- 阅读策略文档: `文档/稳健盈利策略.md`
- 查看架构设计: `文档/架构设计.md`

---

## ⚠️ 免责声明

**重要提示：**

1. 本系统仅供学习和研究使用
2. 加密货币交易具有高风险
3. 请先在测试网充分测试
4. 不要投入超过承受能力的资金
5. 作者不对任何交易损失负责

**风险警告：** 量化交易不保证盈利，过去的表现不代表未来的结果。请谨慎使用，风险自负。
