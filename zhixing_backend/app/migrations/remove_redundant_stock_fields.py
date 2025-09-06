#!/usr/bin/env python3
"""
数据库迁移脚本：移除stock表中的冗余字段
移除 industry_tags 和 concept_ids 字段，因为已经有了专门的关联表

执行前请确保：
1. 已经备份数据库
2. concept_stock_relations 表已经包含了所有必要的关联数据
3. 前端代码已经更新为使用新的关联表逻辑
"""

import sys
import os
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import text
from loguru import logger
from database import db_service

def backup_data():
    """备份即将删除的字段数据"""
    logger.info("开始备份即将删除的字段数据...")
    
    try:
        with db_service.get_session() as session:
            # 查询所有包含industry_tags或concept_ids的股票
            result = session.execute(text("""
                SELECT code, name, industry_tags, concept_ids 
                FROM stocks 
                WHERE industry_tags IS NOT NULL OR concept_ids IS NOT NULL
            """))
            
            backup_data = []
            for row in result:
                backup_data.append({
                    'code': row.code,
                    'name': row.name,
                    'industry_tags': row.industry_tags,
                    'concept_ids': row.concept_ids
                })
            
            # 保存备份数据到文件
            import json
            backup_file = project_root / 'migrations' / 'backup_stock_fields.json'
            with open(backup_file, 'w', encoding='utf-8') as f:
                json.dump(backup_data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"备份完成，共备份 {len(backup_data)} 条记录到 {backup_file}")
            return True
            
    except Exception as e:
        logger.error(f"备份数据失败: {e}")
        return False

def check_concept_relations():
    """检查concept_stock_relations表是否包含足够的数据"""
    logger.info("检查concept_stock_relations表数据完整性...")
    
    try:
        with db_service.get_session() as session:
            # 统计关联表中的记录数
            relations_count = session.execute(text(
                "SELECT COUNT(*) as count FROM concept_stock_relations"
            )).scalar()
            
            # 统计有concept_ids的股票数
            stocks_with_concepts = session.execute(text("""
                SELECT COUNT(*) as count FROM stocks 
                WHERE concept_ids IS NOT NULL AND concept_ids != '[]' AND concept_ids != ''
            """)).scalar()
            
            logger.info(f"concept_stock_relations表中有 {relations_count} 条关联记录")
            logger.info(f"stocks表中有 {stocks_with_concepts} 只股票包含concept_ids")
            
            if relations_count == 0 and stocks_with_concepts > 0:
                logger.warning("警告：concept_stock_relations表为空，但stocks表中有概念数据！")
                return False
            
            return True
            
    except Exception as e:
        logger.error(f"检查关联表失败: {e}")
        return False

def remove_redundant_fields():
    """移除冗余字段"""
    logger.info("开始移除stock表中的冗余字段...")
    
    try:
        with db_service.get_session() as session:
            # 移除 industry_tags 字段
            logger.info("移除 industry_tags 字段...")
            session.execute(text("ALTER TABLE stocks DROP COLUMN industry_tags"))
            
            # 移除 concept_ids 字段
            logger.info("移除 concept_ids 字段...")
            session.execute(text("ALTER TABLE stocks DROP COLUMN concept_ids"))
            
            session.commit()
            logger.info("字段移除完成")
            return True
            
    except Exception as e:
        logger.error(f"移除字段失败: {e}")
        return False

def verify_migration():
    """验证迁移结果"""
    logger.info("验证迁移结果...")
    
    try:
        with db_service.get_session() as session:
            # 检查字段是否已被移除
            result = session.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'stocks' 
                AND column_name IN ('industry_tags', 'concept_ids')
            """))
            
            remaining_fields = [row.column_name for row in result]
            
            if remaining_fields:
                logger.error(f"迁移失败，以下字段仍然存在: {remaining_fields}")
                return False
            else:
                logger.info("迁移成功，冗余字段已完全移除")
                return True
                
    except Exception as e:
        logger.error(f"验证迁移失败: {e}")
        return False

def main():
    """主函数"""
    logger.info("开始执行数据库迁移：移除stock表冗余字段")
    
    # 1. 备份数据
    if not backup_data():
        logger.error("备份失败，终止迁移")
        return False
    
    # 2. 检查关联表数据
    if not check_concept_relations():
        logger.error("关联表数据检查失败，请先确保数据迁移完成")
        return False
    
    # 3. 确认执行
    print("\n⚠️  警告：即将删除stock表中的industry_tags和concept_ids字段")
    print("请确认：")
    print("1. 已经备份数据库")
    print("2. concept_stock_relations表包含了所有必要的关联数据")
    print("3. 前端代码已经更新")
    
    confirm = input("\n确认执行迁移？(yes/no): ")
    if confirm.lower() != 'yes':
        logger.info("用户取消迁移")
        return False
    
    # 4. 执行迁移
    if not remove_redundant_fields():
        logger.error("字段移除失败")
        return False
    
    # 5. 验证结果
    if not verify_migration():
        logger.error("迁移验证失败")
        return False
    
    logger.info("✅ 数据库迁移完成！")
    logger.info("请记得更新相关代码，移除对industry_tags和concept_ids字段的引用")
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)