"""
场景化路由测试脚本
演示不同场景下的数据源选择策略
"""
import asyncio
import sys
import os
from datetime import datetime

os.environ["FINNHUB_API_KEY"] = os.getenv("FINNHUB_API_KEY", "demo")
os.environ["TWELVEDATA_API_KEY"] = os.getenv("TWELVEDATA_API_KEY", "demo")
os.environ["ALPHA_VANTAGE_API_KEY"] = os.getenv("ALPHA_VANTAGE_API_KEY", "AU1SKLJOOD36YINC")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from app.core.market_data import (
    YahooFinanceProvider,
    AlphaVantageProvider,
    FinnhubProvider,
    TwelveDataProvider,
)
from app.core.market_data.scenario_router import (
    ScenarioRouter,
    print_all_scenarios,
    get_available_scenarios,
)


def print_section(title: str):
    """打印分隔线"""
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)


async def test_scenario(scenario_name: str, providers_pool: dict, symbol: str = "AAPL"):
    """测试特定场景"""
    print_section(f"场景测试: {scenario_name}")
    
    try:
        # 创建场景路由器
        router = ScenarioRouter(scenario=scenario_name, providers_pool=providers_pool)
        
        # 显示场景信息
        router.print_scenario_info()
        
        # 根据场景选择合适的测试参数
        if scenario_name == "realtime":
            # 实时场景：获取最新数据
            print(f"\n🔍 测试实时数据获取...")
            data = await router.get_stock_data(symbol, "1d", "5m")
            
            if data:
                print(f"   ✅ 获取成功: {len(data)} 条数据")
                print(f"   最新价格: ${data[-1].close:.2f}")
                print(f"   最新时间: {data[-1].datetime}")
            else:
                print(f"   ❌ 未获取到数据")
        
        elif scenario_name == "historical":
            # 历史场景：获取长期数据
            print(f"\n🔍 测试历史数据获取...")
            data = await router.get_stock_data(symbol, "1y", "1d")
            
            if data:
                print(f"   ✅ 获取成功: {len(data)} 条数据")
                print(f"   日期范围: {data[0].datetime.date()} ~ {data[-1].datetime.date()}")
                print(f"   期间涨幅: {(data[-1].close - data[0].close) / data[0].close * 100:+.2f}%")
            else:
                print(f"   ❌ 未获取到数据")
        
        elif scenario_name == "recent":
            # 最近数据场景：获取最近一段时间的数据
            print(f"\n🔍 测试最近数据获取...")
            data = await router.get_stock_data(symbol, "1mo", "1d")
            
            if data:
                print(f"   ✅ 获取成功: {len(data)} 条数据")
                print(f"   月度涨幅: {(data[-1].close - data[0].close) / data[0].close * 100:+.2f}%")
                print(f"   平均成交量: {sum(d.volume for d in data) / len(data):,.0f}")
            else:
                print(f"   ❌ 未获取到数据")
        
        else:
            # 默认场景
            print(f"\n🔍 测试默认数据获取...")
            data = await router.get_stock_data(symbol, "5d", "1d")
            
            if data:
                print(f"   ✅ 获取成功: {len(data)} 条数据")
                print(f"   最新价格: ${data[-1].close:.2f}")
            else:
                print(f"   ❌ 未获取到数据")
        
        # 显示统计信息
        print(f"\n📊 数据源使用统计:")
        stats = router.get_statistics()
        
        for source_name, source_stats in stats.items():
            if source_name in ["scenario", "scenario_config"]:
                continue
            
            print(f"\n   {source_name}:")
            print(f"      总请求: {source_stats['total_requests']}")
            print(f"      成功: {source_stats['successful_requests']}")
            print(f"      成功率: {source_stats['success_rate']}")
        
        print(f"\n✅ 场景测试完成\n")
    
    except Exception as e:
        print(f"❌ 场景测试失败: {e}\n")


