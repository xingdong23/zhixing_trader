"""
测试多数据源集成
验证雅虎财经、Alpha Vantage 和混合模式的功能
"""
import asyncio
import sys
import os
from datetime import datetime

# 添加项目根目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from app.core.market_data import (
    YahooFinanceProvider,
    AlphaVantageProvider,
    HybridProvider
)
from loguru import logger


# 测试股票列表
TEST_SYMBOLS = ["AAPL", "TSLA", "MSFT", "GOOGL", "AMZN"]


async def test_yahoo_provider():
    """测试雅虎财经提供者"""
    print("\n" + "="*60)
    print("📊 测试雅虎财经数据源")
    print("="*60)
    
    provider = YahooFinanceProvider(rate_limit_delay=0.1)
    
    results = {
        "success": 0,
        "failure": 0,
        "total_data_points": 0
    }
    
    for symbol in TEST_SYMBOLS:
        try:
            print(f"\n🔍 获取 {symbol} 数据...")
            start_time = datetime.now()
            
            data = await provider.get_stock_data(symbol, "1mo", "1d")
            
            duration = (datetime.now() - start_time).total_seconds()
            
            if data:
                print(f"  ✅ 成功: {len(data)} 条数据, 耗时 {duration:.2f}s")
                results["success"] += 1
                results["total_data_points"] += len(data)
            else:
                print(f"  ❌ 失败: 未获取到数据")
                results["failure"] += 1
        
        except Exception as e:
            print(f"  ❌ 异常: {e}")
            results["failure"] += 1
    
    print("\n" + "-"*60)
    print(f"📈 雅虎财经测试结果:")
    print(f"   成功: {results['success']}/{len(TEST_SYMBOLS)}")
    print(f"   失败: {results['failure']}/{len(TEST_SYMBOLS)}")
    print(f"   成功率: {results['success']/len(TEST_SYMBOLS)*100:.1f}%")
    print(f"   总数据点: {results['total_data_points']}")
    print("-"*60)
    
    return results


async def test_alphavantage_provider():
    """测试 Alpha Vantage 提供者"""
    print("\n" + "="*60)
    print("📊 测试 Alpha Vantage 数据源")
    print("="*60)
    
    # 从环境变量获取 API Key
    api_key = os.getenv("ALPHA_VANTAGE_API_KEY", "demo")
    
    if api_key == "demo":
        print("⚠️  警告: 使用 demo API Key，可能会有限额")
    
    provider = AlphaVantageProvider(api_key=api_key, rate_limit_delay=0)  # 测试时不延迟
    
    results = {
        "success": 0,
        "failure": 0,
        "total_data_points": 0
    }
    
    # 只测试前3个股票（避免超出免费额度）
    test_symbols = TEST_SYMBOLS[:3]
    print(f"📌 测试股票: {test_symbols} (避免超出API限额)")
    
    for symbol in test_symbols:
        try:
            print(f"\n🔍 获取 {symbol} 数据...")
            start_time = datetime.now()
            
            data = await provider.get_stock_data(symbol, "1mo", "1d")
            
            duration = (datetime.now() - start_time).total_seconds()
            
            if data:
                print(f"  ✅ 成功: {len(data)} 条数据, 耗时 {duration:.2f}s")
                results["success"] += 1
                results["total_data_points"] += len(data)
            else:
                print(f"  ❌ 失败: 未获取到数据")
                results["failure"] += 1
        
        except Exception as e:
            print(f"  ❌ 异常: {e}")
            results["failure"] += 1
        
        # 等待一段时间，避免超出限额
        if symbol != test_symbols[-1]:
            print("  ⏱️  等待15秒避免API限流...")
            await asyncio.sleep(15)
    
    print("\n" + "-"*60)
    print(f"📈 Alpha Vantage 测试结果:")
    print(f"   成功: {results['success']}/{len(test_symbols)}")
    print(f"   失败: {results['failure']}/{len(test_symbols)}")
    print(f"   成功率: {results['success']/len(test_symbols)*100:.1f}%")
    print(f"   总数据点: {results['total_data_points']}")
    print("-"*60)
    
    return results


async def test_hybrid_provider():
    """测试混合数据提供者"""
    print("\n" + "="*60)
    print("📊 测试混合数据源（雅虎 + Alpha Vantage）")
    print("="*60)
    
    # 创建混合提供者
    yahoo = YahooFinanceProvider(rate_limit_delay=0.1)
    api_key = os.getenv("ALPHA_VANTAGE_API_KEY", "demo")
    alphavantage = AlphaVantageProvider(api_key=api_key, rate_limit_delay=0)
    
    provider = HybridProvider(
        yahoo_provider=yahoo,
        alphavantage_provider=alphavantage,
        primary_provider="yahoo"
    )
    
    results = {
        "success": 0,
        "failure": 0,
        "total_data_points": 0
    }
    
    for symbol in TEST_SYMBOLS:
        try:
            print(f"\n🔍 获取 {symbol} 数据...")
            start_time = datetime.now()
            
            data = await provider.get_stock_data(symbol, "1mo", "1d")
            
            duration = (datetime.now() - start_time).total_seconds()
            
            if data:
                print(f"  ✅ 成功: {len(data)} 条数据, 耗时 {duration:.2f}s")
                results["success"] += 1
                results["total_data_points"] += len(data)
            else:
                print(f"  ❌ 失败: 未获取到数据")
                results["failure"] += 1
        
        except Exception as e:
            print(f"  ❌ 异常: {e}")
            results["failure"] += 1
    
    print("\n" + "-"*60)
    print(f"📈 混合模式测试结果:")
    print(f"   成功: {results['success']}/{len(TEST_SYMBOLS)}")
    print(f"   失败: {results['failure']}/{len(TEST_SYMBOLS)}")
    print(f"   成功率: {results['success']/len(TEST_SYMBOLS)*100:.1f}%")
    print(f"   总数据点: {results['total_data_points']}")
    
    # 显示统计信息
    stats = provider.get_stats()
    print(f"\n📊 数据源使用统计:")
    for source, stat in stats.items():
        print(f"   {source:15s}: {stat}")
    print("-"*60)
    
    return results


