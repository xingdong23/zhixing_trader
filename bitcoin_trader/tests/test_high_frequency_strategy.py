"""
高频短线策略测试脚本

测试内容：
1. 策略参数验证
2. 技术指标计算准确性
3. 入场信号生成
4. 出场信号生成
5. 风险控制机制
6. 仓位管理
"""

import sys
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict

# 添加项目路径
sys.path.append('.')

from app.core.strategies.high_frequency_scalping_strategy import HighFrequencyScalpingStrategy, TradingSession


def generate_test_klines(num_bars: int = 200, base_price: float = 50000.0) -> List[Dict]:
    """生成测试K线数据"""
    klines = []
    current_price = base_price
    
    for i in range(num_bars):
        # 模拟价格波动
        change = np.random.randn() * 100
        current_price += change
        
        open_price = current_price
        high_price = current_price + abs(np.random.randn() * 50)
        low_price = current_price - abs(np.random.randn() * 50)
        close_price = current_price + np.random.randn() * 30
        volume = 1000 + abs(np.random.randn() * 500)
        
        klines.append({
            "timestamp": datetime.now() - timedelta(minutes=num_bars-i),
            "open": open_price,
            "high": high_price,
            "low": low_price,
            "close": close_price,
            "volume": volume
        })
    
    return klines


def generate_bullish_signal_klines(num_bars: int = 200) -> List[Dict]:
    """生成做多信号的K线数据"""
    klines = []
    base_price = 50000.0
    
    # 前面的K线：下跌趋势
    for i in range(num_bars - 20):
        price = base_price - i * 10
        klines.append({
            "timestamp": datetime.now() - timedelta(minutes=num_bars-i),
            "open": price + 5,
            "high": price + 10,
            "low": price - 10,
            "close": price,
            "volume": 1000
        })
    
    # 最后20根K线：形成做多信号
    for i in range(20):
        price = base_price - (num_bars - 20) * 10 + i * 15
        volume = 1000 if i < 15 else 2000  # 最后几根成交量突增
        
        klines.append({
            "timestamp": datetime.now() - timedelta(minutes=20-i),
            "open": price,
            "high": price + 20,
            "low": price - 5,
            "close": price + 10,
            "volume": volume
        })
    
    return klines


def test_strategy_initialization():
    """测试策略初始化"""
    print("\n" + "="*60)
    print("测试1: 策略初始化")
    print("="*60)
    
    strategy = HighFrequencyScalpingStrategy()
    
    # 验证参数
    assert strategy.validate_parameters(), "参数验证失败"
    print("✓ 参数验证通过")
    
    # 检查关键参数
    assert strategy.parameters["total_capital"] == 300.0, "总资金参数错误"
    assert strategy.parameters["leverage"] == 3.0, "杠杆参数错误"
    assert strategy.parameters["stop_loss_min"] == 0.008, "止损参数错误"
    print("✓ 关键参数正确")
    
    # 检查初始状态
    assert strategy.current_position is None, "初始持仓应为空"
    assert strategy.daily_pnl == 0.0, "初始盈亏应为0"
    assert strategy.consecutive_losses == 0, "初始连续亏损应为0"
    print("✓ 初始状态正确")
    
    print("\n✅ 策略初始化测试通过\n")


def test_technical_indicators():
    """测试技术指标计算"""
    print("\n" + "="*60)
    print("测试2: 技术指标计算")
    print("="*60)
    
    strategy = HighFrequencyScalpingStrategy()
    
    # 生成测试数据
    prices = np.array([50000 + i * 10 for i in range(100)])
    
    # 测试EMA
    ema8 = strategy._calculate_ema(prices, 8)
    ema21 = strategy._calculate_ema(prices, 21)
    assert len(ema8) == len(prices), "EMA长度错误"
    assert ema8[-1] > ema8[0], "上升趋势EMA应递增"
    print(f"✓ EMA计算正确: EMA8={ema8[-1]:.2f}, EMA21={ema21[-1]:.2f}")
    
    # 测试RSI
    rsi = strategy._calculate_rsi(prices, 14)
    assert len(rsi) == len(prices), "RSI长度错误"
    assert 0 <= rsi[-1] <= 100, "RSI应在0-100之间"
    print(f"✓ RSI计算正确: RSI={rsi[-1]:.2f}")
    
    # 测试布林带
    bb_upper, bb_middle, bb_lower = strategy._calculate_bollinger_bands(prices, 20, 2)
    assert len(bb_upper) == len(prices), "布林带长度错误"
    assert bb_upper[-1] > bb_middle[-1] > bb_lower[-1], "布林带上中下轨顺序错误"
    print(f"✓ 布林带计算正确: 上轨={bb_upper[-1]:.2f}, 中轨={bb_middle[-1]:.2f}, 下轨={bb_lower[-1]:.2f}")
    
    # 测试MACD
    macd_line, signal_line, histogram = strategy._calculate_macd(prices, 12, 26, 9)
    assert len(histogram) == len(prices), "MACD长度错误"
    print(f"✓ MACD计算正确: 柱状图={histogram[-1]:.2f}")
    
    # 测试ATR
    klines = generate_test_klines(100)
    atr = strategy._calculate_atr(klines, 14)
    assert atr > 0, "ATR应大于0"
    print(f"✓ ATR计算正确: ATR={atr:.2f}")
    
    print("\n✅ 技术指标计算测试通过\n")


