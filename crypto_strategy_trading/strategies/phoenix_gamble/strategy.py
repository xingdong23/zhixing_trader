import pandas as pd
import numpy as np
from strategies.phoenix_gamble.config import PhoenixConfig

class PhoenixStrategy:
    def __init__(self):
        self.config = PhoenixConfig
        self.consecutive_wins = 0
        self.current_capital = self.config.TOTAL_CAPITAL
        self.current_bet = self.config.BASE_BET
        self.position = None # None, 'LONG', 'SHORT'
        self.entry_price = 0.0

    def calculate_indicators(self, df: pd.DataFrame):
        # Bollinger Bands
        df['ma'] = df['close'].rolling(window=self.config.BOLLINGER_WINDOW).mean()
        df['std'] = df['close'].rolling(window=self.config.BOLLINGER_WINDOW).std()
        df['upper_band'] = df['ma'] + (df['std'] * self.config.BOLLINGER_STD)
        df['lower_band'] = df['ma'] - (df['std'] * self.config.BOLLINGER_STD)
        
        # Band Width for Squeeze detection (Optional, but good for breakouts)
        df['bandwidth'] = (df['upper_band'] - df['lower_band']) / df['ma']
        
        return df

    def get_signal(self, row, prev_row):
        """
        Simple Volatility Breakout:
        Close above Upper Band -> LONG
        Close below Lower Band -> SHORT
        """
        if self.position is None:
            if row['close'] > row['upper_band'] and prev_row['close'] <= prev_row['upper_band']:
                return 'LONG'
            elif row['close'] < row['lower_band'] and prev_row['close'] >= prev_row['lower_band']:
                return 'SHORT'
        return None

    def check_exit(self, current_price):
        if self.position == 'LONG':
            # Stop Loss
            if current_price <= self.entry_price * (1 - self.config.STOP_LOSS_PCT):
                return 'SL'
            # Take Profit
            if current_price >= self.entry_price * (1 + self.config.TAKE_PROFIT_PCT):
                return 'TP'
                
        elif self.position == 'SHORT':
            # Stop Loss
            if current_price >= self.entry_price * (1 + self.config.STOP_LOSS_PCT):
                return 'SL'
            # Take Profit
            if current_price <= self.entry_price * (1 - self.config.TAKE_PROFIT_PCT):
                return 'TP'
        
        return None

    def update_position_sizing(self, result):
        """
        Anti-Martingale Logic (Paroli System)
        Win -> Double the bet (Base + Profit)
        Lose -> Reset to Base Bet
        Jackpot -> Reset to Base Bet after N wins
        """
        if result == 'WIN':
            self.consecutive_wins += 1
            print(f"WIN! Streak: {self.consecutive_wins}")
            
            if self.consecutive_wins >= self.config.MAX_CONSECUTIVE_WINS:
                print(f"JACKPOT! Banked profits. Resetting streak.")
                self.consecutive_wins = 0
                self.current_bet = self.config.BASE_BET
            else:
                # Aggressive: Reinvest everything (Principal + Profit)
                # Profit approx = Bet * (TP_PCT * LEVERAGE)
                # If TP_PCT * LEVERAGE = 1.0 (100%), then New Bet = 2 * Old Bet
                profit_multiplier = self.config.TAKE_PROFIT_PCT * self.config.LEVERAGE
                # Ideally we subtract fees here, but for rough calc:
                self.current_bet = self.current_bet * (1 + profit_multiplier)
                
        elif result == 'LOSS':
            print(f"LOSS. Resetting streak.")
            self.consecutive_wins = 0
            self.current_bet = self.config.BASE_BET

        # Cap bet at current capital (cannot bet more than we have)
        if self.current_bet > self.current_capital:
            self.current_bet = self.current_capital

    def run_backtest_step(self, row):
        # 1. Check Exits if in position
        if self.position:
            exit_type = self.check_exit(row['close']) # Simplified: checking close vs SL/TP
            # In real backtest, check High/Low for SL/TP hits within the candle
            
            # Let's refine for High/Low to be more accurate
            if self.position == 'LONG':
                if row['low'] <= self.entry_price * (1 - self.config.STOP_LOSS_PCT):
                    exit_type = 'SL'
                elif row['high'] >= self.entry_price * (1 + self.config.TAKE_PROFIT_PCT):
                    exit_type = 'TP'
            elif self.position == 'SHORT':
                if row['high'] >= self.entry_price * (1 + self.config.STOP_LOSS_PCT):
                    exit_type = 'SL'
                elif row['low'] <= self.entry_price * (1 - self.config.TAKE_PROFIT_PCT):
                    exit_type = 'TP'

            if exit_type:
                pnl = 0
                if exit_type == 'TP':
                    pnl = self.current_bet * (self.config.TAKE_PROFIT_PCT * self.config.LEVERAGE)
                    self.current_capital += pnl
                    self.update_position_sizing('WIN')
                elif exit_type == 'SL':
                    # Loss is limited to the bet amount (Isolated Margin logic)
                    # Or calculated by SL PCT.
                    # If SL PCT * Leverage >= 1, we lose everything.
                    loss_pct = self.config.STOP_LOSS_PCT * self.config.LEVERAGE
                    loss = self.current_bet * loss_pct
                    if loss > self.current_bet: loss = self.current_bet # Max loss is the bet
                    
                    self.current_capital -= loss
                    self.update_position_sizing('LOSS')
                
                self.position = None
                return {'action': 'EXIT', 'type': exit_type, 'pnl': pnl if exit_type == 'TP' else -loss, 'capital': self.current_capital}

        # 2. Check Entries if not in position
        if not self.position and self.current_capital >= self.config.BASE_BET:
            # We need previous row for crossover check. 
            # This method assumes 'row' has 'prev_close' etc or we handle it outside.
            # For simplicity in this snippet, we'll assume the caller handles the loop and passes context or we just check current vs bands if we don't strictly need crossover (or we store prev state).
            # Let's rely on the caller to pass a signal or handle the crossover check.
            pass 
            
        return None
