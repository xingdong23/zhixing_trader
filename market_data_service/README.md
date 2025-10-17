# Market Data Service 市场数据服务

独立的市场数据获取服务模块，提供统一的API接口访问多个数据源。

## 🎯 特性

- ✅ **多数据源支持**: Yahoo Finance, Alpha Vantage, Finnhub, Twelve Data, IEX Cloud, FMP
- ✅ **智能负载均衡**: 自动分配请求到多个数据源
- ✅ **速率限制管理**: 自动处理各数据源的API限制
- ✅ **多账户支持**: 单个数据源支持多个API Key轮换
- ✅ **自动故障转移**: 一个数据源失败自动切换到备用源
- ✅ **缓存机制**: 减少重复请求，提升性能
- ✅ **异步支持**: 高性能异步数据获取

## 📦 安装

```bash
cd market_data_service
pip install -r requirements.txt
```

## ⚙️ 配置

### 1. 复制配置文件

```bash
cp env.example .env
```

### 2. 编辑 `.env` 文件，填入你的API Keys

```bash
# Alpha Vantage (推荐 - 免费)
ALPHA_VANTAGE_API_KEY_1=your_key_here
ALPHA_VANTAGE_API_KEY_2=your_key_here
ALPHA_VANTAGE_API_KEY_3=your_key_here

# Twelve Data (推荐 - 免费)
TWELVEDATA_API_KEY=your_key_here

# Finnhub (可选)
FINNHUB_API_KEY_1=your_key_here

# IEX Cloud (可选)
IEX_API_KEY=your_key_here
```

### 3. 数据源配置策略

在 `.env` 中配置数据源优先级和权重：

```bash
# 格式: provider:priority:weight
DATA_SOURCES_CONFIG=alphavantage1:1:25,alphavantage2:1:25,alphavantage3:1:20,twelvedata:1:20,yahoo:2:10
```

- **priority**: 1=高优先级, 2=中优先级, 3=低优先级
- **weight**: 负载均衡权重（0-100）

## 🚀 快速开始

### 基础用法

```python
from market_data import YahooFinanceProvider, AlphaVantageProvider
import asyncio

async def main():
    # 1. 使用单一数据源
    provider = YahooFinanceProvider()
    
    # 获取K线数据
    klines = await provider.get_stock_data(
        symbol="AAPL",
        period="1mo",
        interval="1d"
    )
    
    print(f"获取到 {len(klines)} 条K线数据")
    print(f"最新价格: ${klines[-1].close}")

asyncio.run(main())
```

### 多数据源策略

```python
from market_data import MultiProviderStrategy
from config import settings
import asyncio

async def main():
    # 2. 使用多数据源策略（推荐）
    strategy = MultiProviderStrategy()
    
    # 自动选择最佳数据源
    klines = await strategy.get_stock_data(
        symbol="AAPL",
        period="1mo",
        interval="1d"
    )
    
    # 获取股票信息（含Sector/Industry）
    info = await strategy.get_stock_info("AAPL")
    print(f"公司: {info['name']}")
    print(f"行业: {info['sector']} / {info['industry']}")
    print(f"市值: ${info['market_cap']/1e9:.2f}B")

asyncio.run(main())
```

### 多账户支持

```python
from market_data.providers import MultiAccountProvider
from market_data.providers import AlphaVantageProvider
from config import get_alpha_vantage_keys
import asyncio

async def main():
    # 3. 使用多账户轮换（突破单账户限制）
    alpha_keys = get_alpha_vantage_keys()
    
    providers = [
        AlphaVantageProvider(api_key=key, rate_limit_delay=12.0)
        for key in alpha_keys
    ]
    
    multi_account = MultiAccountProvider(providers)
    
    # 自动轮换使用不同账户
    for symbol in ["AAPL", "MSFT", "GOOGL", "AMZN"]:
        info = await multi_account.get_stock_info(symbol)
        print(f"{symbol}: {info['name']}")

asyncio.run(main())
```

## 📚 API 文档

### IMarketDataProvider 接口

所有数据提供者实现以下接口：

```python
class IMarketDataProvider(ABC):
    """市场数据提供者接口"""
    
    async def get_stock_data(
        self,
        symbol: str,
        period: str = "1mo",
        interval: str = "1d"
    ) -> List[KLineData]:
        """获取K线数据"""
        pass
    
    async def get_quote(self, symbol: str) -> Optional[QuoteData]:
        """获取实时报价"""
        pass
    
    async def get_stock_info(self, symbol: str) -> Optional[Dict]:
        """获取股票信息"""
        pass
```

### 支持的数据源

