# 🪙 Bitcoin Trader - 比特币自动化量化交易系统

基于 **CCXT** 的加密货币自动交易系统，集成稳健盈利策略，支持多交易所、实时监控和完整风险管理。

---

## 📖 快速导航

### 🚀 立即开始
- **[快速开始](文档/快速开始.md)** - 5分钟快速上手
- **[CCXT 集成指南](文档/CCXT集成指南.md)** - ⭐ 完整使用教程
- **[快速参考](文档/快速参考.md)** - 常用命令和配置

### 📚 核心文档
- **[架构设计](文档/架构设计.md)** - 系统架构说明
- **[策略执行流程](文档/策略执行流程.md)** - 交易策略详细流程
- **[稳健盈利策略](文档/稳健盈利策略.md)** - 主力策略说明
- **[稳健盈利说明](文档/稳健盈利说明.md)** - 策略实施指南

### 🛠️ 开发文档
- **[自定义策略开发](文档/自定义策略开发.md)** - 如何开发自己的策略

---

## 🎯 系统特点

### ✨ 核心功能
- ✅ **CCXT 集成** - 支持 Binance、OKX 等主流交易所
- ✅ **自动交易** - 24/7 全自动策略执行
- ✅ **实时监控** - WebSocket 实时行情和订单簿
- ✅ **风险管理** - 完整的仓位控制和资金管理
- ✅ **多交易对** - 同时管理多个交易对
- ✅ **策略可定制** - 灵活的策略参数配置

### 📊 技术特点
- **交易执行引擎** - 市价单、限价单、止损止盈
- **实时行情监控** - Ticker、K线、订单簿实时更新
- **风险控制系统** - 仓位计算、亏损限制、频率控制
- **多指标组合** - RSI、MACD、ATR、ADX、布林带
- **回测支持** - 策略回测验证

### 🏗️ 核心模块
- **TradingEngine** - 订单执行和持仓管理
- **MarketMonitor** - 实时行情监控
- **RiskManager** - 风险管理和资金控制
- **TradingBot** - 自动交易机器人

---

## 🚀 快速开始

### 1. 安装依赖
```bash
cd bitcoin_trader
pip install -r requirements.txt
```

### 2. 配置环境
```bash
# 复制配置文件
cp .env.example .env

# 编辑配置，填入API密钥
vim .env
```

### 3. 启动交易
```bash
# 开发模式
python run.py

# 或使用启动脚本
bash start.sh
```

### 4. 访问文档
- 在线文档: http://localhost:8000/docs
- 策略详情: 查看 [稳健盈利策略](文档/稳健盈利策略.md)

---

## 📦 项目结构

```
bitcoin_trader/
├── app/                      # 应用代码
│   ├── api/                  # API接口
│   ├── core/                 # 核心功能
│   │   ├── exchanges/        # 交易所接口
│   │   └── strategies/       # 交易策略
│   ├── config.py             # 配置管理
│   ├── models.py             # 数据模型
│   └── main.py               # 主程序
├── scripts/                  # 工具脚本
├── tests/                    # 测试代码
├── 文档/                     # 📚 项目文档
│   ├── 快速开始.md
│   ├── 架构设计.md
│   ├── 策略执行流程.md
│   ├── 稳健盈利策略.md
│   └── 自定义策略开发.md
├── requirements.txt          # 依赖列表
└── run.py                    # 启动脚本
```

---

## 🎮 使用示例

### 示例1: 基础自动交易机器人

```python
import asyncio
import ccxt.async_support as ccxt_async
from app.core.trading_bot import TradingBot
from app.core.strategies import SteadyProfitStrategy
from app.core.risk_manager import RiskLimits

async def main():
    # 1. 创建交易所实例
    exchange = ccxt_async.binance({
        'apiKey': 'your_api_key',
        'secret': 'your_api_secret',
        'enableRateLimit': True
    })
    exchange.set_sandbox_mode(True)  # 使用测试网
    
    try:
        # 2. 创建策略
        strategy = SteadyProfitStrategy()
        
        # 3. 配置风险限制
        risk_limits = RiskLimits(
            max_position_size=0.1,
            max_daily_loss=0.02,
            max_trades_per_day=10
        )
        
        # 4. 创建交易机器人
        bot = TradingBot(
            exchange=exchange,
            strategy=strategy,
            symbol='BTC/USDT',
            timeframe='15m',
            initial_capital=10000.0,
            risk_limits=risk_limits,
            config={'mode': 'paper'}  # paper=模拟, live=实盘
        )
        
        # 5. 启动机器人
        await bot.start()
        
    finally:
        await exchange.close()

asyncio.run(main())
```

### 示例2: 多交易对交易

```python
from app.core.trading_bot import MultiSymbolTradingBot

# 配置多个交易对
configs = [
    {'symbol': 'BTC/USDT', 'strategy': SteadyProfitStrategy(), 'timeframe': '15m'},
    {'symbol': 'ETH/USDT', 'strategy': SteadyProfitStrategy(), 'timeframe': '15m'},
]

multi_bot = MultiSymbolTradingBot(
    exchange=exchange,
    strategy_configs=configs,
    initial_capital=20000.0
)

await multi_bot.start()
```

### 示例3: 运行完整示例

```bash
# 运行自动交易示例
python examples/auto_trading_example.py

# 运行稳健盈利策略示例
python examples/steady_profit_example.py
```

---

## ⚙️ 配置说明

### 交易所配置
```bash
EXCHANGE_API_KEY=your_api_key
EXCHANGE_API_SECRET=your_api_secret
EXCHANGE_NAME=binance  # binance, okex, etc.
```

### 策略参数
```bash
STRATEGY_NAME=steady_profit
SYMBOL=BTC/USDT
TIMEFRAME=15m
POSITION_SIZE=0.01  # BTC数量
```

详细配置见 [快速开始](文档/快速开始.md)

---

## 📊 策略说明

### 稳健盈利策略
核心思路：通过技术指标组合，捕捉短期价格波动机会

**入场条件**:
- RSI 超卖（< 30）
- MACD 金叉
- 价格触及布林带下轨

**出场条件**:
- 止盈：+2%
- 止损：-1%
- RSI 超买（> 70）

详见 [稳健盈利策略](文档/稳健盈利策略.md)

---

## 🔍 监控与日志

### 实时监控
```bash
# 查看运行状态
curl http://localhost:8000/api/v1/status

# 查看持仓
curl http://localhost:8000/api/v1/positions

# 查看交易历史
curl http://localhost:8000/api/v1/trades
```

### 日志查看
```bash
tail -f logs/trading.log
```

---

## 🛡️ 风险提示

⚠️ **重要提醒**:
1. 加密货币交易具有高风险
2. 建议先在测试环境运行
3. 不要投入超过承受能力的资金
4. 务必设置止损，控制风险
5. 定期检查策略表现

---

## 🧪 测试

### 运行单元测试
```bash
pytest tests/
```

### 运行策略回测
```bash
python scripts/backtest.py
```

---

## 📝 开发指南

想开发自己的交易策略？查看：
- [自定义策略开发](文档/自定义策略开发.md)
- [架构设计](文档/架构设计.md)

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

MIT License

---

## 📞 获取帮助

- 查看 [快速开始](文档/快速开始.md)
- 阅读 [策略执行流程](文档/策略执行流程.md)
- 参考 [快速参考](文档/快速参考.md)

---

**风险警告**: 本系统仅供学习交流，不构成投资建议。请谨慎使用，风险自负。
