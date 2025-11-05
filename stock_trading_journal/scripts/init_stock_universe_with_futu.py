#!/usr/bin/env python3
"""
使用富途OpenAPI初始化股票池
包含：股票基本信息、Sector/Industry分类、关联关系

运行前确保：
1. 已安装 futu-api: pip install futu-api
2. FutuOpenD客户端正在运行（默认端口11111）
3. 已有股票代码列表：data/us_stock_symbols.txt
"""

import sys
from pathlib import Path
import time
from collections import defaultdict

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

try:
    from futu import *
    FUTU_AVAILABLE = True
except ImportError:
    FUTU_AVAILABLE = False
    print("❌ 未安装 futu-api")
    print("请运行: pip install futu-api")
    sys.exit(1)

from loguru import logger
from sqlalchemy import create_engine, text
from app.config import settings


def get_stock_symbols_from_seed():
    """从种子文件读取股票代码"""
    seed_file = project_root / 'data' / 'us_stock_symbols.txt'
    
    if not seed_file.exists():
        logger.error(f"❌ 种子文件不存在: {seed_file}")
        return []
    
    symbols = []
    for line in seed_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith('#'):
            symbols.append(line.upper())
    
    logger.info(f"✅ 从种子文件读取 {len(symbols)} 只股票")
    return symbols


def build_stock_sector_mapping(quote_ctx):
    """构建股票-板块映射"""
    logger.info("\n【步骤1】获取所有行业板块...")
    
    ret, sectors_df = quote_ctx.get_plate_list(
        market=Market.US,
        plate_class=Plate.INDUSTRY
    )
    
    if ret != RET_OK:
        logger.error(f"❌ 获取板块列表失败: {sectors_df}")
        return {}
    
    logger.info(f"✅ 获取到 {len(sectors_df)} 个行业板块")
    
    stock_to_sectors = {}
    total_sectors = len(sectors_df)
    
    logger.info("\n【步骤2】遍历板块，获取成分股...")
    
    for idx, sector in sectors_df.iterrows():
        sector_code = sector['code']
        sector_name = sector['plate_name']
        
        logger.info(f"[{idx+1}/{total_sectors}] 处理板块: {sector_name}")
        
        ret, stocks_df = quote_ctx.get_plate_stock(plate_code=sector_code)
        
        if ret == RET_OK:
            for _, stock in stocks_df.iterrows():
                # 移除 'US.' 前缀
                stock_code = stock['code'].replace('US.', '')
                stock_name = stock.get('stock_name', stock_code)
                
                if stock_code not in stock_to_sectors:
                    stock_to_sectors[stock_code] = {
                        'name': stock_name,
                        'sectors': [],
                        'sector_codes': []
                    }
                
                stock_to_sectors[stock_code]['sectors'].append(sector_name)
                stock_to_sectors[stock_code]['sector_codes'].append(sector_code)
        else:
            logger.warning(f"  ⚠️  获取成分股失败: {stocks_df}")
        
        # 避免请求过快
        time.sleep(0.05)
    
    logger.info(f"\n✅ 成功建立映射: {len(stock_to_sectors)} 只股票")
    return stock_to_sectors


def get_stock_quote(quote_ctx, symbols):
    """获取股票实时报价（用于获取市值等信息）"""
    logger.info("\n【步骤3】获取股票实时报价...")
    
    stock_quotes = {}
    batch_size = 200  # 富途API每次最多查询200只
    
    for i in range(0, len(symbols), batch_size):
        batch = symbols[i:i+batch_size]
        us_codes = [f'US.{s}' for s in batch]
        
        try:
            ret, data = quote_ctx.get_market_snapshot(us_codes)
            
            if ret == RET_OK:
                for _, row in data.iterrows():
                    code = row['code'].replace('US.', '')
                    stock_quotes[code] = {
                        'last_price': row.get('last_price', 0),
                        'market_cap': row.get('market_val', 0),  # 市值（百万）
                        'pe_ratio': row.get('pe_ratio', 0),
                        'volume': row.get('volume', 0)
                    }
                logger.info(f"  ✅ 获取批次 {i//batch_size + 1}: {len(batch)} 只股票")
            else:
                logger.warning(f"  ⚠️  批次 {i//batch_size + 1} 失败: {data}")
        except Exception as e:
            logger.warning(f"  ⚠️  批次 {i//batch_size + 1} 异常: {e}")
        
        time.sleep(0.1)
    
    logger.info(f"✅ 成功获取 {len(stock_quotes)} 只股票的报价")
    return stock_quotes


