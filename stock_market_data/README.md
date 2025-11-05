# 📊 Market Data Service - 市场数据服务

独立的市场数据服务模块，提供统一的数据源接入能力，支持历史数据、实时K线、股票信息等。

---

## 📖 快速导航

### 🚀 快速开始
- **[集成指南](文档/快速开始/集成指南.md)** - 如何在项目中集成本服务
- **[数据源准备](文档/快速开始/数据源准备.md)** - 数据源API密钥申请
- **[最终配置方案](文档/快速开始/最终配置方案.md)** - 推荐的配置方案

### 🔌 数据源配置
- **[数据源选择方案](文档/数据源配置/数据源选择方案.md)** - 数据源对比和选择
- **[数据源能力对比](文档/数据源配置/数据源能力对比.md)** - 各数据源功能对比
- **[数据源调研](文档/数据源配置/数据源调研.md)** - 数据源详细调研
- **[多数据源配置](文档/数据源配置/多数据源配置.md)** - 配置多个数据源
- **[AlphaVantage配置](文档/数据源配置/AlphaVantage配置.md)** - Alpha Vantage配置
- **[AlphaVantage信息](文档/数据源配置/AlphaVantage信息.md)** - Alpha Vantage详情
- **[AlphaVantage集成](文档/数据源配置/AlphaVantage集成.md)** - 集成步骤
- **[AlphaVantage详细配置](文档/数据源配置/AlphaVantage详细配置.md)** - 详细配置说明

### 🏢 富途集成
- **[富途API指南](文档/富途集成/富途API指南.md)** - 富途OpenAPI集成
- **[富途快速开始](文档/富途集成/富途快速开始.md)** - 快速接入富途
- **[富途定价分析](文档/富途集成/富途定价分析.md)** - 富途服务定价

### 📈 测试报告
- **[数据源测试报告](文档/测试报告/数据源测试报告.md)** - 完整测试报告
- **[数据源测试结果](文档/测试报告/数据源测试结果.md)** - 测试结果汇总
- **[AlphaVantage测试报告](文档/测试报告/AlphaVantage测试报告.md)** - AV专项测试

### 🚀 高级功能
- **[高级优化](文档/高级功能/高级优化.md)** - 性能优化技巧
- **[多账户指南](文档/高级功能/多账户指南.md)** - 多账户负载均衡
- **[多数据源总结](文档/高级功能/多数据源总结.md)** - 多源策略总结

---

## 🎯 核心特性

### ✨ 主要功能
- ✅ **多数据源支持** - Yahoo Finance, Alpha Vantage, Twelve Data, Finnhub
- ✅ **智能切换** - 自动故障转移，负载均衡
- ✅ **统一接口** - 一致的API，简化集成
- ✅ **高可用性** - 多账户轮询，突破限流

### 📊 数据类型
- **历史K线** - 日线、周线、月线等
- **实时数据** - 实时价格、成交量
- **股票信息** - 公司概况、行业分类
- **技术指标** - 内置常用技术指标

---

## 🚀 快速开始

### 1. 安装依赖
```bash
cd market_data_service
pip install -r requirements.txt
```

### 2. 配置API密钥
```bash
# 复制配置示例
cp env.example .env

# 编辑配置文件
vim .env
```

配置示例：
```bash
# Yahoo Finance（免费，无需密钥）
YAHOO_FINANCE_ENABLED=true

# Alpha Vantage
ALPHA_VANTAGE_API_KEY_1=your_key_1
ALPHA_VANTAGE_API_KEY_2=your_key_2

# Twelve Data
TWELVE_DATA_API_KEY=your_key

# Finnhub
FINNHUB_API_KEY_1=your_key_1
```

### 3. 使用示例
```python
from market_data import MarketDataProviderFactory

# 创建提供者
provider = MarketDataProviderFactory.create_hybrid_provider()

# 获取历史数据
df = provider.get_historical_data("AAPL", period="1y")

# 获取股票信息
info = provider.get_stock_info("AAPL")
```

更多示例见 [examples/](examples/) 目录

---

## 📦 项目结构

```
market_data_service/
├── market_data/              # 核心代码
│   ├── providers/            # 数据提供者
│   │   ├── yahoo_provider.py        # Yahoo Finance
│   │   ├── alphavantage_provider.py # Alpha Vantage
│   │   ├── twelvedata_provider.py   # Twelve Data
│   │   ├── finnhub_provider.py      # Finnhub
│   │   ├── hybrid_provider.py       # 混合策略
│   │   └── multi_provider.py        # 多源策略
│   └── __init__.py           # 导出接口
├── examples/                 # 使用示例
│   ├── quick_start.py        # 快速开始
│   └── advanced_usage.py     # 高级用法
├── 文档/                     # 📚 项目文档
│   ├── 快速开始/
│   ├── 数据源配置/
│   ├── 富途集成/
│   ├── 测试报告/
│   └── 高级功能/
├── config.py                 # 配置管理
├── requirements.txt          # 依赖列表
└── README.md                 # 本文件
```

---

## 🔌 支持的数据源

### Yahoo Finance ⭐⭐⭐⭐⭐
- **优点**: 免费、稳定、数据全
- **限制**: 有时会被限流
- **推荐**: 作为主要数据源

### Alpha Vantage ⭐⭐⭐⭐
- **优点**: 数据准确、API完善
- **限制**: 免费版 25请求/天
- **推荐**: 作为备用数据源

