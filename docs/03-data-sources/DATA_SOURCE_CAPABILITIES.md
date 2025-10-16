# 数据源能力对比分析

> **目的**：为回测系统选择最合适的数据源，获取自选股的完整历史数据

## 📊 快速对比表

| 数据源 | 免费额度 | 支持时间级别 | 历史数据范围 | 适用场景 | 推荐度 |
|--------|---------|-------------|-------------|---------|--------|
| **Yahoo Finance** | 无限制(有隐形限流) | 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo | 最长20年(日线), 60天(1分钟线) | 日线及以上回测 | ⭐⭐⭐⭐⭐ |
| **Alpha Vantage** | 5次/分钟, 500次/天 | 1min, 5min, 15min, 30min, 60min, daily, weekly, monthly | 20年(日线), 最近1-2个月(分钟线) | 日线长期回测 | ⭐⭐⭐⭐ |
| **Finnhub** | 60次/分钟 | 1, 5, 15, 30, 60, D, W, M | 1年(免费版) | 实时数据 | ⭐⭐⭐ |
| **Twelve Data** | 8次/分钟, 800次/天 | 1min, 5min, 15min, 30min, 1h, 1day, 1week, 1month | 最多5000个数据点 | 中期回测 | ⭐⭐⭐⭐ |

---

## 1️⃣ Yahoo Finance（推荐用于回测）

### ✅ 优势
- **无需API Key**：完全免费，无需注册
- **数据量最大**：支持最长历史数据
- **时间级别最全**：从1分钟到月线都支持
- **数据质量高**：来自官方交易所数据

### ⚠️ 限制
- **隐形限流**：频繁请求会被临时封禁（通常几小时后恢复）
- **分钟线限制**：1分钟线数据只能获取最近7天，5分钟线最近60天
- **不稳定**：Yahoo可能随时调整API或限制

### 📈 支持的时间级别（interval）

| Interval | 说明 | 最大历史范围 | 适合场景 |
|----------|------|-------------|---------|
| `1m` | 1分钟线 | 7天 | 超短线回测 |
| `2m` | 2分钟线 | 60天 | 超短线回测 |
| `5m` | 5分钟线 | 60天 | 短线回测 |
| `15m` | 15分钟线 | 60天 | 日内回测 |
| `30m` | 30分钟线 | 60天 | 日内回测 |
| `60m` / `1h` | 1小时线 | 730天(2年) | 波段回测 |
| `90m` | 90分钟线 | 60天 | 波段回测 |
| `1d` | 日线 | 20年+ | **最常用** |
| `5d` | 5日线 | 20年+ | 周级别分析 |
| `1wk` | 周线 | 20年+ | 中长期回测 |
| `1mo` | 月线 | 20年+ | 长期趋势 |
| `3mo` | 季线 | 20年+ | 长期趋势 |

### 📅 Period（时间范围）参数
```python
periods = [
    "1d",      # 1天
    "5d",      # 5天
    "1mo",     # 1个月
    "3mo",     # 3个月
    "6mo",     # 6个月
    "1y",      # 1年
    "2y",      # 2年
    "5y",      # 5年
    "10y",     # 10年
    "ytd",     # 年初至今
    "max"      # 最大范围（可能20年+）
]
```

### 💡 回测建议
```python
# 日线回测（推荐）
interval = "1d"
period = "max"  # 获取最长历史，通常能拿到15-20年

# 小时线回测
interval = "1h"
period = "2y"   # 最多2年

# 15分钟线回测
interval = "15m"
period = "60d"  # 最多60天
```

### 🔧 使用示例
```python
from app.core.market_data import YahooFinanceProvider

provider = YahooFinanceProvider(rate_limit_delay=1.0)

# 获取AAPL的所有历史日线数据
data = await provider.get_stock_data("AAPL", period="max", interval="1d")
print(f"获取到 {len(data)} 条数据")
# 输出: 获取到 5000+ 条数据（约20年）
```

---

## 2️⃣ Alpha Vantage

### ✅ 优势
- **数据权威**：来自官方数据提供商
- **日线数据完整**：20年完整历史
- **API稳定**：不会被封禁

### ⚠️ 限制
- **严格限流**：免费版仅5次/分钟，500次/天
- **分钟线有限**：最近1-2个月
- **需要API Key**：需要注册获取

### 📈 支持的时间级别

