"""
[Alpha V2 - Optimization 模块] Optuna 全天候智能优化 (Robust Version)
-------------------------------------------------------------------
功能说明：
    这是 `optuna_martingale.py` 的升级版。
    它不仅仅看 "总收益率"，而是将历史数据切分为不同的 "市场环境" (Regimes)：
    1. 牛市 (Bull)
    2. 熊市 (Bear)
    3. 震荡市 (Chop/Range)

    AI 的目标是找到一组在 **所有环境** 下都能生存并盈利的参数。
    如果一组参数在牛市赚了 1000%，但在熊市爆仓了，它会被直接淘汰。

评分公式：
    Final Score = (Bull_Ret * 0.3) + (Bear_Ret * 0.3) + (Chop_Ret * 0.4)
    * 震荡市权重最高 (0.4)，因为那是马丁策略的"坟墓"，必须重点优化。
"""
import os
import sys
import pandas as pd
import logging
import json
from datetime import datetime

# 尝试导入 optuna
try:
    import optuna
except ImportError:
    print("❌ 错误: 缺少 'optuna' 库。")
    sys.exit(1)

# 添加项目根目录到路径
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

from strategies.martingale_sniper.strategy_single import MartingaleSniperSingleStrategy

# 配置日志
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
    
    # 清洗列名
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

def run_backtest_slice(data_slice, params):
    """在特定的数据片段上运行回测"""
    if data_slice.empty:
        return {'return_pct': 0.0, 'busts': 0, 'trades': 0}

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
        'safety_override': True
    }
    
    strategy = MartingaleSniperSingleStrategy(config)
    
    # Force params
    strategy.explosion_threshold = params['explosion_threshold']
    strategy.leverage = params['leverage']
    strategy.liquidation_pct = (1 / strategy.leverage) * 0.95
    
    busts = 0
    window_size = 50
    
    # 简单的回测循环
    # 注意：这里为了速度，没有重置 daily_rounds，假设每个 slice 是独立的
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
            
            df_slice = data_slice.iloc[i-10:i+1]
            signal = strategy.analyze(df_slice)
            if signal:
                strategy.update_position(signal)
                
    stats = strategy.get_stats()
    return {
        'return_pct': stats['return_pct'],
        'busts': busts,
        'trades': strategy.total_trades
    }

def optimize_symbol_robust(symbol, data_dir, n_trials=50):
    data = load_data(symbol, data_dir)
    if data is None or data.empty:
        print(f"跳过 {symbol}: 无数据。")
        return

    print(f"\n🛡️ 开始全天候稳健优化 {symbol} (尝试 {n_trials} 次)...")
    print("目标: 寻找在 牛市、熊市、震荡市 均不爆仓且盈利的参数。")

    # 定义市场环境 (Regimes) - 基于 2024 DOGE 走势
    # 实际应用中，这里应该动态识别，但为了演示，我们使用硬编码的典型区间
    regimes = {
        'bull': (datetime(2024, 2, 1), datetime(2024, 3, 31)), # 牛市
        'bear': (datetime(2024, 4, 1), datetime(2024, 5, 31)), # 熊市
        'chop': (datetime(2024, 6, 1), datetime(2024, 8, 31))  # 震荡 (最难)
    }
    
    # 预先切分数据，避免在 objective 中重复切分
    data_slices = {}
    for name, (start, end) in regimes.items():
        mask = (data['timestamp'] >= start) & (data['timestamp'] <= end)
        data_slices[name] = data.loc[mask].reset_index(drop=True)
        print(f"  - {name.upper()}: {len(data_slices[name])} candles")

    def objective(trial):
        # 1. AI 建议参数
        leverage = trial.suggest_int('leverage', 3, 15) # 降低最大杠杆，求稳
        tp_pct = trial.suggest_float('take_profit_pct', 0.05, 0.25)
        sl_pct = trial.suggest_float('stop_loss_pct', 0.10, 0.40)
        threshold = trial.suggest_float('explosion_threshold', 0.03, 0.08)
        vol_ratio = trial.suggest_float('volume_spike_ratio', 2.0, 5.0)
        
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
            'cooldown_minutes': 15,
            'max_daily_rounds': 10
        }
        
        # 2. 分别在三种环境下回测
        scores = {}
        total_busts = 0
        total_trades = 0
        
        for name, d_slice in data_slices.items():
            res = run_backtest_slice(d_slice, params)
            scores[name] = res['return_pct']
            total_busts += res['busts']
            total_trades += res['trades']
            
            # 只要有一个环境爆仓，直接判死刑
            if res['busts'] > 0:
                return -100.0
        
        # 3. 计算加权总分
        # 震荡市 (Chop) 权重最高 (0.4)，因为它是马丁策略的克星
        # 牛市 (Bull) 权重 0.3
        # 熊市 (Bear) 权重 0.3
        weighted_score = (scores['bull'] * 0.3) + (scores['bear'] * 0.3) + (scores['chop'] * 0.4)
        
        # 惩罚交易次数过少 (防止过拟合极少数机会)
        if total_trades < 10: # 三个周期加起来不到 10 次
            return 0.0
            
        return weighted_score

    study = optuna.create_study(direction='maximize')
    study.optimize(objective, n_trials=n_trials)

    print(f"\n🏆 {symbol} 全天候最佳结果:")
    print(f"  加权得分: {study.best_value:.2f}")
    print(f"  最佳参数: {study.best_params}")
    
    output_path = os.path.join(os.path.dirname(__file__), f'best_params_robust_{symbol}.json')
    with open(output_path, 'w') as f:
        json.dump(study.best_params, f, indent=4)
    print(f"  已保存至 {output_path}")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    data_dir = os.path.join(base_dir, 'backtest', 'data')
    
    # 针对 DOGE 进行全天候优化
    optimize_symbol_robust('DOGEUSDT', data_dir, n_trials=50)