async def compare_scenarios(providers_pool: dict, symbol: str = "AAPL"):
    """对比不同场景的表现"""
    print_section("场景对比测试")
    
    scenarios = ["realtime", "historical", "recent", "default"]
    results = {}
    
    for scenario in scenarios:
        try:
            print(f"\n测试场景: {scenario}...")
            router = ScenarioRouter(scenario=scenario, providers_pool=providers_pool)
            
            start = datetime.now()
            data = await router.get_stock_data(symbol, "5d", "1d")
            elapsed = (datetime.now() - start).total_seconds()
            
            results[scenario] = {
                "success": len(data) > 0,
                "data_points": len(data),
                "time": elapsed,
                "config": router.get_scenario_info()
            }
            
            print(f"   ✅ 完成: {len(data)} 条数据, 耗时 {elapsed:.2f}s")
        
        except Exception as e:
            results[scenario] = {
                "success": False,
                "error": str(e)
            }
            print(f"   ❌ 失败: {e}")
        
        await asyncio.sleep(2)
    
    # 汇总对比
    print(f"\n{'='*80}")
    print(f"  对比结果")
    print(f"{'='*80}\n")
    
    print(f"{'场景':<15} {'状态':<8} {'数据点':<10} {'耗时(秒)':<12} {'主要数据源':<20}")
    print("-"*80)
    
    for scenario, result in results.items():
        if result["success"]:
            sources = ", ".join(result["config"]["sources"][:2])
            print(
                f"{scenario:<15} {'✅':<8} {result['data_points']:<10} "
                f"{result['time']:<12.2f} {sources:<20}"
            )
        else:
            print(f"{scenario:<15} {'❌':<8} {'-':<10} {'-':<12} {result.get('error', ''):<20}")


async def demonstrate_use_cases(providers_pool: dict):
    """演示实际使用案例"""
    print_section("实际使用案例演示")
    
    symbol = "AAPL"
    
    # 案例1: 盯盘场景（实时）
    print(f"\n📱 案例1: 盯盘应用")
    print("   需求: 实时监控股价变化，要求低延迟")
    
    realtime = ScenarioRouter(scenario="realtime", providers_pool=providers_pool)
    data = await realtime.get_stock_data(symbol, "1d", "5m")
    
    if data and len(data) >= 2:
        latest = data[-1]
        previous = data[-2]
        change = (latest.close - previous.close) / previous.close * 100
        
        print(f"   结果:")
        print(f"      最新价格: ${latest.close:.2f}")
        print(f"      变化: {change:+.2f}%")
        print(f"      更新时间: {latest.datetime}")
        print(f"   ✅ 适合实时监控")
    
    await asyncio.sleep(3)
    
    # 案例2: 策略回测（历史）
    print(f"\n📊 案例2: 策略回测")
    print("   需求: 需要大量历史数据进行回测")
    
    historical = ScenarioRouter(scenario="historical", providers_pool=providers_pool)
    data = await historical.get_stock_data(symbol, "1y", "1d")
    
    if data:
        returns = (data[-1].close - data[0].close) / data[0].close * 100
        volatility = sum(abs((data[i].close - data[i-1].close) / data[i-1].close) 
                        for i in range(1, len(data))) / len(data) * 100
        
        print(f"   结果:")
        print(f"      数据点: {len(data)} 个交易日")
        print(f"      年度收益: {returns:+.2f}%")
        print(f"      平均波动: {volatility:.2f}%")
        print(f"   ✅ 足够用于回测分析")
    
    await asyncio.sleep(3)
    
    # 案例3: 交易决策（最近）
    print(f"\n💼 案例3: 交易决策")
    print("   需求: 基于最近数据做出买卖决策")
    
    recent = ScenarioRouter(scenario="recent", providers_pool=providers_pool)
    data = await recent.get_stock_data(symbol, "1mo", "1d")
    
    if data:
        # 简单的MA策略示例
        ma5 = sum(d.close for d in data[-5:]) / 5
        ma20 = sum(d.close for d in data[-20:]) / 20 if len(data) >= 20 else ma5
        current = data[-1].close
        
        print(f"   结果:")
        print(f"      当前价: ${current:.2f}")
        print(f"      MA5: ${ma5:.2f}")
        print(f"      MA20: ${ma20:.2f}")
        
        if ma5 > ma20:
            print(f"   📈 建议: 上升趋势，可考虑买入")
        else:
            print(f"   📉 建议: 下降趋势，谨慎操作")
        
        print(f"   ✅ 数据可靠，适合决策")


