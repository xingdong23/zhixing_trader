"""
EMA趋势策略使用示例

这个脚本展示了如何在实际交易中使用EMA趋势策略
"""
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.strategies import EMATrendStrategy
import numpy as np


def example_1_basic_usage():
    """示例1：基础使用"""
    print("=" * 60)
    print("示例1：基础使用")
    print("=" * 60)
    
    # 1. 创建策略实例
    strategy = EMATrendStrategy()
    
    # 2. 准备K线数据（这里使用模拟数据，实际应该从交易所获取）
    klines = generate_sample_klines(200)
    
    # 3. 分析生成信号
    signal = strategy.analyze(klines)
    
    # 4. 处理信号
    print(f"\n信号类型: {signal['signal']}")
    print(f"原因: {signal['reason']}")
    
    if signal['signal'] in ['buy', 'sell']:
        print(f"\n交易详情:")
        print(f"  方向: {'做多' if signal['signal'] == 'buy' else '做空'}")
        print(f"  入场价格: {signal['price']:.2f} USDT")
        print(f"  仓位比例: {signal['position_ratio']:.1%}")
        print(f"  止损价格: {signal['stop_loss']:.2f} USDT")
        print(f"  止损距离: {abs(signal['price'] - signal['stop_loss']) / signal['price']:.2%}")
        
        print(f"\n止盈计划:")
        for i, tp in enumerate(signal['take_profit_levels'], 1):
            print(f"  目标{i}: {tp['price']:.2f} USDT (利润{tp['profit_ratio']:.1%}) - {tp['action']}")
        
        # 5. 执行交易后更新持仓
        strategy.update_position(signal)
        print(f"\n✅ 持仓已更新")
    
    print()


def example_2_custom_parameters():
    """示例2：自定义参数"""
    print("=" * 60)
    print("示例2：自定义参数（保守型）")
    print("=" * 60)
    
    # 自定义参数 - 保守型配置
    custom_params = {
        "position_ratio": 0.2,          # 仓位降至20%
        "max_loss_ratio": 0.03,         # 最大亏损3%
        "atr_multiplier": 1.5,          # ATR倍数降低
        "first_profit_target": 0.03,    # 第一目标3%
        "second_profit_target": 0.06,   # 第二目标6%
        "third_profit_target": 0.10,    # 第三目标10%
    }
    
    strategy = EMATrendStrategy(custom_params)
    
    print("\n策略参数:")
    print(f"  仓位比例: {strategy.parameters['position_ratio']:.1%}")
    print(f"  最大亏损: {strategy.parameters['max_loss_ratio']:.1%}")
    print(f"  ATR倍数: {strategy.parameters['atr_multiplier']}")
    print(f"  第一目标: {strategy.parameters['first_profit_target']:.1%}")
    
    # 分析信号
    klines = generate_sample_klines(200)
    signal = strategy.analyze(klines)
    
    print(f"\n信号: {signal['signal']}")
    print(f"原因: {signal['reason']}")
    print()


def example_3_trend_detection():
    """示例3：趋势检测"""
    print("=" * 60)
    print("示例3：不同市场趋势检测")
    print("=" * 60)
    
    strategy = EMATrendStrategy()
    
    # 测试不同趋势
    trends = [
        ("上升趋势", generate_trending_klines(200, "up")),
        ("下降趋势", generate_trending_klines(200, "down")),
        ("震荡趋势", generate_trending_klines(200, "sideways")),
    ]
    
    for trend_name, klines in trends:
        signal = strategy.analyze(klines)
        
        print(f"\n{trend_name}:")
        print(f"  信号: {signal['signal']}")
        print(f"  原因: {signal['reason']}")
        
        if 'analysis' in signal:
            analysis = signal['analysis']
            if 'trend' in analysis:
                print(f"  识别趋势: {analysis['trend']}")
            if 'ema8' in analysis:
                print(f"  EMA8: {analysis['ema8']:.2f}")
                print(f"  EMA21: {analysis['ema21']:.2f}")
                print(f"  EMA55: {analysis['ema55']:.2f}")
    
    print()


def example_4_position_management():
    """示例4：持仓管理"""
    print("=" * 60)
    print("示例4：持仓管理和止盈止损")
    print("=" * 60)
    
    strategy = EMATrendStrategy()
    
    # 模拟开仓
    print("\n步骤1: 开仓")
    klines = generate_trending_klines(200, "up")
    
    # 手动调整最后一根K线，模拟回踩EMA55
    closes = np.array([k["close"] for k in klines])
    ema55 = strategy._calculate_ema(closes, 55)[-1]
    
    klines[-1]["close"] = ema55 * 1.005
    klines[-1]["high"] = ema55 * 1.01
    klines[-1]["low"] = ema55 * 0.995
    
    signal = strategy.analyze(klines)
    
    if signal['signal'] == 'buy':
        print(f"✅ 做多信号触发")
        print(f"   入场价: {signal['price']:.2f}")
        print(f"   止损价: {signal['stop_loss']:.2f}")
        
        # 更新持仓
        strategy.update_position(signal)
        print(f"   持仓状态: {strategy.current_position['side']}")
        
        # 模拟价格上涨，触发第一目标止盈
        print("\n步骤2: 价格上涨5%，触发第一目标止盈")
        entry_price = signal['price']
        tp1_price = entry_price * 1.05
        
        # 创建新的K线，价格达到第一目标
        new_kline = klines[-1].copy()
        new_kline['high'] = tp1_price
        new_kline['close'] = tp1_price * 0.99
        klines.append(new_kline)
        
        exit_signal = strategy._check_exit_conditions(
            new_kline['close'],
            new_kline['high'],
            new_kline['low'],
            strategy._calculate_atr(klines, 14)
        )
        
        if exit_signal:
            print(f"✅ 触发止盈")
            print(f"   平仓价格: {exit_signal['price']:.2f}")
            print(f"   平仓比例: {exit_signal['position_ratio']:.0%}")
            print(f"   原因: {exit_signal['reason']}")
            print(f"   剩余持仓: {(1 - strategy.current_position['closed_ratio']):.0%}")
            print(f"   止损已移至成本价: {strategy.current_position['stop_loss']:.2f}")
    
    print()


