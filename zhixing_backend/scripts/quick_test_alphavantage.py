"""
快速测试 Alpha Vantage 数据源
"""
import asyncio
import sys
import os

# 设置 API Key
os.environ["ALPHA_VANTAGE_API_KEY"] = "AU1SKLJOOD36YINC"

# 添加项目根目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from app.core.market_data import AlphaVantageProvider, HybridProvider, YahooFinanceProvider


async def test_alphavantage():
    """测试 Alpha Vantage"""
    print("\n" + "="*60)
    print("🧪 测试 Alpha Vantage 数据源")
    print("="*60)
    
    provider = AlphaVantageProvider(
        api_key="AU1SKLJOOD36YINC",
        rate_limit_delay=0  # 测试时不延迟
    )
    
    # 测试股票
    test_symbols = ["AAPL", "TSLA", "MSFT"]
    
    for symbol in test_symbols:
        print(f"\n🔍 获取 {symbol} 数据...")
        
        try:
            # 获取最近一个月的日线数据
            data = await provider.get_stock_data(symbol, "1mo", "1d")
            
            if data:
                print(f"  ✅ 成功获取 {len(data)} 条数据")
                print(f"  📅 日期范围: {data[0].datetime} 到 {data[-1].datetime}")
                print(f"  💰 最新价格: ${data[-1].close:.2f}")
                print(f"  📊 最新成交量: {data[-1].volume:,}")
            else:
                print(f"  ❌ 未获取到数据")
        
        except Exception as e:
            print(f"  ❌ 错误: {e}")
        
        # 避免触发 API 限制
        if symbol != test_symbols[-1]:
            print("  ⏱️  等待15秒避免API限流...")
            await asyncio.sleep(15)
    
    print("\n" + "="*60)
    print("✅ Alpha Vantage 测试完成！")
    print("="*60)


async def test_hybrid():
    """测试混合模式"""
    print("\n" + "="*60)
    print("🧪 测试混合数据源（雅虎 + Alpha Vantage）")
    print("="*60)
    
    yahoo = YahooFinanceProvider(rate_limit_delay=0.1)
    alphavantage = AlphaVantageProvider(
        api_key="AU1SKLJOOD36YINC",
        rate_limit_delay=0
    )
    
    provider = HybridProvider(
        yahoo_provider=yahoo,
        alphavantage_provider=alphavantage,
        primary_provider="yahoo"
    )
    
    # 测试股票
    test_symbols = ["AAPL", "GOOGL", "AMZN"]
    
    for symbol in test_symbols:
        print(f"\n🔍 获取 {symbol} 数据...")
        
        try:
            data = await provider.get_stock_data(symbol, "5d", "1d")
            
            if data:
                print(f"  ✅ 成功获取 {len(data)} 条数据")
                print(f"  💰 最新价格: ${data[-1].close:.2f}")
            else:
                print(f"  ❌ 未获取到数据")
        
        except Exception as e:
            print(f"  ❌ 错误: {e}")
    
    # 显示统计
    stats = provider.get_stats()
    print("\n" + "-"*60)
    print("📊 数据源使用统计:")
    for source, stat in stats.items():
        print(f"  {source:15s}: 成功 {stat['success']}, 失败 {stat['failure']}, 成功率 {stat['success_rate']}")
    print("-"*60)
    
    print("\n" + "="*60)
    print("✅ 混合模式测试完成！")
    print("="*60)


async def main():
    print("\n" + "🚀"*30)
    print("🧪 Alpha Vantage 数据源集成测试")
    print("🚀"*30)
    print(f"\n📌 API Key: AU1SKLJOOD36YINC")
    print(f"📌 免费额度: 5次/分钟, 500次/天")
    
    # 1. 测试 Alpha Vantage
    await test_alphavantage()
    
    # 2. 测试混合模式
    print("\n" + "⏳ 等待5秒后测试混合模式...")
    await asyncio.sleep(5)
    
    await test_hybrid()
    
    # 总结
    print("\n" + "🎉"*30)
    print("🎉 所有测试完成！")
    print("🎉"*30)
    
    print("\n💡 下一步：")
    print("   1. 将 API Key 添加到 .env 文件:")
    print("      ALPHA_VANTAGE_API_KEY=AU1SKLJOOD36YINC")
    print("   2. 设置数据源模式:")
    print("      MARKET_DATA_PROVIDER=hybrid")
    print("   3. 重启后端服务")
    print("   4. 开始使用！\n")


if __name__ == "__main__":
    asyncio.run(main())

