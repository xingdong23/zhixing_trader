# 📁 项目结构说明

## 🎯 最优策略配置

**策略**: EMA Simple Trend 优化版  
**目标**: 300 USDT → 535 USDT（2年，+78%收益率）

---

## 📂 目录结构

```
bitcoin_trader/
│
├── app/
│   └── strategies/
│       └── ema_simple_trend/          # 🎯 最优策略（唯一使用）
│           ├── config.json            # ⚙️ 策略配置参数
│           ├── backtest_config.json   # 📊 回测配置
│           ├── strategy.py            # 💻 策略代码逻辑
│           ├── README.md              # 📖 策略原理详解
│           ├── MONTHLY_ANALYSIS.md    # 📅 月度表现分析
│           └── run_backtest.sh        # 🚀 快速回测脚本
│
├── backtest/
│   │
│   ├── core/                          # 回测引擎
│   │   ├── backtest_engine.py
│   │   ├── data_loader.py
│   │   └── performance_analyzer.py
│   │
│   ├── results/                       # 回测结果输出
│   └── run_backtest.py                # 回测运行脚本
│
├── data/                              # 历史数据
│   └── ETHUSDT-1h-2years.csv         # 2年1小时K线数据
│
└── logs/                              # 日志文件

```

---

## 🚀 快速开始

### 方式1：使用快捷脚本（推荐）
```bash
cd app/strategies/ema_simple_trend
bash run_backtest.sh
```

### 方式2：直接运行
```bash
python3 backtest/run_backtest.py --config app/strategies/ema_simple_trend/backtest_config.json
```

### 3️⃣ 查看策略说明
```bash
# 策略原理
cat app/strategies/ema_simple_trend/README.md

# 月度分析
cat app/strategies/ema_simple_trend/MONTHLY_ANALYSIS.md

# 策略配置
cat app/strategies/ema_simple_trend/config.json
```

---

## ✅ 核心文件说明

| 文件 | 作用 | 重要性 |
|------|------|--------|
| `app/strategies/ema_simple_trend/config.json` | 策略参数配置 | ⭐⭐⭐⭐⭐ |
| `app/strategies/ema_simple_trend/strategy.py` | 策略核心代码 | ⭐⭐⭐⭐⭐ |
| `app/strategies/ema_simple_trend/README.md` | 策略原理详解 | ⭐⭐⭐⭐ |
| `app/strategies/ema_simple_trend/MONTHLY_ANALYSIS.md` | 月度表现分析 | ⭐⭐⭐⭐ |
| `app/strategies/ema_simple_trend/backtest_config.json` | 回测配置 | ⭐⭐⭐ |
| `app/strategies/ema_simple_trend/run_backtest.sh` | 快速回测脚本 | ⭐⭐⭐ |
| `backtest/run_backtest.py` | 回测引擎 | ⭐⭐⭐ |

---

## 🎯 策略参数（快速参考）

```json
{
  "total_capital": 300.0,      // 初始资金
  "position_size": 0.85,       // 85%仓位
  "leverage": 2.7,             // 2.7倍杠杆
  "ema_fast": 5,               // EMA5
  "ema_medium": 13,            // EMA13（信号线）
  "ema_slow": 21,              // EMA21
  "stop_loss_pct": 0.032,      // 3.2%硬止损
  "take_profit_pct": 0.16,     // 16%全部止盈
  "partial_take_profit_pct": 0.07  // 7%部分止盈
}
```

---

## 📊 回测表现

| 指标 | 数值 |
|------|------|
| 收益率 | +78.29% |
| 最终资金 | 535 USDT |
| 胜率 | 71.43% |
| 盈亏比 | 3.10 |
| 最大回撤 | 5.38% |
| 评级 | A+ (100/100) |

---

## 🗂️ 其他策略

其他策略目录（保留但不使用）：
- `app/strategies/bollinger_bands/`
- `app/strategies/grid_trading/`
- `app/strategies/trend_momentum/`
- 等等...

**这些策略仅作参考，当前只使用 `ema_simple_trend` 策略。**

---

## 🔧 修改配置

如需调整参数，直接编辑：
```bash
vim app/strategies/ema_simple_trend/config.json
```

修改后重新运行回测验证即可。

---

**最后更新**: 2025-10-31  
**状态**: ✅ 已优化并验证
