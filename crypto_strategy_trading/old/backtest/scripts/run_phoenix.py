import sys
import os
import pandas as pd
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from strategies.phoenix_gamble.strategy import PhoenixStrategy
from strategies.phoenix_gamble.config import PhoenixConfig

def run_single_asset(file_path, symbol):
    print(f"\n" + "="*50)
    print(f"🚀 测试资产: {symbol}")
    print(f"📂 数据文件: {file_path.name}")
    
    df = pd.read_csv(file_path)
    
    # Filter out repeated headers
    if 'open_time' in df.columns:
        df = df[df['open_time'] != 'open_time']
        
    if 'open_time' in df.columns:
        df['timestamp'] = pd.to_datetime(df['open_time'], unit='ms')
        df.set_index('timestamp', inplace=True)
        
    # Ensure numeric columns
    numeric_cols = ['open', 'high', 'low', 'close', 'volume']
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col])
            
    # Initialize Strategy
    strategy = PhoenixStrategy()
    strategy.config.SYMBOL = symbol # Override symbol
    
    # Pre-calculate indicators
    df = strategy.calculate_indicators(df)
    
    # Run Simulation
    trades = []
    start_idx = strategy.config.BOLLINGER_WINDOW
    
    for i in range(start_idx, len(df)):
        current_row = df.iloc[i]
        prev_row = df.iloc[i-1]
        
        # 1. Update Strategy State (Check Exits)
        exit_res = strategy.run_backtest_step(current_row)
        if exit_res:
            trades.append(exit_res)
                
        # 2. Check Entries
        if strategy.position is None and strategy.current_capital >= strategy.config.BASE_BET:
            signal = strategy.get_signal(current_row, prev_row)
            if signal:
                strategy.position = signal
                strategy.entry_price = current_row['close']

        # Check for Ruin
        if strategy.current_capital < strategy.config.BASE_BET:
            print(f"💀 资金耗尽! ({symbol})")
            break

    # Summary for this asset
    final_capital = strategy.current_capital
    total_return = (final_capital - strategy.config.TOTAL_CAPITAL) / strategy.config.TOTAL_CAPITAL * 100
    jackpots = len([t for t in trades if t['pnl'] > strategy.config.BASE_BET * 2]) # Rough check for big wins
    
    print(f"💰 最终资金: {final_capital:.2f} U ({total_return:+.2f}%)")
    print(f"🎰 Jackpots: {jackpots}")
    
    return {
        'symbol': symbol,
        'return': total_return,
        'final_capital': final_capital,
        'trades': len(trades),
        'jackpots': jackpots
    }

def run_phoenix_backtest():
    base_dir = Path(__file__).parent.parent / 'data'
    
    # Define assets to test
    assets = [
        ('ETHUSDT-5m-merged.csv', 'ETH'),
        ('SOLUSDT-5m-merged.csv', 'SOL'),
        ('DOGEUSDT-5m-merged.csv', 'DOGE'),
        ('1000PEPEUSDT-5m-merged.csv', '1000PEPE'),
        ('WIFUSDT-5m-merged.csv', 'WIF'),
        ('BTCUSDT-5m-merged.csv', 'BTC'),
    ]
    
    results = []
    
    for filename, symbol in assets:
        file_path = base_dir / filename
        if file_path.exists():
            res = run_single_asset(file_path, symbol)
            results.append(res)
        else:
            print(f"⚠️ 跳过 {symbol}: 文件不存在 {filename}")

    # Final Comparative Report
    print("\n" + "="*60)
    print("🏆 全币种 '凤凰涅槃' 挑战赛结果")
    print("="*60)
    print(f"{'币种':<10} | {'最终资金':<12} | {'收益率':<10} | {'Jackpots':<8}")
    print("-" * 60)
    for res in results:
        print(f"{res['symbol']:<10} | {res['final_capital']:<12.2f} | {res['return']:<+9.2f}% | {res['jackpots']:<8}")
    print("="*60)

if __name__ == "__main__":
    run_phoenix_backtest()
