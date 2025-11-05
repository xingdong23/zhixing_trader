"""
分析和验证各数据源的实际能力
测试每个数据源支持的时间级别和历史数据范围
"""
import sys
import asyncio
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict
import json

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.core.market_data import (
    YahooFinanceProvider,
    AlphaVantageProvider,
    FinnhubProvider,
    TwelveDataProvider
)
from app.config import settings
from loguru import logger


# 测试配置
TEST_SYMBOL = "AAPL"  # 使用Apple作为测试股票

# 各数据源要测试的时间级别
TEST_INTERVALS = {
    "yahoo": ["1m", "5m", "15m", "30m", "1h", "1d", "1wk", "1mo"],
    "alphavantage": ["1min", "5min", "15min", "30min", "60min", "daily", "weekly", "monthly"],
    "finnhub": ["1", "5", "15", "30", "60", "D", "W", "M"],
    "twelvedata": ["1min", "5min", "15min", "30min", "1h", "1day", "1week", "1month"],
}

# 映射到统一格式
INTERVAL_MAPPING = {
    "yahoo": {
        "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m",
        "1h": "1h", "1d": "1d", "1wk": "1wk", "1mo": "1mo"
    },
    "alphavantage": {
        "1min": "1m", "5min": "5m", "15min": "15m", "30min": "30m",
        "60min": "1h", "daily": "1d", "weekly": "1wk", "monthly": "1mo"
    },
    "finnhub": {
        "1": "1m", "5": "5m", "15": "15m", "30": "30m",
        "60": "1h", "D": "1d", "W": "1wk", "M": "1mo"
    },
    "twelvedata": {
        "1min": "1m", "5min": "5m", "15min": "15m", "30min": "30m",
        "1h": "1h", "1day": "1d", "1week": "1wk", "1month": "1mo"
    }
}


async def test_yahoo_capabilities():
    """测试Yahoo Finance的能力"""
    print("\n" + "=" * 80)
    print("🟡 测试 Yahoo Finance")
    print("=" * 80)
    
    provider = YahooFinanceProvider(rate_limit_delay=1.0)
    results = []
    
    test_configs = [
        ("1m", "7d"),     # 1分钟线，7天
        ("5m", "60d"),    # 5分钟线，60天
        ("15m", "60d"),   # 15分钟线，60天
        ("1h", "730d"),   # 1小时线，2年
        ("1d", "max"),    # 日线，最大
        ("1wk", "max"),   # 周线，最大
        ("1mo", "max"),   # 月线，最大
    ]
    
    for interval, period in test_configs:
        try:
            print(f"\n📊 测试 {interval} 线，period={period}...")
            
            data = await provider.get_stock_data(TEST_SYMBOL, period, interval)
            
            if data:
                result = {
                    "interval": interval,
                    "period": period,
                    "count": len(data),
                    "start_date": data[0].datetime.strftime("%Y-%m-%d"),
                    "end_date": data[-1].datetime.strftime("%Y-%m-%d"),
                    "days_span": (data[-1].datetime - data[0].datetime).days,
                    "years_span": round((data[-1].datetime - data[0].datetime).days / 365, 2),
                    "status": "✅ 成功"
                }
                results.append(result)
                
                print(f"  ✅ 获取 {len(data)} 条数据")
                print(f"  📅 时间范围: {result['start_date']} ~ {result['end_date']}")
                print(f"  ⏱  跨度: {result['days_span']} 天 ({result['years_span']} 年)")
            else:
                result = {
                    "interval": interval,
                    "period": period,
                    "status": "❌ 无数据"
                }
                results.append(result)
                print(f"  ❌ 未获取到数据")
        
        except Exception as e:
            result = {
                "interval": interval,
                "period": period,
                "status": f"❌ 错误: {str(e)[:50]}"
            }
            results.append(result)
            print(f"  ❌ 错误: {e}")
        
        await asyncio.sleep(1)  # 避免限流
    
    return {"provider": "Yahoo Finance", "results": results}