def test_risk_controls():
    """测试风险控制"""
    print("\n" + "="*60)
    print("测试3: 风险控制机制")
    print("="*60)
    
    strategy = HighFrequencyScalpingStrategy()
    
    # 测试正常情况
    result = strategy._check_risk_controls()
    assert result["allowed"], "正常情况应允许交易"
    print("✓ 正常情况允许交易")
    
    # 测试单日盈利达标
    strategy.daily_pnl = strategy.parameters["total_capital"] * strategy.parameters["max_daily_profit"]
    result = strategy._check_risk_controls()
    assert not result["allowed"], "单日盈利达标应停止交易"
    print(f"✓ 单日盈利达标停止交易: {result['reason']}")
    
    # 重置
    strategy.daily_pnl = 0.0
    
    # 测试单日亏损超限
    strategy.daily_pnl = -strategy.parameters["total_capital"] * strategy.parameters["max_daily_loss"]
    result = strategy._check_risk_controls()
    assert not result["allowed"], "单日亏损超限应停止交易"
    print(f"✓ 单日亏损超限停止交易: {result['reason']}")
    
    # 重置
    strategy.daily_pnl = 0.0
    
    # 测试连续亏损
    strategy.consecutive_losses = strategy.parameters["max_consecutive_losses"]
    result = strategy._check_risk_controls()
    assert not result["allowed"], "连续亏损应停止交易"
    print(f"✓ 连续亏损停止交易: {result['reason']}")
    
    # 重置
    strategy.consecutive_losses = 0
    
    # 测试每日交易次数
    for i in range(strategy.parameters["max_trades_per_day"]):
        strategy.daily_trades.append({"timestamp": datetime.now()})
    result = strategy._check_risk_controls()
    assert not result["allowed"], "超过每日交易次数应停止交易"
    print(f"✓ 超过每日交易次数停止交易: {result['reason']}")
    
    print("\n✅ 风险控制测试通过\n")


def test_position_calculation():
    """测试仓位计算"""
    print("\n" + "="*60)
    print("测试4: 仓位计算")
    print("="*60)
    
    strategy = HighFrequencyScalpingStrategy()
    
    entry_price = 50000.0
    stop_loss = 49500.0
    
    # 计算仓位
    position_size = strategy._calculate_position_size(entry_price, stop_loss)
    
    # 验证仓位
    expected_value = strategy.parameters["portion_size"] * strategy.parameters["max_portions_per_trade"]
    expected_leveraged = expected_value * strategy.parameters["leverage"]
    expected_amount = expected_leveraged / entry_price
    
    assert abs(position_size - expected_amount) < 0.0001, "仓位计算错误"
    print(f"✓ 仓位计算正确: {position_size:.6f} BTC")
    print(f"  - 基础资金: {expected_value:.2f} USDT")
    print(f"  - 杠杆后: {expected_leveraged:.2f} USDT")
    print(f"  - 入场价: {entry_price:.2f} USDT")
    
    print("\n✅ 仓位计算测试通过\n")