def example_5_risk_management():
    """示例5：风险管理"""
    print("=" * 60)
    print("示例5：风险管理计算")
    print("=" * 60)
    
    strategy = EMATrendStrategy()
    
    # 假设账户信息
    account_balance = 10000  # USDT
    
    # 生成信号
    klines = generate_trending_klines(200, "up")
    closes = np.array([k["close"] for k in klines])
    ema55 = strategy._calculate_ema(closes, 55)[-1]
    
    klines[-1]["close"] = ema55 * 1.005
    klines[-1]["high"] = ema55 * 1.01
    klines[-1]["low"] = ema55 * 0.995
    
    signal = strategy.analyze(klines)
    
    if signal['signal'] == 'buy':
        entry_price = signal['price']
        stop_loss = signal['stop_loss']
        position_ratio = signal['position_ratio']
        
        # 计算交易金额
        position_size = account_balance * position_ratio
        
        # 计算风险金额
        risk_per_unit = entry_price - stop_loss
        risk_ratio = risk_per_unit / entry_price
        total_risk = position_size * risk_ratio
        
        print(f"\n账户信息:")
        print(f"  账户余额: {account_balance:,.2f} USDT")
        print(f"  仓位比例: {position_ratio:.1%}")
        print(f"  开仓金额: {position_size:,.2f} USDT")
        
        print(f"\n交易信息:")
        print(f"  入场价格: {entry_price:.2f} USDT")
        print(f"  止损价格: {stop_loss:.2f} USDT")
        print(f"  止损距离: {risk_ratio:.2%}")
        
        print(f"\n风险分析:")
        print(f"  单笔风险金额: {total_risk:.2f} USDT")
        print(f"  占账户比例: {total_risk / account_balance:.2%}")
        print(f"  最大亏损: {strategy.parameters['max_loss_ratio']:.1%}")
        
        print(f"\n盈亏比:")
        for i, tp in enumerate(signal['take_profit_levels'], 1):
            profit_per_unit = tp['price'] - entry_price
            reward_risk_ratio = profit_per_unit / risk_per_unit
            print(f"  目标{i}: {reward_risk_ratio:.2f}:1 (利润{tp['profit_ratio']:.1%})")
    
    print()


# ==================== 辅助函数 ====================

def generate_sample_klines(num_bars=200):
    """生成示例K线数据"""
    klines = []
    base_price = 50000.0
    
    for i in range(num_bars):
        price = base_price + i * 30 + np.random.randn() * 150
        
        open_price = price + np.random.randn() * 50
        high_price = max(open_price, price) + abs(np.random.randn() * 80)
        low_price = min(open_price, price) - abs(np.random.randn() * 80)
        close_price = price
        volume = 1000000 + np.random.randn() * 100000
        
        klines.append({
            "open": open_price,
            "high": high_price,
            "low": low_price,
            "close": close_price,
            "volume": max(volume, 0)
        })
    
    return klines


def generate_trending_klines(num_bars=200, trend="up"):
    """生成特定趋势的K线数据"""
    klines = []
    base_price = 50000.0
    
    for i in range(num_bars):
        if trend == "up":
            price = base_price + i * 50 + np.random.randn() * 200
        elif trend == "down":
            price = base_price - i * 50 + np.random.randn() * 200
        else:  # sideways
            price = base_price + np.sin(i / 10) * 1000 + np.random.randn() * 200
        
        open_price = price + np.random.randn() * 50
        high_price = max(open_price, price) + abs(np.random.randn() * 100)
        low_price = min(open_price, price) - abs(np.random.randn() * 100)
        close_price = price
        volume = 1000000 + np.random.randn() * 100000
        
        klines.append({
            "open": open_price,
            "high": high_price,
            "low": low_price,
            "close": close_price,
            "volume": max(volume, 0)
        })
    
    return klines


if __name__ == "__main__":
    print("\n" + "🚀 EMA趋势策略使用示例".center(60, "="))
    print()
    
    # 运行所有示例
    example_1_basic_usage()
    example_2_custom_parameters()
    example_3_trend_detection()
    example_4_position_management()
    example_5_risk_management()
    
    print("=" * 60)
    print("✅ 所有示例运行完成！")
    print("=" * 60)
    print("\n💡 提示:")
    print("  1. 在实际使用中，请从交易所API获取真实K线数据")
    print("  2. 建议先进行充分的回测和模拟交易")
    print("  3. 实盘交易时请严格控制仓位和风险")
    print("  4. 详细文档请查看: docs/EMA趋势策略说明.md")
    print()
