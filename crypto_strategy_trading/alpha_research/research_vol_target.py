import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import sys
import os

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from alpha_research.data_loader import DataLoader

def calculate_volatility(prices, window=24*20):
    """
    Calculate annualized volatility.
    Assumes hourly data.
    """
    returns = prices.pct_change()
    rolling_std = returns.rolling(window=window).std()
    annualized_vol = rolling_std * np.sqrt(365 * 24)
    return annualized_vol

def run_vol_target_simulation(df, target_vol=0.40, max_leverage=3.0):
    """
    Simulate a simple buy & hold strategy with volatility targeting.
    """
    df = df.copy()
    df['returns'] = df['close'].pct_change()
    df['volatility'] = calculate_volatility(df['close'])
    
    # Target Position Size = Target Vol / Current Vol
    df['target_exposure'] = target_vol / df['volatility']
    
    # Cap leverage
    df['target_exposure'] = df['target_exposure'].clip(upper=max_leverage)
    
    # Shift exposure by 1 period (we calculate at close, trade at next open)
    df['exposure'] = df['target_exposure'].shift(1)
    
    # Strategy Returns
    df['strategy_returns'] = df['exposure'] * df['returns']
    
    # Cumulative Returns
    df['cum_returns_bh'] = (1 + df['returns']).cumprod()
    df['cum_returns_vol_target'] = (1 + df['strategy_returns']).cumprod()
    
    return df

def main():
    loader = DataLoader()
    try:
        # Load BTC data
        print("Loading BTC data...")
        df = loader.load_data(symbol='BTCUSDT', timeframe='1h', file_name='BTCUSDT-1h-2024-FULL.csv')
        
        print("Running Volatility Targeting Simulation...")
        result = run_vol_target_simulation(df, target_vol=0.40, max_leverage=2.0)
        
        # Calculate stats
        total_ret_bh = result['cum_returns_bh'].iloc[-1] - 1
        total_ret_vt = result['cum_returns_vol_target'].iloc[-1] - 1
        
        vol_bh = result['returns'].std() * np.sqrt(365*24)
        vol_vt = result['strategy_returns'].std() * np.sqrt(365*24)
        
        sharpe_bh = total_ret_bh / vol_bh
        sharpe_vt = total_ret_vt / vol_vt
        
        print("\n--- Results (2024 YTD) ---")
        print(f"Buy & Hold Return: {total_ret_bh:.2%}")
        print(f"Vol Target Return: {total_ret_vt:.2%}")
        print(f"Buy & Hold Vol:    {vol_bh:.2%}")
        print(f"Vol Target Vol:    {vol_vt:.2%}")
        print(f"Buy & Hold Sharpe: {sharpe_bh:.2f}")
        print(f"Vol Target Sharpe: {sharpe_vt:.2f}")
        
        # Plot
        plt.figure(figsize=(12, 6))
        plt.plot(result.index, result['cum_returns_bh'], label='Buy & Hold')
        plt.plot(result.index, result['cum_returns_vol_target'], label='Vol Target (40%)')
        plt.title('Volatility Targeting vs Buy & Hold (BTC 2024)')
        plt.legend()
        plt.grid(True)
        plt.savefig('alpha_research/vol_target_result.png')
        print("\nPlot saved to alpha_research/vol_target_result.png")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