async def test_alphavantage_capabilities():
    """测试Alpha Vantage的能力"""
    print("\n" + "=" * 80)
    print("🟢 测试 Alpha Vantage")
    print("=" * 80)
    
    api_key = settings.alpha_vantage_api_key
    if not api_key or api_key == "demo":
        print("⚠️  未配置Alpha Vantage API Key，跳过测试")
        return {"provider": "Alpha Vantage", "results": [], "skipped": True}
    
    provider = AlphaVantageProvider(api_key=api_key, rate_limit_delay=12.0)
    results = []
    
    test_configs = [
        ("1min", "1mo"),    # 1分钟线
        ("5min", "1mo"),    # 5分钟线
        ("15min", "1mo"),   # 15分钟线
        ("60min", "1mo"),   # 1小时线
        ("daily", "max"),   # 日线
    ]
    
    for interval, period in test_configs:
        try:
            print(f"\n📊 测试 {interval}，period={period}...")
            
            data = await provider.get_stock_data(TEST_SYMBOL, period, interval)
            
            if data:
                result = {
                    "interval": interval,
                    "period": period,
                    "count": len(data),
                    "start_date": data[0].datetime.strftime("%Y-%m-%d"),
                    "end_date": data[-1].datetime.strftime("%Y-%m-%d"),
                    "days_span": (data[-1].datetime - data[0].datetime).days,
                    "years_span": round((data[-1].datetime - data[0].datetime).days / 365, 2),
                    "status": "✅ 成功"
                }
                results.append(result)
                
                print(f"  ✅ 获取 {len(data)} 条数据")
                print(f"  📅 时间范围: {result['start_date']} ~ {result['end_date']}")
                print(f"  ⏱  跨度: {result['days_span']} 天 ({result['years_span']} 年)")
            else:
                result = {
                    "interval": interval,
                    "period": period,
                    "status": "❌ 无数据"
                }
                results.append(result)
                print(f"  ❌ 未获取到数据")
        
        except Exception as e:
            result = {
                "interval": interval,
                "period": period,
                "status": f"❌ 错误: {str(e)[:50]}"
            }
            results.append(result)
            print(f"  ❌ 错误: {e}")
        
        # Alpha Vantage限流严格，必须等待
        await asyncio.sleep(13)
    
    return {"provider": "Alpha Vantage", "results": results}


async def test_finnhub_capabilities():
    """测试Finnhub的能力"""
    print("\n" + "=" * 80)
    print("🔵 测试 Finnhub")
    print("=" * 80)
    
    api_key = settings.finnhub_api_key
    if not api_key:
        print("⚠️  未配置Finnhub API Key，跳过测试")
        return {"provider": "Finnhub", "results": [], "skipped": True}
    
    provider = FinnhubProvider(api_key=api_key, rate_limit_delay=1.0)
    results = []
    
    test_configs = [
        ("1", "1mo"),     # 1分钟
        ("5", "1mo"),     # 5分钟
        ("15", "3mo"),    # 15分钟
        ("60", "1y"),     # 1小时
        ("D", "1y"),      # 日线
    ]
    
    for interval, period in test_configs:
        try:
            print(f"\n📊 测试 resolution={interval}，period={period}...")
            
            data = await provider.get_stock_data(TEST_SYMBOL, period, interval)
            
            if data:
                result = {
                    "interval": interval,
                    "period": period,
                    "count": len(data),
                    "start_date": data[0].datetime.strftime("%Y-%m-%d"),
                    "end_date": data[-1].datetime.strftime("%Y-%m-%d"),
                    "days_span": (data[-1].datetime - data[0].datetime).days,
                    "years_span": round((data[-1].datetime - data[0].datetime).days / 365, 2),
                    "status": "✅ 成功"
                }
                results.append(result)
                
                print(f"  ✅ 获取 {len(data)} 条数据")
                print(f"  📅 时间范围: {result['start_date']} ~ {result['end_date']}")
                print(f"  ⏱  跨度: {result['days_span']} 天 ({result['years_span']} 年)")
            else:
                result = {
                    "interval": interval,
                    "period": period,
                    "status": "❌ 无数据"
                }
                results.append(result)
                print(f"  ❌ 未获取到数据")
        
        except Exception as e:
            result = {
                "interval": interval,
                "period": period,
                "status": f"❌ 错误: {str(e)[:50]}"
            }
            results.append(result)
            print(f"  ❌ 错误: {e}")
        
        await asyncio.sleep(1)
    
    return {"provider": "Finnhub", "results": results}


