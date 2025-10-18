"""
自动交易机器人完整示例

演示如何使用 ccxt 集成进行自动化加密货币交易
"""
import sys
import asyncio
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

import ccxt.async_support as ccxt_async
from app.core.trading_bot import TradingBot, MultiSymbolTradingBot
from app.core.strategies import SteadyProfitStrategy
from app.core.risk_manager import RiskLimits
from app.config import settings


async def example_1_basic_bot():
    """示例1: 基础交易机器人"""
    print("=" * 80)
    print("示例1: 基础交易机器人 - BTC/USDT")
    print("=" * 80)
    
    # 1. 创建交易所实例
    exchange = ccxt_async.binance({
        'apiKey': settings.BINANCE_API_KEY,
        'secret': settings.BINANCE_API_SECRET,
        'enableRateLimit': True,
        'options': {'defaultType': 'future'}
    })
    
    # 设置为测试网
    if settings.BINANCE_TESTNET:
        exchange.set_sandbox_mode(True)
    
    try:
        # 2. 创建策略
        strategy = SteadyProfitStrategy()
        
        # 3. 配置风险限制
        risk_limits = RiskLimits(
            max_position_size=0.1,          # 最大0.1 BTC
            max_position_value=5000.0,      # 最大5000 USDT
            max_daily_loss=0.02,            # 日最大亏损2%
            max_trades_per_day=10,          # 每日最多10笔
            max_consecutive_losses=3        # 最多连续亏损3次
        )
        
        # 4. 创建交易机器人
        bot = TradingBot(
            exchange=exchange,
            strategy=strategy,
            symbol='BTC/USDT',
            timeframe='15m',
            initial_capital=10000.0,
            risk_limits=risk_limits,
            config={
                'mode': 'paper',            # paper=模拟, live=实盘
                'check_interval': 60        # 每60秒检查一次
            }
        )
        
        # 5. 启动机器人（运行5分钟后停止）
        print("\n🚀 启动交易机器人...\n")
        
        # 创建启动任务
        bot_task = asyncio.create_task(bot.start())
        
        # 等待5分钟
        await asyncio.sleep(300)
        
        # 停止机器人
        await bot.stop()
        
        # 打印性能报告
        print("\n" + bot.get_performance_report())
        
    finally:
        await exchange.close()


async def example_2_live_trading():
    """示例2: 实盘交易（小资金测试）"""
    print("=" * 80)
    print("示例2: 实盘交易 - 小资金测试")
    print("=" * 80)
    print("⚠️  警告: 这是实盘交易示例，请确保已配置正确的API密钥")
    print("⚠️  建议先在测试网测试，确认无误后再使用主网")
    print("=" * 80)
    
    # 创建交易所实例
    exchange = ccxt_async.binance({
        'apiKey': settings.BINANCE_API_KEY,
        'secret': settings.BINANCE_API_SECRET,
        'enableRateLimit': True,
    })
    
    # 测试网模式
    if settings.BINANCE_TESTNET:
        exchange.set_sandbox_mode(True)
        print("✅ 使用测试网模式")
    else:
        print("⚠️  使用主网模式 - 真实资金交易！")
    
    try:
        # 创建保守策略
        strategy = SteadyProfitStrategy(parameters={
            "base_position_ratio": 0.005,   # 0.5% 仓位
            "震荡市_系数": 0.2,
            "单边市_系数": 0.5,
            "max_daily_loss": 0.01,         # 1% 日亏损限制
        })
        
        # 严格的风险限制
        risk_limits = RiskLimits(
            max_position_size=0.01,         # 最大0.01 BTC
            max_position_value=500.0,       # 最大500 USDT
            max_daily_loss=0.01,            # 1% 日亏损
            max_trades_per_day=5,
            max_consecutive_losses=2
        )
        
        # 创建机器人
        bot = TradingBot(
            exchange=exchange,
            strategy=strategy,
            symbol='BTC/USDT',
            timeframe='15m',
            initial_capital=1000.0,         # 1000 USDT 测试资金
            risk_limits=risk_limits,
            config={
                'mode': 'live',             # 实盘模式
                'check_interval': 60
            }
        )
        
        print("\n🔥 启动实盘交易机器人...\n")
        
        # 运行10分钟
        bot_task = asyncio.create_task(bot.start())
        await asyncio.sleep(600)
        await bot.stop()
        
        print("\n" + bot.get_performance_report())
        
    finally:
        await exchange.close()


