import pandas as pd
import numpy as np
import os

class DataLoader:
    def __init__(self, data_dir='backtest/data'):
        self.data_dir = data_dir

    def load_data(self, symbol='BTCUSDT', timeframe='1h', file_name=None):
        """
        Load data for a specific symbol.
        """
        if file_name:
            path = os.path.join(self.data_dir, file_name)
        else:
            # Default to merged file if exists
            path = os.path.join(self.data_dir, f"{symbol}-{timeframe}-merged.csv")
            if not os.path.exists(path):
                raise FileNotFoundError(f"Data file not found: {path}")

        df = pd.read_csv(path)
        
        # Parse dates
        if 'open_time' in df.columns:
            # Coerce to numeric, turning errors (like repeated headers) into NaN
            df['open_time'] = pd.to_numeric(df['open_time'], errors='coerce')
            df.dropna(subset=['open_time'], inplace=True)
            
            df['timestamp'] = pd.to_datetime(df['open_time'], unit='ms')
            df.set_index('timestamp', inplace=True)
            df.sort_index(inplace=True)
        
        # Ensure columns are float
        cols = ['open', 'high', 'low', 'close', 'vol']
        for col in cols:
            if col in df.columns:
                df[col] = df[col].astype(float)
            
        # Rename vol to volume for consistency
        if 'vol' in df.columns:
            df.rename(columns={'vol': 'volume'}, inplace=True)
            
        return df

    def prepare_features_and_target(self, df, target_period=1):
        """
        Prepare features (OHLCV + Time) and target (future returns).
        """
        # Features
        features = df[['open', 'high', 'low', 'close', 'volume']].copy()
        
        # Add Time Features
        # These allow the miner to find patterns like "Buy on Mondays" or "Sell at 8 AM"
        features['hour'] = df.index.hour.astype(float)
        features['day_of_week'] = df.index.dayofweek.astype(float) # 0=Monday, 6=Sunday
        features['day_of_month'] = df.index.day.astype(float)
        
        # Target: Future N-period return
        # Return = (Price_{t+N} - Price_t) / Price_t
        target = df['close'].shift(-target_period) / df['close'] - 1.0
        
        # Drop NaNs created by shift
        valid_idx = target.notna()
        features = features.loc[valid_idx]
        target = target.loc[valid_idx]
        
        return features, target
