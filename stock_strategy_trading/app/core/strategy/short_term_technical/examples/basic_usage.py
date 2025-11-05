"""
基础使用示例

演示如何使用短线技术策略扫描股票
"""

import sys
from pathlib import Path

# 添加项目根目录
project_root = Path(__file__).parent.parent.parent.parent.parent
sys.path.insert(0, str(project_root))

import pandas as pd
from app.core.strategy.short_term_technical import ShortTermTechnicalStrategy
from app.repositories.kline_repository import KLineRepository


def example_1_single_stock():
    """示例1：扫描单只股票"""
    
    print("="*60)
    print("示例1：扫描单只股票")
    print("="*60)
    
    # 创建策略
    strategy = ShortTermTechnicalStrategy()
    
    # 获取K线数据（从数据库）
    repo = KLineRepository()
    klines_data = repo.get_klines_by_code('AAPL', timeframe='1D', limit=300)
    
    # 转换为DataFrame
    klines = pd.DataFrame([
        {
            'time': k.time_key,
            'open': k.open_price,
            'high': k.high_price,
            'low': k.low_price,
            'close': k.close_price,
            'volume': k.volume,
        }
        for k in klines_data
    ])
    
    # 扫描
    result = strategy.scan_stock('AAPL', klines)
    
    # 打印报告
    print(strategy.format_signal_report(result))


def example_2_batch_scan():
    """示例2：批量扫描多只股票"""
    
    print("="*60)
    print("示例2：批量扫描多只股票")
    print("="*60)
    
    # 创建策略
    strategy = ShortTermTechnicalStrategy()
    
    # 股票列表
    symbols = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL']
    
    # 获取所有K线数据
    repo = KLineRepository()
    stocks_klines = {}
    
    for symbol in symbols:
        try:
            klines_data = repo.get_klines_by_code(symbol, timeframe='1D', limit=300)
            
            if klines_data:
                klines = pd.DataFrame([
                    {
                        'time': k.time_key,
                        'open': k.open_price,
                        'high': k.high_price,
                        'low': k.low_price,
                        'close': k.close_price,
                        'volume': k.volume,
                    }
                    for k in klines_data
                ])
                stocks_klines[symbol] = klines
        except Exception as e:
            print(f"获取{symbol}数据失败: {e}")
    
    # 批量扫描
    scan_result = strategy.scan_stocks_batch(stocks_klines)
    
    # 打印汇总
    print(f"\n扫描结果汇总：")
    print(f"  总扫描: {scan_result['summary']['total_scanned']} 只")
    print(f"  买入信号: {scan_result['summary']['total_buy']} 只")
    print(f"  卖出信号: {scan_result['summary']['total_sell']} 只")
    print(f"  避坑: {scan_result['summary']['total_avoid']} 只")
    
    # 获取Top推荐
    top_picks = strategy.get_top_picks(scan_result, top_n=3)
    
    if top_picks:
        print(f"\n🏆 Top {len(top_picks)} 推荐：")
        for stock in top_picks:
            print(strategy.format_signal_report(stock))
    else:
        print("\n暂无符合条件的股票")


def example_3_custom_config():
    """示例3：自定义配置参数"""
    
    print("="*60)
    print("示例3：自定义配置参数")
    print("="*60)
    
    # 自定义配置
    config = {
        'ma_periods': [5, 10, 20],       # 均线周期
        'macd_params': [12, 26, 9],      # MACD参数
        'gap_threshold': 0.03,           # 跳空阈值3%
        'volume_threshold': 1.5,         # 量能放大阈值1.5倍
        'sideways_days': 15,             # 横盘天数
        'sideways_range': 0.05,          # 横盘波动范围5%
    }
    
    # 创建策略
    strategy = ShortTermTechnicalStrategy(config=config)
    
    print("✅ 策略已创建（自定义配置）")
    print(f"配置: {config}")


def example_4_detailed_analysis():
    """示例4：查看详细分析数据"""
    
    print("="*60)
    print("示例4：查看详细分析数据")
    print("="*60)
    
    strategy = ShortTermTechnicalStrategy()
    
    # 获取K线数据
    repo = KLineRepository()
    klines_data = repo.get_klines_by_code('AAPL', timeframe='1D', limit=300)
    
    klines = pd.DataFrame([
        {
            'time': k.time_key,
            'open': k.open_price,
            'high': k.high_price,
            'low': k.low_price,
            'close': k.close_price,
            'volume': k.volume,
        }
        for k in klines_data
    ])
    
    # 扫描
    result = strategy.scan_stock('AAPL', klines)
    
    # 打印所有检测到的信号
    if result['signals']:
        print(f"\n检测到 {len(result['signals'])} 个信号：\n")
        
        for i, signal in enumerate(result['signals'], 1):
            print(f"信号 {i}:")
            print(f"  形态: {signal['pattern']}")
            print(f"  信号: {signal['signal']}")
            print(f"  置信度: {signal['confidence']:.1%}")
            print(f"  原因: {signal['reason']}")
            
            if signal.get('details'):
                print(f"  详细数据:")
                for key, value in signal['details'].items():
                    print(f"    - {key}: {value}")
            print()
    else:
        print("未检测到任何信号")


def main():
    """主函数"""
    
    examples = {
        '1': ('扫描单只股票', example_1_single_stock),
        '2': ('批量扫描多只股票', example_2_batch_scan),
        '3': ('自定义配置参数', example_3_custom_config),
        '4': ('查看详细分析数据', example_4_detailed_analysis),
    }
    
    print("\n短线技术策略 - 使用示例\n")
    print("选择一个示例运行：")
    for key, (name, _) in examples.items():
        print(f"  {key}. {name}")
    print("  0. 运行所有示例")
    
    choice = input("\n请输入选项 (0-4): ").strip()
    
    if choice == '0':
        for name, func in examples.values():
            print(f"\n\n{'='*60}")
            print(f"运行示例: {name}")
            print(f"{'='*60}\n")
            try:
                func()
            except Exception as e:
                print(f"❌ 示例运行失败: {e}")
    
    elif choice in examples:
        name, func = examples[choice]
        try:
            func()
        except Exception as e:
            print(f"❌ 示例运行失败: {e}")
            import traceback
            traceback.print_exc()
    
    else:
        print("无效选项")


if __name__ == "__main__":
    main()

