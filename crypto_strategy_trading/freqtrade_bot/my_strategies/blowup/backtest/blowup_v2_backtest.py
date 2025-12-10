"""
5分钟爆破猎手 V2 - 均线趋势过滤 + 多空双向

核心改进:
1. 添加200EMA作为趋势过滤器
2. 价格 > 200EMA → 只做多 (牛市)
3. 价格 < 200EMA → 只做空 (熊市)
4. 多空都用相同的突破+放量信号
"""
import pandas as pd
import numpy as np
import glob
import os

DATA_DIR = "/Users/chengzheng/workspace/chuangxin/zhixing_trader/crypto_strategy_trading/data"
INITIAL_CAPITAL = 300.0
LEVERAGE = 10
TAKE_PROFIT_PCT = 0.005     # 0.5%
STOP_LOSS_PCT = 0.003       # 0.3%
MAX_HOLD_BARS = 3
MAX_DAILY_TRADES = 6
MAX_CONSECUTIVE_LOSS = 3
BREAKOUT_PERIOD = 20
VOLUME_MA_PERIOD = 50
VOLUME_MULTIPLIER = 1.8
TREND_EMA_PERIOD = 200      # 趋势判断均线
TRADING_HOURS = [0, 1, 2, 3, 14, 15, 16, 17]

COINS = [
    {"symbol": "SOLUSDT", "name": "SOL"},
    {"symbol": "DOGEUSDT", "name": "DOGE"},
    {"symbol": "WIFUSDT", "name": "WIF"},
]

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
    """计算指标 - 包括趋势均线"""
    df = df.copy()
    
    # 趋势判断: 200周期EMA
    df['ema_200'] = df['close'].ewm(span=TREND_EMA_PERIOD, adjust=False).mean()
    df['trend_bull'] = df['close'] > df['ema_200']  # 牛市
    df['trend_bear'] = df['close'] < df['ema_200']  # 熊市
    
    # 做多信号: 突破前20根高点
    df['highest'] = df['high'].shift(1).rolling(window=BREAKOUT_PERIOD).max()
    df['breakout_long'] = df['close'] > df['highest']
    
    # 做空信号: 跌破前20根低点
    df['lowest'] = df['low'].shift(1).rolling(window=BREAKOUT_PERIOD).min()
    df['breakout_short'] = df['close'] < df['lowest']
    
    # 成交量
    df['volume_ma'] = df['volume'].rolling(window=VOLUME_MA_PERIOD).mean()
    df['volume_spike'] = df['volume'] > (df['volume_ma'] * VOLUME_MULTIPLIER)
    
    # 交易时段
    df['hour'] = df['date'].dt.hour
    df['in_session'] = df['hour'].isin(TRADING_HOURS)
    df['trade_date'] = df['date'].dt.date
    df['month'] = df['date'].dt.to_period('M')
    
    return df

