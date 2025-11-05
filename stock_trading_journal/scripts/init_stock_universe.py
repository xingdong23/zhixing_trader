"""
初始化美股股票池
从Wikipedia自动获取Russell 2000、SP600、NASDAQ 100等指数成分股
自动筛选符合条件的股票（市值5亿-100亿美元）
"""
import sys
from pathlib import Path
import time

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

import pandas as pd
import yfinance as yf
from loguru import logger
from sqlalchemy import create_engine, text
from app.config import settings


def get_stocks_from_seed_file():
    """从种子文件获取股票代码"""
    
    seed_file = project_root / 'data' / 'us_stock_symbols.txt'
    
    if not seed_file.exists():
        logger.error(f"种子文件不存在: {seed_file}")
        return []
    
    all_symbols = set()
    
    logger.info(f"从种子文件读取: {seed_file}")
    
    with open(seed_file, 'r') as f:
        for line in f:
            line = line.strip()
            # 跳过注释和空行
            if not line or line.startswith('#'):
                continue
            # 分割逗号分隔的股票代码
            symbols = [s.strip().upper() for s in line.split(',') if s.strip()]
            all_symbols.update(symbols)
    
    logger.info(f"✅ 从种子文件获取: {len(all_symbols)} 只股票")
    return list(all_symbols)


def get_stocks_from_wikipedia():
    """从Wikipedia获取多个指数的股票（备用方案）"""
    
    all_symbols = set()
    
    # 添加User-Agent避免被拦截
    import requests
    from io import StringIO
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    # 1. Russell 2000（小盘股，约2000只）
    logger.info("正在获取 Russell 2000...")
    try:
        url = "https://en.wikipedia.org/wiki/Russell_2000_Index"
        response = requests.get(url, headers=headers)
        tables = pd.read_html(StringIO(response.text))
        
        # 尝试找到股票代码列
        for table in tables:
            if 'Ticker' in table.columns:
                symbols = table['Ticker'].dropna().tolist()
                all_symbols.update(symbols)
                logger.info(f"✅ Russell 2000: {len(symbols)} 只")
                break
            elif 'Symbol' in table.columns:
                symbols = table['Symbol'].dropna().tolist()
                all_symbols.update(symbols)
                logger.info(f"✅ Russell 2000: {len(symbols)} 只")
                break
    except Exception as e:
        logger.warning(f"⚠️ Russell 2000获取失败: {e}")
    
    # 2. S&P 600（小盘股，约600只）
    logger.info("正在获取 S&P 600...")
    try:
        url = "https://en.wikipedia.org/wiki/List_of_S%26P_600_companies"
        response = requests.get(url, headers=headers)
        tables = pd.read_html(StringIO(response.text))
        df = tables[0]
        symbols = df['Symbol'].dropna().tolist()
        all_symbols.update(symbols)
        logger.info(f"✅ S&P 600: {len(symbols)} 只")
    except Exception as e:
        logger.warning(f"⚠️ S&P 600获取失败: {e}")
    
    # 3. NASDAQ 100（科技股，约100只）
    logger.info("正在获取 NASDAQ 100...")
    try:
        url = "https://en.wikipedia.org/wiki/Nasdaq-100"
        response = requests.get(url, headers=headers)
        tables = pd.read_html(StringIO(response.text))
        # NASDAQ 100通常在后面的表格
        for table in tables:
            if 'Ticker' in table.columns:
                symbols = table['Ticker'].dropna().tolist()
                if len(symbols) > 50:  # 确保是完整列表
                    all_symbols.update(symbols)
                    logger.info(f"✅ NASDAQ 100: {len(symbols)} 只")
                    break
    except Exception as e:
        logger.warning(f"⚠️ NASDAQ 100获取失败: {e}")
    
    logger.info(f"总计获取: {len(all_symbols)} 只股票（去重后）")
    return list(all_symbols)


def filter_and_enrich_stocks(symbols, batch_size=50):
    """
    筛选并丰富股票信息
    
    Args:
        symbols: 股票代码列表
        batch_size: 每批处理数量（用于进度显示）
    
    Returns:
        符合条件的股票列表
    """
    filtered = []
    total = len(symbols)
    
    logger.info(f"开始筛选和获取详细信息...")
    logger.info(f"筛选条件: 市值 $500M-$10B, 价格 $5-$150")
    
    for i, symbol in enumerate(symbols, 1):
        try:
            # 清理股票代码（移除特殊字符）
            clean_symbol = symbol.strip().upper()
            if not clean_symbol or '.' in clean_symbol:
                continue
            
            # 获取股票信息
            ticker = yf.Ticker(clean_symbol)
            info = ticker.info
            
            # 提取关键信息
            market_cap = info.get('marketCap', 0)
            current_price = info.get('currentPrice', 0) or info.get('regularMarketPrice', 0)
            sector = info.get('sector', 'Unknown')
            
            # 如果没有市值，尝试从其他字段获取
            if market_cap == 0:
                market_cap = info.get('enterpriseValue', 0)
            
            # 筛选条件
            if market_cap > 0 and current_price > 0:
                # 市值：5亿-100亿美元
                if 500_000_000 <= market_cap <= 10_000_000_000:
                    # 价格：$5-$150
                    if 5 <= current_price <= 150:
                        filtered.append({
                            'code': clean_symbol,
                            'name': info.get('shortName', clean_symbol)[:200],  # 限制长度
                            'market': 'US',
                            'sector': sector[:50] if sector else 'Unknown',
                            'industry': (info.get('industry', 'Unknown') or 'Unknown')[:100],
                            'market_cap': round(market_cap / 1_000_000, 2),  # 转为百万美元
                            'current_price': round(current_price, 2),
                        })
            
            # 进度显示
            if i % batch_size == 0:
                logger.info(f"进度: {i}/{total} ({i*100//total}%), 已筛选: {len(filtered)} 只")
            
            # 限流（避免被封）
            if i % 10 == 0:
                time.sleep(0.5)
        
        except Exception as e:
            logger.debug(f"跳过 {symbol}: {str(e)[:50]}")
            continue
    
    logger.info(f"✅ 筛选完成: {len(filtered)}/{total} 只股票符合条件")
    return filtered


