#!/usr/bin/env python3
"""
Market Data Service 安装验证脚本
快速检查模块是否正确配置
"""

import sys
from pathlib import Path

print("=" * 60)
print("Market Data Service 安装验证")
print("=" * 60)

# 1. 检查目录结构
print("\n【步骤1】检查目录结构...")
required_dirs = [
    'market_data',
    'market_data/providers',
    'scripts',
    'examples',
    'docs',
]

all_dirs_exist = True
for dir_name in required_dirs:
    dir_path = Path(__file__).parent / dir_name
    if dir_path.exists():
        print(f"✅ {dir_name}")
    else:
        print(f"❌ {dir_name} - 不存在")
        all_dirs_exist = False

# 2. 检查关键文件
print("\n【步骤2】检查关键文件...")
required_files = [
    'market_data/__init__.py',
    'market_data/interfaces.py',
    'market_data/providers/__init__.py',
    'market_data/providers/yahoo_provider.py',
    'market_data/providers/alphavantage_provider.py',
    'config.py',
    'requirements.txt',
    'README.md',
    'INTEGRATION_GUIDE.md',
]

all_files_exist = True
for file_name in required_files:
    file_path = Path(__file__).parent / file_name
    if file_path.exists():
        print(f"✅ {file_name}")
    else:
        print(f"❌ {file_name} - 不存在")
        all_files_exist = False

# 3. 检查Python依赖
print("\n【步骤3】检查Python依赖...")
required_packages = {
    'requests': 'requests',
    'pandas': 'pandas',
    'yfinance': 'yfinance',
    'loguru': 'loguru',
    'pydantic': 'pydantic',
    'pydantic_settings': 'pydantic-settings',
}

missing_packages = []
for package_name, install_name in required_packages.items():
    try:
        __import__(package_name)
        print(f"✅ {install_name}")
    except ImportError:
        print(f"❌ {install_name} - 未安装")
        missing_packages.append(install_name)

# 4. 测试导入
print("\n【步骤4】测试模块导入...")
try:
    from market_data import (
        YahooFinanceProvider,
        AlphaVantageProvider,
        MultiProviderStrategy,
    )
    print("✅ 核心模块导入成功")
    can_import = True
except Exception as e:
    print(f"❌ 导入失败: {e}")
    can_import = False

# 5. 检查配置
print("\n【步骤5】检查配置...")
try:
    from config import settings
    print("✅ 配置模块加载成功")
    
    # 检查.env文件
    env_file = Path(__file__).parent / '.env'
    if env_file.exists():
        print("✅ .env 文件存在")
    else:
        print("⚠️  .env 文件不存在（可选）")
        print("   如需配置API Key，请复制 env.example 为 .env")
    
    config_ok = True
except Exception as e:
    print(f"❌ 配置加载失败: {e}")
    config_ok = False

# 6. 总结
print("\n" + "=" * 60)
print("验证结果总结")
print("=" * 60)

if all_dirs_exist and all_files_exist and not missing_packages and can_import and config_ok:
    print("\n✅ 所有检查通过！市场数据服务已正确安装。")
    print("\n📚 下一步:")
    print("1. 如需使用API数据源，配置API Keys:")
    print("   cp env.example .env")
    print("   # 编辑 .env 文件填入API Keys")
    print("\n2. 运行示例:")
    print("   python examples/quick_start.py")
    print("\n3. 运行测试:")
    print("   python scripts/test_multi_data_sources.py")
    sys.exit(0)
else:
    print("\n❌ 部分检查未通过，请修复以下问题:\n")
    
    if not all_dirs_exist:
        print("- 目录结构不完整")
    
    if not all_files_exist:
        print("- 关键文件缺失")
    
    if missing_packages:
        print(f"- 缺少Python包: {', '.join(missing_packages)}")
        print(f"  安装命令: pip install {' '.join(missing_packages)}")
    
    if not can_import:
        print("- 模块导入失败")
    
    if not config_ok:
        print("- 配置加载失败")
    
    sys.exit(1)


