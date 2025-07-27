#!/usr/bin/env python3
"""
简化的Yahoo Finance测试
验证核心数据获取逻辑
"""
import asyncio
import sys
import os
from datetime import datetime

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_yahoo_basic():
    """基础Yahoo Finance测试"""
    print("🔍 测试Yahoo Finance基础功能...")
    
    try:
        # 导入yfinance
        import yfinance as yf
        print("✅ yfinance导入成功")
        
        # 测试获取股票数据
        symbol = "AAPL"
        print(f"📡 获取{symbol}数据...")
        
        ticker = yf.Ticker(symbol)
        data = ticker.history(period="5d", interval="1d")
        
        if not data.empty:
            print(f"✅ 成功获取{len(data)}条数据")
            print(f"📊 最新收盘价: ${data['Close'].iloc[-1]:.2f}")
            print(f"📅 数据时间范围: {data.index[0].date()} 到 {data.index[-1].date()}")
            
            # 验证数据完整性
            for i, (date, row) in enumerate(data.iterrows()):
                assert row['Open'] > 0, f"第{i}条开盘价应该大于0"
                assert row['Close'] > 0, f"第{i}条收盘价应该大于0"
                assert row['High'] >= row['Close'], f"第{i}条最高价应该大于等于收盘价"
                assert row['Low'] <= row['Close'], f"第{i}条最低价应该小于等于收盘价"
                assert row['Volume'] >= 0, f"第{i}条成交量应该大于等于0"
            
            print("✅ 数据完整性验证通过")
            return True
        else:
            print("❌ 未获取到数据")
            return False
            
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_data_structure():
    """测试数据结构转换"""
    print("\n🔍 测试数据结构转换...")
    
    try:
        from app.core.interfaces import KLineData
        
        # 创建测试数据
        test_kline = KLineData(
            datetime=datetime.now(),
            open=150.0,
            high=155.0,
            low=148.0,
            close=153.0,
            volume=1000000,
            symbol="AAPL"
        )
        
        print("✅ KLineData创建成功")
        print(f"📊 测试数据: {test_kline.symbol} - ${test_kline.close}")
        
        # 验证数据转换为保存格式
        save_format = {
            'symbol': test_kline.symbol,
            'timeframe': '1d',
            'datetime': test_kline.datetime,
            'open': test_kline.open,
            'high': test_kline.high,
            'low': test_kline.low,
            'close': test_kline.close,
            'volume': test_kline.volume,
            'data_source': 'yahoo'
        }
        
        print("✅ 数据格式转换成功")
        return True
        
    except Exception as e:
        print(f"❌ 数据结构测试失败: {e}")
        return False

async def test_provider_integration():
    """测试Provider集成"""
    print("\n🔍 测试YahooFinanceProvider集成...")
    
    try:
        from app.core.market_data.yahoo_provider import YahooFinanceProvider
        
        provider = YahooFinanceProvider(rate_limit_delay=0.1)
        print("✅ YahooFinanceProvider创建成功")
        
        # 测试获取数据
        symbol = "MSFT"
        data = await provider.get_stock_data(symbol, "5d", "1d")
        
        if len(data) > 0:
            print(f"✅ 成功获取{len(data)}条{symbol}数据")
            
            # 验证第一条数据
            first_kline = data[0]
            print(f"📊 第一条数据: {first_kline.datetime.date()} - ${first_kline.close:.2f}")
            
            # 验证数据类型
            from app.core.interfaces import KLineData
            assert isinstance(first_kline, KLineData), "数据应该是KLineData类型"
            
            print("✅ 数据类型验证通过")
            return True
        else:
            print("❌ 未获取到数据")
            return False
            
    except Exception as e:
        print(f"❌ Provider集成测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """主测试函数"""
    print("🎯 简化Yahoo Finance核心测试")
    print("=" * 50)
    print(f"⏰ 开始时间: {datetime.now().strftime('%H:%M:%S')}")
    print()
    
    tests = [
        ("Yahoo Finance基础功能", test_yahoo_basic),
        ("数据结构转换", test_data_structure),
        ("Provider集成", test_provider_integration)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"🧪 运行测试: {test_name}")
        try:
            result = await test_func()
            if result:
                passed += 1
                print(f"✅ {test_name} - 通过")
            else:
                print(f"❌ {test_name} - 失败")
        except Exception as e:
            print(f"💥 {test_name} - 异常: {e}")
        
        print()
    
    print("=" * 50)
    print(f"📊 测试结果: {passed}/{total} 通过")
    print(f"⏰ 结束时间: {datetime.now().strftime('%H:%M:%S')}")
    
    if passed == total:
        print("🎉 所有核心测试通过！")
        print("✅ Yahoo Finance数据获取逻辑正常工作")
        print("✅ 数据结构和转换逻辑正确")
        print("✅ Provider集成功能正常")
    else:
        print("⚠️ 部分测试失败，请检查错误信息")
    
    return passed == total

if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        print(f"\n🏁 测试{'成功' if success else '失败'}")
    except KeyboardInterrupt:
        print("\n🛑 测试被中断")
    except Exception as e:
        print(f"\n💥 测试异常: {e}")
        import traceback
        traceback.print_exc()
