"""
直接创建多时间周期K线表
项目未上线，不需要兼容旧数据
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from sqlalchemy import create_engine, text, inspect
from loguru import logger

from app.config import settings
from app.models import (
    Base,
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


def print_section(title: str):
    """打印分隔线"""
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)


def check_and_drop_old_table(engine):
    """检查并删除旧的klines表"""
    print_section("检查旧表")
    
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    old_tables = ['klines', 'klines_backup']
    dropped = []
    
    for table in old_tables:
        if table in existing_tables:
            print(f"   发现旧表: {table}")
            
            with engine.connect() as conn:
                # 先检查数据量
                try:
                    result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = result.fetchone()[0]
                    print(f"      数据量: {count:,} 条")
                    
                    if count > 0:
                        print(f"      ⚠️  表中有数据！")
                except:
                    print(f"      无法读取数据")
                
                # 删除表
                print(f"      正在删除表 {table}...")
                conn.execute(text(f"DROP TABLE IF EXISTS {table}"))
                conn.commit()
                print(f"      ✅ 已删除")
                dropped.append(table)
    
    if not dropped:
        print("   ✅ 没有旧表需要删除")
    
    return dropped


def create_new_tables(engine):
    """创建所有新的多时间周期表"""
    print_section("创建新的多时间周期表")
    
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    created = []
    skipped = []
    
    for model in KLineTableManager.ALL_MODELS:
        table_name = model.__tablename__
        period = KLineTableManager.get_period_by_model(model)
        
        if table_name in existing_tables:
            print(f"   ⚠️  表 {table_name:20} ({period:4}) 已存在，跳过")
            skipped.append(table_name)
        else:
            try:
                model.__table__.create(engine)
                print(f"   ✅ 创建 {table_name:20} ({period:4})")
                created.append(table_name)
            except Exception as e:
                print(f"   ❌ 创建 {table_name} 失败: {e}")
    
    return created, skipped


def verify_tables(engine):
    """验证表创建结果"""
    print_section("验证表结构")
    
    inspector = inspect(engine)
    
    print("\n   已创建的K线表:\n")
    print(f"   {'表名':<25} {'周期':<8} {'索引数':<10} {'列数':<10}")
    print("   " + "-"*60)
    
    total_tables = 0
    total_indexes = 0
    
    for model in KLineTableManager.ALL_MODELS:
        table_name = model.__tablename__
        period = KLineTableManager.get_period_by_model(model)
        
        if inspector.has_table(table_name):
            columns = inspector.get_columns(table_name)
            indexes = inspector.get_indexes(table_name)
            
            print(f"   {table_name:<25} {period:<8} {len(indexes):<10} {len(columns):<10}")
            
            total_tables += 1
            total_indexes += len(indexes)
    
    print("\n   " + "="*60)
    print(f"   总计: {total_tables} 个表, {total_indexes} 个索引")
    
    # 显示一个表的详细结构作为示例
    print(f"\n   示例表结构 (klines_daily):")
    
    if inspector.has_table('klines_daily'):
        columns = inspector.get_columns('klines_daily')
        indexes = inspector.get_indexes('klines_daily')
        
        print(f"\n      字段:")
        for col in columns:
            nullable = "NULL" if col['nullable'] else "NOT NULL"
            col_type = str(col['type'])
            print(f"         {col['name']:<20} {col_type:<20} {nullable}")
        
        print(f"\n      索引:")
        for idx in indexes:
            cols = ', '.join(idx['column_names'])
            unique = "UNIQUE" if idx.get('unique') else ""
            print(f"         {idx['name']:<30} ({cols}) {unique}")


def show_recommendations():
    """显示使用建议"""
    print_section("使用建议")
    
    print("""
✅ 表创建完成！

📊 新的表结构特点:

1. 清晰的分类
   • 分钟级: 1min, 3min, 5min, 15min, 30min
   • 小时级: 1hour, 4hour
   • 日线级: daily, weekly, monthly

2. 优化的索引
   • idx_code: 快速查找股票
   • idx_trade_time: 时间范围查询
   • idx_code_trade_time: 复合索引（最常用）
   • idx_code_time_key: time_key查询

3. 统一的字段
   • code: 股票代码
   • time_key: 时间标识 (字符串)
   • trade_time: 交易时间 (datetime)
   • OHLC: 开高低收价格
   • volume/turnover: 成交量/额
   • change_rate: 涨跌幅
   • amplitude: 振幅
   • created_at: 创建时间

💻 使用示例:

from app.core.kline_manager import KLineManager

# 创建管理器
manager = KLineManager(db_session)

# 查询日线数据
daily_data = manager.query_klines("AAPL", "1d", limit=100)

# 查询5分钟数据
min5_data = manager.query_klines("AAPL", "5m", limit=200)

# 插入数据
kline_data = {
    "time_key": "2024-01-01",
    "trade_time": datetime(2024, 1, 1),
    "open_price": 150.0,
    "close_price": 151.0,
    "high_price": 152.0,
    "low_price": 149.0,
    "volume": 1000000,
    "turnover": 150500000.0,
    "change_rate": 0.67,
    "amplitude": 2.0,
}
manager.insert_kline("AAPL", "1d", kline_data)

📚 相关文档:
   docs/05-architecture/MULTI_KLINE_TABLES.md

🧪 测试脚本:
   PYTHONPATH=./zhixing_backend python zhixing_backend/scripts/test_multi_kline_tables.py
    """)


def main():
    """主函数"""
    print("\n" + "🚀"*40)
    print("  直接创建多时间周期K线表")
    print("  项目未上线，不保留旧数据")
    print("🚀"*40)
    
    print(f"\n数据库: {settings.database_url}")
    
    # 创建数据库连接
    try:
        engine = create_engine(
            settings.database_url,
            pool_pre_ping=True,
            echo=False
        )
        
        # 测试连接
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        
        print("✅ 数据库连接成功")
    
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        print("\n请检查:")
        print("  1. MySQL服务是否启动")
        print("  2. 数据库配置是否正确 (app/config.py)")
        print("  3. 数据库用户权限是否足够")
        return
    
    # 询问是否继续
    print("\n⚠️  此操作将:")
    print("   1. 删除旧的 klines 表（如果存在）")
    print("   2. 创建10个新的时间周期表")
    print("   3. 不保留任何旧数据")
    
    response = input("\n是否继续？(y/N): ").strip().lower()
    
    if response != 'y':
        print("\n❌ 操作已取消")
        return
    
    print("\n" + "▶️ "*40)
    print("  开始执行...")
    print("▶️ "*40)
    
    # 1. 删除旧表
    dropped = check_and_drop_old_table(engine)
    
    # 2. 创建新表
    created, skipped = create_new_tables(engine)
    
    # 3. 验证表结构
    verify_tables(engine)
    
    # 4. 显示建议
    show_recommendations()
    
    # 总结
    print_section("操作总结")
    
    print(f"""
✅ 操作完成！

📊 执行结果:
   • 删除旧表: {len(dropped)} 个
   • 创建新表: {len(created)} 个
   • 跳过已存在: {len(skipped)} 个

🎉 数据库已准备就绪，可以开始使用！
    """)
    
    if dropped:
        print(f"⚠️  已删除的表: {', '.join(dropped)}")


if __name__ == "__main__":
    main()

