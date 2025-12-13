import pandas as pd
import numpy as np
import os
import sys
import argparse
from datetime import datetime

# Add path to import strategy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from strategy import MomentumGamblerStrategy
except ImportError:
    print("❌ Could not import strategy.")
    sys.exit(1)

DATA_DIR = "/crypto_trading/data"

class PortfolioManager:
    def __init__(self, initial_capital=1000.0, max_positions=5):
        self.initial_capital = initial_capital
        self.cash = initial_capital
        self.max_positions = max_positions
        self.positions = {} # symbol -> {entry_price, size, ...}
        self.equity_curve = []
        self.trade_history = []
        self.leverage = 10
        self.stop_loss = 0.08
        
    def get_total_equity(self, current_prices: dict):
        equity = self.cash
        for symbol, pos in self.positions.items():
            if symbol in current_prices:
                price = current_prices[symbol]
                # PnL = (Price - Entry) / Entry * Leverage * Margin
                pnl_pct = (price - pos['entry_price']) / pos['entry_price']
                pnl = pnl_pct * self.leverage * pos['margin']
                equity += pos['margin'] + pnl
            else:
                # If price missing, assume unchanged (margin only)
                equity += pos['margin']
        return equity

    def open_position(self, symbol, price, timestamp, adx_score):
        # Position Sizing: 10% of CURRENT Equity (Safety First)
        # Max Exposure = 5 * 10% = 50% Invested. 50% Cash Buffer.
        
        current_equity = self.get_total_equity({symbol: price}) # approx
        target_size = current_equity * 0.10
        
        if self.cash < target_size:
            target_size = self.cash # Take whatever is left? Or skip?
            if target_size < 10: return False # Too small
        
        self.cash -= target_size
        self.positions[symbol] = {
            'entry_price': price,
            'margin': target_size,
            'amount': (target_size * self.leverage) / price,
            'entry_time': timestamp,
            'highest_profit': 0.0,
            'adx': adx_score
        }
        return True

    def close_position(self, symbol, price, reason, timestamp):
        pos = self.positions[symbol]
        pnl_pct = (price - pos['entry_price']) / pos['entry_price']
        
        # Fee deduction (0.06% * 2 * leverage approx)
        fee_rate = 0.0012 * self.leverage
        
        raw_pnl = pnl_pct * self.leverage * pos['margin']
        fee_cost = pos['margin'] * fee_rate # Roughly
        
        net_pnl = raw_pnl - fee_cost
        return_amount = pos['margin'] + net_pnl
        if return_amount < 0: return_amount = 0
        
        self.cash += return_amount
        
        self.trade_history.append({
            'symbol': symbol,
            'entry_time': pos['entry_time'],
            'exit_time': timestamp,
            'pnl_pct': pnl_pct,
            'pnl_usd': net_pnl,
            'reason': reason,
            'adx': pos.get('adx', 0)
        })
        
        del self.positions[symbol]

def load_data(symbols):
    data_map = {}
    for sym in symbols:
        # Prefer full, then merged
        f_path = os.path.join(DATA_DIR, f"{sym}-5m-merged.csv")
        full_path = os.path.join(DATA_DIR, f"{sym}-5m-full.csv")
        
        path_to_use = None
        if os.path.exists(full_path): path_to_use = full_path
        elif os.path.exists(f_path): path_to_use = f_path
        
        if path_to_use:
            try:
                df = pd.read_csv(path_to_use)
                
                # Check for vol/volume
                if 'vol' in df.columns and 'volume' not in df.columns:
                    df.rename(columns={'vol': 'volume'}, inplace=True)
                
                # Force numeric
                for col in ['open', 'high', 'low', 'close', 'volume']:
                    if col in df.columns:
                        df[col] = pd.to_numeric(df[col], errors='coerce')
                
                # Normalize time
                if 'open_time' in df.columns:
                     df['open_time'] = pd.to_numeric(df['open_time'], errors='coerce')
                     if df['open_time'].max() > 100000000000000:
                         df.loc[df['open_time'] > 100000000000000, 'open_time'] //= 1000
                     df['date'] = pd.to_datetime(df['open_time'], unit='ms')
                
                # Resample to 2H
                df.set_index('date', inplace=True)
                df_2h = df.resample('2h').agg({
                    'open': 'first', 'high': 'max', 'low': 'min', 'close': 'last', 'volume': 'sum'
                }).dropna()
                
                # Calculate Indicators & Signals
                strategy = MomentumGamblerStrategy()
                df_2h = strategy.calculate_indicators(df_2h.reset_index())
                df_2h = strategy.populate_entry_trend(df_2h, {'pair': sym})
                
                # Set index back to date for alignment
                df_2h.set_index('date', inplace=True)
                
                data_map[sym] = df_2h
                print(f"✅ Loaded {sym}: {len(df_2h)} candles ({df_2h.index.min()} ~ {df_2h.index.max()})")
            except Exception as e:
                print(f"❌ Error loading {sym}: {e}")
                
    return data_map

