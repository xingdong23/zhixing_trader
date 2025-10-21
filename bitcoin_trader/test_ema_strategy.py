"""
测试EMA趋势策略
"""
import numpy as np
from app.core.strategies.ema_trend_strategy import EMATrendStrategy


def generate_test_klines(num_bars=200, trend="up"):
    """
    生成测试K线数据
    
    Args:
        num_bars: K线数量
        trend: 趋势类型 "up"上升, "down"下降, "sideways"震荡
    """
    klines = []
    base_price = 50000.0
    
    for i in range(num_bars):
        if trend == "up":
            # 上升趋势：价格逐步上涨，带有波动
            price = base_price + i * 50 + np.random.randn() * 200
        elif trend == "down":
            # 下降趋势：价格逐步下跌
            price = base_price - i * 50 + np.random.randn() * 200
        else:
            # 震荡趋势：价格在一定范围内波动
            price = base_price + np.sin(i / 10) * 1000 + np.random.randn() * 200
        
        # 生成OHLC
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


def test_uptrend_strategy():
    """测试上升趋势中的策略"""
    print("=" * 60)
    print("测试场景1：上升趋势")
    print("=" * 60)
    
    # 创建策略实例
    strategy = EMATrendStrategy()
    
    # 生成上升趋势的K线数据
    klines = generate_test_klines(200, trend="up")
    
    # 分析信号
    signal = strategy.analyze(klines)
    
    print(f"\n信号类型: {signal['signal']}")
    print(f"原因: {signal['reason']}")
    
    if 'analysis' in signal:
        print(f"\n分析详情:")
        for key, value in signal['analysis'].items():
            print(f"  {key}: {value}")
    
    if signal['signal'] in ['buy', 'sell']:
        print(f"\n交易详情:")
        print(f"  入场价格: {signal.get('price', 0):.2f}")
        print(f"  仓位比例: {signal.get('position_ratio', 0):.1%}")
        print(f"  止损价格: {signal.get('stop_loss', 0):.2f}")
        
        if 'take_profit_levels' in signal:
            print(f"\n止盈级别:")
            for i, tp in enumerate(signal['take_profit_levels'], 1):
                print(f"  目标{i}: 价格{tp['price']:.2f}, 平仓{tp['close_ratio']:.0%}, {tp['action']}")


def test_downtrend_strategy():
    """测试下降趋势中的策略"""
    print("\n" + "=" * 60)
    print("测试场景2：下降趋势")
    print("=" * 60)
    
    # 创建策略实例
    strategy = EMATrendStrategy()
    
    # 生成下降趋势的K线数据
    klines = generate_test_klines(200, trend="down")
    
    # 分析信号
    signal = strategy.analyze(klines)
    
    print(f"\n信号类型: {signal['signal']}")
    print(f"原因: {signal['reason']}")
    
    if 'analysis' in signal:
        print(f"\n分析详情:")
        for key, value in signal['analysis'].items():
            print(f"  {key}: {value}")
    
    if signal['signal'] in ['buy', 'sell']:
        print(f"\n交易详情:")
        print(f"  入场价格: {signal.get('price', 0):.2f}")
        print(f"  仓位比例: {signal.get('position_ratio', 0):.1%}")
        print(f"  止损价格: {signal.get('stop_loss', 0):.2f}")
        
        if 'take_profit_levels' in signal:
            print(f"\n止盈级别:")
            for i, tp in enumerate(signal['take_profit_levels'], 1):
                print(f"  目标{i}: 价格{tp['price']:.2f}, 平仓{tp['close_ratio']:.0%}, {tp['action']}")


def test_sideways_strategy():
    """测试震荡趋势中的策略"""
    print("\n" + "=" * 60)
    print("测试场景3：震荡趋势")
    print("=" * 60)
    
    # 创建策略实例
    strategy = EMATrendStrategy()
    
    # 生成震荡趋势的K线数据
    klines = generate_test_klines(200, trend="sideways")
    
    # 分析信号
    signal = strategy.analyze(klines)
    
    print(f"\n信号类型: {signal['signal']}")
    print(f"原因: {signal['reason']}")
    
    if 'analysis' in signal:
        print(f"\n分析详情:")
        for key, value in signal['analysis'].items():
            print(f"  {key}: {value}")


def test_pullback_entry():
    """测试回踩入场逻辑"""
    print("\n" + "=" * 60)
    print("测试场景4：上升趋势回踩EMA55入场")
    print("=" * 60)
    
    strategy = EMATrendStrategy()
    
    # 生成上升趋势数据
    klines = generate_test_klines(150, trend="up")
    
    # 手动调整最后几根K线，模拟回踩EMA55
    # 计算当前EMA55值
    closes = np.array([k["close"] for k in klines])
    ema55_values = strategy._calculate_ema(closes, 55)
    current_ema55 = ema55_values[-1]
    
    # 让最后一根K线的价格接近EMA55
    pullback_price = current_ema55 * 1.005  # 略高于EMA55 0.5%
    
    klines[-1]["close"] = pullback_price
    klines[-1]["high"] = pullback_price * 1.01
    klines[-1]["low"] = pullback_price * 0.99
    klines[-1]["open"] = pullback_price * 0.995
    
    signal = strategy.analyze(klines)
    
    print(f"\n信号类型: {signal['signal']}")
    print(f"原因: {signal['reason']}")
    print(f"当前价格: {pullback_price:.2f}")
    print(f"EMA55: {current_ema55:.2f}")
    print(f"距离EMA55: {abs(pullback_price - current_ema55) / current_ema55:.2%}")
    
    if signal['signal'] == 'buy':
        print(f"\n✅ 成功触发做多信号！")
        print(f"入场价格: {signal['price']:.2f}")
        print(f"止损价格: {signal['stop_loss']:.2f}")
        print(f"止损距离: {abs(signal['price'] - signal['stop_loss']) / signal['price']:.2%}")


def test_strategy_parameters():
    """测试策略参数"""
    print("\n" + "=" * 60)
    print("测试场景5：策略参数验证")
    print("=" * 60)
    
    # 测试默认参数
    strategy = EMATrendStrategy()
    
    print("\n默认参数:")
    for key, value in strategy.parameters.items():
        print(f"  {key}: {value}")
    
    # 验证参数
    is_valid = strategy.validate_parameters()
    print(f"\n参数验证结果: {'✅ 通过' if is_valid else '❌ 失败'}")
    
    # 测试自定义参数
    custom_params = {
        "ema_fast": 5,
        "ema_medium": 13,
        "ema_slow": 34,
        "max_loss_ratio": 0.03,  # 最大亏损改为3%
        "first_profit_target": 0.08,  # 第一目标改为8%
    }
    
    strategy2 = EMATrendStrategy(custom_params)
    print("\n自定义参数:")
    print(f"  快速EMA: {strategy2.parameters['ema_fast']}")
    print(f"  中速EMA: {strategy2.parameters['ema_medium']}")
    print(f"  慢速EMA: {strategy2.parameters['ema_slow']}")
    print(f"  最大亏损: {strategy2.parameters['max_loss_ratio']:.1%}")
    print(f"  第一目标: {strategy2.parameters['first_profit_target']:.1%}")


if __name__ == "__main__":
    print("\n🚀 开始测试EMA趋势跟随策略\n")
    
    # 运行所有测试
    test_uptrend_strategy()
    test_downtrend_strategy()
    test_sideways_strategy()
    test_pullback_entry()
    test_strategy_parameters()
    
    print("\n" + "=" * 60)
    print("✅ 所有测试完成！")
    print("=" * 60)
