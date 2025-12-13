"""
Target Tickers for IB Option Sniper
Focus: High Liquidity, High Volatility (Beta), Momentum
"""

TICKERS = [
    # --- The Magnificent 7 & Big Tech ---
    'NVDA', 'TSLA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'AMD', 'NFLX',
    
    # --- Crypto Proxies (High Beta) ---
    'MSTR', 'COIN', 'MARA', 'RIOT', 'CLSK', 'HUT', 'BITF', 'IREN', 'HOOD',
    
    # --- Semiconductors & AI ---
    'AVGO', 'QCOM', 'MU', 'INTC', 'ARM', 'TSM', 'SMCI', 'MRVL', 'LRCX', 'AMAT',
    'TXN', 'ADI', 'ON', 'KLAC',
    
    # --- Meme / Retail Favorites ---
    'GME', 'AMC', 'PLTR', 'CVNA', 'UPST', 'AI', 'SOFI', 'DKNG', 'RBLX', 'AFRM',
    'OPEN', 'LCID', 'RIVN', 'CHPT',
    
    # --- High Growth / SaaS / Cloud ---
    'SNOW', 'CRWD', 'PANW', 'ZS', 'NET', 'DDOG', 'MDB', 'TEAM', 'WDAY', 'NOW',
    'ADBE', 'CRM', 'ORCL', 'SAP', 'SHOP', 'SQ', 'PYPL', 'UBER', 'LYFT', 'ABNB',
    'DASH', 'TTD', 'ROKU', 'U', 'OKTA', 'DOCU', 'TWLO',
    
    # --- China ADRs (Volatile) ---
    'BABA', 'PDD', 'JD', 'BIDU', 'NIO', 'XPEV', 'LI', 'BILI', 'FUTU', 'TIGR',
    
    # --- Bioventures (Specific High IV candidates - use with caution) ---
    # 'VRTX', 'REGN', 'MRNA', 'BNTX' (Optional)

    # --- Traditional High Beta / Cyclicals ---
    'BA', 'DIS', 'CAT', 'DE', 'GM', 'F', 'XOM', 'CVX', 'OXY', 'HAL', 'SLB',
    'FCX', 'AA', 'NUE', 'CLF',
    
    # --- Financials (Volatile when moving) ---
    'JPM', 'GS', 'MS', 'BAC', 'C', 'WFC', 'BLK', 'SCHW',
    
    # --- ETFs (High Liquidity) ---
    'SPY', 'QQQ', 'IWM', 'DIA', # Indices
    'TQQQ', 'SQQQ', 'SOXL', 'SOXS', # Leveraged (Good for day trading, maybe less for multi-day swing but worth watching)
    'ARKK', 'XLE', 'XLF', 'XLK', 'XBI', 'SMH', 'GDX', 'SLV', 'GLD', 'TLT'
]

# Total approximate count: ~100
