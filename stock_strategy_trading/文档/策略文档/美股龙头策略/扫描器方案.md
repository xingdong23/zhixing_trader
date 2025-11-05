# 美股龙头股扫描方案 - 数据获取策略

## 🎯 核心问题

龙头策略需要的数据：
1. **板块数据**：板块涨跌幅、成交量、活跃股票数
2. **股票列表**：板块内所有股票
3. **实时数据**：最新价格、涨跌幅、成交量
4. **技术指标**：均线、ATR、RSI等

## 📋 现有数据源能力

### 1. Yahoo Finance ⭐⭐⭐
**优势**：
- ✅ 免费无限（有隐形限流）
- ✅ 能获取：股票信息（包括sector字段）
- ✅ 能获取：K线数据

**限制**：
- ❌ 没有板块列表API
- ❌ 没有板块涨跌幅API
- ❌ 没有筛选/排行榜API
- ❌ 需要知道股票代码才能查询

### 2. Alpha Vantage ⭐⭐
**优势**：
- ✅ 能获取：股票sector信息
- ✅ 数据质量高

**限制**：
- ❌ 严格限流（5次/分钟）
- ❌ 没有板块扫描API
- ❌ 没有筛选功能

### 3. Finnhub ⭐⭐⭐⭐
**优势**：
- ✅ 限流宽松（60次/分钟）
- ✅ **支持股票筛选** （Stock Screener）
- ✅ 支持行业分类
- ✅ 支持市场数据

**可用API**：
```python
# 1. 股票筛选器
GET /stock/screener

# 2. 市场新闻（按行业）
GET /news

# 3. 推荐股票
GET /stock/recommendation

# 4. 行业分类
GET /stock/profile2
```

### 4. TwelveData ⭐⭐⭐
**优势**：
- ✅ 支持筛选API
- ✅ 支持市场扫描

**限制**：
- ❌ 限流较慢（8次/分钟）

---

## 🎯 解决方案（3种方案）

### 方案1：使用Finnhub Stock Screener（推荐） ⭐⭐⭐⭐⭐

Finnhub提供了股票筛选功能，可以筛选：
- 市值
- 涨跌幅
- 成交量
- 行业/板块

#### 实现步骤

```python
# 扩展FinnhubProvider，添加筛选功能

class FinnhubProvider:
    async def screen_stocks(self, filters: Dict[str, Any]) -> List[Dict]:
        """
        股票筛选
        
        可用筛选条件：
        - exchange: 交易所（如 US）
        - marketCapMoreThan: 最小市值
        - marketCapLessThan: 最大市值
        - priceMoreThan: 最低价格
        - priceLessThan: 最高价格
        - betaMoreThan: Beta值
        - volumeMoreThan: 最小成交量
        - dividendMoreThan: 最小股息率
        - isActivelyTrading: 是否活跃交易
        """
        endpoint = "stock/screener"
        params = {
            "exchange": "US",
            **filters
        }
        return await self._request(endpoint, params)
    
    async def get_market_movers(self) -> Dict[str, List]:
        """
        获取市场热门股票
        返回：
        - gainers: 涨幅榜
        - losers: 跌幅榜
        - actives: 成交量榜
        """
        # Finnhub暂无直接API，需要通过筛选实现
        # 按涨跌幅排序
        pass
```

#### 优势
- ✅ 官方API，稳定可靠
- ✅ 限流宽松（60次/分钟）
- ✅ 可以按行业筛选

#### 劣势
- ⚠️ 免费版功能有限
- ⚠️ 没有直接的"板块热度"API
- ⚠️ 需要自己计算板块指标

---

### 方案2：自建扫描系统（推荐，最灵活） ⭐⭐⭐⭐⭐

**核心思路**：
1. 维护一个**股票池**（如SP500、NASDAQ100）
2. 定时获取所有股票的最新数据
3. 按sector/industry分组
4. 计算板块指标和排名

#### 数据流程

```
┌─────────────────────────────────┐
│ 1. 初始化股票池                 │
│    - SP500成分股                │
│    - NASDAQ100                  │
│    - 用户自选                   │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ 2. 定时扫描（每15分钟-1小时）    │
│    - 获取所有股票最新报价        │
│    - 使用Yahoo Finance批量获取  │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ 3. 计算板块指标                 │
│    - 按sector分组               │
│    - 计算板块平均涨跌幅         │
│    - 计算板块成交量             │
│    - 统计大涨股票数             │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ 4. 识别热点板块                 │
│    - 热度评分                   │
│    - 排名                       │
│    - 保存到数据库               │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ 5. 识别龙头股                   │
│    - 在热点板块内筛选           │
│    - 计算龙头分数               │
│    - 生成交易信号               │
└─────────────────────────────────┘
```

