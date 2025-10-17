# 快速开始 - 美股龙头猎手策略

## 🎯 你的需求

```
✅ 持仓周期：1个月甚至更长
✅ 捕捉波段行情，不是超短线
✅ 有耐心等待
✅ 主要靠止损控制风险
✅ 每天扫描一次即可
```

## ✅ 已为你准备好

### 1. 策略参数已调整

**止损止盈**（已配置在代码中）：
- 止损：**-15%**（给更多波动空间）
- 目标1：**+50%**（平仓30%）
- 目标2：**+100%**（再平30%）
- 目标3：**+200%**（剩余40%全平）

**持仓管理**：
- 最大持仓：**90天**（3个月）
- 单股仓位：最大**40%**
- 总仓位：**60-80%**（留现金）

**扫描频率**：
- **每天1次**（收盘后）
- 不需要盯盘

---

## 📂 策略目录结构

```
app/core/strategy/us_leader_hunter/
├── 📄 文档（6个）
│   ├── QUICK_START.md                    ⭐ 本文档（快速开始）
│   ├── README.md                          📖 使用指南
│   ├── SWING_TRADING_CONFIG.md            ⚙️ 波段配置（重点！）
│   ├── US_LEADER_STRATEGY.md              📚 完整策略文档
│   ├── US_STOCK_UNIVERSE_GUIDE.md         📊 股票池指南
│   └── US_LEADER_SCANNER_SOLUTION.md      🔧 扫描方案
│
└── 💻 代码（5个模块）
    ├── __init__.py                        导出模块
    ├── strategy.py                        主策略类 ⭐
    ├── sector_analyzer.py                 板块分析器
    ├── leader_identifier.py               龙头识别器
    ├── lifecycle_tracker.py               生命周期跟踪
    └── pattern_detector.py                形态检测器
```

---

## 🚀 3步开始使用

### 第1步：了解策略（5分钟）

**必读文档**：
1. `SWING_TRADING_CONFIG.md` - 波段交易配置
2. `US_STOCK_UNIVERSE_GUIDE.md` - 股票池选择

**可选阅读**：
- `US_LEADER_STRATEGY.md` - 完整策略原理

---

### 第2步：准备数据（待实现）

**需要准备**：
- 股票池（600-800只中小盘概念股）
- 每日扫描系统（自动运行）
- 板块分类和聚合

**实施时间**：约3-5天开发

**详细方案**：参考 `US_LEADER_SCANNER_SOLUTION.md`

---

### 第3步：使用策略（代码已就绪）

```python
from app.core.strategy.us_leader_hunter import USLeaderHunterStrategy

# 创建策略实例（默认使用波段配置）
strategy = USLeaderHunterStrategy({"parameters": {}})

# 分析股票
result = strategy.analyze(
    code="MRNA",
    klines=klines_data,  # K线数据
    context={
        "sector_info": {
            "sector_name": "Biotechnology",
            "sector_return_1d": 5.2,
            "relative_strength": 3.5,
            "volume_ratio": 2.3,
            "big_movers_count": 4,
            "consecutive_up_days": 2,
            "sector_age": 3,
            "sector_rank": 1,
            "catalyst_type": "FDA",
            "market_cap": 8.5,  # 85亿美元
        }
    }
)

# 查看结果
if result["signal"] == "buy":
    print(f"✅ 买入信号！")
    print(f"分数: {result['score']}")
    print(f"仓位: {result['position_ratio']:.0%}")
    print(f"止损: ${result['stop_loss']:.2f}")
    print(f"目标: ${result['take_profit_levels'][0]['price']:.2f}")
    print(f"原因: {result['reason']}")
```

---

## 📊 策略核心参数（已配置）

### 默认参数（波段交易）

```python
{
    # 止损
    "stop_loss_pct": 0.15,              # -15%止损
    "max_hold_days": 90,                # 最多持有90天
    
    # 止盈
    "take_profit_targets": [
        {"profit": 0.50, "close_ratio": 0.30},   # +50%平30%
        {"profit": 1.00, "close_ratio": 0.30},   # +100%再平30%
        {"profit": 2.00, "close_ratio": 0.40},   # +200%全平
    ],
    
    # 仓位
    "position_ratios": {
        "Priority_1": 0.40,             # 最强信号 → 40%
        "Priority_2": 0.30,             # 强信号 → 30%
        "Priority_3": 0.20,             # 中等信号 → 20%
        "Priority_4": 0.10,             # 试探信号 → 10%
    },
    "max_single_position": 0.40,        # 单股最大40%
    
    # 市值
    "market_cap_max": 10000,            # 最大100亿美元
    "stock_price_max": 150.0,           # 最高$150
}
```

---

## 💡 使用示例

### 示例1：分析单只股票

