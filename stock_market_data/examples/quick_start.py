#!/usr/bin/env python3
"""
Market Data Service 快速开始示例
展示基本用法和常见场景
"""

import sys
from pathlib import Path

# 添加父目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

import asyncio
from market_data import (
    YahooFinanceProvider,
    AlphaVantageProvider,
    MultiProviderStrategy,
)
from config import settings, get_alpha_vantage_keys


async def example_1_single_provider():
    """示例1: 使用单一数据源"""
    print("\n" + "=" * 60)
    print("示例1: 使用Yahoo Finance单一数据源")
    print("=" * 60)
    
    provider = YahooFinanceProvider()
    
    # 获取K线数据
    print("\n获取AAPL的K线数据...")
    klines = await provider.get_stock_data(
        symbol="AAPL",
        period="5d",
        interval="1d"
    )
    
    if klines:
        print(f"✅ 成功获取 {len(klines)} 条K线数据")
        latest = klines[-1]
        print(f"   最新价格: ${latest.close:.2f}")
        print(f"   时间: {latest.datetime}")
    else:
        print("❌ 获取失败")


async def example_2_multi_provider():
    """示例2: 使用多数据源策略"""
    print("\n" + "=" * 60)
    print("示例2: 使用多数据源策略（推荐）")
    print("=" * 60)
    
    strategy = MultiProviderStrategy()
    
    # 测试多个股票
    symbols = ["AAPL", "MSFT", "GOOGL"]
    
    print(f"\n获取 {len(symbols)} 只股票的数据...")
    
    for symbol in symbols:
        try:
            # 获取股票信息
            info = await strategy.get_stock_info(symbol)
            
            if info:
                print(f"\n✅ {symbol}:")
                print(f"   名称: {info.get('name', 'N/A')}")
                print(f"   行业: {info.get('sector', 'N/A')} / {info.get('industry', 'N/A')}")
                market_cap = info.get('market_cap', 0)
                if market_cap:
                    print(f"   市值: ${market_cap/1e9:.2f}B")
            else:
                print(f"❌ {symbol}: 获取失败")
        
        except Exception as e:
            print(f"❌ {symbol}: {e}")
        
        # 避免请求过快
        await asyncio.sleep(1)


async def example_3_alpha_vantage():
    """示例3: 使用Alpha Vantage获取详细信息"""
    print("\n" + "=" * 60)
    print("示例3: 使用Alpha Vantage获取股票详细信息")
    print("=" * 60)
    
    alpha_keys = get_alpha_vantage_keys()
    
    if not alpha_keys:
        print("⚠️  未配置Alpha Vantage API Key，跳过此示例")
        return
    
    provider = AlphaVantageProvider(
        api_key=alpha_keys[0],
        rate_limit_delay=12.0
    )
    
    print("\n获取AAPL的详细信息...")
    info = await provider.get_stock_info("AAPL")
    
    if info:
        print("✅ 成功获取详细信息:")
        print(f"   公司: {info.get('name', 'N/A')}")
        print(f"   描述: {info.get('description', 'N/A')[:100]}...")
        print(f"   Sector: {info.get('sector', 'N/A')}")
        print(f"   Industry: {info.get('industry', 'N/A')}")
        print(f"   市值: ${info.get('market_cap', 0)/1e9:.2f}B")
        print(f"   PE比率: {info.get('pe_ratio', 'N/A')}")
    else:
        print("❌ 获取失败")


async def example_4_kline_data():
    """示例4: 获取不同周期的K线数据"""
    print("\n" + "=" * 60)
    print("示例4: 获取不同周期的K线数据")
    print("=" * 60)
    
    strategy = MultiProviderStrategy()
    
    periods = [
        ("1d", "1m", "今天分钟线"),
        ("5d", "1h", "5天小时线"),
        ("1mo", "1d", "一个月日线"),
    ]
    
    symbol = "AAPL"
    
    for period, interval, desc in periods:
        print(f"\n获取{symbol}的{desc}...")
        
        try:
            klines = await strategy.get_stock_data(
                symbol=symbol,
                period=period,
                interval=interval
            )
            
            if klines:
                print(f"✅ 获取 {len(klines)} 条数据")
                if len(klines) > 0:
                    first = klines[0]
                    last = klines[-1]
                    print(f"   时间范围: {first.datetime} ~ {last.datetime}")
                    print(f"   价格区间: ${min(k.low for k in klines):.2f} - ${max(k.high for k in klines):.2f}")
            else:
                print("❌ 获取失败")
        
        except Exception as e:
            print(f"❌ 错误: {e}")
        
        await asyncio.sleep(1)


async def example_5_error_handling():
    """示例5: 错误处理和重试"""
    print("\n" + "=" * 60)
    print("示例5: 错误处理和自动故障转移")
    print("=" * 60)
    
    strategy = MultiProviderStrategy()
    
    # 测试一个可能失败的请求
    print("\n尝试获取无效股票代码...")
    
    try:
        info = await strategy.get_stock_info("INVALID_SYMBOL_12345")
        
        if info:
            print("✅ 意外获取到数据")
        else:
            print("✅ 正确处理：返回None")
    
    except Exception as e:
        print(f"✅ 正确捕获异常: {e}")


async def main():
    """主函数"""
    print("\n" + "=" * 80)
    print("Market Data Service - 快速开始示例")
    print("=" * 80)
    
    # 运行所有示例
    await example_1_single_provider()
    await example_2_multi_provider()
    await example_3_alpha_vantage()
    await example_4_kline_data()
    await example_5_error_handling()
    
    print("\n" + "=" * 80)
    print("✅ 所有示例运行完成！")
    print("=" * 80)
    
    print("\n💡 提示:")
    print("1. 配置多个API Key可以提高请求额度")
    print("2. 使用MultiProviderStrategy自动选择最佳数据源")
    print("3. 设置合理的速率限制避免被封禁")
    print("4. 查看README.md了解更多高级用法")


if __name__ == "__main__":
    asyncio.run(main())


