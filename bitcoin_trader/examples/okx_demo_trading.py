"""
OKX 模拟账户交易示例

使用 OKX 模拟盘测试完整的自动交易流程
"""
import sys
import asyncio
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

import ccxt.async_support as ccxt_async
from app.core.trading_bot import TradingBot
from app.core.strategies import SteadyProfitStrategy
from app.core.risk_manager import RiskLimits
from app.config import settings


async def test_okx_connection():
    """测试 OKX 连接"""
    print("=" * 80)
    print("步骤1: 测试 OKX 模拟账户连接")
    print("=" * 80)
    
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
        print("\n正在连接 OKX 模拟盘...")
        
        # 1. 获取账户余额
        print("\n【账户余额】")
        balance = await exchange.fetch_balance()
        
        # 显示主要币种余额
        for currency in ['USDT', 'BTC', 'ETH']:
            if currency in balance['total'] and balance['total'][currency] > 0:
                print(f"  {currency}: {balance['total'][currency]:.4f}")
        
        # 2. 获取市场信息
        print("\n【市场信息】")
        ticker = await exchange.fetch_ticker('BTC/USDT')
        print(f"  BTC/USDT 当前价格: {ticker['last']:,.2f} USDT")
        print(f"  24h 涨跌幅: {ticker.get('percentage', 0):+.2f}%")
        print(f"  24h 成交量: {ticker.get('volume', 0):,.2f} BTC")
        
        # 3. 测试获取K线数据
        print("\n【K线数据】")
        ohlcv = await exchange.fetch_ohlcv('BTC/USDT', '15m', limit=5)
        print(f"  获取最近 5 根 15分钟 K线:")
        for candle in ohlcv[-3:]:
            timestamp = candle[0]
            close = candle[4]
            print(f"    收盘价: {close:,.2f}")
        
        print("\n✅ OKX 模拟账户连接成功！")
        return True
        
    except Exception as e:
        print(f"\n❌ 连接失败: {e}")
        print("\n请检查:")
        print("  1. .env 文件中的 OKX API 配置是否正确")
        print("  2. API 密钥是否有效")
        print("  3. 是否已开通模拟盘")
        return False
        
    finally:
        await exchange.close()


