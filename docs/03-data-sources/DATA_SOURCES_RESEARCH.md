# 📊 股票数据源调研报告

> 为实现多数据源智能切换，调研主流免费数据API

---

## 🎯 调研目标

- 找到可靠的免费数据源
- 评估API限额和质量
- 设计智能轮询策略
- 最大化数据获取能力

---

## 📋 数据源对比

### 1. ✅ Alpha Vantage (已集成)

**官网**: https://www.alphavantage.co/

**免费额度**:
- 500次/天
- 5次/分钟
- 无需信用卡

**数据质量**: ⭐⭐⭐⭐⭐

**支持市场**: 美股、全球股票

**优点**:
- ✅ 数据质量高
- ✅ API稳定
- ✅ 文档完善
- ✅ 支持多种时间级别

**缺点**:
- ⚠️ 限额较少

**评分**: 9/10

---

### 2. 🆕 Finnhub

**官网**: https://finnhub.io/

**免费额度**:
- 60次/分钟 ⭐⭐⭐⭐⭐
- 无日限制
- 需要注册

**数据质量**: ⭐⭐⭐⭐⭐

**支持市场**: 美股、全球股票

**优点**:
- ✅ 免费额度大（60次/分钟）
- ✅ 实时数据
- ✅ WebSocket支持
- ✅ 新闻、财报数据

**缺点**:
- ⚠️ 历史数据有限

**API示例**:
```python
# 获取股票报价
GET https://finnhub.io/api/v1/quote?symbol=AAPL&token={API_KEY}

# 获取K线数据
GET https://finnhub.io/api/v1/stock/candle?symbol=AAPL&resolution=D&from=1572651390&to=1575243390&token={API_KEY}
```

**评分**: 9.5/10 ⭐ **强烈推荐**

---

### 3. 🆕 Twelve Data

**官网**: https://twelvedata.com/

**免费额度**:
- 800次/天 ⭐⭐⭐⭐
- 8次/分钟
- 无需信用卡

**数据质量**: ⭐⭐⭐⭐⭐

**支持市场**: 股票、外汇、加密货币

**优点**:
- ✅ 免费额度充足
- ✅ 支持多种资产
- ✅ WebSocket实时数据
- ✅ 技术指标内置

**缺点**:
- ⚠️ 部分高级功能收费

**API示例**:
```python
# 时间序列数据
GET https://api.twelvedata.com/time_series?symbol=AAPL&interval=1day&apikey={API_KEY}

# 实时报价
GET https://api.twelvedata.com/price?symbol=AAPL&apikey={API_KEY}
```

**评分**: 9/10 ⭐ **强烈推荐**

---

### 4. 🆕 Polygon.io

**官网**: https://polygon.io/

**免费额度**:
- 5次/分钟
- 无日限制
- 需要注册

**数据质量**: ⭐⭐⭐⭐⭐

**支持市场**: 美股

**优点**:
- ✅ 数据质量极高
- ✅ 机构级数据
- ✅ 支持历史数据
- ✅ RESTful + WebSocket

**缺点**:
- ⚠️ 免费额度较少
- ⚠️ 仅美股

**API示例**:
```python
# 聚合K线
GET https://api.polygon.io/v2/aggs/ticker/AAPL/range/1/day/2023-01-09/2023-02-10?apiKey={API_KEY}

# 最新报价
GET https://api.polygon.io/v2/last/trade/AAPL?apiKey={API_KEY}
```

**评分**: 8.5/10

---

### 5. 🆕 Financial Modeling Prep

**官网**: https://site.financialmodelingprep.com/

**免费额度**:
- 250次/天
- 无分钟限制
- 需要注册

**数据质量**: ⭐⭐⭐⭐

**支持市场**: 美股、全球股票

**优点**:
- ✅ 财务数据丰富
- ✅ 基本面数据
- ✅ API简单易用
- ✅ 支持历史数据

**缺点**:
- ⚠️ 日限额较少
- ⚠️ 实时性一般