def run_portfolio_backtest():
    # Candidates Pool
    symbols = ['WIFUSDT', 'DOGEUSDT', 'XRPUSDT', 'SOLUSDT', 'PEPEUSDT', 'BTCUSDT', 'ETHUSDT']
    
    print(f"📊 Initializing AI Fund Manager (V11 Engine)...")
    print(f"💰 Initial Capital: 1000 USDT")
    print(f"🎰 Max Positions: 5")
    print("-" * 60)
    
    data_map = load_data(symbols)
    if not data_map:
        print("No data found.")
        return

    # Find common start/end (or just run over Union and skip missing)
    # Union index
    all_dates = sorted(list(set().union(*[df.index for df in data_map.values()])))
    # Filter for 2024 only for relevance?
    start_date = pd.Timestamp('2024-01-01')
    all_dates = [d for d in all_dates if d >= start_date]
    
    manager = PortfolioManager(initial_capital=1000.0, max_positions=5)
    
    print(f"🏃 Running simulation over {len(all_dates)} periods...")
    
    for current_time in all_dates:
        # Update Portfolio State (Check Exits)
        current_prices = {}
        
        # 1. Update Prices & Specific Candle Data
        step_data = {} # sym -> row
        for sym, df in data_map.items():
            if current_time in df.index:
                row = df.loc[current_time]
                current_prices[sym] = row['close']
                step_data[sym] = row
        
        # 2. Check Exits for Open Positions
        # Use keys() list copy to allow deletion
        for sym in list(manager.positions.keys()):
            if sym not in step_data: continue # No data this candle
            
            row = step_data[sym]
            pos = manager.positions[sym]
            
            # Logic from Strategy
            pnl_pct = (row['close'] - pos['entry_price']) / pos['entry_price']
            
            # SL
            if pnl_pct <= -manager.stop_loss:
                manager.close_position(sym, row['close'], 'stop_loss', current_time)
                continue
                
            # Trailing Stop
            if pnl_pct > pos['highest_profit']:
                manager.positions[sym]['highest_profit'] = pnl_pct
                
            highest = manager.positions[sym]['highest_profit']
            # V11 Parameters: Start 0.10, Offset 0.15 ?
            # Wait, V11 Strategy defaults? 
            # From backtest.py: trailing_start = 0.10, trailing_offset = 0.15
            if highest >= 0.10 and pnl_pct < (highest - 0.15):
                manager.close_position(sym, row['close'], 'trailing_stop', current_time)
                continue
        
        # 3. Check Entries (Scouting)
        # Identify signals
        candidates_score = []
        for sym, row in step_data.items():
            if sym in manager.positions: continue # Already open
            
            # Check Signal (Strategy logic)
            # We need the DF index location for the strategy "generate_signal" which usually uses iloc
            # This is tricky with Index lookup. 
            # We can just check the pre-calculated columns if we exposed them?
            # Or use the boolean columns I see in strategy.py
            # Strategy V11 sets 'enter_long' column?
            # Let's check strategy_v11.py content. It usually calculates 'enter_long' column.
            
            # Assuming 'enter_long' == 1
            if 'enter_long' in row and row['enter_long'] == 1:
                # Score = ADX?
                adx = row['adx'] if 'adx' in row else 0
                candidates_score.append((sym, row['close'], adx))
        
        # Sort candidates by ADX desc (Strongest momentum first)
        candidates_score.sort(key=lambda x: x[2], reverse=True)
        
        # 4. Allocate
        for sym, price, adx in candidates_score:
            if len(manager.positions) >= manager.max_positions:
                break # Full
            
            if manager.open_position(sym, price, current_time, adx):
                # print(f"  OPEN {sym} @ {price} (ADX {adx:.1f})")
                pass
                
        # Record Equity
        total_equity = manager.get_total_equity(current_prices)
        manager.equity_curve.append({'date': current_time, 'equity': total_equity})

    # Final Report
    final_equity = manager.equity_curve[-1]['equity']
    roi = (final_equity - manager.initial_capital) / manager.initial_capital * 100
    
    print("=" * 60)
    print(f"🏁 Final Portfolio Balance: {final_equity:.2f} USDT")
    print(f"📈 Total ROI: {roi:+.2f}%")
    print(f"📝 Total Trades: {len(manager.trade_history)}")
    
    wins = len([t for t in manager.trade_history if t['pnl_usd'] > 0])
    win_rate = (wins / len(manager.trade_history) * 100) if manager.trade_history else 0
    print(f"✅ Win Rate: {win_rate:.1f}%")
    
    print("-" * 60)
    print("Top 5 Trades:")
    sorted_trades = sorted(manager.trade_history, key=lambda x: x['pnl_usd'], reverse=True)
    for t in sorted_trades[:5]:
        print(f"{t['symbol']} | {t['entry_time']} | +{t['pnl_usd']:.1f} U ({t['pnl_pct']*100:.1f}%)")

if __name__ == "__main__":
    run_portfolio_backtest()
