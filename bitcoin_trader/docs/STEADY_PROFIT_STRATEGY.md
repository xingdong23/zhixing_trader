# 稳健盈利策略 - 从2万到200万的交易系统

## 📖 策略概述

这是一个基于"三线定趋势"+"仓位管理"+"三重止损"+"金字塔止盈"的完整交易系统。

### 核心理念

> **"稳"字当头 - 保住本金才能长久**

1. **三线定趋势** - 日线定方向 → 4H找结构 → 15M找入场
2. **仓位公式** - 初始仓位=账户1%×趋势强度系数
3. **止损三重锚** - 前高低±1.5ATR / 斐波那契38.2% / 单日最大回撤3%
4. **盈利金字塔** - 分批止盈，移动止损到成本线
5. **情绪反向** - 利用市场恐慌贪婪指标找机会

---

## 🎯 策略逻辑详解

### 1. 三线定趋势

#### 第一线：日线定方向（200日EMA）

```python
# 使用200日均线判断大趋势
if 价格 > EMA200 and EMA200斜率向上:
    趋势 = "上升趋势"
elif 价格 < EMA200 and EMA200斜率向下:
    趋势 = "下降趋势"
else:
    趋势 = "震荡趋势"
```

**操作原则**:
- 上升趋势：只做多，不做空
- 下降趋势：只做空，不做多
- 震荡趋势：结合情绪指标，反向操作

#### 第二线：4小时找结构

寻找以下形态：
- **双底形态** - 看多信号
- **双顶形态** - 看空信号
- **突破形态** - 跟随方向

#### 第三线：15分钟找入场点

使用快慢EMA交叉：
- **金叉** - 快线上穿慢线，做多入场
- **死叉** - 快线下穿慢线，做空入场

### 2. 仓位公式

```python
初始仓位 = 账户总资金 × 1% × 趋势强度系数

趋势强度系数:
- 震荡市: 0.3 (ADX < 25)
- 单边市: 0.8 (ADX >= 25)

限制条件:
- 单笔最大仓位不超过10%
- 即使200万账户，单笔不超过20万
```

**示例**:
```
账户: 100,000 USD
趋势: 单边市 (ADX=30)

初始仓位 = 100,000 × 1% × 0.8 = 800 USD
```

### 3. 止损三重锚

策略会计算三种止损，选择最保守的一个：

#### 基础止损：前高低点 ± 1.5倍ATR

```python
多单止损 = 入场价 - 1.5 × ATR
空单止损 = 入场价 + 1.5 × ATR
```

#### 进阶止损：斐波那契38.2%

```python
回撤位 = 近期高点 - (近期高点 - 近期低点) × 0.382
```

#### 终极防线：单日最大回撤3%

```python
if 今日累计亏损 >= 账户总资金 × 3%:
    停止所有交易，明天再来
```

### 4. 盈利金字塔

分三个阶段止盈：

```python
# 第一目标：盈利50%
if 利润 >= 风险 × 2:
    平仓50%
    止损移至成本线（保证不亏）

# 第二目标：盈利100%
if 利润 >= 风险 × 4:
    平仓30%
    剩余20%用追踪止损

# 追踪止损：保护利润
剩余仓位跟随价格移动止损
```

**实际案例**:
```
入场价: 50,000 USD
止损价: 49,500 USD (风险500 USD)

第一目标: 51,000 USD (利润1,000 = 2×风险)
  - 平仓50%，锁定500利润
  - 止损移至50,000（成本线）

第二目标: 52,000 USD (利润2,000 = 4×风险)
  - 平仓30%，再锁定600利润
  - 剩余20%追踪止损
```

### 5. 情绪反向指标

模拟"恐慌贪婪指数"，由三个指标组成：

```python
情绪评分 = RSI×50% + 成交量变化×30% + 波动率×20%

评分范围: 0-100
- 0-25: 极度恐慌 → 寻找做多机会（反向思维）
- 25-75: 中性 → 跟随趋势
- 75-100: 极度贪婪 → 警惕做空机会（反向思维）
```

---

## 📊 策略参数配置

### 默认参数