#### 实现代码框架

```python
# 1. 股票池管理器
class StockUniverseManager:
    """股票池管理"""
    
    def get_sp500_stocks(self) -> List[str]:
        """获取SP500成分股"""
        # 可以从Wikipedia或其他来源获取
        # https://en.wikipedia.org/wiki/List_of_S%26P_500_companies
        pass
    
    def get_nasdaq100_stocks(self) -> List[str]:
        """获取NASDAQ100成分股"""
        pass
    
    def get_custom_watchlist(self) -> List[str]:
        """获取用户自选股"""
        pass
    
    def get_all_stocks(self) -> List[str]:
        """获取完整股票池"""
        return (
            self.get_sp500_stocks() +
            self.get_nasdaq100_stocks() +
            self.get_custom_watchlist()
        )

# 2. 市场扫描器
class MarketScanner:
    """市场扫描器"""
    
    async def scan_all_stocks(self) -> List[Dict]:
        """
        扫描所有股票
        返回：每只股票的最新数据
        """
        stocks = self.universe_manager.get_all_stocks()
        
        results = []
        for symbol in stocks:
            try:
                # 获取最新报价
                quote = await self.data_provider.get_quote(symbol)
                
                # 获取股票信息（包括sector）
                info = await self.data_provider.get_stock_info(symbol)
                
                results.append({
                    "symbol": symbol,
                    "price": quote["price"],
                    "change_pct": quote["change_pct"],
                    "volume": quote["volume"],
                    "sector": info.get("sector", "Unknown"),
                    "industry": info.get("industry", "Unknown"),
                    "market_cap": info.get("market_cap", 0),
                })
                
                # 控制频率
                await asyncio.sleep(1)
                
            except Exception as e:
                logger.error(f"扫描{symbol}失败: {e}")
        
        return results

# 3. 板块分析器
class SectorAggregator:
    """板块数据聚合器"""
    
    def aggregate_by_sector(self, stock_data: List[Dict]) -> Dict[str, Any]:
        """按板块聚合数据"""
        
        sectors = {}
        
        for stock in stock_data:
            sector = stock["sector"]
            
            if sector not in sectors:
                sectors[sector] = {
                    "sector_name": sector,
                    "stocks": [],
                    "total_stocks": 0,
                    "gainers_count": 0,
                    "big_movers_count": 0,  # >5%
                    "total_volume": 0,
                }
            
            # 添加股票
            sectors[sector]["stocks"].append(stock)
            sectors[sector]["total_stocks"] += 1
            sectors[sector]["total_volume"] += stock["volume"]
            
            # 统计涨跌
            if stock["change_pct"] > 0:
                sectors[sector]["gainers_count"] += 1
            if stock["change_pct"] > 5:
                sectors[sector]["big_movers_count"] += 1
        
        # 计算板块指标
        for sector, data in sectors.items():
            stocks = data["stocks"]
            
            # 板块平均涨跌幅
            avg_return = sum(s["change_pct"] for s in stocks) / len(stocks)
            data["sector_return_1d"] = avg_return
            
            # 计算相对强度（vs SPY）
            spy_return = self.get_spy_return()
            data["relative_strength"] = avg_return - spy_return
            
            # 成交量比率（今日 vs 平均）
            # 这里需要历史数据支持
            data["volume_ratio"] = 1.5  # 简化
        
        return sectors

# 4. 龙头识别器
class LeaderScanner:
    """龙头股扫描器"""
    
    def scan_leaders_in_sector(
        self,
        sector_data: Dict[str, Any]
    ) -> List[Dict]:
        """扫描板块内龙头股"""
        
        stocks = sector_data["stocks"]
        
        # 按涨幅排序
        sorted_stocks = sorted(
            stocks,
            key=lambda x: x["change_pct"],
            reverse=True
        )
        
        leaders = []
        
        for rank, stock in enumerate(sorted_stocks[:10], 1):  # 前10名
            # 计算龙头分数
            leader_score = self.calculate_leader_score(
                stock, sector_data, rank
            )
            
            if leader_score >= 70:  # 龙头阈值
                leaders.append({
                    **stock,
                    "sector_rank": rank,
                    "leader_score": leader_score,
                    "is_confirmed_leader": rank <= 3,
                })
        
        return leaders
```

