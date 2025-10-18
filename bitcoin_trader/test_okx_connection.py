"""
测试 OKX 连接的诊断脚本
"""
import asyncio
import ccxt.async_support as ccxt_async
from app.config import settings

async def diagnose_okx():
    """诊断 OKX 连接问题"""
    print("=" * 80)
    print("OKX 连接诊断")
    print("=" * 80)
    
    # 1. 检查配置
    print("\n【配置检查】")
    print(f"OKX_API_KEY: {'已配置' if settings.OKX_API_KEY else '❌ 未配置'}")
    print(f"OKX_API_SECRET: {'已配置' if settings.OKX_API_SECRET else '❌ 未配置'}")
    print(f"OKX_PASSPHRASE: {'已配置' if settings.OKX_PASSPHRASE else '❌ 未配置'}")
    print(f"OKX_TESTNET: {settings.OKX_TESTNET}")
    
    if not all([settings.OKX_API_KEY, settings.OKX_API_SECRET, settings.OKX_PASSPHRASE]):
        print("\n❌ API 配置不完整，请检查 .env 文件")
        return
    
    # 显示部分 API Key（用于确认）
    if settings.OKX_API_KEY:
        masked_key = settings.OKX_API_KEY[:8] + "..." + settings.OKX_API_KEY[-4:]
        print(f"API Key (部分): {masked_key}")
    
    # 2. 测试公共接口（不需要认证）
    print("\n【测试公共接口】")
    exchange = ccxt_async.okx({
        'enableRateLimit': True,
        'timeout': 30000,  # 30秒超时
    })
    
    try:
        print("正在获取服务器时间...")
        time_response = await exchange.fetch_time()
        print(f"✅ 服务器时间: {time_response}")
        
        print("\n正在获取 BTC/USDT 行情...")
        ticker = await exchange.fetch_ticker('BTC/USDT')
        print(f"✅ BTC/USDT 价格: {ticker['last']:,.2f} USDT")
        
    except Exception as e:
        print(f"❌ 公共接口测试失败: {e}")
        print("\n可能的原因:")
        print("  1. 网络连接问题")
        print("  2. 无法访问 OKX 服务器")
        print("  3. 需要配置代理")
        await exchange.close()
        return
    
    await exchange.close()
    
    # 3. 测试认证接口（需要 API 密钥）
    print("\n【测试认证接口】")
    exchange = ccxt_async.okx({
        'apiKey': settings.OKX_API_KEY,
        'secret': settings.OKX_API_SECRET,
        'password': settings.OKX_PASSPHRASE,
        'enableRateLimit': True,
        'timeout': 30000,
    })
    
    # 设置为模拟盘
    exchange.set_sandbox_mode(True)
    print(f"模拟盘模式: {exchange.urls.get('api', {})}")
    
    try:
        print("\n正在获取账户余额...")
        balance = await exchange.fetch_balance()
        print("✅ 账户余额获取成功！")
        
        # 显示余额
        print("\n【账户余额】")
        has_balance = False
        for currency in ['USDT', 'BTC', 'ETH', 'USDC']:
            if currency in balance['total'] and balance['total'][currency] > 0:
                print(f"  {currency}: {balance['total'][currency]:.4f}")
                has_balance = True
        
        if not has_balance:
            print("  账户余额为空")
            print("\n提示: 模拟盘账户需要先充值模拟资金")
            print("  1. 登录 OKX 网站")
            print("  2. 进入模拟交易页面")
            print("  3. 申请模拟资金")
        
        print("\n✅ OKX 模拟盘连接成功！")
        
    except ccxt_async.AuthenticationError as e:
        print(f"❌ 认证失败: {e}")
        print("\n可能的原因:")
        print("  1. API Key、Secret 或 Passphrase 错误")
        print("  2. API 权限不足")
        print("  3. API 已过期或被删除")
        print("\n请检查:")
        print("  1. 登录 OKX 网站确认 API 密钥是否有效")
        print("  2. 确认 API 权限包含 '读取' 和 '交易'")
        print("  3. 确认使用的是模拟盘 API（不是实盘 API）")
        
    except ccxt_async.NetworkError as e:
        print(f"❌ 网络错误: {e}")
        print("\n可能的原因:")
        print("  1. 网络连接不稳定")
        print("  2. 防火墙阻止")
        print("  3. 需要配置代理")
        
    except Exception as e:
        print(f"❌ 未知错误: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        await exchange.close()

if __name__ == "__main__":
    asyncio.run(diagnose_okx())
