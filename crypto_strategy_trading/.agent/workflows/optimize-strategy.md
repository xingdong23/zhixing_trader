---
description: 调优/优化一个策略的参数
---

# 策略优化工作流

本文档定义了使用 Optuna 等工具优化策略参数的标准化流程。

## 📁 相关目录

```
crypto_strategy_trading/
├── ai/
│   ├── optimization/{strategy_name}/  # 优化脚本
│   │   ├── __init__.py
│   │   ├── optuna_{strategy_name}.py  # Optuna优化脚本
│   │   ├── optuna_robust.py           # 稳健优化脚本
│   │   ├── best_params_*.json         # 最佳参数结果
│   │   └── best_params_deep_*.json    # 深度优化结果
│   │
│   └── verification/{strategy_name}/  # 验证脚本
│       ├── verify_best_params.py      # 验证最佳参数
│       ├── verify_long_term.py        # 长期验证
│       ├── verify_market_regimes.py   # 市场环境验证
│       └── verify_multi_timeframe.py  # 多时间框架验证
│
├── strategies/{strategy_name}/        # 策略代码
│   ├── strategy.py
│   └── config.json                    # 优化后更新此配置
│
└── data/                              # 历史数据用于优化
```

---

## 步骤 1: 创建优化目录

```bash
STRATEGY_NAME="my_strategy"

# 创建优化目录
mkdir -p ai/optimization/${STRATEGY_NAME}
touch ai/optimization/${STRATEGY_NAME}/__init__.py

# 创建验证目录
mkdir -p ai/verification/${STRATEGY_NAME}
touch ai/verification/${STRATEGY_NAME}/__init__.py
```

---

## 步骤 2: 编写 Optuna 优化脚本

在 `ai/optimization/{strategy_name}/optuna_{strategy_name}.py` 中编写：

```python
# ai/optimization/my_strategy/optuna_my_strategy.py
import optuna
import json
from pathlib import Path

# 添加项目根目录到路径
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from strategies.my_strategy.strategy import MyStrategy
from backtest.core.backtest_engine import BacktestEngine
from backtest.core.data_loader import DataLoader


def objective(trial: optuna.Trial) -> float:
    """Optuna 目标函数"""
    
    # 定义搜索空间
    params = {
        "ema_fast": trial.suggest_int("ema_fast", 3, 15),
        "ema_slow": trial.suggest_int("ema_slow", 15, 50),
        "stop_loss_pct": trial.suggest_float("stop_loss_pct", 0.01, 0.05),
        "take_profit_pct": trial.suggest_float("take_profit_pct", 0.03, 0.15),
        "rsi_threshold": trial.suggest_int("rsi_threshold", 20, 40),
    }
    
    # 约束条件
    if params["ema_fast"] >= params["ema_slow"]:
        raise optuna.TrialPruned()
    
    # 运行回测
    data_loader = DataLoader("data/DOGEUSDT-5m-merged.csv")
    klines = data_loader.load()
    
    strategy = MyStrategy(params)
    engine = BacktestEngine(strategy, initial_capital=300)
    result = engine.run(klines)
    
    # 返回优化目标（最大化收益率，最小化回撤）
    return_rate = result["summary"]["total_return"]
    max_drawdown = result["summary"]["max_drawdown"]
    
    # 综合评分：收益 - 回撤惩罚
    score = return_rate - max_drawdown * 0.5
    
    return score


def run_optimization():
    """运行优化"""
    study = optuna.create_study(
        direction="maximize",
        study_name="my_strategy_optimization",
        storage="sqlite:///ai/optimization/my_strategy/optuna.db",
        load_if_exists=True
    )
    
    study.optimize(objective, n_trials=200, n_jobs=4)
    
    # 保存最佳参数
    best_params = study.best_params
    output_path = Path("ai/optimization/my_strategy/best_params.json")
    output_path.write_text(json.dumps(best_params, indent=2))
    
    print(f"最佳参数: {best_params}")
    print(f"最佳得分: {study.best_value}")
    
    return best_params


if __name__ == "__main__":
    run_optimization()
```

---

## 步骤 3: 运行优化

```bash
# 运行优化脚本
python ai/optimization/my_strategy/optuna_my_strategy.py

# 查看结果
cat ai/optimization/my_strategy/best_params.json
```

---

## 步骤 4: 验证优化结果

### 4.1 创建验证脚本

在 `ai/verification/{strategy_name}/verify_best_params.py` 中编写：

```python
# ai/verification/my_strategy/verify_best_params.py
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from strategies.my_strategy.strategy import MyStrategy
from backtest.core.backtest_engine import BacktestEngine
from backtest.core.data_loader import DataLoader


def verify_on_multiple_datasets():
    """在多个数据集上验证"""
    
    # 加载最佳参数
    params_path = Path("ai/optimization/my_strategy/best_params.json")
    params = json.loads(params_path.read_text())
    
    datasets = [
        "data/DOGEUSDT-5m-merged.csv",
        "data/BTCUSDT-5m-merged.csv",
        "data/ETHUSDT-5m-merged.csv",
    ]
    
    results = []
    for dataset in datasets:
        loader = DataLoader(dataset)
        klines = loader.load()
        
        strategy = MyStrategy(params)
        engine = BacktestEngine(strategy, initial_capital=300)
        result = engine.run(klines)
        
        results.append({
            "dataset": dataset,
            "return": result["summary"]["total_return"],
            "win_rate": result["summary"]["win_rate"],
            "max_drawdown": result["summary"]["max_drawdown"],
        })
    
    # 输出验证结果
    for r in results:
        print(f"{r['dataset']}: 收益={r['return']:.2f}%, "
              f"胜率={r['win_rate']:.2f}%, 回撤={r['max_drawdown']:.2f}%")


if __name__ == "__main__":
    verify_on_multiple_datasets()
```

### 4.2 运行验证

```bash
# 验证最佳参数
python ai/verification/my_strategy/verify_best_params.py

# 长期验证
python ai/verification/my_strategy/verify_long_term.py

# 市场环境验证
python ai/verification/my_strategy/verify_market_regimes.py
```

---

## 步骤 5: 更新策略配置

验证通过后，将最佳参数更新到策略配置文件：

```bash
# 查看最佳参数
cat ai/optimization/my_strategy/best_params.json

# 手动更新到 strategies/my_strategy/config.json
# 或使用脚本自动更新
```

---

## ✅ 优化检查清单

- [ ] 定义合理的搜索空间
- [ ] 设置适当的约束条件
- [ ] 运行足够多的trials（至少100次）
- [ ] 在样本外数据验证
- [ ] 在不同市场环境验证
- [ ] 参数值符合直觉
- [ ] 更新策略配置文件

---

## ⚠️ 注意事项

1. **过拟合警告**: 优化容易导致过拟合，务必使用样本外验证
2. **搜索空间**: 参数范围要合理，过大的范围会降低效率
3. **目标函数**: 不要只优化收益，要考虑风险指标
4. **稳健性**: 选择在多个场景下都表现稳定的参数，而非单一最优
5. **计算资源**: 优化可能需要较长时间，考虑使用并行计算