```python
parameters = {
    # 仓位管理
    "base_position_ratio": 0.01,      # 基础仓位1%
    "震荡市_系数": 0.3,                # 震荡市系数
    "单边市_系数": 0.8,                # 单边市系数
    "max_single_position": 0.10,      # 最大仓位10%
    
    # 止损参数
    "atr_multiplier": 1.5,            # ATR倍数
    "fibonacci_level": 0.382,         # 斐波那契位
    "max_daily_loss": 0.03,           # 单日最大回撤3%
    
    # 止盈参数
    "first_target_profit": 0.50,      # 第一目标50%
    "first_target_close": 0.50,       # 第一目标平仓比例
    "second_target_profit": 1.00,     # 第二目标100%
    "second_target_close": 0.30,      # 第二目标平仓比例
    "trailing_stop_ratio": 0.20,      # 追踪止损比例
    
    # 技术指标
    "ema_fast": 12,                   # 快速均线
    "ema_slow": 26,                   # 慢速均线
    "ema_trend": 200,                 # 趋势均线
    "atr_period": 14,                 # ATR周期
    
    # 情绪指标
    "sentiment_threshold_high": 75,   # 极度贪婪阈值
    "sentiment_threshold_low": 25,    # 极度恐慌阈值
}
```

### 参数调优建议

**保守型**（适合新手）:
```python
{
    "base_position_ratio": 0.005,     # 降至0.5%
    "震荡市_系数": 0.2,
    "max_daily_loss": 0.02,           # 降至2%
}
```

**激进型**（有经验）:
```python
{
    "base_position_ratio": 0.02,      # 提升至2%
    "单边市_系数": 1.0,
    "max_daily_loss": 0.05,           # 提升至5%
}
```

---

## 💻 代码使用示例

### 基础使用

```python
from app.core.strategies import SteadyProfitStrategy

# 创建策略实例
strategy = SteadyProfitStrategy()

# 准备K线数据（需要足够的历史数据）
klines = [
    {
        "timestamp": 1234567890,
        "open": 50000,
        "high": 51000,
        "low": 49500,
        "close": 50500,
        "volume": 1000
    },
    # ... 更多K线数据（至少200根）
]

# 分析生成信号
signal = strategy.analyze(klines)

print(f"交易信号: {signal['signal']}")
print(f"价格: {signal.get('price')}")
print(f"原因: {signal['reason']}")

if signal['signal'] != 'hold':
    print(f"仓位比例: {signal['position_ratio']:.2%}")
    print(f"止损价: {signal['stop_loss']}")
    print(f"止盈目标: {signal['take_profit_levels']}")
```

### 自定义参数

```python
# 使用自定义参数
custom_params = {
    "base_position_ratio": 0.02,      # 2%基础仓位
    "max_daily_loss": 0.05,           # 5%单日回撤
    "atr_multiplier": 2.0,            # 更宽的止损
}

strategy = SteadyProfitStrategy(parameters=custom_params)
```

### 完整交易流程

```python
from app.core.strategies import SteadyProfitStrategy
from app.core.exchanges import BinanceExchange

# 1. 初始化
strategy = SteadyProfitStrategy()
exchange = BinanceExchange()

# 2. 获取K线数据
klines_daily = exchange.get_klines("BTCUSDT", "1d", limit=200)
klines_4h = exchange.get_klines("BTCUSDT", "4h", limit=100)
klines_15m = exchange.get_klines("BTCUSDT", "15m", limit=100)

# 3. 合并数据（策略内部会分析不同周期）
all_klines = klines_daily + klines_4h + klines_15m

# 4. 生成信号
signal = strategy.analyze(all_klines)

# 5. 执行交易
if signal['signal'] == 'buy':
    # 计算具体仓位
    account_balance = exchange.get_balance("USDT")
    position_size = account_balance * signal['position_ratio']
    
    # 下单
    order = exchange.place_order(
        symbol="BTCUSDT",
        side="BUY",
        amount=position_size / signal['price'],
        price=signal['price'],
        stop_loss=signal['stop_loss'],
        take_profit=signal['take_profit_levels'][0]['price']
    )
    
    print(f"买入成功: {order}")
```

---

## 📈 回测示例

