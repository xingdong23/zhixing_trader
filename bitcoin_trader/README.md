# 比特币量化交易模块 (Bitcoin Trader)

## 项目简介

这是一个专门用于比特币量化交易的独立模块，支持多交易所API集成、策略回测、实时交易等功能。

## 主要特性

- 🔄 **多交易所支持**: Binance、OKX、Bybit 等主流交易所
- 📊 **实时行情**: WebSocket 实时K线数据
- 🤖 **量化策略**: 支持自定义交易策略
- 📈 **回测系统**: 历史数据回测验证
- ⚡ **高频交易**: 支持高频交易策略
- 🔐 **安全管理**: API密钥加密存储

## 技术栈

- **后端**: Python 3.9+, FastAPI
- **数据库**: MySQL (行情数据), Redis (缓存)
- **消息队列**: RabbitMQ (异步任务)
- **数据源**: CCXT (交易所API), Binance WebSocket

## 快速开始

### 1. 安装依赖

```bash
cd bitcoin_trader
pip install -r requirements.txt
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并填写配置：

```bash
cp .env.example .env
```

### 3. 初始化数据库

```bash
python scripts/init_database.py
```

### 4. 启动服务

```bash
# 开发模式
python run.py

# 生产模式
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

## 项目结构

```
bitcoin_trader/
├── app/                    # 应用主目录
│   ├── api/               # API路由
│   │   ├── v1/           # API v1版本
│   │   │   ├── trading.py    # 交易接口
│   │   │   ├── market.py     # 行情接口
│   │   │   ├── strategy.py   # 策略接口
│   │   │   └── backtest.py   # 回测接口
│   ├── core/              # 核心功能
│   │   ├── exchanges/    # 交易所连接器
│   │   ├── strategies/   # 交易策略
│   │   ├── backtest/     # 回测引擎
│   │   └── risk/         # 风险管理
│   ├── models/           # 数据模型
│   ├── services/         # 业务逻辑
│   ├── repositories/     # 数据访问层
│   ├── config.py         # 配置管理
│   └── main.py           # 应用入口
├── scripts/              # 工具脚本
├── tests/                # 测试
├── docs/                 # 文档
├── requirements.txt      # Python依赖
└── .env.example         # 环境变量示例
```

## 交易策略示例

### 简单移动平均策略 (SMA)

```python
from app.core.strategies import BaseStrategy

class SMAStrategy(BaseStrategy):
    def __init__(self, short_period=10, long_period=30):
        self.short_period = short_period
        self.long_period = long_period
    
    def analyze(self, klines):
        # 计算短期和长期移动平均线
        # 生成买卖信号
        pass
```

## 支持的交易所

- [x] Binance (币安)
- [x] OKX (欧易)
- [ ] Bybit
- [ ] Coinbase
- [ ] Kraken

## 数据采集

支持以下数据源：
- 实时K线数据 (1m, 5m, 15m, 1h, 4h, 1d)
- 订单簿数据
- 成交记录
- 资金费率

## 风险管理

- 持仓限制
- 止损止盈
- 最大回撤控制
- 资金管理

## 开发计划

- [ ] 基础框架搭建
- [ ] Binance API集成
- [ ] WebSocket实时数据
- [ ] 策略回测系统
- [ ] 实盘交易接口
- [ ] Web管理界面
- [ ] 风险监控告警

## 注意事项

⚠️ **风险提示**: 加密货币交易存在高风险，请谨慎使用本系统进行实盘交易。

## 许可证

MIT License

