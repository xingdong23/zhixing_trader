# 📊 Unified Backtesting - 统一回测模块

专业的统一回测系统，支持股票和加密货币策略的历史数据回测。

---

## 🎯 核心特性

### ✨ 主要功能
- ✅ **统一接口** - 支持股票和加密货币的统一回测接口
- ✅ **多策略支持** - 支持各种交易策略的回测
- ✅ **性能分析** - 完整的回测性能指标分析
- ✅ **可视化** - 回测结果可视化展示
- 🔄 **实时监控** - 回测过程实时监控（待开发）

### 📊 支持的资产类型
- **股票** - 美股、A股等股票市场
- **加密货币** - BTC、ETH等加密货币
- **期货** - 期货合约（待支持）
- **期权** - 期权合约（待支持）

---

## 🏗️ 架构设计

### 核心模块
```
unified_backtesting/
├── core/                    # 核心引擎
│   ├── engine.py           # 回测引擎
│   ├── portfolio.py        # 投资组合管理
│   ├── order.py            # 订单管理
│   └── position.py         # 持仓管理
├── data/                    # 数据管理
│   ├── data_loader.py      # 数据加载器
│   ├── stock_data.py       # 股票数据
│   └── crypto_data.py      # 加密货币数据
├── strategy/                # 策略接口
│   ├── base.py             # 策略基类
│   └── adapter.py          # 策略适配器
├── analysis/                # 性能分析
│   ├── metrics.py          # 性能指标
│   ├── risk.py             # 风险分析
│   └── report.py           # 报告生成
├── visualization/           # 可视化
│   ├── charts.py           # 图表生成
│   └── dashboard.py        # 仪表板
└── utils/                   # 工具函数
    ├── logger.py           # 日志
    └── helpers.py          # 辅助函数
```

---

## 🚀 快速开始

### 1. 安装依赖
```bash
cd unified_backtesting
pip install -r requirements.txt
```

### 2. 股票策略回测示例
```python
from unified_backtesting import BacktestEngine
from unified_backtesting.data import StockDataLoader
from unified_backtesting.strategy import StrategyAdapter

# 加载数据
data_loader = StockDataLoader()
data = data_loader.load("AAPL", start="2023-01-01", end="2024-01-01")

# 创建回测引擎
engine = BacktestEngine(
    initial_capital=100000,
    commission=0.001,  # 0.1% 手续费
    slippage=0.0005    # 0.05% 滑点
)

# 加载策略
strategy = StrategyAdapter.from_stock_strategy("short_term_technical")

# 运行回测
results = engine.run(data, strategy)

# 查看结果
print(f"总收益率: {results.total_return:.2%}")
print(f"年化收益率: {results.annual_return:.2%}")
print(f"夏普比率: {results.sharpe_ratio:.2f}")
print(f"最大回撤: {results.max_drawdown:.2%}")
```

### 3. 加密货币策略回测示例
```python
from unified_backtesting import BacktestEngine
from unified_backtesting.data import CryptoDataLoader
from unified_backtesting.strategy import StrategyAdapter

# 加载数据
data_loader = CryptoDataLoader()
data = data_loader.load("BTC-USDT", start="2023-01-01", end="2024-01-01")

# 创建回测引擎
engine = BacktestEngine(
    initial_capital=10000,
    commission=0.001,
    leverage=2.0  # 2倍杠杆
)

# 加载策略
strategy = StrategyAdapter.from_crypto_strategy("ema_simple_trend")

# 运行回测
results = engine.run(data, strategy)

# 生成报告
results.generate_report("backtest_report.html")
```

---

## 📊 核心类说明

### BacktestEngine - 回测引擎
负责整个回测流程的执行和管理。

**主要方法**:
- `run()` - 运行回测
- `add_strategy()` - 添加策略
- `set_data()` - 设置数据
- `get_results()` - 获取结果

### Portfolio - 投资组合
管理资金、持仓和订单。

**主要方法**:
- `buy()` - 买入
- `sell()` - 卖出
- `get_positions()` - 获取持仓
- `get_value()` - 获取总价值

### DataLoader - 数据加载器
统一的数据加载接口。

**主要方法**:
- `load()` - 加载数据
- `preprocess()` - 数据预处理
- `validate()` - 数据验证

### PerformanceAnalyzer - 性能分析器
计算各种回测性能指标。

**主要指标**:
- 总收益率
- 年化收益率
- 夏普比率
- 最大回撤
- 胜率
- 盈亏比
- 交易次数

