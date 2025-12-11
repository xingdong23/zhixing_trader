import pandas as pd
import requests
import zipfile
import io
import os
import sys
import time
from datetime import datetime

# Add path to import strategy and backtest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from strategy import MomentumGamblerStrategy
    from backtest import run_continuous_backtest
except ImportError:
    print("❌ Could not import strategy or backtest.")
    sys.exit(1)

# Cursated List of Hot Coins (Meme, AI, L1)
CANDIDATES = [
    'WIFUSDT', 'PEPEUSDT', 'BONKUSDT', 'FLOKIUSDT', 'SHIBUSDT', 'DOGEUSDT', # Memes
    'SOLUSDT', 'SUIUSDT', 'SEIUSDT', 'AVAXUSDT', 'NEARUSDT',                # L1
    'FETUSDT', 'RNDRUSDT', 'ARKMUSDT', 'WLDUSDT',                           # AI
    'ORDIUSDT', '1000SATSUSDT',                                             # BRC20
    'XRPUSDT', 'BNBUSDT'                                                    # Classics
]

BASE_URL = "https://data.binance.vision/data/spot/monthly/klines"

def download_recent_months(symbol, months=3):
    """Download last N months of data from Vision"""
    dfs = []
    now = datetime.now()
    
    start_month = now.month - 1
    start_year = now.year
    
    if start_month <= 0:
        start_month += 12
        start_year -= 1
        
    for i in range(months):
        m = start_month - i
        y = start_year
        if m <= 0:
            m += 12
            y -= 1
            
        url = f"{BASE_URL}/{symbol}/5m/{symbol}-5m-{y}-{m:02d}.zip"
        
        try:
            r = requests.get(url)
            if r.status_code == 200:
                with zipfile.ZipFile(io.BytesIO(r.content)) as z:
                    for name in z.namelist():
                        if name.endswith('.csv'):
                            with z.open(name) as f:
                                df = pd.read_csv(f, header=None, names=['open_time', 'open', 'high', 'low', 'close', 'volume', 'x', 'y', 'z', 'a', 'b', 'c'])
                                df = df[['open_time', 'open', 'high', 'low', 'close', 'volume']]
                                dfs.append(df)
        except Exception:
            pass
            
    if not dfs:
        return None
        
    full_df = pd.concat(dfs).sort_values('open_time')
    
    # Normalize timestamps if they are in micros/nanos
    if full_df['open_time'].max() > 100000000000000:
        full_df.loc[full_df['open_time'] > 100000000000000, 'open_time'] //= 1000
        
    full_df['date'] = pd.to_datetime(full_df['open_time'], unit='ms')
    
    # Normalize types
    for col in ['open', 'high', 'low', 'close', 'volume']:
        full_df[col] = full_df[col].astype(float)
        
    return full_df

def simulate_v11(df):
    """Run V11 simulation using shared backtest logic"""
    # Resample to 2H to match logic
    df['date'] = pd.to_datetime(df['open_time'], unit='ms')
    df.set_index('date', inplace=True)
    df_2h = df.resample('2h').agg({
        'open': 'first', 'high': 'max', 'low': 'min', 'close': 'last', 'volume': 'sum'
    }).dropna().reset_index()
    
    df_2h['year'] = df_2h['date'].dt.year
    df_2h['month'] = df_2h['date'].dt.month
    
    if len(df_2h) < 50: return {'error': 'Not enough data'}
    
    strategy = MomentumGamblerStrategy()
    try:
        df_2h = strategy.calculate_indicators(df_2h)
    except:
        return {'error': 'Indicator error'}
    
    # Use the verified backtest engine
    # initial_capital=100, sizing_ratio=0.33 (Three Bullets)
    # Note: run_continuous_backtest signature: (strategy, df, initial_capital, sizing_ratio)
    trades_log, invested, final_equity = run_continuous_backtest(strategy, df_2h, initial_capital=200.0, sizing_ratio=0.33)
    
    roi = (final_equity - invested) / invested * 100
    win_rate = 0
    if trades_log:
        wins = len([t for t in trades_log if t['pnl_amount'] > 0])
        win_rate = wins / len(trades_log) * 100
        
    return {
        'roi': roi,
        'trades': len(trades_log),
        'win_rate': win_rate
    }

