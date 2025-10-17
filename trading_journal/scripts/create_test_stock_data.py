#!/usr/bin/env python3
"""
创建测试股票数据
包含15-20只知名美股，带有完整的Sector/Industry信息
用于快速验证系统功能
"""

import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from loguru import logger
from sqlalchemy import create_engine, text
from app.config import settings


# 精选的20只美股，涵盖不同行业和市值范围
TEST_STOCKS = [
    # 科技 - Technology
    {
        'code': 'AAPL',
        'name': 'Apple Inc.',
        'sector': 'Technology',
        'industry': 'Consumer Electronics',
        'market_cap': 2800000,  # $2.8T
        'current_price': 178.50
    },
    {
        'code': 'MSFT',
        'name': 'Microsoft Corporation',
        'sector': 'Technology',
        'industry': 'Software',
        'market_cap': 2500000,
        'current_price': 380.00
    },
    {
        'code': 'NVDA',
        'name': 'NVIDIA Corporation',
        'sector': 'Technology',
        'industry': 'Semiconductors',
        'market_cap': 1200000,
        'current_price': 495.00
    },
    {
        'code': 'AMD',
        'name': 'Advanced Micro Devices',
        'sector': 'Technology',
        'industry': 'Semiconductors',
        'market_cap': 180000,
        'current_price': 110.00
    },
    
    # 消费 - Consumer Cyclical
    {
        'code': 'AMZN',
        'name': 'Amazon.com Inc.',
        'sector': 'Consumer Cyclical',
        'industry': 'Internet Retail',
        'market_cap': 1500000,
        'current_price': 145.00
    },
    {
        'code': 'TSLA',
        'name': 'Tesla Inc.',
        'sector': 'Consumer Cyclical',
        'industry': 'Auto Manufacturers',
        'market_cap': 800000,
        'current_price': 250.00
    },
    {
        'code': 'NKE',
        'name': 'Nike Inc.',
        'sector': 'Consumer Cyclical',
        'industry': 'Footwear & Accessories',
        'market_cap': 155000,
        'current_price': 100.00
    },
    
    # 通信 - Communication Services
    {
        'code': 'META',
        'name': 'Meta Platforms Inc.',
        'sector': 'Communication Services',
        'industry': 'Internet Content & Information',
        'market_cap': 900000,
        'current_price': 350.00
    },
    {
        'code': 'GOOGL',
        'name': 'Alphabet Inc.',
        'sector': 'Communication Services',
        'industry': 'Internet Content & Information',
        'market_cap': 1700000,
        'current_price': 140.00
    },
    
    # 金融 - Financial Services
    {
        'code': 'JPM',
        'name': 'JPMorgan Chase & Co.',
        'sector': 'Financial Services',
        'industry': 'Banks - Diversified',
        'market_cap': 450000,
        'current_price': 155.00
    },
    {
        'code': 'V',
        'name': 'Visa Inc.',
        'sector': 'Financial Services',
        'industry': 'Credit Services',
        'market_cap': 520000,
        'current_price': 245.00
    },
    
    # 医疗 - Healthcare
    {
        'code': 'JNJ',
        'name': 'Johnson & Johnson',
        'sector': 'Healthcare',
        'industry': 'Drug Manufacturers',
        'market_cap': 380000,
        'current_price': 158.00
    },
    {
        'code': 'UNH',
        'name': 'UnitedHealth Group',
        'sector': 'Healthcare',
        'industry': 'Healthcare Plans',
        'market_cap': 470000,
        'current_price': 500.00
    },
    {
        'code': 'PFE',
        'name': 'Pfizer Inc.',
        'sector': 'Healthcare',
        'industry': 'Drug Manufacturers',
        'market_cap': 155000,
        'current_price': 27.50
    },
    
    # 能源 - Energy
    {
        'code': 'XOM',
        'name': 'Exxon Mobil Corporation',
        'sector': 'Energy',
        'industry': 'Oil & Gas Integrated',
        'market_cap': 420000,
        'current_price': 105.00
    },
    
    # 工业 - Industrials
    {
        'code': 'BA',
        'name': 'Boeing Company',
        'sector': 'Industrials',
        'industry': 'Aerospace & Defense',
        'market_cap': 110000,
        'current_price': 180.00
    },
    {
        'code': 'CAT',
        'name': 'Caterpillar Inc.',
        'sector': 'Industrials',
        'industry': 'Farm & Heavy Machinery',
        'market_cap': 150000,
        'current_price': 280.00
    },
    
    # 消费防御 - Consumer Defensive
    {
        'code': 'WMT',
        'name': 'Walmart Inc.',
        'sector': 'Consumer Defensive',
        'industry': 'Discount Stores',
        'market_cap': 420000,
        'current_price': 160.00
    },
    {
        'code': 'PG',
        'name': 'Procter & Gamble',
        'sector': 'Consumer Defensive',
        'industry': 'Household & Personal Products',
        'market_cap': 380000,
        'current_price': 158.00
    },
    
    # 房地产 - Real Estate
    {
        'code': 'AMT',
        'name': 'American Tower Corporation',
        'sector': 'Real Estate',
        'industry': 'REIT - Specialty',
        'market_cap': 95000,
        'current_price': 210.00
    },
    
    # 材料 - Basic Materials
    {
        'code': 'LIN',
        'name': 'Linde plc',
        'sector': 'Basic Materials',
        'industry': 'Specialty Chemicals',
        'market_cap': 200000,
        'current_price': 420.00
    }
]