| 数据源 | 历史数据 | 实时报价 | 股票信息 | Sector/Industry | 免费额度 |
|--------|---------|---------|---------|----------------|---------|
| **Yahoo Finance** | ✅ | ✅ | ✅ | ✅ | 无限（有限流） |
| **Alpha Vantage** | ✅ | ✅ | ✅ | ✅ | 25次/天/key |
| **Twelve Data** | ✅ | ✅ | ❌ | ❌ | 800次/天 |
| **Finnhub** | ❌ | ✅ | ❌ | ❌ | 60次/分钟 |
| **IEX Cloud** | ✅ | ✅ | ✅ | ✅ | 50K credits/月 |
| **FMP** | ❌ | ❌ | ❌ | ❌ | 已停止免费 |

## 🧪 测试

```bash
# 测试所有数据源
python scripts/test_multi_data_sources.py

# 分析数据源能力
python scripts/analyze_data_source_capabilities.py
```

## 📖 详细文档

- [数据源能力对比](docs/DATA_SOURCE_CAPABILITIES.md)
- [Alpha Vantage集成指南](docs/ALPHA_VANTAGE_INTEGRATION.md)
- [多数据源策略](docs/MULTI_DATA_SOURCE_SUMMARY.md)
- [数据源测试报告](docs/DATA_SOURCE_TEST_REPORT.md)
- [富途API指南](docs/FUTU_API_GUIDE.md) (如果使用)

## 🔧 高级配置

### 自定义数据源策略

```python
from market_data import MultiProviderStrategy

# 创建自定义策略
strategy = MultiProviderStrategy()

# 配置数据源
strategy.configure({
    'alphavantage1': {'priority': 1, 'weight': 30},
    'alphavantage2': {'priority': 1, 'weight': 30},
    'twelvedata': {'priority': 1, 'weight': 25},
    'yahoo': {'priority': 2, 'weight': 15},
})
```

### 缓存配置

```python
# 在 config.py 中配置
ENABLE_CACHE = True
CACHE_TTL_QUOTE = 60      # 实时报价缓存1分钟
CACHE_TTL_KLINE = 3600    # K线数据缓存1小时
CACHE_TTL_INFO = 86400    # 股票信息缓存24小时
```

## 🤝 集成到其他项目

### 作为Python包使用

```python
# 在其他项目中
import sys
sys.path.insert(0, '/path/to/market_data_service')

from market_data import MultiProviderStrategy
from config import settings

# 使用
strategy = MultiProviderStrategy()
data = await strategy.get_stock_data("AAPL")
```

### 作为微服务使用

```python
# 创建一个简单的FastAPI服务
from fastapi import FastAPI
from market_data import MultiProviderStrategy

app = FastAPI()
strategy = MultiProviderStrategy()

@app.get("/api/kline/{symbol}")
async def get_kline(symbol: str, period: str = "1mo"):
    return await strategy.get_stock_data(symbol, period=period)

@app.get("/api/quote/{symbol}")
async def get_quote(symbol: str):
    return await strategy.get_quote(symbol)

@app.get("/api/info/{symbol}")
async def get_info(symbol: str):
    return await strategy.get_stock_info(symbol)
```

## 📊 性能建议

1. **使用多数据源策略**: 分散请求，提高可用性
2. **配置多个API Key**: 突破单账户限制
3. **启用缓存**: 减少重复请求
4. **合理设置速率限制**: 避免被封禁
5. **使用异步接口**: 提升并发性能

## 🐛 故障排查

### 常见问题

**Q: Alpha Vantage返回空数据？**
A: 检查是否超过每日25次限制，配置多个API Key。

**Q: Yahoo Finance频繁限流？**
A: 增加`YAHOO_RATE_LIMIT`值，或使用多数据源策略。

**Q: Finnhub无法获取历史数据？**
A: Finnhub免费版只支持实时报价，不支持历史K线。

**Q: 如何知道当前使用的是哪个数据源？**
A: 查看日志输出，会显示实际使用的provider。

## 📝 版本历史

### v1.0.0 (2025-10-17)
- ✅ 初始版本
- ✅ 支持5个主要数据源
- ✅ 多数据源策略
- ✅ 多账户支持
- ✅ 缓存机制
- ✅ 异步支持

## 📄 许可证

MIT License

## 👥 贡献者

欢迎贡献！请提交Pull Request或Issue。

## 🔗 相关链接

- [Alpha Vantage](https://www.alphavantage.co/)
- [Twelve Data](https://twelvedata.com/)
- [Yahoo Finance](https://finance.yahoo.com/)
- [IEX Cloud](https://iexcloud.io/)
- [Finnhub](https://finnhub.io/)

---

**注意**: 请遵守各数据源的使用条款和速率限制。


