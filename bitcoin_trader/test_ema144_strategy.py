#!/usr/bin/env python3
"""
EMA144策略测试脚本
快速验证策略是否能正常运行
"""

import sys
import json
from pathlib import Path
import numpy as np
from datetime import datetime, timedelta

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from app.strategies.ema144_trend import EMA144TrendStrategy


def generate_test_klines(num_bars=300):
    """生成测试用的K线数据"""
    base_price = 2000.0
    klines = []
    
    for i in range(num_bars):
        # 生成一个上升趋势的价格
        trend = i * 0.5
        noise = np.random.randn() * 10
        
        close = base_price + trend + noise
        open_price = close + np.random.randn() * 5
        high = max(open_price, close) + abs(np.random.randn() * 3)
        low = min(open_price, close) - abs(np.random.randn() * 3)
        
        timestamp = datetime(2024, 1, 1) + timedelta(hours=i)
        
        klines.append({
            'timestamp': timestamp,
            'open_time': timestamp.timestamp() * 1000,
            'open': open_price,
            'high': high,
            'low': low,
            'close': close,
            'volume': 1000.0 + np.random.randn() * 100
        })
    
    return klines


def test_strategy():
    """测试策略"""
    print("="*60)
    print("EMA144 趋势策略测试")
    print("="*60)
    
    # 1. 加载策略配置
    config_path = Path(__file__).parent / 'app' / 'config' / 'ema144_trend.json'
    print(f"\n1. 加载配置: {config_path}")
    
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    # 合并所有参数
    params = {}
    for section in ['risk_management', 'entry_conditions', 'stop_loss_take_profit', 
                   'exit_conditions', 'daily_risk_controls']:
        if section in config:
            params.update(config[section])
    
    print(f"   ✓ 配置加载成功")
    print(f"   - 总资金: {params.get('total_capital')} USDT")
    print(f"   - 杠杆: {params.get('leverage')}x")
    print(f"   - 止损: {params.get('stop_loss_pct', 0.10)*100}%")
    
    # 2. 初始化策略
    print(f"\n2. 初始化策略")
    strategy = EMA144TrendStrategy(params)
    print(f"   ✓ 策略初始化成功: {strategy.name}")
    
    # 3. 生成测试数据
    print(f"\n3. 生成测试数据")
    klines = generate_test_klines(300)
    print(f"   ✓ 生成了 {len(klines)} 根K线")
    print(f"   - 价格范围: {klines[0]['close']:.2f} ~ {klines[-1]['close']:.2f}")
    
    # 4. 测试策略分析
    print(f"\n4. 测试策略分析")
    
    # 测试不同阶段的K线
    test_windows = [
        (200, "初始阶段"),
        (250, "中期阶段"),
        (299, "最终阶段")
    ]
    
    for idx, stage_name in test_windows:
        current_klines = klines[:idx+1]
        signal = strategy.analyze(current_klines)
        
        print(f"\n   {stage_name} (K线索引 {idx}):")
        print(f"   - 信号: {signal['signal']}")
        print(f"   - 原因: {signal['reason']}")
        
        if signal['signal'] in ['buy', 'sell']:
            print(f"   - 价格: {signal['price']:.2f}")
            print(f"   - 数量: {signal['amount']:.4f}")
            print(f"   - 止损: {signal['stop_loss']:.2f}")
            print(f"   - 止盈: {signal['take_profit']:.2f}")
            
            # 更新策略持仓
            strategy.update_position(signal)
    
    # 5. 测试完成
    print("\n" + "="*60)
    print("✅ 测试完成！策略运行正常")
    print("="*60)
    
    # 打印策略统计
    stats = strategy.get_statistics()
    print(f"\n策略统计:")
    print(f"- 总交易次数: {stats['total_trades']}")
    print(f"- 当前持仓: {'是' if stats['has_position'] else '否'}")
    
    if stats['position_info']:
        pos = stats['position_info']
        print(f"- 持仓方向: {pos['side']}")
        print(f"- 入场价格: {pos['entry_price']:.2f}")
        print(f"- 止损价格: {pos['stop_loss']:.2f}")


if __name__ == "__main__":
    try:
        test_strategy()
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

