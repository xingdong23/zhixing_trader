"""
快速版本：初始化美股股票池（100只精选）
适合快速测试，不需要等待太久
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
from sqlalchemy import create_engine
from app.config import settings


def get_quick_stock_list():
    """从快速版种子文件获取股票代码"""
    
    seed_file = project_root / 'data' / 'us_stock_symbols_quick.txt'
    
    if not seed_file.exists():
        logger.error(f"快速版种子文件不存在: {seed_file}")
        return []
    
    all_symbols = set()
    
    logger.info(f"从快速版种子文件读取: {seed_file}")
    
    with open(seed_file, 'r') as f:
        for line in f:
            line = line.strip()
            # 跳过注释和空行
            if not line or line.startswith('#'):
                continue
            # 分割逗号分隔的股票代码
            symbols = [s.strip().upper() for s in line.split(',') if s.strip()]
            all_symbols.update(symbols)
    
    logger.info(f"✅ 获取: {len(all_symbols)} 只精选股票")
    return list(all_symbols)


def get_stock_info_batch(symbols, delay=0.3):
    """
    批量获取股票信息（更快速）
    
    Args:
        symbols: 股票代码列表
        delay: 请求延迟（秒）
    
    Returns:
        股票信息列表
    """
    results = []
    total = len(symbols)
    
    logger.info(f"开始获取 {total} 只股票信息...")
    logger.info(f"预计时间: {total * delay / 60:.1f} 分钟")
    
    for i, symbol in enumerate(symbols, 1):
        try:
            # 清理股票代码
            clean_symbol = symbol.strip().upper()
            if not clean_symbol:
                continue
            
            # 获取股票信息
            ticker = yf.Ticker(clean_symbol)
            info = ticker.info
            
            # 提取关键信息
            market_cap = info.get('marketCap', 0)
            current_price = info.get('currentPrice', 0) or info.get('regularMarketPrice', 0)
            sector = info.get('sector', 'Unknown')
            
            # 如果没有市值，尝试其他字段
            if market_cap == 0:
                market_cap = info.get('enterpriseValue', 0)
            
            # 只要有基本数据就保存（不严格筛选，快速版）
            if current_price > 0:
                results.append({
                    'code': clean_symbol,
                    'name': info.get('shortName', clean_symbol)[:200],
                    'market': 'US',
                    'sector': sector[:50] if sector else 'Unknown',
                    'industry': (info.get('industry', 'Unknown') or 'Unknown')[:100],
                    'market_cap': round(market_cap / 1_000_000, 2) if market_cap > 0 else 0,
                    'current_price': round(current_price, 2),
                })
            
            # 进度显示
            if i % 10 == 0 or i == total:
                logger.info(f"进度: {i}/{total} ({i*100//total}%), 已获取: {len(results)} 只")
            
            # 限流
            time.sleep(delay)
        
        except Exception as e:
            logger.debug(f"跳过 {symbol}: {str(e)[:50]}")
            continue
    
    logger.info(f"✅ 成功获取: {len(results)}/{total} 只股票")
    return results


def save_to_database(stocks):
    """保存到数据库"""
    
    if not stocks:
        logger.warning("没有股票需要保存")
        return
    
    try:
        engine = create_engine(settings.database_url)
        
        # 批量插入
        df = pd.DataFrame(stocks)
        
        df.to_sql(
            'stocks', 
            engine, 
            if_exists='append',
            index=False,
            method='multi',
            chunksize=50
        )
        
        logger.info(f"✅ 已保存 {len(stocks)} 只股票到数据库")
    
    except Exception as e:
        logger.error(f"保存到数据库失败: {e}")
        # 即使数据库失败，也要保存到JSON
        logger.info("尝试仅保存到JSON文件...")


def save_to_json(stocks, filepath='data/us_stock_universe_quick.json'):
    """保存到JSON文件"""
    
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
    logger.info("📊 股票池统计（快速版）")
    logger.info("=" * 60)
    
    # 总数
    logger.info(f"总数: {len(stocks)} 只")
    
    # 板块分布
    sectors = Counter(s['sector'] for s in stocks)
    logger.info("\n板块分布:")
    for sector, count in sectors.most_common():
        logger.info(f"  {sector:30s}: {count:3d} 只")
    
    # 市值统计（过滤0值）
    market_caps = [s['market_cap'] for s in stocks if s['market_cap'] > 0]
    if market_caps:
        logger.info(f"\n市值范围:")
        logger.info(f"  最小: ${min(market_caps):.1f}M")
        logger.info(f"  最大: ${max(market_caps):.1f}M")
        logger.info(f"  平均: ${sum(market_caps)/len(market_caps):.1f}M")
    
    # 价格统计
    prices = [s['current_price'] for s in stocks if s['current_price'] > 0]
    if prices:
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
    logger.info("🚀 快速构建美股股票池（100只精选）")
    logger.info("=" * 60)
    
    start_time = time.time()
    
    try:
        # 1. 获取股票代码
        logger.info("\n【步骤1】读取精选股票列表...")
        symbols = get_quick_stock_list()
        
        if not symbols:
            logger.error("❌ 未能获取任何股票代码")
            return
        
        # 2. 快速获取股票信息
        logger.info("\n【步骤2】快速获取股票信息...")
        stocks = get_stock_info_batch(symbols, delay=0.3)  # 0.3秒延迟
        
        if not stocks:
            logger.error("❌ 没有成功获取的股票")
            return
        
        # 3. 保存到数据库
        logger.info("\n【步骤3】保存到数据库...")
        save_to_database(stocks)
        
        # 4. 保存到JSON
        logger.info("\n【步骤4】保存到JSON文件...")
        save_to_json(stocks)
        
        # 5. 打印统计
        logger.info("\n【步骤5】生成统计报告...")
        print_statistics(stocks)
        
        # 完成
        elapsed = time.time() - start_time
        logger.info("=" * 60)
        logger.info(f"✅ 快速股票池构建完成！")
        logger.info(f"   成功获取: {len(stocks)} 只")
        logger.info(f"   耗时: {elapsed/60:.1f} 分钟")
        logger.info("=" * 60)
        logger.info(f"\n💡 提示：")
        logger.info(f"   - 这是精选的100只热门股票")
        logger.info(f"   - 适合快速测试策略")
        logger.info(f"   - 如需完整股票池，请运行: python scripts/init_stock_universe.py")
    
    except KeyboardInterrupt:
        logger.warning("\n⚠️ 用户中断")
        logger.info("部分数据可能已保存，可以继续使用")
    
    except Exception as e:
        logger.error(f"❌ 构建失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()

