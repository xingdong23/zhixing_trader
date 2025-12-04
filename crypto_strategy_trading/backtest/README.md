# 回测系统

专业的量化交易策略回测系统，支持多策略、多数据源的历史数据回测。

---

## 目录结构

```
backtest/
├── README.md                # 本文档
├── run_backtest.py          # 回测主程序 (单币种/单策略)
│
├── scripts/                 # 专用回测脚本
│   ├── run_fusion_backtest.py       # 融合策略回测 (RS选币 + 南瓜汤)
│   ├── run_multi_coin_verification.py # 多币种批量验证脚本
│   └── run_rs_backtest.py           # 相对强弱套利策略回测
│
├── configs/                 # 配置文件目录
│   ├── candidate/           # 候选配置
│   ├── experimental/        # 实验配置
│   ├── internal/            # 内部配置
│   └── stable/              # 稳定配置
│
├── data/                    # 历史数据目录
│   └── *.csv                # 各种交易对的历史数据
│
├── core/                    # 核心代码目录
│   ├── __init__.py
│   ├── data_loader.py       # 数据加载器
│   ├── backtest_engine.py   # 回测引擎
│   └── performance_analyzer.py  # 性能分析器
│
├── scripts/                 # 数据处理脚本
│   ├── README.md            # 脚本说明文档
│   ├── download_binance_data.py  # 币安数据下载
│   ├── merge_data.py        # 数据合并
│   ├── merge_ethusdt_1h_all.py   # ETHUSDT专用合并
│   ├── resample_data.py     # 数据重采样
│   └── run_ema_backtest_all.sh   # 批量回测脚本
│
└── results/                 # 回测结果目录
    ├── backtest_result_*.json
    └── backtest_report_*.txt
```

---

## 快速开始

### 1. 准备数据

将历史数据CSV文件放入 `data/` 目录：

```bash
backtest/data/ETH-USDT-1m-2025.10.23.csv
```

### 2. 配置回测

编辑 `configs/backtest_config.json`：

```json
{
  "backtest_name": "高频策略回测",
  "data": {
    "source": "data/ETH-USDT-1m-2025.10.23.csv",
    "timeframe": "5m"
  },
  "strategy": {
    "name": "high_frequency",
    "config_file": "../../config/high_frequency.json"
  }
}
```

### 3. 运行回测

```bash
# 使用默认配置
python backtest/run_backtest.py

# 指定配置文件
python backtest/run_backtest.py --config backtest/configs/backtest_config.json
```

---

## 配置文件说明

### backtest_config.json

```json
{
  "backtest_name": "回测名称",
  "description": "回测描述",
  
  "data": {
    "source": "data/数据文件.csv",       // 数据源路径（相对于backtest目录）
    "timeframe": "5m",                   // 回测时间框架
    "resample_from": "1m"                // 原始数据时间框架
  },
  
  "strategy": {
    "name": "策略名称",                  // 策略标识
    "config_file": "../../config/xxx.json"  // 策略配置文件路径
  },
  
  "backtest_settings": {
    "initial_capital": 300.0,            // 初始资金
    "window_size": 200,                  // 滑动窗口大小
    "commission_rate": 0.0004,           // 手续费率（未实现）
    "slippage_rate": 0.0001              // 滑点率（未实现）
  },
  
  "output": {
    "result_file": "results/backtest_result_{timestamp}.json",
    "report_file": "results/backtest_report_{timestamp}.txt",
    "save_trades": true,                 // 是否保存交易明细
    "save_equity_curve": true            // 是否保存权益曲线
  }
}
```

---

## 支持的策略

### 1. 高频短线策略 (high_frequency)

**配置文件**: `config/high_frequency.json`

**特点**:
- 5分钟级别交易
- EMA + RSI + 成交量突破
- 动态止盈止损
- 顺势持有功能
- 时段过滤

**适用场景**: 短线波段交易

---

## 数据格式

### CSV格式要求

```csv
instrument_name,open,high,low,close,vol,vol_ccy,vol_quote,open_time,confirm
ETH-USDT-SWAP,3839.44,3843.58,3836.71,3838.16,23503.2,2350.32,9024127.30277,1761148800000,1
```

**必需字段**:
- `open_time`: 时间戳（毫秒）
- `open`, `high`, `low`, `close`: OHLC价格
- `vol`: 成交量

**支持的时间框架**:
- 1分钟 (1m)
- 5分钟 (5m)
- 15分钟 (15m)
- 1小时 (1h)

---

## 回测结果

### 结果文件

