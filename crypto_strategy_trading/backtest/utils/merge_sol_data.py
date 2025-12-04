import pandas as pd
import glob
import os
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def merge_sol_data():
    # Define paths
    base_dir = Path(__file__).parent.parent
    data_dir = base_dir / "data" / "sol_data"
    output_file = base_dir / "data" / "SOLUSDT-1h-merged.csv"
    
    logger.info(f"Looking for files in: {data_dir}")
    
    # Find all CSV files
    files = sorted(glob.glob(str(data_dir / "SOLUSDT-1h-*.csv")))
    
    if not files:
        logger.error("No files found!")
        return
        
    logger.info(f"Found {len(files)} files. Merging...")
    
    dfs = []
    for f in files:
        try:
            df = pd.read_csv(f)
            dfs.append(df)
        except Exception as e:
            logger.error(f"Error reading {f}: {e}")
            
    if not dfs:
        logger.error("No dataframes created.")
        return
        
    # Concatenate
    merged_df = pd.concat(dfs, ignore_index=True)
    
    # Sort by time
    if 'open_time' in merged_df.columns:
        merged_df = merged_df.sort_values('open_time').reset_index(drop=True)
        # Drop duplicates
        merged_df = merged_df.drop_duplicates(subset=['open_time'], keep='first')
    else:
        logger.warning("'open_time' column not found, skipping sort.")
        
    # Save
    merged_df.to_csv(output_file, index=False)
    
    logger.info(f"✓ Merge Complete!")
    logger.info(f"  - Output: {output_file}")
    logger.info(f"  - Rows: {len(merged_df)}")
    if 'open_time' in merged_df.columns:
        start_ts = merged_df['open_time'].min()
        end_ts = merged_df['open_time'].max()
        start_date = pd.to_datetime(start_ts, unit='ms')
        end_date = pd.to_datetime(end_ts, unit='ms')
        logger.info(f"  - Range: {start_date} to {end_date}")

if __name__ == "__main__":
    merge_sol_data()
