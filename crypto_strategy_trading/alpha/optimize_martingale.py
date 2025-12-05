"""
Martingale Strategy Parameter Optimizer (Grid Search)
"""
import os
import sys
import pandas as pd
import logging
import itertools
from datetime import datetime
from concurrent.futures import ProcessPoolExecutor

# Add project root to path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

from strategies.martingale_sniper.strategy_single import MartingaleSniperSingleStrategy

# Configure logging
logging.basicConfig(level=logging.WARNING, format='%(message)s')
logger = logging.getLogger(__name__)

def load_data(symbol, data_dir):
    """Load ALL available data for a specific symbol"""
    print(f"Loading data for {symbol}...")
    
    # Find all matching files
    files = sorted([f for f in os.listdir(data_dir) if f.startswith(f'{symbol}-5m-') and f.endswith('.csv')])
    
    if not files:
        print(f"No data found for {symbol}")
        return None
    
    dfs = []
    for f in files:
        try:
            path = os.path.join(data_dir, f)
            # Skip the 'merged' file itself if we are loading individual days to avoid duplication
            # actually, if merged file exists, it might be better? 
            # Let's just load everything and drop duplicates.
            df = pd.read_csv(path, low_memory=False)
            dfs.append(df)
        except Exception:
            pass
    
    if not dfs:
        return None
        
    df = pd.concat(dfs, ignore_index=True)

    if df.empty:
        return None

    # Create a clean dataframe to avoid duplicate column issues
    clean_df = pd.DataFrame()
    
    # Handle timestamp first
    if 'open_time' in df.columns:
        # If open_time is duplicated, take first
        ot = df['open_time']
        if isinstance(ot, pd.DataFrame):
            ot = ot.iloc[:, 0]
        clean_df['open_time'] = ot
        clean_df['timestamp'] = pd.to_datetime(pd.to_numeric(ot, errors='coerce'), unit='ms')
    
    # Handle volume rename if needed (check source df)
    if 'vol' in df.columns and 'volume' not in df.columns:
        vol = df['vol']
        if isinstance(vol, pd.DataFrame):
            vol = vol.iloc[:, 0]
        clean_df['volume'] = pd.to_numeric(vol, errors='coerce')
        
    # Process standard columns
    cols = ['open', 'high', 'low', 'close', 'volume']
    for col in cols:
        if col in df.columns:
            val = df[col]
            if isinstance(val, pd.DataFrame):
                val = val.iloc[:, 0]
            clean_df[col] = pd.to_numeric(val, errors='coerce')
        elif col in clean_df.columns:
            # Already processed (e.g. volume)
            pass
            
    # Drop duplicates
    clean_df = clean_df.drop_duplicates(subset=['timestamp'])
    clean_df = clean_df.sort_values('timestamp').reset_index(drop=True)
    
    return clean_df

def evaluate_params(args):
    """Run a single backtest with specific parameters"""
    data, params, symbol = args
    
    config = {
        'symbol': symbol,
        'total_capital': 300.0,
        'leverage': params['leverage'],
        'take_profit_pct': params['take_profit_pct'],
        'stop_loss_pct': params['stop_loss_pct'],
        'explosion_threshold': params['explosion_threshold'],
        'cooldown_minutes': params['cooldown_minutes'],
        'max_daily_rounds': params['max_daily_rounds'],
        'volume_spike_ratio': params['volume_spike_ratio'],
        # Mining Parameters
        'martingale_sequence': params['martingale_sequence'],
        'safety_override': params['safety_override']
    }
    
    # Override hardcoded safety in strategy for testing purposes?
    # Actually, the strategy forces safety. We might need to subclass or modify strategy to allow
    # testing "unsafe" parameters if we want to see them fail. 
    # For now, let's rely on the strategy's own logic (which downgrades unsafe params)
    # But wait, if we want to test 20x, we need to bypass the check.
    # We will modify the strategy class instance directly after init if needed, 
    # OR we accept that 20x will be downgraded. 
    # Let's trust the strategy class to handle it for now.
    
    strategy = MartingaleSniperSingleStrategy(config)
    
    # Small hack: if we really want to test aggressive thresholds < 4.5% that might be blocked
    # we can force them here.
    strategy.explosion_threshold = params['explosion_threshold']
    strategy.leverage = params['leverage'] # Force leverage test
    strategy.liquidation_pct = (1 / strategy.leverage) * 0.95

    initial_cap = config['total_capital']
    
    # Fast loop
    window_size = 50
    # To speed up, we convert dataframe to list of dicts or just iterate faster
    # For optimization, we can just iterate.
    
    trades = 0
    busts = 0
    
    # We will run a "Hardcore" survival test: One life. If bust, score is bad.
    # Alternatively, we track total returns over the period.
    
    for i in range(window_size, len(data)):
        current_price = float(data.iloc[i]['close'])
        now = data.iloc[i]['timestamp']
        
        # 1. Check Position
        if strategy.current_position:
            action = strategy.check_position(current_price, now)
            if action:
                strategy.update_position(action)
                # Withdrawal logic not needed for simple metric, just track equity
        
        # 2. Analyze
        else:
            if strategy.current_capital < 10:
                busts = 1
                break
                
            # Efficient slice
            # We only need the last 2 rows for the simplest detection
            # But the strategy needs more.
            df_slice = data.iloc[i-10:i+1]
            signal = strategy.analyze(df_slice)
            if signal:
                strategy.update_position(signal)
    
    stats = strategy.get_stats()
    
    return {
        'params': params,
        'final_capital': strategy.current_capital,
        'return_pct': stats['return_pct'],
        'total_trades': strategy.total_trades,
        'busts': busts,
        'win_rate': (stats['rounds_won'] / stats['total_rounds']) if stats['total_rounds'] > 0 else 0
    }

