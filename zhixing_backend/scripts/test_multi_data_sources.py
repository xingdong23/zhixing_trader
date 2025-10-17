"""
测试多数据源配置

验证所有配置的数据源是否正常工作
"""

import sys
from pathlib import Path
import asyncio
import time

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from loguru import logger
from app.config import settings
from app.core.market_data import (
    YahooFinanceProvider,
    AlphaVantageProvider,
    FinnhubProvider,
    TwelveDataProvider,
)


async def test_provider(name: str, provider, symbol: str = "AAPL"):
    """测试单个数据源"""
    
    print(f"\n{'='*60}")
    print(f"测试数据源: {name}")
    print(f"{'='*60}")
    
    try:
        start_time = time.time()
        
        # 获取K线数据（最近5天日线）
        klines = await provider.get_stock_data(symbol, period="5d", interval="1d")
        
        elapsed = time.time() - start_time
        
        if klines and len(klines) > 0:
            latest = klines[-1]
            print(f"✅ {name} 测试成功！")
            print(f"   股票: {symbol}")
            print(f"   获取数据: {len(klines)}条")
            print(f"   最新价格: ${latest.close:.2f}")
            print(f"   最新时间: {latest.datetime}")
            print(f"   响应时间: {elapsed:.2f}秒")
            return True
        else:
            print(f"❌ {name} 返回空数据")
            return False
            
    except Exception as e:
        print(f"❌ {name} 测试失败")
        print(f"   错误: {str(e)[:100]}")
        import traceback
        print(f"   详细: {traceback.format_exc()[:200]}")
        return False


async def test_all_sources():
    """测试所有数据源"""
    
    print("\n" + "="*60)
    print("🚀 开始测试所有数据源")
    print("="*60)
    
    results = {}
    
    # 1. 测试Yahoo Finance
    yahoo = YahooFinanceProvider(rate_limit_delay=1.0)
    results['Yahoo Finance'] = await test_provider('Yahoo Finance', yahoo)
    await asyncio.sleep(2)
    
    # 2. 测试Alpha Vantage账户
    alpha_keys = [
        ('Alpha Vantage #1', getattr(settings, 'alpha_vantage_api_key_1', None) or settings.alpha_vantage_api_key),
        ('Alpha Vantage #2', getattr(settings, 'alpha_vantage_api_key_2', None)),
        ('Alpha Vantage #3', getattr(settings, 'alpha_vantage_api_key_3', None)),
    ]
    
    for name, api_key in alpha_keys:
        if api_key:
            alpha = AlphaVantageProvider(
                api_key=api_key,
                rate_limit_delay=12.0
            )
            results[name] = await test_provider(name, alpha)
            await asyncio.sleep(2)
        else:
            print(f"\n⚠️  {name} API Key 未配置，跳过测试")
            results[name] = None
    
    # 3. 测试Finnhub账户
    finnhub_keys = [
        ('Finnhub #1', getattr(settings, 'finnhub_api_key_1', None) or settings.finnhub_api_key),
        ('Finnhub #2', getattr(settings, 'finnhub_api_key_2', None)),
        ('Finnhub #3', getattr(settings, 'finnhub_api_key_3', None)),
    ]
    
    for name, api_key in finnhub_keys:
        if api_key:
            finnhub = FinnhubProvider(
                api_key=api_key,
                rate_limit_delay=1.0
            )
            results[name] = await test_provider(name, finnhub)
            await asyncio.sleep(2)
        else:
            print(f"\n⚠️  {name} API Key 未配置，跳过测试")
            results[name] = None
    
    # 4. 测试Twelve Data
    if settings.twelvedata_api_key:
        twelve = TwelveDataProvider(
            api_key=settings.twelvedata_api_key,
            rate_limit_delay=7.5
        )
        results['Twelve Data'] = await test_provider('Twelve Data', twelve)
        await asyncio.sleep(2)
    else:
        print("\n⚠️  Twelve Data API Key 未配置，跳过测试")
        results['Twelve Data'] = None
    
    # 汇总结果
    print("\n" + "="*60)
    print("📊 测试结果汇总")
    print("="*60)
    
    success_count = sum(1 for v in results.values() if v is True)
    failed_count = sum(1 for v in results.values() if v is False)
    skipped_count = sum(1 for v in results.values() if v is None)
    total_count = len(results)
    
    for name, result in results.items():
        if result is True:
            status = "✅ 成功"
        elif result is False:
            status = "❌ 失败"
        else:
            status = "⚠️  跳过"
        
        print(f"  {status:8s} - {name}")
    
    print(f"\n总计: {total_count} 个数据源")
    print(f"  ✅ 成功: {success_count}")
    print(f"  ❌ 失败: {failed_count}")
    print(f"  ⚠️  跳过: {skipped_count}")
    
    # 计算可用性
    if success_count + failed_count > 0:
        availability = success_count / (success_count + failed_count) * 100
        print(f"\n可用性: {availability:.1f}%")
        
        if availability >= 80:
            print("🎉 系统状态: 优秀")
        elif availability >= 60:
            print("👍 系统状态: 良好")
        elif availability >= 40:
            print("⚠️  系统状态: 一般")
        else:
            print("❌ 系统状态: 较差")
    
    # 能力估算
    print("\n" + "="*60)
    print("💪 系统能力估算")
    print("="*60)
    
    minute_capacity = 0
    daily_capacity = 0
    
    if results.get('Yahoo Finance'):
        minute_capacity += 5
        daily_capacity += 100
        print("  Yahoo Finance: ~100次/天, ~5次/分钟")
    
    alpha_count = sum(1 for k, v in results.items() if 'Alpha Vantage' in k and v)
    if alpha_count > 0:
        minute_capacity += 5 * alpha_count
        daily_capacity += 500 * alpha_count
        print(f"  Alpha Vantage ({alpha_count}个账户): {500*alpha_count}次/天, {5*alpha_count}次/分钟")
    
    finnhub_count = sum(1 for k, v in results.items() if 'Finnhub' in k and v)
    if finnhub_count > 0:
        minute_capacity += 60 * finnhub_count
        daily_capacity += 3000 * finnhub_count  # 估算
        print(f"  Finnhub ({finnhub_count}个账户): {60*finnhub_count}次/分钟")
    
    if results.get('Twelve Data'):
        minute_capacity += 8
        daily_capacity += 800
        print("  Twelve Data: 800次/天, 8次/分钟")
    
    print(f"\n总能力:")
    print(f"  分钟级: ~{minute_capacity}次/分钟")
    print(f"  日级: ~{daily_capacity}次/天")
    
    if minute_capacity >= 100:
        print(f"\n🚀 能力评级: 非常强大！")
    elif minute_capacity >= 50:
        print(f"\n💪 能力评级: 强大")
    elif minute_capacity >= 20:
        print(f"\n👍 能力评级: 良好")
    else:
        print(f"\n⚠️  能力评级: 一般")
    
    print("\n" + "="*60)
    
    return results


