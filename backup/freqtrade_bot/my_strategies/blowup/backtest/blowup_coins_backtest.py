"""
5分钟爆破猎手策略 - 多币种回测

币种: BTC, ETH, SOL, DOGE, WIF, 1000PEPE
"""
import pandas as pd
import numpy as np
import glob
import os

DATA_DIR = "/crypto_trading/data"
INITIAL_CAPITAL = 300.0
LEVERAGE = 10
TAKE_PROFIT_PCT = 0.005
STOP_LOSS_PCT = 0.003
MAX_HOLD_BARS = 3
MAX_DAILY_TRADES = 6
MAX_CONSECUTIVE_LOSS = 3
BREAKOUT_PERIOD = 20
VOLUME_MA_PERIOD = 50
VOLUME_MULTIPLIER = 1.8
TRADING_HOURS = [0, 1, 2, 3, 14, 15, 16, 17]

COINS = [
    {"symbol": "BTCUSDT", "name": "BTC"},
    {"symbol": "ETHUSDT", "name": "ETH"},
    {"symbol": "SOLUSDT", "name": "SOL"},
    {"symbol": "DOGEUSDT", "name": "DOGE"},
    {"symbol": "WIFUSDT", "name": "WIF"},
    {"symbol": "1000PEPEUSDT", "name": "PEPE"},
]

def load_5m_data(symbol: str):
    """加载指定币种的5分钟数据"""
    # 优先使用merged文件
    merged = os.path.join(DATA_DIR, f"{symbol}-5m-merged.csv")
    if os.path.exists(merged):
        data = pd.read_csv(merged)
    else:
        files = sorted(glob.glob(os.path.join(DATA_DIR, f"{symbol}-5m-*.csv")))
        if not files:
            return None
        dfs = []
        for f in files:
            # 跳过特殊文件
            if 'all' in f.lower() or 'months' in f.lower():
                continue
            df = pd.read_csv(f)
            df = df[df['open_time'] != 'open_time']  # 过滤header
            dfs.append(df)
        if not dfs:
            return None
        data = pd.concat(dfs, ignore_index=True)
    
    # 过滤header行
    data = data[data['open_time'] != 'open_time']
    data['open_time'] = pd.to_numeric(data['open_time'], errors='coerce')
    data = data.dropna(subset=['open_time'])
    
    # 处理列名差异
    if 'vol' in data.columns and 'volume' not in data.columns:
        data = data.rename(columns={'vol': 'volume'})
    
    # 数值转换
    for col in ['open', 'high', 'low', 'close', 'volume']:
        if col in data.columns:
            data[col] = pd.to_numeric(data[col], errors='coerce')
    
    data['date'] = pd.to_datetime(data['open_time'], unit='ms')
    data = data.sort_values('date').drop_duplicates('open_time').reset_index(drop=True)
    data = data.dropna(subset=['close'])
    
    return data

def calculate_indicators(df):
    """计算指标"""
    df['highest'] = df['high'].shift(1).rolling(window=BREAKOUT_PERIOD).max()
    df['volume_ma'] = df['volume'].rolling(window=VOLUME_MA_PERIOD).mean()
    df['volume_spike'] = df['volume'] > (df['volume_ma'] * VOLUME_MULTIPLIER)
    df['breakout'] = df['close'] > df['highest']
    df['hour'] = df['date'].dt.hour
    df['in_session'] = df['hour'].isin(TRADING_HOURS)
    df['trade_date'] = df['date'].dt.date
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
                trades.append({'reason': 'tp', 'pnl': account_pnl})
                position = 0
                daily_consecutive_loss[current_date] = 0
                continue
            
            if pnl_pct <= -STOP_LOSS_PCT:
                account_pnl = pnl_pct * LEVERAGE
                balance *= (1 + account_pnl)
                trades.append({'reason': 'sl', 'pnl': account_pnl})
                position = 0
                daily_consecutive_loss[current_date] += 1
                continue
            
            if bars_held >= MAX_HOLD_BARS:
                account_pnl = pnl_pct * LEVERAGE
                balance *= (1 + account_pnl)
                trades.append({'reason': 'timeout', 'pnl': account_pnl})
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

def main():
    print("=" * 70)
    print("5分钟爆破猎手策略 - 多币种回测")
    print("=" * 70)
    
    results = []
    
    for coin in COINS:
        print(f"\n📊 {coin['name']}...", end=" ")
        df = load_5m_data(coin['symbol'])
        
        if df is None or len(df) < 100:
            print("数据不足")
            continue
        
        df = calculate_indicators(df)
        trades, balance, max_dd = run_backtest(df)
        
        profit_pct = (balance - INITIAL_CAPITAL) / INITIAL_CAPITAL * 100
        sell_trades = [t for t in trades if 'pnl' in t]
        wins = len([t for t in sell_trades if t['pnl'] > 0])
        win_rate = wins / len(sell_trades) * 100 if sell_trades else 0
        
        # 计算数据天数
        days = (df['date'].max() - df['date'].min()).days
        
        results.append({
            'name': coin['name'],
            'days': days,
            'candles': len(df),
            'return': profit_pct,
            'trades': len(sell_trades),
            'win_rate': win_rate,
            'max_dd': max_dd * 100,
            'final': balance
        })
        
        print(f"{days}天 | {profit_pct:+.1f}% | {len(sell_trades)}笔 | 胜率{win_rate:.0f}%")
    
    # 汇总
    print("\n" + "=" * 70)
    print("📈 多币种回测汇总")
    print("=" * 70)
    print(f"{'币种':<8} {'天数':>6} {'K线':>8} {'收益%':>10} {'交易':>6} {'胜率%':>8} {'回撤%':>8} {'最终':>10}")
    print("-" * 70)
    
    for r in results:
        print(f"{r['name']:<8} {r['days']:>6} {r['candles']:>8} {r['return']:>+9.1f}% {r['trades']:>6} {r['win_rate']:>7.1f}% {r['max_dd']:>7.1f}% {r['final']:>10.2f}")
    
    print("-" * 70)
    
    # 最佳币种
    if results:
        best = max(results, key=lambda x: x['return'])
        worst = min(results, key=lambda x: x['return'])
        avg_return = np.mean([r['return'] for r in results])
        
        print(f"\n🥇 最佳: {best['name']} → {best['return']:+.1f}%")
        print(f"🥉 最差: {worst['name']} → {worst['return']:+.1f}%")
        print(f"📊 平均: {avg_return:+.1f}%")
        
        positive = len([r for r in results if r['return'] > 0])
        print(f"\n✅ 盈利币种: {positive}/{len(results)}")
        
        if avg_return > 10:
            print("\n🔥 多币种平均表现良好！")
        elif avg_return > 0:
            print("\n⚠️ 有正收益但不稳定")
        else:
            print("\n❌ 整体亏损")

if __name__ == "__main__":
    main()
