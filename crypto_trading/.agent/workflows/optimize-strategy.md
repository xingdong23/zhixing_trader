---
description: 调优/优化一个策略的参数
---

# 策略优化工作流

本文档定义了优化策略参数的标准化流程。

## 📁 相关目录

```
freqtrade_bot/                   # 工作目录
├── my_strategies/{strategy_name}/
│   ├── strategy.py            # 策略代码
│   └── backtest.py            # 回测脚本（用于优化验证）

crypto_strategy_trading/data/    # 历史数据
```

---

## 步骤 1: 定义参数搜索空间

在回测脚本中定义要优化的参数：

```python
# 参数搜索空间示例
PARAM_GRID = {
    "ema_fast": [5, 10, 15, 20],
    "ema_slow": [20, 30, 50],
    "stop_loss_pct": [0.01, 0.02, 0.03],
    "take_profit_pct": [0.03, 0.05, 0.10],
}
```

---

## 步骤 2: 运行网格搜索

```python
# 简单网格搜索
from itertools import product

best_score = -float('inf')
best_params = None

for params in product(*PARAM_GRID.values()):
    param_dict = dict(zip(PARAM_GRID.keys(), params))
    
    # 运行回测
    result = run_backtest(param_dict)
    score = result['return'] - result['max_drawdown'] * 0.5
    
    if score > best_score:
        best_score = score
        best_params = param_dict

print(f"最佳参数: {best_params}")
```

---

## 步骤 3: 验证优化结果

```bash
# 在 freqtrade_bot 目录下操作
cd freqtrade_bot

# 使用最佳参数运行回测
python my_strategies/{strategy_name}/backtest.py
```

### 验证要点

- [ ] 在样本外数据验证
- [ ] 在不同市场环境验证
- [ ] 参数值符合直觉

---

## 步骤 4: 更新策略配置

将最佳参数更新到策略配置文件：

```bash
# 更新 config.json
cat my_strategies/{strategy_name}/config.json
```

---

## ⚠️ 注意事项

1. **过拟合警告**: 优化容易导致过拟合，务必使用样本外验证
2. **搜索空间**: 参数范围要合理，过大的范围会降低效率
3. **稳健性**: 选择在多个场景下都表现稳定的参数
