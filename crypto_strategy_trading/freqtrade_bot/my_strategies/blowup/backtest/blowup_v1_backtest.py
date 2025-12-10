"""
5分钟爆破猎手策略回测脚本

严格模拟:
- 10x 杠杆
- 止盈 1%，止损 0.33%
- 交易时段限制 (UTC 00-04, 14-18)
- 突破 + 放量信号
- 5根K线内未触发则强制平仓
"""
import pandas as pd
import numpy as np
import glob
import os

# 配置
DATA_DIR = "/Users/chengzheng/workspace/chuangxin/zhixing_trader/crypto_strategy_trading/data"
INITIAL_CAPITAL = 300.0
LEVERAGE = 10
TAKE_PROFIT_PCT = 0.005     # 0.5% 价格止盈 → 5% 账户盈利
STOP_LOSS_PCT = 0.003       # 0.3% 价格止损 → 3% 账户亏损 (盈亏比 ≈ 1.67:1)
RISK_PER_TRADE = 0.03       # 3% 账户风险
MAX_HOLD_BARS = 3           # 最多持仓3根K线（15分钟）后强制平仓
MAX_DAILY_TRADES = 6        # 每日最多交易次数
MAX_CONSECUTIVE_LOSS = 3    # 连续亏损次数停止当日交易

# 策略参数
BREAKOUT_PERIOD = 20
VOLUME_MA_PERIOD = 50
VOLUME_MULTIPLIER = 1.8
TRADING_HOURS = [0, 1, 2, 3, 14, 15, 16, 17]  # UTC

def load_data():
    """加载并合并所有BTC 5分钟数据"""
    files = sorted(glob.glob(os.path.join(DATA_DIR, "BTCUSDT-5m-2024-*.csv")))
    if not files:
        raise FileNotFoundError("No BTC 5m data files found")
    
    dfs = []
    for f in files:
        df = pd.read_csv(f)
        dfs.append(df)
    
    data = pd.concat(dfs, ignore_index=True)
    data['date'] = pd.to_datetime(data['open_time'], unit='ms')
    data = data.sort_values('date').reset_index(drop=True)
    
    # 去重
    data = data.drop_duplicates(subset=['open_time'], keep='first')
    
    print(f"Loaded {len(data)} candles from {len(files)} files")
    print(f"Date range: {data['date'].iloc[0]} to {data['date'].iloc[-1]}")
    return data

def calculate_indicators(df):
    """计算所需指标"""
    # 前20根K线最高价（不含当前）
    df['highest_20'] = df['high'].shift(1).rolling(window=BREAKOUT_PERIOD).max()
    
    # 50周期成交量均线
    df['volume_ma'] = df['volume'].rolling(window=VOLUME_MA_PERIOD).mean()
    
    # 成交量脉冲
    df['volume_spike'] = df['volume'] > (df['volume_ma'] * VOLUME_MULTIPLIER)
    
    # 突破信号
    df['breakout'] = df['close'] > df['highest_20']
    
    # UTC小时
    df['hour'] = df['date'].dt.hour
    
    # 交易时段
    df['in_session'] = df['hour'].isin(TRADING_HOURS)
    
    # 日期（用于每日限制）
    df['trade_date'] = df['date'].dt.date
    
    return df

