"""
多数据源系统测试脚本
测试Finnhub、Twelve Data和MultiProvider的功能
"""
import asyncio
import sys
import os
from datetime import datetime

# 设置测试用的API Keys
os.environ["FINNHUB_API_KEY"] = os.getenv("FINNHUB_API_KEY", "demo")
os.environ["TWELVEDATA_API_KEY"] = os.getenv("TWELVEDATA_API_KEY", "demo")
os.environ["ALPHA_VANTAGE_API_KEY"] = os.getenv("ALPHA_VANTAGE_API_KEY", "AU1SKLJOOD36YINC")

# 添加项目根目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from app.core.market_data import (
    YahooFinanceProvider,
    AlphaVantageProvider,
    FinnhubProvider,
    TwelveDataProvider,
    MultiProvider
)


def print_section(title: str):
    """打印分隔线"""
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)


async def test_finnhub():
    """测试Finnhub数据源"""
    print_section("测试 1: Finnhub 数据源")
    
    api_key = os.getenv("FINNHUB_API_KEY")
    if not api_key or api_key == "demo":
        print("⚠️  请设置 FINNHUB_API_KEY 环境变量")
        print("   获取地址: https://finnhub.io/register")
        return
    
    provider = FinnhubProvider(api_key=api_key, rate_limit_delay=1.0)
    symbol = "AAPL"
    
    try:
        print(f"\n🔍 测试股票: {symbol}")
        
        # 测试日线数据
        print(f"\n📊 获取日线数据 (最近5天)...")
        data = await provider.get_stock_data(symbol, "5d", "1d")
        
        if data:
            print(f"   ✅ 成功获取 {len(data)} 条数据")
            print(f"   最新价格: ${data[-1].close:.2f}")
            print(f"   日期范围: {data[0].datetime.date()} ~ {data[-1].datetime.date()}")
        else:
            print(f"   ❌ 未获取到数据")
        
        # 测试小时线数据
        await asyncio.sleep(2)
        print(f"\n📊 获取小时线数据 (最近5天)...")
        data_hourly = await provider.get_stock_data(symbol, "5d", "1h")
        
        if data_hourly:
            print(f"   ✅ 成功获取 {len(data_hourly)} 条数据")
        else:
            print(f"   ❌ 未获取到数据")
        
        # 测试股票信息
        await asyncio.sleep(2)
        print(f"\n📋 获取股票信息...")
        info = await provider.get_stock_info(symbol)
        
        if info:
            print(f"   ✅ 公司名称: {info.name}")
            print(f"   ✅ 当前价格: ${info.current_price:.2f}")
            print(f"   ✅ 行业: {info.industry}")
        else:
            print(f"   ❌ 未获取到信息")
        
        print(f"\n✅ Finnhub 测试完成")
    
    except Exception as e:
        print(f"❌ Finnhub 测试失败: {e}")
    
    finally:
        await provider.close()


async def test_twelvedata():
    """测试Twelve Data数据源"""
    print_section("测试 2: Twelve Data 数据源")
    
    api_key = os.getenv("TWELVEDATA_API_KEY")
    if not api_key or api_key == "demo":
        print("⚠️  请设置 TWELVEDATA_API_KEY 环境变量")
        print("   获取地址: https://twelvedata.com/pricing")
        return
    
    provider = TwelveDataProvider(api_key=api_key, rate_limit_delay=8.0)
    symbol = "AAPL"
    
    try:
        print(f"\n🔍 测试股票: {symbol}")
        
        # 测试日线数据
        print(f"\n📊 获取日线数据 (最近5天)...")
        data = await provider.get_stock_data(symbol, "5d", "1d")
        
        if data:
            print(f"   ✅ 成功获取 {len(data)} 条数据")
            print(f"   最新价格: ${data[-1].close:.2f}")
            print(f"   日期范围: {data[0].datetime.date()} ~ {data[-1].datetime.date()}")
        else:
            print(f"   ❌ 未获取到数据")
        
        # 测试小时线数据
        await asyncio.sleep(10)
        print(f"\n📊 获取小时线数据 (最近5天)...")
        data_hourly = await provider.get_stock_data(symbol, "5d", "1h")
        
        if data_hourly:
            print(f"   ✅ 成功获取 {len(data_hourly)} 条数据")
        else:
            print(f"   ❌ 未获取到数据")
        
        # 测试股票信息
        await asyncio.sleep(10)
        print(f"\n📋 获取股票信息...")
        info = await provider.get_stock_info(symbol)
        
        if info:
            print(f"   ✅ 公司名称: {info.name}")
            print(f"   ✅ 当前价格: ${info.current_price:.2f}")
        else:
            print(f"   ❌ 未获取到信息")
        
        print(f"\n✅ Twelve Data 测试完成")
    
    except Exception as e:
        print(f"❌ Twelve Data 测试失败: {e}")
    
    finally:
        await provider.close()


