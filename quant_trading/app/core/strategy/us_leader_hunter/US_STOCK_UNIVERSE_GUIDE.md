# 美股股票池完整指南

## 📊 美股市场股票数量真相

### 主要指数成分股

| 指数 | 股票数量 | 类型 | 特点 |
|------|---------|------|------|
| **SP500** | 500只 | 大盘蓝筹 | 市值最大的500家公司 |
| **NASDAQ100** | 100只 | 科技/成长 | 纳斯达克最大的100家非金融公司 |
| **Russell 2000** | 2000只 | 小盘股 | 小盘成长股 ⭐ |
| **SP600** | 600只 | 小盘股 | 小盘价值股 |
| **Wilshire 5000** | ~3500只 | 全市场 | 几乎所有美股 |

### 重叠情况

```
SP500 (500) + NASDAQ100 (100) = 约560只（去重后）
原因：很多科技巨头同时在两个指数中
如：AAPL, MSFT, GOOGL, AMZN, NVDA, META等

实际上市公司总数：
- NYSE: ~2800只
- NASDAQ: ~3300只
- AMEX: ~300只
总计：约6000-7000只
```

---

## 🎯 龙头策略应该扫描哪些股票？

### ❌ 不适合龙头策略的股票

```
SP500大盘蓝筹股：
- 市值太大（>1000亿美元）
- 波动性小
- 很少出现爆发性行情
- 不是龙头策略的目标

例如：
- AAPL（苹果，3万亿市值）- 太稳定
- MSFT（微软，3万亿市值）- 波动小
- JPM（摩根大通）- 金融蓝筹
```

### ✅ 适合龙头策略的股票

```
中小盘成长股：
- 市值：5亿-50亿美元（$500M - $5B）
- 容易受题材驱动
- 波动性大
- 有爆发潜力

例如：
- 生物医药小盘股（等FDA批准）
- 新能源/电动车概念股
- AI/科技创新公司
- 加密货币相关股票
```

---

## 📋 推荐股票池方案

### 方案1：Russell 2000（最推荐）⭐⭐⭐⭐⭐

**特点**：
- 2000只小盘股
- 正好符合龙头策略的市值要求
- 涵盖各个行业
- 容易出现热点龙头

**获取方式**：
```python
# Russell 2000成分股列表
# 可以从这里获取：
# https://www.ishares.com/us/products/239710/ishares-russell-2000-etf

# 或者通过API获取IWM（Russell 2000 ETF）的持仓
```

**扫描时间**：
- 2000只股票 × 1秒 = 约30-40分钟（并发可缩短到10-15分钟）

---

### 方案2：按市值筛选（更精准）⭐⭐⭐⭐⭐

**思路**：
不固定股票池，而是动态筛选符合条件的股票

**筛选条件**：
```python
筛选条件 = {
    "market_cap_min": 500_000_000,      # 5亿美元
    "market_cap_max": 5_000_000_000,    # 50亿美元
    "volume_min": 500_000,              # 日均成交量 > 50万股
    "price_min": 5,                     # 价格 > $5（避免仙股）
    "price_max": 100,                   # 价格 < $100
    "exchange": ["NYSE", "NASDAQ"],     # 主要交易所
}

# 这样筛选出来约1000-2000只股票
```

**优势**：
- 自动排除市值过大或过小的股票
- 自动排除流动性差的股票
- 符合策略目标

---

### 方案3：热门概念股池（最灵活）⭐⭐⭐⭐

**思路**：
维护多个概念股池，只扫描热门概念

**概念分类**：
```python
STOCK_POOLS = {
    "biotech": [
        # 生物医药股（约200只）
        "MRNA", "BNTX", "NVAX", "SAVA", "OCGN", ...
    ],
    
    "ev_energy": [
        # 新能源/电动车（约150只）
        "TSLA", "RIVN", "LCID", "NIO", "XPEV", "CHPT", ...
    ],
    
    "ai_tech": [
        # AI/科技（约100只）
        "NVDA", "AMD", "PLTR", "C3AI", "AI", "BBAI", ...
    ],
    
    "crypto": [
        # 加密货币相关（约80只）
        "COIN", "MARA", "RIOT", "MSTR", "HUT", ...
    ],
    
    "space": [
        # 太空探索（约50只）
        "RKLB", "ASTR", "SPCE", ...
    ],
    
    "cannabis": [
        # 大麻股（约60只）
        "TLRY", "CGC", "SNDL", "ACB", ...
    ],
}

# 总计：约600-800只核心概念股
```

