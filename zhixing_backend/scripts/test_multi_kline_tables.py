"""
测试多时间周期K线表系统
"""
import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models import Base, KLineTableManager
from app.core.kline_manager import KLineManager


# 创建数据库连接
engine = create_engine(settings.db_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine)


def print_section(title: str):
    """打印分隔线"""
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)


def test_table_manager():
    """测试表管理器"""
    print_section("1. 测试表管理器")
    
    print("\n支持的时间周期:")
    periods = KLineTableManager.get_supported_periods()
    
    # 分组显示
    minute_periods = [p for p in periods if 'm' in p or 'min' in p]
    hour_periods = [p for p in periods if 'h' in p or 'hour' in p]
    day_periods = [p for p in periods if 'd' in p or 'day' in p or 'w' in p or 'week' in p or 'M' in p or 'month' in p]
    
    print(f"\n   分钟级别: {', '.join(sorted(set(minute_periods)))}")
    print(f"   小时级别: {', '.join(sorted(set(hour_periods)))}")
    print(f"   日线及以上: {', '.join(sorted(set(day_periods)))}")
    
    print(f"\n   总共支持: {len(set(periods))} 个时间周期")
    
    # 测试period规范化
    print("\n时间周期规范化测试:")
    test_periods = ["1min", "5m", "1hour", "1day", "1week"]
    
    for period in test_periods:
        normalized = KLineTableManager.normalize_period(period)
        model = KLineTableManager.get_model_by_period(period)
        table_name = model.__tablename__
        
        print(f"   {period:10} → {normalized:6} → {table_name}")


def test_insert_data():
    """测试插入数据"""
    print_section("2. 测试插入数据")
    
    session = SessionLocal()
    manager = KLineManager(session)
    
    try:
        # 测试插入不同时间周期的数据
        test_code = "TEST_AAPL"
        
        # 测试数据
        test_periods = ["1m", "5m", "15m", "1h", "1d"]
        
        for period in test_periods:
            # 生成测试数据
            now = datetime.now()
            kline_data = {
                "time_key": now.strftime("%Y-%m-%d %H:%M:%S"),
                "trade_time": now,
                "open_price": 150.0,
                "close_price": 151.0,
                "high_price": 152.0,
                "low_price": 149.0,
                "volume": 1000000,
                "turnover": 150500000.0,
                "change_rate": 0.67,
                "amplitude": 2.0,
            }
            
            # 插入数据
            success = manager.insert_kline(test_code, period, kline_data)
            
            if success:
                table_name = KLineTableManager.get_table_name(period)
                print(f"   ✅ {period:6} → {table_name:20} 插入成功")
            else:
                print(f"   ❌ {period:6} 插入失败")
        
        # 批量插入测试（日线）
        print(f"\n批量插入测试 (daily):")
        
        daily_data = []
        base_date = datetime.now() - timedelta(days=30)
        
        for i in range(30):
            trade_date = base_date + timedelta(days=i)
            daily_data.append({
                "time_key": trade_date.strftime("%Y-%m-%d"),
                "trade_time": trade_date,
                "open_price": 150.0 + i * 0.5,
                "close_price": 151.0 + i * 0.5,
                "high_price": 152.0 + i * 0.5,
                "low_price": 149.0 + i * 0.5,
                "volume": 1000000 + i * 10000,
                "turnover": 150000000.0 + i * 1000000,
                "change_rate": 0.67,
                "amplitude": 2.0,
            })
        
        count = manager.bulk_insert_klines(test_code, "1d", daily_data, update_if_exists=True)
        print(f"   ✅ 批量插入: {count} 条记录")
        
    finally:
        session.close()


def test_query_data():
    """测试查询数据"""
    print_section("3. 测试查询数据")
    
    session = SessionLocal()
    manager = KLineManager(session)
    
    try:
        test_code = "TEST_AAPL"
        
        # 查询不同时间周期的数据
        test_periods = ["1m", "5m", "15m", "1h", "1d"]
        
        for period in test_periods:
            # 查询最新数据
            latest = manager.get_latest_kline(test_code, period)
            
            if latest:
                print(f"\n   {period} 最新数据:")
                print(f"      时间: {latest.trade_time}")
                print(f"      开盘: {latest.open_price}")
                print(f"      收盘: {latest.close_price}")
                print(f"      成交量: {latest.volume:,}")
            else:
                print(f"\n   {period}: 无数据")
        
        # 查询日线历史数据
        print(f"\n查询最近30天日线数据:")
        
        end_time = datetime.now()
        start_time = end_time - timedelta(days=30)
        
        daily_data = manager.query_klines(
            test_code,
            "1d",
            start_time=start_time,
            end_time=end_time,
            order_by_desc=False
        )
        
        if daily_data:
            print(f"      找到 {len(daily_data)} 条记录")
            print(f"      日期范围: {daily_data[0].trade_time.date()} ~ {daily_data[-1].trade_time.date()}")
            print(f"      价格范围: {min(d.low_price for d in daily_data):.2f} ~ {max(d.high_price for d in daily_data):.2f}")
        else:
            print(f"      无数据")
        
    finally:
        session.close()


