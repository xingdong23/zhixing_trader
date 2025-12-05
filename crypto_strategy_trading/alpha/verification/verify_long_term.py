import os
import sys
import pandas as pd
import logging
from datetime import datetime

# Add project root
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

from strategies.martingale_sniper.strategy_single import MartingaleSniperSingleStrategy
from alpha.optimization.optuna_martingale import load_data

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

def run_backtest(df, params, year):
    """Run backtest for a specific dataframe slice"""
    if df.empty:
        print(f"{year} | No Data")
        return

    strategy = MartingaleSniperSingleStrategy(params)
    
    # Run simulation
    for i in range(len(df)):
        # Need enough history for ATR (100 candles)
        if i < 100:
            continue
            
        # Slice data for strategy (giving enough context)
        # We give 100 candles of context
        df_slice = df.iloc[i-100:i+1]
        
        # Current candle time
        current_time = df_slice.iloc[-1]['timestamp']
        current_price = float(df_slice.iloc[-1]['close'])
        
        # 1. Check existing position
        if strategy.current_position:
            signal = strategy.check_position(current_price, now=current_time)
            if signal:
                strategy.update_position(signal)
        
        # 2. Look for new entry
        else:
            signal = strategy.analyze(df_slice)
            if signal:
                strategy.update_position(signal)

    stats = strategy.get_stats()
    
    print(f"{year} | {stats['return_pct']:>8.2f}% | {stats['total_trades']:>6} | {stats['total_rounds']:>6} | {stats['win_rate']:>8.1f}% | {stats['current_capital']:>10.2f}")

def verify_long_term(symbol='BTCUSDT', timeframe='1h'):
    print(f"\n🚀 Long-term Robustness Test for {symbol} ({timeframe})")
    print("-" * 80)
    print(f"{'Year':<5} | {'Return %':<9} | {'Trades':<6} | {'Rounds':<6} | {'Win Rate':<9} | {'Final Cap':<10}")
    print("-" * 80)

    # Load ALL data
    data_dir = os.path.join(project_root, 'backtest', 'data')
    df = load_data(symbol, data_dir)
    
    if df is None or df.empty:
        print("❌ No data found!")
        return

    # Ensure timestamp is datetime
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # Load Deep Mining Params (Trial 63 - The "Aggressive Survivor")
    import json
    try:
        params_path = os.path.join(project_root, 'alpha', 'optimization', 'best_params_deep_DOGEUSDT.json')
        with open(params_path, 'r') as f:
            params = json.load(f)
        print(f"✅ Loaded Deep Mining Params (Trend EMA: {params.get('trend_ema_period')}, Seq: {params.get('seq_type', 'custom')})")
    except Exception as e:
        print(f"⚠️ Failed to load params, using default: {e}")
        # Fallback ensuring trend_ema_period is present
        params = {
            'leverage': 15,
            'take_profit_pct': 0.21,
            'stop_loss_pct': 0.42,
            'explosion_threshold': 0.025,
            'volume_spike_ratio': 4.0,
            'cooldown_minutes': 15,
            'max_daily_rounds': 5,
            'martingale_sequence': [10, 20, 40, 80, 150],
            'fee_rate': 0.0005,
            'slippage': 0.0005,
            'atr_period': 14,
            'atr_threshold': 0.001,
            'trend_ema_period': 0, # Default: disabled
            'symbol': symbol,
            'total_capital': 300.0
        }

    # Years to test
    years = [2021, 2022, 2023, 2024, 2025]
    
    for year in years:
        # Filter data for the year
        df_year = df[df['timestamp'].dt.year == year].reset_index(drop=True)
        run_backtest(df_year, params, year)

    print("-" * 70)

if __name__ == "__main__":
    # Test DOGEUSDT (5m) - The primary target
    verify_long_term(symbol='DOGEUSDT', timeframe='5m')
