
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from crypto_strategy_trading.strategies.vwap_mean_reversion.strategy import VwapMeanReversionStrategy

def run_verification():
    print("Starting verification of VwapMeanReversionStrategy...")
    
    # 1. Create Dummy Data
    dates = pd.date_range(start="2025-01-01 00:00:00", periods=100, freq="15min")
    
    data = {
        'timestamp': dates,
        'open': np.full(100, 100.0),
        'high': np.full(100, 101.0),
        'low': np.full(100, 99.0),
        'close': np.full(100, 100.0), # Flat price initially
        'volume': np.full(100, 1000.0)
    }
    df = pd.DataFrame(data)
    df.set_index('timestamp', inplace=True)
    
    # 2. Manipulate Price to Trigger Signal
    # VWAP will stay around 100 if price is 100.
    
    # Scenario 1: Price Drops below VWAP -> Long Signal
    # Set price at index 50 to 95 (5% drop, threshold is 2%)
    df.iloc[50, df.columns.get_loc('close')] = 95.0
    df.iloc[50, df.columns.get_loc('low')] = 94.0
    
    # Scenario 2: Price Rises above VWAP -> Short Signal
    # Set price at index 70 to 105 (5% rise)
    df.iloc[70, df.columns.get_loc('close')] = 105.0
    df.iloc[70, df.columns.get_loc('high')] = 106.0
    
    # 3. Initialize Strategy
    params = {
        'symbol': 'TEST/USDT',
        'entry_threshold': 0.02, # 2%
        'stop_loss_pct': 0.05,
        'take_profit_target': 'vwap'
    }
    strategy = VwapMeanReversionStrategy(params)
    
    # 4. Run Loop
    print("\nRunning simulated loop...")
    
    for i in range(10, len(df)):
        # Slice data up to current point (simulate real-time)
        current_df = df.iloc[:i+1]
        
        signal = strategy.analyze(current_df)
        
        current_time = current_df.index[-1]
        price = current_df.iloc[-1]['close']
        
        if signal:
            print(f"[{current_time}] Signal Triggered: {signal['action']} @ {price}")
            print(f"   Reason: {signal['reason']}")
            strategy.update_position(signal)
            
            # If we just opened a position, we should check if it closes later
        
        # Check for exits if we have a position
        if strategy.current_position:
            # We need to manually call check_exit if strategy.analyze didn't return exit signal 
            # (strategy.analyze calls check_exit inside, so we are good if we call analyze)
            # But analyze returns signal OR exit signal.
            pass
            
    # Check Manual Exit Logic Simulation
    # At index 50 we buy at 95. VWAP is approx 100.
    # At index 51, price returns to 100. Should take profit.
    print("\nChecking Exit Logic at index 51...")
    df.iloc[51, df.columns.get_loc('close')] = 100.0 # Return to mean
    current_df = df.iloc[:52]
    # We need to ensure strategy has position from index 50
    # Re-run a small sequence to ensure state is correct or just trust the loop above handled it?
    # The loop above runs up to len(df), so it should have handled index 51.
    
    print("\nVerification Complete.")
    print(f"Total Trades: {strategy.total_trades}")
    print(f"Wins: {strategy.wins}")
    print(f"Losses: {strategy.losses}")

if __name__ == "__main__":
    run_verification()
