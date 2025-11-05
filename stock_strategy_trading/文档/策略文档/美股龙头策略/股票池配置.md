# 股票池自动化准备方案

## 🎯 目标

自动获取600-800只中小盘美股，用于每日扫描。

**不需要手动维护！**

---

## 📊 方案对比

| 方案 | 难度 | 时间 | 股票数 | 推荐度 |
|------|------|------|--------|--------|
| 方案1：ETF持仓获取 | ⭐ | 10分钟 | 500-800 | ⭐⭐⭐⭐⭐ |
| 方案2：Wikipedia爬取 | ⭐⭐ | 30分钟 | 2500+ | ⭐⭐⭐⭐ |
| 方案3：Finnhub筛选 | ⭐⭐ | 20分钟 | 可定制 | ⭐⭐⭐⭐ |
| 方案4：手动精选 | ⭐⭐⭐⭐⭐ | 数小时 | 自定义 | ⭐ |

---

## 方案1：从ETF持仓获取（推荐）⭐⭐⭐⭐⭐

### 原理

许多ETF专注于特定主题，它们的持仓就是最好的股票池！

### 目标ETF列表

```python
TARGET_ETFS = {
    # 生物医药
    "IBB": "iShares Biotechnology ETF",           # ~250只
    "XBI": "SPDR Biotech ETF",                    # ~130只
    
    # 清洁能源/电动车
    "ICLN": "iShares Clean Energy ETF",           # ~100只
    "TAN": "Invesco Solar ETF",                   # ~50只
    "LIT": "Global X Lithium ETF",                # ~40只
    
    # 科技/半导体
    "SOXX": "iShares Semiconductor ETF",          # ~30只
    "ARKK": "ARK Innovation ETF",                 # ~40只
    "ARKG": "ARK Genomic Revolution ETF",         # ~50只
    
    # 金融科技
    "FINX": "Global X FinTech ETF",               # ~50只
    
    # 云计算/SaaS
    "WCLD": "WisdomTree Cloud Computing ETF",     # ~60只
    
    # 小盘股
    "IWM": "iShares Russell 2000 ETF",            # ~2000只
    "VB": "Vanguard Small-Cap ETF",               # ~1400只
}

# 去重后预计：600-1000只股票
```

### 实现代码

```python
# scripts/init_stock_universe_from_etfs.py

import yfinance as yf
import pandas as pd
from loguru import logger

def get_etf_holdings(etf_symbol: str) -> list:
    """
    获取ETF持仓股票列表
    
    方法1: 使用yfinance（简单但可能不完整）
    """
    try:
        etf = yf.Ticker(etf_symbol)
        
        # 获取ETF持仓（如果可用）
        # 注意：yfinance可能无法获取所有ETF的持仓
        holdings = etf.get_institutional_holders()
        
        # 如果yfinance不支持，使用备用方案
        return get_etf_holdings_from_web(etf_symbol)
    
    except Exception as e:
        logger.error(f"获取{etf_symbol}持仓失败: {e}")
        return []

def get_etf_holdings_from_web(etf_symbol: str) -> list:
    """
    从ETF官网爬取持仓（更可靠）
    
    主要来源：
    1. iShares ETF: https://www.ishares.com/
    2. SPDR ETF: https://www.ssga.com/
    3. ARK ETF: https://ark-funds.com/
    """
    import requests
    from bs4 import BeautifulSoup
    
    # 不同ETF提供商的URL模板
    urls = {
        "IBB": "https://www.ishares.com/us/products/239699/ishares-nasdaq-biotechnology-etf",
        "ICLN": "https://www.ishares.com/us/products/239738/ishares-global-clean-energy-etf",
        "ARKK": "https://ark-funds.com/arkk",
        # ... 更多
    }
    
    if etf_symbol not in urls:
        logger.warning(f"{etf_symbol} URL未配置")
        return []
    
    try:
        # 爬取页面
        response = requests.get(urls[etf_symbol])
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # 解析持仓表格（每个ETF提供商格式不同）
        holdings = parse_holdings_table(soup, etf_symbol)
        
        return holdings
    
    except Exception as e:
        logger.error(f"爬取{etf_symbol}持仓失败: {e}")
        return []

def parse_holdings_table(soup, etf_symbol):
    """解析持仓表格"""
    # 这里需要针对不同ETF提供商定制解析逻辑
    # 暂时返回空列表，实际使用时需要补充
    return []

async def build_stock_universe():
    """构建股票池"""
    
    all_stocks = set()
    
    # 1. 从多个ETF获取持仓
    target_etfs = ["IBB", "XBI", "ICLN", "TAN", "SOXX", "ARKK", "ARKG"]
    
    for etf_symbol in target_etfs:
        logger.info(f"获取 {etf_symbol} 持仓...")
        holdings = get_etf_holdings(etf_symbol)
        all_stocks.update(holdings)
        logger.info(f"  获得 {len(holdings)} 只股票")
    
    # 2. 过滤条件
    filtered_stocks = []
    
    for symbol in all_stocks:
        try:
            # 获取股票信息
            stock = yf.Ticker(symbol)
            info = stock.info
            
            # 筛选条件
            market_cap = info.get('marketCap', 0)
            price = info.get('currentPrice', 0)
            
            # 市值：5亿-100亿美元
            if 500_000_000 <= market_cap <= 10_000_000_000:
                # 价格：$5-$150
                if 5 <= price <= 150:
                    filtered_stocks.append({
                        'symbol': symbol,
                        'name': info.get('shortName', ''),
                        'sector': info.get('sector', ''),
                        'industry': info.get('industry', ''),
                        'market_cap': market_cap,
                        'price': price,
                    })
        
        except Exception as e:
            logger.error(f"处理 {symbol} 失败: {e}")
    
    logger.info(f"筛选后股票数: {len(filtered_stocks)}")
    
    # 3. 保存到数据库
    save_to_database(filtered_stocks)
    
    # 4. 导出到JSON文件（备份）
    import json
    with open('data/us_stock_universe.json', 'w') as f:
        json.dump(filtered_stocks, f, indent=2)
    
    logger.info(f"✅ 股票池构建完成: {len(filtered_stocks)} 只股票")

if __name__ == "__main__":
    import asyncio
    asyncio.run(build_stock_universe())
```

