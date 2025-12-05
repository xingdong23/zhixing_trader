"""
[Alpha V2 - Optimization] 全周期深度参数挖掘 (Deep Mining)
-------------------------------------------------------------------
使用 2021-2025 全量历史数据进行参数优化。
包含新的 trend_ema_period 过滤器参数。
"""
import os
import sys
import pandas as pd
import logging
import json
from datetime import datetime

try:
    import optuna
except ImportError:
    print("❌ 错误: 缺少 'optuna' 库。")
    sys.exit(1)

project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

from strategies.martingale_sniper.strategy_single import MartingaleSniperSingleStrategy

logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)

def load_data(symbol, data_dir):
    """加载并清洗指定币种的数据"""
    print(f"正在加载 {symbol} 的数据...")
    files = sorted([f for f in os.listdir(data_dir) if f.startswith(f'{symbol}-5m-') and f.endswith('.csv')])
    
    if not files:
        return None
    
    dfs = []
    for f in files:
        try:
            path = os.path.join(data_dir, f)
            df = pd.read_csv(path, low_memory=False)
            dfs.append(df)
        except Exception:
            pass
    
    if not dfs:
        return None
        
    df = pd.concat(dfs, ignore_index=True)
    
    clean_df = pd.DataFrame()
    if 'open_time' in df.columns:
        ot = df['open_time']
        if isinstance(ot, pd.DataFrame): ot = ot.iloc[:, 0]
        clean_df['timestamp'] = pd.to_datetime(pd.to_numeric(ot, errors='coerce'), unit='ms')
    
    cols = ['open', 'high', 'low', 'close', 'volume']
    for col in cols:
        if col in df.columns:
            val = df[col]
        elif col == 'volume' and 'vol' in df.columns:
            val = df['vol']
        else:
            val = None
            
        if val is not None:
            if isinstance(val, pd.DataFrame): val = val.iloc[:, 0]
            clean_df[col] = pd.to_numeric(val, errors='coerce')
            
    clean_df = clean_df.drop_duplicates(subset=['timestamp']).sort_values('timestamp').reset_index(drop=True)
    return clean_df

def run_backtest_year(data_slice, params):
    """在特定年度数据上运行回测"""
    if data_slice.empty or len(data_slice) < 200:
        return {'return_pct': 0.0, 'busts': 0, 'trades': 0, 'win_rate': 0}

    config = {
        'symbol': 'TEST',
        'total_capital': 300.0,
        'leverage': params['leverage'],
        'take_profit_pct': params['take_profit_pct'],
        'stop_loss_pct': params['stop_loss_pct'],
        'explosion_threshold': params['explosion_threshold'],
        'cooldown_minutes': params['cooldown_minutes'],
        'max_daily_rounds': params['max_daily_rounds'],
        'volume_spike_ratio': params['volume_spike_ratio'],
        'martingale_sequence': params['martingale_sequence'],
        'atr_period': params.get('atr_period', 14),
        'atr_threshold': params.get('atr_threshold', 0.0),
        'trend_ema_period': params.get('trend_ema_period', 0),
        'safety_override': True
    }
    
    strategy = MartingaleSniperSingleStrategy(config)
    
    busts = 0
    window_size = 100  # 增大窗口以确保 ATR/EMA 有足够数据
    
    for i in range(window_size, len(data_slice)):
        current_price = float(data_slice.iloc[i]['close'])
        now = data_slice.iloc[i]['timestamp']
        
        if strategy.current_position:
            action = strategy.check_position(current_price, now)
            if action:
                strategy.update_position(action)
        else:
            if strategy.current_capital < 10:
                busts = 1
                break
            
            df_slice = data_slice.iloc[i-window_size:i+1]
            signal = strategy.analyze(df_slice)
            if signal:
                strategy.update_position(signal)
                
    stats = strategy.get_stats()
    return {
        'return_pct': stats['return_pct'],
        'busts': busts,
        'trades': strategy.total_trades,
        'win_rate': stats['win_rate']
    }

