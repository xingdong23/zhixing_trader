"""
短线技术策略测试脚本

测试6个战法的检测效果
"""

import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from loguru import logger

from app.core.strategy.short_term_technical import ShortTermTechnicalStrategy


def generate_mock_klines(pattern_type: str, days: int = 60) -> pd.DataFrame:
    """
    生成模拟K线数据
    
    Args:
        pattern_type: 形态类型
            - 'ma_macd': 均线多头+MACD
            - 'year_line': 回踩年线
            - 'double_bottom': 双底
            - 'gap_up': 跳空高开
            - 'round_top': 圆弧顶
            - 'three_suns': 三阳开泰
            - 'sideways': 横盘缩量
        days: 天数
    
    Returns:
        K线DataFrame
    """
    base_price = 100
    dates = pd.date_range(end=datetime.now(), periods=days, freq='D')
    
    if pattern_type == 'ma_macd':
        # 均线多头 + MACD红柱放大
        prices = base_price + np.cumsum(np.random.randn(days) * 0.5 + 0.3)
        volumes = np.random.randint(1000000, 2000000, days)
        
        # 最后3天明显上涨，量能放大
        prices[-3:] = prices[-4] * np.array([1.02, 1.03, 1.04])
        volumes[-3:] = volumes[-4] * np.array([1.2, 1.4, 1.6])
    
    elif pattern_type == 'year_line':
        # 回踩年线企稳
        # 前期上涨
        prices = base_price + np.cumsum(np.random.randn(days) * 0.5 + 0.2)
        # 中期回调到年线
        ma250 = prices.mean()
        prices[-10:] = ma250 + np.random.randn(10) * 0.5
        # 最后2天企稳
        prices[-2:] = ma250 * 1.005
        volumes = np.random.randint(1000000, 2000000, days)
        # 最后几天缩量
        volumes[-5:] = volumes[-6] * np.array([0.8, 0.6, 0.4, 0.3, 0.2])
    
    elif pattern_type == 'double_bottom':
        # 双底形态
        prices = base_price + np.cumsum(np.random.randn(days) * 0.3)
        # 创造两个底
        prices[10] = prices[10] * 0.95  # 第一底
        prices[20] = prices[10] * 1.01  # 第二底（略高）
        # 突破颈线
        neckline = max(prices[10:21])
        prices[-1] = neckline * 1.02
        volumes = np.random.randint(1000000, 2000000, days)
        # 突破时放量
        volumes[-1] = volumes[-2] * 1.8
    
    elif pattern_type == 'gap_up':
        # 跳空高开
        prices = base_price + np.cumsum(np.random.randn(days) * 0.5)
        volumes = np.random.randint(1000000, 2000000, days)
        
        # 今天跳空高开
        yesterday_close = prices[-2]
        today_open = yesterday_close * 1.04  # 高开4%
        today_close = today_open * 1.01
        today_high = today_close * 1.01
        today_low = today_open * 0.995  # 不回补缺口
        
        # 修改最后一天
        prices[-1] = today_close
        volumes[-1] = volumes[-2] * 0.6  # 缩量
        
        # 返回时需要单独处理open/high/low
        df = pd.DataFrame({
            'time': dates,
            'open': prices * 0.998,
            'high': prices * 1.002,
            'low': prices * 0.998,
            'close': prices,
            'volume': volumes,
        })
        
        # 修改最后一天
        df.loc[df.index[-1], 'open'] = today_open
        df.loc[df.index[-1], 'high'] = today_high
        df.loc[df.index[-1], 'low'] = today_low
        df.loc[df.index[-1], 'close'] = today_close
        
        return df
    
    elif pattern_type == 'round_top':
        # 圆弧顶
        # 先上涨
        prices = base_price + np.cumsum(np.random.randn(days) * 0.5 + 0.2)
        # 形成圆弧顶（中间高，两边低）
        peak_idx = days - 7
        prices[peak_idx-3:peak_idx+4] = [
            prices[peak_idx] * 0.98,
            prices[peak_idx] * 0.99,
            prices[peak_idx] * 0.995,
            prices[peak_idx],  # 顶部
            prices[peak_idx] * 0.995,
            prices[peak_idx] * 0.99,
            prices[peak_idx] * 0.98,
        ]
        volumes = np.random.randint(1000000, 2000000, days)
        # 顶部量能递减
        volumes[peak_idx-2:peak_idx+3] = volumes[peak_idx-3] * np.array([0.9, 0.7, 0.5, 0.4, 0.3])
    
    elif pattern_type == 'three_suns':
        # 三阳开泰
        prices = base_price + np.cumsum(np.random.randn(days) * 0.3)
        volumes = np.random.randint(1000000, 2000000, days)
        
        # 最后3天连续阳线
        for i in range(1, 4):
            prices[-i] = prices[-(i+1)] * 1.03  # 每天涨3%
            volumes[-i] = volumes[-(i+1)] * 1.2  # 量能递增
        
        # 突破前高
        previous_high = max(prices[:-3])
        prices[-1] = previous_high * 1.02
    
    elif pattern_type == 'sideways':
        # 横盘缩量
        mid_price = base_price + 10
        prices = mid_price + np.random.randn(days) * 0.5  # 横盘波动小
        volumes = np.random.randint(1000000, 2000000, days)
        # 量能递减
        volumes[-15:] = np.linspace(volumes[-16], volumes[-16] * 0.3, 15)
    
    else:
        # 普通行情
        prices = base_price + np.cumsum(np.random.randn(days) * 0.5)
        volumes = np.random.randint(1000000, 2000000, days)
    
    # 生成OHLC
    df = pd.DataFrame({
        'time': dates,
        'open': prices * 0.998,
        'high': prices * 1.002,
        'low': prices * 0.998,
        'close': prices,
        'volume': volumes,
    })
    
    return df