---

## 方案2：从Wikipedia获取（最简单）⭐⭐⭐⭐⭐

### Russell 2000成分股

Wikipedia有现成的Russell 2000列表！

```python
# scripts/get_russell2000_from_wikipedia.py

import pandas as pd
from loguru import logger

def get_russell2000_stocks():
    """
    从Wikipedia获取Russell 2000成分股
    """
    try:
        # 方法1: 直接读取Wikipedia表格
        url = "https://en.wikipedia.org/wiki/Russell_2000_Index"
        
        # pandas可以直接读取HTML表格
        tables = pd.read_html(url)
        
        # Russell 2000表格通常是第一个
        df = tables[0]
        
        # 提取股票代码列（通常叫 'Ticker' 或 'Symbol'）
        if 'Ticker' in df.columns:
            symbols = df['Ticker'].tolist()
        elif 'Symbol' in df.columns:
            symbols = df['Symbol'].tolist()
        else:
            logger.warning("未找到股票代码列")
            return []
        
        logger.info(f"✅ 获取到 {len(symbols)} 只Russell 2000成分股")
        return symbols
    
    except Exception as e:
        logger.error(f"获取Russell 2000失败: {e}")
        return []

def get_nasdaq100_stocks():
    """从Wikipedia获取NASDAQ 100"""
    url = "https://en.wikipedia.org/wiki/Nasdaq-100"
    tables = pd.read_html(url)
    df = tables[4]  # NASDAQ-100通常在第5个表格
    return df['Ticker'].tolist()

def get_sp600_stocks():
    """获取SP600（小盘股）"""
    url = "https://en.wikipedia.org/wiki/List_of_S%26P_600_companies"
    tables = pd.read_html(url)
    df = tables[0]
    return df['Symbol'].tolist()

async def build_from_wikipedia():
    """从Wikipedia构建股票池"""
    
    all_symbols = set()
    
    # 1. Russell 2000（小盘股）
    logger.info("获取Russell 2000...")
    all_symbols.update(get_russell2000_stocks())
    
    # 2. SP600（小盘股）
    logger.info("获取SP600...")
    all_symbols.update(get_sp600_stocks())
    
    # 3. NASDAQ 100（科技股）
    logger.info("获取NASDAQ 100...")
    all_symbols.update(get_nasdaq100_stocks())
    
    logger.info(f"去重后总数: {len(all_symbols)}")
    
    # 4. 获取详细信息并筛选
    filtered_stocks = []
    
    for symbol in all_symbols:
        try:
            stock = yf.Ticker(symbol)
            info = stock.info
            
            market_cap = info.get('marketCap', 0)
            price = info.get('currentPrice', 0)
            
            # 筛选：5亿-100亿市值
            if 500_000_000 <= market_cap <= 10_000_000_000:
                filtered_stocks.append({
                    'symbol': symbol,
                    'name': info.get('shortName', ''),
                    'sector': info.get('sector', ''),
                    'industry': info.get('industry', ''),
                    'market_cap': market_cap,
                    'price': price,
                })
                
                # 进度显示
                if len(filtered_stocks) % 50 == 0:
                    logger.info(f"已处理: {len(filtered_stocks)} 只...")
        
        except Exception as e:
            logger.debug(f"跳过 {symbol}: {e}")
    
    logger.info(f"✅ 筛选完成: {len(filtered_stocks)} 只股票")
    
    # 5. 保存
    save_to_database(filtered_stocks)
    
    import json
    with open('data/us_stock_universe.json', 'w') as f:
        json.dump(filtered_stocks, f, indent=2)

if __name__ == "__main__":
    import asyncio
    asyncio.run(build_from_wikipedia())
```