def main():
    print(f"🚀 V11 Scout Patrol: Scanning {len(CANDIDATES)} candidates (Last ~3 months data)...")
    print("-" * 65)
    print(f"{'Symbol':<10} | {'ROI':<8} | {'Win%':<5} | {'Trades':<6} | {'Last Date':<12} | {'Grade'}")
    print("-" * 80)
    
    results = []
    
    DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")
    
    for symbol in CANDIDATES:
        df = None
        best_df = None
        max_ts = pd.Timestamp(0)
        
        # 1. Try Local Data
        # Check both full and merged, pick the one with freshest data
        local_files = [f"{symbol}-5m-merged.csv", f"{symbol}-5m-full.csv"]
        
        for f_name in local_files:
            f_path = os.path.join(DATA_DIR, f_name)
            if os.path.exists(f_path):
                try:
                    temp_df = pd.read_csv(f_path)
                    
                    if 'open_time' in temp_df.columns:
                        if temp_df['open_time'].max() > 100000000000000:
                            temp_df.loc[temp_df['open_time'] > 100000000000000, 'open_time'] //= 1000
                        temp_time = pd.to_datetime(temp_df['open_time'], unit='ms')
                    elif 'date' in temp_df.columns:
                        temp_time = pd.to_datetime(temp_df['date'])
                    else:
                        continue
                        
                    current_max = temp_time.max()
                    if current_max > max_ts:
                        max_ts = current_max
                        temp_df['open_time'] = temp_time # Standardize
                        best_df = temp_df
                except:
                    pass
        
        # Filter best local df
        if best_df is not None:
             cutoff = datetime.now() - pd.Timedelta(days=120)
             df = best_df[best_df['open_time'] > cutoff].copy()
        
        # 2. Fallback to Vision Download only if local is totally missing or very old (< 30 days)
        # Verify freshness
        is_stale = False
        if df is None or df.empty:
            is_stale = True
        elif df['open_time'].max() < (datetime.now() - pd.Timedelta(days=30)):
            is_stale = True
            
        if is_stale:
            # print(f"Downloading fresh for {symbol}...")
            down_df = download_recent_months(symbol, months=4)
            if down_df is not None and not down_df.empty:
                # Use downloaded if it's fresher or we had nothing
                if df is None or down_df['date'].max() > df['open_time'].max():
                    df = down_df
                    df['open_time'] = df['date'] # Sync

        if df is None or df.empty:
            # print(f"{symbol:<10} | No Data")
            continue
            
        res = simulate_v11(df)
        if 'error' in res:
            continue
            
        roi = res['roi']
        grade = "C"
        if roi > 300: grade = "S 💎"
        elif roi > 100: grade = "A 🔥"
        elif roi > 50: grade = "B 👍"
        elif roi < -50: grade = "F 💀"
        
        last_date = df['open_time'].max().strftime('%Y-%m-%d')
        
        print(f"{symbol:<10} | {roi:>+6.1f}% | {res['win_rate']:>3.0f}%  | {res['trades']:<6} | {last_date:<12} | {grade}")
        
        results.append({
            'symbol': symbol,
            'roi': roi,
            'grade': grade,
            'last_date': last_date
        })
        
    print("-" * 80)
    print("🏆 Top 3 Recommendations:")
    results.sort(key=lambda x: x['roi'], reverse=True)
    for i, r in enumerate(results[:3]):
        print(f"{i+1}. {r['symbol']} ({r['grade']}) - Last: {r['last_date']}")

if __name__ == "__main__":
    main()