回测完成后会生成以下文件：

```
backtest/results/
├── backtest_result_20251025_203000.json  # 详细结果（JSON）
└── backtest_report_20251025_203000.txt   # 文本报告（未实现）
```

### 结果内容

```json
{
  "summary": {
    "initial_capital": 300.0,
    "final_capital": 315.5,
    "total_pnl": 15.5,
    "total_return": 5.17,
    "total_trades": 10,
    "winning_trades": 6,
    "losing_trades": 4,
    "win_rate": 60.0,
    "avg_win": 4.2,
    "avg_loss": -2.1,
    "profit_factor": 2.0,
    "max_drawdown": 8.5,
    "avg_holding_time": 35.2
  },
  "trades": [...],
  "equity_curve": [...]
}
```

### 评级系统

系统会自动评级（A+ 到 D）：

- **A+ (80-100分)**: 优秀
- **A (70-79分)**: 良好
- **B+ (60-69分)**: 中等偏上
- **B (50-59分)**: 中等
- **C (40-49分)**: 及格
- **D (<40分)**: 需要优化

---

## 使用示例

### 示例1: 基础回测

```bash
python backtest/run_backtest.py
```

### 示例2: 测试不同参数

创建多个配置文件：

```bash
# 保守配置
python backtest/run_backtest.py --config backtest/configs/conservative.json

# 激进配置
python backtest/run_backtest.py --config backtest/configs/aggressive.json
```

### 示例3: 批量回测

```python
import subprocess

configs = [
    'backtest/configs/config1.json',
    'backtest/configs/config2.json',
    'backtest/configs/config3.json'
]

for config in configs:
    subprocess.run(['python', 'backtest/run_backtest.py', '--config', config])
```

---

## 添加新策略

### 1. 创建策略类

```python
# strategies/my_strategy/strategy.py
class MyStrategy:
    def __init__(self, parameters: dict):
        self.parameters = parameters
    
    def analyze(self, klines: list) -> dict:
        # 返回交易信号
        return {"signal": "buy", "price": 100, ...}
    
    def update_position(self, signal: dict):
        # 更新持仓状态
        pass
```

### 2. 创建策略配置

```json
// config/my_strategy.json
{
  "trading": {
    "capital": 300.0,
    "leverage": 3.0
  },
  ...
}
```

### 3. 创建回测配置

```json
// backtest/configs/my_backtest.json
{
  "strategy": {
    "name": "my_strategy",
    "config_file": "../../config/my_strategy.json"
  }
}
```

### 4. 修改回测程序

在 `run_backtest.py` 中导入新策略：

```python
from app.strategies import MyStrategy
```

---

## 常见问题

### Q1: 没有产生任何交易？

**检查项**:
1. 时段过滤是否过于严格
2. 入场条件是否过于苛刻
3. 数据量是否足够（至少200根K线）
4. 数据时间范围是否在允许的交易时段

**解决方案**:
```json
{
  "session_filter": {
    "enabled": false  // 关闭时段过滤
  }
}
```

### Q2: 如何提高回测速度？

1. 减少日志输出级别
2. 减少window_size
3. 使用更少的数据

### Q3: 如何验证回测准确性？

1. 使用已知结果的数据验证
2. 对比实盘交易记录
3. 检查交易逻辑是否正确

---

## 注意事项

⚠️ **回测局限性**

1. **未考虑滑点**: 实盘会有滑点成本
2. **未考虑手续费**: 需要手动计算
3. **流动性假设**: 假设所有订单都能成交
4. **数据质量**: 依赖历史数据准确性

⚠️ **过度拟合风险**

- 不要在同一数据集上反复优化
- 使用样本外数据验证
- 保持参数合理性

⚠️ **实盘差异**

- 回测表现 ≠ 实盘表现
- 建议先用模拟盘验证
- 小资金实盘测试

---

## 开发计划

### 待实现功能

- [ ] 手续费和滑点计算
- [ ] 权益曲线可视化
- [ ] 多策略对比
- [ ] 参数优化器
- [ ] 风险指标扩展（夏普比率、索提诺比率等）
- [ ] 分时段统计分析
- [ ] 交易信号可视化

---

## 技术支持

如有问题，请查看：
- 主文档: `README.md`
- 配置说明: `配置文件说明.md`
- 回测说明: `回测系统说明.md`

---

## 更新日志

### v1.0.0 (2025-10-25)
- ✅ 基础回测功能
- ✅ 配置文件驱动
- ✅ 自动评级系统
- ✅ 高频策略支持
