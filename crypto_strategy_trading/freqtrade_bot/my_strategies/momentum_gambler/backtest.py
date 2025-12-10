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
    merged_path_5m = os.path.join(DATA_DIR, f"{symbol}-5m-merged.csv")
    merged_path_1h = os.path.join(DATA_DIR, f"{symbol}-1h-merged.csv")
    
    csv_path = None
    if os.path.exists(merged_path_5m):
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


def run_continuous_backtest(strategy: MomentumGamblerStrategy, df: pd.DataFrame) -> dict:
    """
    连续回测模式 (模拟真实资金流)
    - 初始资金 0 (模拟按需充值)
    - 每月有 300U 额度 (3颗子弹)
    - 如果该月没机会，额度不累计(或者累计? 这里按不累计)
    - 记录总投入成本和当前总资产
    """
    
    position = 0
    entry_price = 0.0
    active_bullet = 0.0  # 当前投入的资金
    
    wallet_balance = 0.0 # 钱包余额 (已平仓利润 + 未使用的子弹)
    total_invested = 0.0 # 累计从银行充值的金额
    
    # 每月子弹追踪
    current_month = None
    bullets_used_this_month = 0
    
    trades_log = []
    
    leverage = strategy.params['leverage']
    stop_loss_pct = strategy.params['stop_loss_pct']
    cost = strategy.get_cost_per_trade()
    
    # Trailing Stop
    highest_profit_pct = 0.0
    use_trailing = strategy.params.get('use_trailing_stop', False)
    trailing_start = strategy.params.get('trailing_stop_positive', 0.10)
    trailing_offset = strategy.params.get('trailing_stop_offset', 0.15)
    
    for idx, (i, row) in enumerate(df.iterrows()):
        current_price = row['close']
        month = row['month']
        
        # 每月重置子弹数 (额度恢复，不代表充值，是用的时候才充)
        if month != current_month:
            current_month = month
            bullets_used_this_month = 0
        
        # --- 持仓管理 ---
        if position == 1:
            pnl_pct = (current_price - entry_price) / entry_price
            if pnl_pct > highest_profit_pct:
                highest_profit_pct = pnl_pct
                
            exit_reason = None
            
            # 止损
            if pnl_pct <= -stop_loss_pct:
                exit_reason = 'sl'
            # 移动止盈
            elif use_trailing and highest_profit_pct >= trailing_start:
                if pnl_pct < (highest_profit_pct - trailing_offset):
                    exit_reason = 'trailing_stop'
            
            if exit_reason:
                trade_pnl_amount = pnl_pct * leverage * active_bullet - cost * leverage * active_bullet
                capital_returned = active_bullet + trade_pnl_amount
                
                if capital_returned < 0: capital_returned = 0
                
                wallet_balance += capital_returned
                active_bullet = 0.0
                position = 0
                
                trades_log.append({
                    'entry_date': entry_date,
                    'exit_date': row['date'],
                    'year': row['year'],
                    'month': str(month),
                    'pnl_rate': pnl_pct,
                    'pnl_amount': trade_pnl_amount,
                    'reason': exit_reason
                })
        
        # --- 开仓管理 ---
        if position == 0:
            # 检查是否有开仓机会
            signal = strategy.generate_signal(df.reset_index(drop=True), idx)
            
            if signal == 'long':
                # 决定资金来源
                bullet_needed = BULLET_SIZE
                
                # 1. 优先用钱包余额
                if wallet_balance >= bullet_needed:
                    wallet_balance -= bullet_needed
                    active_bullet = bullet_needed
                else:
                    # 2. 钱包不够，尝试从月度额度充值
                    if bullets_used_this_month < 3: # 每月最多3次充值
                        to_top_up = bullet_needed - wallet_balance
                        total_invested += to_top_up
                        bullets_used_this_month += 1
                        
                        wallet_balance = 0 # 余额已用完
                        active_bullet = bullet_needed
                    else:
                        # 额度也没了，错过机会
                        continue
                
                position = 1
                entry_price = current_price
                entry_date = row['date']
                highest_profit_pct = 0.0
                
    # 最终结算
    final_equity = wallet_balance + active_bullet # (不精确计算浮盈，假设最后按成本算，或者最后强平)
    if position == 1:
        # 强平
        pnl_pct = (df.iloc[-1]['close'] - entry_price) / entry_price
        trade_pnl_amount = pnl_pct * leverage * active_bullet
        final_equity = wallet_balance + active_bullet + trade_pnl_amount
        
    return trades_log, total_invested, final_equity


def main():
    parser = argparse.ArgumentParser(description='动量赌徒 V9 4H回测')
    parser.add_argument('--symbol', type=str, default='DOGEUSDT', help='交易对')
    args = parser.parse_args()
    
    df = load_and_resample_data(args.symbol)
    if df is None: return
        
    strategy = MomentumGamblerStrategy()
    print(f"\n⚙️ 策略 V9: 4H波段 | BB Squeeze")
    
    print("📈 计算指标...")
    df = strategy.calculate_indicators(df)
    
    print(f"🏃 开始连续资金回测 ({df['date'].min()} ~ {df['date'].max()})...\n")
    trades, total_invested, final_equity = run_continuous_backtest(strategy, df)
    
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
        # 只显示 2025 年 (或全部? 用户特别提到2025, 为了清晰只打2025吧，或者打全部)
        # 用户指令 "用 2025 年的数据回测" -> 可能是指重点看 2025
        if str(t['year']) != '2025':
            continue
            
        direction = "做多" # V9 只做多
        pnl_str = f"{t['pnl_rate']*100:>+7.1f}%"
        reason_cn = reason_map.get(t['reason'], t['reason'])
        
        print(f"{direction:<4} | {str(t['entry_date']):<20} | {str(t['exit_date']):<20} | {pnl_str} | {t['pnl_amount']:>+9.1f} | {reason_cn:<10}")

    print("-" * 85)
    
    total_years = len(yearly)
    avg_trades = len(trades) / total_years
    
    roi = (final_equity - total_invested) / total_invested * 100
    
    print(f"\n📊 核心指标:")
    print(f"总投入成本: {total_invested:.0f} U")
    print(f"最终资产:   {final_equity:.0f} U")
    print(f"总回报率:   {roi:+.1f}%")
    print(f"年均交易:   {avg_trades:.1f} 次/年 (目标 10-20)")
    print(f"总胜率:     {len(df_trades[df_trades['pnl_amount']>0]) / len(trades) * 100:.1f}%")

if __name__ == "__main__":
    main()
