---
description: 新增一个策略的完整流程
---

# 新增策略工作流

本文档定义了新增一个交易策略的标准化流程。

## 📁 目录结构规范

新增策略 `{strategy_name}` 时，在 `freqtrade_bot/my_strategies/` 创建目录：

```
freqtrade_bot/                   # 工作目录
├── my_strategies/
│   └── {strategy_name}/       # 新策略目录
│       ├── __init__.py
│       ├── strategy.py        # 策略核心代码
│       ├── backtest.py        # 回测脚本
│       └── bot.py             # 实盘Bot（可选）
│
└── utils/                     # 共享工具

# 数据在上层目录
crypto_strategy_trading/data/    # 历史数据
```

---

## 步骤 1: 创建策略目录

```bash
# 在 freqtrade_bot 目录下操作
cd freqtrade_bot

STRATEGY_NAME="my_new_strategy"
mkdir -p my_strategies/${STRATEGY_NAME}
touch my_strategies/${STRATEGY_NAME}/__init__.py
```

---

## 步骤 2: 编写策略代码

在 `my_strategies/{strategy_name}/strategy.py` 中实现：

```python
# my_strategies/my_new_strategy/strategy.py
import pandas as pd
import numpy as np

class MyNewStrategy:
    """策略核心逻辑"""
    
    def __init__(self, params: dict):
        self.params = params
        
    def calculate_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """计算技术指标"""
        # 你的指标计算逻辑
        return df
    
    def generate_signal(self, df: pd.DataFrame, i: int) -> str:
        """生成交易信号: 'buy', 'sell', 或 'hold'"""
        # 你的信号逻辑
        return "hold"
```

---

## 步骤 3: 创建回测脚本

在 `my_strategies/{strategy_name}/backtest.py` 中编写：

```python
# my_strategies/my_new_strategy/backtest.py
import pandas as pd
import os

DATA_DIR = "/path/to/crypto_strategy_trading/data"  # 数据在上层目录
INITIAL_CAPITAL = 300.0

def load_data(symbol):
    """加载数据"""
    path = os.path.join(DATA_DIR, f"{symbol}-5m-merged.csv")
    return pd.read_csv(path)

def run_backtest(df):
    """运行回测"""
    # 你的回测逻辑
    pass

def main():
    df = load_data("DOGEUSDT")
    run_backtest(df)

if __name__ == "__main__":
    main()
```

---

## 步骤 4: 运行回测验证

### 4.1 准备数据
```bash
# 下载数据 (如果尚未下载)
# 示例：下载 DOGEUSDT 5分钟数据 (2020年-2025年)
python scripts/download_binance_data.py --symbol DOGEUSDT --timeframe 5m --start-year 2020
```

### 4.2 运行脚本
```bash
# 在 freqtrade_bot 目录下操作
cd freqtrade_bot
python my_strategies/my_new_strategy/backtest.py
```

---

## 步骤 5: 创建实盘Bot（可选）

在 `my_strategies/{strategy_name}/bot.py` 中实现实盘交易。

---

## ✅ 检查清单

- [ ] `my_strategies/{name}/strategy.py` - 策略主逻辑
- [ ] `my_strategies/{name}/backtest.py` - 回测脚本
- [ ] 回测通过，结果符合预期
- [ ] `my_strategies/{name}/bot.py` - 实盘Bot（可选）
