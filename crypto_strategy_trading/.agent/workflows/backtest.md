---
description: 回测一个策略的完整流程
---

# 回测策略工作流

本文档定义了回测一个交易策略的标准化流程。

## 📁 相关目录

```
crypto_strategy_trading/
├── backtest/
│   ├── run_backtest.py               # 回测主程序
│   ├── configs/                       # 回测配置文件目录
│   │   └── {strategy_name}.json
│   ├── core/                          # 回测引擎核心代码
│   │   ├── backtest_engine.py
│   │   ├── data_loader.py
│   │   └── performance_analyzer.py
│   ├── scripts/                       # 专用回测脚本
│   │   ├── run_martingale_sniper.py
│   │   └── run_pump_hunter.py
│   ├── results/                       # 回测结果输出
│   └── utils/                         # 数据下载和处理工具
│       └── download_binance_data.py
│
├── data/                              # 历史K线数据
│   ├── DOGEUSDT-5m-merged.csv
│   ├── BTCUSDT-1h-merged.csv
│   └── ...
│
└── strategies/{strategy_name}/        # 策略代码和配置
    ├── strategy.py
    └── config.json
```

---

## 步骤 1: 准备历史数据

### 1.1 检查现有数据

```bash
# 查看已有数据
ls data/

# 常见数据文件格式：
# {SYMBOL}-{TIMEFRAME}-merged.csv  (如 DOGEUSDT-5m-merged.csv)
```

### 1.2 下载新数据（如需要）

```bash
# 下载币安数据
cd backtest/utils

# 修改脚本中的参数后运行
python download_binance_data.py

# 或者使用现成的下载脚本
# 参数: symbol, interval, start_date, end_date
```

### 1.3 合并数据

```bash
# 合并多日数据为单个文件
python backtest/utils/merge_data.py
```

---

## 步骤 2: 创建回测配置

在 `backtest/configs/` 目录创建配置文件：

```json
{
  "backtest_name": "策略回测名称",
  "description": "回测描述",
  
  "data": {
    "source": "../data/DOGEUSDT-5m-merged.csv",
    "timeframe": "5m",
    "start_date": "2024-01-01",
    "end_date": "2024-12-31"
  },
  
  "strategy": {
    "name": "strategy_name",
    "module": "strategies.strategy_name.strategy",
    "class": "StrategyClass",
    "config_file": "../../strategies/strategy_name/config.json"
  },
  
  "backtest_settings": {
    "initial_capital": 300.0,
    "window_size": 200,
    "commission_rate": 0.0004,
    "slippage_rate": 0.0001
  },
  
  "output": {
    "save_trades": true,
    "save_equity_curve": true
  }
}
```

---

## 步骤 3: 运行回测

### 3.1 使用通用回测脚本

```bash
# 基本回测命令
python backtest/run_backtest.py --config backtest/configs/your_config.json
```

### 3.2 使用专用回测脚本（如有）

```bash
# Martingale Sniper 策略
python backtest/scripts/run_martingale_sniper.py

# Pump Hunter 策略
python backtest/scripts/run_pump_hunter.py
```

---

## 步骤 4: 分析回测结果

### 4.1 查看结果文件

```bash
# 结果保存在 backtest/results/ 目录
ls backtest/results/

# JSON格式结果
cat backtest/results/backtest_result_*.json

# 文本报告
cat backtest/results/backtest_report_*.txt
```

### 4.2 关键指标

| 指标 | 优秀 | 良好 | 及格 |
|------|------|------|------|
| 总收益率 | > 50% | > 20% | > 0% |
| 胜率 | > 60% | > 50% | > 40% |
| 盈亏比 | > 2.0 | > 1.5 | > 1.0 |
| 最大回撤 | < 10% | < 20% | < 30% |
| 评分 | A+ | A/B+ | B/C |

---

## 步骤 5: 多场景验证

### 5.1 不同时间段回测

```bash
# 2022年（熊市）
python backtest/run_backtest.py --config backtest/configs/strategy_2022.json

# 2023年（震荡）
python backtest/run_backtest.py --config backtest/configs/strategy_2023.json

# 2024年（牛市）
python backtest/run_backtest.py --config backtest/configs/strategy_2024.json
```

### 5.2 多币种验证

```bash
# 创建不同币种的配置文件，修改 data.source 字段
# BTC, ETH, DOGE, SOL 等
```

---

## ✅ 回测检查清单

- [ ] 历史数据充足（至少6个月）
- [ ] 回测配置正确
- [ ] 回测运行无报错
- [ ] 收益率为正
- [ ] 最大回撤可接受（< 20%）
- [ ] 在不同市场环境下测试
- [ ] 样本外数据验证

---

## ⚠️ 注意事项

1. **过拟合风险**: 不要在同一数据上反复优化参数
2. **数据泄露**: 确保样本外验证使用未见过的数据
3. **实盘差异**: 回测结果 ≠ 实盘结果，需考虑滑点和手续费
4. **流动性假设**: 回测假设所有订单都能成交