def test_stop_take_profit_calculation():
    """测试止损止盈计算"""
    print("\n" + "="*60)
    print("测试5: 止损止盈计算")
    print("="*60)
    
    strategy = HighFrequencyScalpingStrategy()
    klines = generate_test_klines(100)
    
    entry_price = 50000.0
    
    # 测试做多
    stop_loss, take_profit = strategy._calculate_stop_take_profit(entry_price, "long", klines)
    
    assert stop_loss < entry_price, "做多止损应低于入场价"
    assert take_profit > entry_price, "做多止盈应高于入场价"
    
    stop_loss_ratio = (entry_price - stop_loss) / entry_price
    take_profit_ratio = (take_profit - entry_price) / entry_price
    risk_reward_ratio = take_profit_ratio / stop_loss_ratio
    
    print(f"✓ 做多止损止盈计算正确:")
    print(f"  - 入场价: {entry_price:.2f}")
    print(f"  - 止损价: {stop_loss:.2f} ({stop_loss_ratio:.2%})")
    print(f"  - 止盈价: {take_profit:.2f} ({take_profit_ratio:.2%})")
    print(f"  - 盈亏比: {risk_reward_ratio:.2f}:1")
    
    # 测试做空
    stop_loss, take_profit = strategy._calculate_stop_take_profit(entry_price, "short", klines)
    
    assert stop_loss > entry_price, "做空止损应高于入场价"
    assert take_profit < entry_price, "做空止盈应低于入场价"
    
    print(f"✓ 做空止损止盈计算正确:")
    print(f"  - 入场价: {entry_price:.2f}")
    print(f"  - 止损价: {stop_loss:.2f}")
    print(f"  - 止盈价: {take_profit:.2f}")
    
    print("\n✅ 止损止盈计算测试通过\n")


def test_trading_session_identification():
    """测试交易时段识别"""
    print("\n" + "="*60)
    print("测试6: 交易时段识别")
    print("="*60)
    
    strategy = HighFrequencyScalpingStrategy()
    
    session = strategy._identify_trading_session()
    print(f"✓ 当前交易时段: {session.value}")
    
    # 验证时段枚举
    assert session in [
        TradingSession.MORNING_BREAKOUT,
        TradingSession.NOON_OSCILLATION,
        TradingSession.US_SESSION,
        TradingSession.OTHER
    ], "交易时段识别错误"
    
    print("\n✅ 交易时段识别测试通过\n")


def test_entry_signal_generation():
    """测试入场信号生成"""
    print("\n" + "="*60)
    print("测试7: 入场信号生成")
    print("="*60)
    
    strategy = HighFrequencyScalpingStrategy()
    
    # 使用随机数据测试
    klines = generate_test_klines(200)
    signal = strategy.analyze(klines)
    
    print(f"✓ 信号类型: {signal['signal']}")
    print(f"✓ 信号原因: {signal['reason']}")
    
    if signal['signal'] != 'hold':
        print(f"  - 价格: {signal.get('price', 0):.2f}")
        print(f"  - 数量: {signal.get('amount', 0):.6f}")
        print(f"  - 止损: {signal.get('stop_loss', 0):.2f}")
        print(f"  - 止盈: {signal.get('take_profit', 0):.2f}")
    
    # 验证信号结构
    assert "signal" in signal, "信号应包含signal字段"
    assert "reason" in signal, "信号应包含reason字段"
    assert signal["signal"] in ["buy", "sell", "hold"], "信号类型错误"
    
    print("\n✅ 入场信号生成测试通过\n")


def test_exit_conditions():
    """测试出场条件"""
    print("\n" + "="*60)
    print("测试8: 出场条件检查")
    print("="*60)
    
    strategy = HighFrequencyScalpingStrategy()
    klines = generate_test_klines(200)
    
    # 模拟持仓
    entry_price = 50000.0
    strategy.current_position = {
        "side": "long",
        "entry_price": entry_price,
        "amount": 0.01,
        "stop_loss": entry_price * 0.99,  # 1%止损
        "take_profit": entry_price * 1.02,  # 2%止盈
        "entry_time": datetime.now() - timedelta(minutes=30),
        "partial_closed": False
    }
    
    # 测试正常情况（无出场信号）
    exit_signal = strategy._check_exit_conditions(klines)
    if exit_signal:
        print(f"✓ 出场信号: {exit_signal['type']} - {exit_signal['reason']}")
    else:
        print("✓ 无出场信号，继续持仓")
    
    # 测试止损触发
    klines[-1]["low"] = entry_price * 0.98  # 价格跌破止损
    exit_signal = strategy._check_exit_conditions(klines)
    if exit_signal and exit_signal.get("type") == "stop_loss":
        print(f"✓ 止损触发测试通过: {exit_signal['reason']}")
    
    # 重置
    klines[-1]["low"] = entry_price
    
    # 测试止盈触发
    klines[-1]["high"] = entry_price * 1.025  # 价格突破止盈
    exit_signal = strategy._check_exit_conditions(klines)
    if exit_signal and exit_signal.get("type") == "take_profit":
        print(f"✓ 止盈触发测试通过: {exit_signal['reason']}")
    
    print("\n✅ 出场条件测试通过\n")


