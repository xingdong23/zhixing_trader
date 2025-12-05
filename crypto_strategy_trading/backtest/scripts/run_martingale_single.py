"""
Martingale Sniper Single Strategy - Survival Mode Verification Script
"""
import os
import sys
import pandas as pd
import logging
from datetime import datetime

# Add project root to path
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

from strategies.martingale_sniper.strategy_single import MartingaleSniperSingleStrategy

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

def load_data(symbol, data_dir):
    """Load data for a specific symbol (Merged or scattered)"""
    # 1. Try merged file first
    merged_path = os.path.join(data_dir, f'{symbol}-5m-merged.csv')
    if os.path.exists(merged_path):
        print(f"Loading merged data from {merged_path}...")
        df = pd.read_csv(merged_path, low_memory=False)
    else:
        # 2. Try scattered files
        files = sorted([f for f in os.listdir(data_dir) if f.startswith(f'{symbol}-5m-') and f.endswith('.csv')])
        if not files:
            return None
        
        print(f"Loading {len(files)} scattered files for {symbol}...")
        dfs = []
        for f in files:
            try:
                path = os.path.join(data_dir, f)
                df = pd.read_csv(path)
                dfs.append(df)
            except Exception as e:
                logger.error(f"Error loading {f}: {e}")
        
        if not dfs:
            return None
        df = pd.concat(dfs, ignore_index=True)

    # Common Processing
    # Handle potential multiple headers
    df = df[df['open_time'] != 'open_time']
    
    # Rename columns if needed
    if 'vol' in df.columns:
        df = df.rename(columns={'vol': 'volume'})
        
    cols = ['open', 'high', 'low', 'close', 'volume']
    for col in cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col])
            
    if 'open_time' in df.columns:
        df['timestamp'] = pd.to_datetime(pd.to_numeric(df['open_time']), unit='ms')
    
    df = df.sort_values('timestamp').reset_index(drop=True)
    return df

def run_simulation(data, symbol):
    """Run a single simulation with House Money Logic"""
    
    # Configuration (Aggressive Mode for Doubling)
    config = {
        'symbol': symbol,
        'total_capital': 300.0,
        'leverage': 20, # Will be capped at 10x
        'take_profit_pct': 0.12, # Lower target for faster turnover
        'stop_loss_pct': 0.10,
        'explosion_threshold': 0.045, # Aggressive Entry
        'cooldown_minutes': 5,
        'max_daily_rounds': 5
    }
    
    strategy = MartingaleSniperSingleStrategy(config)
    
    print(f"\n" + "="*50)
    print(f"🎮 开始模拟: {symbol}")
    print(f"   时间范围: {data['timestamp'].iloc[0]} -> {data['timestamp'].iloc[-1]}")
    print(f"   数据量:   {len(data)} 条K线")
    print(f"="*50)
    
    # Simulation Loop
    initial_cap = config['total_capital']
    won_games = 0
    bust_games = 0
    total_withdrawals = 0.0
    
    window_size = 50 
    
    for i in range(window_size, len(data)):
        row = data.iloc[i]
        now = row['timestamp']
        current_price = float(row['close'])
        df_slice = data.iloc[i-10:i+1] 
        
        # 1. Check Position
        if strategy.current_position:
            action = strategy.check_position(current_price, now)
            if action:
                strategy.update_position(action)
                if strategy.current_capital >= initial_cap * 2:
                    withdraw_amount = initial_cap
                    strategy.current_capital -= withdraw_amount
                    total_withdrawals += withdraw_amount
                    won_games += 1
                    print(f"🚀🚀🚀 [{now}] {symbol} 资金翻倍！提现 {withdraw_amount:.2f}U")
        
        # 2. Analyze or Reset
        else:
            if strategy.current_capital < 10:
                print(f"💀 [{now}] {symbol} 爆仓 (归零)")
                bust_games += 1
                strategy.current_capital = initial_cap
                strategy.martingale_level = 0
                continue
                
            signal = strategy.analyze(df_slice)
            if signal:
                strategy.update_position(signal)
            
    # Final Report
    stats = strategy.get_stats()
    print("\n" + "-"*40)
    print(f"📊 {symbol} 测试结果")
    print("-"*40)
    print(f"最终余额: {strategy.current_capital:.2f} U")
    print(f"累计提现: {total_withdrawals:.2f} U (已落袋)")
    print(f"净利润:   {strategy.current_capital + total_withdrawals - initial_cap :.2f} U")
    print(f"翻倍次数: {won_games}")
    print(f"爆仓次数: {bust_games}")
    print(f"胜/负:    {stats['rounds_won']} / {stats['rounds_lost']}")
    
    return stats

if __name__ == "__main__":
    data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
    
    symbols_to_test = ['1000PEPEUSDT', 'DOGEUSDT', 'WIFUSDT', 'ETHUSDT']
    
    for symbol in symbols_to_test:
        data = load_data(symbol, data_dir)
        if data is not None and not data.empty:
            run_simulation(data, symbol)
        else:
            print(f"⚠️ 未找到 {symbol} 的 5m 数据")
