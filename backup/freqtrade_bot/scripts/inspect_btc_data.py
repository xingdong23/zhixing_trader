
import pandas as pd
import sys

csv_path = "../data/BTCUSDT-5m-full.csv"
print(f"Reading {csv_path}...")
try:
    df = pd.read_csv(csv_path, low_memory=False)
    
    # Check for non-numeric
    non_numeric = df[pd.to_numeric(df['open_time'], errors='coerce').isna()]
    if not non_numeric.empty:
        print("Found non-numeric string values in open_time:")
        print(non_numeric['open_time'].unique())
        
    # Convert to numeric
    vals = pd.to_numeric(df['open_time'], errors='coerce').dropna()
    
    print(f"Min: {vals.min()}")
    print(f"Max: {vals.max()}")
    
    # Check for values that result in year > 2100 using simple math
    # 2100-01-01 ms epoch ~ 4102444800000
    huge_vals = vals[vals > 4102444800000]
    if not huge_vals.empty:
        print(f"Found {len(huge_vals)} huge timestamp values!")
        print(huge_vals.head())
    else:
        print("No huge values found.")
        
except Exception as e:
    print(e)
