#!/usr/bin/env python3
"""
测试运行器
运行Yahoo Finance数据获取和保存的核心测试
"""
import asyncio
import sys
import os
from datetime import datetime

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 导入测试模块
from tests.test_yahoo_data import run_tests as run_yahoo_tests
from tests.test_data_persistence import run_persistence_tests


async def main():
    """主测试函数"""
    print("🎯 知行交易系统 - 核心数据测试")
    print("=" * 80)
    print(f"⏰ 测试开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    total_tests = 0
    passed_tests = 0
    
    try:
        # 1. 测试Yahoo Finance数据获取
        print("📡 第一部分: Yahoo Finance数据获取测试")
        print("-" * 50)
        await run_yahoo_tests()
        passed_tests += 1
        total_tests += 1
        
        print("\n" + "=" * 80)
        
        # 2. 测试数据持久化
        print("💾 第二部分: 数据持久化测试")
        print("-" * 50)
        await run_persistence_tests()
        passed_tests += 1
        total_tests += 1
        
    except Exception as e:
        print(f"\n❌ 测试执行失败: {e}")
        import traceback
        traceback.print_exc()
        total_tests += 1
    
    # 输出测试总结
    print("\n" + "=" * 80)
    print("📊 测试总结")
    print("-" * 50)
    print(f"✅ 通过测试: {passed_tests}/{total_tests}")
    print(f"⏰ 测试结束时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    if passed_tests == total_tests:
        print("🎉 所有核心测试通过！Yahoo Finance数据获取和保存逻辑正常工作")
        return True
    else:
        print("❌ 部分测试失败，请检查错误信息")
        return False


def check_dependencies():
    """检查测试依赖"""
    print("🔍 检查测试依赖...")
    
    required_packages = [
        'yfinance',
        'pandas', 
        'numpy',
        'asyncio'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
            print(f"✅ {package}")
        except ImportError:
            missing_packages.append(package)
            print(f"❌ {package} - 缺失")
    
    if missing_packages:
        print(f"\n⚠️ 缺少依赖包: {', '.join(missing_packages)}")
        print("请运行: pip install -r requirements.txt")
        return False
    
    print("✅ 所有依赖检查通过")
    return True


def test_basic_imports():
    """测试基础导入"""
    print("\n🔍 测试基础导入...")
    
    try:
        from app.core.market_data.yahoo_provider import YahooFinanceProvider
        print("✅ YahooFinanceProvider 导入成功")
        
        from app.core.interfaces import KLineData
        print("✅ KLineData 导入成功")
        
        from app.services.market_data_service import MarketDataService
        print("✅ MarketDataService 导入成功")
        
        return True
        
    except Exception as e:
        print(f"❌ 导入失败: {e}")
        return False


if __name__ == "__main__":
    print("🚀 启动测试运行器...")
    
    # 检查依赖
    if not check_dependencies():
        sys.exit(1)
    
    # 测试基础导入
    if not test_basic_imports():
        sys.exit(1)
    
    print("\n" + "=" * 80)
    
    # 运行主测试
    try:
        success = asyncio.run(main())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n🛑 测试被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 测试运行器异常: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