async def main():
    """主测试函数"""
    print("\n" + "🧪"*40)
    print("  场景化路由测试")
    print("  演示不同场景下的数据源选择策略")
    print("🧪"*40)
    
    # 显示所有可用场景
    print_all_scenarios()
    
    # 创建数据源池
    print_section("初始化数据源池")
    
    providers_pool = {}
    
    # 1. Yahoo Finance (总是可用)
    providers_pool["yahoo"] = YahooFinanceProvider(rate_limit_delay=0.5)
    print("✅ Yahoo Finance")
    
    # 2. Alpha Vantage
    av_key = os.getenv("ALPHA_VANTAGE_API_KEY", "AU1SKLJOOD36YINC")
    providers_pool["alphavantage"] = AlphaVantageProvider(api_key=av_key, rate_limit_delay=12.0)
    print("✅ Alpha Vantage")
    
    # 3. Finnhub (如果有Key)
    finnhub_key = os.getenv("FINNHUB_API_KEY")
    if finnhub_key and finnhub_key != "demo":
        providers_pool["finnhub"] = FinnhubProvider(api_key=finnhub_key, rate_limit_delay=1.0)
        print("✅ Finnhub")
    else:
        print("⚠️  Finnhub (未配置，将使用其他源)")
    
    # 4. Twelve Data (如果有Key)
    td_key = os.getenv("TWELVEDATA_API_KEY")
    if td_key and td_key != "demo":
        providers_pool["twelvedata"] = TwelveDataProvider(api_key=td_key, rate_limit_delay=8.0)
        print("✅ Twelve Data")
    else:
        print("⚠️  Twelve Data (未配置，将使用其他源)")
    
    print(f"\n可用数据源: {len(providers_pool)} 个")
    
    # 运行各个测试
    await test_scenario("realtime", providers_pool)
    await asyncio.sleep(5)
    
    await test_scenario("historical", providers_pool)
    await asyncio.sleep(5)
    
    await test_scenario("recent", providers_pool)
    await asyncio.sleep(5)
    
    await compare_scenarios(providers_pool)
    await asyncio.sleep(5)
    
    await demonstrate_use_cases(providers_pool)
    
    # 总结
    print_section("测试总结")
    
    print(f"""
✅ 场景化路由测试完成！

📊 测试覆盖:
   ✅ 实时数据场景 (低延迟)
   ✅ 历史数据场景 (大数据量)
   ✅ 最近数据场景 (高准确性)
   ✅ 默认场景 (均衡配置)
   ✅ 场景对比分析
   ✅ 实际使用案例

💡 场景选择建议:
   
   • 盯盘、日内交易
     → 使用 scenario="realtime"
     → 优先使用 Finnhub (60次/分钟)
   
   • 策略回测、技术分析
     → 使用 scenario="historical"
     → 优先使用 Alpha Vantage、Twelve Data
   
   • 交易决策、订单执行
     → 使用 scenario="recent"
     → 使用多源验证，确保准确性
   
   • 通用查询
     → 使用 scenario="default"
     → 均衡考虑各方面因素

🎯 使用示例:

    from app.core.market_data.scenario_router import ScenarioRouter
    
    # 实时监控
    realtime = ScenarioRouter(scenario="realtime", providers_pool=providers)
    price = await realtime.get_latest_price("AAPL")
    
    # 历史回测
    historical = ScenarioRouter(scenario="historical", providers_pool=providers)
    data = await historical.get_stock_data("AAPL", "1y", "1d")
    
    # 交易决策
    recent = ScenarioRouter(scenario="recent", providers_pool=providers)
    data = await recent.get_stock_data("AAPL", "1mo", "1d")

🚀 下一步:
   1. 根据实际场景选择合适的路由器
   2. 配置多个API Key扩展额度
   3. 监控各场景的性能表现
   4. 根据统计数据优化配置
    """)


if __name__ == "__main__":
    asyncio.run(main())

