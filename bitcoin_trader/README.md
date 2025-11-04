# 🤖 Bitcoin Trader - 加密货币量化交易系统

一个专业的加密货币量化交易系统，支持多策略回测和实盘交易。

## ✨ 核心功能

1. **多策略管理** - 支持多个交易策略的开发和维护
2. **回测系统** - 完整的历史数据回测功能
3. **实盘交易** - 支持模拟盘和实盘交易
4. **部署工具** - 一键部署到阿里云

---

## 📁 项目结构

```
bitcoin_trader/
├── strategies/          # 【核心】交易策略
│   ├── ema_simple_trend/      # EMA趋势策略（主力策略）
│   ├── high_frequency/        # 高频交易策略
│   ├── bollinger_bands/       # 布林带策略
│   └── ...                    # 其他策略
│
├── backtest/            # 【核心】回测系统
│   ├── core/                  # 回测引擎
│   ├── run_backtest.py        # 回测运行脚本
│   └── results/               # 回测结果
│
├── live_trading/        # 【核心】实盘交易
│   ├── ema_simple_trend.py    # EMA策略运行器
│   ├── high_frequency.py      # 高频策略运行器
│   └── config/                # 实盘配置
│
├── deployment/          # 部署相关
│   ├── aliyun/                # 阿里云部署脚本
│   ├── Dockerfile             # Docker配置
│   └── README.md              # 部署文档
│
├── docs/                # 项目文档
├── scripts/             # 辅助脚本
└── utils/               # 通用工具
```

---

## 🚀 快速开始

### 1. 环境准备

```bash
# 克隆项目
git clone https://github.com/xingdong23/zhixing_trader.git
cd zhixing_trader/bitcoin_trader

# 安装依赖
pip install -r backtest/requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑.env文件，填入OKX API密钥
```

### 2. 运行回测

```bash
# 回测EMA Simple Trend策略
python backtest/run_backtest.py --config strategies/ema_simple_trend/backtest_multiframe_2years.json

# 查看回测结果
ls backtest/results/
```

### 3. 运行实盘（模拟盘）

```bash
# 启动EMA Simple Trend策略
python live_trading/ema_simple_trend.py --mode paper

# 启动高频策略
python live_trading/high_frequency.py --mode paper
```

### 4. 部署到阿里云

```bash
# 查看部署文档
cat deployment/README.md

# 一键部署
bash deployment/aliyun/quick_deploy.sh
```

---

## 📊 主力策略：EMA Simple Trend

### 策略表现

| 指标 | 数值 |
|------|------|
| 💰 **收益率** | **+78.29%** |
| 🎯 **最终资金** | **535 USDT** (初始300) |
| ✅ **胜率** | **71.43%** |
| 📊 **盈亏比** | **3.10** |
| 📉 **最大回撤** | **5.38%** |
| 🏅 **评分** | **A+ (100/100)** |

### 策略原理

```
入场条件：
  • 价格突破 EMA13（中期均线）
  • EMA5 > EMA13 > EMA21（多头排列）
  → 上涨趋势确立，买入

出场条件：
  • 亏损3.2% → 止损
  • 盈利7% → 部分止盈（50%）
  • 盈利16% → 全部止盈
  • 移动止损保护利润
```

### 核心优势

- ✅ 只做确定性机会（82%时间在等待）
- ✅ 让利润奔跑（最长持仓30个月）
- ✅ 快速止损（3.2%硬止损）
- ✅ 盈亏比3.1（赚得多，亏得少）

---

## 📖 文档

- **策略开发指南**: `docs/EMA_STRATEGY_COMPARISON.md`
- **回测指南**: `backtest/README.md`
- **部署指南**: `deployment/README.md`
- **生产环境指南**: `docs/EMA_PRODUCTION_GUIDE.md`

---

## 🛠️ 开发新策略

### 1. 创建策略目录

```bash
mkdir strategies/my_strategy
cd strategies/my_strategy
```

### 2. 创建策略文件

```python
# strategy.py
class MyStrategy:
    def __init__(self, config):
        self.config = config
    
    def analyze(self, df):
        # 策略逻辑
        return {"signal": "hold", "reason": "..."}
```

### 3. 创建配置文件

```json
// config.json
{
  "total_capital": 300.0,
  "leverage": 2.0,
  // ...其他参数
}
```

### 4. 运行回测

```bash
python backtest/run_backtest.py --config strategies/my_strategy/backtest_config.json
```

---

## ⚠️ 风险提示

1. ✅ **先在模拟盘测试** - 至少运行1-2周
2. ✅ **小额资金起步** - 实盘初期使用100-300 USDT
3. ✅ **设置止损** - 严格执行风控规则
4. ✅ **定期检查** - 每天查看日志和交易记录
5. ✅ **API安全** - 设置IP白名单，不要泄露密钥

---

## 🔧 技术栈

- **语言**: Python 3.9+
- **交易所**: OKX (支持模拟盘和实盘)
- **数据源**: Binance / OKX
- **部署**: Docker / 阿里云ECS

---

## 📞 支持

- **文档**: 查看 `docs/` 目录
- **问题**: 提交 GitHub Issue
- **邮件**: support@example.com

---

## 📄 许可证

MIT License

---

**最后更新**: 2025-11-04  
**版本**: v2.0  
**状态**: ✅ 生产就绪
