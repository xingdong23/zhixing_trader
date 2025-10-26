# GridBNB-USDT 动态网格交易策略

## 策略简介

GridBNB-USDT 是一个基于 EWMA 波动率的动态网格交易策略，通过智能调整网格大小来适应市场波动，在震荡市场中稳定获利。

## 核心特性

### 1. 动态波动率计算
- **EWMA混合算法**: 70% EWMA + 30% 传统标准差
- **快速响应**: EWMA能够快速捕捉市场波动变化
- **稳定性**: 传统波动率提供基准稳定性

### 2. 自适应网格
- **动态范围**: 网格大小在 1.0% - 4.0% 之间自动调整
- **连续函数**: 平滑调整，避免剧烈变化
- **波动率平滑**: 3周期移动平均减少噪音

### 3. 风险管理
- 最大仓位限制: 90%
- 最小底仓保护: 10%
- 日亏损限制: 5%

## 策略逻辑

```
1. 初始化基准价格
2. 计算市场波动率（EWMA + 传统）
3. 根据波动率动态调整网格大小
4. 价格下跌触及买入网格 → 买入
5. 价格上涨触及卖出网格 → 卖出
6. 更新基准价格，重复循环
```

## 参数说明

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `total_capital` | 1000.0 | 总资金 (USDT) |
| `min_trade_amount` | 20.0 | 最小交易金额 (USDT) |
| `initial_grid` | 2.0 | 初始网格大小 (%) |
| `min_grid_size` | 1.0 | 最小网格 (%) |
| `max_grid_size` | 4.0 | 最大网格 (%) |
| `volatility_window` | 42 | 波动率计算窗口 (K线数) |
| `ewma_alpha` | 0.3 | EWMA平滑系数 |
| `ewma_weight` | 0.7 | EWMA权重 (70%) |
| `volatility_smoothing_window` | 3 | 波动率平滑窗口 |
| `max_position_ratio` | 0.9 | 最大仓位比例 |
| `min_position_ratio` | 0.1 | 最小底仓比例 |
| `max_daily_loss` | 0.05 | 最大日亏损 (5%) |

## 使用示例

### Python代码

```python
from app.strategies.gridbnb_usdt import GridBNBStrategy

# 初始化策略
parameters = {
    "total_capital": 1000.0,
    "min_trade_amount": 20.0,
    "initial_grid": 2.0,
    "min_grid_size": 1.0,
    "max_grid_size": 4.0,
    "volatility_window": 42,
    "ewma_alpha": 0.3,
    "ewma_weight": 0.7,
    "max_position_ratio": 0.9,
    "min_position_ratio": 0.1,
    "max_daily_loss": 0.05
}

strategy = GridBNBStrategy(parameters)

# 分析K线数据
signal = strategy.analyze(klines)

# 处理信号
if signal['signal'] == 'buy':
    print(f"买入信号: {signal['reason']}")
elif signal['signal'] == 'sell':
    print(f"卖出信号: {signal['reason']}")
```

### 回测

```bash
python backtest/run_backtest.py --config backtest/configs/gridbnb_backtest.json
```

## 适用场景

✅ **适合**:
- 震荡市场
- 横盘整理
- 波动率适中的市场

❌ **不适合**:
- 单边趋势市场
- 极端波动市场
- 流动性差的交易对

## 性能表现

基于 BNB/USDT 2024年8-10月数据回测:

- **总收益率**: +0.15%
- **胜率**: 100%
- **最大回撤**: 0%
- **交易次数**: 2笔
- **平均持仓**: 28小时

## 优化建议

1. **提高交易频率**
   - 减小 `min_grid_size` 到 0.5%
   - 增加 `ewma_alpha` 到 0.5

2. **降低持仓时间**
   - 缩小网格范围
   - 增加波动率敏感度

3. **风险控制**
   - 根据市场环境调整 `max_position_ratio`
   - 设置更严格的 `max_daily_loss`

## 注意事项

⚠️ **重要提示**:
1. 策略在趋势市场中可能表现不佳
2. 需要足够的波动性才能产生交易机会
3. 手续费会影响实际收益
4. 建议先用小资金测试

## 版本历史

- **v1.0** (2025-10-26): 初始版本，集成到回测系统

## 参考资料

- 原始项目: [GridBNB-USDT](https://github.com/EBOLABOY/GridBNB-USDT)
- 策略文档: `/docs/GridBNB_Integration_Summary.md`
