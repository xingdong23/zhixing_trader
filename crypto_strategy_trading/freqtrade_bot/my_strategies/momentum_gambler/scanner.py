import ccxt
import pandas as pd
import time
import argparse
import sys
import os
from datetime import datetime, timedelta

# Add path to import strategy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from strategy_v11 import MomentumGamblerStrategy
except ImportError:
    print("❌ Could not import strategy_v11. Make sure you are in the correct directory.")
    sys.exit(1)

def get_top_volume_pairs(limit=20):
    """Fetch top USDT pairs by 24h quote volume"""
    print(f"🔍 Scanning Binance for Top {limit} volume pairs...")
    exchange = ccxt.binance()
    tickers = exchange.fetch_tickers()
    
    # Filter for USDT pairs, exclude stablecoins/leverage tokens
    usdt_pairs = {}
    excludes = ['USDC', 'FDUSD', 'TUSD', 'DAI', 'USDP', 'BUSD', 'UP', 'DOWN', 'BEAR', 'BULL']
    
    for symbol, ticker in tickers.items():
        if '/USDT' in symbol:
            base = symbol.split('/')[0]
            if not any(ex in base for ex in excludes):
                usdt_pairs[symbol] = ticker['quoteVolume']
    
    # Sort by volume desc
    sorted_pairs = sorted(usdt_pairs.items(), key=lambda x: x[1], reverse=True)
    return [pair[0] for pair in sorted_pairs[:limit]]

def fetch_ohlcv(exchange, symbol, timeframe='1h', days=90):
    """Fetch recent candles using CCXT pagination"""
    # 90 days of 1h data = 2160 candles. limit is 1000. Need loop.
    # V11 backtest uses 2H/4H resampled from 5m. 
    # For speed scanning, let's just fetch 1H and use that directly or resample.
    # To match V11 logic, we need at least 1H data to be roughly accurate.
    
    since = exchange.parse8601((datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d %H:%M:%S'))
    all_candles = []
    
    print(f"📥 Fetching data for {symbol}...", end="", flush=True)
    
    while True:
        try:
            candles = exchange.fetch_ohlcv(symbol, timeframe, since, limit=1000)
            if not candles:
                break
            
            all_candles.extend(candles)
            since = candles[-1][0] + 1
            
            if len(candles) < 1000:
                break
            time.sleep(0.1) # Rate limit
        except Exception as e:
            print(f" Error: {e}")
            return None

    print(f" Done ({len(all_candles)} candles)")
    
    df = pd.DataFrame(all_candles, columns=['open_time', 'open', 'high', 'low', 'close', 'volume'])
    df['date'] = pd.to_datetime(df['open_time'], unit='ms')
    
    # Standardization for Strategy
    for col in ['open', 'high', 'low', 'close', 'volume']:
        df[col] = df[col].astype(float)
        
    return df

def simulate_v11(df):
    """Run simplified V11 simulation"""
    # Strategy expects resampled 2H data ideally, but works on any DF
    # Let's resample to 2H to match production
    df.set_index('date', inplace=True)
    df_2h = df.resample('2h').agg({
        'open': 'first', 'high': 'max', 'low': 'min', 'close': 'last', 'volume': 'sum', 'open_time': 'first'
    }).dropna().reset_index()
    
    strategy = MomentumGamblerStrategy()
    
    # Calculate Indicators
    # Need minimal columns for calculate_indicators? It usually needs 'close', 'high', 'low'
    try:
        df_2h = strategy.calculate_indicators(df_2h)
    except Exception as e:
        return {'error': str(e)}
    
    # Sim Loop
    capital = 100.0 # Virtual 100 U unit
    entry_price = 0
    position = 0
    trades = 0
    wins = 0
    
    initial_capital = capital
    
    leverage = 10
    stop_loss = 0.08
    
    highest_profit = 0
    
    for i in range(50, len(df_2h)):
        # Check Exit
        current_price = df_2h.iloc[i]['close']
        
        if position == 1:
            pnl_pct = (current_price - entry_price) / entry_price
            if pnl_pct > highest_profit:
                highest_profit = pnl_pct
                
            # SL
            if pnl_pct <= -stop_loss:
                capital = capital * (1 - stop_loss * leverage)
                position = 0
                trades += 1
            # Trailing Stop (Simplified V11 logic: 10% activation, 15% callback from V10? No, V10 logic used in V11)
            # Strategy params: activation 0.10, callback 0.15 (offset)
            elif highest_profit >= 0.10 and pnl_pct < (highest_profit - 0.15):
                # TP
                pnl = pnl_pct * leverage
                capital = capital * (1 + pnl)
                position = 0
                trades += 1
                wins += 1
                
        # Check Entry
        if position == 0:
            try:
                signal = strategy.generate_signal(df_2h, i)
                if signal == 'long':
                    position = 1
                    entry_price = current_price
                    highest_profit = 0
            except:
                pass
                
    # Force close at end
    if position == 1:
        pnl_pct = (df_2h.iloc[-1]['close'] - entry_price) / entry_price
        capital = capital * (1 + pnl_pct * leverage)
        trades += 1
        if pnl_pct > 0: wins += 1
        
    roi = (capital - initial_capital) / initial_capital * 100
    win_rate = (wins / trades * 100) if trades > 0 else 0
    
    return {
        'roi': roi,
        'trades': trades,
        'win_rate': win_rate
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=180, help="Days to scan backward")
    parser.add_argument("--top", type=int, default=10, help="Number of top volume coins to scan")
    args = parser.parse_args()
    
    try:
        top_pairs = get_top_volume_pairs(args.top)
    except Exception as e:
        print(f"Connection failed: {e}")
        return

    report = []
    exchange = ccxt.binance()
    
    print(f"\n🚀 Starting V11 Scout Patrol (Checking last {args.days} days)...")
    print("-" * 60)
    
    for pair in top_pairs:
        df = fetch_ohlcv(exchange, pair, timeframe='1h', days=args.days)
        if df is None or df.empty:
            continue
            
        res = simulate_v11(df)
        if 'error' in res:
            print(f"Skipping {pair}: {res['error']}")
            continue
            
        score = res['roi'] # Simple score: ROI
        
        # Grading
        grade = "C"
        if res['roi'] > 50: grade = "B"
        if res['roi'] > 100: grade = "A"
        if res['roi'] > 300: grade = "S 💎"
        if res['roi'] < -50: grade = "F 💀"
        
        print(f"👉 {pair:<10} | ROI: {res['roi']:>+7.1f}% | Win: {res['win_rate']:>3.0f}% | Grade: {grade}")
        
        report.append({
            'symbol': pair,
            'roi': res['roi'],
            'win_rate': res['win_rate'],
            'grade': grade
        })
        
    print("-" * 60)
    print("🏆 Top 3 Recommended V11 Candidates:")
    report.sort(key=lambda x: x['roi'], reverse=True)
    
    for i, item in enumerate(report[:3]):
        print(f"{i+1}. {item['symbol']} ({item['grade']}) - ROI: {item['roi']:.1f}%")

if __name__ == "__main__":
    main()
