"""
[Alpha V2 - Optimization 模块] Optuna 智能参数优化
------------------------------------------------
功能说明：
    这个文件属于 "Optimization (调优)" 环节。
    它的作用是使用贝叶斯优化算法 (Bayesian Optimization) 来寻找
    交易策略的最佳参数组合。

    相比于传统的 "网格搜索" (傻傻地试每一个组合)，Optuna 像一个
    聪明的 AI，它会根据之前的测试结果，"猜测" 下一组参数应该
    选什么才能获得更高的收益。

核心逻辑：
    1. 定义搜索空间: 告诉 AI 杠杆可以选 1-20倍，止盈可以选 5%-30% 等。
    2. 定义目标函数: 我们希望 "收益率最高"，但如果 "爆仓(Bust)" 则直接给负分。
    3. 自动迭代: AI 自动运行 50-100 次回测，不断逼近最佳答案。
    4. 结果保存: 将最好的参数保存到 json 文件中。
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
    print("请运行: pip install optuna")
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
        # 优先获取标准列名
        if col in df.columns:
            val = df[col]
        # 其次尝试别名 (如 vol -> volume)
        elif col == 'volume' and 'vol' in df.columns:
            val = df['vol']
        else:
            val = None
            
        if val is not None:
            if isinstance(val, pd.DataFrame): val = val.iloc[:, 0]
            clean_df[col] = pd.to_numeric(val, errors='coerce')
            
    clean_df = clean_df.drop_duplicates(subset=['timestamp']).sort_values('timestamp').reset_index(drop=True)
    return clean_df

def run_backtest(data, params):
    """运行单次策略回测"""
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
        'safety_override': True # 允许测试激进参数
    }
    
    strategy = MartingaleSniperSingleStrategy(config)
    
    # 强制覆盖策略内部的安全检查 (为了测试极端参数)
    strategy.explosion_threshold = params['explosion_threshold']
    strategy.leverage = params['leverage']
    strategy.liquidation_pct = (1 / strategy.leverage) * 0.95
    
    busts = 0
    window_size = 50
    
    # 简化的回测循环 (为了速度)
    for i in range(window_size, len(data)):
        current_price = float(data.iloc[i]['close'])
        now = data.iloc[i]['timestamp']
        
        if strategy.current_position:
            action = strategy.check_position(current_price, now)
            if action:
                strategy.update_position(action)
        else:
            if strategy.current_capital < 10:
                busts = 1
                break
            
            # 切片数据用于分析
            df_slice = data.iloc[i-10:i+1]
            signal = strategy.analyze(df_slice)
            if signal:
                strategy.update_position(signal)
                
    stats = strategy.get_stats()
    return {
        'return_pct': stats['return_pct'],
        'busts': busts,
        'trades': strategy.total_trades,
        'final_capital': strategy.current_capital
    }

def optimize_symbol(symbol, data_dir, n_trials=50):
    data = load_data(symbol, data_dir)
    if data is None or data.empty:
        print(f"跳过 {symbol}: 无数据。")
        return

    print(f"\n🚀 开始 Optuna 智能优化 {symbol} (尝试 {n_trials} 次)...")

    def objective(trial):
        # 1. AI 建议参数 (Suggest Parameters)
        leverage = trial.suggest_int('leverage', 3, 20)
        tp_pct = trial.suggest_float('take_profit_pct', 0.05, 0.30)
        sl_pct = trial.suggest_float('stop_loss_pct', 0.05, 0.50)
        threshold = trial.suggest_float('explosion_threshold', 0.02, 0.08)
        vol_ratio = trial.suggest_float('volume_spike_ratio', 2.0, 6.0)
        
        # 序列类型 (分类变量)
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
        
        # 2. 运行回测
        result = run_backtest(data, params)
        
        # 3. 计算得分
        # 严厉惩罚爆仓 (得分 -10.0)
        if result['busts'] > 0:
            return -10.0 
            
        # 奖励: 收益率
        # 如果交易次数太少 (<5)，也给 0 分，防止运气
        if result['trades'] < 5:
            return 0.0
            
        return result['return_pct']

    # 创建优化任务 (方向: 最大化分数)
    study = optuna.create_study(direction='maximize')
    study.optimize(objective, n_trials=n_trials)

    print(f"\n🏆 {symbol} 的最佳结果:")
    print(f"  收益率: {study.best_value:.2f}%")
    print(f"  最佳参数: {study.best_params}")
    
    # 保存结果
    output_path = os.path.join(os.path.dirname(__file__), f'best_params_{symbol}.json')
    with open(output_path, 'w') as f:
        json.dump(study.best_params, f, indent=4)
    print(f"  已保存至 {output_path}")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    data_dir = os.path.join(base_dir, 'backtest', 'data')
    
    targets = ['1000PEPEUSDT', 'DOGEUSDT']
    
    for coin in targets:
        optimize_symbol(coin, data_dir, n_trials=50)