def filter_stocks_by_market_cap(stock_quotes, min_cap=500, max_cap=10000):
    """根据市值筛选股票"""
    logger.info(f"\n【步骤4】根据市值筛选 (${min_cap}M - ${max_cap}M)...")
    
    filtered = []
    for code, quote in stock_quotes.items():
        market_cap = quote.get('market_cap', 0)
        if min_cap <= market_cap <= max_cap:
            filtered.append(code)
    
    logger.info(f"✅ 筛选后剩余: {len(filtered)} 只股票")
    return filtered


def save_to_database(symbols, stock_to_sectors, stock_quotes):
    """保存到数据库"""
    logger.info("\n【步骤5】保存到数据库...")
    
    engine = create_engine(settings.database_url)
    
    with engine.begin() as conn:
        # 统计
        saved_stocks = 0
        saved_categories = 0
        saved_relations = 0
        
        # 收集所有唯一的sector
        unique_sectors = set()
        for info in stock_to_sectors.values():
            unique_sectors.update(info['sectors'])
        
        logger.info(f"  发现 {len(unique_sectors)} 个唯一板块")
        
        # 1. 创建所有categories
        category_id_map = {}
        
        for sector_name in unique_sectors:
            # 检查是否存在
            result = conn.execute(
                text("SELECT id FROM categories WHERE name = :name AND category_type = 'Sector'"),
                {"name": sector_name}
            ).fetchone()
            
            if result:
                category_id_map[sector_name] = result[0]
            else:
                # 插入新category
                result = conn.execute(
                    text("""
                        INSERT INTO categories (name, category_type, parent_id, created_at)
                        VALUES (:name, 'Sector', NULL, NOW())
                    """),
                    {"name": sector_name}
                )
                category_id_map[sector_name] = result.lastrowid
                saved_categories += 1
        
        logger.info(f"  ✅ 保存 {saved_categories} 个新板块")
        
        # 2. 保存股票信息
        for symbol in symbols:
            if symbol not in stock_to_sectors:
                logger.debug(f"  跳过 {symbol}: 未找到板块信息")
                continue
            
            info = stock_to_sectors[symbol]
            quote = stock_quotes.get(symbol, {})
            
            # 取第一个sector作为主分类
            primary_sector = info['sectors'][0] if info['sectors'] else 'Unknown'
            
            # Upsert stock
            conn.execute(
                text("""
                    INSERT INTO stocks (code, name, market, sector, industry, market_cap, current_price, updated_at)
                    VALUES (:code, :name, 'US', :sector, :industry, :market_cap, :price, NOW())
                    ON DUPLICATE KEY UPDATE
                        name = VALUES(name),
                        sector = VALUES(sector),
                        market_cap = VALUES(market_cap),
                        current_price = VALUES(current_price),
                        updated_at = NOW()
                """),
                {
                    "code": symbol,
                    "name": info['name'][:200],
                    "sector": primary_sector[:50],
                    "industry": primary_sector[:100],  # 富途只有sector，industry暂用sector
                    "market_cap": round(quote.get('market_cap', 0), 2),
                    "price": quote.get('last_price', 0)
                }
            )
            saved_stocks += 1
            
            # 3. 建立股票-分类关联（可能有多个板块）
            for sector_name in info['sectors']:
                category_id = category_id_map.get(sector_name)
                if not category_id:
                    continue
                
                # 检查关联是否存在
                existing = conn.execute(
                    text("""
                        SELECT id FROM category_stock_relations 
                        WHERE category_id = :cat_id AND stock_code = :code
                    """),
                    {"cat_id": category_id, "code": symbol}
                ).fetchone()
                
                if not existing:
                    conn.execute(
                        text("""
                            INSERT INTO category_stock_relations (category_id, stock_code, created_at)
                            VALUES (:cat_id, :code, NOW())
                        """),
                        {"cat_id": category_id, "code": symbol}
                    )
                    saved_relations += 1
        
        logger.info(f"  ✅ 保存 {saved_stocks} 只股票")
        logger.info(f"  ✅ 建立 {saved_relations} 个关联关系")
    
    return saved_stocks, saved_categories, saved_relations