def create_categories(engine):
    """创建分类（Sector和Industry）"""
    logger.info("\n【步骤1】创建分类...")
    
    # 提取所有唯一的Sector和Industry
    sectors = set(stock['sector'] for stock in TEST_STOCKS)
    industries = {}  # sector -> [industries]
    
    for stock in TEST_STOCKS:
        sector = stock['sector']
        industry = stock['industry']
        if sector not in industries:
            industries[sector] = set()
        industries[sector].add(industry)
    
    logger.info(f"  发现 {len(sectors)} 个Sector")
    logger.info(f"  发现 {sum(len(v) for v in industries.values())} 个Industry")
    
    category_map = {}  # name -> (id, level)
    
    with engine.begin() as conn:
        # 获取当前最大id
        max_id_result = conn.execute(
            text("SELECT COALESCE(MAX(id), 0) FROM categories")
        ).scalar()
        next_id = max_id_result + 1
        
        # 1. 创建Sector分类（顶级分类，parent_id = NULL, level = 1）
        for sector in sectors:
            # 检查是否存在（通过name和parent_id=NULL来判断是顶级Sector）
            result = conn.execute(
                text("SELECT id FROM categories WHERE name = :name AND parent_id IS NULL"),
                {"name": sector}
            ).fetchone()
            
            if result:
                category_id = result[0]
                logger.debug(f"  Sector已存在: {sector}")
            else:
                # 生成category_id
                cat_id = f"sector_{sector.lower().replace(' ', '_').replace('&', 'and')}"
                conn.execute(
                    text("""
                        INSERT INTO categories (
                            id, category_id, name, parent_id, level, 
                            is_active, is_custom, created_at
                        )
                        VALUES (:id, :cat_id, :name, NULL, 1, 1, 0, NOW())
                    """),
                    {"id": next_id, "cat_id": cat_id, "name": sector}
                )
                category_id = next_id
                next_id += 1
                logger.info(f"  ✅ 创建Sector: {sector} (id={category_id})")
            
            category_map[sector] = (category_id, 1)
        
        # 2. 创建Industry分类（作为Sector的子分类，level = 2）
        for sector, industry_set in industries.items():
            parent_id = category_map[sector][0]
            
            for industry in industry_set:
                # 检查是否存在（通过name和parent_id来判断）
                result = conn.execute(
                    text("SELECT id FROM categories WHERE name = :name AND parent_id = :parent_id"),
                    {"name": industry, "parent_id": parent_id}
                ).fetchone()
                
                if result:
                    category_id = result[0]
                    logger.debug(f"  Industry已存在: {industry}")
                else:
                    # 生成category_id
                    cat_id = f"industry_{industry.lower().replace(' ', '_').replace('&', 'and')}"
                    conn.execute(
                        text("""
                            INSERT INTO categories (
                                id, category_id, name, parent_id, level,
                                is_active, is_custom, created_at
                            )
                            VALUES (:id, :cat_id, :name, :parent_id, 2, 1, 0, NOW())
                        """),
                        {"id": next_id, "cat_id": cat_id, "name": industry, "parent_id": parent_id}
                    )
                    category_id = next_id
                    next_id += 1
                    logger.info(f"  ✅ 创建Industry: {industry} (under {sector}, id={category_id})")
                
                category_map[industry] = (category_id, 2)
    
    logger.info(f"✅ 分类创建完成: {len(category_map)} 个")
    return category_map


