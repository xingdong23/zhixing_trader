import optuna
import json
import logging
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from strategies.vwap_mean_reversion.strategy import VwapMeanReversionStrategy
from backtest.core.backtest_engine import BacktestEngine
from backtest.core.data_loader import DataLoader

# Setup logging
logging.basicConfig(level=logging.CRITICAL)

def objective(trial: optuna.Trial) -> float:
    """Optuna objective function for VWAP Mean Reversion"""
    
    # Define search space
    params = {
        "strategy_name": "Vwap_Mean_Reversion",
        "symbol": "1000PEPEUSDT",
        "total_capital": 1000.0,
        "leverage": 5,
        "bet_amount": 100.0,
        
        # Optimization Targets
        "entry_threshold": trial.suggest_float("entry_threshold", 0.001, 0.03), # 0.1% to 3%
        "stop_loss_pct": trial.suggest_float("stop_loss_pct", 0.01, 0.10),     # 1% to 10%
        "take_profit_target": trial.suggest_categorical("take_profit_target", ["vwap", "fixed_pct"]),
        "take_profit_pct": trial.suggest_float("take_profit_pct", 0.01, 0.15), # 1% to 15%
    }
    
    # Load data (Using 1000PEPEUSDT-5m-merged.csv as per analysis)
    # Ensure this file exists in data/
    data_path = "data/1000PEPEUSDT-5m-merged.csv"
    if not Path(data_path).exists():
        # Fallback to try finding any merged file if specific one missing, but for now strict.
        raise FileNotFoundError(f"Data file not found: {data_path}")

    data_loader = DataLoader(data_path)
    df = data_loader.load()
    # Use last 10,000 rows (approx 1 month of 5m data) for faster optimization
    df = df.tail(10000)
    klines = data_loader.to_klines(df)
    
    # Suppress backtest engine logs specifically
    logging.getLogger("backtest.core.backtest_engine").setLevel(logging.CRITICAL)
    
    # Run Backtest
    strategy = VwapMeanReversionStrategy(params)
    engine = BacktestEngine(strategy, initial_capital=1000.0)
    result = engine.run(klines)
    
    # Calculate Score
    # We want high return, low drawdown, and reasonable number of trades
    summary = result["summary"]
    total_return = summary["total_return"]
    max_drawdown = summary["max_drawdown"]
    total_trades = summary["total_trades"]
    
    # Penalties
    if total_trades < 10:
        return -100.0 # Not enough trades
        
    # Score = Return / (MaxDD + 1) * log(Trades)
    # Simple version: Return - MaxDD * 1.5
    score = total_return - max_drawdown * 1.5
    
    return score

def run_optimization():
    print("Starting VWAP Mean Reversion Optimization...")
    storage_url = "sqlite:///ai/optimization/vwap_mean_reversion/optuna.db"
    
    # Create directory if not exists (sqlite needs it)
    Path("ai/optimization/vwap_mean_reversion").mkdir(parents=True, exist_ok=True)
    
    study = optuna.create_study(
        direction="maximize",
        study_name="vwap_mean_reversion_pepe_5m_v2",
        storage=storage_url,
        load_if_exists=True
    )
    
    # Run 20 trials (turbo mode)
    study.optimize(objective, n_trials=20, n_jobs=1)
    
    best_params = study.best_params
    print(f"Best Params: {best_params}")
    print(f"Best Value: {study.best_value}")
    
    # Save best parameters
    output_path = Path("ai/optimization/vwap_mean_reversion/best_params.json")
    # Merge with static config
    full_config = {
        "strategy_name": "Vwap_Mean_Reversion",
        "symbol": "1000PEPEUSDT",
        "total_capital": 1000.0,
        "leverage": 5,
        "bet_amount": 100.0,
        **best_params
    }
    output_path.write_text(json.dumps(full_config, indent=2))
    print(f"Saved best params to {output_path}")

if __name__ == "__main__":
    run_optimization()
