
from typing import Dict, Any, Optional, List, Union
import pandas as pd
import logging
from datetime import datetime
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class Position:
    """Position information"""
    symbol: str
    entry_price: float
    amount: float
    entry_time: datetime
    side: str  # 'long' or 'short'
    stop_loss: float
    take_profit: float

    def __getitem__(self, key):
        return getattr(self, key)

class VwapMeanReversionStrategy:
    """
    Intraday VWAP Mean Reversion Strategy.
    
    Logic:
    - Calculate Intraday VWAP.
    - If Price < VWAP * (1 - threshold), MEAN REVERSION LONG (betting price goes back to VWAP).
    - If Price > VWAP * (1 + threshold), MEAN REVERSION SHORT (betting price goes back to VWAP).
    """

    def __init__(self, parameters: Dict[str, Any]):
        self.name = "Vwap_Mean_Reversion"
        self.parameters = parameters
        
        self.symbol = parameters.get('symbol', 'DOGE/USDT:USDT')
        
        # Capital Management
        self.total_capital = float(parameters.get('total_capital', 1000.0))
        self.leverage = int(parameters.get('leverage', 5))
        self.bet_amount = float(parameters.get('bet_amount', 100.0))
        
        # Strategy Parameters
        self.entry_threshold = float(parameters.get('entry_threshold', 0.02)) # 2% deviation
        self.stop_loss_pct = float(parameters.get('stop_loss_pct', 0.05))     # 5% stop loss
        self.take_profit_target = parameters.get('take_profit_target', 'vwap') # 'vwap' or 'fixed'
        self.take_profit_pct = float(parameters.get('take_profit_pct', 0.05)) # Used if target is 'fixed'
        
        # State
        self.current_position: Optional[Position] = None
        self.current_capital = self.total_capital
        
        # Stats
        self.total_trades = 0
        self.wins = 0
        self.losses = 0

    def calculate_vwap(self, df: pd.DataFrame) -> pd.Series:
        """Calculate Intraday VWAP"""
        data = df.copy()
        if not isinstance(data.index, pd.DatetimeIndex):
             if 'timestamp' in data.columns:
                 data['timestamp'] = pd.to_datetime(data['timestamp'])
                 data.set_index('timestamp', inplace=True)
             elif 'date' in data.columns:
                 data['date'] = pd.to_datetime(data['date'])
                 data.set_index('date', inplace=True)
        
        data['tp'] = (data['high'] + data['low'] + data['close']) / 3
        data['pv'] = data['tp'] * data['volume']
        
        # Group by date to reset VWAP daily
        # Note: This requires the dataframe to index by DatetimeIndex
        data['cum_pv'] = data.groupby(data.index.date)['pv'].cumsum()
        data['cum_v'] = data.groupby(data.index.date)['volume'].cumsum()
        
        vwap = data['cum_pv'] / data['cum_v']
        return vwap

    def analyze(self, df: Union[pd.DataFrame, List[Dict]]) -> Optional[Dict]:
        """Analyze market data and generate signals"""
        # Convert list to DataFrame if necessary
        if isinstance(df, list):
            df = pd.DataFrame(df)
            
        if df.empty:
            return None

        # Ensure we have enough data and proper index
        # We need at least the current day's data for accurate VWAP
        
        now = datetime.now() 
        # Note: In a real backtest, 'now' should be the last timestamp of df. 
        # But we'll follow the pattern of assuming 'now' is the decision time.
        # If df index is datetime, take the last one.
        if isinstance(df.index, pd.DatetimeIndex):
            current_time = df.index[-1]
        else:
            # Fallback or use system time if live trade (but usually df last row time)
            try:
                current_time = pd.to_datetime(df.iloc[-1]['timestamp'])
            except:
                current_time = now

        vwap_series = self.calculate_vwap(df)
        if vwap_series.empty:
            return None
            
        current_vwap = vwap_series.iloc[-1]
        current_price = df.iloc[-1]['close']
        
        # Calculate deviation
        deviation = (current_price - current_vwap) / current_vwap
        
        # Check Exit first
        exit_signal = self.check_exit(current_price, current_vwap, current_time)
        if exit_signal:
            return exit_signal
            
        # Entry Logic
        if self.current_position is None:
            # Short Entry: Price significantly ABOVE VWAP -> Expect return to VWAP
            if deviation > self.entry_threshold:
                return self._create_signal(
                    signal='short',
                    price=current_price,
                    timestamp=current_time,
                    reason=f"Price {current_price:.4f} > VWAP {current_vwap:.4f} by {deviation*100:.2f}%"
                )
            # Long Entry: Price significantly BELOW VWAP -> Expect return to VWAP
            elif deviation < -self.entry_threshold:
                return self._create_signal(
                    signal='long',
                    price=current_price,
                    timestamp=current_time,
                    reason=f"Price {current_price:.4f} < VWAP {current_vwap:.4f} by {deviation*100:.2f}%"
                )
                
        return None

    def _create_signal(self, signal: str, price: float, timestamp: datetime, reason: str) -> Dict:
        amount = (self.bet_amount * self.leverage) / price
        
        # Determine SL/TP prices
        if signal == 'long':
            stop_loss = price * (1 - self.stop_loss_pct)
            # If target is VWAP, we can't set a fixed price easily here as VWAP moves.
            # We set a placeholder or use the fixed pct if specified.
            take_profit = price * (1 + self.take_profit_pct) 
        else: # short
            stop_loss = price * (1 + self.stop_loss_pct)
            take_profit = price * (1 - self.take_profit_pct)
            
        return {
            'symbol': self.symbol,
            'signal': 'buy' if signal == 'long' else 'sell', # Standardize to buy/sell for order execution if needed, or keep long/short
            # Actually, most systems use 'buy' (long) / 'sell' (short) or 'open_long'/'open_short'
            # Let's align with the previous strategy which returned 'buy' for opening long.
            # But here we have SHORTING as well. 
            # If the system only supports Long, we should check. 
            # Assuming the system supports Shorting given it's crypto strategy trading.
            # I will use 'open_long' and 'open_short' to be explicit if the runner supports it,
            # or 'buy'/'sell'.
            # Looking at MartingaleSniper, it only did Long ('buy').
            # I will use 'entry_long' / 'entry_short' to be safe, or just 'buy'/'sell' if that implies direction.
            # Usually: Buy to Open (Long), Sell to Open (Short).
            # But often 'buy' = long, 'sell' = close long?
            # Let's use explicit 'long' / 'short' in a custom field 'direction' or similar?
            # Standard: 
            # signal: 'long' | 'short'
            # But let's look at check_position in Martingale:
            # It returns 'close'.
            # I will return 'entry_long' and 'entry_short'.
            'action': 'open_long' if signal == 'long' else 'open_short',
            'price': price,
            'amount': amount,
            'timestamp': timestamp,
            'reason': reason,
            'stop_loss': stop_loss,
            'take_profit': take_profit 
        }

    def check_exit(self, current_price: float, current_vwap: float, timestamp: datetime) -> Optional[Dict]:
        if self.current_position is None:
            return None
            
        pos = self.current_position
        pnl_pct = 0.0
        
        if pos.side == 'long':
            pnl_pct = (current_price - pos.entry_price) / pos.entry_price
        else: # short
            pnl_pct = (pos.entry_price - current_price) / pos.entry_price
            
        # Stop Loss
        if pnl_pct < -self.stop_loss_pct:
            return self._close_position_signal(current_price, timestamp, 'stop_loss', pnl_pct)
            
        # Take Profit
        take_profit_hit = False
        if self.take_profit_target == 'vwap':
            # Check if crossed VWAP
            # Long: Price >= VWAP (since we bought below)
            # Short: Price <= VWAP (since we sold above)
            if pos.side == 'long' and current_price >= current_vwap:
                take_profit_hit = True
            elif pos.side == 'short' and current_price <= current_vwap:
                take_profit_hit = True
        elif self.take_profit_target == 'fixed_pct':
            if pnl_pct >= self.take_profit_pct:
                take_profit_hit = True
                
        if take_profit_hit:
            return self._close_position_signal(current_price, timestamp, 'take_profit', pnl_pct)
            
        return None

    def _close_position_signal(self, price: float, timestamp: datetime, reason: str, pnl_pct: float) -> Dict:
        return {
            'symbol': self.symbol,
            'signal': 'close',
            'price': price,
            'timestamp': timestamp,
            'reason': reason,
            'pnl_pct': pnl_pct
        }

    def update_position(self, signal: Dict[str, Any]):
        """Update position state based on executed signal"""
        action = signal.get('action') or signal.get('signal') # Handle variations
        
        if action in ['open_long', 'entry_long']:
            self.current_position = Position(
                symbol=signal['symbol'],
                entry_price=signal['price'],
                amount=signal['amount'],
                entry_time=signal['timestamp'],
                side='long',
                stop_loss=signal['stop_loss'],
                take_profit=signal['take_profit']
            )
        elif action in ['open_short', 'entry_short']:
             self.current_position = Position(
                symbol=signal['symbol'],
                entry_price=signal['price'],
                amount=signal['amount'],
                entry_time=signal['timestamp'],
                side='short', # short
                stop_loss=signal['stop_loss'],
                take_profit=signal['take_profit']
            )
        elif action == 'close':
            self.current_position = None
            if signal.get('pnl_pct', 0) > 0:
                self.wins += 1
            else:
                self.losses += 1
            self.total_trades += 1

    def record_trade(self, signal: Dict[str, Any]):
        """Record trade implementation for backtest engine compatibility"""
        # Logic is already handled in update_position
        pass

    def get_stats(self) -> Dict[str, Any]:
        return {
            'total_trades': self.total_trades,
            'wins': self.wins,
            'losses': self.losses,
            'win_rate': self.wins / self.total_trades if self.total_trades > 0 else 0
        }
