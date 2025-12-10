"""
SOL策略深度回测 - 按月份拆分分析

使用现有60天数据，按不同时间段分析策略稳定性
同时对比DOGE(338天)和WIF(94天)的分段表现
"""
import pandas as pd
import numpy as np
import glob
import os

DATA_DIR = "/Users/chengzheng/workspace/chuangxin/zhixing_trader/crypto_strategy_trading/data"
INITIAL_CAPITAL = 300.0
LEVERAGE = 10
TAKE_PROFIT_PCT = 0.005
STOP_LOSS_PCT = 0.003
MAX_HOLD_BARS = 3
BREAKOUT_PERIOD = 20
VOLUME_MA_PERIOD = 50
VOLUME_MULTIPLIER = 1.8
TRADING_HOURS = [0, 1, 2, 3, 14, 15, 16, 17]
MAX_DAILY_TRADES = 6
MAX_CONSECUTIVE_LOSS = 3

def load_data(symbol):
    """加载数据"""
    merged = os.path.join(DATA_DIR, f"{symbol}-5m-merged.csv")
    if os.path.exists(merged):
        data = pd.read_csv(merged, low_memory=False)
    else:
        files = sorted(glob.glob(os.path.join(DATA_DIR, f"{symbol}-5m-*.csv")))
        if not files:
            return None
        dfs = []
        for f in files:
            if 'all' in f.lower() or 'months' in f.lower():
                continue
            df = pd.read_csv(f)
            df = df[df['open_time'] != 'open_time']
            dfs.append(df)
        if not dfs:
            return None
        data = pd.concat(dfs, ignore_index=True)
    
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
    
    return data

def calculate_indicators(df):
    """计算指标"""
    df = df.copy()
    df['highest'] = df['high'].shift(1).rolling(window=BREAKOUT_PERIOD).max()
    df['volume_ma'] = df['volume'].rolling(window=VOLUME_MA_PERIOD).mean()
    df['volume_spike'] = df['volume'] > (df['volume_ma'] * VOLUME_MULTIPLIER)
    df['breakout'] = df['close'] > df['highest']
    df['hour'] = df['date'].dt.hour
    df['in_session'] = df['hour'].isin(TRADING_HOURS)
    df['trade_date'] = df['date'].dt.date
    df['month'] = df['date'].dt.to_period('M')
    return df

def run_backtest(df):
    """运行回测"""
    balance = INITIAL_CAPITAL
    position = 0
    entry_price = 0.0
    entry_bar = 0
    trades = []
    
    daily_trades = {}
    daily_consecutive_loss = {}
    peak_balance = balance
    max_drawdown = 0.0
    
    for i in range(60, len(df)):
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
                account_pnl = pnl_pct * LEVERAGE
                balance *= (1 + account_pnl)
                trades.append({'month': row['month'], 'pnl': account_pnl, 'reason': 'tp'})
                position = 0
                daily_consecutive_loss[current_date] = 0
                continue
            
            if pnl_pct <= -STOP_LOSS_PCT:
                account_pnl = pnl_pct * LEVERAGE
                balance *= (1 + account_pnl)
                trades.append({'month': row['month'], 'pnl': account_pnl, 'reason': 'sl'})
                position = 0
                daily_consecutive_loss[current_date] += 1
                continue
            
            if bars_held >= MAX_HOLD_BARS:
                account_pnl = pnl_pct * LEVERAGE
                balance *= (1 + account_pnl)
                trades.append({'month': row['month'], 'pnl': account_pnl, 'reason': 'timeout'})
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
            
            if (row['in_session'] and row['breakout'] and row['volume_spike'] and not pd.isna(row['highest'])):
                position = 1
                entry_price = current_price
                entry_bar = i
                daily_trades[current_date] += 1
    
    return trades, balance, max_drawdown

def analyze_by_month(trades):
    """按月份分析"""
    if not trades:
        return {}
    
    df = pd.DataFrame(trades)
    monthly = df.groupby('month').agg({
        'pnl': ['count', 'sum', lambda x: (x > 0).sum() / len(x) * 100]
    })
    monthly.columns = ['trades', 'total_pnl', 'win_rate']
    return monthly.to_dict('index')

def main():
    print("=" * 70)
    print("SOL/DOGE/WIF 深度回测分析 - 按月份拆分")
    print("=" * 70)
    
    for symbol, name in [("SOLUSDT", "SOL"), ("DOGEUSDT", "DOGE"), ("WIFUSDT", "WIF")]:
        print(f"\n{'='*70}")
        print(f"📊 {name}")
        print("="*70)
        
        df = load_data(symbol)
        if df is None or len(df) < 100:
            print("数据不足")
            continue
        
        df = calculate_indicators(df)
        trades, balance, max_dd = run_backtest(df)
        
        # 总体统计
        profit_pct = (balance - INITIAL_CAPITAL) / INITIAL_CAPITAL * 100
        sell_trades = [t for t in trades if 'pnl' in t]
        wins = len([t for t in sell_trades if t['pnl'] > 0])
        win_rate = wins / len(sell_trades) * 100 if sell_trades else 0
        
        days = (df['date'].max() - df['date'].min()).days
        print(f"日期范围: {df['date'].min().strftime('%Y-%m-%d')} ~ {df['date'].max().strftime('%Y-%m-%d')}")
        print(f"总天数: {days} | K线: {len(df)}")
        print(f"总收益: {profit_pct:+.1f}% | 交易: {len(sell_trades)} | 胜率: {win_rate:.1f}% | 回撤: {max_dd*100:.1f}%")
        
        # 按月份分析
        monthly = analyze_by_month(trades)
        if monthly:
            print(f"\n月度表现:")
            print(f"{'月份':<12} {'交易':>6} {'收益%':>10} {'胜率%':>8}")
            print("-" * 40)
            
            for month, stats in sorted(monthly.items()):
                pnl_pct = stats['total_pnl'] * 100
                print(f"{str(month):<12} {stats['trades']:>6} {pnl_pct:>+9.1f}% {stats['win_rate']:>7.1f}%")
            
            # 统计盈利/亏损月份
            profit_months = sum(1 for s in monthly.values() if s['total_pnl'] > 0)
            loss_months = len(monthly) - profit_months
            print(f"\n盈利月份: {profit_months}/{len(monthly)} ({profit_months/len(monthly)*100:.0f}%)")
    
    print("\n" + "=" * 70)
    print("🎯 结论")
    print("=" * 70)

if __name__ == "__main__":
    main()
