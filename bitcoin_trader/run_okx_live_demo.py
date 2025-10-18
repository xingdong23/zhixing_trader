"""
OKX 模拟盘实盘交易 - 执行真实订单
运行较长时间以观察策略表现
"""
import asyncio
import sys
from pathlib import Path
from datetime import datetime

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
    print("🔥 Bitcoin Trader - OKX 模拟盘实盘交易")
    print("=" * 80)
    print("\n⚠️  注意: 这将在 OKX 模拟盘执行真实订单！")
    print("虽然是模拟盘，但订单执行流程与实盘相同")
    print("=" * 80)
    
    # 检查配置
    if not all([settings.OKX_API_KEY, settings.OKX_API_SECRET, settings.OKX_PASSPHRASE]):
        print("\n❌ 错误: 未配置 OKX API 密钥")
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
        # 1. 测试连接并显示初始状态
        print("\n【初始状态】")
        print(f"启动时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        balance = await exchange.fetch_balance()
        print("\n账户余额:")
        initial_balance = {}
        for currency in ['USDT', 'BTC', 'ETH']:
            if currency in balance['total']:
                amount = balance['total'][currency]
                initial_balance[currency] = amount
                print(f"  {currency}: {amount:.4f}")
        
        ticker = await exchange.fetch_ticker('BTC/USDT')
        initial_price = ticker['last']
        print(f"\nBTC/USDT 当前价格: {initial_price:,.2f} USDT")
        print(f"24h 涨跌: {ticker.get('percentage', 0):+.2f}%")
        
        # 2. 创建保守的交易策略
        print("\n" + "=" * 80)
        print("🚀 启动实盘交易机器人")
        print("=" * 80)
        
        strategy = SteadyProfitStrategy(parameters={
            "base_position_ratio": 0.005,      # 0.5% 基础仓位（更保守）
            "震荡市_系数": 0.2,
            "单边市_系数": 0.5,
            "max_daily_loss": 0.01,            # 1% 日亏损限制
            "atr_multiplier": 2.0,             # 更宽的止损
        })
        
        # 严格的风险限制
        risk_limits = RiskLimits(
            max_position_size=0.01,            # 最大 0.01 BTC
            max_position_value=500.0,          # 最大 500 USDT
            max_total_position=0.2,            # 总仓位 20%
            max_daily_loss=0.01,               # 日亏损 1%
            max_trades_per_day=5,              # 每日最多 5 笔
            max_consecutive_losses=2,          # 最多连续亏损 2 次
        )
        
        bot = TradingBot(
            exchange=exchange,
            strategy=strategy,
            symbol='BTC/USDT',
            timeframe='15m',
            initial_capital=1000.0,            # 使用较小的资金测试
            risk_limits=risk_limits,
            config={
                'mode': 'live',                # 实盘模式
                'check_interval': 60
            }
        )
        
        print("\n配置信息:")
        print(f"  交易所: OKX (模拟盘)")
        print(f"  交易对: BTC/USDT")
        print(f"  策略: 稳健盈利策略（保守配置）")
        print(f"  周期: 15分钟")
        print(f"  模式: Live Trading (执行真实订单)")
        print(f"  初始资金: 1,000 USDT")
        print(f"  最大仓位: 0.01 BTC (~{initial_price * 0.01:,.0f} USDT)")
        print(f"  单笔最大: 500 USDT")
        print(f"  日亏损限制: 1%")
        print(f"  每日最多交易: 5 笔")
        
        print("\n风险控制:")
        print("  ✓ 小仓位测试")
        print("  ✓ 严格止损")
        print("  ✓ 日亏损限制")
        print("  ✓ 交易次数限制")
        
        print("\n提示:")
        print("  - 机器人将运行 30 分钟用于测试")
        print("  - 使用 Ctrl+C 可以随时停止")
        print("  - 订单将在 OKX 模拟盘真实执行")
        print("  - 每隔 5 分钟会显示一次进度报告")
        print("\n" + "=" * 80 + "\n")
        
        # 3. 启动机器人
        bot_task = asyncio.create_task(bot.start())
        
        # 运行 30 分钟，每 5 分钟显示一次进度
        start_time = datetime.now()
        run_duration = 30 * 60  # 30 分钟
        report_interval = 5 * 60  # 5 分钟
        
        try:
            for i in range(6):  # 6 个 5 分钟周期
                await asyncio.sleep(report_interval)
                
                # 显示进度报告
                elapsed = (datetime.now() - start_time).total_seconds() / 60
                print("\n" + "=" * 80)
                print(f"📊 进度报告 (已运行 {elapsed:.0f} 分钟)")
                print("=" * 80)
                
                # 获取当前余额
                current_balance = await exchange.fetch_balance()
                print("\n当前余额:")
                for currency in ['USDT', 'BTC', 'ETH']:
                    if currency in current_balance['total']:
                        amount = current_balance['total'][currency]
                        initial = initial_balance.get(currency, 0)
                        change = amount - initial
                        print(f"  {currency}: {amount:.4f} (变化: {change:+.4f})")
                
                # 获取当前价格
                current_ticker = await exchange.fetch_ticker('BTC/USDT')
                current_price = current_ticker['last']
                price_change = (current_price - initial_price) / initial_price * 100
                print(f"\nBTC/USDT: {current_price:,.2f} USDT (变化: {price_change:+.2f}%)")
                
                # 显示机器人性能
                print("\n" + bot.get_performance_report())
                print(bot.risk_manager.get_risk_report())
                print("=" * 80 + "\n")
                
        except KeyboardInterrupt:
            print("\n\n⚠️  收到停止信号...")
        
        # 4. 停止机器人
        print("\n正在停止机器人...")
        await bot.stop()
        
        # 5. 最终报告
        print("\n" + "=" * 80)
        print("📊 最终交易报告")
        print("=" * 80)
        
        # 最终余额
        final_balance = await exchange.fetch_balance()
        print("\n【最终余额】")
        for currency in ['USDT', 'BTC', 'ETH']:
            if currency in final_balance['total']:
                final = final_balance['total'][currency]
                initial = initial_balance.get(currency, 0)
                change = final - initial
                change_pct = (change / initial * 100) if initial > 0 else 0
                print(f"  {currency}: {final:.4f} (变化: {change:+.4f}, {change_pct:+.2f}%)")
        
        # 价格变化
        final_ticker = await exchange.fetch_ticker('BTC/USDT')
        final_price = final_ticker['last']
        price_change = (final_price - initial_price) / initial_price * 100
        print(f"\nBTC/USDT 价格变化: {initial_price:,.2f} → {final_price:,.2f} ({price_change:+.2f}%)")
        
        # 机器人性能
        print("\n" + bot.get_performance_report())
        print(bot.risk_manager.get_risk_report())
        
        # 运行时间
        total_time = (datetime.now() - start_time).total_seconds() / 60
        print(f"\n总运行时间: {total_time:.1f} 分钟")
        
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
