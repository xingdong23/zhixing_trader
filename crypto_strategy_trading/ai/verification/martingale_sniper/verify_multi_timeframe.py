"""
Verify Best Parameters on Multiple Timeframes
---------------------------------------------
Resamples 5m data to 15m, 30m, 1h, 4h and runs the strategy.
"""
import os
import sys
import pandas as pd
import logging

# Add project root
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

from strategies.martingale_sniper.strategy_single import MartingaleSniperSingleStrategy
from alpha.optimization.optuna_martingale import load_data

logging.basicConfig(level=logging.WARNING, format='%(message)s')
logger = logging.getLogger(__name__)

def resample_data(df, rule):
    """Resample OHLCV data"""
    df = df.set_index('timestamp')
    
    ohlc_dict = {
        'open': 'first',
        'high': 'max',
        'low': 'min',
        'close': 'last',
        'volume': 'sum'
    }
    
    df_resampled = df.resample(rule).agg(ohlc_dict).dropna()
    df_resampled = df_resampled.reset_index()
    return df_resampled

def run_backtest(data, params, timeframe_name):
    strategy = MartingaleSniperSingleStrategy(params)
    
    # Force params
    strategy.explosion_threshold = params['explosion_threshold']
    strategy.leverage = params['leverage']
    strategy.liquidation_pct = (1 / strategy.leverage) * 0.95
    
    busts = 0
    window_size = 50
    
    for i in range(window_size, len(data)):
        current_price = float(data.iloc[i]['close'])
        now = data.iloc[i]['timestamp']
        
        if strategy.current_position:
            action = strategy.check_position(current_price, now)
            if action:
                strategy.update_position(action)
        else:
            if strategy.current_capital < 10:
                busts = 1
                break
            
            df_slice = data.iloc[i-10:i+1]
            signal = strategy.analyze(df_slice)
            if signal:
                strategy.update_position(signal)

    stats = strategy.get_stats()
    return {
        'timeframe': timeframe_name,
        'return_pct': stats['return_pct'],
        'trades': strategy.total_trades,
        'win_rate': stats['win_rate'],
        'final_capital': strategy.current_capital
    }

def run_multi_timeframe_verification():
    symbol = 'DOGEUSDT'
    data_dir = os.path.join(project_root, 'backtest', 'data')
    
    print(f"Loading 5m data for {symbol}...")
    data_5m = load_data(symbol, data_dir)
    if data_5m is None:
        print("No data found.")
        return

    # Best Parameters (DOGEUSDT)
    params = {
        'leverage': 15,
        'take_profit_pct': 0.2142,
        'stop_loss_pct': 0.4235,
        'explosion_threshold': 0.0703,
        'volume_spike_ratio': 3.22,
        'martingale_sequence': [1, 3, 9, 27, 81],
        'cooldown_minutes': 15,
        'max_daily_rounds': 10,
        'symbol': symbol,
        'total_capital': 300.0,
        'safety_override': True
    }
    
    timeframes = {
        '5m': data_5m,
        '15m': resample_data(data_5m.copy(), '15T'),
        '30m': resample_data(data_5m.copy(), '30T'),
        '1h': resample_data(data_5m.copy(), '1H'),
        '4h': resample_data(data_5m.copy(), '4H')
    }
    
    print(f"\n📊 Multi-Timeframe Analysis (Params: Lev 15x, TP 21%, SL 42%)")
    print("-" * 65)
    print(f"{'Timeframe':<10} | {'Return %':<12} | {'Trades':<8} | {'Win Rate':<10} | {'Final Cap':<12}")
    print("-" * 65)
    
    for tf_name, tf_data in timeframes.items():
        res = run_backtest(tf_data, params, tf_name)
        print(f"{res['timeframe']:<10} | {res['return_pct']:>10.2f}% | {res['trades']:>8} | {res['win_rate']:>9.1f}% | {res['final_capital']:>10.2f}")

    print("-" * 65)

if __name__ == "__main__":
    run_multi_timeframe_verification()
