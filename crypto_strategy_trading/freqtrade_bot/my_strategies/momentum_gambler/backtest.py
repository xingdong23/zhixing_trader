"""
动量赌徒 V9 - 4H波段回测脚本

差异点：
- 数据周期：4H
- 资金管理：三颗子弹逻辑，但为了适配长线波段：
    * 不强制月末平仓（允许跨月持仓）
    * 依然按月统计投入（每月最多补300U）
    * 统计年化收益和年均交易次数
"""
import pandas as pd
import numpy as np
import os
import sys
import argparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from my_strategies.momentum_gambler.strategy import MomentumGamblerStrategy

DATA_DIR = "/Users/chengzheng/workspace/chuangxin/zhixing_trader/crypto_strategy_trading/data"
MONTHLY_CAPITAL = 300.0
BULLET_SIZE = 100.0


def load_and_resample_data(symbol: str) -> pd.DataFrame:
    """加载并重采样为4H数据"""
    # 尝试加载 5m 数据
    merged_path_full = os.path.join(DATA_DIR, f"{symbol}-5m-full.csv")
    merged_path_5m = os.path.join(DATA_DIR, f"{symbol}-5m-merged.csv")
    merged_path_1h = os.path.join(DATA_DIR, f"{symbol}-1h-merged.csv")
    
    csv_path = None
    if os.path.exists(merged_path_full):
        csv_path = merged_path_full
        print(f"📖 加载 5m 数据 (Full): {csv_path}")
    elif os.path.exists(merged_path_5m):
        csv_path = merged_path_5m
        print(f"📖 加载 5m 数据: {csv_path}")
    elif os.path.exists(merged_path_1h):
        csv_path = merged_path_1h
        print(f"📖 加载 1h 数据: {csv_path}")
    
    if not csv_path:
        print(f"❌ 未找到 {symbol} 的 5m 或 1h merged 数据")
        return None
        
    data = pd.read_csv(csv_path, low_memory=False)
    data = data[data['open_time'] != 'open_time']
    data['open_time'] = pd.to_numeric(data['open_time'], errors='coerce')
    data = data.dropna(subset=['open_time'])
    
    # fix: Normalize timestamps (handle microseconds/nanoseconds)
    # 13 digits: ms (valid)
    # 16 digits: us (divide by 1000)
    # 19 digits: ns (divide by 1000000)
    
    # Threshold for year 3000 in ms is approx 32503680000000 (14 digits? No, 3e13)
    # Year 2286 is max for ns in pd.to_datetime
    
    # If max value > 1e14 (14 digits), assume it's us or ns
    if data['open_time'].max() > 100000000000000:
        data.loc[data['open_time'] > 100000000000000, 'open_time'] //= 1000

    if 'vol' in data.columns and 'volume' not in data.columns:
        data = data.rename(columns={'vol': 'volume'})
    
    for col in ['open', 'high', 'low', 'close', 'volume']:
        if col in data.columns:
            data[col] = pd.to_numeric(data[col], errors='coerce')
            
    data['date'] = pd.to_datetime(data['open_time'], unit='ms')
    data = data.sort_values('date').drop_duplicates('open_time').reset_index(drop=True)
    data = data.dropna(subset=['close'])
    
    # 重采样为2H
    print("⌛️ 重采样为 2小时 数据...")
    data.set_index('date', inplace=True)
    hourly = data.resample('2h').agg({
        'open': 'first',
        'high': 'max',
        'low': 'min',
        'close': 'last',
        'volume': 'sum'
    }).dropna()
    
    hourly = hourly.reset_index()
    hourly['year'] = hourly['date'].dt.year
    hourly['month'] = hourly['date'].dt.to_period('M')
    
    return hourly


