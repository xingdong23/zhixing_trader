"""
稳健盈利策略 - 使用示例

演示如何使用稳健盈利策略进行比特币交易
"""

import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.core.strategies import SteadyProfitStrategy


def example_1_basic_usage():
    """示例1: 基础使用"""
    print("=" * 60)
    print("示例1: 基础使用")
    print("=" * 60)
    
    # 创建策略实例（使用默认参数）
    strategy = SteadyProfitStrategy()
    
    print(f"策略名称: {strategy.name}")
    print(f"所需指标: {strategy.get_required_indicators()}")
    print(f"参数有效性: {strategy.validate_parameters()}")
    
    # 模拟K线数据
    klines = generate_sample_klines(250)
    
    # 生成交易信号
    signal = strategy.analyze(klines)
    
    print(f"\n交易信号:")
    print(f"  信号类型: {signal['signal']}")
    print(f"  原因: {signal['reason']}")
    
    if signal['signal'] != 'hold':
        print(f"  价格: {signal.get('price', 'N/A')}")
        print(f"  仓位比例: {signal.get('position_ratio', 0):.2%}")
        print(f"  止损价: {signal.get('stop_loss', 'N/A')}")
        print(f"  风险收益比: {signal.get('risk_reward_ratio', 'N/A')}")
        
        # 打印止盈目标
        if 'take_profit_levels' in signal:
            print(f"\n  止盈目标:")
            for i, level in enumerate(signal['take_profit_levels'], 1):
                print(f"    目标{i}: {level['price']:.2f} - {level['action']}")


def example_2_custom_parameters():
    """示例2: 自定义参数（保守型）"""
    print("\n" + "=" * 60)
    print("示例2: 自定义参数（保守型）")
    print("=" * 60)
    
    # 保守型参数配置
    conservative_params = {
        "base_position_ratio": 0.005,     # 降至0.5%
        "震荡市_系数": 0.2,
        "单边市_系数": 0.6,
        "max_daily_loss": 0.02,           # 降至2%
        "atr_multiplier": 2.0,            # 更宽的止损
    }
    
    strategy = SteadyProfitStrategy(parameters=conservative_params)
    
    klines = generate_sample_klines(250)
    signal = strategy.analyze(klines)
    
    print(f"信号: {signal['signal']}")
    print(f"仓位比例: {signal.get('position_ratio', 0):.2%} (保守型)")
    print(f"原因: {signal['reason']}")


def example_3_aggressive_parameters():
    """示例3: 自定义参数（激进型）"""
    print("\n" + "=" * 60)
    print("示例3: 自定义参数（激进型）")
    print("=" * 60)
    
    # 激进型参数配置
    aggressive_params = {
        "base_position_ratio": 0.02,      # 提升至2%
        "震荡市_系数": 0.5,
        "单边市_系数": 1.0,
        "max_daily_loss": 0.05,           # 提升至5%
        "atr_multiplier": 1.2,            # 更紧的止损
    }
    
    strategy = SteadyProfitStrategy(parameters=aggressive_params)
    
    klines = generate_sample_klines(250)
    signal = strategy.analyze(klines)
    
    print(f"信号: {signal['signal']}")
    print(f"仓位比例: {signal.get('position_ratio', 0):.2%} (激进型)")
    print(f"原因: {signal['reason']}")


def example_4_complete_trading_flow():
    """示例4: 完整交易流程"""
    print("\n" + "=" * 60)
    print("示例4: 完整交易流程模拟")
    print("=" * 60)
    
    # 初始化
    strategy = SteadyProfitStrategy()
    account_balance = 100000  # 10万美元
    
    # 获取K线数据
    klines = generate_sample_klines(250)
    current_price = klines[-1]['close']
    
    print(f"账户余额: {account_balance:,.2f} USD")
    print(f"当前价格: {current_price:,.2f} USD")
    
    # 生成信号
    signal = strategy.analyze(klines)
    
    print(f"\n策略分析结果:")
    print(f"  信号: {signal['signal']}")
    print(f"  原因: {signal['reason']}")
    
    if signal['signal'] == 'buy':
        # 计算具体仓位
        position_ratio = signal['position_ratio']
        position_size_usd = account_balance * position_ratio
        position_size_btc = position_size_usd / signal['price']
        
        print(f"\n交易执行计划:")
        print(f"  方向: 买入（做多）")
        print(f"  价格: {signal['price']:,.2f} USD")
        print(f"  仓位: {position_size_usd:,.2f} USD ({position_ratio:.2%})")
        print(f"  数量: {position_size_btc:.4f} BTC")
        
        print(f"\n风险管理:")
        print(f"  止损价: {signal['stop_loss']:,.2f} USD")
        print(f"  风险金额: {(signal['price'] - signal['stop_loss']) * position_size_btc:,.2f} USD")
        print(f"  风险收益比: 1:{signal.get('risk_reward_ratio', 0):.2f}")
        
        print(f"\n止盈计划:")
        for i, level in enumerate(signal['take_profit_levels'], 1):
            profit = (level['price'] - signal['price']) * position_size_btc
            print(f"  目标{i}: {level['price']:,.2f} USD")
            print(f"    预期利润: {profit:,.2f} USD")
            print(f"    操作: {level['action']}")
        
        # 模拟订单
        print(f"\n模拟订单:")
        print(f"  ✓ 限价单: 买入 {position_size_btc:.4f} BTC @ {signal['price']:,.2f}")
        print(f"  ✓ 止损单: 在 {signal['stop_loss']:,.2f} USD 自动平仓")
        print(f"  ✓ 止盈单1: 在 {signal['take_profit_levels'][0]['price']:,.2f} USD 平仓50%")
        print(f"  ✓ 止盈单2: 在 {signal['take_profit_levels'][1]['price']:,.2f} USD 平仓30%")
    
    elif signal['signal'] == 'hold':
        print(f"\n当前建议: 观望")
        if 'analysis' in signal:
            analysis = signal['analysis']
            print(f"\n市场分析:")
            print(f"  趋势: {analysis.get('trend', 'N/A')}")
            print(f"  结构: {analysis.get('structure', {}).get('pattern', 'N/A')}")
            print(f"  情绪: {analysis.get('sentiment', {}).get('state', 'N/A')}")


