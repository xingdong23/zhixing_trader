import sys
import os
import pandas as pd
import logging
from datetime import datetime

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backtest.core.multi_asset_engine import MultiAssetBacktestEngine
from strategies.relative_strength.strategy import RelativeStrengthStrategy

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

DATA_DIR = 'backtest/data'
ASSETS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT']

def load_data():
    data = {}
    for symbol in ASSETS:
        file_path = os.path.join(DATA_DIR, f"{symbol}-1h-merged.csv")
        # Fallback
        if symbol == 'BTCUSDT' and not os.path.exists(file_path):
             file_path = os.path.join(DATA_DIR, "BTCUSDT-1h-2024-FULL.csv")
             
        if os.path.exists(file_path):
            logger.info(f"Loading {symbol}...")
            df = pd.read_csv(file_path)
            # Standardize columns
            if 'timestamp' not in df.columns and 'open_time' in df.columns:
                 df['timestamp'] = df['open_time']
            
            df['timestamp'] = pd.to_numeric(df['timestamp'], errors='coerce')
            df['date'] = pd.to_datetime(df['timestamp'], unit='ms')
            df = df.set_index('date').sort_index()
            df['close'] = pd.to_numeric(df['close'], errors='coerce')
            
            # Resample to 1H if needed (assuming files are 1H already)
            data[symbol] = df
        else:
            logger.warning(f"File not found for {symbol}")
            
    return data

def main():
    # 1. Load Data
    data = load_data()
    if not data:
        logger.error("No data loaded.")
        return

    # 2. Initialize Strategy
    # Lookback 7 days (168h), Rebalance Daily (24h)
    strategy = RelativeStrengthStrategy(
        assets=list(data.keys()),
        benchmark='BTCUSDT',
        lookback=168,
        rebalance_freq=24,
        top_n=1
    )

    # 3. Initialize Engine
    engine = MultiAssetBacktestEngine(initial_capital=10000.0)

    # 4. Run Backtest
    results = engine.run(data, strategy)

    # 5. Output Results
    if results:
        print("\n" + "="*40)
        print("BACKTEST RESULTS (Relative Strength Arbitrage)")
        print("="*40)
        print(f"Total Return: {results['total_return']:.2%}")
        print(f"Max Drawdown: {results['max_drawdown']:.2%}")
        print(f"Sharpe Ratio: {results['sharpe_ratio']:.2f}")
        print(f"Final Capital: {results['final_capital']:.2f}")
        print("="*40)
        
        # Save Equity Curve
        results['equity_curve'].to_csv('backtest/results/rs_equity_curve.csv')
        logger.info("Equity curve saved to backtest/results/rs_equity_curve.csv")

if __name__ == "__main__":
    main()