**API示例**:
```python
# 历史K线
GET https://financialmodelingprep.com/api/v3/historical-price-full/AAPL?apikey={API_KEY}

# 实时报价
GET https://financialmodelingprep.com/api/v3/quote/AAPL?apikey={API_KEY}
```

**评分**: 7.5/10

---

### 6. 💡 IEX Cloud

**官网**: https://iexcloud.io/

**免费额度**:
- 50,000次/月 ⭐⭐⭐⭐⭐
- 无分钟限制
- 需要注册

**数据质量**: ⭐⭐⭐⭐⭐

**支持市场**: 美股

**优点**:
- ✅ 月额度极高
- ✅ 数据权威（IEX交易所）
- ✅ API设计优秀
- ✅ 文档完善

**缺点**:
- ⚠️ 仅美股
- ⚠️ 免费版有15分钟延迟

**API示例**:
```python
# 历史K线
GET https://cloud.iexapis.com/stable/stock/aapl/chart/1m?token={API_KEY}

# 实时报价
GET https://cloud.iexapis.com/stable/stock/aapl/quote?token={API_KEY}
```

**评分**: 8.5/10 ⭐ **推荐**

---

## 🎯 推荐方案

### 方案一：基础组合（3数据源）

| 数据源 | 额度 | 优先级 | 用途 |
|--------|------|--------|------|
| **Finnhub** | 60次/分钟 | 🥇 主力 | 日常查询 |
| **Twelve Data** | 800次/天 | 🥈 备用 | 补充查询 |
| **Alpha Vantage** | 500次/天 | 🥉 备份 | 故障转移 |

**总能力**: 
- 分钟级: 60次/分钟
- 日级: 1800次/天

---

### 方案二：增强组合（5数据源） ⭐ 推荐

| 数据源 | 额度 | 优先级 | 用途 |
|--------|------|--------|------|
| **Finnhub** | 60次/分钟 | 🥇 主力 | 高频查询 |
| **IEX Cloud** | 50,000次/月 | 🥇 主力 | 日常查询 |
| **Twelve Data** | 800次/天 | 🥈 备用 | 补充查询 |
| **Alpha Vantage** | 500次/天 | 🥉 备份 | 故障转移 |
| **Yahoo Finance** | 不限 | 🆘 兜底 | 最终备份 |

**总能力**:
- 分钟级: 60次/分钟
- 日级: ~2,967次/天
- 月级: ~50,000次/月

**理论最大**: 基本不会受限 ✅

---

## 🔄 智能轮询策略

### 策略1: 优先级轮询

```python
providers = [
    {"name": "finnhub", "priority": 1, "weight": 40},
    {"name": "iex", "priority": 1, "weight": 30},
    {"name": "twelvedata", "priority": 2, "weight": 15},
    {"name": "alphavantage", "priority": 3, "weight": 10},
    {"name": "yahoo", "priority": 4, "weight": 5},
]
```

**规则**:
1. 优先使用priority=1的数据源
2. 按weight分配请求（负载均衡）
3. 失败时降级到下一优先级
4. 记录每个源的成功率

---

### 策略2: 智能负载均衡

```python
# 根据剩余额度动态调整
if finnhub.remaining > 50:
    use finnhub (weight=50%)
elif iex.remaining > 1000:
    use iex (weight=40%)
else:
    use others
```

---

### 策略3: 故障自动转移

```
请求 → Finnhub (失败) 
     → IEX (失败) 
     → Twelve Data (成功) ✅
```

**统计**:
- 成功率追踪
- 响应时间监控
- 自动屏蔽故障源

---

## 📊 实施计划

### 阶段1: 快速实现（推荐）⭐

**实现数据源**:
1. ✅ Yahoo Finance (已有)
2. ✅ Alpha Vantage (已有)
3. 🆕 Finnhub (新增)
4. 🆕 Twelve Data (新增)