async def test_twelvedata_capabilities():
    """测试Twelve Data的能力"""
    print("\n" + "=" * 80)
    print("🟣 测试 Twelve Data")
    print("=" * 80)
    
    api_key = settings.twelvedata_api_key
    if not api_key:
        print("⚠️  未配置Twelve Data API Key，跳过测试")
        return {"provider": "Twelve Data", "results": [], "skipped": True}
    
    provider = TwelveDataProvider(api_key=api_key, rate_limit_delay=7.5)
    results = []
    
    test_configs = [
        ("1min", "1d"),     # 1分钟
        ("5min", "5d"),     # 5分钟
        ("15min", "1mo"),   # 15分钟
        ("1h", "1y"),       # 1小时
        ("1day", "5y"),     # 日线
    ]
    
    for interval, period in test_configs:
        try:
            print(f"\n📊 测试 {interval}，period={period}...")
            
            data = await provider.get_stock_data(TEST_SYMBOL, period, interval)
            
            if data:
                result = {
                    "interval": interval,
                    "period": period,
                    "count": len(data),
                    "start_date": data[0].datetime.strftime("%Y-%m-%d"),
                    "end_date": data[-1].datetime.strftime("%Y-%m-%d"),
                    "days_span": (data[-1].datetime - data[0].datetime).days,
                    "years_span": round((data[-1].datetime - data[0].datetime).days / 365, 2),
                    "status": "✅ 成功"
                }
                results.append(result)
                
                print(f"  ✅ 获取 {len(data)} 条数据")
                print(f"  📅 时间范围: {result['start_date']} ~ {result['end_date']}")
                print(f"  ⏱  跨度: {result['days_span']} 天 ({result['years_span']} 年)")
            else:
                result = {
                    "interval": interval,
                    "period": period,
                    "status": "❌ 无数据"
                }
                results.append(result)
                print(f"  ❌ 未获取到数据")
        
        except Exception as e:
            result = {
                "interval": interval,
                "period": period,
                "status": f"❌ 错误: {str(e)[:50]}"
            }
            results.append(result)
            print(f"  ❌ 错误: {e}")
        
        await asyncio.sleep(8)
    
    return {"provider": "Twelve Data", "results": results}


async def main():
    """主函数"""
    print("\n" + "=" * 80)
    print("  📊 数据源能力分析测试")
    print(f"  测试股票: {TEST_SYMBOL}")
    print(f"  测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    
    all_results = []
    
    # 测试各数据源
    try:
        yahoo_result = await test_yahoo_capabilities()
        all_results.append(yahoo_result)
    except Exception as e:
        print(f"❌ Yahoo Finance测试失败: {e}")
    
    try:
        alpha_result = await test_alphavantage_capabilities()
        all_results.append(alpha_result)
    except Exception as e:
        print(f"❌ Alpha Vantage测试失败: {e}")
    
    try:
        finnhub_result = await test_finnhub_capabilities()
        all_results.append(finnhub_result)
    except Exception as e:
        print(f"❌ Finnhub测试失败: {e}")
    
    try:
        twelve_result = await test_twelvedata_capabilities()
        all_results.append(twelve_result)
    except Exception as e:
        print(f"❌ Twelve Data测试失败: {e}")
    
    # 生成总结
    print("\n" + "=" * 80)
    print("  📊 测试总结")
    print("=" * 80)
    
    for provider_result in all_results:
        provider_name = provider_result["provider"]
        results = provider_result.get("results", [])
        skipped = provider_result.get("skipped", False)
        
        if skipped:
            print(f"\n🔸 {provider_name}: ⚠️  跳过（未配置API Key）")
            continue
        
        success_count = len([r for r in results if "✅" in r.get("status", "")])
        total_count = len(results)
        
        print(f"\n🔸 {provider_name}: {success_count}/{total_count} 成功")
        
        for result in results:
            if "count" in result:
                interval = result["interval"]
                count = result["count"]
                years = result["years_span"]
                print(f"   • {interval:8s}: {count:5d} 条数据 ({years:5.1f} 年)")
    
    # 保存结果到JSON文件
    output_file = project_root / "data_source_capabilities_test_result.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump({
            "test_time": datetime.now().isoformat(),
            "test_symbol": TEST_SYMBOL,
            "results": all_results
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 测试结果已保存到: {output_file}")
    
    # 生成推荐
    print("\n" + "=" * 80)
    print("  🎯 回测推荐")
    print("=" * 80)
    
    print("\n📌 日线回测（1年以上）:")
    print("   1️⃣  Yahoo Finance - 推荐，免费且数据最全")
    print("   2️⃣  Alpha Vantage - 备选，稳定但限流严格")
    
    print("\n📌 小时线回测（1-2年）:")
    print("   1️⃣  Yahoo Finance - 可获取2年数据")
    
    print("\n📌 15分钟线回测（1-2个月）:")
    print("   1️⃣  Yahoo Finance - 可获取60天数据")
    
    print("\n⚠️  不推荐分钟线回测（历史数据太少）")
    
    print("\n" + "=" * 80 + "\n")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  测试被用户中断")
    except Exception as e:
        print(f"\n\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()