def print_statistics(stock_to_sectors, stock_quotes, saved_stats):
    """打印统计信息"""
    logger.info("\n" + "=" * 60)
    logger.info("📊 统计报告")
    logger.info("=" * 60)
    
    saved_stocks, saved_categories, saved_relations = saved_stats
    
    logger.info(f"\n【数据统计】")
    logger.info(f"  股票总数: {len(stock_to_sectors)}")
    logger.info(f"  板块总数: {len(set(s for info in stock_to_sectors.values() for s in info['sectors']))}")
    logger.info(f"  有报价的股票: {len(stock_quotes)}")
    
    logger.info(f"\n【数据库保存】")
    logger.info(f"  保存股票: {saved_stocks}")
    logger.info(f"  保存板块: {saved_categories}")
    logger.info(f"  建立关联: {saved_relations}")
    
    # 市值分布
    if stock_quotes:
        market_caps = [q.get('market_cap', 0) for q in stock_quotes.values()]
        avg_cap = sum(market_caps) / len(market_caps) if market_caps else 0
        logger.info(f"\n【市值分布】")
        logger.info(f"  平均市值: ${avg_cap:.2f}M")
        logger.info(f"  最大市值: ${max(market_caps):.2f}M")
        logger.info(f"  最小市值: ${min(market_caps):.2f}M")
    
    # 板块分布（Top 10）
    sector_counts = defaultdict(int)
    for info in stock_to_sectors.values():
        for sector in info['sectors']:
            sector_counts[sector] += 1
    
    logger.info(f"\n【Top 10 板块】")
    for sector, count in sorted(sector_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
        logger.info(f"  {sector}: {count} 只股票")


def main():
    """主函数"""
    logger.info("=" * 60)
    logger.info("🚀 使用富途OpenAPI初始化股票池")
    logger.info("=" * 60)
    
    start_time = time.time()
    
    try:
        # 0. 读取种子文件
        symbols = get_stock_symbols_from_seed()
        if not symbols:
            logger.error("❌ 未能获取股票列表")
            return
        
        # 连接FutuOpenD
        logger.info("\n连接FutuOpenD...")
        quote_ctx = OpenQuoteContext(host='127.0.0.1', port=11111)
        logger.info("✅ 连接成功")
        
        # 1. 构建股票-板块映射
        stock_to_sectors = build_stock_sector_mapping(quote_ctx)
        
        if not stock_to_sectors:
            logger.error("❌ 未能构建股票-板块映射")
            return
        
        # 2. 获取股票报价（包含市值）
        stock_quotes = get_stock_quote(quote_ctx, symbols)
        
        # 关闭连接
        quote_ctx.close()
        logger.info("\n✅ FutuOpenD连接已关闭")
        
        # 3. 筛选符合市值要求的股票
        filtered_symbols = filter_stocks_by_market_cap(stock_quotes, min_cap=500, max_cap=10000)
        
        # 4. 保存到数据库
        saved_stats = save_to_database(filtered_symbols, stock_to_sectors, stock_quotes)
        
        # 5. 打印统计
        print_statistics(stock_to_sectors, stock_quotes, saved_stats)
        
        # 完成
        elapsed = time.time() - start_time
        logger.info("\n" + "=" * 60)
        logger.info(f"✅ 初始化完成！")
        logger.info(f"   耗时: {elapsed/60:.1f} 分钟")
        logger.info("=" * 60)
        
        logger.info("\n📚 下一步：")
        logger.info("1. 运行验证脚本：python scripts/verify_stock_data.py")
        logger.info("2. 查看数据：")
        logger.info("   - stocks 表")
        logger.info("   - categories 表")
        logger.info("   - category_stock_relations 表")
        
    except Exception as e:
        logger.error(f"❌ 初始化失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    if not FUTU_AVAILABLE:
        print("\n请先安装富途SDK:")
        print("  pip install futu-api")
        print("\n并启动FutuOpenD客户端:")
        print("  下载地址: https://www.futunn.com/download/OpenAPI")
        sys.exit(1)
    
    main()


