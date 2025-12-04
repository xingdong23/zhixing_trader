import pandas as pd
import numpy as np
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class MultiAssetBacktestEngine:
    """
    Multi-Asset Backtest Engine
    Designed for portfolio strategies that trade multiple assets simultaneously (e.g., Long/Short, Rebalancing).
    """
    def __init__(self, initial_capital: float = 10000.0, taker_fee_rate: float = 0.0005):
        self.initial_capital = initial_capital
        self.current_capital = initial_capital # Total Equity (Cash + Position Value)
        self.cash = initial_capital
        self.positions: Dict[str, float] = {} # Symbol -> Amount (positive for long, negative for short)
        self.taker_fee_rate = taker_fee_rate
        
        self.equity_curve = []
        self.trades = []
        
    def run(self, data: Dict[str, pd.DataFrame], strategy) -> Dict[str, Any]:
        """
        Run the backtest.
        
        Args:
            data: Dict of aligned DataFrames. Key=Symbol, Value=DF with 'close' column and DatetimeIndex.
            strategy: Strategy object with `rebalance(timestamp, prices, portfolio)` method.
        """
        logger.info("Starting Multi-Asset Backtest...")
        
        # 1. Align Data
        # Assume data is already aligned or use the intersection of indices
        symbols = list(data.keys())
        if not symbols:
            logger.error("No data provided.")
            return {}
            
        # Create a combined price DataFrame for easy iteration
        price_df = pd.DataFrame({sym: df['close'] for sym, df in data.items()})
        price_df = price_df.dropna() # Ensure alignment
        
        logger.info(f"Aligned Data: {len(price_df)} rows, Assets: {symbols}")
        
        # 2. Iterate through time
        for timestamp, prices in price_df.iterrows():
            # Update Portfolio Value
            current_portfolio_value = self._calculate_portfolio_value(prices)
            self.current_capital = self.cash + current_portfolio_value
            
            # Record Equity
            self.equity_curve.append({
                'timestamp': timestamp,
                'equity': self.current_capital,
                'cash': self.cash,
                'positions_value': current_portfolio_value
            })
            
            # 3. Strategy Rebalance
            # Strategy returns target weights: {symbol: weight} (e.g., {'BTC': -0.5, 'ETH': 0.5})
            # Weights sum should be <= leverage limit (usually 1.0 or higher if leverage allowed)
            target_weights = strategy.rebalance(timestamp, prices, self.positions, self.current_capital)
            
            if target_weights is not None:
                self._execute_rebalance(target_weights, prices)
                
        logger.info("Backtest Complete.")
        return self._generate_report()

    def _calculate_portfolio_value(self, prices: pd.Series) -> float:
        value = 0.0
        for symbol, amount in self.positions.items():
            if symbol in prices:
                # Long: amount > 0, price > 0 -> value > 0
                # Short: amount < 0. Value of short position is debt.
                # Equity = Cash + AssetValue.
                # For Short: We sold asset, got Cash. Liability is Amount * Price.
                # So Position Value = Amount * Price (which is negative).
                value += amount * prices[symbol]
        return value

    def _execute_rebalance(self, target_weights: Dict[str, float], prices: pd.Series):
        """
        Execute trades to reach target weights.
        """
        # Calculate target amounts
        target_amounts = {}
        for symbol, weight in target_weights.items():
            if symbol not in prices:
                continue
            
            target_value = self.current_capital * weight
            price = prices[symbol]
            target_amounts[symbol] = target_value / price
            
        # Identify trades needed
        # We need to handle sells first to free up cash (if long) or margin?
        # For simplicity, we calculate diffs and apply them.
        # In a real engine, order matters. Here we assume instant execution.
        
        for symbol in set(list(self.positions.keys()) + list(target_amounts.keys())):
            current_amount = self.positions.get(symbol, 0.0)
            target_amount = target_amounts.get(symbol, 0.0)
            
            if current_amount == target_amount:
                continue
                
            diff_amount = target_amount - current_amount
            price = prices[symbol]
            trade_value = abs(diff_amount * price)
            
            # Fee
            fee = trade_value * self.taker_fee_rate
            self.cash -= fee # Deduct fee from cash
            
            # Execute Trade
            # Buy (diff > 0): Cash decreases
            # Sell (diff < 0): Cash increases
            # Short Sell (diff < 0): Cash increases (borrowed money sold)
            # Cover Short (diff > 0): Cash decreases (buying back)
            # Formula: Cash -= Diff * Price
            cost = diff_amount * price
            self.cash -= cost
            
            # Update Position
            self.positions[symbol] = target_amount
            
            # Record Trade
            if abs(diff_amount) > 0:
                self.trades.append({
                    'timestamp': prices.name, # Series name is timestamp
                    'symbol': symbol,
                    'side': 'buy' if diff_amount > 0 else 'sell',
                    'price': price,
                    'amount': abs(diff_amount),
                    'value': trade_value,
                    'fee': fee
                })
                
        # Clean up zero positions
        self.positions = {k: v for k, v in self.positions.items() if abs(v) > 1e-8}

    def _generate_report(self) -> Dict[str, Any]:
        if not self.equity_curve:
            return {}
            
        df_equity = pd.DataFrame(self.equity_curve).set_index('timestamp')
        total_return = (df_equity['equity'].iloc[-1] / self.initial_capital) - 1
        
        # Max Drawdown
        peak = df_equity['equity'].cummax()
        drawdown = (df_equity['equity'] - peak) / peak
        max_drawdown = drawdown.min()
        
        # Sharpe
        returns = df_equity['equity'].pct_change().dropna()
        sharpe = 0
        if returns.std() > 0:
            sharpe = returns.mean() / returns.std() * np.sqrt(365*24) # Assuming hourly
            
        return {
            'initial_capital': self.initial_capital,
            'final_capital': df_equity['equity'].iloc[-1],
            'total_return': total_return,
            'max_drawdown': max_drawdown,
            'sharpe_ratio': sharpe,
            'equity_curve': df_equity,
            'trades': self.trades
        }