| Function | Interval | 最大历史范围 | 说明 |
|----------|----------|-------------|------|
| `TIME_SERIES_INTRADAY` | 1min | 最近1-2个月 | 日内数据 |
| `TIME_SERIES_INTRADAY` | 5min | 最近1-2个月 | 日内数据 |
| `TIME_SERIES_INTRADAY` | 15min | 最近1-2个月 | 日内数据 |
| `TIME_SERIES_INTRADAY` | 30min | 最近1-2个月 | 日内数据 |
| `TIME_SERIES_INTRADAY` | 60min | 最近1-2个月 | 日内数据 |
| `TIME_SERIES_DAILY` | daily | **20年+** | **回测首选** |
| `TIME_SERIES_WEEKLY` | weekly | **20年+** | 周线数据 |
| `TIME_SERIES_MONTHLY` | monthly | **20年+** | 月线数据 |

### 📊 数据量分析
- **日线**：`outputsize=full` 可获取20年数据（约5000个交易日）
- **分钟线**：`outputsize=full` 约1-2个月数据（取决于交易日数量）
- **周线/月线**：20年以上完整数据

### 💡 回测建议
```python
# ⭐ 最佳使用场景：日线及以上级别回测
interval = "1d"
period = "max"  # 可获取20年数据

# 不推荐：分钟线回测（数据太少）
interval = "1min"
period = "max"  # 只能拿到1-2个月
```

### 🔧 使用示例
```python
from app.core.market_data import AlphaVantageProvider

provider = AlphaVantageProvider(
    api_key="YOUR_API_KEY",
    rate_limit_delay=12.0  # 5次/分钟 = 12秒/次
)

# 获取日线数据（推荐）
data = await provider.get_stock_data("AAPL", period="max", interval="1d")
print(f"获取到 {len(data)} 条数据")
# 输出: 获取到 5000+ 条数据（20年）

# ⚠️ 注意：5次/分钟限制意味着每天最多获取500只股票的数据！
```

### ⚠️ 批量获取限制
如果你有100只自选股：
- 每只股票1次API调用
- 100次调用 ÷ 5次/分钟 = **20分钟**
- 接近每日500次限制，第二天才能继续

---

## 3️⃣ Finnhub

### ✅ 优势
- **限流宽松**：60次/分钟
- **实时数据好**：适合获取最新报价
- **响应快**：API速度快

### ⚠️ 限制
- **历史数据短**：免费版仅1年
- **回测价值低**：不适合长期回测

### 📈 支持的时间级别

| Resolution | 说明 | 最大历史范围(免费版) |
|-----------|------|---------------------|
| `1` | 1分钟 | 1个月 |
| `5` | 5分钟 | 1个月 |
| `15` | 15分钟 | 1个月 |
| `30` | 30分钟 | 1个月 |
| `60` | 1小时 | 1年 |
| `D` | 日线 | 1年 |
| `W` | 周线 | 1年 |
| `M` | 月线 | 1年 |

### 💡 回测建议
```python
# ❌ 不推荐用于回测：历史数据太短
# ✅ 适合用于：实时数据补充
```

---

## 4️⃣ Twelve Data

### ✅ 优势
- **免费额度合理**：800次/天
- **数据点灵活**：可获取5000个数据点
- **时间级别全**：支持各种级别

### ⚠️ 限制
- **需要计算数据点**：5000点限制
- **限流较慢**：8次/分钟
- **需要API Key**

### 📈 支持的时间级别

| Interval | 说明 | 5000点能拿多久数据 |
|----------|------|-------------------|
| `1min` | 1分钟 | 约12个交易日（每天390点） |
| `5min` | 5分钟 | 约64个交易日 |
| `15min` | 15分钟 | 约192个交易日（约6个月） |
| `30min` | 30分钟 | 约385个交易日（约1.5年） |
| `1h` | 1小时 | 约770个交易日（约3年） |
| `1day` | 日线 | **5000个交易日（约20年）** ⭐ |
| `1week` | 周线 | 约96年 |
| `1month` | 月线 | 约416年 |

### 💡 回测建议
```python
# ⭐ 最佳使用场景：日线回测
interval = "1day"
# 5000个交易日 = 约20年数据

# 可用场景：小时线中期回测
interval = "1h"
# 5000点 = 约3年数据

# 不太够：15分钟线
interval = "15min"
# 5000点 = 约6个月数据
```

### 🔧 使用示例
```python
from app.core.market_data import TwelveDataProvider

provider = TwelveDataProvider(
    api_key="YOUR_API_KEY",
    rate_limit_delay=7.5  # 8次/分钟
)

# 获取日线数据
data = await provider.get_stock_data("AAPL", period="5y", interval="1d")
print(f"获取到 {len(data)} 条数据")
# 输出: 获取到 约1260 条数据（5年）
```

---

## 🎯 回测场景推荐

### 场景1：长期日线回测（1年+）

**推荐组合**：
1. **首选**：Yahoo Finance（免费，数据最全）
2. **备选**：Alpha Vantage（稳定但限流严格）
3. **备选**：Twelve Data（限制5000点）

