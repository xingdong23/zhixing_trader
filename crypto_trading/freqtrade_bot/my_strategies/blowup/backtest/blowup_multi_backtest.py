"""
5分钟爆破猎手策略 - 多时段回测

测试场景:
1. 2022年11月-12月: FTX崩盘熊市
2. 2023年1月-3月: 熊市反弹
3. 2023年10月-12月: 牛市启动
4. 2024年2月-4月: BTC突破新高牛市
5. 2024年6月-8月: 震荡盘整
6. 2024年9月-10月: 震荡后突破 (原始测试)
"""
import pandas as pd
import numpy as np
import glob
import os
from datetime import datetime

# 配置
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

# 测试场景定义 (使用1小时数据,放大参数适配)
# 1小时版本需要调整: 持仓时间和突破周期对应调整
SCENARIOS = [
    {"name": "FTX崩盘熊市", "start": "2022-11", "end": "2022-12", "market": "熊市"},
    {"name": "熊市反弹", "start": "2023-01", "end": "2023-03", "market": "震荡"},
    {"name": "牛市启动", "start": "2023-10", "end": "2023-12", "market": "牛市"},
    {"name": "BTC创新高", "start": "2024-02", "end": "2024-04", "market": "牛市"},
    {"name": "震荡盘整", "start": "2024-06", "end": "2024-08", "market": "震荡"},
    {"name": "震荡突破", "start": "2024-09", "end": "2024-10", "market": "震荡"},
]

def load_5m_data():
    """加载5分钟数据"""
    files = sorted(glob.glob(os.path.join(DATA_DIR, "BTCUSDT-5m-*.csv")))
    if not files:
        return None
    dfs = []
    for f in files:
        df = pd.read_csv(f)
        # 过滤掉重复的header行
        df = df[df['open_time'] != 'open_time']
        dfs.append(df)
    data = pd.concat(dfs, ignore_index=True)
    data['open_time'] = pd.to_numeric(data['open_time'], errors='coerce')
    data = data.dropna(subset=['open_time'])
    
    # 转换价格和成交量列为数值类型
    for col in ['open', 'high', 'low', 'close', 'volume']:
        if col in data.columns:
            data[col] = pd.to_numeric(data[col], errors='coerce')
    
    data['date'] = pd.to_datetime(data['open_time'], unit='ms')
    data = data.sort_values('date').drop_duplicates('open_time').reset_index(drop=True)
    data = data.dropna(subset=['close'])  # 清理无效行
    return data

def load_1h_merged_data():
    """加载合并的1小时数据"""
    merged_file = os.path.join(DATA_DIR, "BTCUSDT-1h-merged.csv")
    if not os.path.exists(merged_file):
        return None
    
    data = pd.read_csv(merged_file)
    # 过滤重复header行
    data = data[data['open_time'] != 'open_time']
    data['open_time'] = pd.to_numeric(data['open_time'], errors='coerce')
    data = data.dropna(subset=['open_time'])
    
    # 处理可能的列名差异 (vol vs volume)
    if 'vol' in data.columns and 'volume' not in data.columns:
        data = data.rename(columns={'vol': 'volume'})
    
    # 转换价格和成交量列为数值类型
    for col in ['open', 'high', 'low', 'close', 'volume']:
        if col in data.columns:
            data[col] = pd.to_numeric(data[col], errors='coerce')
    
    data['date'] = pd.to_datetime(data['open_time'], unit='ms')
    data = data.sort_values('date').drop_duplicates('open_time').reset_index(drop=True)
    data = data.dropna(subset=['close'])
    return data