def test_statistics():
    """测试统计功能"""
    print_section("4. 测试统计功能")
    
    session = SessionLocal()
    manager = KLineManager(session)
    
    try:
        # 获取所有时间周期的统计
        print("\n各时间周期数据统计:\n")
        print(f"   {'周期':<8} {'表名':<20} {'记录数':<12} {'股票数':<10} {'最早时间':<20} {'最新时间':<20}")
        print("   " + "-"*100)
        
        for period in ["1m", "5m", "15m", "1h", "1d", "1w"]:
            try:
                stats = manager.get_statistics(period)
                
                earliest = stats['earliest_time'].strftime("%Y-%m-%d %H:%M") if stats['earliest_time'] else "N/A"
                latest = stats['latest_time'].strftime("%Y-%m-%d %H:%M") if stats['latest_time'] else "N/A"
                
                print(
                    f"   {period:<8} {stats['table_name']:<20} "
                    f"{stats['total_records']:<12,} {stats['stock_count']:<10} "
                    f"{earliest:<20} {latest:<20}"
                )
            except Exception as e:
                print(f"   {period:<8} 获取统计失败: {e}")
        
        # 获取所有有数据的股票
        print(f"\n日线数据覆盖的股票:")
        codes = manager.get_all_codes_with_data("1d")
        
        if codes:
            print(f"   共 {len(codes)} 只股票")
            if len(codes) <= 10:
                for code in codes:
                    count = manager.count_klines(code, "1d")
                    print(f"      {code}: {count} 条记录")
        else:
            print("   无数据")
        
    finally:
        session.close()


def test_cleanup():
    """清理测试数据"""
    print_section("5. 清理测试数据")
    
    session = SessionLocal()
    manager = KLineManager(session)
    
    try:
        test_code = "TEST_AAPL"
        
        response = input("\n是否删除测试数据？(y/N): ").strip().lower()
        
        if response == 'y':
            total_deleted = 0
            
            for period in ["1m", "5m", "15m", "1h", "1d"]:
                count = manager.delete_klines(test_code, period)
                total_deleted += count
                
                if count > 0:
                    print(f"   ✅ {period}: 删除 {count} 条记录")
            
            print(f"\n   总共删除: {total_deleted} 条记录")
        else:
            print("   跳过清理")
        
    finally:
        session.close()


def main():
    """主函数"""
    print("\n" + "🧪"*40)
    print("  多时间周期K线表系统测试")
    print("🧪"*40)
    
    print(f"\n数据库: {settings.db_url}")
    
    # 执行测试
    test_table_manager()
    
    test_insert_data()
    
    test_query_data()
    
    test_statistics()
    
    test_cleanup()
    
    # 总结
    print_section("测试总结")
    
    print("""
✅ 测试完成！

📊 新的多时间周期表系统特性:

1. 清晰的表结构
   • 每个时间周期独立的表
   • 表名直观易懂 (klines_1min, klines_5min, klines_daily...)
   • 统一的字段结构

2. 高效的查询
   • 针对性的索引 (code + trade_time)
   • 每个表数据量更小
   • 查询速度更快

3. 便捷的管理
   • KLineManager 统一接口
   • 自动路由到对应表
   • 支持批量操作

4. 灵活的扩展
   • 支持10种时间周期
   • 可轻松添加新周期
   • 规范化的period命名

💡 使用示例:

from app.core.kline_manager import KLineManager

# 创建管理器
manager = KLineManager(db_session)

# 查询数据
daily_data = manager.query_klines("AAPL", "1d", limit=100)

# 插入数据
manager.insert_kline("AAPL", "1d", kline_data)

# 批量插入
manager.bulk_insert_klines("AAPL", "1d", klines_data)

# 获取统计
stats = manager.get_statistics("1d")

🎯 下一步:
1. 运行迁移脚本迁移旧数据
2. 更新应用代码使用新接口
3. 验证功能正常
4. 清理旧表
    """)


if __name__ == "__main__":
    main()