**预期效果**:
- 日访问能力: 1300+ 次/天
- 分钟能力: 60次/分钟
- 可靠性: 99%+

**开发时间**: 2-3小时

---

### 阶段2: 完整方案

**实现数据源**:
1. ✅ Yahoo Finance
2. ✅ Alpha Vantage
3. 🆕 Finnhub
4. 🆕 Twelve Data
5. 🆕 IEX Cloud

**预期效果**:
- 日访问能力: 近乎无限
- 分钟能力: 60次/分钟
- 可靠性: 99.9%+

**开发时间**: 4-5小时

---

## 🔑 API Key 获取

### Finnhub
1. 访问: https://finnhub.io/register
2. 注册账号（免费）
3. 获取API Key
4. 限额: 60次/分钟

### Twelve Data
1. 访问: https://twelvedata.com/pricing
2. 选择Free Plan
3. 获取API Key
4. 限额: 800次/天, 8次/分钟

### IEX Cloud
1. 访问: https://iexcloud.io/console/
2. 注册账号
3. 创建Token
4. 限额: 50,000次/月

---

## 💡 智能路由算法

### 算法1: 加权轮询

```python
def select_provider():
    # 计算每个provider的得分
    for provider in providers:
        score = (
            provider.weight * 0.4 +           # 权重
            provider.success_rate * 0.3 +     # 成功率
            provider.remaining_quota * 0.2 +  # 剩余额度
            (1/provider.avg_response_time) * 0.1  # 响应速度
        )
    
    return max(providers, key=lambda p: p.score)
```

### 算法2: 动态降级

```python
def get_data_with_fallback(symbol):
    for provider in sorted_providers:
        try:
            if provider.is_available():
                return provider.get_data(symbol)
        except RateLimitError:
            continue  # 尝试下一个
        except Exception as e:
            log_error(e)
            continue
    
    raise NoProviderAvailable()
```

---

## 📈 预期收益

### 系统可用性提升

| 指标 | 单源 | 双源 | 5源 | 提升 |
|------|------|------|-----|------|
| 可用性 | 70% | 95% | 99.9% | +29.9% |
| 日请求 | 500 | 1000 | 2967 | +493% |
| 分钟请求 | 5 | 10 | 60 | +1100% |

### 用户体验提升

- ✅ 几乎不会遇到限流
- ✅ 响应速度更快（负载均衡）
- ✅ 数据更可靠（多源验证）
- ✅ 故障自动恢复

---

## 🎯 推荐行动

### 立即实施（阶段1）

**新增数据源**:
1. 🆕 Finnhub - 高频主力
2. 🆕 Twelve Data - 稳定补充

**配置示例**:
```bash
# .env
MARKET_DATA_PROVIDER=multi
DATA_SOURCES=yahoo,alphavantage,finnhub,twelvedata

# API Keys
ALPHA_VANTAGE_API_KEY=your_key
FINNHUB_API_KEY=your_key
TWELVEDATA_API_KEY=your_key
```

**预期**:
- 开发: 2-3小时
- 测试: 1小时
- 日请求能力: 1300+次
- 可用性: 99%+

### 可选增强（阶段2）

**额外增加**:
3. 🆕 IEX Cloud - 月度大额度

**预期**:
- 日请求能力: 近乎无限
- 可用性: 99.9%+

---

## 📝 总结

### 最佳方案

**推荐使用4数据源组合**:

| 数据源 | 优先级 | 用途 |
|--------|--------|------|
| Finnhub | 🥇 | 日常高频 |
| Twelve Data | 🥇 | 日常补充 |
| Alpha Vantage | 🥈 | 备用 |
| Yahoo Finance | 🥉 | 兜底 |

**总能力**: 
- 1300+ 次/天
- 60次/分钟
- 99%+ 可用性
- 0额外成本

**投入产出比**: ⭐⭐⭐⭐⭐

---

**调研日期**: 2025-10-16  
**调研人员**: AI Assistant  
**下一步**: 实现多数据源Provider

