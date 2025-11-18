#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
环境测试脚本 - 验证资金费率套利机器人环境配置

运行方法：
    python strategies/funding_arbitrage/test_setup.py
"""

import sys
import os

def test_imports():
    """测试必要的包是否已安装"""
    print("=" * 60)
    print("📦 测试Python包...")
    print("=" * 60)
    
    required_packages = {
        'ccxt': 'CCXT交易所库',
        'requests': 'HTTP请求库',
        'numpy': 'NumPy数值计算库',
        'logging': 'Python标准日志库',
    }
    
    missing_packages = []
    
    for package, description in required_packages.items():
        try:
            __import__(package)
            print(f"✅ {package:15s} - {description}")
        except ImportError:
            print(f"❌ {package:15s} - {description} (未安装)")
            missing_packages.append(package)
    
    if missing_packages:
        print("\n" + "=" * 60)
        print("⚠️  缺少以下包，请安装：")
        print("=" * 60)
        print(f"pip install {' '.join(missing_packages)}")
        return False
    
    print("\n✅ 所有必需的包已安装！")
    return True


def test_env_file():
    """测试.env文件配置"""
    print("\n" + "=" * 60)
    print("🔑 测试API配置...")
    print("=" * 60)
    
    env_file = ".env"
    
    if not os.path.exists(env_file):
        print(f"❌ 未找到 {env_file} 文件")
        print("\n请创建.env文件并配置API密钥：")
        print("  cp .env.example .env")
        print("  然后编辑.env文件填入真实的API密钥")
        return False
    
    print(f"✅ 找到 {env_file} 文件")
    
    # 尝试加载环境变量
    try:
        from dotenv import load_dotenv
        load_dotenv()
        
        required_vars = ['OKX_API_KEY', 'OKX_SECRET_KEY', 'OKX_PASSPHRASE']
        missing_vars = []
        
        for var in required_vars:
            value = os.getenv(var, '')
            if not value or value.startswith('your_'):
                print(f"⚠️  {var:20s} - 未配置或使用默认值")
                missing_vars.append(var)
            else:
                masked_value = value[:4] + '***' + value[-4:] if len(value) > 8 else '***'
                print(f"✅ {var:20s} - {masked_value}")
        
        if missing_vars:
            print("\n⚠️  请在.env文件中配置以下变量：")
            for var in missing_vars:
                print(f"  {var}=你的值")
            return False
        
        print("\n✅ API配置完整！")
        return True
        
    except ImportError:
        print("⚠️  python-dotenv未安装，跳过环境变量检查")
        print("   安装: pip install python-dotenv")
        return True


def test_strategy_files():
    """测试策略文件是否存在"""
    print("\n" + "=" * 60)
    print("📁 测试策略文件...")
    print("=" * 60)
    
    required_files = [
        'strategies/funding_arbitrage/strategy.py',
        'strategies/funding_arbitrage/config.json',
        'strategies/funding_arbitrage/README.md',
        'live_trading/funding_arbitrage.py',
        'live_trading/start_funding_arbitrage.sh',
    ]
    
    all_exist = True
    
    for file_path in required_files:
        if os.path.exists(file_path):
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path} (未找到)")
            all_exist = False
    
    if all_exist:
        print("\n✅ 所有策略文件完整！")
    else:
        print("\n❌ 部分文件缺失")
    
    return all_exist


def test_ccxt_connection():
    """测试CCXT连接"""
    print("\n" + "=" * 60)
    print("🌐 测试OKX连接...")
    print("=" * 60)
    
    try:
        import ccxt
        
        # 创建OKX交易所实例（不需要API密钥的公开接口）
        exchange = ccxt.okx({
            'enableRateLimit': True,
        })
        
        # 测试获取ETH-USDT价格
        ticker = exchange.fetch_ticker('ETH/USDT')
        price = ticker['last']
        
        print(f"✅ 成功连接OKX")
        print(f"✅ ETH/USDT 当前价格: ${price:.2f}")
        
        # 测试获取资金费率
        funding_rate_data = exchange.fetch_funding_rate('ETH/USDT:USDT')
        funding_rate = funding_rate_data.get('fundingRate', 0.0)
        
        print(f"✅ ETH 资金费率: {funding_rate*100:.4f}%")
        
        return True
        
    except Exception as e:
        print(f"❌ 连接失败: {e}")
        return False


def main():
    """主测试函数"""
    print("\n")
    print("🤖 资金费率套利机器人 - 环境测试")
    print("=" * 60)
    
    results = []
    
    # 运行所有测试
    results.append(("包依赖", test_imports()))
    results.append(("策略文件", test_strategy_files()))
    results.append(("API配置", test_env_file()))
    results.append(("OKX连接", test_ccxt_connection()))
    
    # 汇总结果
    print("\n" + "=" * 60)
    print("📊 测试结果汇总")
    print("=" * 60)
    
    for name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{name:15s}: {status}")
    
    all_passed = all(result for _, result in results)
    
    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 所有测试通过！环境配置完成！")
        print("=" * 60)
        print("\n下一步：")
        print("  1. 启动模拟盘测试:")
        print("     bash live_trading/start_funding_arbitrage.sh paper")
        print("\n  2. 查看详细文档:")
        print("     cat strategies/funding_arbitrage/README.md")
    else:
        print("⚠️  部分测试失败，请检查上述错误信息")
        print("=" * 60)
        print("\n需要帮助？查看快速开始指南:")
        print("  cat strategies/funding_arbitrage/QUICKSTART.md")
    
    print("\n")
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