async def example_3_multi_symbol():
    """示例3: 多交易对同时交易"""
    print("=" * 80)
    print("示例3: 多交易对交易机器人")
    print("=" * 80)
    
    # 创建交易所
    exchange = ccxt_async.binance({
        'apiKey': settings.BINANCE_API_KEY,
        'secret': settings.BINANCE_API_SECRET,
        'enableRateLimit': True,
    })
    
    if settings.BINANCE_TESTNET:
        exchange.set_sandbox_mode(True)
    
    try:
        # 配置多个交易对
        strategy_configs = [
            {
                'symbol': 'BTC/USDT',
                'strategy': SteadyProfitStrategy(),
                'timeframe': '15m',
                'mode': 'paper'
            },
            {
                'symbol': 'ETH/USDT',
                'strategy': SteadyProfitStrategy(),
                'timeframe': '15m',
                'mode': 'paper'
            },
            {
                'symbol': 'BNB/USDT',
                'strategy': SteadyProfitStrategy(),
                'timeframe': '15m',
                'mode': 'paper'
            }
        ]
        
        # 风险限制
        risk_limits = RiskLimits(
            max_position_size=0.5,
            max_position_value=3000.0,
            max_daily_loss=0.03,
            max_trades_per_day=15
        )
        
        # 创建多交易对机器人
        multi_bot = MultiSymbolTradingBot(
            exchange=exchange,
            strategy_configs=strategy_configs,
            initial_capital=10000.0,        # 总资金10000 USDT
            risk_limits=risk_limits
        )
        
        print("\n🚀 启动多交易对机器人...\n")
        
        # 运行5分钟
        bot_task = asyncio.create_task(multi_bot.start())
        await asyncio.sleep(300)
        await multi_bot.stop()
        
        # 打印整体状态
        status = multi_bot.get_overall_status()
        print("\n" + "=" * 80)
        print("多交易对整体状态")
        print("=" * 80)
        print(f"交易对数量: {status['total_bots']}")
        print(f"总盈亏: {status['total_pnl']:+.2f} USDT")
        print(f"总交易数: {status['total_trades']}")
        print(f"总持仓: {status['total_positions']}")
        print("=" * 80)
        
    finally:
        await exchange.close()


async def example_4_custom_strategy():
    """示例4: 自定义策略参数"""
    print("=" * 80)
    print("示例4: 自定义策略参数")
    print("=" * 80)
    
    exchange = ccxt_async.binance({
        'apiKey': settings.BINANCE_API_KEY,
        'secret': settings.BINANCE_API_SECRET,
        'enableRateLimit': True,
    })
    
    if settings.BINANCE_TESTNET:
        exchange.set_sandbox_mode(True)
    
    try:
        # 激进型策略参数
        aggressive_params = {
            "base_position_ratio": 0.02,        # 2% 基础仓位
            "震荡市_系数": 0.5,
            "单边市_系数": 1.0,
            "max_daily_loss": 0.05,             # 5% 日亏损限制
            "atr_multiplier": 1.2,              # 更紧的止损
            "first_target_profit": 0.30,        # 30% 利润第一目标
            "sentiment_threshold_high": 80,     # 更激进的情绪阈值
            "sentiment_threshold_low": 20,
        }
        
        strategy = SteadyProfitStrategy(parameters=aggressive_params)
        
        # 相应的风险限制
        risk_limits = RiskLimits(
            max_position_size=0.2,
            max_position_value=8000.0,
            max_daily_loss=0.05,
            max_trades_per_day=20,
            max_consecutive_losses=4
        )
        
        bot = TradingBot(
            exchange=exchange,
            strategy=strategy,
            symbol='BTC/USDT',
            timeframe='15m',
            initial_capital=10000.0,
            risk_limits=risk_limits,
            config={'mode': 'paper', 'check_interval': 60}
        )
        
        print("\n🚀 启动激进型策略机器人...\n")
        
        bot_task = asyncio.create_task(bot.start())
        await asyncio.sleep(300)
        await bot.stop()
        
        print("\n" + bot.get_performance_report())
        
    finally:
        await exchange.close()


async def example_5_market_monitor():
    """示例5: 实时行情监控"""
    print("=" * 80)
    print("示例5: 实时行情监控")
    print("=" * 80)
    
    from app.core.market_monitor import MarketMonitor, KlineMonitor
    
    exchange = ccxt_async.binance({
        'enableRateLimit': True,
    })
    
    try:
        # 创建行情监控器
        market_monitor = MarketMonitor(exchange)
        kline_monitor = KlineMonitor(exchange)
        
        # 启动监控
        await market_monitor.start()
        await kline_monitor.start()
        
        # 定义回调函数
        def on_ticker(ticker):
            print(f"[Ticker] {ticker['symbol']}: "
                  f"价格={ticker['last']:.2f}, "
                  f"涨跌={ticker.get('percentage', 0):.2f}%")
        
        def on_kline(kline):
            print(f"[K线] 时间={kline['timestamp']}, "
                  f"收盘={kline['close']:.2f}, "
                  f"成交量={kline['volume']:.2f}")
        
        # 订阅行情
        await market_monitor.subscribe_ticker('BTC/USDT', on_ticker)
        await kline_monitor.subscribe_kline('BTC/USDT', '1m', on_kline)
        
        print("\n📊 监控中... (30秒)\n")
        await asyncio.sleep(30)
        
        # 获取市场摘要
        summary = market_monitor.get_market_summary('BTC/USDT')
        print("\n市场摘要:")
        print(f"  最新价: {summary['ticker']['last']}")
        print(f"  买一价: {summary['ticker']['bid']}")
        print(f"  卖一价: {summary['ticker']['ask']}")
        print(f"  成交量: {summary['ticker']['volume']}")
        
        # 停止监控
        await market_monitor.stop()
        await kline_monitor.stop()
        
    finally:
        await exchange.close()