def optimize_deep(symbol, data_dir, n_trials=100):
    data = load_data(symbol, data_dir)
    if data is None or data.empty:
        print(f"跳过 {symbol}: 无数据。")
        return

    print(f"\n🚀 深度参数挖掘 {symbol} (尝试 {n_trials} 次)...")
    print("目标: 在 2021-2025 全周期数据中寻找最稳健的 '全天候' 参数。")

    # 按年度切片
    data['year'] = data['timestamp'].dt.year
    years = sorted(data['year'].unique())
    
    data_by_year = {}
    for year in years:
        year_data = data[data['year'] == year].reset_index(drop=True)
        data_by_year[year] = year_data
        print(f"  - {year}: {len(year_data):,} candles")

    def objective(trial):
        # 1. AI 建议参数 (扩展搜索空间)
        leverage = trial.suggest_int('leverage', 3, 20)
        tp_pct = trial.suggest_float('take_profit_pct', 0.05, 0.30)
        sl_pct = trial.suggest_float('stop_loss_pct', 0.10, 0.50)
        threshold = trial.suggest_float('explosion_threshold', 0.015, 0.08)
        vol_ratio = trial.suggest_float('volume_spike_ratio', 1.5, 6.0)
        cooldown = trial.suggest_int('cooldown_minutes', 5, 60)
        max_rounds = trial.suggest_int('max_daily_rounds', 3, 15)
        
        # 趋势过滤器 (核心新参数)
        trend_ema = trial.suggest_categorical('trend_ema_period', [0, 20, 50, 100, 144, 200])
        
        # ATR 阈值
        atr_threshold = trial.suggest_float('atr_threshold', 0.0, 0.01)
        
        seq_type = trial.suggest_categorical('seq_type', ['standard', 'aggressive', 'conservative'])
        if seq_type == 'standard':
            seq = [1, 2, 4, 8, 16]
        elif seq_type == 'aggressive':
            seq = [1, 3, 9, 27, 81]
        else:
            seq = [1, 1.5, 2.5, 4, 6]
            
        params = {
            'leverage': leverage,
            'take_profit_pct': tp_pct,
            'stop_loss_pct': sl_pct,
            'explosion_threshold': threshold,
            'volume_spike_ratio': vol_ratio,
            'martingale_sequence': seq,
            'cooldown_minutes': cooldown,
            'max_daily_rounds': max_rounds,
            'trend_ema_period': trend_ema,
            'atr_threshold': atr_threshold,
            'atr_period': 14
        }
        
        # 2. 在每个年度分别回测
        year_scores = {}
        total_busts = 0
        total_trades = 0
        
        for year, year_data in data_by_year.items():
            res = run_backtest_year(year_data, params)
            year_scores[year] = res['return_pct']
            total_busts += res['busts']
            total_trades += res['trades']
            
            # 任何年份爆仓 = 立即淘汰
            if res['busts'] > 0:
                return -1000.0
        
        # 3. 计算最终得分
        # 所有年份收益的 平均值 + 最小值 (鼓励稳定)
        if not year_scores:
            return -100.0
            
        avg_return = sum(year_scores.values()) / len(year_scores)
        min_return = min(year_scores.values())
        
        # 如果某年亏损超过 50%，大幅惩罚
        if min_return < -50:
            return min_return - 100  # 重罚
        
        # 惩罚交易过少
        if total_trades < len(years) * 3:
            return 0.0
            
        # 综合得分 = 平均收益 * 0.5 + 最差年份收益 * 0.5
        # 这样既追求高收益，又确保最差年份不太惨
        final_score = (avg_return * 0.5) + (min_return * 0.5)
        
        return final_score

    study = optuna.create_study(direction='maximize')
    study.optimize(objective, n_trials=n_trials, show_progress_bar=True)

    print(f"\n🏆 {symbol} 深度挖掘最佳结果:")
    print(f"  综合得分: {study.best_value:.2f}")
    print(f"  最佳参数:")
    for k, v in study.best_params.items():
        print(f"    - {k}: {v}")
    
    # 保存结果
    output_path = os.path.join(os.path.dirname(__file__), f'best_params_deep_{symbol}.json')
    with open(output_path, 'w') as f:
        json.dump(study.best_params, f, indent=4)
    print(f"  已保存至 {output_path}")
    
    # 用最佳参数重新跑一遍，打印每年详情
    print(f"\n📊 最佳参数回测详情:")
    print("-" * 60)
    
    best_params = study.best_params.copy()
    if best_params['seq_type'] == 'standard':
        best_params['martingale_sequence'] = [1, 2, 4, 8, 16]
    elif best_params['seq_type'] == 'aggressive':
        best_params['martingale_sequence'] = [1, 3, 9, 27, 81]
    else:
        best_params['martingale_sequence'] = [1, 1.5, 2.5, 4, 6]
    
    for year, year_data in data_by_year.items():
        res = run_backtest_year(year_data, best_params)
        status = "💀 BUST" if res['busts'] > 0 else ("🎉" if res['return_pct'] > 0 else "❌")
        print(f"{year}: {res['return_pct']:>8.2f}% | {res['trades']:>4} trades | {status}")
    print("-" * 60)

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    data_dir = os.path.join(base_dir, 'backtest', 'data')
    
    # 深度优化 DOGEUSDT
    optimize_deep('DOGEUSDT', data_dir, n_trials=100)