### Twelve Data ⭐⭐⭐⭐
- **优点**: 数据质量高、限流较宽松
- **限制**: 免费版 800请求/天
- **推荐**: 作为补充数据源

### Finnhub ⭐⭐⭐
- **优点**: 实时数据快
- **限制**: 免费版功能有限
- **推荐**: 用于实时数据

### 富途 OpenAPI ⭐⭐⭐⭐⭐
- **优点**: 港股美股实时行情、交易功能
- **限制**: 需要开户、有延迟行情和实时行情
- **推荐**: 港股美股数据和实盘交易

详细对比见 [数据源能力对比](文档/数据源配置/数据源能力对比.md)  
富途集成见 [富途快速开始](文档/富途集成/富途快速开始.md)

---

## 🎮 使用示例

### 基础用法
```python
from market_data import YahooFinanceProvider

# 创建提供者
provider = YahooFinanceProvider()

# 获取历史数据
df = provider.get_historical_data(
    symbol="AAPL",
    period="1mo",
    interval="1d"
)

# 获取实时价格
price = provider.get_realtime_price("AAPL")
```

### 混合策略（推荐）
```python
from market_data import MarketDataProviderFactory

# 创建混合策略提供者
provider = MarketDataProviderFactory.create_hybrid_provider()

# 自动选择最优数据源
df = provider.get_historical_data("AAPL", period="1y")
info = provider.get_stock_info("AAPL")
```

### 多账户负载均衡
```python
from market_data import MultiAccountProvider

# 配置多个API密钥
provider = MultiAccountProvider(
    provider_type="alphavantage",
    api_keys=["key1", "key2", "key3"]
)

# 自动轮询使用不同账户
for symbol in ["AAPL", "GOOGL", "MSFT"]:
    data = provider.get_historical_data(symbol)
```

更多示例见 [examples/](examples/) 目录

---

## ⚙️ 配置说明

### 环境变量
```bash
# 数据源开关
YAHOO_FINANCE_ENABLED=true
ALPHA_VANTAGE_ENABLED=true
TWELVE_DATA_ENABLED=true
FINNHUB_ENABLED=true

# API密钥（多账户）
ALPHA_VANTAGE_API_KEY_1=xxx
ALPHA_VANTAGE_API_KEY_2=xxx
TWELVE_DATA_API_KEY=xxx
FINNHUB_API_KEY_1=xxx
FINNHUB_API_KEY_2=xxx

# 优先级配置
PRIMARY_PROVIDER=yahoo
FALLBACK_PROVIDERS=alphavantage,twelvedata
```

详细配置见 [最终配置方案](文档/快速开始/最终配置方案.md)

---

## 🔄 智能切换策略

### 场景路由
系统根据不同场景自动选择最优数据源：

| 场景 | 优先数据源 | 备用数据源 |
|------|-----------|----------|
| 历史K线 | Yahoo Finance | Alpha Vantage |
| 股票信息 | Alpha Vantage | Twelve Data |
| 实时数据 | Finnhub | Yahoo Finance |
| 批量查询 | 多账户轮询 | 混合策略 |

### 故障转移
- 自动检测API错误
- 自动切换到备用数据源
- 记录失败次数，智能降级

详见 [高级优化](文档/高级功能/高级优化.md)

---

## 📊 性能优化

### 缓存策略
```python
# 启用缓存
provider = YahooFinanceProvider(enable_cache=True)

# 历史数据缓存1小时
df = provider.get_historical_data("AAPL", cache_ttl=3600)
```

### 批量请求
```python
# 批量获取多只股票
symbols = ["AAPL", "GOOGL", "MSFT"]
data = provider.get_batch_data(symbols)
```

### 并发控制
```python
# 控制并发数，避免限流
provider = MultiAccountProvider(
    max_concurrent=5,
    rate_limit=10  # 10请求/秒
)
```

---

## 🧪 测试

### 运行测试
```bash
# 运行所有测试
pytest tests/

# 测试特定数据源
pytest tests/test_yahoo.py
pytest tests/test_alphavantage.py
```

### 查看测试报告
- [数据源测试报告](文档/测试报告/数据源测试报告.md)
- [测试结果汇总](文档/测试报告/数据源测试结果.md)

---

## 🔧 开发指南

### 添加新数据源
```python
from market_data.providers.base import BaseProvider

class NewProvider(BaseProvider):
    def get_historical_data(self, symbol, **kwargs):
        # 实现你的逻辑
        pass
    
    def get_stock_info(self, symbol):
        # 实现你的逻辑
        pass
```

### 集成到项目
详见 [集成指南](文档/快速开始/集成指南.md)

---

## 💰 成本估算

### 免费方案（推荐）
- Yahoo Finance: 无限制
- Alpha Vantage: 25请求/天（多账户扩展）
- Twelve Data: 800请求/天
- **总成本**: $0/月

### 付费方案
- Alpha Vantage Pro: $49.99/月
- Twelve Data Pro: $79/月
- Finnhub Pro: $59/月

详见 [数据源调研](文档/数据源配置/数据源调研.md)

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 贡献指南
1. Fork 本项目
2. 创建特性分支
3. 提交代码
4. 发起 Pull Request

---

## 📄 许可证

MIT License

---

## 📞 获取帮助

- 查看 [集成指南](文档/快速开始/集成指南.md)
- 阅读 [数据源配置](文档/数据源配置/)
- 参考 [使用示例](examples/)

---

**独立模块**: 本模块可独立使用，也可集成到其他项目中。