def run_backtest(df):
    """运行回测"""
    balance = INITIAL_CAPITAL
    position = 0  # 0: 空仓, 1: 多头
    entry_price = 0.0
    entry_bar = 0
    trades = []
    
    daily_trades = {}
    daily_consecutive_loss = {}
    
    peak_balance = balance
    max_drawdown = 0.0
    
    for i in range(60, len(df)):  # 跳过预热期
        row = df.iloc[i]
        current_price = row['close']
        current_date = row['trade_date']
        
        # 初始化每日计数器
        if current_date not in daily_trades:
            daily_trades[current_date] = 0
            daily_consecutive_loss[current_date] = 0
        
        # 持仓处理
        if position == 1:
            # 计算当前收益
            pnl_pct = (current_price - entry_price) / entry_price
            bars_held = i - entry_bar
            
            # 检查止盈
            if pnl_pct >= TAKE_PROFIT_PCT:
                # 止盈触发
                account_pnl = pnl_pct * LEVERAGE
                balance *= (1 + account_pnl)
                trades.append({
                    'time': row['date'], 'type': 'sell', 'reason': 'take_profit',
                    'entry': entry_price, 'exit': current_price,
                    'pnl_price': pnl_pct * 100, 'pnl_account': account_pnl * 100,
                    'balance': balance
                })
                position = 0
                daily_consecutive_loss[current_date] = 0  # 重置连亏
                continue
            
            # 检查止损
            if pnl_pct <= -STOP_LOSS_PCT:
                # 止损触发
                account_pnl = pnl_pct * LEVERAGE
                balance *= (1 + account_pnl)
                trades.append({
                    'time': row['date'], 'type': 'sell', 'reason': 'stop_loss',
                    'entry': entry_price, 'exit': current_price,
                    'pnl_price': pnl_pct * 100, 'pnl_account': account_pnl * 100,
                    'balance': balance
                })
                position = 0
                daily_consecutive_loss[current_date] += 1
                continue
            
            # 超时强制平仓
            if bars_held >= MAX_HOLD_BARS:
                account_pnl = pnl_pct * LEVERAGE
                balance *= (1 + account_pnl)
                trades.append({
                    'time': row['date'], 'type': 'sell', 'reason': 'timeout',
                    'entry': entry_price, 'exit': current_price,
                    'pnl_price': pnl_pct * 100, 'pnl_account': account_pnl * 100,
                    'balance': balance
                })
                position = 0
                if pnl_pct < 0:
                    daily_consecutive_loss[current_date] += 1
                else:
                    daily_consecutive_loss[current_date] = 0
                continue
        
        # 更新最大回撤
        if balance > peak_balance:
            peak_balance = balance
        current_dd = (peak_balance - balance) / peak_balance
        if current_dd > max_drawdown:
            max_drawdown = current_dd
        
        # 开仓检查
        if position == 0:
            # 检查每日限制
            if daily_trades[current_date] >= MAX_DAILY_TRADES:
                continue
            if daily_consecutive_loss.get(current_date, 0) >= MAX_CONSECUTIVE_LOSS:
                continue
            
            # 检查入场条件
            if (row['in_session'] and 
                row['breakout'] and 
                row['volume_spike'] and
                not pd.isna(row['highest_20'])):
                
                position = 1
                entry_price = current_price
                entry_bar = i
                daily_trades[current_date] += 1
                trades.append({
                    'time': row['date'], 'type': 'buy', 'reason': 'signal',
                    'price': entry_price, 'balance': balance
                })
    
    return trades, balance, max_drawdown

def print_results(trades, final_balance, max_drawdown):
    """打印回测结果"""
    print("\n" + "="*60)
    print("5分钟爆破猎手策略 - 回测结果")
    print("="*60)
    
    print(f"\n💰 资金表现:")
    print(f"   初始资金:   {INITIAL_CAPITAL:.2f} USDT")
    print(f"   最终资金:   {final_balance:.2f} USDT")
    total_return = (final_balance - INITIAL_CAPITAL) / INITIAL_CAPITAL * 100
    print(f"   总收益率:   {total_return:+.2f}%")
    print(f"   最大回撤:   {max_drawdown * 100:.2f}%")
    
    # 交易统计
    sell_trades = [t for t in trades if t['type'] == 'sell']
    buy_trades = [t for t in trades if t['type'] == 'buy']
    
    print(f"\n📊 交易统计:")
    print(f"   总交易数:    {len(sell_trades)}")
    
    if sell_trades:
        wins = [t for t in sell_trades if t['pnl_account'] > 0]
        losses = [t for t in sell_trades if t['pnl_account'] <= 0]
        
        win_rate = len(wins) / len(sell_trades) * 100
        print(f"   盈利次数:    {len(wins)}")
        print(f"   亏损次数:    {len(losses)}")
        print(f"   胜率:        {win_rate:.1f}%")
        
        if wins:
            avg_win = np.mean([t['pnl_account'] for t in wins])
            print(f"   平均盈利:    {avg_win:.2f}%")
        if losses:
            avg_loss = np.mean([t['pnl_account'] for t in losses])
            print(f"   平均亏损:    {avg_loss:.2f}%")
        
        # 按原因分类
        tp_count = len([t for t in sell_trades if t['reason'] == 'take_profit'])
        sl_count = len([t for t in sell_trades if t['reason'] == 'stop_loss'])
        to_count = len([t for t in sell_trades if t['reason'] == 'timeout'])
        
        print(f"\n📌 出场原因:")
        print(f"   止盈触发:    {tp_count}")
        print(f"   止损触发:    {sl_count}")
        print(f"   超时平仓:    {to_count}")
    
    print("\n" + "="*60)
    print("最近10笔交易:")
    print("="*60)
    for t in trades[-10:]:
        if t['type'] == 'buy':
            print(f"  {t['time']} | 买入 @ {t['price']:.2f}")
        else:
            print(f"  {t['time']} | 卖出 @ {t['exit']:.2f} | {t['reason']:10} | 账户PnL: {t['pnl_account']:+.2f}%")
    
    # 风险提示
    print("\n" + "="*60)
    if final_balance >= 600:
        print("🎯 目标达成! 账户翻倍，建议立即停止!")
    elif final_balance <= 50:
        print("💀 账户爆仓! 停止交易!")
    elif total_return > 0:
        print("📈 表现良好，继续观察!")
    else:
        print("📉 亏损中，注意风险!")

if __name__ == "__main__":
    print("Loading data...")
    df = load_data()
    
    print("Calculating indicators...")
    df = calculate_indicators(df)
    
    print("Running backtest...")
    trades, final_balance, max_dd = run_backtest(df)
    
    print_results(trades, final_balance, max_dd)
