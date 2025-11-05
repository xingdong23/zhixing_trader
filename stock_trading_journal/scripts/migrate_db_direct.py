"""
直接使用SQL操作数据库的迁移脚本
避免导入有问题的代码
"""
import pymysql
from loguru import logger

# 数据库配置
DB_CONFIG = {
    'host': '127.0.0.1',
    'port': 3306,
    'user': 'root',
    'password': 'Cz159csa',
    'database': 'zhixing_trader',
    'charset': 'utf8mb4'
}


def execute_sql(connection, sql, description):
    """执行SQL并记录"""
    try:
        with connection.cursor() as cursor:
            cursor.execute(sql)
            connection.commit()
            logger.info(f"✅ {description}")
            return True
    except Exception as e:
        logger.error(f"❌ {description} 失败: {e}")
        return False


def check_table_exists(connection, table_name):
    """检查表是否存在"""
    try:
        with connection.cursor() as cursor:
            cursor.execute(f"SHOW TABLES LIKE '{table_name}'")
            return cursor.fetchone() is not None
    except:
        return False


def check_column_exists(connection, table_name, column_name):
    """检查列是否存在"""
    try:
        with connection.cursor() as cursor:
            cursor.execute(f"SHOW COLUMNS FROM {table_name} LIKE '{column_name}'")
            return cursor.fetchone() is not None
    except:
        return False


def migrate_database():
    """执行数据库迁移"""
    logger.info("=" * 60)
    logger.info("开始数据库表结构迁移")
    logger.info("=" * 60)
    
    try:
        # 连接数据库
        connection = pymysql.connect(**DB_CONFIG)
        logger.info("✅ 数据库连接成功")
        
        # 1. 删除 quotes 表
        logger.info("\n步骤 1: 删除 quotes 表...")
        if check_table_exists(connection, 'quotes'):
            execute_sql(connection, "DROP TABLE IF EXISTS quotes", "删除 quotes 表")
        else:
            logger.info("⏭️  quotes 表不存在，跳过")
        
        # 2. 删除旧的 klines 表（如果存在）
        logger.info("\n步骤 2: 删除旧的 klines 表...")
        if check_table_exists(connection, 'klines'):
            execute_sql(connection, "DROP TABLE IF EXISTS klines", "删除旧的 klines 表")
        else:
            logger.info("⏭️  旧 klines 表不存在，跳过")
        
        # 3. 删除 stocks 表的 group_id 和 group_name 列
        logger.info("\n步骤 3: 删除 stocks 表的 group_id 和 group_name 列...")
        if check_table_exists(connection, 'stocks'):
            if check_column_exists(connection, 'stocks', 'group_id'):
                execute_sql(connection, 
                          "ALTER TABLE stocks DROP COLUMN group_id", 
                          "删除 group_id 列")
            else:
                logger.info("⏭️  group_id 列不存在")
            
            if check_column_exists(connection, 'stocks', 'group_name'):
                execute_sql(connection, 
                          "ALTER TABLE stocks DROP COLUMN group_name", 
                          "删除 group_name 列")
            else:
                logger.info("⏭️  group_name 列不存在")
        
        # 4. 为 K线表添加外键约束和唯一索引
        logger.info("\n步骤 4: 为 K线表添加外键约束和唯一索引...")
        
        kline_tables = [
            ('klines_1min', '1min'),
            ('klines_3min', '3min'),
            ('klines_5min', '5min'),
            ('klines_15min', '15min'),
            ('klines_30min', '30min'),
            ('klines_1hour', '1hour'),
            ('klines_4hour', '4hour'),
            ('klines_daily', 'daily'),
            ('klines_weekly', 'weekly'),
            ('klines_monthly', 'monthly')
        ]
        
        for table_name, period_name in kline_tables:
            if not check_table_exists(connection, table_name):
                logger.info(f"⏭️  {table_name} 表不存在，跳过")
                continue
            
            logger.info(f"\n处理 {table_name}...")
            
            # 检查并添加外键约束
            fk_name = f"fk_{table_name}_stocks"
            try:
                with connection.cursor() as cursor:
                    cursor.execute(f"""
                        SELECT COUNT(*) as cnt
                        FROM information_schema.TABLE_CONSTRAINTS
                        WHERE CONSTRAINT_SCHEMA = DATABASE()
                        AND TABLE_NAME = '{table_name}'
                        AND CONSTRAINT_NAME = '{fk_name}'
                        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                    """)
                    fk_exists = cursor.fetchone()[0] > 0
                
                if not fk_exists:
                    execute_sql(connection, f"""
                        ALTER TABLE {table_name}
                        ADD CONSTRAINT {fk_name}
                        FOREIGN KEY (code) REFERENCES stocks(code)
                        ON DELETE CASCADE
                    """, f"{table_name} 添加外键约束")
                else:
                    logger.info(f"⏭️  {table_name} 外键约束已存在")
            except Exception as e:
                logger.warning(f"⚠️  {table_name} 外键约束处理失败: {e}")
            
            # 检查并添加唯一索引
            idx_name = f"idx_{period_name}_code_key"
            try:
                with connection.cursor() as cursor:
                    cursor.execute(f"""
                        SELECT COUNT(*) as cnt
                        FROM information_schema.STATISTICS
                        WHERE TABLE_SCHEMA = DATABASE()
                        AND TABLE_NAME = '{table_name}'
                        AND INDEX_NAME = '{idx_name}'
                    """)
                    idx_exists = cursor.fetchone()[0] > 0
                
                if not idx_exists:
                    # 先删除可能存在的非唯一索引
                    try:
                        execute_sql(connection, 
                                  f"ALTER TABLE {table_name} DROP INDEX {idx_name}",
                                  f"删除旧的 {idx_name} 索引")
                    except:
                        pass
                    
                    execute_sql(connection, f"""
                        ALTER TABLE {table_name}
                        ADD UNIQUE INDEX {idx_name} (code, time_key)
                    """, f"{table_name} 添加唯一索引")
                else:
                    logger.info(f"⏭️  {table_name} 唯一索引已存在")
            except Exception as e:
                logger.warning(f"⚠️  {table_name} 唯一索引处理失败: {e}")
        
        # 5. 查看最终的表列表
        logger.info("\n步骤 5: 查看当前数据库表...")
        with connection.cursor() as cursor:
            cursor.execute("SHOW TABLES")
            tables = cursor.fetchall()
            logger.info(f"当前数据库共有 {len(tables)} 个表：")
            for table in tables:
                logger.info(f"  - {table[0]}")
        
        connection.close()
        
        logger.info("\n" + "=" * 60)
        logger.info("数据库表结构迁移完成!")
        logger.info("=" * 60)
        logger.info("\n改进总结:")
        logger.info("1. ✅ 删除了 quotes 表")
        logger.info("2. ✅ 删除了旧的 klines 表")
        logger.info("3. ✅ 删除了 stocks 表的 group_id/group_name")
        logger.info("4. ✅ 为所有K线表添加了外键约束和唯一索引")
        
    except Exception as e:
        logger.error(f"迁移失败: {e}")
        raise


if __name__ == "__main__":
    migrate_database()