#### 优势
- ✅ 完全自主可控
- ✅ 可以自定义任何指标
- ✅ 可以扩展到任意数据源
- ✅ 可以保存历史数据用于回测

#### 劣势
- ⚠️ 需要维护股票池
- ⚠️ 扫描耗时（500只股票约10分钟）
- ⚠️ 占用API配额

---

### 方案3：使用第三方选股API（最简单） ⭐⭐⭐

使用专门的选股/筛选服务：

#### 选项A：Yahoo Finance Screener

Yahoo Finance有网页版股票筛选器，可以通过爬虫获取：
```
https://finance.yahoo.com/screener/predefined/most_actives
https://finance.yahoo.com/screener/predefined/day_gainers
https://finance.yahoo.com/screener/predefined/day_losers
```

#### 选项B：Financial Modeling Prep API

提供完整的筛选和市场数据API：
- 股票筛选
- 板块表现
- 热门股票

价格：免费250次/天，付费$14/月起

---

## 🎯 推荐实施方案

### 阶段1：MVP（最小可行产品）

**方案**：方案2（自建扫描）+ Yahoo Finance

**实施步骤**：

1. **建立股票池**（500只）
   ```python
   # SP500 + NASDAQ100 + 用户自选
   stock_universe = [
       "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA",
       # ... 更多股票
   ]
   ```

2. **定时扫描**（每小时1次）
   ```python
   async def hourly_scan():
       # 扫描所有股票
       stock_data = await scanner.scan_all_stocks()
       
       # 按板块聚合
       sectors = aggregator.aggregate_by_sector(stock_data)
       
       # 计算热度并保存
       for sector_name, sector_data in sectors.items():
           heat_score = sector_analyzer.calculate_heat_score(sector_data)
           save_to_db(sector_name, sector_data, heat_score)
       
       # 扫描龙头股
       for sector_name, sector_data in sectors.items():
           if sector_data["heat_score"] >= 70:
               leaders = leader_scanner.scan_leaders_in_sector(sector_data)
               save_leaders_to_db(leaders)
   ```

3. **API提供数据**
   ```python
   # 1. 获取热点板块
   GET /api/v1/us-sectors/hot
   
   # 2. 获取板块龙头股
   GET /api/v1/us-sectors/{sector_name}/leaders
   
   # 3. 获取交易信号
   GET /api/v1/us-signals/today
   ```

**时间估算**：
- 初始搭建：2-3天
- 数据采集：每小时10分钟（后台自动）

---

### 阶段2：优化（提升性能）

**优化点**：

1. **并发扫描**
   ```python
   # 使用asyncio并发请求
   tasks = [scan_stock(symbol) for symbol in stock_universe]
   results = await asyncio.gather(*tasks)
   
   # 500只股票，10并发，约3-5分钟
   ```

2. **增量更新**
   ```python
   # 只更新变化的数据
   # 使用Redis缓存
   ```

3. **多数据源**
   ```python
   # Yahoo主力 + Finnhub补充
   # 提高成功率和速度
   ```

---

## 📊 完整数据流

```
┌─────────────────────────────────────────────────┐
│            股票池（SP500 + NASDAQ100）            │
│                约500-600只股票                    │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│          定时扫描任务（每小时）                   │
│  ┌─────────────────────────────────────────┐   │
│  │ 1. 并发获取所有股票最新数据              │   │
│  │    - 价格、涨跌幅、成交量                │   │
│  │    - sector、market_cap                 │   │
│  └─────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│              按板块聚合                          │
│  ┌─────────────────────────────────────────┐   │
│  │ Technology: 120只股票                    │   │
│  │ Healthcare: 80只股票                     │   │
│  │ Energy: 45只股票                         │   │
│  │ ...                                      │   │
│  └─────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│          计算板块指标并排序                       │
│  ┌─────────────────────────────────────────┐   │
│  │ 1. 板块平均涨跌幅                        │   │
│  │ 2. 相对强度（vs SPY）                    │   │
│  │ 3. 成交量放大倍数                        │   │
│  │ 4. 大涨股票数（>5%）                     │   │
│  │ 5. 热度评分                              │   │
│  └─────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│       保存热点板块到数据库                        │
│       us_sector_hotspot 表                       │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│     在热点板块内识别龙头股                        │
│  ┌─────────────────────────────────────────┐   │
│  │ 1. 按涨幅排序                            │   │
│  │ 2. 计算龙头分数                          │   │
│  │ 3. 判断生命周期                          │   │
│  │ 4. 检测技术形态                          │   │
│  └─────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│       保存龙头股到数据库                          │
│       us_leading_stocks 表                       │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│          生成交易信号                             │
│  ┌─────────────────────────────────────────┐   │
│  │ 龙头 + 加速期 + 强形态 = BUY信号         │   │
│  └─────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│       保存交易信号到数据库                        │
│       us_trading_signals 表                      │
└─────────────────────────────────────────────────┘
```

