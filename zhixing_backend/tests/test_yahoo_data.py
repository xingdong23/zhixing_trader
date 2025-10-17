"""
测试Yahoo Finance数据获取逻辑
"""
import pytest
import asyncio
import sys
import os
from datetime import datetime, timedelta
from typing import List

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.utils.market_data_helper import YahooFinanceProvider
from app.core.interfaces import KLineData


class TestYahooDataProvider:
    """测试Yahoo Finance数据提供者"""
    
    def setup_method(self):
        """测试前准备"""
        self.provider = YahooFinanceProvider(rate_limit_delay=0.1)  # 减少延迟以加快测试
        self.test_symbols = ["AAPL", "MSFT", "TSLA"]  # 测试用股票代码
    
    @pytest.mark.asyncio
    async def test_get_stock_data_daily(self):
        """测试获取日线数据"""
        print("\n🔍 测试获取日线数据...")
        
        symbol = "AAPL"
        period = "1mo"  # 1个月数据
        interval = "1d"  # 日线
        
        data = await self.provider.get_stock_data(symbol, period, interval)
        
        # 验证数据
        assert isinstance(data, list), "返回数据应该是列表"
        assert len(data) > 0, "应该返回至少一条数据"
        
        # 验证第一条数据
        first_kline = data[0]
        assert isinstance(first_kline, KLineData), "数据应该是KLineData类型"
        assert first_kline.symbol == symbol, f"股票代码应该是{symbol}"
        assert first_kline.open > 0, "开盘价应该大于0"
        assert first_kline.close > 0, "收盘价应该大于0"
        assert first_kline.high >= first_kline.close, "最高价应该大于等于收盘价"
        assert first_kline.low <= first_kline.close, "最低价应该小于等于收盘价"
        assert first_kline.volume >= 0, "成交量应该大于等于0"
        
        print(f"✅ 成功获取{symbol}的{len(data)}条日线数据")
        print(f"📊 最新数据: {data[-1].datetime.date()} - 收盘价: ${data[-1].close:.2f}")
    
    @pytest.mark.asyncio
    async def test_get_stock_data_hourly(self):
        """测试获取小时线数据"""
        print("\n🔍 测试获取小时线数据...")
        
        symbol = "MSFT"
        period = "5d"  # 5天数据
        interval = "1h"  # 小时线
        
        data = await self.provider.get_stock_data(symbol, period, interval)
        
        # 验证数据
        assert isinstance(data, list), "返回数据应该是列表"
        assert len(data) > 0, "应该返回至少一条数据"
        
        # 验证数据完整性
        for kline in data[:3]:  # 检查前3条数据
            assert kline.open > 0, "开盘价应该大于0"
            assert kline.close > 0, "收盘价应该大于0"
            assert kline.high >= max(kline.open, kline.close), "最高价应该大于等于开盘价和收盘价"
            assert kline.low <= min(kline.open, kline.close), "最低价应该小于等于开盘价和收盘价"
        
        print(f"✅ 成功获取{symbol}的{len(data)}条小时线数据")
        print(f"📊 数据时间范围: {data[0].datetime} 到 {data[-1].datetime}")
    
    @pytest.mark.asyncio
    async def test_get_stock_info(self):
        """测试获取股票基本信息"""
        print("\n🔍 测试获取股票基本信息...")
        
        symbol = "AAPL"
        info = await self.provider.get_stock_info(symbol)
        
        # 验证信息
        assert info is not None, "应该返回股票信息"
        assert isinstance(info, dict), "股票信息应该是字典格式"
        assert info.get('symbol') == symbol, f"股票代码应该是{symbol}"
        assert 'name' in info, "应该包含股票名称"
        assert 'current_price' in info, "应该包含当前价格"
        
        print(f"✅ 成功获取{symbol}的基本信息")
        print(f"📊 股票名称: {info.get('name', 'N/A')}")
        print(f"💰 当前价格: ${info.get('current_price', 0):.2f}")
        print(f"🏢 行业: {info.get('industry', 'N/A')}")
    
    @pytest.mark.asyncio
    async def test_validate_symbol(self):
        """测试股票代码验证"""
        print("\n🔍 测试股票代码验证...")
        
        # 测试有效代码
        valid_symbol = "AAPL"
        is_valid = await self.provider.validate_symbol(valid_symbol)
        assert is_valid == True, f"{valid_symbol}应该是有效的股票代码"
        print(f"✅ {valid_symbol} - 有效股票代码")
        
        # 测试无效代码
        invalid_symbol = "INVALID123"
        is_invalid = await self.provider.validate_symbol(invalid_symbol)
        assert is_invalid == False, f"{invalid_symbol}应该是无效的股票代码"
        print(f"❌ {invalid_symbol} - 无效股票代码")
    
    @pytest.mark.asyncio
    async def test_multiple_stocks_data(self):
        """测试批量获取多只股票数据"""
        print("\n🔍 测试批量获取多只股票数据...")
        
        symbols = ["AAPL", "MSFT", "GOOGL"]
        period = "1mo"
        interval = "1d"
        
        # 如果provider支持批量获取
        if hasattr(self.provider, 'get_multiple_stocks_data'):
            results = await self.provider.get_multiple_stocks_data(symbols, period, interval)
            
            assert isinstance(results, dict), "批量结果应该是字典格式"
            assert len(results) == len(symbols), "应该返回所有请求的股票数据"
            
            for symbol in symbols:
                assert symbol in results, f"结果中应该包含{symbol}"
                data = results[symbol]
                assert isinstance(data, list), f"{symbol}的数据应该是列表"
                assert len(data) > 0, f"{symbol}应该有数据"
                
            print(f"✅ 成功批量获取{len(symbols)}只股票数据")
            for symbol, data in results.items():
                print(f"📊 {symbol}: {len(data)}条数据")
        else:
            print("⚠️ 提供者不支持批量获取，跳过此测试")
    
    @pytest.mark.asyncio
    async def test_data_consistency(self):
        """测试数据一致性"""
        print("\n🔍 测试数据一致性...")
        
        symbol = "AAPL"
        
        # 获取两次相同的数据
        data1 = await self.provider.get_stock_data(symbol, "5d", "1d")
        await asyncio.sleep(1)  # 等待1秒
        data2 = await self.provider.get_stock_data(symbol, "5d", "1d")
        
        assert len(data1) > 0, "第一次获取应该有数据"
        assert len(data2) > 0, "第二次获取应该有数据"
        
        # 比较最后一条数据（可能会有微小差异，但日期应该相同）
        if len(data1) > 0 and len(data2) > 0:
            last1 = data1[-1]
            last2 = data2[-1]
            
            # 日期应该相同
            assert last1.datetime.date() == last2.datetime.date(), "最新数据的日期应该相同"
            
            # 价格差异应该在合理范围内（考虑到实时更新）
            price_diff = abs(last1.close - last2.close) / last1.close
            assert price_diff < 0.1, "价格差异应该小于10%"  # 允许10%的差异
        
        print(f"✅ 数据一致性检查通过")
    
    @pytest.mark.asyncio
    async def test_error_handling(self):
        """测试错误处理"""
        print("\n🔍 测试错误处理...")
        
        # 测试无效股票代码
        invalid_data = await self.provider.get_stock_data("INVALID123", "1mo", "1d")
        assert isinstance(invalid_data, list), "无效代码应该返回空列表"
        assert len(invalid_data) == 0, "无效代码应该返回空列表"
        print("✅ 无效股票代码处理正确")
        
        # 测试无效时间周期
        invalid_period_data = await self.provider.get_stock_data("AAPL", "invalid", "1d")
        assert isinstance(invalid_period_data, list), "无效周期应该返回空列表"
        print("✅ 无效时间周期处理正确")
    
    def test_data_structure(self):
        """测试数据结构"""
        print("\n🔍 测试KLineData数据结构...")
        
        # 创建测试数据
        test_kline = KLineData(
            datetime=datetime.now(),
            open=100.0,
            high=105.0,
            low=98.0,
            close=103.0,
            volume=1000000,
            symbol="TEST"
        )
        
        # 验证数据结构
        assert test_kline.symbol == "TEST"
        assert test_kline.open == 100.0
        assert test_kline.high == 105.0
        assert test_kline.low == 98.0
        assert test_kline.close == 103.0
        assert test_kline.volume == 1000000
        assert isinstance(test_kline.datetime, datetime)
        
        print("✅ KLineData数据结构正确")


# 运行测试的主函数
async def run_tests():
    """运行所有测试"""
    print("🎯 开始测试Yahoo Finance数据获取逻辑")
    print("=" * 60)
    
    test_instance = TestYahooDataProvider()
    test_instance.setup_method()
    
    try:
        # 运行所有异步测试
        await test_instance.test_get_stock_data_daily()
        await test_instance.test_get_stock_data_hourly()
        await test_instance.test_get_stock_info()
        await test_instance.test_validate_symbol()
        await test_instance.test_multiple_stocks_data()
        await test_instance.test_data_consistency()
        await test_instance.test_error_handling()
        
        # 运行同步测试
        test_instance.test_data_structure()
        
        print("\n" + "=" * 60)
        print("🎉 所有测试通过！Yahoo Finance数据获取逻辑正常工作")
        
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    # 直接运行测试
    asyncio.run(run_tests())
