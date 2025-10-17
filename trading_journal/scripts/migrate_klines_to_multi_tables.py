"""
K线数据迁移脚本
将单一klines表的数据迁移到多个时间周期表
"""
import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from loguru import logger

from app.config import settings
from app.models import (
    Base,
    KLineDB,
    KLine1MinDB,
    KLine3MinDB,
    KLine5MinDB,
    KLine15MinDB,
    KLine30MinDB,
    KLine1HourDB,
    KLine4HourDB,
    KLineDailyDB,
    KLineWeeklyDB,
    KLineMonthlyDB,
    KLineTableManager,
)


# 创建数据库连接
engine = create_engine(
    settings.db_url,
    pool_pre_ping=True,
    echo=False  # 设置为True可以看到SQL语句
)
SessionLocal = sessionmaker(bind=engine)


# 旧period字段到新时间周期的映射
LEGACY_PERIOD_MAPPING = {
    "K_1M": "1m",
    "K_3M": "3m",
    "K_5M": "5m",
    "K_15M": "15m",
    "K_30M": "30m",
    "K_1H": "1h",
    "K_60M": "1h",
    "K_4H": "4h",
    "K_DAY": "1d",
    "K_WEEK": "1w",
    "K_MON": "1M",
    # 其他可能的格式
    "1m": "1m",
    "3m": "3m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1h": "1h",
    "60m": "1h",
    "4h": "4h",
    "1d": "1d",
    "1w": "1w",
    "1M": "1M",
}


def print_section(title: str):
    """打印分隔线"""
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)


def create_new_tables():
    """创建新的多时间周期表"""
    print_section("1. 创建新的多时间周期表")
    
    try:
        # 创建所有新表
        for model in KLineTableManager.ALL_MODELS:
            table_name = model.__tablename__
            
            # 检查表是否已存在
            with engine.connect() as conn:
                result = conn.execute(text(
                    f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}'"
                ))
                exists = result.fetchone() is not None
            
            if exists:
                print(f"   ✓ 表 {table_name} 已存在")
            else:
                model.__table__.create(engine)
                print(f"   ✅ 创建表 {table_name}")
        
        print("\n✅ 所有表创建完成")
        return True
    
    except Exception as e:
        logger.error(f"创建表失败: {e}")
        print(f"\n❌ 创建表失败: {e}")
        return False


def analyze_legacy_data():
    """分析旧表数据"""
    print_section("2. 分析旧表数据")
    
    session = SessionLocal()
    
    try:
        # 检查旧表是否存在
        with engine.connect() as conn:
            result = conn.execute(text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='klines'"
            ))
            exists = result.fetchone() is not None
        
        if not exists:
            print("   ⚠️  旧表 'klines' 不存在，跳过数据迁移")
            return {}
        
        # 统计各个时间周期的数据量
        total_count = session.query(KLineDB).count()
        print(f"\n   总数据量: {total_count:,} 条")
        
        if total_count == 0:
            print("   ⚠️  旧表无数据，跳过迁移")
            return {}
        
        # 按period分组统计
        period_stats = {}
        
        result = session.execute(text(
            "SELECT period, COUNT(*) as count FROM klines GROUP BY period"
        ))
        
        print(f"\n   各时间周期数据量:")
        for row in result:
            period, count = row
            normalized_period = LEGACY_PERIOD_MAPPING.get(period)
            
            if normalized_period:
                period_stats[period] = {
                    "count": count,
                    "normalized": normalized_period
                }
                print(f"      {period:12} → {normalized_period:8} : {count:,} 条")
            else:
                print(f"      {period:12} → ⚠️  未知     : {count:,} 条 (将跳过)")
        
        return period_stats
    
    finally:
        session.close()