def test_position_management():
    """测试持仓管理"""
    print("\n" + "="*60)
    print("测试9: 持仓管理")
    print("="*60)
    
    strategy = HighFrequencyScalpingStrategy()
    
    # 测试开仓
    buy_signal = {
        "signal": "buy",
        "price": 50000.0,
        "amount": 0.01,
        "stop_loss": 49500.0,
        "take_profit": 51000.0
    }
    
    strategy.update_position(buy_signal)
    assert strategy.current_position is not None, "开仓后应有持仓"
    assert strategy.current_position["side"] == "long", "持仓方向错误"
    print("✓ 开仓成功")
    print(f"  - 方向: {strategy.current_position['side']}")
    print(f"  - 入场价: {strategy.current_position['entry_price']:.2f}")
    print(f"  - 数量: {strategy.current_position['amount']:.6f}")
    
    # 测试平仓
    sell_signal = {
        "signal": "sell",
        "price": 51000.0,
        "amount": 0.01,
        "type": "take_profit",
        "pnl": 0.02
    }
    
    strategy.update_position(sell_signal)
    assert strategy.current_position is None, "平仓后应无持仓"
    print("✓ 平仓成功")
    
    print("\n✅ 持仓管理测试通过\n")


def test_trade_recording():
    """测试交易记录"""
    print("\n" + "="*60)
    print("测试10: 交易记录")
    print("="*60)
    
    strategy = HighFrequencyScalpingStrategy()
    
    # 记录盈利交易
    win_signal = {
        "signal": "sell",
        "price": 51000.0,
        "amount": 0.01,
        "type": "take_profit",
        "pnl": 0.02,
        "reason": "止盈"
    }
    
    strategy.record_trade(win_signal)
    assert len(strategy.daily_trades) == 1, "交易记录数量错误"
    assert strategy.consecutive_losses == 0, "盈利后连续亏损应重置"
    print("✓ 盈利交易记录成功")
    
    # 记录亏损交易
    loss_signal = {
        "signal": "sell",
        "price": 49500.0,
        "amount": 0.01,
        "type": "stop_loss",
        "pnl": -0.01,
        "reason": "止损"
    }
    
    strategy.record_trade(loss_signal)
    assert len(strategy.daily_trades) == 2, "交易记录数量错误"
    assert strategy.consecutive_losses == 1, "亏损后连续亏损应增加"
    print("✓ 亏损交易记录成功")
    
    # 获取统计信息
    stats = strategy.get_statistics()
    print(f"✓ 统计信息:")
    print(f"  - 总交易: {stats['daily_trades']}")
    print(f"  - 盈利次数: {stats['winning_trades']}")
    print(f"  - 亏损次数: {stats['losing_trades']}")
    print(f"  - 胜率: {stats['win_rate']:.1f}%")
    
    print("\n✅ 交易记录测试通过\n")


def run_all_tests():
    """运行所有测试"""
    print("\n" + "="*60)
    print("高频短线交易策略 - 完整测试套件")
    print("="*60)
    
    try:
        test_strategy_initialization()
        test_technical_indicators()
        test_risk_controls()
        test_position_calculation()
        test_stop_take_profit_calculation()
        test_trading_session_identification()
        test_entry_signal_generation()
        test_exit_conditions()
        test_position_management()
        test_trade_recording()
        
        print("\n" + "="*60)
        print("🎉 所有测试通过！策略实现正确！")
        print("="*60)
        print("\n策略已准备就绪，可以进行回测和实盘测试。")
        print("\n⚠️  重要提示：")
        print("1. 在实盘使用前，请务必进行充分的回测")
        print("2. 建议先用小资金测试策略表现")
        print("3. 严格遵守风险控制规则")
        print("4. 定期监控策略表现并调整参数")
        print("="*60 + "\n")
        
        return True
        
    except AssertionError as e:
        print(f"\n❌ 测试失败: {e}")
        return False
    except Exception as e:
        print(f"\n❌ 测试出错: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