async def test_config():
    """测试配置信息"""
    
    print("\n" + "="*60)
    print("⚙️  配置信息检查")
    print("="*60)
    
    print(f"\n数据源模式: {settings.market_data_provider}")
    print(f"数据源配置: {settings.data_sources_config}")
    
    print(f"\nAPI Keys状态:")
    print(f"  Alpha Vantage: {'✅ 已配置' if settings.alpha_vantage_api_key else '❌ 未配置'}")
    print(f"  Finnhub #1: {'✅ 已配置' if getattr(settings, 'finnhub_api_key_1', None) or settings.finnhub_api_key else '❌ 未配置'}")
    print(f"  Finnhub #2: {'✅ 已配置' if getattr(settings, 'finnhub_api_key_2', None) else '❌ 未配置'}")
    print(f"  Finnhub #3: {'✅ 已配置' if getattr(settings, 'finnhub_api_key_3', None) else '❌ 未配置'}")
    print(f"  Twelve Data: {'✅ 已配置' if settings.twelvedata_api_key else '❌ 未配置'}")
    
    print(f"\n速率限制:")
    print(f"  Yahoo: {settings.yahoo_rate_limit}秒/次")
    print(f"  Alpha Vantage: {settings.alphavantage_rate_limit}秒/次")
    print(f"  Finnhub: {settings.finnhub_rate_limit}秒/次")
    print(f"  Twelve Data: {settings.twelvedata_rate_limit}秒/次")


def main():
    """主函数"""
    
    print("\n" + "🎯"*30)
    print("    多数据源配置测试工具")
    print("🎯"*30)
    
    # 测试配置
    asyncio.run(test_config())
    
    # 测试所有数据源
    print("\n等待2秒后开始测试...")
    time.sleep(2)
    
    results = asyncio.run(test_all_sources())
    
    print("\n✅ 测试完成！")
    print("\n如果有失败的数据源，请检查：")
    print("  1. API Key是否正确")
    print("  2. 网络连接是否正常")
    print("  3. 是否超出了API配额限制")
    print("  4. 查看详细日志: logs/api.log")
    
    # 返回成功的数量
    success_count = sum(1 for v in results.values() if v is True)
    return success_count


if __name__ == "__main__":
    try:
        success_count = main()
        sys.exit(0 if success_count > 0 else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  测试被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

