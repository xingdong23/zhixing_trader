
import os
import sys
import pandas as pd
import joblib
import json
import logging
from datetime import datetime

# Setup paths
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from strategies.ai_gambler.strategy import AiGamblerStrategy
from backtest.core.data_loader import DataLoader

# Configure logging to see strategy logs
logging.basicConfig(level=logging.INFO)

def main():
    print("=== Debugging AI Strategy Probabilities ===")
    
    # 1. Load Data (Small slice)
    data_path = 'data/raw/DOGEUSDT_15m.csv'
    print(f"Loading data from {data_path}...")
    loader = DataLoader(data_path)
    df = loader.load()
    
    # Take a slice from a volatile period (e.g., March 2024 for DOGE)
    # DOGE had a big run in Feb/March 2024
    start_date = '2024-02-25'
    end_date = '2024-03-05'
    
    df['timestamp'] = pd.to_datetime(df['open_time'], unit='ms')
    mask = (df['timestamp'] >= start_date) & (df['timestamp'] <= end_date)
    df_slice = df.loc[mask].copy()
    
    print(f"Slice shape: {df_slice.shape}")
    
    # 2. Initialize Strategy
    strategy = AiGamblerStrategy({
        'symbol': 'DOGEUSDT',
        'ai_threshold': 0.50 # Lower threshold to see if we get ANY signals
    })
    
    # 3. Manual Loop to check probabilities
    # We need to mimic the backtest loop: fed in a growing window or just use the strategy's internal logic on a window
    # The strategy.analyze method takes a DataFrame (window)
    
    window_size = 500
    probs = []
    
    print("\nScanning candle by candle...")
    
    # We'll just check specific points where we know big moves happened or just every Nth candle
    klines_list = loader.to_klines(df_slice)
    
    # Check 50 candles around the peak volatility
    for i in range(window_size, len(klines_list)):
        current_window = klines_list[i-window_size : i+1] # List of dicts
        
        # We need to hack/access the internal probability. 
        # Since analyze() only returns a signal dict if threshold is met, we might not see the raw prob unless we modify the strategy or print it here.
        # But wait, we can just call the model directly here if we want to confirm features.
        
        # Let's actually modify the strategy temporarily or copy the logic to see the prob.
        # Copying logic for transparency:
        
        # Re-convert to DF as strategy does
        df_window = pd.DataFrame(current_window)
        
        # Determine features
        all_features = strategy.feature_factory.generate_features(df_window)
        if all_features.empty: continue
            
        required_features = strategy.model.feature_names_in_
        
        # Fix: Ensure all required features exist (fill with 0.0 if missing)
        for f in required_features:
            if f not in all_features.columns:
                all_features[f] = 0.0
                
        current_features = all_features.iloc[[-1]][required_features]

        
        prob = strategy.model.predict_proba(current_features)[0][1]
        probs.append(prob)
        
        if prob > 0.4: # Only print interesting ones
            ts = current_window[-1]['timestamp']
            close = current_window[-1]['close']
            print(f"Time: {ts}, Price: {close}, Prob: {prob:.4f}")
            
    print(f"\nMax Probability observed: {max(probs) if probs else 0}")
    print(f"Avg Probability: {sum(probs)/len(probs) if probs else 0}")

if __name__ == "__main__":
    main()
