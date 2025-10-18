"""
直接运行 OKX 模拟交易（无交互）
"""
import asyncio
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

import ccxt.async_support as ccxt_async
from app.core.trading_bot import TradingBot
from app.core.strategies import SteadyProfitStrategy
from app.core.risk_manager import RiskLimits
from app.config import settings


async def main():
    """主函数"""
    print("\n" + "=" * 80)
    print("🪙 Bitcoin Trader - OKX 模拟交易")
    print("=" * 80)
    
    # 检查配置
    if not all([settings.OKX_API_KEY, settings.OKX_API_SECRET, settings.OKX_PASSPHRASE]):
        print("\n❌ 错误: 未配置 OKX API 密钥")
        print("请在 .env 文件中配置 OKX API 信息")
        return
    
    # 创建 OKX 交易所实例
    exchange = ccxt_async.okx({
        'apiKey': settings.OKX_API_KEY,
        'secret': settings.OKX_API_SECRET,
        'password': settings.OKX_PASSPHRASE,
        'enableRateLimit': True,
    })
    
    # 设置为模拟盘
    exchange.set_sandbox_mode(True)
    
    try:
        # 1. 测试连接
        print("\n【测试连接】")
        print("正在连接 OKX 模拟盘...")
        balance = await exchange.fetch_balance()
        
        print("✅ 连接成功！")
        print("\n【账户余额】")
        for currency in ['USDT', 'BTC', 'ETH']:
            if currency in balance['total'] and balance['total'][currency] > 0:
                print(f"  {currency}: {balance['total'][currency]:.4f}")
        
        ticker = await exchange.fetch_ticker('BTC/USDT')
        print(f"\n【当前行情】")
        print(f"  BTC/USDT: {ticker['last']:,.2f} USDT")
        print(f"  24h 涨跌: {ticker.get('percentage', 0):+.2f}%")
        
        # 2. 创建交易策略
        print("\n" + "=" * 80)
        print("🚀 启动模拟交易机器人")
        print("=" * 80)
        
        strategy = SteadyProfitStrategy(parameters={
            "base_position_ratio": 0.01,       # 1% 基础仓位
            "震荡市_系数": 0.3,
            "单边市_系数": 0.6,
            "max_daily_loss": 0.02,            # 2% 日亏损限制
            "atr_multiplier": 1.5,
        })
        
        risk_limits = RiskLimits(
            max_position_size=0.05,            # 最大 0.05 BTC
            max_position_value=2000.0,         # 最大 2000 USDT
            max_total_position=0.3,            # 总仓位 30%
            max_daily_loss=0.02,               # 日亏损 2%
            max_trades_per_day=10,             # 每日最多 10 笔
            max_consecutive_losses=3,          # 最多连续亏损 3 次
        )
        
        bot = TradingBot(
            exchange=exchange,
            strategy=strategy,
            symbol='BTC/USDT',
            timeframe='15m',
            initial_capital=10000.0,
            risk_limits=risk_limits,
            config={
                'mode': 'paper',               # Paper Trading 模式
                'check_interval': 60
            }
        )
        
        print("\n配置信息:")
        print(f"  交易所: OKX (模拟盘)")
        print(f"  交易对: BTC/USDT")
        print(f"  策略: 稳健盈利策略")
        print(f"  周期: 15分钟")
        print(f"  模式: Paper Trading (不执行真实订单)")
        print(f"  初始资金: 10,000 USDT")
        print(f"  最大仓位: 0.05 BTC")
        print(f"  日亏损限制: 2%")
        
        print("\n提示:")
        print("  - 机器人将运行 5 分钟用于演示")
        print("  - 使用 Ctrl+C 可以随时停止")
        print("  - 所有交易都是模拟的，不会执行真实订单")
        print("\n" + "=" * 80 + "\n")
        
        # 3. 启动机器人
        bot_task = asyncio.create_task(bot.start())
        
        # 运行 5 分钟
        try:
            await asyncio.sleep(300)  # 5 分钟
        except KeyboardInterrupt:
            print("\n\n⚠️  收到停止信号...")
        
        # 停止机器人
        print("\n正在停止机器人...")
        await bot.stop()
        
        # 打印报告
        print("\n" + "=" * 80)
        print("📊 交易报告")
        print("=" * 80)
        print(bot.get_performance_report())
        print(bot.risk_manager.get_risk_report())
        
    except Exception as e:
        print(f"\n❌ 运行出错: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        await exchange.close()
        print("\n" + "=" * 80)
        print("👋 感谢使用 Bitcoin Trader")
        print("=" * 80)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n👋 程序已退出")
    except Exception as e:
        print(f"\n❌ 程序错误: {e}")
        import traceback
        traceback.print_exc()