---

## 💻 代码实现（核心部分）

### 1. 股票池初始化

```python
# scripts/init_stock_universe.py

SP500_STOCKS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA",
    "BRK.B", "JPM", "JNJ", "V", "WMT", "PG", "MA", "UNH",
    "HD", "DIS", "PYPL", "BAC", "CMCSA", "VZ", "ADBE",
    # ... 完整500只
]

NASDAQ100_STOCKS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA",
    "AVGO", "COST", "PEP", "CSCO", "TMUS", "NFLX", "INTC",
    # ... 完整100只
]

async def init_stock_universe():
    """初始化股票池到数据库"""
    all_stocks = list(set(SP500_STOCKS + NASDAQ100_STOCKS))
    
    for symbol in all_stocks:
        # 获取股票基本信息
        info = await provider.get_stock_info(symbol)
        
        # 保存到stocks表
        save_stock(
            code=symbol,
            name=info["name"],
            market="US",
            sector=info.get("sector", "Unknown"),
            industry=info.get("industry", "Unknown"),
        )
```

### 2. 市场扫描定时任务

```python
# app/core/scanner/market_scanner.py

from apscheduler.schedulers.asyncio import AsyncIOScheduler

class MarketScanner:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
    
    def start(self):
        """启动定时扫描"""
        # 每小时扫描一次
        self.scheduler.add_job(
            self.hourly_scan,
            'cron',
            hour='*',
            minute=0,
        )
        
        # 盘中每15分钟扫描一次（美东时间9:30-16:00）
        self.scheduler.add_job(
            self.realtime_scan,
            'cron',
            day_of_week='mon-fri',
            hour='9-15',
            minute='*/15',
            timezone='America/New_York'
        )
        
        self.scheduler.start()
    
    async def hourly_scan(self):
        """每小时扫描"""
        logger.info("开始每小时市场扫描...")
        
        # 1. 扫描所有股票
        stock_data = await self.scan_all_stocks()
        
        # 2. 按板块聚合
        sectors = self.aggregate_by_sector(stock_data)
        
        # 3. 保存板块数据
        await self.save_sector_data(sectors)
        
        # 4. 识别龙头股
        await self.scan_leaders(sectors)
        
        logger.info("市场扫描完成")
```

---

## ⏱️ 时间和资源估算

### 方案2实施

**开发时间**：
- Day 1: 股票池管理器 + 数据获取
- Day 2: 板块聚合 + 热度计算
- Day 3: 龙头识别 + 信号生成
- Day 4: 定时任务 + API接口
- Day 5: 测试和优化

**运行资源**：
- 扫描时间：500只股票 × 1秒 = 8-10分钟（并发可缩短到3-5分钟）
- 数据库：每小时约50MB数据
- API配额：无需额外API（使用Yahoo Finance）

---

## 🎯 立即可用的快速方案

如果想马上开始测试，可以先手动创建一个小股票池：

```python
# 手动定义热门科技股
TECH_STOCKS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA"]

# 手动定义生物科技股
BIOTECH_STOCKS = ["MRNA", "BNTX", "PFE", "JNJ", "ABBV"]

# 扫描这些股票，立即可以运行
```

---

## 📝 总结

### 推荐方案：方案2（自建扫描系统）

**原因**：
1. 现有数据源（Yahoo/Finnhub）不直接提供板块扫描
2. 自建系统最灵活，完全可控
3. 实施难度适中，约5天可完成
4. 无需额外API费用

### 下一步

1. **先创建股票池表**（增加sector字段）
2. **实现市场扫描器**（核心功能）
3. **实现板块聚合器**（计算热度）
4. **集成龙头策略**（使用已实现的USLeaderHunterStrategy）
5. **添加定时任务**（后台自动运行）

需要我帮你实现吗？