---

## 🔧 高级功能

### 多策略组合回测
```python
# 创建多策略组合
engine = BacktestEngine(initial_capital=100000)

# 添加多个策略
engine.add_strategy("strategy_1", weight=0.5)
engine.add_strategy("strategy_2", weight=0.3)
engine.add_strategy("strategy_3", weight=0.2)

# 运行组合回测
results = engine.run_portfolio(data)
```

### 参数优化
```python
from unified_backtesting.optimization import ParameterOptimizer

# 定义参数范围
param_ranges = {
    "rsi_period": range(10, 20),
    "rsi_oversold": range(20, 35),
    "rsi_overbought": range(65, 80)
}

# 创建优化器
optimizer = ParameterOptimizer(engine, strategy)

# 运行优化
best_params = optimizer.optimize(data, param_ranges)
print(f"最优参数: {best_params}")
```

### 蒙特卡洛模拟
```python
from unified_backtesting.simulation import MonteCarloSimulator

# 创建模拟器
simulator = MonteCarloSimulator(engine, strategy)

# 运行1000次模拟
results = simulator.run(data, n_simulations=1000)

# 查看统计结果
print(f"平均收益率: {results.mean_return:.2%}")
print(f"收益率标准差: {results.std_return:.2%}")
print(f"95%置信区间: [{results.ci_lower:.2%}, {results.ci_upper:.2%}]")
```

---

## 📈 性能指标说明

### 收益指标
- **总收益率**: (期末资金 - 期初资金) / 期初资金
- **年化收益率**: 总收益率 / 年数
- **累计收益**: 每日收益的累计

### 风险指标
- **最大回撤**: 从峰值到谷底的最大跌幅
- **波动率**: 收益率的标准差
- **下行波动率**: 负收益率的标准差

### 风险调整收益
- **夏普比率**: (年化收益率 - 无风险利率) / 年化波动率
- **索提诺比率**: (年化收益率 - 无风险利率) / 下行波动率
- **卡玛比率**: 年化收益率 / 最大回撤

### 交易指标
- **胜率**: 盈利交易次数 / 总交易次数
- **盈亏比**: 平均盈利 / 平均亏损
- **平均持仓时间**: 所有交易的平均持仓时长

---

## 🎨 可视化功能

### 生成回测报告
```python
# 生成HTML报告
results.generate_report("report.html")

# 生成PDF报告
results.generate_report("report.pdf", format="pdf")
```

### 自定义图表
```python
from unified_backtesting.visualization import ChartBuilder

# 创建图表构建器
builder = ChartBuilder(results)

# 添加图表
builder.add_equity_curve()      # 资金曲线
builder.add_drawdown_chart()    # 回撤图
builder.add_returns_distribution()  # 收益分布
builder.add_trade_analysis()    # 交易分析

# 保存图表
builder.save("charts.html")
```

---

## 🔄 与其他模块的集成

### 股票策略集成
```python
# 从 stock_strategy_trading 导入策略
from stock_strategy_trading.app.core.strategy import ShortTermTechnicalStrategy

# 使用适配器转换
strategy = StrategyAdapter.from_stock_strategy(ShortTermTechnicalStrategy)

# 运行回测
results = engine.run(data, strategy)
```

### 加密货币策略集成

```python
# 从 crypto_strategy_trading 导入策略
from crypto_strategy_trading import EMASimpleTrendStrategy

# 使用适配器转换
strategy = StrategyAdapter.from_crypto_strategy(EMASimpleTrendStrategy)

# 运行回测
results = engine.run(data, strategy)
```

---

## 📝 开发路线图

### 当前版本 (v0.1) ✅
- [x] 基础回测引擎
- [x] 投资组合管理
- [x] 性能指标计算
- [x] 基础可视化

### 下一版本 (v0.2) 🔄
- [ ] 参数优化功能
- [ ] 蒙特卡洛模拟
- [ ] 多策略组合
- [ ] 高级风险指标

### 未来计划 📋
- [ ] 实时回测
- [ ] 分布式回测
- [ ] 机器学习集成
- [ ] 云端部署

---

## 🛠️ 技术栈

- **语言**: Python 3.9+
- **数据处理**: Pandas, NumPy
- **可视化**: Plotly, Matplotlib
- **性能**: Numba, Cython
- **测试**: Pytest

---

## 📄 许可证

MIT License

---

**最后更新**: 2025-11-05  
**版本**: v0.1  
**状态**: 🚧 开发中