def run_backtest(df):
    """运行回测 - 支持多空"""
    balance = INITIAL_CAPITAL
    position = 0  # 0: 空仓, 1: 多, -1: 空
    entry_price = 0.0
    entry_bar = 0
    trades = []
    
    daily_trades = {}
    daily_consecutive_loss = {}
    peak_balance = balance
    max_drawdown = 0.0
    
    warmup = max(TREND_EMA_PERIOD, VOLUME_MA_PERIOD) + 10
    
    for i in range(warmup, len(df)):
        row = df.iloc[i]
        current_price = row['close']
        current_date = row['trade_date']
        
        if current_date not in daily_trades:
            daily_trades[current_date] = 0
            daily_consecutive_loss[current_date] = 0
        
        # 持仓处理
        if position != 0:
            if position == 1:  # 多头
                pnl_pct = (current_price - entry_price) / entry_price
            else:  # 空头
                pnl_pct = (entry_price - current_price) / entry_price
            
            bars_held = i - entry_bar
            
            # 止盈
            if pnl_pct >= TAKE_PROFIT_PCT:
                account_pnl = pnl_pct * LEVERAGE
                balance *= (1 + account_pnl)
                trades.append({
                    'month': row['month'], 'pnl': account_pnl, 'reason': 'tp',
                    'side': 'long' if position == 1 else 'short'
                })
                position = 0
                daily_consecutive_loss[current_date] = 0
                continue
            
            # 止损
            if pnl_pct <= -STOP_LOSS_PCT:
                account_pnl = pnl_pct * LEVERAGE
                balance *= (1 + account_pnl)
                trades.append({
                    'month': row['month'], 'pnl': account_pnl, 'reason': 'sl',
                    'side': 'long' if position == 1 else 'short'
                })
                position = 0
                daily_consecutive_loss[current_date] += 1
                continue
            
            # 超时
            if bars_held >= MAX_HOLD_BARS:
                account_pnl = pnl_pct * LEVERAGE
                balance *= (1 + account_pnl)
                trades.append({
                    'month': row['month'], 'pnl': account_pnl, 'reason': 'timeout',
                    'side': 'long' if position == 1 else 'short'
                })
                position = 0
                if pnl_pct < 0:
                    daily_consecutive_loss[current_date] += 1
                continue
        
        # 更新回撤
        if balance > peak_balance:
            peak_balance = balance
        current_dd = (peak_balance - balance) / peak_balance
        if current_dd > max_drawdown:
            max_drawdown = current_dd
        
        # 开仓检查
        if position == 0:
            if daily_trades[current_date] >= MAX_DAILY_TRADES:
                continue
            if daily_consecutive_loss.get(current_date, 0) >= MAX_CONSECUTIVE_LOSS:
                continue
            
            # 必须在交易时段 + 有放量
            if not row['in_session'] or not row['volume_spike']:
                continue
            
            # 牛市做多
            if row['trend_bull'] and row['breakout_long'] and not pd.isna(row['highest']):
                position = 1
                entry_price = current_price
                entry_bar = i
                daily_trades[current_date] += 1
                continue
            
            # 熊市做空
            if row['trend_bear'] and row['breakout_short'] and not pd.isna(row['lowest']):
                position = -1
                entry_price = current_price
                entry_bar = i
                daily_trades[current_date] += 1
                continue
    
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
    print("5分钟爆破猎手 V2 - 均线趋势过滤 + 多空双向")
    print("=" * 70)
    print(f"趋势判断: {TREND_EMA_PERIOD} EMA")
    print(f"牛市(价格>EMA): 只做多 | 熊市(价格<EMA): 只做空")
    print("=" * 70)
    
    for coin in COINS:
        print(f"\n{'='*70}")
        print(f"📊 {coin['name']}")
        print("="*70)
        
        df = load_data(coin['symbol'])
        if df is None or len(df) < 300:
            print("数据不足")
            continue
        
        df = calculate_indicators(df)
        trades, balance, max_dd = run_backtest(df)
        
        # 总体统计
        profit_pct = (balance - INITIAL_CAPITAL) / INITIAL_CAPITAL * 100
        sell_trades = [t for t in trades if 'pnl' in t]
        wins = len([t for t in sell_trades if t['pnl'] > 0])
        win_rate = wins / len(sell_trades) * 100 if sell_trades else 0
        
        # 多空分别统计
        long_trades = [t for t in sell_trades if t['side'] == 'long']
        short_trades = [t for t in sell_trades if t['side'] == 'short']
        
        days = (df['date'].max() - df['date'].min()).days
        print(f"日期范围: {df['date'].min().strftime('%Y-%m-%d')} ~ {df['date'].max().strftime('%Y-%m-%d')}")
        print(f"总天数: {days} | K线: {len(df)}")
        print(f"\n总收益: {profit_pct:+.1f}% | 交易: {len(sell_trades)} | 胜率: {win_rate:.1f}% | 回撤: {max_dd*100:.1f}%")
        
        # 多空分开
        if long_trades:
            long_pnl = sum(t['pnl'] for t in long_trades) * 100
            long_wins = len([t for t in long_trades if t['pnl'] > 0])
            long_wr = long_wins / len(long_trades) * 100
            print(f"做多: {len(long_trades)}笔, 收益{long_pnl:+.1f}%, 胜率{long_wr:.1f}%")
        
        if short_trades:
            short_pnl = sum(t['pnl'] for t in short_trades) * 100
            short_wins = len([t for t in short_trades if t['pnl'] > 0])
            short_wr = short_wins / len(short_trades) * 100
            print(f"做空: {len(short_trades)}笔, 收益{short_pnl:+.1f}%, 胜率{short_wr:.1f}%")
        
        # 月度表现
        monthly = analyze_by_month(trades)
        if monthly:
            print(f"\n月度表现:")
            print(f"{'月份':<12} {'交易':>6} {'收益%':>10} {'胜率%':>8}")
            print("-" * 40)
            
            profit_months = 0
            for month, stats in sorted(monthly.items()):
                pnl_pct = stats['total_pnl'] * 100
                if pnl_pct > 0:
                    profit_months += 1
                print(f"{str(month):<12} {stats['trades']:>6} {pnl_pct:>+9.1f}% {stats['win_rate']:>7.1f}%")
            
            print(f"\n盈利月份: {profit_months}/{len(monthly)} ({profit_months/len(monthly)*100:.0f}%)")
    
    print("\n" + "=" * 70)
    print("🎯 V2策略改进总结")
    print("=" * 70)

if __name__ == "__main__":
    main()