async def test_stock_info():
    """测试获取股票基本信息"""
    print("\n" + "="*60)
    print("📋 测试获取股票基本信息")
    print("="*60)
    
    symbol = "AAPL"
    
    # 测试雅虎
    print(f"\n🔍 雅虎财经获取 {symbol} 基本信息...")
    yahoo = YahooFinanceProvider(rate_limit_delay=0.1)
    yahoo_info = await yahoo.get_stock_info(symbol)
    if yahoo_info:
        print(f"  ✅ 成功:")
        print(f"     名称: {yahoo_info.get('name')}")
        print(f"     当前价格: ${yahoo_info.get('current_price')}")
        print(f"     市值: ${yahoo_info.get('market_cap'):,}")
        print(f"     行业: {yahoo_info.get('industry')}")
    else:
        print(f"  ❌ 失败")
    
    # 测试 Alpha Vantage
    print(f"\n🔍 Alpha Vantage 获取 {symbol} 基本信息...")
    api_key = os.getenv("ALPHA_VANTAGE_API_KEY", "demo")
    av = AlphaVantageProvider(api_key=api_key, rate_limit_delay=0)
    av_info = await av.get_stock_info(symbol)
    if av_info:
        print(f"  ✅ 成功:")
        print(f"     名称: {av_info.get('name')}")
        print(f"     市值: ${av_info.get('market_cap'):,}")
        print(f"     行业: {av_info.get('industry')}")
        print(f"     描述: {av_info.get('description', '')[:100]}...")
    else:
        print(f"  ❌ 失败")


async def main():
    """主测试函数"""
    print("\n" + "🚀" * 30)
    print("🧪 数据源集成测试")
    print("🚀" * 30)
    
    # 1. 测试雅虎财经
    yahoo_results = await test_yahoo_provider()
    
    # 2. 测试 Alpha Vantage（可选，因为有API限额）
    print("\n" + "⚠️ " * 20)
    print("Alpha Vantage 测试会消耗 API 配额")
    user_input = input("是否继续测试 Alpha Vantage? (y/n): ")
    
    av_results = None
    if user_input.lower() == 'y':
        av_results = await test_alphavantage_provider()
    else:
        print("⏭️  跳过 Alpha Vantage 测试")
    
    # 3. 测试混合模式
    hybrid_results = await test_hybrid_provider()
    
    # 4. 测试股票信息获取
    await test_stock_info()
    
    # 总结
    print("\n" + "📊" * 30)
    print("📊 测试总结")
    print("📊" * 30)
    print(f"\n雅虎财经:")
    print(f"  成功率: {yahoo_results['success']}/{len(TEST_SYMBOLS)} = {yahoo_results['success']/len(TEST_SYMBOLS)*100:.1f}%")
    
    if av_results:
        print(f"\nAlpha Vantage:")
        print(f"  成功率: {av_results['success']}/3 = {av_results['success']/3*100:.1f}%")
    
    print(f"\n混合模式:")
    print(f"  成功率: {hybrid_results['success']}/{len(TEST_SYMBOLS)} = {hybrid_results['success']/len(TEST_SYMBOLS)*100:.1f}%")
    
    print("\n" + "✅" * 30)
    print("✅ 测试完成！")
    print("✅" * 30)
    
    # 建议
    print("\n💡 建议:")
    if yahoo_results['success'] == len(TEST_SYMBOLS):
        print("   ✅ 雅虎财经工作正常，推荐作为主数据源")
    else:
        print("   ⚠️  雅虎财经部分失败，建议使用混合模式")
    
    if av_results and av_results['success'] > 0:
        print("   ✅ Alpha Vantage 可用，建议作为备用数据源")
    
    if hybrid_results['success'] == len(TEST_SYMBOLS):
        print("   🌟 混合模式工作完美，强烈推荐用于生产环境！")
    
    print("\n推荐配置:")
    print("   MARKET_DATA_PROVIDER=hybrid")
    print("   PRIMARY_DATA_SOURCE=yahoo")
    print("   ALPHA_VANTAGE_API_KEY=<你的API Key>\n")


if __name__ == "__main__":
    asyncio.run(main())

