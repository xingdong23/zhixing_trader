"""
日线趋势跟随策略 V1

策略逻辑:
1. 使用20日/50日EMA判断趋势
2. 金叉做多，死叉平仓
3. ATR动态止损
4. 低频交易，手续费影响小
"""
import pandas as pd
import numpy as np
import os

DATA_DIR = "/Users/chengzheng/workspace/chuangxin/zhixing_trader/crypto_strategy_trading/data"
INITIAL_CAPITAL = 300.0
LEVERAGE = 3  # 日线用3x杠杆，更保守

# 日线策略参数 V2
FAST_EMA = 10     # 快线
SLOW_EMA = 30     # 慢线
ATR_PERIOD = 14
ATR_MULTIPLIER = 1.5  # 更紧的止损
TAKE_PROFIT_RATIO = 2.0  # 盈亏比2:1

# 手续费
FEE_RATE = 0.0004
SLIPPAGE = 0.0002
COST_PER_TRADE = (FEE_RATE + SLIPPAGE) * 2

def load_and_resample_to_daily(symbol):
    """从5分钟数据重采样为日线"""
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
    
    # 重采样为日线
    print("重采样为日线...")
    daily = data.resample('1D').agg({
        'open': 'first',
        'high': 'max',
        'low': 'min',
        'close': 'last',
        'volume': 'sum'
    }).dropna()
    
    daily = daily.reset_index()
    print(f"日线数据: {len(daily)} 条")
    
    return daily

def calculate_indicators(df):
    df = df.copy()
    
    # 双均线
    df['ema_fast'] = df['close'].ewm(span=FAST_EMA, adjust=False).mean()
    df['ema_slow'] = df['close'].ewm(span=SLOW_EMA, adjust=False).mean()
    
    # 趋势信号
    df['trend_up'] = df['ema_fast'] > df['ema_slow']
    df['golden_cross'] = (df['trend_up']) & (~df['trend_up'].shift(1).fillna(False))
    df['death_cross'] = (~df['trend_up']) & (df['trend_up'].shift(1).fillna(True))
    
    # ATR止损
    high_low = df['high'] - df['low']
    high_close = np.abs(df['high'] - df['close'].shift(1))
    low_close = np.abs(df['low'] - df['close'].shift(1))
    tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    df['atr'] = tr.rolling(window=ATR_PERIOD).mean()
    
    df['year'] = df['date'].dt.year
    df['month'] = df['date'].dt.to_period('M')
    
    return df

def run_backtest(df):
    balance = INITIAL_CAPITAL
    position = 0
    entry_price = 0.0
    stop_loss = 0.0
    take_profit = 0.0
    trades = []
    
    peak_balance = balance
    max_drawdown = 0.0
    
    warmup = max(SLOW_EMA, ATR_PERIOD) + 5
    
    for i in range(warmup, len(df)):
        row = df.iloc[i]
        current_price = row['close']
        
        # 持仓检查
        if position == 1:
            # 止损
            if current_price <= stop_loss:
                pnl_pct = (stop_loss - entry_price) / entry_price
                account_pnl = pnl_pct * LEVERAGE - COST_PER_TRADE * LEVERAGE
                balance *= (1 + account_pnl)
                trades.append({'year': row['year'], 'pnl': account_pnl, 'reason': 'sl'})
                position = 0
                continue
            
            # 止盈
            if current_price >= take_profit:
                pnl_pct = (take_profit - entry_price) / entry_price
                account_pnl = pnl_pct * LEVERAGE - COST_PER_TRADE * LEVERAGE
                balance *= (1 + account_pnl)
                trades.append({'year': row['year'], 'pnl': account_pnl, 'reason': 'tp'})
                position = 0
                continue
            
            # 死叉平仓
            if row['death_cross']:
                pnl_pct = (current_price - entry_price) / entry_price
                account_pnl = pnl_pct * LEVERAGE - COST_PER_TRADE * LEVERAGE
                balance *= (1 + account_pnl)
                trades.append({'year': row['year'], 'pnl': account_pnl, 'reason': 'signal'})
                position = 0
                continue
        
        # 更新回撤
        if balance > peak_balance:
            peak_balance = balance
        current_dd = (peak_balance - balance) / peak_balance
        if current_dd > max_drawdown:
            max_drawdown = current_dd
        
        # 开仓信号：金叉
        if position == 0 and row['golden_cross'] and row['trend_up']:
            atr = row['atr']
            if not pd.isna(atr) and atr > 0:
                position = 1
                entry_price = current_price
                stop_loss = entry_price - atr * ATR_MULTIPLIER
                take_profit = entry_price + atr * ATR_MULTIPLIER * TAKE_PROFIT_RATIO
    
    # 平掉剩余仓位
    if position == 1:
        pnl_pct = (df.iloc[-1]['close'] - entry_price) / entry_price
        account_pnl = pnl_pct * LEVERAGE - COST_PER_TRADE * LEVERAGE
        balance *= (1 + account_pnl)
        trades.append({'year': df.iloc[-1]['year'], 'pnl': account_pnl, 'reason': 'close'})
    
    return trades, balance, max_drawdown

