import pandas as pd
from pathlib import Path
import glob

def merge_data():
    # Load existing ALL data
    existing_file = Path("backtest/data/BTCUSDT-1h-ALL.csv")
    print(f"Loading existing data from {existing_file}...")
    df_existing = pd.read_csv(existing_file)
    
    # Load new Nov-Dec data
    new_data_dir = Path("backtest/data/btc_nov_2024")
    print(f"Searching for new CSV files in {new_data_dir}...")
    csv_files = sorted(list(new_data_dir.glob("BTCUSDT-1h-2024-*.csv")))
    
    if not csv_files:
        print("No new CSV files found.")
        return

    print(f"Found {len(csv_files)} new files.")
    
    dfs = [df_existing]
    for file in csv_files:
        try:
            df = pd.read_csv(file, usecols=[0, 1, 2, 3, 4, 5])
            df.columns = ['open_time', 'open', 'high', 'low', 'close', 'volume']
            dfs.append(df)
        except Exception as e:
            print(f"Error reading {file}: {e}")
        
    print("Concatenating...")
    merged_df = pd.concat(dfs, ignore_index=True)
    
    print("Sorting and deduplicating...")
    # Drop rows where open_time is NaN
    merged_df = merged_df.dropna(subset=['open_time'])
    merged_df['open_time'] = merged_df['open_time'].astype(int)
    
    # Deduplicate based on open_time, keeping the last occurrence
    merged_df = merged_df.drop_duplicates(subset=['open_time'], keep='last')
    
    merged_df = merged_df.sort_values('open_time').reset_index(drop=True)
    
    output_file = Path("backtest/data/BTCUSDT-1h-2024-FULL.csv")
    print(f"Saving to {output_file}...")
    merged_df.to_csv(output_file, index=False)
    
    print("Done!")
    print(f"Total rows: {len(merged_df)}")
    if len(merged_df) > 0:
        print(f"Time range: {pd.to_datetime(merged_df['open_time'].min(), unit='ms')} - {pd.to_datetime(merged_df['open_time'].max(), unit='ms')}")

if __name__ == "__main__":
    merge_data()
