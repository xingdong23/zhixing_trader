# 稳健盈利策略 - 快速开始

## 🚀 快速开始

### 1. 安装依赖

```bash
cd bitcoin_trader
pip install -r requirements.txt
```

### 2. 运行示例

```bash
python examples/steady_profit_example.py
```

### 3. 在你的代码中使用

```python
from app.core.strategies import SteadyProfitStrategy

# 创建策略
strategy = SteadyProfitStrategy()

# 准备K线数据
klines = exchange.get_klines("BTCUSDT", "1d", limit=200)

# 生成信号
signal = strategy.analyze(klines)

if signal['signal'] == 'buy':
    print(f"买入信号: {signal['reason']}")
    print(f"仓位: {signal['position_ratio']:.2%}")
    print(f"止损: {signal['stop_loss']}")
```

## 📚 完整文档

详细文档请查看: [STEADY_PROFIT_STRATEGY.md](docs/STEADY_PROFIT_STRATEGY.md)

## 🎯 策略核心

1. **三线定趋势**: 日线→4H→15M
2. **仓位管理**: 账户1% × 趋势系数
3. **三重止损**: ATR/斐波那契/单日回撤
4. **金字塔止盈**: 50%→30%→追踪止损
5. **情绪反向**: 恐慌做多，贪婪做空

## 📊 参数配置

### 保守型（新手推荐）
```python
{
    "base_position_ratio": 0.005,  # 0.5%仓位
    "max_daily_loss": 0.02,        # 2%回撤
}
```

### 标准型（默认）
```python
{
    "base_position_ratio": 0.01,   # 1%仓位
    "max_daily_loss": 0.03,        # 3%回撤
}
```

### 激进型（有经验）
```python
{
    "base_position_ratio": 0.02,   # 2%仓位
    "max_daily_loss": 0.05,        # 5%回撤
}
```

## ⚠️ 风险提示

- ✅ 严格执行止损
- ✅ 控制仓位大小
- ✅ 遵守单日回撤限制
- ❌ 不要重仓
- ❌ 不要情绪化交易
- ❌ 不要忽略止损

## 📞 帮助

- 文档: `docs/STEADY_PROFIT_STRATEGY.md`
- 代码: `app/core/strategies/steady_profit_strategy.py`
- 示例: `examples/steady_profit_example.py`

---

**记住: 稳健盈利的核心是"稳"，不是"快"！**

