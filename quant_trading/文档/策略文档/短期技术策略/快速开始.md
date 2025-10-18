# 短线技术策略 - 快速开始

## 🚀 3分钟上手

### 第1步：理解策略（1分钟）

这是一套**短线技术选股策略**，包含6个稳赚战法：

| 战法 | 持仓 | 预期收益 | 胜率 |
|------|------|----------|------|
| 1. 均线多头+MACD | 3天 | +15% | 65% |
| 2. 回踩年线企稳 | 30天 | +20% | 80%+ |
| 3. 双底突破 | 15天 | +18% | 70% |
| 4. 跳空高开缩量 | 1天 | +8% | 60%+ |
| 5. 圆弧顶（卖出） | 立即 | -10% | 75% |
| 6. 三阳开泰 | 1天 | +8% | 70%+ |

---

### 第2步：测试策略（1分钟）

```bash
cd /Users/chengzheng/workspace/chuangxin/zhixing_trader/zhixing_backend

# 运行测试
python scripts/test_short_term_strategy.py --mode=all
```

---

### 第3步：实战使用（1分钟）

```python
from app.core.strategy.short_term_technical import ShortTermTechnicalStrategy
import pandas as pd

# 1. 创建策略
strategy = ShortTermTechnicalStrategy()

# 2. 准备K线数据（从数据库或API）
klines = pd.DataFrame({
    'time': [...],
    'open': [...],
    'high': [...],
    'low': [...],
    'close': [...],
    'volume': [...],
})

# 3. 扫描股票
result = strategy.scan_stock('AAPL', klines)

# 4. 查看结果
print(strategy.format_signal_report(result))
```

---

## 📊 输出示例

```
============================================================
股票: AAPL
============================================================

🟢 信号类型: BUY
📊 形态: 均线多头+MACD红柱
💪 置信度: 75.3%
📝 原因: 均线多头排列，MACD红柱连续3天放大

交易参数:
  入场价: $150.00
  止损价: $139.50 (-7.0%)
  止盈价: $172.50 (+15.0%)
  持有天数: 3天

详细数据:
  ma5: 151.23
  ma10: 148.56
  ma20: 145.89
  macd_hist: [0.12, 0.18, 0.25]
============================================================
```

---

## 🎯 核心用法

### 用法1：单只股票扫描

```python
from app.core.strategy.short_term_technical import ShortTermTechnicalStrategy

strategy = ShortTermTechnicalStrategy()
result = strategy.scan_stock('AAPL', klines)

if result['best_signal']:
    signal = result['best_signal']
    print(f"信号: {signal['signal']}")
    print(f"形态: {signal['pattern']}")
    print(f"置信度: {signal['confidence']:.1%}")
    print(f"入场价: ${signal['entry_price']:.2f}")
    print(f"止损价: ${signal['stop_loss']:.2f}")
    print(f"止盈价: ${signal['take_profit']:.2f}")
```

### 用法2：批量扫描

```python
# 准备多只股票数据
stocks_klines = {
    'AAPL': klines_aapl,
    'TSLA': klines_tsla,
    'NVDA': klines_nvda,
    # ... 更多股票
}

# 批量扫描
scan_result = strategy.scan_stocks_batch(stocks_klines)

# 获取Top 10推荐
top_picks = strategy.get_top_picks(scan_result, top_n=10)

for stock in top_picks:
    print(strategy.format_signal_report(stock))
```

### 用法3：集成到数据库

```python
from app.repositories import KLineRepository

# 从数据库获取K线
repo = KLineRepository()
klines_data = repo.get_klines_by_code('AAPL', '1D', limit=300)

# 转换为DataFrame
import pandas as pd
klines = pd.DataFrame([
    {
        'time': k.time_key,
        'open': k.open_price,
        'high': k.high_price,
        'low': k.low_price,
        'close': k.close_price,
        'volume': k.volume,
    }
    for k in klines_data
])

# 扫描
result = strategy.scan_stock('AAPL', klines)
```

---

## 🔥 常见场景

### 场景1：每日选股

```python
# 早上开盘前运行

strategy = ShortTermTechnicalStrategy()

# 获取你的股票池
stock_list = ['AAPL', 'TSLA', 'NVDA', ...]  # 你的自选股

# 批量扫描
stocks_klines = {}
for code in stock_list:
    klines = get_klines(code)  # 你的数据获取函数
    stocks_klines[code] = klines

scan_result = strategy.scan_stocks_batch(stocks_klines)

# 获取买入信号
buy_signals = scan_result['buy_signals']

print(f"今日推荐 {len(buy_signals)} 只股票：")
for stock in buy_signals[:5]:  # Top 5
    signal = stock['best_signal']
    print(f"  {stock['code']}: {signal['pattern']} (置信度{signal['confidence']:.0%})")
```

### 场景2：持仓监控

```python
# 监控你的持仓股票

# 你的持仓
holdings = {
    'AAPL': {'cost': 145.0, 'shares': 100},
    'TSLA': {'cost': 250.0, 'shares': 50},
}

strategy = ShortTermTechnicalStrategy()

for code, position in holdings.items():
    klines = get_klines(code)
    result = strategy.scan_stock(code, klines)
    
    # 检查卖出信号
    if result['best_signal'] and result['best_signal']['signal'] == 'SELL':
        print(f"⚠️ {code} 出现卖出信号: {result['best_signal']['reason']}")
    
    # 检查避坑规则
    if result.get('avoid'):
        print(f"⚠️ {code} 触发避坑: {result['avoid_reason']}")
```