def create_stocks(engine, category_map):
    """创建股票并建立关联"""
    logger.info("\n【步骤2】创建股票...")
    
    saved_stocks = 0
    saved_relations = 0
    
    with engine.begin() as conn:
        # 获取当前最大id (stocks表)
        max_stock_id = conn.execute(
            text("SELECT COALESCE(MAX(id), 0) FROM stocks")
        ).scalar()
        next_stock_id = max_stock_id + 1
        
        # 获取当前最大id (category_stock_relations表)
        max_relation_id = conn.execute(
            text("SELECT COALESCE(MAX(id), 0) FROM category_stock_relations")
        ).scalar()
        next_relation_id = max_relation_id + 1
        
        for stock in TEST_STOCKS:
            # 检查股票是否已存在
            existing = conn.execute(
                text("SELECT id FROM stocks WHERE code = :code"),
                {"code": stock['code']}
            ).fetchone()
            
            if existing:
                # 更新现有股票
                conn.execute(
                    text("""
                        UPDATE stocks 
                        SET name = :name, market_cap = :market_cap, updated_at = NOW()
                        WHERE code = :code
                    """),
                    {
                        "code": stock['code'],
                        "name": stock['name'][:100],
                        "market_cap": str(int(stock['market_cap']))
                    }
                )
                logger.info(f"  ✅ {stock['code']}: {stock['name']} (updated)")
            else:
                # 插入新股票
                conn.execute(
                    text("""
                        INSERT INTO stocks (id, code, name, market, market_cap, updated_at, is_active)
                        VALUES (:id, :code, :name, 'US', :market_cap, NOW(), 1)
                    """),
                    {
                        "id": next_stock_id,
                        "code": stock['code'],
                        "name": stock['name'][:100],
                        "market_cap": str(int(stock['market_cap']))
                    }
                )
                logger.info(f"  ✅ {stock['code']}: {stock['name']} (new, id={next_stock_id})")
                next_stock_id += 1
            
            saved_stocks += 1
            
            # 建立与Sector的关联
            sector_id = category_map[stock['sector']][0]
            result = conn.execute(
                text("""
                    SELECT id FROM category_stock_relations 
                    WHERE category_id = :cat_id AND stock_code = :code
                """),
                {"cat_id": sector_id, "code": stock['code']}
            ).fetchone()
            
            if not result:
                conn.execute(
                    text("""
                        INSERT INTO category_stock_relations (id, category_id, stock_code, created_at)
                        VALUES (:id, :cat_id, :code, NOW())
                    """),
                    {"id": next_relation_id, "cat_id": sector_id, "code": stock['code']}
                )
                next_relation_id += 1
                saved_relations += 1
            
            # 建立与Industry的关联
            industry_id = category_map[stock['industry']][0]
            result = conn.execute(
                text("""
                    SELECT id FROM category_stock_relations 
                    WHERE category_id = :cat_id AND stock_code = :code
                """),
                {"cat_id": industry_id, "code": stock['code']}
            ).fetchone()
            
            if not result:
                conn.execute(
                    text("""
                        INSERT INTO category_stock_relations (id, category_id, stock_code, created_at)
                        VALUES (:id, :cat_id, :code, NOW())
                    """),
                    {"id": next_relation_id, "cat_id": industry_id, "code": stock['code']}
                )
                next_relation_id += 1
                saved_relations += 1
    
    logger.info(f"✅ 股票创建完成: {saved_stocks} 只")
    logger.info(f"✅ 关联关系创建完成: {saved_relations} 个")
    return saved_stocks, saved_relations