def run_optimization(symbol, data_dir):
    print(f"\n🔍 Optimization started for {symbol}...")
    
    data = load_data(symbol, data_dir)
    if data is None or data.empty:
        print("No data found.")
        return

    # Use a smaller subset for speed if needed, or full data
    # Let's use full data for 3 months PEPE, it's fast enough (~25k rows)
    print(f"Data Loaded: {len(data)} rows.")

    # Search Space (Deep Mining)
    sequences = [
        [1, 2, 4, 8, 16],       # Standard
        [1, 3, 9, 27, 81],      # Triple (Aggressive)
    ]
    
    param_grid = {
        'explosion_threshold': [0.03, 0.045, 0.06],
        'take_profit_pct': [0.10, 0.15, 0.20],
        'stop_loss_pct': [0.10], 
        'leverage': [5, 10, 20],
        'martingale_sequence': sequences,
        # Deep Mining Additions
        'volume_spike_ratio': [3.0, 4.0, 5.0],
        'cooldown_minutes': [5, 15],
        'max_daily_rounds': [5, 10]
    }
    
    keys, values = zip(*param_grid.items())
    combinations = [dict(zip(keys, v)) for v in itertools.product(*values)]
    
    print(f"Testing {len(combinations)} combinations (Deep Mining)...")
    
    results = []
    
    # Sequential execution
    for i, params in enumerate(combinations):
        # Pass safety override by default for mining
        params['safety_override'] = True
        res = evaluate_params((data, params, symbol))
        results.append(res)
        if (i+1) % 100 == 0:
            print(f"Progress: {i+1}/{len(combinations)}")
            
    # Sort results
    # Priority: 1. Survival (Busts=0), 2. Return %
    sorted_results = sorted(results, key=lambda x: (-1 if x['busts'] > 0 else 1, x['return_pct']), reverse=True)
    
    print("\n🏆 Top 5 Configurations:")
    print(f"{'#':<3} | {'Leverage':<8} | {'Seq':<15} | {'Thresh':<8} | {'TP %':<5} | {'Return %':<10} | {'Trades':<6} | {'Busts':<5}")
    print("-" * 80)
    
    for i, res in enumerate(sorted_results[:5]):
        p = res['params']
        seq_str = str(p['martingale_sequence'][:3]) + "..." # Truncate for display
        print(f"{i+1:<3} | {p['leverage']:<8} | {seq_str:<15} | {p['explosion_threshold']:<8.1%} | {p['take_profit_pct']:<5.0%} | {res['return_pct']:<10.2f} | {res['total_trades']:<6} | {res['busts']:<5}")

    print("\n💀 Highest Returns (Risk On):")
    sorted_by_profit = sorted(results, key=lambda x: x['return_pct'], reverse=True)
    for i, res in enumerate(sorted_by_profit[:3]):
        p = res['params']
        seq_str = str(p['martingale_sequence'][:3]) + "..." 
        print(f"{i+1:<3} | {p['leverage']}x | Seq {seq_str} | Thresh {p['explosion_threshold']:.1%} | Ret {res['return_pct']:.2f}% | Busts {res['busts']}")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, 'backtest', 'data')
    
    targets = ['1000PEPEUSDT', 'DOGEUSDT', 'ETHUSDT', 'WIFUSDT']
    
    for coin in targets:
        run_optimization(coin, data_dir)
