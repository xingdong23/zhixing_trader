class PhoenixConfig:
    # Gambling Core Parameters
    LEVERAGE = 20            # High leverage
    TOTAL_CAPITAL = 300      # Small capital
    BASE_BET = 50            # "High Roller": Bet 50U per hand (1/6th of capital)
    
    # Anti-Martingale Logic (The "Paroli" System)
    # Goal: Double the chip in 3 wins (1.26^3 ~= 2.0)
    MAX_CONSECUTIVE_WINS = 3 # Target streak
    
    # Risk Management (Optimized for 5m Trends)
    TAKE_PROFIT_PCT = 0.03   # 3% move * 20x = 60% gain
    STOP_LOSS_PCT = 0.015    # 1.5% move * 20x = 30% loss (Tighten SL to preserve chips)
    
    # Indicator Settings (Volatility Breakout)
    BOLLINGER_WINDOW = 20
    BOLLINGER_STD = 2.0
    
    # Assets
    SYMBOL = "SOL/USDT"
    TIMEFRAME = "5m"
