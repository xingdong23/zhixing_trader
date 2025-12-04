import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import sys
import os
import glob

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from alpha_research.data_loader import DataLoader

ASSETS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT']
DATA_DIR = 'backtest/data'

def load_all_assets():
    """
    Load merged CSVs for all assets and align them on timestamp.
    """
    df_dict = {}
    for symbol in ASSETS:
        file_path = os.path.join(DATA_DIR, f"{symbol}-1h-merged.csv")
        # Fallback for BTC if merged file doesn't exist (use 2024 FULL)
        if symbol == 'BTCUSDT' and not os.path.exists(file_path):
             file_path = os.path.join(DATA_DIR, "BTCUSDT-1h-2024-FULL.csv")
        
        if os.path.exists(file_path):
            print(f"Loading {symbol} from {file_path}...")
            df = pd.read_csv(file_path)
            if 'timestamp' not in df.columns and 'open_time' in df.columns:
                 df['timestamp'] = df['open_time']
            
            df['timestamp'] = pd.to_numeric(df['timestamp'], errors='coerce')
            df['date'] = pd.to_datetime(df['timestamp'], unit='ms')
            df = df.set_index('date').sort_index()
            df['close'] = pd.to_numeric(df['close'], errors='coerce')
            df_dict[symbol] = df['close']
        else:
            print(f"Warning: File not found for {symbol}")

    # Combine into a single DataFrame
    prices_df = pd.DataFrame(df_dict)
    prices_df = prices_df.dropna() # Keep only timestamps where all assets have data
    print(f"Aligned Data: {len(prices_df)} rows (hours)")
    return prices_df

def calculate_rs_score(prices_df, lookback=24*7):
    """
    Calculate Relative Strength Score: Price / Price.shift(lookback) - 1
    """
    rs_scores = prices_df.pct_change(lookback)
    return rs_scores

def run_rs_strategy(prices_df, lookback=24*7, top_n=1, rebalance_freq=24):
    """
    Long Top N, Short Bottom N (or Short BTC).
    Here we simulate: Long Top 1 vs Short BTC (Market Neutral-ish).
    """
    rs_scores = calculate_rs_score(prices_df, lookback)
    returns = prices_df.pct_change()
    
    strategy_returns = []
    
    # Iterate through time (simplified loop for clarity, could be vectorized)
    # Rebalance every 'rebalance_freq' hours
    
    current_long = None
    
    for i in range(lookback, len(prices_df)):
        if i % rebalance_freq == 0:
            # Rank assets
            scores = rs_scores.iloc[i]
            # Exclude BTC from being the "Long" pick if we want to trade Alts vs BTC
            # But let's allow BTC to be picked too.
            
            sorted_scores = scores.sort_values(ascending=False)
            best_asset = sorted_scores.index[0]
            current_long = best_asset
        
        if current_long:
            # Long Best Asset, Short BTC (Benchmark)
            # Return = Long_Ret - BTC_Ret
            long_ret = returns[current_long].iloc[i]
            btc_ret = returns['BTCUSDT'].iloc[i]
            
            # Net Return (assuming 1x Long, 1x Short)
            net_ret = long_ret - btc_ret
            strategy_returns.append(net_ret)
        else:
            strategy_returns.append(0.0)
            
    return pd.Series(strategy_returns, index=prices_df.index[lookback:])

def main():
    prices = load_all_assets()
    if prices.empty:
        print("No aligned data found.")
        return

    print("Running RS Strategy (Long Strongest vs Short BTC)...")
    
    # Parameters
    LOOKBACK = 24 * 7 # 1 week
    REBALANCE = 24    # Daily
    
    strat_ret = run_rs_strategy(prices, lookback=LOOKBACK, rebalance_freq=REBALANCE)
    
    # Cumulative Returns
    cum_strat = (1 + strat_ret).cumprod()
    cum_btc = (1 + prices['BTCUSDT'].pct_change()[strat_ret.index]).cumprod()
    
    # Stats
    total_ret = cum_strat.iloc[-1] - 1
    sharpe = strat_ret.mean() / strat_ret.std() * np.sqrt(365*24)
    
    print(f"\n--- Results ---")
    print(f"Period: {prices.index[0]} to {prices.index[-1]}")
    print(f"Total Return (L/S): {total_ret:.2%}")
    print(f"Sharpe Ratio: {sharpe:.2f}")
    
    # Plot
    plt.figure(figsize=(12, 6))
    plt.plot(cum_strat, label='RS Strategy (L/S BTC)')
    plt.plot(cum_btc, label='BTC Buy & Hold', alpha=0.5)
    plt.title('Relative Strength Arbitrage vs BTC')
    plt.legend()
    plt.grid(True)
    plt.savefig('alpha_research/rs_strategy_result.png')
    print("\nPlot saved to alpha_research/rs_strategy_result.png")

if __name__ == "__main__":
    main()
