import pandas as pd
import json
import os

# Configuration
SOURCE_DIR = "data"
DEST_DIR = "freqtrade_bot/user_data/data/okx"
os.makedirs(DEST_DIR, exist_ok=True)

FILES_TO_CONVERT = [
    {
        "filename": "BNBUSDT-1h-merged.csv",
        "pair": "BNB/USDT",
        "timeframe": "1h"
    },
    {
        "filename": "BTCUSDT-1h-2024-FULL.csv",
        "pair": "BTC/USDT",
        "timeframe": "1h"
    },
    {
        "filename": "1000PEPEUSDT-5m-merged.csv",
        "pair": "1000PEPE/USDT", 
        "timeframe": "5m"
    }
]

def convert_to_freqtrade_json(file_info):
    csv_path = os.path.join(SOURCE_DIR, file_info['filename'])
    if not os.path.exists(csv_path):
        print(f"Skipping {file_info['filename']}: File not found.")
        return

    print(f"Converting {file_info['filename']}...")
    df = pd.read_csv(csv_path)
    
    # Binance format: open_time, open, high, low, close, vol, ...
    # Freqtrade needs: [date, open, high, low, close, volume]
    
    # Rename columns
    df = df.rename(columns={
        'open_time': 'date', 
        'vol': 'volume'
    })
    
    # Ensure numeric
    cols = ['open', 'high', 'low', 'close', 'volume']
    for col in cols:
        df[col] = pd.to_numeric(df[col], errors='coerce')
        
    df['date'] = pd.to_numeric(df['date'], errors='coerce')
    
    # Keep only required columns in order
    df = df[['date', 'open', 'high', 'low', 'close', 'volume']]
    
    # Drop NaNs
    df = df.dropna()
    
    # Convert to list of lists
    data = df.values.tolist()
    
    # Output filename: PAIR_TIMEFRAME.json
    # Pair normalization: BNB/USDT -> BNB_USDT
    pair_slug = file_info['pair'].replace('/', '_')
    output_filename = f"{pair_slug}-{file_info['timeframe']}.json"
    output_path = os.path.join(DEST_DIR, output_filename)
    
    with open(output_path, 'w') as f:
        json.dump(data, f)
        
    print(f"Saved {len(data)} candles to {output_path}")

if __name__ == "__main__":
    for info in FILES_TO_CONVERT:
        convert_to_freqtrade_json(info)
