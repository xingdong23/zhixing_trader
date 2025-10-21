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
from app.core.strategies import EMATrendStrategy
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
        
        # 获取当前持仓（尝试多种方式）
        print("\n当前持仓:")
        existing_positions = []
        try:
            # 方式1: fetch_positions
            positions = await exchange.fetch_positions(['BTC/USDT'])
            print(f"  [调试] fetch_positions返回: {len(positions)}条")
            
            has_position = False
            for pos in positions:
                contracts = pos.get('contracts', 0)
                info = pos.get('info', {})
                print(f"  [调试] 持仓数据: contracts={contracts}, info keys={list(info.keys())[:5]}")
                
                if contracts > 0 or abs(float(info.get('pos', 0))) > 0:
                    has_position = True
                    side = pos.get('side', info.get('posSide', 'unknown'))
                    size = contracts if contracts > 0 else abs(float(info.get('pos', 0)))
                    entry_price = pos.get('entryPrice', float(info.get('avgPx', 0)))
                    unrealized_pnl = pos.get('unrealizedPnl', float(info.get('upl', 0)))
                    
                    print(f"  方向: {side}")
                    print(f"  数量: {size} BTC")
                    print(f"  入场价: {entry_price:.2f} USDT")
                    print(f"  未实现盈亏: {unrealized_pnl:.2f} USDT")
                    
                    # 保存持仓信息
                    existing_positions.append({
                        'symbol': 'BTC/USDT',
                        'side': 'long' if side in ['long', 'buy'] else 'short',
                        'size': size,
                        'entry_price': entry_price
                    })
            
            if not has_position:
                print("  无持仓")
        except Exception as e:
            print(f"  获取持仓失败: {e}")
            print(f"  [调试] 错误详情: {type(e).__name__}")
            import traceback
            traceback.print_exc()
            print("  将从空仓开始交易")
        
        ticker = await exchange.fetch_ticker('BTC/USDT')
        initial_price = ticker['last']
        print(f"\nBTC/USDT 当前价格: {initial_price:,.2f} USDT")
        print(f"24h 涨跌: {ticker.get('percentage', 0):+.2f}%")
        
        # 2. 创建保守的交易策略
        print("\n" + "=" * 80)
        print("🚀 启动实盘交易机器人")
        print("=" * 80)
        
        strategy = EMATrendStrategy(parameters={
            "position_ratio": 0.1,             # 10% 仓位（改为10%）
            "max_loss_ratio": 0.04,            # 最大亏损4%
            "atr_multiplier": 2.0,             # ATR倍数
            "first_profit_target": 0.05,       # 第一目标5%
            "second_profit_target": 0.10,      # 第二目标10%
            "third_profit_target": 0.15,       # 第三目标15%
        })
        
        # 计算实际可用资金（基于USDT余额）
        usdt_balance = initial_balance.get('USDT', 1000.0)
        
        # 风险限制（移除所有仓位限制）
        risk_limits = RiskLimits(
            max_position_size=999.0,           # 不限制单笔BTC数量
            max_position_value=999999.0,       # 不限制单笔金额
            max_total_position=1.0,            # 不限制总仓位（100%）
            max_daily_loss=0.05,               # 日亏损 5%
            max_trades_per_day=999,            # 不限制交易次数
            max_consecutive_losses=5,          # 最多连续亏损 5 次
        )
        
        bot = TradingBot(
            exchange=exchange,
            strategy=strategy,
            symbol='BTC/USDT',
            timeframe='5m',                # 5分钟K线
            initial_capital=usdt_balance,      # 使用实际USDT余额
            risk_limits=risk_limits,
            config={
                'mode': 'live',                # 实盘模式
                'check_interval': 30           # 30秒检查一次
            }
        )
        
        # 同步现有持仓到风险管理器
        if existing_positions:
            print("\n同步现有持仓到风险管理器...")
            for pos in existing_positions:
                bot.risk_manager.update_position(pos['symbol'], pos)
                print(f"  ✓ 已同步 {pos['side']} {pos['size']} BTC @ {pos['entry_price']:.2f}")
        
        print("\n配置信息:")
        print("  交易所: OKX (模拟盘)")
        print("  交易对: BTC/USDT")
        print("  策略: EMA趋势跟随策略")
        print("  周期: 5分钟")
        print("  模式: Live Trading (执行真实订单)")
        print(f"  可用资金: {usdt_balance:,.2f} USDT")
        print(f"  单笔仓位: 10% (~{usdt_balance * 0.1:,.2f} USDT)")
        print("  单笔金额: 不限制")
        print("  日亏损限制: 5%")
        print("  交易次数: 不限制")
        
        print("\n风险控制:")
        print("  ✓ 小仓位交易（10%）")
        print("  ✓ 同时只持有一笔")
        print("  ✓ 动态止损（ATR × 2）")
        print("  ✓ 日亏损限制 5%")
        print("  ✓ 平仓后才开新仓")
        
        print("\n提示:")
        print("  - 机器人将持续运行，直到手动停止")
        print("  - 使用 Ctrl+C 可以随时停止")
        print("  - 订单将在 OKX 模拟盘真实执行")
        print("  - 每隔 10 分钟会显示一次进度报告")
        print("  - 启动时已获取现有持仓信息")
        print("  - 每次只开一笔新仓，使用10%资金")
        print("\n" + "=" * 80 + "\n")
        
        # 3. 启动机器人
        bot_task = asyncio.create_task(bot.start())
        
        # 持续运行，每 10 分钟显示一次进度
        start_time = datetime.now()
        report_interval = 10 * 60  # 10 分钟
        report_count = 0
        
        try:
            while True:  # 持续运行
                await asyncio.sleep(report_interval)
                report_count += 1
                
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
