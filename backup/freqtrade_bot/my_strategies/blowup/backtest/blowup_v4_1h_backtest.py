"""
5分钟爆破猎手 V4 - 1小时版本 (含手续费)

1小时版本优势:
- 交易次数减少12倍
- 手续费影响降低
- 止盈止损比例相应放大
"""
import pandas as pd
import numpy as np
import os

DATA_DIR = "/crypto_trading/data"
INITIAL_CAPITAL = 300.0
LEVERAGE = 10

# 1小时版本参数调整 V2
TAKE_PROFIT_PCT = 0.03    # 3% 止盈
STOP_LOSS_PCT = 0.015     # 1.5% 止损
MAX_HOLD_BARS = 12        # 12根1小时K线 = 12小时
MAX_DAILY_TRADES = 2      # 每天最多2次
MAX_CONSECUTIVE_LOSS = 2
BREAKOUT_PERIOD = 24      # 24小时回看
VOLUME_MA_PERIOD = 48     # 48小时成交量均线
VOLUME_MULTIPLIER = 2.0   # 放量倍数更严格
TREND_EMA_PERIOD = 100    # 100小时EMA (约4天)
TRADING_HOURS = [0, 1, 2, 3, 8, 9, 14, 15, 16, 17]  # 扩大交易时段

# 手续费和滑点
FEE_RATE = 0.0004
SLIPPAGE = 0.0002
COST_PER_TRADE = (FEE_RATE + SLIPPAGE) * 2

def load_and_resample_data(symbol):
    """加载5分钟数据并重采样为1小时"""
    print(f"加载 {symbol} 5分钟数据...")
    merged = os.path.join(DATA_DIR, f"{symbol}-5m-merged.csv")
    if not os.path.exists(merged):
        return None
    
    data = pd.read_csv(merged, low_memory=False)
    data = data[data['open_time'] != 'open_time']
    data['open_time'] = pd.to_numeric(data['open_time'], errors='coerce')
    data = data.dropna(subset=['open_time'])
    
    if 'vol' in data.columns and 'volume' not in data.columns:
        data = data.rename(columns={'vol': 'volume'})
    
    for col in ['open', 'high', 'low', 'close', 'volume']:
        if col in data.columns:
            data[col] = pd.to_numeric(data[col], errors='coerce')
    
    data['date'] = pd.to_datetime(data['open_time'], unit='ms')
    data = data.sort_values('date').drop_duplicates('open_time').reset_index(drop=True)
    data = data.dropna(subset=['close'])
    data.set_index('date', inplace=True)
    
    print(f"5分钟数据: {len(data)} 条")
    
    # 重采样为1小时
    print("重采样为1小时...")
    hourly = data.resample('1h').agg({
        'open': 'first',
        'high': 'max',
        'low': 'min',
        'close': 'last',
        'volume': 'sum'
    }).dropna()
    
    hourly = hourly.reset_index()
    print(f"1小时数据: {len(hourly)} 条")
    
    return hourly

def calculate_indicators(df):
    df = df.copy()
    df['ema'] = df['close'].ewm(span=TREND_EMA_PERIOD, adjust=False).mean()
    
    # 趋势过滤：价格高于EMA 5%
    df['ema_distance'] = (df['close'] - df['ema']) / df['ema']
    df['trend_bull'] = df['ema_distance'] > 0.05
    
    df['highest'] = df['high'].shift(1).rolling(window=BREAKOUT_PERIOD).max()
    df['breakout'] = df['close'] > df['highest']
    df['volume_ma'] = df['volume'].rolling(window=VOLUME_MA_PERIOD).mean()
    df['volume_spike'] = df['volume'] > (df['volume_ma'] * VOLUME_MULTIPLIER)
    df['hour'] = df['date'].dt.hour
    df['in_session'] = df['hour'].isin(TRADING_HOURS)
    df['trade_date'] = df['date'].dt.date
    df['month'] = df['date'].dt.to_period('M')
    df['year'] = df['date'].dt.year
    return df