**优势**：
- 扫描数量少（600-800只）
- 都是容易炒作的题材股
- 精准命中龙头策略目标
- 扫描时间短（10-15分钟）

---

## 🎯 最终推荐方案

### 组合方案：概念股池 + 动态筛选

```python
# 1. 核心概念股池（600-800只）
core_universe = load_concept_stocks()

# 2. 每日动态扫描这些股票
daily_scan_results = scan_stocks(core_universe)

# 3. 筛选出符合条件的（涨幅>3%, 成交量>均量2倍）
active_stocks = filter_active_stocks(daily_scan_results)

# 4. 在活跃股票中按板块分组
sectors = group_by_sector(active_stocks)

# 5. 计算板块热度 + 识别龙头
hot_sectors = identify_hot_sectors(sectors)
leaders = identify_leaders(hot_sectors)
```

**扫描频率**：每天1次（美东时间收盘后）

**扫描时间**：
- 600-800只股票
- 并发请求：约10-15分钟
- 每天只需运行一次

---

## 📊 数据获取方案

### 获取概念股列表

#### 方法1：从ETF持仓获取

很多概念都有对应的ETF，可以获取其持仓：

```python
# 生物科技ETF
IBB (iShares Biotechnology ETF) - 持仓约250只

# 清洁能源ETF
ICLN (iShares Clean Energy ETF) - 持仓约100只

# 半导体ETF
SOXX (iShares Semiconductor ETF) - 持仓约30只

# AI/科技ETF
ARKK (ARK Innovation ETF) - 持仓约40只
```

**实现代码**：
```python
async def get_etf_holdings(etf_symbol: str) -> List[str]:
    """
    获取ETF持仓股票列表
    可以通过爬虫或API获取
    """
    # 方法1: 爬取ETF官网持仓页面
    # 方法2: 使用Financial Modeling Prep API
    # 方法3: 手动维护（最简单）
    pass
```

#### 方法2：通过Finnhub获取

Finnhub提供股票筛选和分类：

```python
async def screen_stocks_by_criteria():
    """使用Finnhub筛选股票"""
    
    # 生物医药股
    biotech = await finnhub.screen_stocks({
        "exchange": "US",
        "sector": "Healthcare",
        "marketCapMoreThan": 500_000_000,
        "marketCapLessThan": 5_000_000_000,
    })
    
    # 科技股
    tech = await finnhub.screen_stocks({
        "exchange": "US",
        "sector": "Technology",
        "marketCapMoreThan": 500_000_000,
        "marketCapLessThan": 5_000_000_000,
    })
    
    return biotech + tech
```

#### 方法3：手动维护（推荐用于启动）

先手动创建一个精选股票池：

```python
# data/us_concept_stocks.json
{
    "biotech": [
        {"symbol": "MRNA", "name": "Moderna"},
        {"symbol": "BNTX", "name": "BioNTech"},
        {"symbol": "NVAX", "name": "Novavax"},
        // ... 约100-200只
    ],
    "ev_energy": [
        {"symbol": "TSLA", "name": "Tesla"},
        {"symbol": "RIVN", "name": "Rivian"},
        {"symbol": "LCID", "name": "Lucid Motors"},
        // ... 约100-150只
    ],
    // ... 更多概念
}
```

---

## 🚀 每日扫描流程（优化版）

### 时间安排

```
美东时间（EST）：

16:00 - 市场收盘
16:30 - 开始每日扫描
16:45 - 扫描完成（约15分钟）
17:00 - 计算板块热度
17:15 - 识别龙头股
17:30 - 生成交易信号
18:00 - 发送通知给用户

北京时间（CST，+13小时）：
05:00 - 开始扫描
05:30 - 扫描完成
06:00 - 信号生成完成
```

### 扫描内容