```python
# 推荐配置
provider = YahooFinanceProvider(rate_limit_delay=2.0)  # 慢一点，避免被封
data = await provider.get_stock_data("AAPL", period="max", interval="1d")
```

**优势**：
- Yahoo Finance可获取15-20年数据
- 完全免费，无需API Key
- 数据质量高

**注意事项**：
- 批量获取时加大延迟（2-3秒/次）
- 分批处理，避免一次性请求太多
- 遇到限流就切换到Alpha Vantage

---

### 场景2：小时线波段回测（1-2年）

**推荐组合**：
1. **首选**：Yahoo Finance（可获取2年数据）
2. **备选**：Twelve Data（可获取3年数据，但点数限制）

```python
# Yahoo配置
data = await yahoo.get_stock_data("AAPL", period="2y", interval="1h")

# Twelve Data配置（如果Yahoo被限流）
data = await twelve.get_stock_data("AAPL", period="3y", interval="1h")
```

---

### 场景3：15分钟线短期回测（1-2个月）

**推荐组合**：
1. **首选**：Yahoo Finance（60天数据）
2. **备选**：Twelve Data（约6个月数据）

```python
data = await yahoo.get_stock_data("AAPL", period="60d", interval="15m")
```

---

### 场景4：分钟线超短线回测（不推荐）

**问题**：
- Yahoo: 1分钟线仅7天，5分钟线60天
- Alpha Vantage: 分钟线1-2个月
- Twelve Data: 1分钟线仅12天

**结论**：**不建议做分钟线回测**，数据太少，统计意义不足

如果必须做：
```python
# 5分钟线（最多60天）
data = await yahoo.get_stock_data("AAPL", period="60d", interval="5m")
```

---

## 🚀 批量回测方案

### 方案A：Yahoo为主（推荐）

**适用**：
- 自选股 ≤ 100只
- 不着急（可以分多次运行）

```python
# 配置
provider = YahooFinanceProvider(rate_limit_delay=2.0)

# 批量获取
for symbol in watchlist:
    data = await provider.get_stock_data(symbol, "max", "1d")
    # 保存到数据库
    save_to_db(symbol, data)
    await asyncio.sleep(2)  # 额外延迟
```

**时间估算**：
- 100只股票 × 2秒 = 200秒 ≈ **3.5分钟**

---

### 方案B：多数据源智能切换

**适用**：
- 自选股 > 100只
- 需要更快速度
- 可接受注册多个API

```python
from app.core.market_data import MultiProvider

provider = MultiProvider(
    providers=[
        ('yahoo', YahooFinanceProvider(rate_limit_delay=2.0)),
        ('alpha', AlphaVantageProvider(api_key="KEY1", rate_limit_delay=12.0)),
        ('alpha2', AlphaVantageProvider(api_key="KEY2", rate_limit_delay=12.0)),
        ('twelve', TwelveDataProvider(api_key="KEY3", rate_limit_delay=7.5)),
    ],
    strategy='load_balance'  # 负载均衡
)

# 批量获取（自动切换数据源）
results = await provider.get_multiple_stocks_data(
    watchlist, 
    period="max", 
    interval="1d"
)
```

**优势**：
- 多个Alpha Vantage账号 = 多倍速度
- Yahoo限流时自动切换
- 更稳定可靠

**时间估算**：
- 500只股票，3个数据源并行
- 约 **10-15分钟** 完成

---

## 📊 数据质量对比

| 数据源 | 准确性 | 完整性 | 延迟 | 复权处理 |
|--------|--------|--------|------|---------|
| Yahoo Finance | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 15分钟+ | 自动 |
| Alpha Vantage | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 实时 | 支持 |
| Finnhub | ⭐⭐⭐⭐ | ⭐⭐⭐ | 实时 | 需手动 |
| Twelve Data | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 实时 | 支持 |

---

## 💰 成本分析（付费版）

如果免费版不够用，付费版价格参考：

| 数据源 | 免费版 | 付费版价格 | 升级获得 |
|--------|--------|-----------|---------|
| **Alpha Vantage** | 5次/分, 500次/天 | $50/月 起 | 75次/分, 无日限制 |
| **Finnhub** | 60次/分, 1年历史 | $10/月 起 | 300次/分, 5年历史 |
| **Twelve Data** | 8次/分, 800次/天 | $29/月 起 | 更多请求，实时数据 |
| **Yahoo Finance** | 免费 | N/A | 无付费版 |

**结论**：对于回测，**免费的Yahoo Finance已经足够**！

---

## 🎯 最终推荐方案

### 🥇 方案1：纯Yahoo（最简单）

