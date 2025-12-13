import sys
import os
import logging
import pandas as pd
from pathlib import Path
from typing import Dict, List

"""
📈 BTC 长期回测脚本 (Long-term BTC Backtest)

目的:
    在 BTCUSDT 上运行原始南瓜汤策略，覆盖 2023-2025 年数据。
    验证策略在长周期内的表现。
"""

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backtest.core import BacktestEngine, DataLoader
from strategies.pumpkin_soup.strategy import PumpkinSoupStrategy

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_long_term_backtest():
    # 1. 准备数据
    data_dir = Path(__file__).parent.parent / 'data'
    file_path = data_dir / "BTCUSDT-1h-merged.csv"
    
    if not file_path.exists():
        logger.error(f"数据文件不存在: {file_path}")
        return
        
    logger.info(f"正在加载数据: {file_path} ...")
    
    # 加载数据
    loader = DataLoader(file_path)
    df = loader.load()
    
    # 转换索引
    if 'open_time' in df.columns:
        df['timestamp'] = pd.to_datetime(df['open_time'], unit='ms')
        df.set_index('timestamp', inplace=True)
    
    # 2. 初始化策略 (使用原始/标准参数)
    # 原始参数通常较为严格，旨在捕捉强趋势
    strategy = PumpkinSoupStrategy(
        parameters={
            'ma_window': 200,
            'ewo_fast': 5,
            'ewo_slow': 35,
            'vol_window': 20,
            'vol_factor': 2.0,
            'risk_per_trade': 0.02,
            # 激进模式：关闭大部分过滤器
            'enable_mtf_filter': False,  # 关闭多周期共振
            'enable_chop_filter': False, 
            'enable_adx_filter': False,
            'ema_spread_threshold': 0.0, # 移除EMA距离限制
            'max_consecutive_losses': 1000, # 实际上移除连败限制
        }
    )
    
    # 3. 运行回测
    logger.info("开始回测 (2023-2025)...")
    engine = BacktestEngine(strategy, initial_capital=10000.0)
    
    # 转换为 K线列表
    klines = loader.to_klines(df)
    
    report = engine.run(klines)
    
    # 4. 打印结果
    summary = report['summary']
    print("\n" + "="*60)
    print("📊 BTC 长期回测结果 (2023-2025)")
    print("="*60)
    print(f"初始资金: ${summary['initial_capital']:.2f}")
    print(f"最终权益: ${summary['final_capital']:.2f}")
    print(f"总收益率: {summary['total_return']:.2f}%")
    print(f"最大回撤: {summary['max_drawdown']:.2f}%")
    print(f"总交易数: {summary['total_trades']}")
    print(f"胜率: {summary['win_rate']:.2f}%")
    print(f"盈亏比: {summary['profit_factor']:.2f}")
    print(f"买入持有: {summary['buy_and_hold_return']:.2f}%")
    print("="*60)

if __name__ == "__main__":
    run_long_term_backtest()