def migrate_data(batch_size=1000, dry_run=False):
    """迁移数据"""
    print_section("3. 迁移数据")
    
    if dry_run:
        print("   🔍 DRY RUN 模式 - 不会实际写入数据\n")
    
    session = SessionLocal()
    
    try:
        # 获取所有旧数据的period类型
        periods = session.execute(text(
            "SELECT DISTINCT period FROM klines"
        )).fetchall()
        
        total_migrated = 0
        total_skipped = 0
        
        for (period,) in periods:
            normalized_period = LEGACY_PERIOD_MAPPING.get(period)
            
            if not normalized_period:
                print(f"   ⚠️  跳过未知period: {period}")
                count = session.query(KLineDB).filter(KLineDB.period == period).count()
                total_skipped += count
                continue
            
            # 获取目标表模型
            try:
                target_model = KLineTableManager.get_model_by_period(normalized_period)
                table_name = target_model.__tablename__
            except ValueError as e:
                print(f"   ❌ {e}")
                continue
            
            # 统计需要迁移的数据量
            total_records = session.query(KLineDB).filter(
                KLineDB.period == period
            ).count()
            
            print(f"\n   迁移 {period} → {table_name}")
            print(f"      总数: {total_records:,} 条")
            
            if dry_run:
                print(f"      ✓ DRY RUN - 跳过实际迁移")
                total_migrated += total_records
                continue
            
            # 分批迁移
            migrated_count = 0
            offset = 0
            
            while offset < total_records:
                # 批量读取旧数据
                old_records = session.query(KLineDB).filter(
                    KLineDB.period == period
                ).offset(offset).limit(batch_size).all()
                
                if not old_records:
                    break
                
                # 转换为新记录
                new_records = []
                for old in old_records:
                    try:
                        # 解析trade_time（如果time_key是日期字符串）
                        trade_time = None
                        if old.time_key:
                            try:
                                trade_time = datetime.strptime(old.time_key, "%Y-%m-%d")
                            except ValueError:
                                try:
                                    trade_time = datetime.strptime(old.time_key, "%Y-%m-%d %H:%M:%S")
                                except ValueError:
                                    trade_time = datetime.utcnow()
                        else:
                            trade_time = datetime.utcnow()
                        
                        new_record = target_model(
                            code=old.code,
                            time_key=old.time_key,
                            trade_time=trade_time,
                            open_price=old.open_price,
                            close_price=old.close_price,
                            high_price=old.high_price,
                            low_price=old.low_price,
                            volume=old.volume,
                            turnover=old.turnover,
                            change_rate=old.change_rate,
                            amplitude=None,  # 旧表没有这个字段
                            created_at=old.created_at or datetime.utcnow(),
                        )
                        new_records.append(new_record)
                    
                    except Exception as e:
                        logger.error(f"转换记录失败: {e}, 记录ID: {old.id}")
                
                # 批量插入新记录
                if new_records:
                    session.bulk_save_objects(new_records)
                    session.commit()
                    migrated_count += len(new_records)
                
                offset += batch_size
                
                # 显示进度
                progress = min(100, (offset / total_records) * 100)
                print(f"      进度: {progress:5.1f}% ({migrated_count:,}/{total_records:,})", end="\r")
            
            print(f"      ✅ 完成: {migrated_count:,} 条")
            total_migrated += migrated_count
        
        print(f"\n✅ 迁移完成")
        print(f"   总迁移: {total_migrated:,} 条")
        if total_skipped > 0:
            print(f"   总跳过: {total_skipped:,} 条")
        
        return True
    
    except Exception as e:
        logger.error(f"迁移数据失败: {e}")
        print(f"\n❌ 迁移失败: {e}")
        session.rollback()
        return False
    
    finally:
        session.close()


def verify_migration():
    """验证迁移结果"""
    print_section("4. 验证迁移结果")
    
    session = SessionLocal()
    
    try:
        print("\n   新表数据统计:")
        
        total_new_records = 0
        
        for model in KLineTableManager.ALL_MODELS:
            count = session.query(model).count()
            period = KLineTableManager.get_period_by_model(model)
            table_name = model.__tablename__
            
            print(f"      {table_name:20} ({period:4}) : {count:,} 条")
            total_new_records += count
        
        print(f"\n   新表总数据量: {total_new_records:,} 条")
        
        # 对比旧表数据量
        old_count = session.query(KLineDB).count()
        print(f"   旧表总数据量: {old_count:,} 条")
        
        if total_new_records == old_count:
            print(f"\n   ✅ 数据量一致，迁移成功！")
        else:
            diff = abs(total_new_records - old_count)
            print(f"\n   ⚠️  数据量差异: {diff:,} 条")
        
        return True
    
    finally:
        session.close()


