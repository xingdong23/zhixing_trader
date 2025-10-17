"""
初始化数据库脚本
"""
import sys
import os

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from app.config import settings
from app.models import Base
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_database():
    """初始化数据库表"""
    try:
        # 创建数据库引擎
        engine = create_engine(settings.database_url)
        
        logger.info("开始创建数据库表...")
        
        # 创建所有表
        Base.metadata.create_all(engine)
        
        logger.info("✅ 数据库表创建成功！")
        
        # 打印创建的表
        logger.info("已创建的表:")
        for table in Base.metadata.tables.keys():
            logger.info(f"  - {table}")
        
    except Exception as e:
        logger.error(f"❌ 数据库初始化失败: {e}")
        raise


if __name__ == "__main__":
    init_database()