def run_continuous_backtest(strategy: MomentumGamblerStrategy, df: pd.DataFrame, initial_capital=300.0, sizing_ratio=0.33) -> dict:
    """
    连续回测模式 (固定本金 + 仓位管理)
    - initial_capital: 初始本金
    - sizing_ratio: 每次开仓比例 (1.0 = All in, 0.33 = 1/3仓位)
    """
    
    position = 0
    entry_price = 0.0
    active_amount = 0.0  # 当前投入的资金 (保证金)
    wallet_balance = initial_capital
    
    trades_log = []
    
    leverage = strategy.params['leverage']
    stop_loss_pct = strategy.params['stop_loss_pct']
    cost = strategy.get_cost_per_trade()
    
    # Trailing Stop
    highest_profit_pct = 0.0
    use_trailing = strategy.params.get('use_trailing_stop', True)
    trailing_start = strategy.params.get('trailing_stop_positive', 0.10)
    trailing_offset = strategy.params.get('trailing_stop_offset', 0.15)
    
    entry_date = None
    
    for idx, (i, row) in enumerate(df.iterrows()):
        current_price = row['close']
        
        # --- 持仓管理 ---
        if position == 1:
            pnl_pct = (current_price - entry_price) / entry_price
            
            # Update Highest Profit
            if pnl_pct > highest_profit_pct:
                highest_profit_pct = pnl_pct
                
            exit_reason = None
            
            # 1. 止损 (Hard SL for protection against liquidation)
            # Liquidation check: if pnl_pct <= -1/leverage, it's 100% loss. 
            # Interactive Brokers style: liquidation at maintenance margin. Here simplified.
            if pnl_pct <= -stop_loss_pct:
                exit_reason = 'sl'
            # 2. 移动止盈 (Trailing Stop)
            elif use_trailing and highest_profit_pct >= trailing_start:
                if pnl_pct < (highest_profit_pct - trailing_offset):
                    exit_reason = 'trailing_stop'
            
            if exit_reason:
                # Calculate Result
                # PnL = (Exit - Entry)/Entry * Leverage * Margin
                raw_pnl = pnl_pct * leverage * active_amount
                # Fee calculation (simplified: 0.06% taker * 2 * leverage * margin)
                # Opening + Closing fee roughly
                total_fee = (0.0006 + 0.0006) * leverage * active_amount 
                
                net_pnl = raw_pnl - total_fee
                
                capital_returned = active_amount + net_pnl
                if capital_returned < 0: capital_returned = 0 # Max loss is margin
                
                wallet_balance += capital_returned
                
                trades_log.append({
                    'entry_date': entry_date,
                    'exit_date': row['date'],
                    'year': row['year'],
                    'month': str(row['month']),
                    'pnl_rate': pnl_pct,
                    'pnl_amount': net_pnl,
                    'balance_after': wallet_balance,
                    'reason': exit_reason
                })
                
                position = 0
                active_amount = 0.0
                highest_profit_pct = 0.0
        
        # --- 开仓管理 ---
        if position == 0:
            # Check Ruin
            if wallet_balance < 10: # Minimum trade size constraint (Binance is ~5-10U)
                continue # Broke
                
            # 检查是否有开仓机会
            signal = strategy.generate_signal(df.reset_index(drop=True), idx)
            
            if signal == 'long':
                # Sizing
                trade_size = wallet_balance * sizing_ratio
                
                if trade_size < 5: continue # Too small to trade
                
                wallet_balance -= trade_size
                active_amount = trade_size
                
                position = 1
                entry_price = current_price
                entry_date = row['date']
                highest_profit_pct = 0.0
                
    # 最终结算
    final_equity = wallet_balance
    if position == 1:
        pnl_pct = (df.iloc[-1]['close'] - entry_price) / entry_price
        trade_pnl = pnl_pct * leverage * active_amount
        final_equity += active_amount + trade_pnl
        
    return trades_log, initial_capital, final_equity