```python
# 优势：完全免费，数据最全
# 劣势：可能遇到限流

provider = YahooFinanceProvider(rate_limit_delay=2.0)

for symbol in watchlist:
    try:
        data = await provider.get_stock_data(symbol, "max", "1d")
        save_to_db(symbol, data)
    except Exception as e:
        logger.error(f"获取 {symbol} 失败: {e}")
        # 等待后重试
        await asyncio.sleep(60)
```

---

### 🥈 方案2：Yahoo + Alpha Vantage（推荐）

```python
# 优势：互相备份，更可靠
# 劣势：需要注册Alpha Vantage

from app.core.market_data import HybridProvider

provider = HybridProvider(
    primary=YahooFinanceProvider(rate_limit_delay=2.0),
    fallback=AlphaVantageProvider(api_key="YOUR_KEY", rate_limit_delay=12.0)
)

# Yahoo失败自动切换到Alpha Vantage
data = await provider.get_stock_data(symbol, "max", "1d")
```

---

### 🥉 方案3：多数据源+多账号（最强）

```python
# 优势：速度最快，最稳定
# 劣势：需要注册多个账号

from app.core.market_data import ScenarioRouter

router = ScenarioRouter()

# 为历史数据场景配置多数据源
router.configure_scenario('historical', [
    ('yahoo', 0.5, 2.0),    # 50%概率，2秒延迟
    ('alpha1', 0.3, 12.0),  # 30%概率
    ('alpha2', 0.2, 12.0),  # 20%概率
])

# 智能获取数据
data = await router.get_data(
    symbol, 
    period="max", 
    interval="1d",
    scenario="historical"
)
```

---

## 📝 实施步骤

### Step 1: 测试单个数据源

```python
# 创建测试脚本
async def test_provider():
    provider = YahooFinanceProvider()
    
    # 测试获取数据
    data = await provider.get_stock_data("AAPL", "max", "1d")
    
    print(f"获取到 {len(data)} 条数据")
    print(f"最早日期: {data[0].datetime}")
    print(f"最新日期: {data[-1].datetime}")
    print(f"数据跨度: {(data[-1].datetime - data[0].datetime).days} 天")
```

### Step 2: 保存到数据库

```python
from app.core.kline_manager import KLineManager

async def backfill_historical_data(symbol: str):
    # 获取数据
    provider = YahooFinanceProvider(rate_limit_delay=2.0)
    data = await provider.get_stock_data(symbol, "max", "1d")
    
    # 保存到daily表
    manager = KLineManager(db_session)
    await manager.bulk_insert_klines(
        stock_code=symbol,
        period="daily",
        klines=data
    )
    
    print(f"✅ {symbol}: 保存 {len(data)} 条日线数据")
```

### Step 3: 批量处理自选股

```python
async def backfill_all_watchlist():
    # 获取自选股列表
    watchlist = get_all_watchlist_stocks()
    
    total = len(watchlist)
    success = 0
    failed = []
    
    for idx, symbol in enumerate(watchlist, 1):
        try:
            print(f"[{idx}/{total}] 处理 {symbol}...")
            await backfill_historical_data(symbol)
            success += 1
            
        except Exception as e:
            logger.error(f"❌ {symbol} 失败: {e}")
            failed.append(symbol)
        
        # 延迟避免限流
        await asyncio.sleep(2)
    
    print(f"\n完成！成功: {success}, 失败: {len(failed)}")
    if failed:
        print(f"失败列表: {failed}")
```

---

## 📚 参考文档

- [Yahoo Finance yfinance文档](https://github.com/ranaroussi/yfinance)
- [Alpha Vantage API文档](https://www.alphavantage.co/documentation/)
- [Finnhub API文档](https://finnhub.io/docs/api)
- [Twelve Data API文档](https://twelvedata.com/docs)

---

## ⚡ 快速结论

### 对于回测系统，最佳选择是：

1. **Yahoo Finance（日线）** - 15-20年数据，完全免费 ✅
2. **Yahoo Finance（1小时线）** - 2年数据 ✅
3. **Yahoo Finance（15分钟线）** - 60天数据 ⚠️
4. **分钟线回测** - 数据太少，不建议 ❌

### 推荐配置：

```python
# 在 config.py 中
BACKTEST_DATA_SOURCE = "yahoo"  # 主数据源
BACKTEST_INTERVAL = "1d"        # 推荐日线
BACKTEST_PERIOD = "max"         # 获取最长历史
RATE_LIMIT_DELAY = 2.0          # 2秒延迟，避免限流
```

**开始回测前，先运行一次批量数据获取，将历史数据保存到数据库，后续回测直接从数据库读取即可！**