```python
# 假设扫描到 MRNA（Moderna）
result = strategy.analyze(
    code="MRNA",
    klines=mrna_klines,
    context={
        "sector_info": {
            "sector_name": "Biotechnology",
            "sector_return_1d": 6.5,
            "relative_strength": 4.2,
            "volume_ratio": 3.1,
            "big_movers_count": 5,
            "consecutive_up_days": 3,
            "sector_age": 2,
            "sector_rank": 1,
            "catalyst_type": "FDA",
            "market_cap": 8.5,
        },
        "market_cap": 8500,  # 85亿美元
    }
)

# 输出示例
{
    "signal": "buy",
    "score": 88.5,
    "confidence": "high",
    "position_ratio": 0.40,           # 建议仓位40%
    "current_price": 145.50,
    "stop_loss": 123.68,              # -15%止损
    "take_profit_levels": [
        {"price": 218.25, "description": "目标1: +50%"},
        {"price": 291.00, "description": "目标2: +100%"},
        {"price": 436.50, "description": "目标3: +200%"},
    ],
    "reason": "板块热度: 85.0 | 龙头分数: 82.0 | 生命周期: Growth | 技术形态: 连续大阳线",
    "lifecycle": {
        "stage": "Growth",
        "description": "连续大涨，最佳买入期"
    }
}
```

### 示例2：波段持仓管理

```python
# 买入后持续跟踪
持仓记录 = {
    "symbol": "MRNA",
    "buy_date": "2025-10-17",
    "buy_price": 145.50,
    "position": 40%,
    "stop_loss": 123.68,
    "targets": [218.25, 291.00, 436.50],
}

# 每日检查（收盘后）
def daily_check(holding):
    current_price = get_current_price(holding["symbol"])
    
    # 检查止损
    if current_price <= holding["stop_loss"]:
        print("⚠️ 触及止损，立即卖出")
        sell_all()
        return
    
    # 检查止盈
    for i, target in enumerate(holding["targets"]):
        if current_price >= target:
            print(f"✅ 达到目标{i+1}，分批止盈")
            partial_sell(holding["position"] * [0.3, 0.3, 0.4][i])
            # 移动止损
            holding["stop_loss"] = holding["buy_price"] * (1 + [0.10, 0.30, 0.50][i])
    
    # 检查持仓天数
    hold_days = (today - holding["buy_date"]).days
    if hold_days >= 90:
        print("⏰ 达到最大持仓期，考虑止盈")
```

---

## 📅 每日工作流程

### 时间安排

```
美东时间17:00（北京时间次日06:00）：

1. 🔍 每日扫描（10-15分钟）
   ├─ 扫描600-800只概念股
   ├─ 识别热点板块
   └─ 找出龙头股

2. 💡 生成信号
   ├─ 新买入机会
   └─ 持仓调整建议

3. ✅ 执行交易
   ├─ 查看新信号
   ├─ 检查持仓止损/止盈
   └─ 执行交易

4. 📊 记录和复盘
   └─ 更新持仓记录
```

---

## ⚠️ 重要提醒

### 必须遵守的规则

```
1. ✅ 止损必须执行
   - 触及-15%立即止损
   - 不要幻想反弹
   - 保护本金第一

2. ✅ 分批止盈
   - 按目标+50%/+100%/+200%分批
   - 不要+20%就全卖
   - 让利润奔跑

3. ✅ 仓位控制
   - 单股最大40%
   - 总仓位60-80%
   - 留20-40%现金

4. ✅ 耐心持有
   - 持仓周期1-3个月
   - 不要频繁交易
   - 每月1-3次即可

5. ✅ 风险分散
   - 不超过3-5只股票
   - 不同板块分散
   - 不同催化剂
```

---

## 📈 预期表现

### 成功案例

```
假设一年做6笔交易：

成功案例（2笔，胜率33%）：
- MRNA: +120%（持仓2个月）
- RIVN: +80%（持仓1.5个月）

失败案例（4笔）：
- 3笔触及止损：-15% × 3
- 1笔小盈：+10%

每笔投入30%仓位：
盈利：30% × (1.20 + 0.80) = 60%
亏损：30% × (0.15 × 3 - 0.10) = 10.5%
净收益：60% - 10.5% = 49.5%

✅ 年化50%左右是合理预期
✅ 即使胜率只有33%，只要有大赢家就能覆盖损失
```

---

## 🎯 下一步

### 立即可做

1. ✅ **阅读文档**
   - `SWING_TRADING_CONFIG.md`（20分钟）
   - `US_STOCK_UNIVERSE_GUIDE.md`（10分钟）

2. ✅ **理解策略**
   - 波段交易逻辑
   - 止损止盈规则
   - 仓位管理

### 需要实施（3-5天开发）

3. 🔧 **准备股票池**
   - 收集600-800只概念股
   - 按主题分类
   - 维护股票列表

4. 🔧 **实现扫描系统**
   - 每日扫描任务
   - 板块数据聚合
   - 龙头识别

5. 🔧 **集成策略**
   - 调用已实现的策略代码
   - 生成交易信号
   - 保存到数据库

详细实施方案：`US_LEADER_SCANNER_SOLUTION.md`

---

## 📞 帮助

如有问题：
1. 查看 `README.md` - 使用指南
2. 查看 `SWING_TRADING_CONFIG.md` - 配置说明
3. 查看 `US_LEADER_STRATEGY.md` - 完整策略

---

**策略已为你的波段交易需求定制完成！** 🎉

**核心配置**：
- ✅ 止损-15%
- ✅ 目标+50%/+100%/+200%
- ✅ 持仓1-3个月
- ✅ 每天扫描1次

**开始使用吧！** 🚀