async def example_6_risk_management():
    """示例6: 风险管理功能演示"""
    print("=" * 80)
    print("示例6: 风险管理功能")
    print("=" * 80)
    
    from app.core.risk_manager import RiskManager, RiskLimits
    
    # 创建风险管理器
    risk_limits = RiskLimits(
        max_position_size=0.1,
        max_daily_loss=0.03,
        max_trades_per_day=10,
        max_consecutive_losses=3
    )
    
    risk_manager = RiskManager(
        initial_capital=10000.0,
        limits=risk_limits
    )
    
    print("\n【风险管理器初始化】")
    print(f"初始资金: {risk_manager.current_capital:.2f} USDT")
    
    # 1. 计算仓位大小
    print("\n【计算仓位大小】")
    entry_price = 50000.0
    stop_loss = 49000.0
    position_size = risk_manager.calculate_position_size(
        'BTC/USDT', entry_price, stop_loss, risk_percent=0.01
    )
    print(f"入场价: {entry_price:.2f}")
    print(f"止损价: {stop_loss:.2f}")
    print(f"建议仓位: {position_size:.4f} BTC")
    
    # 2. 检查交易是否允许
    print("\n【风险检查】")
    allowed, reason = risk_manager.check_trade_allowed(
        'BTC/USDT', 'buy', position_size, entry_price
    )
    print(f"允许交易: {allowed}")
    print(f"原因: {reason}")
    
    # 3. 模拟几笔交易
    print("\n【模拟交易】")
    
    # 盈利交易
    risk_manager.record_trade({
        'symbol': 'BTC/USDT',
        'side': 'buy',
        'amount': 0.05,
        'price': 50000,
        'pnl': 500  # 盈利500
    })
    print("✅ 交易1: +500 USDT")
    
    # 亏损交易
    risk_manager.record_trade({
        'symbol': 'BTC/USDT',
        'side': 'sell',
        'amount': 0.05,
        'price': 50500,
        'pnl': -200  # 亏损200
    })
    print("❌ 交易2: -200 USDT")
    
    # 再次盈利
    risk_manager.record_trade({
        'symbol': 'BTC/USDT',
        'side': 'buy',
        'amount': 0.05,
        'price': 50300,
        'pnl': 300  # 盈利300
    })
    print("✅ 交易3: +300 USDT")
    
    # 4. 打印风险报告
    print(risk_manager.get_risk_report())


def main():
    """主函数 - 选择运行哪个示例"""
    print("\n" + "=" * 80)
    print("Bitcoin Trader - 自动交易示例")
    print("=" * 80)
    print("\n请选择要运行的示例:")
    print("1. 基础交易机器人")
    print("2. 实盘交易（小资金测试）")
    print("3. 多交易对同时交易")
    print("4. 自定义策略参数")
    print("5. 实时行情监控")
    print("6. 风险管理功能")
    print("0. 运行所有示例")
    
    choice = input("\n请输入选项 (0-6): ").strip()
    
    examples = {
        '1': example_1_basic_bot,
        '2': example_2_live_trading,
        '3': example_3_multi_symbol,
        '4': example_4_custom_strategy,
        '5': example_5_market_monitor,
        '6': example_6_risk_management,
    }
    
    if choice == '0':
        # 运行所有示例
        for example_func in examples.values():
            asyncio.run(example_func())
            print("\n" + "=" * 80 + "\n")
    elif choice in examples:
        asyncio.run(examples[choice]())
    else:
        print("无效选项！")


if __name__ == "__main__":
    # 检查配置
    if not settings.BINANCE_API_KEY or not settings.BINANCE_API_SECRET:
        print("⚠️  警告: 未配置 Binance API 密钥")
        print("请在 .env 文件中配置:")
        print("  BINANCE_API_KEY=your_api_key")
        print("  BINANCE_API_SECRET=your_api_secret")
        print("  BINANCE_TESTNET=True")
        print("\n某些示例可能无法正常运行")
        print("=" * 80)
        input("\n按回车继续...")
    
    main()