def backup_old_table():
    """备份旧表"""
    print_section("备份旧表")
    
    try:
        with engine.connect() as conn:
            # 检查备份表是否已存在
            result = conn.execute(text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='klines_backup'"
            ))
            exists = result.fetchone() is not None
            
            if exists:
                print("   ⚠️  备份表 'klines_backup' 已存在")
                response = input("   是否覆盖？(y/N): ").strip().lower()
                if response != 'y':
                    print("   跳过备份")
                    return True
                
                conn.execute(text("DROP TABLE klines_backup"))
                conn.commit()
            
            # 创建备份
            conn.execute(text(
                "CREATE TABLE klines_backup AS SELECT * FROM klines"
            ))
            conn.commit()
            
            # 验证备份
            result = conn.execute(text("SELECT COUNT(*) FROM klines_backup"))
            count = result.fetchone()[0]
            
            print(f"   ✅ 备份完成: {count:,} 条记录")
            return True
    
    except Exception as e:
        logger.error(f"备份失败: {e}")
        print(f"   ❌ 备份失败: {e}")
        return False


def main():
    """主函数"""
    print("\n" + "🔄"*40)
    print("  K线数据迁移工具")
    print("  从单表 klines 迁移到多时间周期表")
    print("🔄"*40)
    
    # 显示配置
    print(f"\n数据库: {settings.db_url}")
    
    # 询问是否执行
    print("\n⚠️  此操作将：")
    print("   1. 创建新的多时间周期表")
    print("   2. 将旧表数据迁移到新表")
    print("   3. 不会删除旧表（保留用于回滚）")
    
    response = input("\n是否继续？(y/N): ").strip().lower()
    
    if response != 'y':
        print("\n❌ 操作已取消")
        return
    
    # 询问是否DRY RUN
    dry_run_response = input("是否先进行DRY RUN测试？(Y/n): ").strip().lower()
    dry_run = dry_run_response != 'n'
    
    # 执行迁移步骤
    print("\n" + "▶️ "*40)
    print("  开始迁移...")
    print("▶️ "*40)
    
    # 1. 创建新表
    if not create_new_tables():
        print("\n❌ 迁移终止")
        return
    
    # 2. 分析旧数据
    period_stats = analyze_legacy_data()
    
    if not period_stats:
        print("\n✅ 无需迁移数据")
        return
    
    # 3. 迁移数据
    if not migrate_data(batch_size=1000, dry_run=dry_run):
        print("\n❌ 迁移终止")
        return
    
    if dry_run:
        print("\n" + "="*80)
        print("  DRY RUN 完成")
        print("="*80)
        print("\n如果结果正确，请重新运行并选择实际迁移")
        return
    
    # 4. 验证迁移
    verify_migration()
    
    # 5. 询问是否备份旧表
    print("\n" + "="*80)
    backup_response = input("\n是否备份旧表到 klines_backup？(Y/n): ").strip().lower()
    
    if backup_response != 'n':
        backup_old_table()
    
    # 完成
    print("\n" + "="*80)
    print("  ✅ 迁移完成！")
    print("="*80)
    
    print("""
📌 后续操作建议:

1. 验证新表数据
   • 运行测试查询，确保数据正确
   • 检查各个时间周期的数据

2. 更新应用代码
   • 更新数据访问层使用新表
   • 测试应用功能

3. 保留旧表一段时间
   • 建议保留1-2周用于回滚
   • 确认无问题后再删除

4. 优化数据库
   • VACUUM 命令优化数据库文件大小
   • 更新统计信息

5. 如需回滚
   • 从 klines_backup 恢复数据
   • 或使用数据库备份

🎉 数据迁移成功！
    """)


if __name__ == "__main__":
    main()

