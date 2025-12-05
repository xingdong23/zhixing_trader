"""
Verify Best Parameters from Optuna (Trial 15)
---------------------------------------------
Running a detailed backtest with the AI-discovered parameters.
"""
import os
import sys
import pandas as pd
import logging

# Add project root
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

from strategies.martingale_sniper.strategy_single import MartingaleSniperSingleStrategy
from alphaV2.optimization.optuna_martingale import load_data

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

def run_verification():
    symbol = '1000PEPEUSDT'
    data_dir = os.path.join(project_root, 'backtest', 'data')
    
    print(f"Loading data for {symbol}...")
    data = load_data(symbol, data_dir)
    if data is None:
        print("No data found.")
        return

    # Parameters from Optuna Trial 24 (Best so far: 180.36% return)
    params = {
        'leverage': 15,
        'take_profit_pct': 0.1886,    # 18.86%
        'stop_loss_pct': 0.3075,      # 30.75%
        'explosion_threshold': 0.0682, # 6.82%
        'volume_spike_ratio': 3.34,
        'martingale_sequence': [1, 3, 9, 27, 81], # Aggressive
        'cooldown_minutes': 15,
        'max_daily_rounds': 10,
        
        # System params
        'symbol': symbol,
        'total_capital': 300.0,
        'safety_override': True
    }
    
    print("\n⚙️ Running Strategy with AI Parameters:")
    print(f"  Leverage: {params['leverage']}x")
    print(f"  Take Profit: {params['take_profit_pct']:.2%}")
    print(f"  Stop Loss: {params['stop_loss_pct']:.2%}")
    print(f"  Threshold: {params['explosion_threshold']:.2%}")
    print(f"  Sequence: {params['martingale_sequence']}")
    
    strategy = MartingaleSniperSingleStrategy(params)
    
    # Force params
    strategy.explosion_threshold = params['explosion_threshold']
    strategy.leverage = params['leverage']
    strategy.liquidation_pct = (1 / strategy.leverage) * 0.95
    
    # Run Loop
    busts = 0
    window_size = 50
    
    print(f"\nProcessing {len(data)} candles...")
    
    for i in range(window_size, len(data)):
        current_price = float(data.iloc[i]['close'])
        now = data.iloc[i]['timestamp']
        
        if strategy.current_position:
            action = strategy.check_position(current_price, now)
            if action:
                strategy.update_position(action)
                # Log trade
                if action['signal'] == 'close':
                    pnl = action['realized_pnl']
                    print(f"  [{now}] Closed: PnL {pnl:.2f} (Cap: {strategy.current_capital:.2f})")
        else:
            if strategy.current_capital < 10:
                print(f"  [{now}] 💀 BUSTED! Capital < 10")
                busts = 1
                break
            
            df_slice = data.iloc[i-10:i+1]
            signal = strategy.analyze(df_slice)
            if signal:
                strategy.update_position(signal)
                print(f"  [{now}] Open {signal['signal']} @ {signal['price']}")

    # Final Stats
    stats = strategy.get_stats()
    print("\n" + "="*40)
    print(f"🏁 Final Result for {symbol}")
    print("="*40)
    print(f"Initial Capital: 300.00")
    print(f"Final Capital:   {strategy.current_capital:.2f}")
    print(f"Total Return:    {stats['return_pct']:.2f}%")
    print(f"Total Trades:    {strategy.total_trades}")
    print(f"Win Rate:        {stats['rounds_won']}/{stats['total_rounds']} ({stats['win_rate']:.1%})")
    print(f"Busts:           {busts}")
    print("="*40)

if __name__ == "__main__":
    run_verification()
