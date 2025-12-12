import unittest
import pandas as pd
import numpy as np
from ib_bot import OptionSniperBot

class TestOptionSniperBot(unittest.TestCase):
    def setUp(self):
        self.bot = OptionSniperBot()

    def create_mock_data(self, length=100, trend='up', squeeze=False):
        # Create basic date range
        dates = pd.date_range(start='2024-01-01', periods=length)
        
        # Base price series
        # Trend
        if trend == 'up':
            prices = np.linspace(100, 200, length)
        else:
            prices = np.linspace(100, 100, length)
            
        # Add random noise
        # If squeeze=True, reduce volatility for last 20 periods
        noise = np.random.normal(0, 2, length) 
        if squeeze:
            noise[-20:] = np.random.normal(0, 0.5, length-20 if length<20 else 20)
            
        close = prices + noise
        high = close + 1
        low = close - 1
        # Add a big breakout at the end properly
        if trend == 'up':
            close[-1] = close[-1] + 5 # Breakout
            high[-1] = close[-1] + 1
            low[-1] = close[-1] - 1
        
        df = pd.DataFrame({
            'date': dates,
            'open': close, # Simplified
            'high': high,
            'low': low,
            'close': close,
            'volume': 1000
        })
        return df

    def test_calculate_indicators(self):
        df = self.create_mock_data()
        df = self.bot.calculate_indicators(df)
        
        self.assertIn('bb_upper', df.columns)
        self.assertIn('kc_upper', df.columns)
        self.assertIn('adx', df.columns)
        self.assertIn('squeeze_on', df.columns)
        
    def test_signal_generation(self):
        # Create data that should trigger a signal
        # We need a squeeze (low vol) then a breakout
        # But constructing perfect Squeeze+Breakout math in mock is hard.
        # Let's just create a DF and manually set the values to force a trigger
        # to test the logic function itself (whitebox testing).
        
        df = pd.DataFrame(index=range(60))
        df['close'] = 100
        df['bb_upper'] = 100
        df['kc_upper'] = 101 # bb < kc (Squeeze)
        df['bb_lower'] = 90
        df['kc_lower'] = 89  # bb > kc (Squeeze)
        df['ema'] = 90
        df['adx'] = 20
        
        # 1. Fill squeeze_on
        df['squeeze_on'] = True
        
        # 2. Modify last candle for Breakout
        df.loc[59, 'close'] = 110
        df.loc[59, 'bb_upper'] = 105 # Breakout
        df.loc[59, 'ema'] = 100      # Trend Up
        df.loc[59, 'squeeze_on'] = False # Squeeze fired
        
        # Test
        signal = self.bot.check_signal(df)
        self.assertEqual(signal, 'LONG')
        
    def test_no_signal(self):
        df = pd.DataFrame(index=range(60))
        df['close'] = 100
        df['bb_upper'] = 110 # No Breakout
        df['ema'] = 90
        df['adx'] = 10 # Low ADX
        df['squeeze_on'] = False
        
        signal = self.bot.check_signal(df)
        self.assertIsNone(signal)

if __name__ == '__main__':
    unittest.main()