async def test_multi_provider():
    """测试MultiProvider智能路由"""
    print_section("测试 3: MultiProvider 智能路由")
    
    # 创建所有数据源
    providers_list = []
    
    # 1. Finnhub (如果有API Key)
    finnhub_key = os.getenv("FINNHUB_API_KEY")
    if finnhub_key and finnhub_key != "demo":
        finnhub = FinnhubProvider(api_key=finnhub_key, rate_limit_delay=1.0)
        providers_list.append((finnhub, "Finnhub", 1, 40))
        print("✅ 已添加 Finnhub (优先级:1, 权重:40)")
    
    # 2. Twelve Data (如果有API Key)
    twelvedata_key = os.getenv("TWELVEDATA_API_KEY")
    if twelvedata_key and twelvedata_key != "demo":
        twelvedata = TwelveDataProvider(api_key=twelvedata_key, rate_limit_delay=8.0)
        providers_list.append((twelvedata, "TwelveData", 1, 30))
        print("✅ 已添加 Twelve Data (优先级:1, 权重:30)")
    
    # 3. Alpha Vantage
    av_key = os.getenv("ALPHA_VANTAGE_API_KEY", "AU1SKLJOOD36YINC")
    alphavantage = AlphaVantageProvider(api_key=av_key, rate_limit_delay=12.0)
    providers_list.append((alphavantage, "AlphaVantage", 2, 15))
    print("✅ 已添加 Alpha Vantage (优先级:2, 权重:15)")
    
    # 4. Yahoo Finance (兜底)
    yahoo = YahooFinanceProvider(rate_limit_delay=0.5)
    providers_list.append((yahoo, "Yahoo", 3, 15))
    print("✅ 已添加 Yahoo Finance (优先级:3, 权重:15)")
    
    if len(providers_list) < 2:
        print("\n⚠️  至少需要2个数据源，请设置API Keys")
        return
    
    # 创建MultiProvider
    multi = MultiProvider(providers_list)
    symbol = "AAPL"
    
    try:
        print(f"\n🔍 测试股票: {symbol}")
        print(f"📊 可用数据源: {len(providers_list)} 个")
        
        # 测试多次请求，观察智能路由
        print(f"\n🔄 执行5次请求，观察智能路由...")
        
        for i in range(5):
            print(f"\n--- 第 {i+1} 次请求 ---")
            
            data = await multi.get_stock_data(symbol, "5d", "1d")
            
            if data:
                print(f"✅ 成功获取 {len(data)} 条数据")
                print(f"   最新价格: ${data[-1].close:.2f}")
            else:
                print(f"❌ 获取失败")
            
            # 短暂延迟
            await asyncio.sleep(1)
        
        # 显示统计信息
        print_section("统计信息")
        multi.print_statistics()
        
        print(f"\n✅ MultiProvider 测试完成")
    
    except Exception as e:
        print(f"❌ MultiProvider 测试失败: {e}")


