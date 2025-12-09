
import sys
import os
import logging
import pandas as pd
from pathlib import Path
from datetime import datetime

"""
📊 多币种批量验证脚本 (Multi-Coin Verification)

目的:
    在多个币种上单独运行 **南瓜汤策略**，以对比其表现。
    这有助于识别哪些资产最适合该趋势跟踪策略。

逻辑:
    - 遍历预定义的币种列表 (SOL, ETH, BNB 等)。
    - 对每个币种在相同时间段内运行标准回测。
    - 打印包含收益率、回撤、胜率等指标的对比汇总表。

用法:
    python backtest/scripts/run_multi_coin_verification.py

输出:
    在控制台打印每个币种的性能指标表格。
"""

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backtest.core import DataLoader, BacktestEngine, PerformanceAnalyzer
from strategies.pumpkin_soup.strategy import PumpkinSoupStrategy

# Configure logging (suppress detailed logs for batch run)
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger("MultiCoinVerification")
logger.setLevel(logging.INFO)

def run_verification():
    coins = ['SOLUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'DOGEUSDT', 'XRPUSDT']
    results_summary = []
    
    # Common Parameters
    start_date = "2023-01-01"
    end_date = "2023-03-10"
    
    strategy_params = {
        "ema_fast_len": 8,
        "ema_mid_len": 21,
        "ema_slow_len": 55,
        "ewo_fast_len": 5,
        "ewo_slow_len": 35,
        "enable_chop_filter": True,
        "choppiness_threshold": 50.0,
        "enable_adx_filter": True,
        "adx_threshold": 25.0,
        "enable_regime_filter": False, # Disabled for short backtest
        "regime_ema_len": 2400,
        "enable_mtf_filter": True,
        "htf_multiplier": 4,
        "risk_per_trade": 0.05,
        "leverage": 5.0,
        "enable_vol_targeting": True,
        "volatility_target": 0.4,
        "volatility_window": 480,
        "total_capital": 10000.0
    }
    
    backtest_settings = {
        "initial_capital": 10000.0,
        "maker_fee_rate": 0.0002,
        "taker_fee_rate": 0.0005,
        "slippage_rate": 0.0001,
        "window_size": 1000 # Increased window size
    }

    print(f"\n{'='*80}")
    print(f"🚀 Multi-Coin Pumpkin Soup Verification (Fusion Strategy Test)")
    print(f"📅 Period: {start_date} to {end_date}")
    print(f"{'='*80}\n")

    for coin in coins:
        try:
            print(f"🔄 Testing {coin}...", end="", flush=True)
            
            # Load Data
            file_path = f"backtest/data/{coin}-1h-merged.csv"
            if not os.path.exists(file_path):
                print(f" ❌ File not found: {file_path}")
                continue
                
            data_loader = DataLoader(file_path)
            df = data_loader.load()
            
            # Filter Date
            start_ts = pd.to_datetime(start_date).timestamp() * 1000
            end_ts = pd.to_datetime(end_date).timestamp() * 1000
            
            df = df[(df['open_time'] >= start_ts) & (df['open_time'] < end_ts)]
            
            if len(df) == 0:
                print(f" ❌ No data in date range")
                continue
                
            klines = data_loader.to_klines(df)
            
            # Initialize Strategy
            strategy = PumpkinSoupStrategy(strategy_params)
            
            # Run Backtest
            engine = BacktestEngine(
                strategy,
                initial_capital=backtest_settings['initial_capital'],
                taker_fee_rate=backtest_settings['taker_fee_rate'],
                maker_fee_rate=backtest_settings['maker_fee_rate'],
                slippage_rate=backtest_settings['slippage_rate']
            )
            
            result = engine.run(klines, window_size=backtest_settings['window_size'])
            
            # Collect Metrics
            summary = result['summary']
            metrics = {
                "Coin": coin,
                "Total Return": f"{summary['total_return']:.2f}%",
                "Max Drawdown": f"{summary['max_drawdown']:.2f}%",
                "Win Rate": f"{summary['win_rate']:.2f}%",
                "Profit Factor": f"{summary['profit_factor']:.2f}",
                "Trades": summary['total_trades']
            }
            results_summary.append(metrics)
            print(f" ✅ Return: {metrics['Total Return']} | DD: {metrics['Max Drawdown']}")
            
        except Exception as e:
            print(f" ❌ Error: {str(e)}")

    # Print Summary Table
    print(f"\n{'='*80}")
    print(f"📊 Verification Results Summary")
    print(f"{'='*80}")
    
    headers = ["Coin", "Total Return", "Max Drawdown", "Win Rate", "Profit Factor", "Trades"]
    # Calculate column widths
    widths = [max(len(str(row.get(h, ""))) for row in results_summary + [{h: h}]) + 2 for h in headers]
    
    # Print Header
    header_str = "".join(h.ljust(w) for h, w in zip(headers, widths))
    print(header_str)
    print("-" * len(header_str))
    
    # Print Rows
    for row in results_summary:
        print("".join(str(row.get(h, "")).ljust(w) for h, w in zip(headers, widths)))
    print(f"{'='*80}\n")

if __name__ == "__main__":
    run_verification()