```python
import pandas as pd
from app.core.strategies import SteadyProfitStrategy

def backtest_strategy(klines_data, initial_capital=20000):
    """
    回测稳健盈利策略
    """
    strategy = SteadyProfitStrategy()
    capital = initial_capital
    positions = []
    trade_history = []
    
    # 滚动窗口回测
    for i in range(200, len(klines_data)):
        # 取最近200根K线
        window = klines_data[i-200:i]
        
        # 生成信号
        signal = strategy.analyze(window)
        
        # 模拟交易
        if signal['signal'] == 'buy' and not positions:
            # 开多单
            entry_price = signal['price']
            position_size = capital * signal['position_ratio']
            
            positions.append({
                'type': 'long',
                'entry_price': entry_price,
                'size': position_size,
                'stop_loss': signal['stop_loss'],
                'take_profit': signal['take_profit_levels']
            })
            
            print(f"[{i}] 开多: 价格={entry_price}, 仓位={position_size:.2f}")
        
        elif signal['signal'] == 'sell' and positions:
            # 平仓
            position = positions[0]
            exit_price = signal['price']
            pnl = (exit_price - position['entry_price']) / position['entry_price'] * position['size']
            
            capital += pnl
            trade_history.append({
                'entry': position['entry_price'],
                'exit': exit_price,
                'pnl': pnl,
                'pnl_pct': pnl / position['size']
            })
            
            positions = []
            print(f"[{i}] 平仓: 价格={exit_price}, 盈亏={pnl:.2f}, 收益率={pnl/position['size']:.2%}")
    
    # 统计
    total_trades = len(trade_history)
    win_trades = len([t for t in trade_history if t['pnl'] > 0])
    win_rate = win_trades / total_trades if total_trades > 0 else 0
    
    total_pnl = sum([t['pnl'] for t in trade_history])
    final_return = (capital - initial_capital) / initial_capital
    
    print(f"\n=== 回测结果 ===")
    print(f"初始资金: {initial_capital:.2f}")
    print(f"最终资金: {capital:.2f}")
    print(f"总收益: {total_pnl:.2f} ({final_return:.2%})")
    print(f"总交易次数: {total_trades}")
    print(f"胜率: {win_rate:.2%}")
    
    return {
        'initial_capital': initial_capital,
        'final_capital': capital,
        'total_return': final_return,
        'total_trades': total_trades,
        'win_rate': win_rate,
        'trade_history': trade_history
    }
```

---

## ⚠️ 风险提示

### 1. 策略不是圣杯

- 没有100%胜率的策略
- 回撤是正常的，关键是控制幅度
- 市场环境变化可能导致策略失效

### 2. 资金管理至关重要

```
✅ 永远不要重仓
✅ 严格执行止损
✅ 单日亏损达标就休息
❌ 不要情绪化加仓
❌ 不要频繁交易
```

### 3. 参数需要优化

- 不同市场环境需要调整参数
- 建议先小资金测试
- 定期回顾和优化策略

### 4. 技术问题

- 确保数据质量
- 注意滑点和手续费
- 做好异常处理

---

## 🎓 学习建议

### 新手起步

1. **先学习，后实战**
   - 理解每个指标的含义
   - 在模拟盘测试至少1个月
   - 小资金（1000-5000 USD）实盘验证

2. **记录交易日志**
   ```
   - 为什么开仓？
   - 为什么平仓？
   - 计划执行情况？
   - 情绪波动记录？
   ```

3. **持续学习优化**
   - 每周复盘交易
   - 每月统计数据
   - 每季度优化参数

### 进阶提升

1. **结合基本面分析**
   - 关注重大新闻
   - 了解宏观经济
   - 理解市场情绪

2. **多策略组合**
   - 不要只用一个策略
   - 分散风险
   - 平滑收益曲线

3. **心态管理**
   - 接受亏损是常态
   - 不追求完美
   - 保持纪律性

---

## 📞 技术支持

如有问题，请查看：
- 代码: `bitcoin_trader/app/core/strategies/steady_profit_strategy.py`
- 文档: `bitcoin_trader/docs/STEADY_PROFIT_STRATEGY.md`
- 示例: `bitcoin_trader/examples/steady_profit_example.py`

---

**记住：稳健盈利的核心是"稳"，不是"快"！**

保住本金 > 赚取利润 > 追求收益率

