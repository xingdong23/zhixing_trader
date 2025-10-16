"""
创建分类树相关表的脚本
"""
import sys
import os

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import db_service
from app.models import CategoryDB, CategoryStockRelationDB, Base
from loguru import logger


def create_tables():
    """创建分类树相关表"""
    try:
        logger.info("开始创建分类树相关表...")
        
        # 获取数据库引擎
        engine = db_service.engine
        
        # 创建表
        CategoryDB.__table__.create(engine, checkfirst=True)
        CategoryStockRelationDB.__table__.create(engine, checkfirst=True)
        
        logger.info("✅ 分类树相关表创建成功")
        
        # 创建一些示例分类
        create_sample_categories()
        
    except Exception as e:
        logger.error(f"❌ 创建表失败: {e}")
        raise


def create_sample_categories():
    """创建示例分类"""
    from datetime import datetime
    
    try:
        logger.info("开始创建示例分类...")
        
        with db_service.get_session() as session:
            # 检查是否已有分类
            existing = session.query(CategoryDB).first()
            if existing:
                logger.info("已存在分类，跳过创建示例")
                return
            
            # 示例分类结构
            sample_categories = [
                {
                    "name": "人工智能",
                    "icon": "🤖",
                    "color": "#3B82F6",
                    "children": [
                        {
                            "name": "算力",
                            "icon": "⚡",
                            "color": "#8B5CF6",
                            "children": [
                                {"name": "芯片", "icon": "💾", "color": "#6366F1"},
                                {"name": "云计算", "icon": "☁️", "color": "#0EA5E9"},
                            ]
                        },
                        {
                            "name": "AI应用",
                            "icon": "🎯",
                            "color": "#10B981",
                            "children": [
                                {"name": "机器人", "icon": "🤖", "color": "#059669"},
                                {"name": "自动驾驶", "icon": "🚗", "color": "#14B8A6"},
                            ]
                        }
                    ]
                },
                {
                    "name": "新能源",
                    "icon": "⚡",
                    "color": "#10B981",
                    "children": [
                        {"name": "电池", "icon": "🔋", "color": "#059669"},
                        {"name": "光伏", "icon": "☀️", "color": "#FBBF24"},
                        {
                            "name": "核能",
                            "icon": "☢️",
                            "color": "#EF4444",
                            "children": [
                                {"name": "铀矿", "icon": "⛏️", "color": "#DC2626"},
                            ]
                        }
                    ]
                },
                {
                    "name": "生物医药",
                    "icon": "💊",
                    "color": "#EC4899",
                    "children": [
                        {"name": "创新药", "icon": "💉", "color": "#DB2777"},
                        {"name": "医疗器械", "icon": "🏥", "color": "#F43F5E"},
                    ]
                },
            ]
            
            def create_category(data, parent_id=None, level=0):
                """递归创建分类"""
                timestamp = int(datetime.now().timestamp() * 1000)
                category_id = f"cat_{data['name']}_{timestamp}"
                
                category = CategoryDB(
                    category_id=category_id,
                    name=data['name'],
                    parent_id=parent_id,
                    level=level,
                    icon=data.get('icon'),
                    color=data.get('color'),
                    description=data.get('description', ''),
                    sort_order=0,
                    stock_count=0,
                    total_stock_count=0,
                    is_active=True,
                    is_custom=True
                )
                
                # 设置路径
                if parent_id is None:
                    category.path = f"/{category_id}"
                else:
                    parent = session.query(CategoryDB).filter(CategoryDB.category_id == parent_id).first()
                    if parent:
                        category.path = f"{parent.path}/{category_id}"
                
                session.add(category)
                session.commit()
                session.refresh(category)
                
                # 递归创建子分类
                for child in data.get('children', []):
                    create_category(child, category_id, level + 1)
                
                return category
            
            for cat_data in sample_categories:
                create_category(cat_data)
            
            logger.info("✅ 示例分类创建成功")
            
    except Exception as e:
        logger.error(f"❌ 创建示例分类失败: {e}")


if __name__ == "__main__":
    create_tables()