---

## 方案3：使用Finnhub API筛选 ⭐⭐⭐⭐

### 直接筛选符合条件的股票

```python
# scripts/screen_stocks_with_finnhub.py

from app.utils.market_data_helper import FinnhubProvider
from loguru import logger

async def screen_stocks_from_finnhub():
    """使用Finnhub筛选股票"""
    
    provider = FinnhubProvider(api_key="YOUR_API_KEY")
    
    all_stocks = []
    
    # 按sector筛选
    sectors = [
        "Healthcare",
        "Technology", 
        "Energy",
        "Consumer Cyclical",
        "Industrials",
    ]
    
    for sector in sectors:
        logger.info(f"筛选板块: {sector}")
        
        # Finnhub筛选条件
        results = await provider.screen_stocks({
            "exchange": "US",
            "sector": sector,
            "marketCapMoreThan": 500_000_000,      # 5亿美元
            "marketCapLessThan": 10_000_000_000,   # 100亿美元
            "priceMoreThan": 5,
            "priceLessThan": 150,
            "volumeMoreThan": 100_000,             # 日均成交量>10万
        })
        
        all_stocks.extend(results)
        logger.info(f"  获得 {len(results)} 只股票")
        
        # 限流
        await asyncio.sleep(1)
    
    # 去重
    unique_stocks = {s['symbol']: s for s in all_stocks}.values()
    
    logger.info(f"✅ 总计 {len(unique_stocks)} 只股票")
    
    # 保存
    save_to_database(list(unique_stocks))
    
    return list(unique_stocks)
```

---

## 🚀 推荐实施方案（最快）

### 步骤1：使用Wikipedia（10分钟）

```bash
cd zhixing_backend
python scripts/init_stock_universe.py
```

```python
# scripts/init_stock_universe.py

import pandas as pd
import yfinance as yf
from loguru import logger
from sqlalchemy import create_engine
from app.config import settings

def get_stocks_from_wikipedia():
    """从Wikipedia获取多个指数的股票"""
    
    all_symbols = set()
    
    # 1. Russell 2000
    try:
        url = "https://en.wikipedia.org/wiki/Russell_2000_Index"
        tables = pd.read_html(url)
        df = tables[0]
        symbols = df['Ticker'].tolist() if 'Ticker' in df.columns else df['Symbol'].tolist()
        all_symbols.update(symbols)
        logger.info(f"✅ Russell 2000: {len(symbols)} 只")
    except Exception as e:
        logger.error(f"Russell 2000失败: {e}")
    
    # 2. SP600
    try:
        url = "https://en.wikipedia.org/wiki/List_of_S%26P_600_companies"
        tables = pd.read_html(url)
        df = tables[0]
        symbols = df['Symbol'].tolist()
        all_symbols.update(symbols)
        logger.info(f"✅ SP600: {len(symbols)} 只")
    except Exception as e:
        logger.error(f"SP600失败: {e}")
    
    # 3. NASDAQ 100
    try:
        url = "https://en.wikipedia.org/wiki/Nasdaq-100"
        tables = pd.read_html(url)
        df = tables[4]
        symbols = df['Ticker'].tolist()
        all_symbols.update(symbols)
        logger.info(f"✅ NASDAQ 100: {len(symbols)} 只")
    except Exception as e:
        logger.error(f"NASDAQ 100失败: {e}")
    
    return list(all_symbols)

def filter_and_save_stocks(symbols):
    """筛选并保存到数据库"""
    
    engine = create_engine(settings.database_url)
    filtered = []
    
    logger.info(f"开始筛选 {len(symbols)} 只股票...")
    
    for i, symbol in enumerate(symbols, 1):
        try:
            # 获取股票信息
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            market_cap = info.get('marketCap', 0)
            price = info.get('currentPrice', 0)
            sector = info.get('sector', 'Unknown')
            
            # 筛选条件：5亿-100亿市值
            if 500_000_000 <= market_cap <= 10_000_000_000:
                if 5 <= price <= 150:
                    filtered.append({
                        'code': symbol,
                        'name': info.get('shortName', symbol),
                        'market': 'US',
                        'sector': sector,
                        'industry': info.get('industry', 'Unknown'),
                        'market_cap': market_cap / 1_000_000,  # 转为百万美元
                    })
            
            # 进度显示
            if i % 100 == 0:
                logger.info(f"进度: {i}/{len(symbols)}, 已筛选: {len(filtered)}")
        
        except Exception as e:
            logger.debug(f"跳过 {symbol}: {e}")
    
    logger.info(f"✅ 筛选完成: {len(filtered)} 只股票符合条件")
    
    # 保存到数据库
    if filtered:
        df = pd.DataFrame(filtered)
        df.to_sql('stocks', engine, if_exists='append', index=False)
        logger.info("✅ 已保存到数据库")
    
    # 同时保存到JSON（备份）
    import json
    with open('data/us_stock_universe.json', 'w') as f:
        json.dump(filtered, f, indent=2)
    logger.info("✅ 已保存到 data/us_stock_universe.json")
    
    return filtered

if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("开始构建美股股票池")
    logger.info("=" * 60)
    
    # 1. 从Wikipedia获取
    symbols = get_stocks_from_wikipedia()
    logger.info(f"总计获取: {len(symbols)} 只股票（去重前）")
    
    # 2. 筛选并保存
    filtered = filter_and_save_stocks(symbols)
    
    logger.info("=" * 60)
    logger.info(f"✅ 股票池构建完成！符合条件的股票: {len(filtered)} 只")
    logger.info("=" * 60)
```