def print_statistics(engine):
    """打印统计信息"""
    logger.info("\n" + "=" * 60)
    logger.info("📊 数据统计")
    logger.info("=" * 60)
    
    with engine.connect() as conn:
        # 股票数量
        stock_count = conn.execute(text("SELECT COUNT(*) FROM stocks WHERE market = 'US'")).scalar()
        logger.info(f"\n【stocks表】")
        logger.info(f"  美股数量: {stock_count}")
        
        # 分类数量（level=1是Sector，level=2是Industry）
        sector_count = conn.execute(
            text("SELECT COUNT(*) FROM categories WHERE level = 1 AND parent_id IS NULL")
        ).scalar()
        industry_count = conn.execute(
            text("SELECT COUNT(*) FROM categories WHERE level = 2 AND parent_id IS NOT NULL")
        ).scalar()
        logger.info(f"\n【categories表】")
        logger.info(f"  Sector数量(level=1): {sector_count}")
        logger.info(f"  Industry数量(level=2): {industry_count}")
        
        # 关联关系数量
        relation_count = conn.execute(text("SELECT COUNT(*) FROM category_stock_relations")).scalar()
        logger.info(f"\n【category_stock_relations表】")
        logger.info(f"  关联关系: {relation_count}")
        
        # 每个Sector的股票数量
        logger.info(f"\n【Sector分布】")
        results = conn.execute(
            text("""
                SELECT c.name, COUNT(DISTINCT csr.stock_code) as stock_count
                FROM categories c
                LEFT JOIN category_stock_relations csr ON c.id = csr.category_id
                WHERE c.level = 1 AND c.parent_id IS NULL
                GROUP BY c.id, c.name
                ORDER BY stock_count DESC
            """)
        ).fetchall()
        
        for row in results:
            logger.info(f"  {row[0]}: {row[1]} 只股票")
        
        # 市值分布
        logger.info(f"\n【市值分布】")
        results = conn.execute(
            text("""
                SELECT 
                    MIN(market_cap) as min_cap,
                    MAX(market_cap) as max_cap,
                    AVG(market_cap) as avg_cap
                FROM stocks
                WHERE market = 'US' AND market_cap > 0
            """)
        ).fetchone()
        
        if results and results[0]:
            # market_cap是VARCHAR类型，需要转换为数字
            try:
                min_cap = float(results[0]) if results[0] else 0
                max_cap = float(results[1]) if results[1] else 0
                avg_cap = float(results[2]) if results[2] else 0
                logger.info(f"  最小市值: ${min_cap:,.0f}M")
                logger.info(f"  最大市值: ${max_cap:,.0f}M")
                logger.info(f"  平均市值: ${avg_cap:,.0f}M")
            except (ValueError, TypeError):
                logger.info(f"  市值数据格式异常，跳过统计")


def main():
    """主函数"""
    logger.info("=" * 60)
    logger.info("🚀 创建测试股票数据")
    logger.info("=" * 60)
    logger.info(f"\n包含 {len(TEST_STOCKS)} 只知名美股")
    logger.info("涵盖多个行业和市值范围\n")
    
    try:
        # 连接数据库
        engine = create_engine(settings.database_url)
        
        # 1. 创建分类
        category_map = create_categories(engine)
        
        # 2. 创建股票并建立关联
        saved_stocks, saved_relations = create_stocks(engine, category_map)
        
        # 3. 打印统计
        print_statistics(engine)
        
        # 完成
        logger.info("\n" + "=" * 60)
        logger.info("✅ 测试数据创建完成！")
        logger.info("=" * 60)
        
        logger.info("\n📚 下一步：")
        logger.info("1. 验证数据：python scripts/verify_stock_data.py")
        logger.info("2. 测试策略：python scripts/test_short_term_strategy.py")
        logger.info("3. 启动后端：python run.py")
        logger.info("4. 查看前端效果")
        
        logger.info("\n💡 提示：")
        logger.info("- 这是测试数据，只有20只股票")
        logger.info("- 明天可以用Alpha Vantage获取完整数据（每天75只）")
        logger.info("- 或者注册IEX Cloud获取所有数据")
        
    except Exception as e:
        logger.error(f"❌ 创建失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()