def load_1h_data_for_period(start_month: str, end_month: str, full_data: pd.DataFrame):
    """从已加载的完整数据中筛选指定时间段"""
    if full_data is None or full_data.empty:
        return None
    
    # 解析日期范围
    start_date = pd.to_datetime(f"{start_month}-01")
    # 结束月份的最后一天
    end_parts = end_month.split('-')
    end_year, end_m = int(end_parts[0]), int(end_parts[1])
    if end_m == 12:
        end_date = pd.to_datetime(f"{end_year+1}-01-01")
    else:
        end_date = pd.to_datetime(f"{end_year}-{end_m+1:02d}-01")
    
    # 筛选
    mask = (full_data['date'] >= start_date) & (full_data['date'] < end_date)
    period_data = full_data[mask].copy().reset_index(drop=True)
    
    return period_data if len(period_data) > 0 else None

def calculate_indicators(df, timeframe='5m'):
    """计算指标"""
    # 根据timeframe调整参数
    if timeframe == '1h':
        # 1h相当于5m的12倍，适当缩小周期
        breakout = 5  # 1h的5根 ≈ 5m的60根，但我们保持突破逻辑
        vol_ma = 20
    else:
        breakout = BREAKOUT_PERIOD
        vol_ma = VOLUME_MA_PERIOD
    
    df['highest'] = df['high'].shift(1).rolling(window=breakout).max()
    df['volume_ma'] = df['volume'].rolling(window=vol_ma).mean()
    df['volume_spike'] = df['volume'] > (df['volume_ma'] * VOLUME_MULTIPLIER)
    df['breakout'] = df['close'] > df['highest']
    df['hour'] = df['date'].dt.hour
    df['in_session'] = df['hour'].isin(TRADING_HOURS)
    df['trade_date'] = df['date'].dt.date
    return df

def run_backtest(df, timeframe='5m'):
    """运行回测"""
    # 根据timeframe调整持仓时间
    max_hold = 1 if timeframe == '1h' else MAX_HOLD_BARS
    warmup = 30 if timeframe == '1h' else 60
    
    balance = INITIAL_CAPITAL
    position = 0
    entry_price = 0.0
    entry_bar = 0
    trades = []
    
    daily_trades = {}
    daily_consecutive_loss = {}
    peak_balance = balance
    max_drawdown = 0.0
    
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
                account_pnl = pnl_pct * LEVERAGE
                balance *= (1 + account_pnl)
                trades.append({'reason': 'tp', 'pnl': account_pnl, 'balance': balance})
                position = 0
                daily_consecutive_loss[current_date] = 0
                continue
            
            if pnl_pct <= -STOP_LOSS_PCT:
                account_pnl = pnl_pct * LEVERAGE
                balance *= (1 + account_pnl)
                trades.append({'reason': 'sl', 'pnl': account_pnl, 'balance': balance})
                position = 0
                daily_consecutive_loss[current_date] += 1
                continue
            
            if bars_held >= max_hold:
                account_pnl = pnl_pct * LEVERAGE
                balance *= (1 + account_pnl)
                trades.append({'reason': 'timeout', 'pnl': account_pnl, 'balance': balance})
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
                trades.append({'type': 'buy'})
    
    return trades, balance, max_drawdown