def test_single_pattern(pattern_type: str):
    """测试单个形态"""
    logger.info(f"\n{'='*60}")
    logger.info(f"测试形态: {pattern_type}")
    logger.info(f"{'='*60}")
    
    # 生成模拟数据
    days = 300 if pattern_type == 'year_line' else 60
    klines = generate_mock_klines(pattern_type, days)
    
    # 创建策略
    strategy = ShortTermTechnicalStrategy()
    
    # 扫描
    result = strategy.scan_stock(f'TEST_{pattern_type.upper()}', klines)
    
    # 打印结果
    print(strategy.format_signal_report(result))
    
    return result


def test_all_patterns():
    """测试所有形态"""
    patterns = [
        'ma_macd',
        'year_line',
        'double_bottom',
        'gap_up',
        'three_suns',
        'round_top',
        'sideways',
    ]
    
    results = []
    
    for pattern in patterns:
        try:
            result = test_single_pattern(pattern)
            results.append({
                'pattern': pattern,
                'detected': bool(result.get('best_signal') or result.get('avoid')),
                'result': result
            })
        except Exception as e:
            logger.error(f"测试{pattern}失败: {e}")
            results.append({
                'pattern': pattern,
                'detected': False,
                'error': str(e)
            })
    
    # 汇总
    logger.info(f"\n{'='*60}")
    logger.info("测试汇总")
    logger.info(f"{'='*60}")
    
    detected_count = sum(1 for r in results if r.get('detected'))
    
    logger.info(f"总测试: {len(patterns)} 个形态")
    logger.info(f"检测成功: {detected_count} 个")
    logger.info(f"检测率: {detected_count/len(patterns)*100:.1f}%")
    
    logger.info(f"\n详细结果:")
    for r in results:
        status = "✅" if r.get('detected') else "❌"
        logger.info(f"  {status} {r['pattern']}")
        if r.get('result') and r['result'].get('best_signal'):
            signal = r['result']['best_signal']
            logger.info(f"     → {signal['signal']} ({signal['confidence']:.1%})")


def test_batch_scan():
    """测试批量扫描"""
    logger.info(f"\n{'='*60}")
    logger.info("测试批量扫描")
    logger.info(f"{'='*60}")
    
    # 生成多只股票数据
    stocks_klines = {}
    
    patterns = ['ma_macd', 'double_bottom', 'three_suns', 'sideways']
    
    for i, pattern in enumerate(patterns):
        days = 300 if pattern == 'year_line' else 60
        klines = generate_mock_klines(pattern, days)
        stocks_klines[f'STOCK{i+1}'] = klines
    
    # 批量扫描
    strategy = ShortTermTechnicalStrategy()
    scan_result = strategy.scan_stocks_batch(stocks_klines)
    
    # 打印结果
    logger.info(f"\n扫描汇总:")
    logger.info(f"  总扫描: {scan_result['summary']['total_scanned']} 只")
    logger.info(f"  买入信号: {scan_result['summary']['total_buy']} 只")
    logger.info(f"  卖出信号: {scan_result['summary']['total_sell']} 只")
    logger.info(f"  避坑: {scan_result['summary']['total_avoid']} 只")
    
    # Top推荐
    top_picks = strategy.get_top_picks(scan_result, top_n=3)
    
    if top_picks:
        logger.info(f"\n🏆 Top {len(top_picks)} 推荐:")
        for stock in top_picks:
            print(strategy.format_signal_report(stock))


def main():
    """主函数"""
    logger.info("="*60)
    logger.info("短线技术策略测试")
    logger.info("="*60)
    
    import argparse
    
    parser = argparse.ArgumentParser(description='测试短线技术策略')
    parser.add_argument(
        '--mode',
        choices=['single', 'all', 'batch'],
        default='all',
        help='测试模式：single(单个), all(所有形态), batch(批量扫描)'
    )
    parser.add_argument(
        '--pattern',
        choices=['ma_macd', 'year_line', 'double_bottom', 'gap_up', 'three_suns', 'round_top', 'sideways'],
        help='单个形态测试时指定形态类型'
    )
    
    args = parser.parse_args()
    
    if args.mode == 'single':
        if not args.pattern:
            logger.error("单个形态测试需要指定--pattern参数")
            return
        test_single_pattern(args.pattern)
    
    elif args.mode == 'all':
        test_all_patterns()
    
    elif args.mode == 'batch':
        test_batch_scan()
    
    logger.info("\n✅ 测试完成！")


if __name__ == "__main__":
    main()