def main():
    print("=" * 70)
    print("日线趋势跟随策略 V1 (含手续费)")
    print("=" * 70)
    print(f"策略: {FAST_EMA}/{SLOW_EMA} EMA金叉做多，死叉平仓")
    print(f"止损: ATR×{ATR_MULTIPLIER} | 盈亏比: {TAKE_PROFIT_RATIO}:1 | 杠杆: {LEVERAGE}x")
    print(f"手续费+滑点: {COST_PER_TRADE*100:.2f}%/笔")
    print("=" * 70)
    
    # 测试多个币种
    symbols = ["DOGEUSDT", "SOLUSDT"]
    
    for symbol in symbols:
        print(f"\n{'='*70}")
        print(f"📊 {symbol}")
        print("="*70)
        
        df = load_and_resample_to_daily(symbol)
        if df is None or len(df) < 100:
            print("数据不足")
            continue
        
        df = calculate_indicators(df)
        trades, balance, max_dd = run_backtest(df)
        
        profit_pct = (balance - INITIAL_CAPITAL) / INITIAL_CAPITAL * 100
        sell_trades = [t for t in trades if 'pnl' in t]
        wins = len([t for t in sell_trades if t['pnl'] > 0])
        win_rate = wins / len(sell_trades) * 100 if sell_trades else 0
        
        days = (df['date'].max() - df['date'].min()).days
        print(f"\n日期范围: {df['date'].min().strftime('%Y-%m-%d')} ~ {df['date'].max().strftime('%Y-%m-%d')}")
        print(f"总天数: {days} | 日K线: {len(df)}")
        print(f"\n🎯 总收益: {profit_pct:+.1f}% | 交易: {len(sell_trades)} | 胜率: {win_rate:.1f}% | 回撤: {max_dd*100:.1f}%")
        print(f"最终资金: {balance:.2f} USDT")
        
        # 年度表现
        if sell_trades:
            print("\n年度表现:")
            df_trades = pd.DataFrame(sell_trades)
            yearly = df_trades.groupby('year').agg({
                'pnl': ['count', 'sum', lambda x: (x > 0).sum() / len(x) * 100]
            })
            yearly.columns = ['trades', 'total_pnl', 'win_rate']
            
            for year, stats in yearly.iterrows():
                pnl_pct = stats['total_pnl'] * 100
                emoji = "✅" if pnl_pct > 0 else "❌"
                print(f"  {year}: {stats['trades']:.0f}笔, {pnl_pct:+.1f}%, 胜率{stats['win_rate']:.0f}% {emoji}")
            
            profit_years = sum(1 for _, s in yearly.iterrows() if s['total_pnl'] > 0)
            print(f"  盈利年份: {profit_years}/{len(yearly)}")

if __name__ == "__main__":
    main()