### 场景3：自动化交易（伪代码）

```python
# 结合交易接口实现自动化

strategy = ShortTermTechnicalStrategy()

while True:
    # 扫描股票池
    scan_result = strategy.scan_stocks_batch(stocks_klines)
    
    # 获取高置信度买入信号
    for stock in scan_result['buy_signals']:
        signal = stock['best_signal']
        
        if signal['confidence'] > 0.75:  # 高置信度
            # 自动下单（你需要实现这个函数）
            place_order(
                symbol=stock['code'],
                action='BUY',
                quantity=calculate_quantity(signal),
                stop_loss=signal['stop_loss'],
                take_profit=signal['take_profit'],
            )
    
    # 检查持仓止损止盈
    check_positions()
    
    # 等待下一个周期
    time.sleep(3600)  # 1小时
```

---

## 💡 使用建议

### ✅ 正确用法

1. **组合使用战法**
   ```python
   # 多个信号叠加，置信度更高
   if len(result['signals']) >= 2:
       print("多重确认，可以加仓")
   ```

2. **严格止损**
   ```python
   # 自动设置止损单
   if signal['stop_loss']:
       set_stop_loss(signal['stop_loss'])
   ```

3. **仓位控制**
   ```python
   # 根据置信度分配仓位
   if signal['confidence'] > 0.8:
       position_size = 0.3  # 30%
   elif signal['confidence'] > 0.65:
       position_size = 0.2  # 20%
   else:
       position_size = 0.1  # 10%
   ```

### ❌ 错误用法

1. **不看大盘环境**
   - ❌ 熊市中盲目买入
   - ✅ 结合大盘趋势判断

2. **不严格止损**
   - ❌ 亏损了死扛
   - ✅ 触发止损立即执行

3. **满仓单个股票**
   - ❌ 把全部资金买一只股票
   - ✅ 分散3-5只股票

---

## 📁 文件位置

```
/Users/chengzheng/workspace/chuangxin/zhixing_trader/zhixing_backend/app/core/strategy/short_term_technical/
├── __init__.py              # 模块入口
├── strategy.py              # 主策略类 ⭐
├── pattern_detectors.py     # 形态检测器
├── README.md                # 完整文档
├── QUICK_START.md           # 本文档 ⭐
├── STRATEGY_DETAILS.md      # 详细原理
└── examples/
    └── basic_usage.py       # 使用示例 ⭐
```

---

## 🧪 测试脚本

```bash
cd /Users/chengzheng/workspace/chuangxin/zhixing_trader/zhixing_backend

# 测试所有战法
python scripts/test_short_term_strategy.py --mode=all

# 测试单个战法
python scripts/test_short_term_strategy.py --mode=single --pattern=ma_macd

# 测试批量扫描
python scripts/test_short_term_strategy.py --mode=batch

# 运行使用示例
python app/core/strategy/short_term_technical/examples/basic_usage.py
```

---

## 📚 进一步学习

### 基础理解
1. **README.md** - 策略概述和使用指南
2. **本文档** - 快速上手

### 深入原理
3. **STRATEGY_DETAILS.md** - 每个战法的详细原理
4. **源代码注释** - 实现细节

### 实战技巧
5. **examples/basic_usage.py** - 使用示例
6. **测试脚本** - 验证效果

---

## ⚠️ 重要提醒

1. **数据要求**
   - K线数据至少60天（战法1-6）
   - 年线战法需要260天（战法2）
   - 数据必须包含：time, open, high, low, close, volume

2. **市场适用性**
   - A股：完全适用
   - 美股：完全适用
   - 港股：完全适用
   - 加密货币：需调整参数

3. **风险控制**
   - 必须设置止损
   - 单只股票仓位≤30%
   - 总仓位≤80%
   - 预留应急资金

4. **回测验证**
   - 先在历史数据上回测
   - 再在模拟盘测试
   - 最后小资金实盘
   - 确认有效后加大资金

---

## 🎓 学习路径

### Week 1：理解原理
- 阅读 README.md
- 阅读 STRATEGY_DETAILS.md
- 理解每个战法的逻辑

### Week 2：运行测试
- 运行测试脚本
- 查看检测结果
- 对比真实股票

### Week 3：模拟交易
- 选10-20只股票
- 每天扫描一次
- 记录信号和结果

### Week 4：实盘验证
- 小资金试水
- 严格执行止损
- 总结经验教训

---

## 🆘 常见问题

### Q：为什么检测不到信号？

**A：** 可能原因：
1. 数据不足（<60天）
2. 当前没有符合条件的形态
3. 形态不完美（80%符合才触发）

### Q：置信度多少可以买入？

**A：** 建议：
- <60%：不建议（观望）
- 60-75%：可以（小仓位）
- >75%：推荐（标准仓位）
- >85%：强烈推荐（可加仓）

### Q：可以同时用多个战法吗？

**A：** 可以！多个信号叠加置信度更高：
```python
if len(result['signals']) >= 2:
    print("多重确认，置信度提升")
```

### Q：如何处理避坑信号？

**A：** 立即停止关注：
```python
if result.get('avoid'):
    print("避开这只股票")
    continue  # 跳过
```

---

## 📞 支持

**问题反馈**：查看完整文档  
**使用示例**：`examples/basic_usage.py`  
**测试脚本**：`scripts/test_short_term_strategy.py`

---

**开始你的短线交易之旅！** 🚀📈💰