```python
# 每日扫描任务
async def daily_market_scan():
    """每日市场扫描（收盘后运行）"""
    
    logger.info("=" * 60)
    logger.info("开始每日市场扫描")
    logger.info("=" * 60)
    
    # 1. 获取股票池（600-800只概念股）
    stock_universe = get_concept_stocks_universe()
    logger.info(f"股票池数量: {len(stock_universe)}")
    
    # 2. 并发获取所有股票的今日数据
    stock_data = await batch_get_stock_data(
        symbols=stock_universe,
        period="1d",  # 只需要今天的数据
        interval="1d"
    )
    logger.info(f"成功获取: {len(stock_data)} 只股票数据")
    
    # 3. 筛选活跃股票（涨幅>3% 或 成交量>均量2倍）
    active_stocks = filter_active_stocks(stock_data)
    logger.info(f"活跃股票: {len(active_stocks)} 只")
    
    # 4. 按板块分组
    sectors = group_by_sector(active_stocks)
    logger.info(f"涉及板块: {len(sectors)} 个")
    
    # 5. 计算板块热度
    for sector_name, sector_stocks in sectors.items():
        heat_score = calculate_sector_heat(sector_stocks)
        
        # 保存到数据库
        save_sector_to_db(
            date=datetime.today(),
            sector_name=sector_name,
            heat_score=heat_score,
            stocks=sector_stocks,
        )
        
        logger.info(f"  - {sector_name}: {heat_score:.1f}分")
    
    # 6. 识别热点板块的龙头股（热度>=70）
    hot_sectors = {k: v for k, v in sectors.items() 
                   if calculate_sector_heat(v) >= 70}
    
    all_leaders = []
    for sector_name, sector_stocks in hot_sectors.items():
        leaders = identify_sector_leaders(sector_name, sector_stocks)
        all_leaders.extend(leaders)
        
        logger.info(f"  - {sector_name}: 发现 {len(leaders)} 只龙头股")
    
    # 7. 生成交易信号
    signals = []
    for leader in all_leaders:
        signal = generate_trading_signal(leader)
        if signal:
            signals.append(signal)
            save_signal_to_db(signal)
    
    logger.info(f"生成交易信号: {len(signals)} 个")
    
    # 8. 发送通知
    if signals:
        send_notification(signals)
    
    logger.info("=" * 60)
    logger.info("每日市场扫描完成")
    logger.info("=" * 60)
```

---

## 💾 数据存储优化

### 每日数据量估算

```
每天扫描600-800只股票
每只股票数据：
- 基本信息：约2KB
- 今日K线：约1KB
- 总计：约3KB/股

每日总数据量：
800 × 3KB = 2.4MB

一年数据量：
2.4MB × 250个交易日 = 600MB

✅ 非常小，完全可以接受
```

### 只保存必要数据

```python
# 不需要保存所有历史K线
# 只需要保存：
1. 每日扫描结果快照
2. 热点板块数据
3. 龙头股数据
4. 交易信号

# 历史K线数据按需获取
# 当需要分析某只股票时，再实时获取其K线数据
```

---

## 📝 实施步骤（优化版）

### Day 1: 准备股票池

```python
# 1. 创建概念股列表文件
# zhixing_backend/data/us_concept_stocks.json

# 2. 实现股票池加载器
class ConceptStockManager:
    def load_concept_stocks(self) -> Dict[str, List[str]]:
        """加载概念股列表"""
        pass
    
    def get_all_stocks(self) -> List[str]:
        """获取所有股票（去重）"""
        pass
```

### Day 2: 实现扫描器

```python
# 市场扫描器
class DailyMarketScanner:
    async def scan_all_stocks(self) -> List[Dict]:
        """并发扫描所有股票"""
        pass
    
    def filter_active_stocks(self, stocks: List[Dict]) -> List[Dict]:
        """筛选活跃股票"""
        pass
```

### Day 3: 板块分析

```python
# 板块分析器
class SectorAnalyzer:
    def group_by_sector(self, stocks: List[Dict]) -> Dict:
        """按板块分组"""
        pass
    
    def calculate_sector_heat(self, sector_stocks: List[Dict]) -> float:
        """计算板块热度"""
        pass
```

### Day 4: 龙头识别

```python
# 龙头识别器（使用已实现的USLeaderHunterStrategy）
class LeaderScanner:
    def identify_leaders(self, sector_stocks: List[Dict]) -> List[Dict]:
        """识别龙头股"""
        pass
```

### Day 5: 定时任务和API

```python
# 定时任务
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

# 每天美东时间16:30运行
scheduler.add_job(
    daily_market_scan,
    'cron',
    day_of_week='mon-fri',
    hour=16,
    minute=30,
    timezone='America/New_York'
)
```

---

## 🎯 总结

### 股票数量问题

你是对的！美股确实有几千只股票：
- **NYSE + NASDAQ = 约6000-7000只上市公司**
- 但不需要全部扫描

### 推荐方案

**扫描范围**：600-800只精选概念股
- 生物医药、新能源、AI科技、加密货币等热门题材
- 市值在5亿-50亿美元之间
- 有足够流动性

**扫描频率**：每天1次（收盘后）
- 美东时间16:30
- 北京时间05:30

**扫描时间**：约10-15分钟

**数据量**：每天约2-3MB，完全可控

---

**需要我开始实现这个每日扫描系统吗？**

我会实现：
1. 概念股池管理
2. 每日扫描器
3. 板块分析器
4. 龙头识别器
5. 定时任务