def example_5_backtest_simulation():
    """示例5: 简单回测模拟"""
    print("\n" + "=" * 60)
    print("示例5: 简单回测模拟")
    print("=" * 60)
    
    strategy = SteadyProfitStrategy()
    initial_capital = 20000
    capital = initial_capital
    trades = []
    
    # 生成多组K线数据模拟不同时期
    print(f"初始资金: {initial_capital:,.2f} USD\n")
    
    for period in range(1, 6):
        print(f"第{period}期:")
        
        klines = generate_sample_klines(250, seed=period * 100)
        signal = strategy.analyze(klines)
        
        print(f"  信号: {signal['signal']}")
        
        if signal['signal'] == 'buy':
            # 模拟交易
            entry_price = signal['price']
            position_size = capital * signal['position_ratio']
            
            # 随机模拟盈亏（实际应该基于真实价格）
            import random
            random.seed(period)
            outcome = random.choice(['profit', 'loss', 'breakeven'])
            
            if outcome == 'profit':
                pnl = position_size * 0.15  # 假设盈利15%
                capital += pnl
                print(f"  ✓ 盈利: +{pnl:,.2f} USD (+15%)")
            elif outcome == 'loss':
                pnl = -position_size * 0.05  # 假设亏损5%（被止损）
                capital += pnl
                print(f"  ✗ 亏损: {pnl:,.2f} USD (-5%)")
            else:
                pnl = 0
                print(f"  - 平局: 0 USD")
            
            trades.append({
                'period': period,
                'entry': entry_price,
                'pnl': pnl,
                'capital': capital
            })
            
            print(f"  账户余额: {capital:,.2f} USD")
        else:
            print(f"  观望，不交易")
        
        print()
    
    # 统计
    total_pnl = capital - initial_capital
    return_pct = (capital - initial_capital) / initial_capital
    
    print(f"=" * 60)
    print(f"回测总结:")
    print(f"  初始资金: {initial_capital:,.2f} USD")
    print(f"  最终资金: {capital:,.2f} USD")
    print(f"  总盈亏: {total_pnl:,.2f} USD")
    print(f"  收益率: {return_pct:.2%}")
    print(f"  交易次数: {len(trades)}")


def generate_sample_klines(num_klines=250, seed=42):
    """生成模拟K线数据"""
    import random
    import numpy as np
    from datetime import datetime, timedelta
    
    random.seed(seed)
    np.random.seed(seed)
    
    klines = []
    base_price = 50000
    current_price = base_price
    start_time = datetime.now() - timedelta(days=num_klines)
    
    for i in range(num_klines):
        # 模拟价格波动
        change = np.random.normal(0, 500)  # 正态分布波动
        current_price = max(current_price + change, base_price * 0.5)  # 不低于50%
        
        # 生成OHLCV
        open_price = current_price
        close_price = current_price + np.random.normal(0, 200)
        high_price = max(open_price, close_price) + abs(np.random.normal(0, 100))
        low_price = min(open_price, close_price) - abs(np.random.normal(0, 100))
        volume = random.randint(1000, 10000)
        
        klines.append({
            "timestamp": int((start_time + timedelta(days=i)).timestamp()),
            "open": round(open_price, 2),
            "high": round(high_price, 2),
            "low": round(low_price, 2),
            "close": round(close_price, 2),
            "volume": volume
        })
        
        current_price = close_price
    
    return klines


if __name__ == "__main__":
    print("\n稳健盈利策略 - 使用示例\n")
    
    # 运行所有示例
    example_1_basic_usage()
    example_2_custom_parameters()
    example_3_aggressive_parameters()
    example_4_complete_trading_flow()
    example_5_backtest_simulation()
    
    print("\n" + "=" * 60)
    print("所有示例运行完成！")
    print("=" * 60)