def save_to_database(stocks):
    """保存到数据库"""
    
    if not stocks:
        logger.warning("没有股票需要保存")
        return
    
    try:
        engine = create_engine(settings.database_url)
        
        with engine.connect() as conn:
            # 清空现有数据（可选，如果想增量更新则注释掉）
            # conn.execute(text("DELETE FROM stocks WHERE market = 'US'"))
            # logger.info("已清空现有美股数据")
            
            # 批量插入
            df = pd.DataFrame(stocks)
            
            # 使用 to_sql 的 replace 或 append 模式
            df.to_sql(
                'stocks', 
                engine, 
                if_exists='append',  # 或 'replace'
                index=False,
                method='multi',
                chunksize=100
            )
            
            conn.commit()
        
        logger.info(f"✅ 已保存 {len(stocks)} 只股票到数据库")
    
    except Exception as e:
        logger.error(f"保存到数据库失败: {e}")
        raise


def save_to_json(stocks, filepath='data/us_stock_universe.json'):
    """保存到JSON文件（备份）"""
    
    import json
    from pathlib import Path
    
    try:
        # 确保目录存在
        Path(filepath).parent.mkdir(parents=True, exist_ok=True)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(stocks, f, indent=2, ensure_ascii=False)
        
        logger.info(f"✅ 已保存到 {filepath}")
    
    except Exception as e:
        logger.error(f"保存到JSON失败: {e}")


def print_statistics(stocks):
    """打印统计信息"""
    
    if not stocks:
        return
    
    from collections import Counter
    
    logger.info("=" * 60)
    logger.info("📊 股票池统计")
    logger.info("=" * 60)
    
    # 总数
    logger.info(f"总数: {len(stocks)} 只")
    
    # 板块分布
    sectors = Counter(s['sector'] for s in stocks)
    logger.info("\n板块分布（Top 10）:")
    for sector, count in sectors.most_common(10):
        logger.info(f"  {sector:30s}: {count:3d} 只")
    
    # 市值统计
    market_caps = [s['market_cap'] for s in stocks]
    logger.info(f"\n市值范围:")
    logger.info(f"  最小: ${min(market_caps):.1f}M")
    logger.info(f"  最大: ${max(market_caps):.1f}M")
    logger.info(f"  平均: ${sum(market_caps)/len(market_caps):.1f}M")
    logger.info(f"  中位数: ${sorted(market_caps)[len(market_caps)//2]:.1f}M")
    
    # 价格统计
    prices = [s['current_price'] for s in stocks]
    logger.info(f"\n价格范围:")
    logger.info(f"  最低: ${min(prices):.2f}")
    logger.info(f"  最高: ${max(prices):.2f}")
    logger.info(f"  平均: ${sum(prices)/len(prices):.2f}")
    
    # 随机样本
    import random
    samples = random.sample(stocks, min(5, len(stocks)))
    logger.info("\n随机样本:")
    for s in samples:
        logger.info(f"  {s['code']:6s} | {s['name']:30s} | {s['sector']:20s} | ${s['market_cap']:.0f}M")
    
    logger.info("=" * 60)


def main():
    """主函数"""
    
    logger.info("=" * 60)
    logger.info("🚀 开始构建美股股票池")
    logger.info("=" * 60)
    
    start_time = time.time()
    
    try:
        # 1. 获取股票代码
        logger.info("\n【步骤1】获取股票代码...")
        
        # 先尝试从种子文件获取
        symbols = get_stocks_from_seed_file()
        
        # 如果种子文件为空，尝试Wikipedia
        if not symbols:
            logger.info("种子文件为空，尝试从Wikipedia获取...")
            symbols = get_stocks_from_wikipedia()
        
        if not symbols:
            logger.error("❌ 未能获取任何股票代码")
            logger.info("💡 提示：可以手动编辑 data/us_stock_symbols.txt 添加股票代码")
            return
        
        # 2. 筛选并获取详细信息
        logger.info("\n【步骤2】筛选并获取详细信息...")
        filtered_stocks = filter_and_enrich_stocks(symbols)
        
        if not filtered_stocks:
            logger.error("❌ 没有符合条件的股票")
            return
        
        # 3. 保存到数据库
        logger.info("\n【步骤3】保存到数据库...")
        save_to_database(filtered_stocks)
        
        # 4. 保存到JSON（备份）
        logger.info("\n【步骤4】保存到JSON文件...")
        save_to_json(filtered_stocks)
        
        # 5. 打印统计
        logger.info("\n【步骤5】生成统计报告...")
        print_statistics(filtered_stocks)
        
        # 完成
        elapsed = time.time() - start_time
        logger.info("=" * 60)
        logger.info(f"✅ 股票池构建完成！")
        logger.info(f"   符合条件: {len(filtered_stocks)} 只")
        logger.info(f"   耗时: {elapsed/60:.1f} 分钟")
        logger.info("=" * 60)
    
    except Exception as e:
        logger.error(f"❌ 构建失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()