def main():
    print("=" * 80)
    print("5分钟爆破猎手策略 - 多时段回测分析")
    print("=" * 80)
    
    results = []
    
    # 首先测试5分钟数据（最精确）
    print("\n📊 5分钟数据回测 (2024.09-10)")
    df_5m = load_5m_data()
    if df_5m is not None:
        df_5m = calculate_indicators(df_5m, '5m')
        trades, balance, max_dd = run_backtest(df_5m, '5m')
        profit_pct = (balance - INITIAL_CAPITAL) / INITIAL_CAPITAL * 100
        sell_trades = [t for t in trades if 'pnl' in t]
        wins = len([t for t in sell_trades if t['pnl'] > 0])
        win_rate = wins / len(sell_trades) * 100 if sell_trades else 0
        
        results.append({
            'name': '5m精确回测',
            'period': '2024.09-10 (60天)',
            'market': '震荡',
            'return': profit_pct,
            'trades': len(sell_trades),
            'win_rate': win_rate,
            'max_dd': max_dd * 100,
            'final': balance
        })
        print(f"   收益: {profit_pct:+.1f}%, 交易: {len(sell_trades)}, 胜率: {win_rate:.1f}%, 回撤: {max_dd*100:.1f}%")
    
    # 1小时数据多时段测试
    print("\n📊 1小时数据多时段回测 (参数已适配)")
    
    # 先加载完整的1小时数据
    df_1h_full = load_1h_merged_data()
    if df_1h_full is not None:
        print(f"   已加载 {len(df_1h_full)} 条1小时数据")
        print(f"   时间范围: {df_1h_full['date'].min()} ~ {df_1h_full['date'].max()}")
    
    for scenario in SCENARIOS:
        df = load_1h_data_for_period(scenario['start'], scenario['end'], df_1h_full)
        if df is None or len(df) < 50:
            print(f"   {scenario['name']}: 数据不足")
            continue
        
        df = calculate_indicators(df, '1h')
        trades, balance, max_dd = run_backtest(df, '1h')
        
        profit_pct = (balance - INITIAL_CAPITAL) / INITIAL_CAPITAL * 100
        sell_trades = [t for t in trades if 'pnl' in t]
        wins = len([t for t in sell_trades if t['pnl'] > 0])
        win_rate = wins / len(sell_trades) * 100 if sell_trades else 0
        
        results.append({
            'name': scenario['name'],
            'period': f"{scenario['start']} ~ {scenario['end']}",
            'market': scenario['market'],
            'return': profit_pct,
            'trades': len(sell_trades),
            'win_rate': win_rate,
            'max_dd': max_dd * 100,
            'final': balance
        })
        
        print(f"   {scenario['name']} ({scenario['market']}): {profit_pct:+.1f}%, {len(sell_trades)}笔, 胜率{win_rate:.0f}%, 回撤{max_dd*100:.0f}%")
    
    # 总结
    print("\n" + "=" * 80)
    print("📈 回测汇总")
    print("=" * 80)
    print(f"{'场景':<15} {'时段':<20} {'市场':<6} {'收益%':>8} {'交易':>6} {'胜率%':>7} {'回撤%':>7} {'最终':>10}")
    print("-" * 80)
    
    total_return = 0
    for r in results:
        print(f"{r['name']:<15} {r['period']:<20} {r['market']:<6} {r['return']:>+7.1f}% {r['trades']:>6} {r['win_rate']:>6.1f}% {r['max_dd']:>6.1f}% {r['final']:>10.2f}")
        total_return += r['return']
    
    avg_return = total_return / len(results) if results else 0
    
    print("-" * 80)
    print(f"平均收益: {avg_return:+.1f}%")
    
    # 分析
    print("\n" + "=" * 80)
    print("🎯 结论")
    print("=" * 80)
    
    positive = len([r for r in results if r['return'] > 0])
    negative = len([r for r in results if r['return'] <= 0])
    
    print(f"盈利场景: {positive}/{len(results)}")
    print(f"亏损场景: {negative}/{len(results)}")
    
    if avg_return > 10:
        print("\n✅ 策略表现良好，正期望值明显")
        print("   建议: 谨慎运行，严格执行纪律")
    elif avg_return > 0:
        print("\n⚠️ 策略略有正期望，但不稳定")
        print("   建议: 可以小仓位测试")
    else:
        print("\n❌ 策略在多数场景下表现不佳")
        print("   建议: 需要优化参数或放弃")
    
    print("\n💡 关键发现:")
    best = max(results, key=lambda x: x['return']) if results else None
    worst = min(results, key=lambda x: x['return']) if results else None
    if best:
        print(f"   最佳: {best['name']} ({best['market']}) → {best['return']:+.1f}%")
    if worst:
        print(f"   最差: {worst['name']} ({worst['market']}) → {worst['return']:+.1f}%")

if __name__ == "__main__":
    main()