### 步骤2：定期更新（每月1次）

```python
# 设置定时任务，每月更新一次股票池
# 因为指数成分股变化不频繁

from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

# 每月1号凌晨更新
scheduler.add_job(
    update_stock_universe,
    'cron',
    day=1,
    hour=0,
    minute=0,
)
```

---

## 📊 预期结果

### 股票池统计

```
来源分布：
- Russell 2000: ~2000只
- SP600: ~600只
- NASDAQ 100: ~100只

去重后总数: ~2500只

筛选后（5亿-100亿市值）: ~600-800只

板块分布：
- Healthcare/Biotechnology: ~200只
- Technology: ~150只
- Consumer: ~100只
- Energy: ~80只
- Industrials: ~70只
- Financials: ~60只
- 其他: ~140只
```

---

## ⚡ 快速测试

### 测试脚本

```python
# test_stock_universe.py

import json

# 1. 加载股票池
with open('data/us_stock_universe.json') as f:
    stocks = json.load(f)

print(f"✅ 股票池总数: {len(stocks)}")

# 2. 按板块统计
from collections import Counter
sectors = Counter(s['sector'] for s in stocks)

print("\n📊 板块分布:")
for sector, count in sectors.most_common():
    print(f"  {sector}: {count} 只")

# 3. 按市值统计
market_caps = [s['market_cap'] for s in stocks]
print(f"\n💰 市值范围:")
print(f"  最小: ${min(market_caps)/1000:.1f}M")
print(f"  最大: ${max(market_caps)/1000:.1f}M")
print(f"  中位数: ${sorted(market_caps)[len(market_caps)//2]/1000:.1f}M")

# 4. 随机抽样
import random
samples = random.sample(stocks, 10)
print("\n🎲 随机样本:")
for s in samples:
    print(f"  {s['code']:6s} {s['name']:30s} {s['sector']:20s} ${s['market_cap']/1000:.0f}M")
```

---

## 💡 维护建议

### 更新频率

```
初始构建：运行一次（约30分钟）
定期更新：每月1次（指数调整）
临时添加：手动加入热门股票
```

### 数据质量保证

```python
# 每次更新后检查
def validate_stock_universe():
    """验证股票池质量"""
    
    # 1. 检查数量
    assert 600 <= len(stocks) <= 1000, "股票数量异常"
    
    # 2. 检查必填字段
    for stock in stocks:
        assert stock.get('symbol')
        assert stock.get('sector')
        assert stock.get('market_cap')
    
    # 3. 检查市值范围
    for stock in stocks:
        cap = stock['market_cap']
        assert 500_000_000 <= cap <= 10_000_000_000
    
    print("✅ 股票池验证通过")
```

---

## 🎯 总结

### 推荐方案：Wikipedia + 筛选

**优势**：
- ✅ 完全自动化
- ✅ 10-30分钟完成
- ✅ 获得600-800只符合条件的股票
- ✅ 无需手动维护

**步骤**：
1. 运行 `scripts/init_stock_universe.py`
2. 等待30分钟（自动获取和筛选）
3. 检查 `data/us_stock_universe.json`
4. 完成！

**下一步**：
- 实现每日扫描系统
- 使用这个股票池进行扫描
- 每月更新一次股票池

---

**不需要手动维护600-800只股票！全自动！** 🚀