async def test_performance_comparison():
    """性能对比测试"""
    print_section("测试 4: 性能对比")
    
    symbol = "AAPL"
    
    # 测试各个数据源
    results = {}
    
    # 1. Yahoo Finance
    try:
        print(f"\n📊 测试 Yahoo Finance...")
        yahoo = YahooFinanceProvider(rate_limit_delay=0.5)
        start = datetime.now()
        data = await yahoo.get_stock_data(symbol, "5d", "1d")
        elapsed = (datetime.now() - start).total_seconds()
        
        results["Yahoo"] = {
            "success": len(data) > 0,
            "data_points": len(data),
            "time": elapsed
        }
        print(f"   ✅ 耗时: {elapsed:.2f}s, 数据点: {len(data)}")
    except Exception as e:
        results["Yahoo"] = {"success": False, "error": str(e)}
        print(f"   ❌ 失败: {e}")
    
    await asyncio.sleep(2)
    
    # 2. Alpha Vantage
    try:
        print(f"\n📊 测试 Alpha Vantage...")
        av = AlphaVantageProvider(
            api_key=os.getenv("ALPHA_VANTAGE_API_KEY", "AU1SKLJOOD36YINC"),
            rate_limit_delay=0
        )
        start = datetime.now()
        data = await av.get_stock_data(symbol, "5d", "1d")
        elapsed = (datetime.now() - start).total_seconds()
        
        results["AlphaVantage"] = {
            "success": len(data) > 0,
            "data_points": len(data),
            "time": elapsed
        }
        print(f"   ✅ 耗时: {elapsed:.2f}s, 数据点: {len(data)}")
    except Exception as e:
        results["AlphaVantage"] = {"success": False, "error": str(e)}
        print(f"   ❌ 失败: {e}")
    
    await asyncio.sleep(2)
    
    # 3. Finnhub (如果有API Key)
    finnhub_key = os.getenv("FINNHUB_API_KEY")
    if finnhub_key and finnhub_key != "demo":
        try:
            print(f"\n📊 测试 Finnhub...")
            finnhub = FinnhubProvider(api_key=finnhub_key, rate_limit_delay=0)
            start = datetime.now()
            data = await finnhub.get_stock_data(symbol, "5d", "1d")
            elapsed = (datetime.now() - start).total_seconds()
            
            results["Finnhub"] = {
                "success": len(data) > 0,
                "data_points": len(data),
                "time": elapsed
            }
            print(f"   ✅ 耗时: {elapsed:.2f}s, 数据点: {len(data)}")
            await finnhub.close()
        except Exception as e:
            results["Finnhub"] = {"success": False, "error": str(e)}
            print(f"   ❌ 失败: {e}")
    
    # 汇总结果
    print(f"\n📈 性能对比结果:")
    print(f"{'数据源':<15} {'状态':<8} {'数据点':<8} {'耗时(秒)':<10}")
    print("-"*50)
    
    for source, result in results.items():
        if result["success"]:
            print(f"{source:<15} {'✅ 成功':<8} {result['data_points']:<8} {result['time']:<10.2f}")
        else:
            print(f"{source:<15} {'❌ 失败':<8} {'-':<8} {'-':<10}")


async def main():
    """主测试函数"""
    print("\n" + "🧪"*40)
    print("  多数据源系统测试")
    print("  测试 Finnhub + Twelve Data + MultiProvider")
    print("🧪"*40)
    
    start_time = datetime.now()
    
    # 检查API Keys
    print_section("API Keys 检查")
    
    keys = {
        "FINNHUB_API_KEY": os.getenv("FINNHUB_API_KEY"),
        "TWELVEDATA_API_KEY": os.getenv("TWELVEDATA_API_KEY"),
        "ALPHA_VANTAGE_API_KEY": os.getenv("ALPHA_VANTAGE_API_KEY"),
    }
    
    for key_name, key_value in keys.items():
        if key_value and key_value != "demo":
            print(f"✅ {key_name}: 已设置")
        else:
            print(f"⚠️  {key_name}: 未设置 (部分功能将不可用)")
    
    # 运行测试
    await test_finnhub()
    await asyncio.sleep(3)
    
    await test_twelvedata()
    await asyncio.sleep(3)
    
    await test_multi_provider()
    await asyncio.sleep(3)
    
    await test_performance_comparison()
    
    # 总结
    duration = (datetime.now() - start_time).total_seconds()
    
    print_section("测试总结")
    
    print(f"""
✅ 所有测试完成！

⏱️  总耗时: {duration/60:.1f} 分钟

💡 下一步:
   1. 在 .env 文件中配置 API Keys
   2. 设置 MARKET_DATA_PROVIDER=multi
   3. 重启后端服务
   4. 享受多数据源智能路由！

📚 获取 API Keys:
   - Finnhub: https://finnhub.io/register
   - Twelve Data: https://twelvedata.com/pricing
   - Alpha Vantage: https://www.alphavantage.co/support/#api-key

🎉 推荐配置 (4数据源):
   MARKET_DATA_PROVIDER=multi
   FINNHUB_API_KEY=your_key
   TWELVEDATA_API_KEY=your_key
   ALPHA_VANTAGE_API_KEY=your_key
   # Yahoo Finance 无需配置
    """)


if __name__ == "__main__":
    asyncio.run(main())