def run_backtest(df):
    balance = INITIAL_CAPITAL
    position = 0
    entry_price = 0.0
    entry_bar = 0
    trades = []
    
    daily_trades = {}
    daily_consecutive_loss = {}
    peak_balance = balance
    max_drawdown = 0.0
    
    warmup = max(TREND_EMA_PERIOD, VOLUME_MA_PERIOD) + 5
    
    for i in range(warmup, len(df)):
        row = df.iloc[i]
        current_price = row['close']
        current_date = row['trade_date']
        
        if current_date not in daily_trades:
            daily_trades[current_date] = 0
            daily_consecutive_loss[current_date] = 0
        
        if position == 1:
            pnl_pct = (current_price - entry_price) / entry_price
            bars_held = i - entry_bar
            
            if pnl_pct >= TAKE_PROFIT_PCT:
                account_pnl = pnl_pct * LEVERAGE - COST_PER_TRADE * LEVERAGE
                balance *= (1 + account_pnl)
                trades.append({'month': row['month'], 'year': row['year'], 'pnl': account_pnl, 'reason': 'tp'})
                position = 0
                daily_consecutive_loss[current_date] = 0
                continue
            
            if pnl_pct <= -STOP_LOSS_PCT:
                account_pnl = pnl_pct * LEVERAGE - COST_PER_TRADE * LEVERAGE
                balance *= (1 + account_pnl)
                trades.append({'month': row['month'], 'year': row['year'], 'pnl': account_pnl, 'reason': 'sl'})
                position = 0
                daily_consecutive_loss[current_date] += 1
                continue
            
            if bars_held >= MAX_HOLD_BARS:
                account_pnl = pnl_pct * LEVERAGE - COST_PER_TRADE * LEVERAGE
                balance *= (1 + account_pnl)
                trades.append({'month': row['month'], 'year': row['year'], 'pnl': account_pnl, 'reason': 'timeout'})
                position = 0
                if pnl_pct < 0:
                    daily_consecutive_loss[current_date] += 1
                continue
        
        if balance > peak_balance:
            peak_balance = balance
        current_dd = (peak_balance - balance) / peak_balance
        if current_dd > max_drawdown:
            max_drawdown = current_dd
        
        if position == 0:
            if daily_trades[current_date] >= MAX_DAILY_TRADES:
                continue
            if daily_consecutive_loss.get(current_date, 0) >= MAX_CONSECUTIVE_LOSS:
                continue
            
            if (row['in_session'] and row['trend_bull'] and 
                row['breakout'] and row['volume_spike'] and 
                not pd.isna(row['highest'])):
                position = 1
                entry_price = current_price
                entry_bar = i
                daily_trades[current_date] += 1
    
    return trades, balance, max_drawdown

def main():
    print("=" * 70)
    print("5分钟爆破猎手 V4 - 1小时版本 (含手续费)")
    print("=" * 70)
    print(f"止盈: {TAKE_PROFIT_PCT*100}% | 止损: {STOP_LOSS_PCT*100}% | 趋势EMA: {TREND_EMA_PERIOD}")
    print(f"手续费+滑点: {COST_PER_TRADE*100:.2f}%/笔")
    print("=" * 70)
    
    df = load_and_resample_data("DOGEUSDT")
    if df is None:
        print("数据不足")
        return
    
    df = calculate_indicators(df)
    trades, balance, max_dd = run_backtest(df)
    
    profit_pct = (balance - INITIAL_CAPITAL) / INITIAL_CAPITAL * 100
    sell_trades = [t for t in trades if 'pnl' in t]
    wins = len([t for t in sell_trades if t['pnl'] > 0])
    win_rate = wins / len(sell_trades) * 100 if sell_trades else 0
    
    days = (df['date'].max() - df['date'].min()).days
    print(f"\n日期范围: {df['date'].min().strftime('%Y-%m-%d')} ~ {df['date'].max().strftime('%Y-%m-%d')}")
    print(f"总天数: {days} | 1小时K线: {len(df)}")
    print(f"\n🎯 总收益: {profit_pct:+.1f}% | 交易: {len(sell_trades)} | 胜率: {win_rate:.1f}% | 回撤: {max_dd*100:.1f}%")
    print(f"最终资金: {balance:.2f} USDT")
    
    # 按年份分析
    print("\n" + "=" * 70)
    print("年度表现")
    print("=" * 70)
    
    if sell_trades:
        df_trades = pd.DataFrame(sell_trades)
        yearly = df_trades.groupby('year').agg({
            'pnl': ['count', 'sum', lambda x: (x > 0).sum() / len(x) * 100]
        })
        yearly.columns = ['trades', 'total_pnl', 'win_rate']
        
        for year, stats in yearly.iterrows():
            pnl_pct = stats['total_pnl'] * 100
            emoji = "✅" if pnl_pct > 0 else "❌"
            print(f"{year}: {stats['trades']:.0f}笔, {pnl_pct:+.1f}%, 胜率{stats['win_rate']:.0f}% {emoji}")
        
        profit_years = sum(1 for _, s in yearly.iterrows() if s['total_pnl'] > 0)
        print(f"\n盈利年份: {profit_years}/{len(yearly)}")

if __name__ == "__main__":
    main()
