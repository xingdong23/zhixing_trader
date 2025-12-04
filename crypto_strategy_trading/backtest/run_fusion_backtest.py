
import sys
import os
import logging
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backtest.core import DataLoader
from strategies.pumpkin_soup.strategy import PumpkinSoupStrategy

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("FusionBacktest")

class FusionBacktestEngine:
    def __init__(self, initial_capital: float = 10000.0):
        self.initial_capital = initial_capital
        self.current_capital = initial_capital
        self.cash = initial_capital
        self.position: Optional[Dict] = None # {symbol, amount, entry_price, side}
        
        self.equity_curve = []
        self.trades = []
        
        # Strategy State
        self.active_symbol = None
        self.strategy_instance = None
        
        # RS Parameters
        self.rs_lookback = 24 # 24 hours
        
    def run(self, data_map: Dict[str, pd.DataFrame], start_date: str, end_date: str):
        logger.info(f"Starting Fusion Backtest: {start_date} to {end_date}")
        
        # 1. Align Data
        # Create a master timeline
        all_timestamps = sorted(list(set().union(*[df['open_time'].tolist() for df in data_map.values()])))
        
        # Filter by date range
        start_ts = pd.to_datetime(start_date).timestamp() * 1000
        end_ts = pd.to_datetime(end_date).timestamp() * 1000
        timestamps = [t for t in all_timestamps if start_ts <= t < end_ts]
        
        logger.info(f"Timeline: {len(timestamps)} candles")
        
        # Pre-process data for fast access
        # Dict[symbol, Dict[timestamp, row]]
        data_lookup = {sym: df.set_index('open_time').to_dict('index') for sym, df in data_map.items()}
        
        # History buffer for RS calculation
        # We need continuous history, so we might need to access data before start_date
        # For simplicity, we build history as we go.
        price_history = {sym: [] for sym in data_map.keys()}
        
        last_day = None
        
        for ts in timestamps:
            current_dt = datetime.fromtimestamp(ts / 1000)
            current_day = current_dt.date()
            
            # Update Price History
            current_prices = {}
            for sym in data_map.keys():
                row = data_lookup[sym].get(ts)
                if row:
                    price_history[sym].append(row['close'])
                    current_prices[sym] = row['close']
            
            # -------------------------------------------------------
            # 1. Daily Asset Selection (Rebalance)
            # -------------------------------------------------------
            if last_day != current_day:
                # Calculate RS
                best_asset = self._select_best_asset(price_history, current_prices)
                
                if best_asset and best_asset != self.active_symbol:
                    logger.info(f"[{current_dt}] 🔄 Switching Asset: {self.active_symbol} -> {best_asset}")
                    
                    # Close existing position if any
                    if self.position:
                        self._close_position(ts, current_prices.get(self.active_symbol), "Asset Switch")
                    
                    # Switch Asset
                    self.active_symbol = best_asset
                    
                    # Initialize Strategy for new asset
                    # We need to pass recent history to the strategy for warmup
                    # Strategy needs ~200 candles
                    self.strategy_instance = self._init_strategy()
                    
                last_day = current_day
            
            # -------------------------------------------------------
            # 2. Strategy Execution (Hourly)
            # -------------------------------------------------------
            if self.active_symbol and self.strategy_instance:
                # Get Data for Active Symbol
                # We need to construct 'klines' list for strategy.analyze
                # Strategy needs OHLCV dicts
                
                # Get recent history (e.g. last 1000 candles) from data_map directly to be fast
                # Or reconstruct from data_lookup?
                # Accessing dataframe by index is faster for slices.
                
                df = data_map[self.active_symbol]
                # Find index of current ts
                # This is slow inside a loop. 
                # Optimization: Maintain an index pointer or slice.
                # Since we are iterating sequentially, we can just append to a running buffer?
                # But strategy needs a list of dicts.
                
                # Let's use a simple approach: Slice DataFrame based on timestamp
                # df[(df.open_time <= ts) & (df.open_time > ts - window)]
                # Window = 1000 hours
                window_ms = 1000 * 3600 * 1000
                start_window = ts - window_ms
                
                # Using searchsorted for speed
                # Assuming df is sorted by open_time
                times = df['open_time'].values
                idx_end = np.searchsorted(times, ts, side='right')
                idx_start = np.searchsorted(times, start_window, side='left')
                
                if idx_end > idx_start:
                    klines_df = df.iloc[idx_start:idx_end]
                    klines = klines_df.to_dict('records')
                    
                    # Run Strategy
                    signal = self.strategy_instance.analyze(klines)
                    self._process_signal(signal, ts, current_prices[self.active_symbol])
                    
                    # Update Strategy State (Position)
                    if self.position:
                        # Strategy needs to know current position to manage exits
                        # We need to sync backtest engine position to strategy position
                        self.strategy_instance.current_position = {
                            "side": self.position['side'],
                            "entry_price": self.position['entry_price'],
                            "amount": self.position['amount'],
                            "stop_loss": self.position.get('stop_loss', 0),
                            "take_profit": self.position.get('take_profit', 0)
                        }
                    else:
                        self.strategy_instance.current_position = None

    def _select_best_asset(self, history, current_prices):
        """Select asset with highest 24h momentum"""
        scores = {}
        for sym, prices in history.items():
            if len(prices) > 24 and sym in current_prices:
                # Simple 24h Return
                p_now = prices[-1]
                p_24h = prices[-25]
                if p_24h > 0:
                    scores[sym] = (p_now - p_24h) / p_24h
        
        if not scores:
            return None
            
        # Return key with max value
        return max(scores, key=scores.get)

    def _init_strategy(self):
        params = {
            "ema_fast_len": 8,
            "ema_mid_len": 21,
            "ema_slow_len": 55,
            "ewo_fast_len": 5,
            "ewo_slow_len": 35,
            "enable_chop_filter": True,
            "choppiness_threshold": 50.0,
            "enable_adx_filter": True,
            "adx_threshold": 25.0,
            "enable_regime_filter": False,
            "enable_mtf_filter": True,
            "htf_multiplier": 4,
            "risk_per_trade": 0.05,
            "leverage": 5.0,
            "enable_vol_targeting": True,
            "volatility_target": 0.4,
            "volatility_window": 480,
            "total_capital": self.current_capital # Use current capital
        }
        return PumpkinSoupStrategy(params)

    def _process_signal(self, signal, ts, price):
        if signal['signal'] == 'hold':
            return
            
        # Entry
        if signal['signal'] in ['buy', 'sell'] and not self.position:
            amount = signal['amount']
            cost = amount * price
            fee = cost * 0.0005 # Taker fee
            
            if self.cash >= fee: # Margin check simplified
                self.cash -= fee
                self.position = {
                    'symbol': self.active_symbol,
                    'side': 'long' if signal['signal'] == 'buy' else 'short',
                    'amount': amount,
                    'entry_price': price,
                    'entry_time': ts,
                    'stop_loss': signal.get('stop_loss'),
                    'take_profit': signal.get('take_profit')
                }
                self.trades.append({
                    'timestamp': ts,
                    'symbol': self.active_symbol,
                    'side': signal['signal'],
                    'price': price,
                    'amount': amount,
                    'type': 'entry'
                })
                logger.info(f"[{datetime.fromtimestamp(ts/1000)}] 🟢 OPEN {signal['signal'].upper()} {self.active_symbol} @ {price:.2f}")

        # Exit
        elif signal['signal'] in ['buy', 'sell'] and self.position:
            # Close position
            # Check if direction matches (Buy to cover Short, Sell to close Long)
            is_closing = (self.position['side'] == 'long' and signal['signal'] == 'sell') or \
                         (self.position['side'] == 'short' and signal['signal'] == 'buy')
            
            if is_closing:
                self._close_position(ts, price, signal.get('reason', 'Signal Exit'))

    def _close_position(self, ts, price, reason):
        if not self.position:
            return
            
        amount = self.position['amount']
        entry_price = self.position['entry_price']
        side = self.position['side']
        
        # Calculate PnL
        if side == 'long':
            pnl = (price - entry_price) * amount
        else:
            pnl = (entry_price - price) * amount
            
        value = amount * price
        fee = value * 0.0005
        
        self.cash += pnl - fee
        self.current_capital = self.cash # Assuming 100% cash usage for simplicity in tracking
        
        self.trades.append({
            'timestamp': ts,
            'symbol': self.position['symbol'],
            'side': 'sell' if side == 'long' else 'buy',
            'price': price,
            'amount': amount,
            'pnl': pnl,
            'type': 'exit',
            'reason': reason
        })
        
        logger.info(f"[{datetime.fromtimestamp(ts/1000)}] 🔴 CLOSE {side.upper()} {self.position['symbol']} @ {price:.2f} | PnL: {pnl:.2f} | {reason}")
        
        self.position = None

    def get_results(self):
        return {
            "final_capital": self.current_capital,
            "total_return": (self.current_capital - self.initial_capital) / self.initial_capital * 100,
            "trades": len(self.trades) // 2 # Approx
        }

def main():
    coins = ['SOLUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'DOGEUSDT', 'XRPUSDT']
    data_map = {}
    
    print("Loading Data...")
    for coin in coins:
        file_path = f"backtest/data/{coin}-1h-merged.csv"
        if os.path.exists(file_path):
            loader = DataLoader(file_path)
            data_map[coin] = loader.load()
            print(f"Loaded {coin}: {len(data_map[coin])} rows")
            
    engine = FusionBacktestEngine()
    engine.run(data_map, "2023-01-01", "2023-03-10")
    
    res = engine.get_results()
    print("\n" + "="*50)
    print(f"🏆 FUSION STRATEGY RESULTS")
    print("="*50)
    print(f"Final Capital: {res['final_capital']:.2f}")
    print(f"Total Return:  {res['total_return']:.2f}%")
    print(f"Total Trades:  {res['trades']}")
    print("="*50)

if __name__ == "__main__":
    main()
