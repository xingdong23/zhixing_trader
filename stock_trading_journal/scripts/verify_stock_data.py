"""
验证股票数据脚本
快速检查 stocks、categories、category_stock_relations 的数据
"""
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import create_engine, text
from app.config import settings
from loguru import logger


def verify_database():
    """验证数据库数据"""
    
    engine = create_engine(settings.database_url)
    
    with engine.connect() as conn:
        logger.info("=" * 60)
        logger.info("📊 数据库验证报告")
        logger.info("=" * 60)
        
        # 1. stocks表
        result = conn.execute(text("SELECT COUNT(*) as cnt FROM stocks WHERE market = 'US'"))
        stock_count = result.fetchone()[0]
        logger.info(f"\n【stocks表】")
        logger.info(f"  美股数量: {stock_count} 只")
        
        if stock_count > 0:
            result = conn.execute(text("""
                SELECT code, name, market_cap 
                FROM stocks 
                WHERE market = 'US' 
                LIMIT 5
            """))
            logger.info(f"  样本数据:")
            for row in result:
                logger.info(f"    {row.code:6s} | {row.name:30s} | {row.market_cap}")
        
        # 2. categories表
        result = conn.execute(text("SELECT level, COUNT(*) as cnt FROM categories GROUP BY level"))
        logger.info(f"\n【categories表】")
        level_counts = {}
        for row in result:
            level_counts[row.level] = row.cnt
            logger.info(f"  Level {row.level}: {row.cnt} 个")
        
        if level_counts:
            result = conn.execute(text("""
                SELECT category_id, name, level, stock_count
                FROM categories
                WHERE level = 0
                ORDER BY stock_count DESC
                LIMIT 5
            """))
            logger.info(f"  Top 5 Sectors:")
            for row in result:
                logger.info(f"    {row.name:30s} | {row.stock_count} 只股票")
        
        # 3. category_stock_relations表
        result = conn.execute(text("SELECT COUNT(*) as cnt FROM category_stock_relations"))
        relation_count = result.fetchone()[0]
        logger.info(f"\n【category_stock_relations表】")
        logger.info(f"  关联总数: {relation_count} 条")
        
        if relation_count > 0:
            result = conn.execute(text("""
                SELECT 
                    SUM(CASE WHEN is_primary = 1 THEN 1 ELSE 0 END) as primary_cnt,
                    SUM(CASE WHEN is_primary = 0 THEN 1 ELSE 0 END) as secondary_cnt
                FROM category_stock_relations
            """))
            row = result.fetchone()
            logger.info(f"  - 主要分类: {row.primary_cnt}")
            logger.info(f"  - 次要分类: {row.secondary_cnt}")
        
        # 4. 数据一致性检查
        logger.info(f"\n【数据一致性检查】")
        
        # 检查：每只股票是否都有分类
        result = conn.execute(text("""
            SELECT COUNT(*) as cnt
            FROM stocks s
            WHERE s.market = 'US'
            AND NOT EXISTS (
                SELECT 1 FROM category_stock_relations r
                WHERE r.stock_code = s.code
            )
        """))
        stocks_without_category = result.fetchone()[0]
        
        if stocks_without_category == 0:
            logger.info(f"  ✅ 所有股票都有分类")
        else:
            logger.warning(f"  ⚠️  {stocks_without_category} 只股票没有分类")
        
        # 检查：categories的stock_count是否准确
        result = conn.execute(text("""
            SELECT COUNT(*) as cnt
            FROM categories c
            WHERE c.stock_count != (
                SELECT COUNT(*) FROM category_stock_relations r
                WHERE r.category_id = c.category_id
            )
        """))
        incorrect_count = result.fetchone()[0]
        
        if incorrect_count == 0:
            logger.info(f"  ✅ 分类的stock_count统计准确")
        else:
            logger.warning(f"  ⚠️  {incorrect_count} 个分类的stock_count统计不准确")
        
        # 5. 总结
        logger.info("\n" + "=" * 60)
        if stock_count > 0 and relation_count > 0 and stocks_without_category == 0:
            logger.info("✅ 数据验证通过！股票池已准备就绪")
        elif stock_count == 0:
            logger.warning("⚠️  stocks表为空，请先运行初始化脚本")
        else:
            logger.warning("⚠️  数据不完整，请检查")
        logger.info("=" * 60)


if __name__ == "__main__":
    try:
        verify_database()
    except Exception as e:
        logger.error(f"验证失败: {e}")
        import traceback
        traceback.print_exc()

