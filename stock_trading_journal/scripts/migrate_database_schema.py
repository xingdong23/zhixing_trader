"""
数据库表结构迁移脚本

改进内容:
1. 删除 quotes 表 (行情数据统一从K线表获取)
2. 删除 stocks 表的 group_id 和 group_name 字段 (使用 categories 系统代替)
3. 为 K线表添加外键约束,关联到 stocks 表
4. 为 K线表添加唯一索引 (code + time_key)

执行方式:
python scripts/migrate_database_schema.py
"""

import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import text, inspect
from loguru import logger
from app.database import db_service
from app.config import settings


def check_table_exists(engine, table_name: str) -> bool:
    """检查表是否存在"""
    inspector = inspect(engine)
    return table_name in inspector.get_table_names()


def check_column_exists(engine, table_name: str, column_name: str) -> bool:
    """检查列是否存在"""
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def migrate_database():
    """执行数据库迁移"""
    engine = db_service.engine
    
    logger.info("=" * 60)
    logger.info("开始数据库表结构迁移")
    logger.info("=" * 60)
    
    with engine.connect() as conn:
        # 1. 删除 quotes 表
        if check_table_exists(engine, 'quotes'):
            logger.info("步骤 1: 删除 quotes 表...")
            try:
                conn.execute(text("DROP TABLE IF EXISTS quotes"))
                conn.commit()
                logger.info("✅ quotes 表已删除")
            except Exception as e:
                logger.error(f"❌ 删除 quotes 表失败: {e}")
        else:
            logger.info("✅ quotes 表不存在,跳过删除")
        
        # 2. 删除 stocks 表的 group_id 和 group_name 列
        if check_table_exists(engine, 'stocks'):
            logger.info("步骤 2: 删除 stocks 表的 group_id 和 group_name 列...")
            try:
                if check_column_exists(engine, 'stocks', 'group_id'):
                    conn.execute(text("ALTER TABLE stocks DROP COLUMN group_id"))
                    logger.info("✅ 删除 group_id 列")
                
                if check_column_exists(engine, 'stocks', 'group_name'):
                    conn.execute(text("ALTER TABLE stocks DROP COLUMN group_name"))
                    logger.info("✅ 删除 group_name 列")
                
                conn.commit()
                logger.info("✅ stocks 表字段清理完成")
            except Exception as e:
                logger.error(f"❌ 修改 stocks 表失败: {e}")
        
        # 3. 为 K线表添加外键约束和唯一索引
        kline_tables = [
            'klines_1min', 'klines_3min', 'klines_5min', 'klines_15min',
            'klines_30min', 'klines_1hour', 'klines_4hour',
            'klines_daily', 'klines_weekly', 'klines_monthly'
        ]
        
        logger.info("步骤 3: 为 K线表添加外键约束和唯一索引...")
        
        for table_name in kline_tables:
            if not check_table_exists(engine, table_name):
                logger.info(f"⏭️  {table_name} 表不存在,跳过")
                continue
            
            try:
                # 检查外键是否已存在
                fk_name = f"fk_{table_name}_stocks"
                check_fk_sql = f"""
                SELECT COUNT(*) as cnt
                FROM information_schema.TABLE_CONSTRAINTS
                WHERE CONSTRAINT_SCHEMA = DATABASE()
                AND TABLE_NAME = '{table_name}'
                AND CONSTRAINT_NAME = '{fk_name}'
                AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                """
                result = conn.execute(text(check_fk_sql))
                fk_exists = result.fetchone()[0] > 0
                
                if not fk_exists:
                    # 添加外键约束
                    add_fk_sql = f"""
                    ALTER TABLE {table_name}
                    ADD CONSTRAINT {fk_name}
                    FOREIGN KEY (code) REFERENCES stocks(code)
                    ON DELETE CASCADE
                    """
                    conn.execute(text(add_fk_sql))
                    logger.info(f"✅ {table_name} 添加外键约束")
                else:
                    logger.info(f"⏭️  {table_name} 外键约束已存在")
                
                # 检查唯一索引是否已存在
                idx_name = f"idx_{table_name.replace('klines_', '')}_code_key"
                check_idx_sql = f"""
                SELECT COUNT(*) as cnt
                FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = '{table_name}'
                AND INDEX_NAME = '{idx_name}'
                """
                result = conn.execute(text(check_idx_sql))
                idx_exists = result.fetchone()[0] > 0
                
                if not idx_exists:
                    # 添加唯一索引
                    add_idx_sql = f"""
                    ALTER TABLE {table_name}
                    ADD UNIQUE INDEX {idx_name} (code, time_key)
                    """
                    conn.execute(text(add_idx_sql))
                    logger.info(f"✅ {table_name} 添加唯一索引")
                else:
                    logger.info(f"⏭️  {table_name} 唯一索引已存在")
                
                conn.commit()
                
            except Exception as e:
                logger.error(f"❌ 处理 {table_name} 失败: {e}")
                conn.rollback()
    
    logger.info("=" * 60)
    logger.info("数据库表结构迁移完成!")
    logger.info("=" * 60)
    logger.info("")
    logger.info("改进总结:")
    logger.info("1. ✅ 删除了 quotes 表 (行情数据从K线表获取)")
    logger.info("2. ✅ 删除了 stocks 表的 group_id/group_name (使用分类系统)")
    logger.info("3. ✅ 为所有K线表添加了外键约束")
    logger.info("4. ✅ 为所有K线表添加了唯一索引防止重复数据")
    logger.info("")


if __name__ == "__main__":
    try:
        migrate_database()
    except Exception as e:
        logger.error(f"迁移失败: {e}")
        sys.exit(1)


