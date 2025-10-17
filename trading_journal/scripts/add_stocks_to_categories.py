"""
给分类添加股票的脚本
"""
import sys
import os

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import db_service
from app.models import CategoryDB, CategoryStockRelationDB, StockDB
from loguru import logger


def add_stocks_to_categories():
    """给分类添加股票"""
    try:
        logger.info("开始给分类添加股票...")
        
        with db_service.get_session() as session:
            # 获取所有股票
            all_stocks = session.query(StockDB).filter(StockDB.is_active == True).limit(50).all()
            if not all_stocks:
                logger.warning("没有找到股票，请先导入股票数据")
                return
            
            logger.info(f"找到 {len(all_stocks)} 只股票")
            
            # 获取所有分类
            categories = session.query(CategoryDB).all()
            if not categories:
                logger.warning("没有找到分类")
                return
            
            logger.info(f"找到 {len(categories)} 个分类")
            
            # 为每个分类随机添加一些股票
            import random
            added_count = 0
            
            for category in categories:
                # 每个分类添加3-8只股票
                num_stocks = min(random.randint(3, 8), len(all_stocks))
                selected_stocks = random.sample(all_stocks, num_stocks)
                
                for stock in selected_stocks:
                    # 检查是否已存在
                    existing = session.query(CategoryStockRelationDB).filter(
                        CategoryStockRelationDB.category_id == category.category_id,
                        CategoryStockRelationDB.stock_code == stock.code
                    ).first()
                    
                    if not existing:
                        relation = CategoryStockRelationDB(
                            category_id=category.category_id,
                            stock_code=stock.code,
                            weight=1.0,
                            is_primary=False
                        )
                        session.add(relation)
                        added_count += 1
                
                # 更新分类的股票数量
                direct_count = session.query(CategoryStockRelationDB).filter(
                    CategoryStockRelationDB.category_id == category.category_id
                ).count()
                category.stock_count = direct_count
                category.total_stock_count = direct_count
                
                session.commit()
                logger.info(f"分类 '{category.name}' 添加了股票，当前有 {direct_count} 只")
            
            logger.info(f"✅ 成功添加 {added_count} 条股票-分类关联")
            
    except Exception as e:
        logger.error(f"❌ 添加股票到分类失败: {e}")
        raise


if __name__ == "__main__":
    add_stocks_to_categories()

