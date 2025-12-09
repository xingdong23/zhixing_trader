import pandas as pd
from pathlib import Path
import glob

def merge_data():
    data_dir = Path("backtest/data/bear_market")
    output_file = data_dir / "BTCUSDT-1h-merged.csv"
    
    print(f"Searching for CSV files in {data_dir}...")
    csv_files = sorted(list(data_dir.glob("BTCUSDT-1h-2022-*.csv")))
    
    if not csv_files:
        print("No CSV files found.")
        return

    print(f"Found {len(csv_files)} files.")
    
    dfs = []
    for file in csv_files:
        # Read with header=0 to handle the header row correctly
        # Only read the first 6 columns: open_time, open, high, low, close, volume
        df = pd.read_csv(file, usecols=[0, 1, 2, 3, 4, 5])
        df.columns = ['open_time', 'open', 'high', 'low', 'close', 'volume']
        dfs.append(df)
        
    print("Concatenating...")
    merged_df = pd.concat(dfs, ignore_index=True)
    
    print("Sorting...")
    # Drop rows where open_time is NaN
    initial_len = len(merged_df)
    merged_df = merged_df.dropna(subset=['open_time'])
    dropped_len = initial_len - len(merged_df)
    if dropped_len > 0:
        print(f"Dropped {dropped_len} rows with NaN open_time")

    merged_df['open_time'] = merged_df['open_time'].astype(int)
    merged_df = merged_df.sort_values('open_time').reset_index(drop=True)
    
    print(f"Saving to {output_file}...")
    merged_df.to_csv(output_file, index=False)
    
    print("Done!")
    print(f"Total rows: {len(merged_df)}")
    print(f"Time range: {pd.to_datetime(merged_df['open_time'].min(), unit='ms')} - {pd.to_datetime(merged_df['open_time'].max(), unit='ms')}")

if __name__ == "__main__":
    merge_data()