async def run_okx_paper_trading():
    """运行 OKX 模拟交易"""
    print("\n" + "=" * 80)
    print("步骤2: 启动 OKX 自动交易机器人（模拟模式）")
    print("=" * 80)
    
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
        # 创建保守型策略
        strategy = SteadyProfitStrategy(parameters={
            "base_position_ratio": 0.01,       # 1% 基础仓位
            "震荡市_系数": 0.3,
            "单边市_系数": 0.6,
            "max_daily_loss": 0.02,            # 2% 日亏损限制
            "atr_multiplier": 1.5,
        })
        
        # 配置风险限制
        risk_limits = RiskLimits(
            max_position_size=0.05,            # 最大 0.05 BTC
            max_position_value=2000.0,         # 最大 2000 USDT
            max_total_position=0.3,            # 总仓位 30%
            max_daily_loss=0.02,               # 日亏损 2%
            max_trades_per_day=10,             # 每日最多 10 笔
            max_consecutive_losses=3,          # 最多连续亏损 3 次
        )
        
        # 创建交易机器人
        bot = TradingBot(
            exchange=exchange,
            strategy=strategy,
            symbol='BTC/USDT',
            timeframe='15m',
            initial_capital=10000.0,           # 模拟 10000 USDT
            risk_limits=risk_limits,
            config={
                'mode': 'paper',               # 使用 paper 模式（不执行真实订单）
                'check_interval': 60           # 每 60 秒检查一次
            }
        )
        
        print("\n配置信息:")
        print(f"  交易所: OKX (模拟盘)")
        print(f"  交易对: BTC/USDT")
        print(f"  策略: 稳健盈利策略")
        print(f"  周期: 15分钟")
        print(f"  模式: Paper Trading (模拟)")
        print(f"  初始资金: 10,000 USDT")
        print(f"  最大仓位: 0.05 BTC")
        print(f"  日亏损限制: 2%")
        
        print("\n" + "=" * 80)
        print("🚀 机器人启动中...")
        print("=" * 80)
        print("\n提示:")
        print("  - 机器人将运行 5 分钟用于演示")
        print("  - 使用 Ctrl+C 可以随时停止")
        print("  - 所有交易都是模拟的，不会执行真实订单")
        print("\n" + "=" * 80 + "\n")
        
        # 创建机器人任务
        bot_task = asyncio.create_task(bot.start())
        
        # 运行 5 分钟
        try:
            await asyncio.sleep(300)  # 5 分钟
        except KeyboardInterrupt:
            print("\n\n⚠️  收到停止信号...")
        
        # 停止机器人
        print("\n正在停止机器人...")
        await bot.stop()
        
        # 打印最终报告
        print("\n" + "=" * 80)
        print("📊 交易报告")
        print("=" * 80)
        print(bot.get_performance_report())
        
        # 打印风险报告
        print(bot.risk_manager.get_risk_report())
        
    except Exception as e:
        print(f"\n❌ 运行出错: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        await exchange.close()


async def run_okx_live_trading():
    """运行 OKX 实盘交易（谨慎使用）"""
    print("\n" + "=" * 80)
    print("步骤3: 启动 OKX 实盘交易（模拟盘真实订单）")
    print("=" * 80)
    print("\n⚠️  警告: 这将在 OKX 模拟盘执行真实订单！")
    print("⚠️  虽然是模拟盘，但订单执行流程与实盘相同")
    print("=" * 80)
    
    confirm = input("\n确认要继续吗？(输入 yes 继续): ").strip().lower()
    if confirm != 'yes':
        print("已取消")
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
        # 使用更保守的策略
        strategy = SteadyProfitStrategy(parameters={
            "base_position_ratio": 0.005,      # 0.5% 基础仓位
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
        
        # 创建交易机器人
        bot = TradingBot(
            exchange=exchange,
            strategy=strategy,
            symbol='BTC/USDT',
            timeframe='15m',
            initial_capital=1000.0,            # 小资金测试
            risk_limits=risk_limits,
            config={
                'mode': 'live',                # 实盘模式（在模拟盘执行真实订单）
                'check_interval': 60
            }
        )
        
        print("\n配置信息:")
        print(f"  交易所: OKX (模拟盘)")
        print(f"  交易对: BTC/USDT")
        print(f"  策略: 稳健盈利策略（保守）")
        print(f"  周期: 15分钟")
        print(f"  模式: Live Trading (真实订单)")
        print(f"  初始资金: 1,000 USDT")
        print(f"  最大仓位: 0.01 BTC")
        print(f"  日亏损限制: 1%")
        
        print("\n" + "=" * 80)
        print("🔥 实盘机器人启动中...")
        print("=" * 80)
        print("\n提示:")
        print("  - 机器人将运行 10 分钟用于演示")
        print("  - 使用 Ctrl+C 可以随时停止")
        print("  - 订单将在 OKX 模拟盘真实执行")
        print("\n" + "=" * 80 + "\n")
        
        # 创建机器人任务
        bot_task = asyncio.create_task(bot.start())
        
        # 运行 10 分钟
        try:
            await asyncio.sleep(600)  # 10 分钟
        except KeyboardInterrupt:
            print("\n\n⚠️  收到停止信号...")
        
        # 停止机器人
        print("\n正在停止机器人...")
        await bot.stop()
        
        # 打印最终报告
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


async def main():
    """主函数"""
    print("\n" + "=" * 80)
    print("🪙 Bitcoin Trader - OKX 模拟账户交易流程")
    print("=" * 80)
    
    # 检查配置
    if not settings.OKX_API_KEY or not settings.OKX_API_SECRET or not settings.OKX_PASSPHRASE:
        print("\n❌ 错误: 未配置 OKX API 密钥")
        print("\n请按以下步骤配置:")
        print("\n1. 登录 OKX 官网: https://www.okx.com")
        print("2. 进入 API 管理页面")
        print("3. 创建模拟盘 API 密钥")
        print("4. 在项目根目录创建 .env 文件，添加:")
        print("\n   OKX_API_KEY=your_api_key")
        print("   OKX_API_SECRET=your_api_secret")
        print("   OKX_PASSPHRASE=your_passphrase")
        print("   OKX_TESTNET=True")
        print("\n5. 重新运行此脚本")
        return
    
    print("\n请选择要运行的流程:")
    print("\n1. 测试 OKX 连接")
    print("2. 运行模拟交易 (Paper Trading - 不执行真实订单)")
    print("3. 运行实盘交易 (Live Trading - 在模拟盘执行真实订单)")
    print("4. 完整流程 (依次运行 1 → 2)")
    print("0. 退出")
    
    choice = input("\n请输入选项 (0-4): ").strip()
    
    if choice == '1':
        await test_okx_connection()
        
    elif choice == '2':
        # 先测试连接
        if await test_okx_connection():
            input("\n按回车继续运行模拟交易...")
            await run_okx_paper_trading()
        
    elif choice == '3':
        # 先测试连接
        if await test_okx_connection():
            input("\n按回车继续运行实盘交易...")
            await run_okx_live_trading()
        
    elif choice == '4':
        # 完整流程
        if await test_okx_connection():
            input("\n✅ 连接测试成功！按回车继续运行模拟交易...")
            await run_okx_paper_trading()
        
    elif choice == '0':
        print("\n再见！")
        
    else:
        print("\n❌ 无效选项")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n👋 程序已退出")
    except Exception as e:
        print(f"\n❌ 程序错误: {e}")
        import traceback
        traceback.print_exc()
