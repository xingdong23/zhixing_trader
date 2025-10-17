# Quant Trading - 股票量化交易模块

## 🎯 功能概述

股票量化交易系统，提供：
- ✅ 策略开发框架
- ✅ 策略回测引擎
- ✅ 实盘交易执行
- ✅ 信号生成管理
- ✅ 风险控制系统

## 📦 模块结构

```
quant_trading/
├── app/
│   ├── api/              # API接口
│   ├── core/             # 核心功能
│   │   ├── strategy/     # 策略引擎
│   │   ├── backtest/     # 回测引擎
│   │   ├── trading/      # 交易引擎
│   │   └── risk/         # 风控引擎
│   ├── models/           # 数据模型
│   ├── services/         # 业务服务
│   └── repositories/     # 数据仓库
├── scripts/              # 工具脚本
├── tests/                # 测试代码
└── docs/                 # 文档
```

## 🚀 快速开始

### 安装依赖

```bash
cd quant_trading
pip install -r requirements.txt
```

### 启动服务

```bash
python run.py
```

服务将运行在: `http://localhost:8002`

### API文档

访问: `http://localhost:8002/docs`

## 📚 核心功能

### 1. 策略开发

```python
from app.core.strategy.base import BaseStrategy

class MyStrategy(BaseStrategy):
    async def analyze(self, symbol: str, kline_data):
        # 策略逻辑
        pass
```

### 2. 策略回测

```bash
# API调用
POST /api/v1/backtest
{
  "strategy_id": 1,
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "initial_capital": 100000
}
```

### 3. 实盘交易

```bash
# API调用
POST /api/v1/trading/execute
{
  "strategy_id": 1,
  "symbols": ["AAPL", "MSFT"]
}
```

## 🔗 与其他模块通信

### Trading Journal (交易日志)

```python
# 记录交易
import requests
response = requests.post(
    "http://localhost:8001/api/v1/trades",
    json=trade_data
)
```

### Market Data Service (市场数据)

```python
# 获取K线数据
from app.utils.market_data_helper import MultiProviderStrategy

strategy = MultiProviderStrategy()
data = await strategy.get_stock_data("AAPL")
```

## 📊 端口配置

- Quant Trading: `8002`
- Trading Journal: `8001`
- Market Data Service: `8003` (可选)

## 🛠️ 开发指南

### 添加新策略

1. 在 `app/core/strategy/` 创建策略目录
2. 实现策略类继承 `BaseStrategy`
3. 在 `strategies.py` 注册策略

### 运行测试

```bash
pytest tests/
```

## 📝 配置

编辑 `app/config.py` 或创建 `.env` 文件：

```bash
DATABASE_URL=mysql+pymysql://user:pass@localhost/db
DEBUG=false
LOG_LEVEL=INFO
```

## 🎓 内置策略

1. **EMA55回踩企稳策略**
   - 主升浪回踩EMA55不破
   - 1小时级别企稳

2. **均线缠绕突破策略**
   - 多条均线缠绕后向上突破
   - 回踩不破均线支撑

3. **龙头战法**
   - 识别行业龙头
   - 强势突破

4. **短线技术策略**
   - 技术形态识别
   - 短线交易机会

## 📞 支持

如有问题，请查看：
- API文档: http://localhost:8002/docs
- 架构文档: ../docs/
- 重构方案: ../REFACTOR_PLAN_V2.md

---

**版本**: 1.0.0  
**状态**: ✅ 运行中

