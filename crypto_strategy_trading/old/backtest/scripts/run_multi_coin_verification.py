import sys
import os
import logging
import pandas as pd
from pathlib import Path
from typing import Dict, List

"""
📊 多币种批量验证脚本 (Multi-Coin Verification)

目的:
    在多个币种上单独运行 **南瓜汤策略**，以对比其表现。
"""

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backtest.core import BacktestEngine, DataLoader
from strategies.pumpkin_soup.strategy import PumpkinSoupStrategy

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_verification():
    # 1. 准备数据
    data_dir = Path(__file__).parent.parent / 'data'
    
    # 币种列表
    coins = ['SOLUSDT']
    
    results = []
    
    for coin in coins:
        file_path = data_dir / f"{coin}-1h-merged.csv"
        if not file_path.exists():
            logger.warning(f"文件不存在: {file_path}")
            continue
            
        logger.info(f"正在回测: {coin} ...")
        
        # 加载数据
        loader = DataLoader(file_path)
        df = loader.load()
        
        # Convert to datetime index
        if 'open_time' in df.columns:
            df['timestamp'] = pd.to_datetime(df['open_time'], unit='ms')
            df.set_index('timestamp', inplace=True)
        
        # 初始化策略 (使用宽松参数)
        strategy = PumpkinSoupStrategy(
            parameters={
                'ma_window': 200,
                'ewo_fast': 5,
                'ewo_slow': 35,
                'vol_window': 20,
                'vol_factor': 2.0,
                'risk_per_trade': 0.02,
                'enable_mtf_filter': False,
                'enable_chop_filter': False,
                'enable_adx_filter': False,
                'ema_spread_threshold': 0.005,
            }
        )
        
        # 运行回测 (2024年)
        engine = BacktestEngine(strategy, initial_capital=10000.0)
        # 截取 2024 数据
        df_2024 = df[df.index >= '2024-01-01']
        
        if df_2024.empty:
            logger.warning(f"{coin} 2024年无数据")
            continue
            
        # Convert to klines list
        klines = loader.to_klines(df_2024)
        report = engine.run(klines)
        
        results.append({
            'coin': coin,
            'total_return': report['summary']['total_return'],
            'win_rate': report['summary']['win_rate'],
            'trades': report['summary']['total_trades'],
            'max_drawdown': report['summary']['max_drawdown']
        })
        
    # 打印汇总
    print("\n" + "="*60)
    print(f"{'Coin':<10} {'Return':<10} {'Win Rate':<10} {'Trades':<10} {'Max DD':<10}")
    print("-" * 60)
    for res in results:
        print(f"{res['coin']:<10} {res['total_return']:<10.2%} {res['win_rate']:<10.2%} {res['trades']:<10} {res['max_drawdown']:<10.2%}")
    print("="*60)

if __name__ == "__main__":
    run_verification()
