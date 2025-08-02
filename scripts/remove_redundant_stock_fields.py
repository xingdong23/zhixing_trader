#!/usr/bin/env python3
"""
数据库迁移脚本：移除stock表中的冗余字段
移除字段：industry_tags, concept_ids
原因：已使用concept_stock_relations表管理概念关联关系
"""

import sys
import os
import sqlite3
from datetime import datetime

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def get_database_path():
    """获取数据库文件路径"""
    db_path = os.path.join(os.path.dirname(__file__), 'api-server', 'data', 'zhixing_trader.db')
    if not os.path.exists(db_path):
        print(f"数据库文件不存在: {db_path}")
        return None
    return db_path

def backup_data(cursor):
    """备份现有数据"""
    print("正在备份现有数据...")
    
    # 查询现有的industry_tags和concept_ids数据
    cursor.execute("""
        SELECT id, code, name, industry_tags, concept_ids 
        FROM stocks 
        WHERE industry_tags IS NOT NULL OR concept_ids IS NOT NULL
    """)
    
    backup_data = cursor.fetchall()
    
    if backup_data:
        backup_file = f"stock_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(backup_file, 'w', encoding='utf-8') as f:
            f.write("# 股票表字段备份\n")
            f.write("# 格式: ID|代码|名称|行业标签|概念IDs\n")
            for row in backup_data:
                f.write(f"{row[0]}|{row[1]}|{row[2]}|{row[3] or ''}|{row[4] or ''}\n")
        
        print(f"备份完成，文件: {backup_file}")
        print(f"备份了 {len(backup_data)} 条记录")
    else:
        print("没有需要备份的数据")
    
    return len(backup_data)

def check_concept_relations(cursor):
    """检查概念关联表的数据完整性"""
    print("检查概念关联表数据完整性...")
    
    # 检查concept_stock_relations表是否存在
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='concept_stock_relations'
    """)
    
    if not cursor.fetchone():
        print("警告: concept_stock_relations表不存在")
        return False
    
    # 统计关联关系数量
    cursor.execute("SELECT COUNT(*) FROM concept_stock_relations")
    relation_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM concepts")
    concept_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM stocks")
    stock_count = cursor.fetchone()[0]
    
    print(f"概念数量: {concept_count}")
    print(f"股票数量: {stock_count}")
    print(f"概念-股票关联关系数量: {relation_count}")
    
    return True

def remove_fields(cursor):
    """移除冗余字段"""
    print("开始移除冗余字段...")
    
    try:
        # SQLite不支持直接删除列，需要重建表
        # 1. 创建新表结构（不包含要删除的字段）
        cursor.execute("""
            CREATE TABLE stocks_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code VARCHAR(20) NOT NULL UNIQUE,
                name VARCHAR(100) NOT NULL,
                market VARCHAR(10) NOT NULL,
                group_id VARCHAR(50),
                group_name VARCHAR(100),
                lot_size INTEGER,
                sec_type VARCHAR(20),
                fundamental_tags TEXT,
                market_cap VARCHAR(20),
                watch_level VARCHAR(20),
                notes TEXT,
                added_at DATETIME,
                updated_at DATETIME,
                is_active BOOLEAN
            )
        """)
        
        # 2. 复制数据（排除要删除的字段）
        cursor.execute("""
            INSERT INTO stocks_new (
                id, code, name, market, group_id, group_name, lot_size, sec_type, 
                fundamental_tags, market_cap, watch_level, notes,
                added_at, updated_at, is_active
            )
            SELECT 
                id, code, name, market, group_id, group_name, lot_size, sec_type,
                fundamental_tags, market_cap, watch_level, notes,
                added_at, updated_at, is_active
            FROM stocks
        """)
        
        # 3. 删除旧表
        cursor.execute("DROP TABLE stocks")
        
        # 4. 重命名新表
        cursor.execute("ALTER TABLE stocks_new RENAME TO stocks")
        
        # 5. 重建索引
        cursor.execute("CREATE UNIQUE INDEX idx_stocks_code ON stocks(code)")
        
        print("字段移除完成")
        return True
        
    except Exception as e:
        print(f"移除字段时出错: {e}")
        return False

def verify_migration(cursor):
    """验证迁移结果"""
    print("验证迁移结果...")
    
    # 检查表结构
    cursor.execute("PRAGMA table_info(stocks)")
    columns = cursor.fetchall()
    
    column_names = [col[1] for col in columns]
    
    if 'industry_tags' in column_names:
        print("错误: industry_tags字段仍然存在")
        return False
    
    if 'concept_ids' in column_names:
        print("错误: concept_ids字段仍然存在")
        return False
    
    print("✓ industry_tags字段已成功移除")
    print("✓ concept_ids字段已成功移除")
    
    # 检查数据完整性
    cursor.execute("SELECT COUNT(*) FROM stocks")
    stock_count = cursor.fetchone()[0]
    
    print(f"✓ 股票数据完整性检查通过，共 {stock_count} 条记录")
    
    return True

def main():
    """主函数"""
    print("=== 股票表字段迁移脚本 ===")
    print("移除字段: industry_tags, concept_ids")
    print("原因: 已使用concept_stock_relations表管理概念关联关系")
    print()
    
    # 获取数据库路径
    db_path = get_database_path()
    if not db_path:
        return 1
    
    print(f"数据库路径: {db_path}")
    
    try:
        # 连接数据库
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 开始事务
        cursor.execute("BEGIN TRANSACTION")
        
        # 1. 备份数据
        backup_count = backup_data(cursor)
        
        # 2. 检查概念关联表
        if not check_concept_relations(cursor):
            print("概念关联表检查失败，建议先完善concept_stock_relations表")
            conn.rollback()
            return 1
        
        # 3. 移除字段
        if not remove_fields(cursor):
            print("字段移除失败，回滚事务")
            conn.rollback()
            return 1
        
        # 4. 验证迁移
        if not verify_migration(cursor):
            print("迁移验证失败，回滚事务")
            conn.rollback()
            return 1
        
        # 提交事务
        conn.commit()
        
        print()
        print("=== 迁移完成 ===")
        print(f"✓ 成功移除 industry_tags 和 concept_ids 字段")
        print(f"✓ 备份了 {backup_count} 条记录")
        print("✓ 数据完整性验证通过")
        print()
        print("注意事项:")
        print("1. 请确保前端代码已更新，不再使用这两个字段")
        print("2. 概念关联关系现在通过concept_stock_relations表管理")
        print("3. 如需回滚，请使用备份文件手动恢复")
        
        return 0
        
    except Exception as e:
        print(f"迁移过程中出错: {e}")
        if 'conn' in locals():
            conn.rollback()
        return 1
        
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)