import sys
import os
import pandas as pd
import json
import numpy as np

# Add project root to path
# Assuming we run from project root, or we handle absolute paths
project_root = "/Users/chengzheng/workspace/chuangxin/zhixing_trader/crypto_strategy_trading"
if project_root not in sys.path:
    sys.path.append(project_root)

# Import Strategy
# We need to make sure freqtrade imports work. They should if installed in env.
try:
    from freqtrade_bot.user_data.strategies.ma_rsi_strategy import MaRsiStrategy
except ImportError as e:
    print(f"Error importing strategy: {e}")
    print("Ensure you are running the script with the correct python environment.")
    sys.exit(1)

def run_backtest():
    print("Starting Manual Backtest for DOGE/USDT...")
    
    # 1. Load Data
    data_path = 'freqtrade_bot/user_data/data/binance/futures/DOGE_USDT_USDT-1h.json'
    abs_data_path = os.path.join(project_root, data_path)
    
    if not os.path.exists(abs_data_path):
        print(f"Data file not found: {abs_data_path}")
        return

    with open(abs_data_path) as f:
        data = json.load(f)
        
    print(f"Loaded {len(data)} candles.")
    
    # Convert to DataFrame
    # Freqtrade JSON list format: [timestamp, open, high, low, close, volume]
    df = pd.DataFrame(data, columns=['date', 'open', 'high', 'low', 'close', 'volume'])
    df['date'] = pd.to_datetime(df['date'], unit='ms')
    
    # 2. Initialize Strategy
    # Config dummy
    config = {
        'timeframe': '1h',
        'dry_run': True,
        'stake_currency': 'USDT',
        'stoploss': -0.05,
        'minimal_roi': {"0": 100} # Mock roi to rely on strategy logic
    }
    
    try:
        strategy = MaRsiStrategy(config)
    except Exception as e:
        print(f"Strategy Init Error: {e}")
        # If FeatureFactory fails, we might need to mock it or fix path
        return

    # 3. Populate Indicators
    print("Populating indicators...")
    df = strategy.populate_indicators(df, {'pair': 'DOGE/USDT'})
    
    # 4. Populate Signals
    print("Calculating signals...")
    df = strategy.populate_entry_trend(df, {'pair': 'DOGE/USDT'})
    df = strategy.populate_exit_trend(df, {'pair': 'DOGE/USDT'})
    
    # 5. Simulate Trades
    print("Simulating trades...")
    
    initial_capital = 1000.0
    balance = initial_capital
    position = 0 # 0: none, 1: long
    entry_price = 0.0
    trades = []
    
    # Fill NaN for safety (though logic usually handles it)
    df = df.fillna(0)
    
    for i, row in df.iterrows():
        # Skip if not enough history for indicators
        if i < 50: 
            continue
            
        current_price = row['close']
        
        # Check Exit first if in position
        if position == 1:
            # PnL calculation
            pnl_pct = (current_price - entry_price) / entry_price
            
            # Check Stoploss (hardcoded from strategy class for simulation)
            stoploss = -0.05
            if pnl_pct <= stoploss:
                # Stoploss hit
                balance *= (1 + pnl_pct)
                trades.append({
                    'type': 'sell', 'reason': 'stop_loss', 
                    'price': current_price, 'time': row['date'], 
                    'pnl': pnl_pct, 'balance': balance
                })
                position = 0
                continue
                
            # Check Strategy Exit Signal
            if row['exit_long'] == 1:
                # Sell
                balance *= (1 + pnl_pct)
                trades.append({
                    'type': 'sell', 'reason': 'signal', 
                    'price': current_price, 'time': row['date'], 
                    'pnl': pnl_pct, 'balance': balance
                })
                position = 0
                continue
                
            # Check ROI (Simplified: 3% profit take)
            if pnl_pct >= 0.03:
                 balance *= (1 + pnl_pct)
                 trades.append({
                    'type': 'sell', 'reason': 'roi', 
                    'price': current_price, 'time': row['date'], 
                    'pnl': pnl_pct, 'balance': balance
                })
                 position = 0
                 continue

        # Check Entry if no position
        if position == 0:
            if row['enter_long'] == 1:
                position = 1
                entry_price = current_price
                trades.append({
                    'type': 'buy', 'reason': 'signal', 
                    'price': entry_price, 'time': row['date']
                })
    
    # 6. Results
    print("\n--- Backtest Results ---\n")
    print(f"Initial Balance: {initial_capital:.2f} USDT")
    print(f"Final Balance:   {balance:.2f} USDT")
    
    total_return = (balance - initial_capital) / initial_capital * 100
    print(f"Total Return:    {total_return:.2f}%")
    
    trade_count = len([t for t in trades if t['type'] == 'sell'])
    print(f"Total Trades:    {trade_count}")
    
    if trade_count > 0:
        winning_trades = len([t for t in trades if t['type'] == 'sell' and t['pnl'] > 0])
        win_rate = winning_trades / trade_count * 100
        print(f"Win Rate:        {win_rate:.2f}%")
        
        # Max Drawdown (simplified based on closed trades balance)
        balance_history = [initial_capital] + [t['balance'] for t in trades if 'balance' in t]
        balance_array = np.array(balance_history)
        peak = np.maximum.accumulate(balance_array)
        drawdown = (peak - balance_array) / peak
        max_drawdown = drawdown.max() * 100
        print(f"Max Drawdown:    {max_drawdown:.2f}%")
    else:
        print("Win Rate:        N/A")
        print("Max Drawdown:    N/A")

    print("\nTrade Log (Last 5):")
    for t in trades[-5:]:
        print(t)

if __name__ == "__main__":
    run_backtest()
