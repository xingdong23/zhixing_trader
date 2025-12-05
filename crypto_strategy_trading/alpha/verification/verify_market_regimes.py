"""
Verify Best Parameters across Market Regimes (Bull, Bear, Range)
----------------------------------------------------------------
Splits data into specific date ranges to test robustness.
"""
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

logging.basicConfig(level=logging.WARNING, format='%(message)s')
logger = logging.getLogger(__name__)

def run_backtest(data, params, regime_name):
    if data.empty:
        return {
            'regime': regime_name,
            'return_pct': 0.0,
            'trades': 0,
            'win_rate': 0.0,
            'final_capital': params['total_capital'],
            'note': 'No Data'
        }

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
        'regime': regime_name,
        'return_pct': stats['return_pct'],
        'trades': strategy.total_trades,
        'win_rate': stats['win_rate'],
        'final_capital': strategy.current_capital,
        'note': f"{data.iloc[0]['timestamp'].date()} ~ {data.iloc[-1]['timestamp'].date()}"
    }

def run_regime_verification():
    symbol = 'DOGEUSDT'
    data_dir = os.path.join(project_root, 'backtest', 'data')
    
    print(f"Loading data for {symbol}...")
    data = load_data(symbol, data_dir)
    if data is None:
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
    
    # Define Regimes (Based on DOGE 2024 price action)
    # Bull: Feb 2024 - Mar 2024 (Rally from 0.08 to 0.22)
    # Bear/Correction: Apr 2024 - May 2024 (Drop from 0.22 to 0.12)
    # Range/Chop: June 2024 - Aug 2024 (Sideways around 0.10 - 0.14)
    # Recovery: Sep 2024 - Oct 2024
    
    regimes = {
        'Bull Run 🐂': (datetime(2024, 2, 1), datetime(2024, 3, 31)),
        'Correction 🐻': (datetime(2024, 4, 1), datetime(2024, 5, 31)),
        'Choppy/Range 🦀': (datetime(2024, 6, 1), datetime(2024, 8, 31)),
        'Recovery 📈': (datetime(2024, 9, 1), datetime(2024, 10, 31))
    }
    
    print(f"\n🌍 Market Regime Stress Test (Params: Lev 15x, TP 21%, SL 42%)")
    print("-" * 100)
    print(f"{'Regime':<15} | {'Return %':<10} | {'Trades':<6} | {'Win Rate':<10} | {'Final Cap':<10} | {'Period'}")
    print("-" * 100)
    
    for name, (start, end) in regimes.items():
        # Slice data
        mask = (data['timestamp'] >= start) & (data['timestamp'] <= end)
        regime_data = data.loc[mask].reset_index(drop=True)
        
        res = run_backtest(regime_data, params, name)
        print(f"{res['regime']:<15} | {res['return_pct']:>8.2f}% | {res['trades']:>6} | {res['win_rate']:>9.1f}% | {res['final_capital']:>10.2f} | {res['note']}")

    print("-" * 100)

if __name__ == "__main__":
    run_regime_verification()
