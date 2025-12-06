---
description: 新增一个策略的完整流程
---

# 新增策略工作流

本文档定义了新增一个交易策略的标准化流程，包括文件放置位置和开发步骤。

## 📁 目录结构规范

新增一个策略 `{strategy_name}` 时，需要在以下目录创建相应文件：

```
crypto_strategy_trading/
├── strategies/{strategy_name}/       # 策略核心代码
│   ├── __init__.py
│   ├── strategy.py                   # 策略主逻辑
│   └── config.json                   # 策略默认参数配置
│
├── backtest/
│   ├── configs/{strategy_name}.json  # 回测配置文件
│   └── scripts/run_{strategy_name}.py # 专用回测脚本（可选）
│
├── live_trading/{strategy_name}/     # 实盘交易代码
│   ├── __init__.py
│   ├── trader.py                     # 实盘交易执行器
│   └── start.sh                      # 启动脚本（可选）
│
├── ai/optimization/{strategy_name}/  # 参数优化代码（可选）
│   ├── __init__.py
│   └── optuna_{strategy_name}.py     # Optuna优化脚本
│
└── ai/verification/{strategy_name}/  # 验证脚本（可选）
    ├── __init__.py
    └── verify_*.py                   # 各种验证脚本
```

---

## 步骤 1: 创建策略目录结构

```bash
# 替换 {strategy_name} 为你的策略名称，如 my_trend
STRATEGY_NAME="my_trend"

# 创建策略核心目录
mkdir -p strategies/${STRATEGY_NAME}
touch strategies/${STRATEGY_NAME}/__init__.py

# 创建实盘目录
mkdir -p live_trading/${STRATEGY_NAME}
touch live_trading/${STRATEGY_NAME}/__init__.py
```

---

## 步骤 2: 编写策略核心代码

在 `strategies/{strategy_name}/strategy.py` 中实现策略逻辑：

```python
# strategies/{strategy_name}/strategy.py
from typing import Dict, Any, List

class MyTrendStrategy:
    """策略类必须实现以下接口"""
    
    def __init__(self, parameters: Dict[str, Any]):
        """初始化策略参数"""
        self.parameters = parameters
        self.position = None
        self.entry_price = 0
        
    def analyze(self, klines: List[Dict]) -> Dict[str, Any]:
        """
        分析K线数据，返回交易信号
        
        参数:
            klines: K线列表，包含 open, high, low, close, volume 等字段
            
        返回:
            {
                "signal": "buy" | "sell" | "hold",
                "price": float,
                "reason": str,
                "size": float (可选)
            }
        """
        # 你的策略逻辑
        return {"signal": "hold", "reason": "等待信号"}
    
    def update_position(self, trade_result: Dict):
        """更新持仓状态"""
        pass
```

---

## 步骤 3: 创建策略配置文件

在 `strategies/{strategy_name}/config.json` 中定义默认参数：

```json
{
  "strategy_name": "my_trend",
  "version": "1.0.0",
  
  "trading": {
    "capital": 300.0,
    "leverage": 3.0,
    "max_position_ratio": 0.5
  },
  
  "entry": {
    "ema_fast": 5,
    "ema_slow": 20,
    "rsi_threshold": 30
  },
  
  "exit": {
    "stop_loss_pct": 0.03,
    "take_profit_pct": 0.08,
    "trailing_stop_pct": 0.02
  },
  
  "filters": {
    "min_volume": 1000000,
    "session_filter_enabled": false
  }
}
```

---

## 步骤 4: 创建回测配置

在 `backtest/configs/{strategy_name}.json` 中创建回测配置：

```json
{
  "backtest_name": "My Trend Strategy Backtest",
  "description": "测试 My Trend 策略在 DOGEUSDT 上的表现",
  
  "data": {
    "source": "../data/DOGEUSDT-5m-merged.csv",
    "timeframe": "5m"
  },
  
  "strategy": {
    "name": "my_trend",
    "module": "strategies.my_trend.strategy",
    "class": "MyTrendStrategy",
    "config_file": "../../strategies/my_trend/config.json"
  },
  
  "backtest_settings": {
    "initial_capital": 300.0,
    "window_size": 200,
    "commission_rate": 0.0004
  },
  
  "output": {
    "save_trades": true,
    "save_equity_curve": true
  }
}
```

---

## 步骤 5: 运行回测验证

```bash
# 运行回测
python backtest/run_backtest.py --config backtest/configs/my_trend.json

# 查看结果
ls backtest/results/
```

---

## 步骤 6: 创建实盘交易器

在 `live_trading/{strategy_name}/trader.py` 中实现实盘交易：

```python
# live_trading/{strategy_name}/trader.py
from live_trading.common.base_trader import BaseTrader
from strategies.my_trend.strategy import MyTrendStrategy

class MyTrendTrader(BaseTrader):
    """实盘交易执行器"""
    
    def __init__(self, config_path: str):
        super().__init__(config_path)
        self.strategy = MyTrendStrategy(self.config)
    
    def run(self):
        """主运行循环"""
        while True:
            klines = self.fetch_klines()
            signal = self.strategy.analyze(klines)
            
            if signal["signal"] == "buy":
                self.open_long(signal)
            elif signal["signal"] == "sell":
                self.close_position(signal)
            
            self.sleep(self.interval)
```

---

## 步骤 7: 创建启动脚本（可选）

在项目根目录创建启动脚本：

```bash
# run_{strategy_name}.sh
#!/bin/bash
cd /path/to/crypto_strategy_trading
source .venv/bin/activate
python -m live_trading.my_trend.trader --config strategies/my_trend/config.json
```

---

## ✅ 检查清单

- [ ] `strategies/{name}/strategy.py` - 策略主逻辑
- [ ] `strategies/{name}/config.json` - 策略参数配置
- [ ] `backtest/configs/{name}.json` - 回测配置
- [ ] 回测通过，结果符合预期
- [ ] `live_trading/{name}/trader.py` - 实盘交易器
- [ ] 模拟盘测试1周通过
- [ ] 启动脚本创建完成
