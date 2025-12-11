
import requests
import pandas as pd
import zipfile
import io
import os
import argparse
from datetime import datetime
import time

# Constants
BASE_URL = "https://data.binance.vision/data/spot/monthly/klines"
COLUMNS = ['open_time', 'open', 'high', 'low', 'close', 'volume', 'close_time', 'quote_volume', 'count', 'taker_buy_volume', 'taker_buy_quote_volume', 'ignore']
SELECTED_COLUMNS = ['open_time', 'open', 'high', 'low', 'close', 'volume']

def download_monthly_data(symbol, timeframe, year, month, out_dir):
    """
    Downloads and extracts a single month of data.
    Returns a DataFrame or None if not found/error.
    """
    month_str = f"{month:02d}"
    filename = f"{symbol}-{timeframe}-{year}-{month_str}.zip"
    url = f"{BASE_URL}/{symbol}/{timeframe}/{filename}"
    
    print(f"Downloading {url}...", end="\r")
    
    try:
        r = requests.get(url)
        if r.status_code == 404:
            # Data doesn't exist (yet or too old)
            return None
        if r.status_code != 200:
            print(f"\nFailed to download {filename}: HTTP {r.status_code}")
            return None
            
        with zipfile.ZipFile(io.BytesIO(r.content)) as z:
            for name in z.namelist():
                if name.endswith('.csv'):
                    with z.open(name) as f:
                        df = pd.read_csv(f, header=None, names=COLUMNS)
                        df = df[SELECTED_COLUMNS]
                        return df
                        
    except Exception as e:
        print(f"\nError processing {filename}: {e}")
        return None
        
    return None

def main():
    parser = argparse.ArgumentParser(description="Download historical data from Binance Vision")
    parser.add_argument("--symbol", type=str, required=True, help="Trading symbol (e.g., DOGEUSDT)")
    parser.add_argument("--timeframe", type=str, default="5m", help="Timeframe (e.g., 5m, 1h, 1d)")
    parser.add_argument("--start-year", type=int, default=2017, help="Start year to scan from")
    parser.add_argument("--end-year", type=int, default=datetime.now().year, help="End year to scan until")
    parser.add_argument("--out-dir", type=str, default="data", help="Output directory")
    
    args = parser.parse_args()
    
    symbol = args.symbol.upper()
    
    # Ensure absolute path for output directory logic if needed, 
    # but relative to where script is run is fine usually.
    # We'll construct the final path based on project structure if out-dir is default.
    if args.out_dir == "data":
        # Try to find the correct data dir relative to script location
        script_dir = os.path.dirname(os.path.abspath(__file__))
        # Assuming script is in freqtrade_bot/scripts/
        # And data is in freqtrade_bot/../crypto_strategy_trading/data ??
        # Or just use the one we've been using: /Users/chengzheng/workspace/chuangxin/zhixing_trader/crypto_strategy_trading/data
        # Let's default to the project standard data root
        target_dir = os.path.join(script_dir, "../../data")
        if os.path.exists(target_dir):
            out_dir = target_dir
        else:
            out_dir = "data"
    else:
        out_dir = args.out_dir

    if not os.path.exists(out_dir):
        os.makedirs(out_dir)

    print(f"Checking data for {symbol} ({args.timeframe}) from {args.start_year} to {args.end_year}...")
    
    all_dfs = []
    
    for year in range(args.start_year, args.end_year + 1):
        for month in range(1, 13):
            # Skip future months
            if year == datetime.now().year and month > datetime.now().month:
                continue
                
            df = download_monthly_data(symbol, args.timeframe, year, month, out_dir)
            if df is not None:
                all_dfs.append(df)
                print(f"Loaded {year}-{month:02d}: {len(df)} rows.        ")
            else:
                # Assuming 404 means data not available yet or too early
                # We simply skip. If it's the middle of data, it might be a gap, but usually Binance has files.
                pass
                
    if not all_dfs:
        print("No data found.")
        return

    print("\nMerging and saving...")
    full_df = pd.concat(all_dfs)
    full_df = full_df.sort_values('open_time')
    full_df = full_df.drop_duplicates(subset=['open_time'])
    
    output_filename = f"{symbol}-{args.timeframe}-full.csv"
    output_path = os.path.join(out_dir, output_filename)
    
    full_df.to_csv(output_path, index=False)
    print(f"Successfully saved {len(full_df)} candles to {output_path}")

if __name__ == "__main__":
    main()
