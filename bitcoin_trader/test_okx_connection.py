#!/usr/bin/env python3
"""测试OKX API连接"""

import os
from dotenv import load_dotenv
import ccxt

load_dotenv()

# 获取API密钥
api_key = os.getenv("OKX_API_KEY")
api_secret = os.getenv("OKX_API_SECRET")
passphrase = os.getenv("OKX_PASSPHRASE")

print(f"API Key: {api_key[:10]}..." if api_key else "API Key: None")
print(f"API Secret: {'*' * 10}" if api_secret else "API Secret: None")
print(f"Passphrase: {'*' * 5}" if passphrase else "Passphrase: None")
print()

# 测试1: 创建交易所实例
print("=" * 60)
print("测试1: 创建OKX交易所实例")
print("=" * 60)

try:
    exchange = ccxt.okx({
        'apiKey': api_key,
        'secret': api_secret,
        'password': passphrase,
        'enableRateLimit': True,
        'hostname': 'www.okx.com',
        'options': {
            'defaultType': 'spot',
        }
    })
    
    # 设置沙盒模式
    exchange.set_sandbox_mode(True)
    print("✓ 交易所实例创建成功")
    print(f"  沙盒模式: 已启用")
    print(f"  API URL: {exchange.urls.get('api', {}).get('rest', 'N/A')}")
    print()
    
except Exception as e:
    print(f"✗ 创建失败: {e}")
    exit(1)

# 测试2: 获取市场信息
print("=" * 60)
print("测试2: 获取BTC/USDT市场信息")
print("=" * 60)

try:
    ticker = exchange.fetch_ticker('BTC/USDT')
    print("✓ 获取市场信息成功")
    print(f"  当前价格: ${ticker['last']:,.2f}")
    print(f"  24h最高: ${ticker['high']:,.2f}")
    print(f"  24h最低: ${ticker['low']:,.2f}")
    print(f"  24h成交量: {ticker['baseVolume']:,.2f} BTC")
    print()
    
except Exception as e:
    print(f"✗ 获取失败: {e}")
    print()

# 测试3: 获取K线数据
print("=" * 60)
print("测试3: 获取5分钟K线数据")
print("=" * 60)

try:
    ohlcv = exchange.fetch_ohlcv('BTC/USDT', '5m', limit=10)
    print(f"✓ 获取K线数据成功")
    print(f"  获取到 {len(ohlcv)} 根K线")
    
    if ohlcv:
        last_candle = ohlcv[-1]
        print(f"  最新K线:")
        print(f"    开盘: ${last_candle[1]:,.2f}")
        print(f"    最高: ${last_candle[2]:,.2f}")
        print(f"    最低: ${last_candle[3]:,.2f}")
        print(f"    收盘: ${last_candle[4]:,.2f}")
        print(f"    成交量: {last_candle[5]:,.4f}")
    print()
    
except Exception as e:
    print(f"✗ 获取失败: {e}")
    import traceback
    traceback.print_exc()
    print()

# 测试4: 获取账户余额（需要API权限）
print("=" * 60)
print("测试4: 获取账户余额")
print("=" * 60)

try:
    balance = exchange.fetch_balance()
    print("✓ 获取账户余额成功")
    
    # 显示USDT余额
    if 'USDT' in balance['total']:
        usdt_balance = balance['total']['USDT']
        print(f"  USDT余额: ${usdt_balance:,.2f}")
    
    # 显示BTC余额
    if 'BTC' in balance['total']:
        btc_balance = balance['total']['BTC']
        print(f"  BTC余额: {btc_balance:.8f}")
    
    print()
    
except Exception as e:
    print(f"✗ 获取失败: {e}")
    print("  (这可能是因为API权限不足或沙盒账户未初始化)")
    print()

print("=" * 60)
print("测试完成")
print("=" * 60)
