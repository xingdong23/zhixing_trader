import pandas as pd
import numpy as np
import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

class RelativeStrengthStrategy:
    """
    Relative Strength Arbitrage Strategy
    Long the strongest asset, Short the benchmark (BTC).
    """
    def __init__(self, assets: List[str], benchmark: str = 'BTCUSDT', 
                 lookback: int = 168, rebalance_freq: int = 24, top_n: int = 1):
        self.assets = assets
        self.benchmark = benchmark
        self.lookback = lookback
        self.rebalance_freq = rebalance_freq
        self.top_n = top_n
        
        self.last_rebalance_time = None
        # Keep history of prices for lookback calculation
        self.price_history = [] 
        self.history_timestamps = []

    def rebalance(self, timestamp, prices: pd.Series, current_positions: Dict[str, float], total_equity: float) -> Optional[Dict[str, float]]:
        """
        Determine target weights for rebalancing.
        Returns None if no rebalancing needed.
        """
        # 1. Update History
        self.price_history.append(prices)
        self.history_timestamps.append(timestamp)
        
        # Maintain history size (slightly more than lookback)
        if len(self.price_history) > self.lookback + 10:
            self.price_history.pop(0)
            self.history_timestamps.pop(0)
            
        # 2. Check Rebalance Frequency
        if self.last_rebalance_time is None:
            # First run, rebalance immediately if we have enough data
            if len(self.price_history) <= self.lookback:
                return None
        else:
            # Check if enough time passed
            hours_passed = (timestamp - self.last_rebalance_time).total_seconds() / 3600
            if hours_passed < self.rebalance_freq:
                return None
                
        # 3. Calculate Scores
        if len(self.price_history) <= self.lookback:
            return None
            
        current_prices = self.price_history[-1]
        past_prices = self.price_history[-1-self.lookback]
        
        # RS Score = (Current - Past) / Past
        rs_scores = (current_prices - past_prices) / past_prices
        
        # 4. Rank Assets
        # Filter out benchmark from potential long candidates? 
        # Strategy: Long Top N Alts, Short BTC.
        # Or: Long Top N (including BTC), Short BTC.
        # Let's stick to: Rank ALL assets.
        
        sorted_scores = rs_scores.sort_values(ascending=False)
        
        # Select Top N
        top_assets = sorted_scores.index[:self.top_n].tolist()
        
        # 5. Generate Target Weights
        target_weights = {}
        
        # Long Leg
        long_weight = 1.0 / self.top_n
        for asset in top_assets:
            target_weights[asset] = long_weight
            
        # Short Leg (Benchmark)
        # If Benchmark is in Top N, we are effectively Neutral on it (Long 1.0 + Short 1.0 = 0)?
        # Or do we want Market Neutrality?
        # Standard RSA: Long Strong, Short Weak (or Benchmark).
        # If we Short Benchmark with -1.0 weight.
        
        if self.benchmark in target_weights:
            target_weights[self.benchmark] -= 1.0
        else:
            target_weights[self.benchmark] = -1.0
            
        # Example: Top=SOL. Weights: SOL=1.0, BTC=-1.0.
        # Example: Top=BTC. Weights: BTC=1.0 - 1.0 = 0.0. (Cash position)
        
        self.last_rebalance_time = timestamp
        
        # Log the rebalance
        logger.info(f"[{timestamp}] Rebalance: Top={top_assets}, Weights={target_weights}")
        
        return target_weights
