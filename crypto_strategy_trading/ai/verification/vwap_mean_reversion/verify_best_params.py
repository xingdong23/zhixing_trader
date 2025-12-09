
import json
import logging
from pathlib import Path
import sys

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from strategies.vwap_mean_reversion.strategy import VwapMeanReversionStrategy
from backtest.core.backtest_engine import BacktestEngine
from backtest.core.data_loader import DataLoader

def verify_best_params():
    print("Verifying Best Parameters...")
    
    # Load Best Params
    params_path = Path("ai/optimization/vwap_mean_reversion/best_params.json")
    if not params_path.exists():
        print("No best params found. Run optimization first.")
        return
        
    config = json.loads(params_path.read_text())
    
    # Data Path
    data_path = "data/1000PEPEUSDT-5m-merged.csv"
    
    # Run Backtest
    loader = DataLoader(data_path)
    df = loader.load()
    klines = loader.to_klines(df)
    
    strategy = VwapMeanReversionStrategy(config)
    engine = BacktestEngine(strategy, initial_capital=1000.0)
    result = engine.run(klines)
    
    summary = result["summary"]
    print("-" * 30)
    print(f"Total Return: {summary['total_return']:.2f}%")
    print(f"Max Drawdown: {summary['max_drawdown']:.2f}%")
    print(f"Total Trades: {summary['total_trades']}")
    print(f"Win Rate: {summary['win_rate']:.2f}%")
    print("-" * 30)

if __name__ == "__main__":
    verify_best_params()
