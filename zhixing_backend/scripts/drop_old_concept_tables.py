"""
删除旧的concepts相关表，已被categories系统替代
"""
import sys
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import create_engine, text, inspect
from loguru import logger
from app.config import settings


def drop_old_concept_tables():
    """删除旧的concepts相关表"""
    
    # 创建数据库引擎
    engine = create_engine(settings.database_url, echo=False)
    
    logger.info("=" * 80)
    logger.info("  删除旧的 Concepts 系统表（已被 Categories 替代）")
    logger.info("=" * 80)
    
    # 检查表是否存在
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    tables_to_drop = ['concepts', 'concept_stock_relations']
    tables_found = [t for t in tables_to_drop if t in existing_tables]
    
    if not tables_found:
        logger.info("\n✅ 旧表已经不存在，无需删除。")
        return
    
    logger.info(f"\n发现以下旧表：{', '.join(tables_found)}")
    
    # 显示表的数据统计
    with engine.connect() as conn:
        logger.info("\n📊 旧表数据统计:")
        
        if 'concepts' in tables_found:
            result = conn.execute(text("SELECT COUNT(*) FROM concepts"))
            concept_count = result.scalar()
            logger.info(f"   • concepts: {concept_count:,} 条记录")
        
        if 'concept_stock_relations' in tables_found:
            result = conn.execute(text("SELECT COUNT(*) FROM concept_stock_relations"))
            relation_count = result.scalar()
            logger.info(f"   • concept_stock_relations: {relation_count:,} 条记录")
    
    # 删除表
    logger.info("\n🗑️  开始删除旧表...")
    
    with engine.begin() as conn:
        # 先删除关联表（有外键依赖）
        if 'concept_stock_relations' in tables_found:
            logger.info("   删除 concept_stock_relations...")
            conn.execute(text("DROP TABLE IF EXISTS concept_stock_relations"))
            logger.info("   ✅ concept_stock_relations 已删除")
        
        # 再删除主表
        if 'concepts' in tables_found:
            logger.info("   删除 concepts...")
            conn.execute(text("DROP TABLE IF EXISTS concepts"))
            logger.info("   ✅ concepts 已删除")
    
    logger.info("\n" + "=" * 80)
    logger.info("  ✅ 旧表删除完成！")
    logger.info("=" * 80)
    logger.info("\n💡 提示：")
    logger.info("   • 现在使用 categories 表（支持多级分类树）")
    logger.info("   • 现在使用 category_stock_relations 表（分类-股票关联）")
    logger.info("   • API端点从 /concepts 改为 /categories")
    logger.info("\n")


if __name__ == "__main__":
    try:
        drop_old_concept_tables()
    except Exception as e:
        logger.error(f"删除旧表失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

