"""
测试 OKX 连接（支持代理）
"""
import asyncio
import ccxt.async_support as ccxt_async
from app.config import settings
import os

async def test_with_proxy():
    """使用代理测试 OKX 连接"""
    print("=" * 80)
    print("OKX 连接测试（代理模式）")
    print("=" * 80)
    
    # 从环境变量读取代理配置
    http_proxy = os.getenv('HTTP_PROXY') or os.getenv('http_proxy')
    https_proxy = os.getenv('HTTPS_PROXY') or os.getenv('https_proxy')
    
    print(f"\n代理配置:")
    print(f"  HTTP_PROXY: {http_proxy or '未配置'}")
    print(f"  HTTPS_PROXY: {https_proxy or '未配置'}")
    
    if not http_proxy and not https_proxy:
        print("\n⚠️  未检测到代理配置")
        print("\n如果需要使用代理，请设置环境变量:")
        print("  export HTTP_PROXY=http://127.0.0.1:7890")
        print("  export HTTPS_PROXY=http://127.0.0.1:7890")
        print("\n或者在运行时指定:")
        print("  HTTP_PROXY=http://127.0.0.1:7890 python3 test_okx_with_proxy.py")
    
    # 配置代理
    proxies = {}
    if http_proxy:
        proxies['http'] = http_proxy
    if https_proxy:
        proxies['https'] = https_proxy
    
    # 创建交易所实例
    exchange_config = {
        'apiKey': settings.OKX_API_KEY,
        'secret': settings.OKX_API_SECRET,
        'password': settings.OKX_PASSPHRASE,
        'enableRateLimit': True,
        'timeout': 30000,
    }
    
    if proxies:
        exchange_config['proxies'] = proxies
        exchange_config['aiohttp_proxy'] = https_proxy or http_proxy
    
    exchange = ccxt_async.okx(exchange_config)
    exchange.set_sandbox_mode(True)
    
    try:
        print("\n【测试连接】")
        print("正在连接 OKX 模拟盘...")
        
        # 获取账户余额
        balance = await exchange.fetch_balance()
        print("✅ 连接成功！")
        
        # 显示余额
        print("\n【账户余额】")
        has_balance = False
        for currency in ['USDT', 'BTC', 'ETH', 'USDC']:
            if currency in balance['total'] and balance['total'][currency] > 0:
                print(f"  {currency}: {balance['total'][currency]:.4f}")
                has_balance = True
        
        if not has_balance:
            print("  账户余额为空")
            print("\n💡 提示: 请先在 OKX 模拟盘申请模拟资金")
        
        # 获取市场行情
        print("\n【市场行情】")
        ticker = await exchange.fetch_ticker('BTC/USDT')
        print(f"  BTC/USDT: {ticker['last']:,.2f} USDT")
        print(f"  24h 涨跌: {ticker.get('percentage', 0):+.2f}%")
        
        print("\n✅ OKX 模拟盘连接测试成功！")
        
    except Exception as e:
        print(f"\n❌ 连接失败: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        await exchange.close()

if __name__ == "__main__":
    asyncio.run(test_with_proxy())