def main():
    parser = argparse.ArgumentParser(description='动量赌徒 V9 4H回测')
    parser.add_argument('--symbol', type=str, default='DOGEUSDT', help='交易对')
    parser.add_argument('--year', type=int, default=None, help='指定年份回测 (例如 2025)')
    parser.add_argument('--initial_capital', type=float, default=300.0, help='初始回测本金')
    parser.add_argument('--sizing_ratio', type=float, default=0.33, help='仓位比例 (0.33 = 1/3仓位, 1.0 = All in)')
    args = parser.parse_args()
    
    df = load_and_resample_data(args.symbol)
    if df is None: return

    # Filter by year if specified
    if args.year:
        print(f"🗓️ 只回测 {args.year} 年数据...")
        df = df[df['year'] == args.year].copy()
        if df.empty:
            print(f"❌ {args.year} 年无数据")
            return
        
    
    # Load Strategy
    from my_strategies.momentum_gambler.strategy import MomentumGamblerStrategy
    strategy = MomentumGamblerStrategy()
    print(f"\n⚙️ 策略: 动量赌徒 V11 (Final) | Squeeze + ADX30 Breakout")
    
    print("📈 计算指标...")
    df = strategy.calculate_indicators(df)
    
    print(f"🏃 开始连续资金回测 ({df['date'].min()} ~ {df['date'].max()})")
    print(f"💰 初始本金: {args.initial_capital} U | 每次仓位: {args.sizing_ratio*100:.0f}%")
    
    trades, total_invested, final_equity = run_continuous_backtest(strategy, df, args.initial_capital, args.sizing_ratio)
    
    # 分析结果
    print("=" * 70)
    print("📅 V9 策略回测报告")
    print("=" * 70)
    
    if not trades:
        print("无交易")
        return

    # 年度统计
    df_trades = pd.DataFrame(trades)
    yearly = df_trades.groupby('year').agg({
        'pnl_amount': ['count', 'sum'],
        'pnl_rate': lambda x: (x > 0).sum() / len(x)
    })
    yearly.columns = ['trades', 'pnl_sum', 'win_rate']
    
    print("年份    交易数   胜率    年度盈亏")
    print("-" * 40)
    for year, row in yearly.iterrows():
        print(f"{year}   {row['trades']:>3.0f}     {row['win_rate']*100:>3.0f}%   {row['pnl_sum']:>+8.1f} U")
    
    print("=" * 80)
    print("📝 交易明细 (2025年 - 按时间排序)")
    print("=" * 80)
    print(f"{'方向':<4} | {'开仓日期':<20} | {'平仓日期':<20} | {'盈亏率':<8} | {'盈亏额(U)':<10} | {'原因':<10}")
    print("-" * 85)
    
    reason_map = {
        'sl': '止损',
        'trailing_stop': '移动止盈',
        'roi': '止盈',
        'force_exit': '强平',
        'stop_loss': '止损'
    }
    
    for t in trades:
        direction = "做多" # V9 只做多
        pnl_str = f"{t['pnl_rate']*100:>+7.1f}%"
        reason_cn = reason_map.get(t['reason'], t['reason'])
        
        print(f"{direction:<4} | {str(t['entry_date']):<20} | {str(t['exit_date']):<20} | {pnl_str} | {t['pnl_amount']:>+9.1f} | {reason_cn:<10}")

    print("-" * 85)
    
    total_years = len(yearly)
    avg_trades = len(trades) / total_years
    
    roi = (final_equity - total_invested) / total_invested * 100
    
    # Calculate Benchmark (Buy & Hold) Return
    first_price = df.iloc[0]['open']
    last_price = df.iloc[-1]['close']
    bh_return = (last_price - first_price) / first_price * 100
    
    print(f"\n📊 核心指标:")
    print(f"总投入成本: {total_invested:.0f} U")
    print(f"最终资产:   {final_equity:.0f} U")
    print(f"总回报率:   {roi:+.1f}%")
    print(f"基准涨幅:   {bh_return:+.1f}% (Buy & Hold)")
    print(f"年均交易:   {avg_trades:.1f} 次/年 (目标 10-20)")
    print(f"总胜率:     {len(df_trades[df_trades['pnl_amount']>0]) / len(trades) * 100:.1f}%")

if __name__ == "__main__":
    main()
