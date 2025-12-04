import pandas as pd
import os
import glob

DATA_DIR = 'backtest/data'
ASSETS = {
    'ETHUSDT': 'eth_data',
    'SOLUSDT': 'sol_data',
    'XRPUSDT': 'xrp_data',
    'ADAUSDT': 'ada_data',
    'DOGEUSDT': 'doge_data'
}

def merge_asset(symbol, folder_name):
    folder_path = os.path.join(DATA_DIR, folder_name)
    if not os.path.exists(folder_path):
        print(f"Folder not found: {folder_path}")
        return

    all_files = glob.glob(os.path.join(folder_path, "*.csv"))
    if not all_files:
        print(f"No CSV files found in {folder_path}")
        return

    print(f"Merging {len(all_files)} files for {symbol}...")
    
    df_list = []
    for filename in all_files:
        try:
            df = pd.read_csv(filename)
            df_list.append(df)
        except Exception as e:
            print(f"Error reading {filename}: {e}")

    if not df_list:
        return

    merged_df = pd.concat(df_list, ignore_index=True)
    
    # Clean and Sort
    if 'open_time' in merged_df.columns:
        merged_df['timestamp'] = pd.to_numeric(merged_df['open_time'], errors='coerce')
        merged_df = merged_df.dropna(subset=['timestamp'])
        merged_df = merged_df.sort_values('timestamp')
        merged_df = merged_df.drop_duplicates(subset=['timestamp'])
        
        # Save
        output_path = os.path.join(DATA_DIR, f"{symbol}-1h-merged.csv")
        merged_df.to_csv(output_path, index=False)
        print(f"Saved merged file to {output_path} ({len(merged_df)} rows)")
    else:
        print(f"Column 'open_time' not found in {symbol} data")

def main():
    for symbol, folder in ASSETS.items():
        merge_asset(symbol, folder)

if __name__ == "__main__":
    main()
