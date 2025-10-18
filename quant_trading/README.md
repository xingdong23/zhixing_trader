# 📈 Quant Trading - 美股量化交易系统

专注于美股市场的量化交易系统，支持策略开发、回测、实盘交易。

---

## 📖 快速导航

### 🎯 策略文档
- **[策略总览](文档/策略文档/策略总览.md)** - 所有策略的总体介绍

#### 短期技术策略
- **[策略说明](文档/策略文档/短期技术策略/策略说明.md)** - 短期技术策略介绍
- **[快速开始](文档/策略文档/短期技术策略/快速开始.md)** - 快速使用指南
- **[策略详情](文档/策略文档/短期技术策略/策略详情.md)** - 详细的策略逻辑
- **[项目总结](文档/策略文档/短期技术策略/项目总结.md)** - 项目开发总结

#### 美股龙头策略
- **[策略说明](文档/策略文档/美股龙头策略/策略说明.md)** - 龙头策略介绍
- **[快速开始](文档/策略文档/美股龙头策略/快速开始.md)** - 快速使用指南
- **[龙头策略详解](文档/策略文档/美股龙头策略/龙头策略详解.md)** - 策略原理
- **[策略实施](文档/策略文档/美股龙头策略/策略实施.md)** - 实施步骤
- **[扫描器方案](文档/策略文档/美股龙头策略/扫描器方案.md)** - 股票扫描方案
- **[股票池指南](文档/策略文档/美股龙头策略/股票池指南.md)** - 股票池管理
- **[股票池配置](文档/策略文档/美股龙头策略/股票池配置.md)** - 配置说明
- **[波段交易配置](文档/策略文档/美股龙头策略/波段交易配置.md)** - 波段交易参数
- **[项目完成报告](文档/策略文档/美股龙头策略/项目完成报告.md)** - 项目总结

---

## 🎯 系统特点

### ✨ 核心功能
- ✅ **策略引擎** - 灵活的策略开发框架
- ✅ **策略执行** - 实时策略执行引擎
- ✅ **内置策略** - 4个经过验证的策略
- 🔄 **回测引擎** - 历史数据回测（待完善）
- 🔄 **风控系统** - 风险控制模块（待开发）

### 📊 内置策略
1. **短期技术策略** - 基于技术指标的短线策略
2. **美股龙头策略** - 捕捉行业龙头股机会
3. **波段交易策略** - 中期波段交易
4. **稳健盈利策略** - 风险可控的稳定盈利

---

## 🚀 快速开始

### 1. 安装依赖
```bash
cd quant_trading
pip install -r requirements.txt
```

### 2. 配置数据库
```bash
# 编辑配置文件
vim app/config.py

# 配置MySQL连接
DATABASE_URL=mysql+pymysql://user:pass@localhost:3306/quant_trading
```

### 3. 启动服务
```bash
# 启动API服务（端口8002）
python run.py
```

### 4. 访问API文档
http://localhost:8002/docs

---

## 📦 项目结构

```
quant_trading/
├── app/
│   ├── api/                      # API接口
│   │   └── v1/endpoints/
│   │       └── strategies.py     # 策略API
│   ├── core/
│   │   ├── strategy/             # 策略引擎
│   │   │   ├── base.py           # 策略基类
│   │   │   ├── engine.py         # 执行引擎
│   │   │   ├── short_term_technical/    # 短期技术策略
│   │   │   ├── us_leader_hunter/        # 美股龙头策略
│   │   │   ├── steady_profit/           # 稳健盈利策略
│   │   │   └── swing_trading/           # 波段交易策略
│   │   ├── backtest/             # 回测引擎（待完善）
│   │   └── risk/                 # 风控系统（待开发）
│   ├── services/                 # 业务服务
│   ├── repositories/             # 数据访问
│   ├── models.py                 # 数据模型
│   ├── database.py               # 数据库连接
│   ├── config.py                 # 配置管理
│   └── main.py                   # FastAPI应用
├── scripts/                      # 工具脚本
├── tests/                        # 测试代码
├── 文档/                         # 📚 策略文档
│   └── 策略文档/
│       ├── 策略总览.md
│       ├── 短期技术策略/
│       └── 美股龙头策略/
├── requirements.txt              # 依赖列表
└── run.py                        # 启动脚本
```

---

## 🎮 使用示例

### 获取策略列表
```bash
curl http://localhost:8002/api/v1/strategies
```

### 执行策略
```bash
curl -X POST http://localhost:8002/api/v1/strategies/execute \
  -H "Content-Type: application/json" \
  -d '{
    "strategy_name": "short_term_technical",
    "symbols": ["AAPL", "GOOGL"],
    "params": {
      "timeframe": "1d",
      "rsi_period": 14
    }
  }'
```

### 查看策略结果
```bash
curl http://localhost:8002/api/v1/strategies/results/{execution_id}
```

---

## 📊 策略说明

### 1. 短期技术策略
**目标**: 捕捉短期价格波动机会

**核心逻辑**:
- RSI、MACD等技术指标组合
- 短期趋势判断
- 快进快出

**适用场景**: 日内交易、短线波动

详见 [短期技术策略文档](文档/策略文档/短期技术策略/)

---

### 2. 美股龙头策略
**目标**: 捕捉行业龙头股的上涨机会

**核心逻辑**:
- 识别行业龙头
- 生命周期分析
- 动量追踪

**适用场景**: 中长期持有、成长股投资

详见 [美股龙头策略文档](文档/策略文档/美股龙头策略/)

---

### 3. 稳健盈利策略
**目标**: 稳定盈利，控制风险

**核心逻辑**:
- 价值投资理念
- 严格风控
- 分散投资

**适用场景**: 稳健型投资者

---

### 4. 波段交易策略
**目标**: 捕捉中期波段机会

**核心逻辑**:
- 趋势识别
- 支撑阻力位
- 波段操作

**适用场景**: 中期持有、波段交易

---

## 🔧 策略开发

### 创建自定义策略

```python
from app.core.strategy.base import BaseStrategy

class MyStrategy(BaseStrategy):
    """我的自定义策略"""
    
    def __init__(self, config):
        super().__init__(config)
        self.name = "my_strategy"
    
    def analyze(self, symbol: str, data: pd.DataFrame):
        """分析股票"""
        # 实现你的分析逻辑
        signals = []
        
        # 生成交易信号
        if self.should_buy(data):
            signals.append({
                "symbol": symbol,
                "action": "BUY",
                "reason": "满足买入条件"
            })
        
        return signals
    
    def should_buy(self, data):
        """判断是否应该买入"""
        # 你的判断逻辑
        pass
```

### 注册策略
```python
# 在 app/core/strategy/__init__.py 中注册
from .my_strategy import MyStrategy

STRATEGIES = {
    "short_term_technical": ShortTermTechnicalStrategy,
    "us_leader_hunter": USLeaderHunterStrategy,
    "my_strategy": MyStrategy,  # 添加你的策略
}
```

---

## 🧪 回测系统

### 运行回测（待完善）
```python
from app.core.backtest import BacktestEngine

# 创建回测引擎
engine = BacktestEngine(
    strategy="short_term_technical",
    symbols=["AAPL", "GOOGL"],
    start_date="2024-01-01",
    end_date="2024-10-01",
    initial_capital=100000
)

# 运行回测
results = engine.run()

# 查看结果
print(f"总收益率: {results.total_return}%")
print(f"夏普比率: {results.sharpe_ratio}")
print(f"最大回撤: {results.max_drawdown}%")
```

---

## 🛡️ 风控系统

### 风险控制（待完善）
- 单笔交易最大损失
- 总仓位控制
- 单只股票最大持仓
- 日内交易次数限制
- 连续亏损保护

---

## ⚙️ 配置说明

### 数据库配置
```python
# app/config.py
DATABASE_URL = "mysql+pymysql://user:pass@localhost:3306/quant_trading"
```

### 策略参数
```python
STRATEGY_CONFIG = {
    "short_term_technical": {
        "rsi_period": 14,
        "rsi_overbought": 70,
        "rsi_oversold": 30,
        "stop_loss": 0.02,
        "take_profit": 0.05
    },
    "us_leader_hunter": {
        "min_market_cap": 10_000_000_000,  # 100亿美元
        "momentum_period": 60,
        "volume_threshold": 1_000_000
    }
}
```

---

## 📊 性能监控

### 查看策略表现
```bash
# 策略执行统计
curl http://localhost:8002/api/v1/strategies/stats

# 持仓情况
curl http://localhost:8002/api/v1/positions

# 交易历史
curl http://localhost:8002/api/v1/trades
```

---

## 🔗 依赖服务

### Trading Journal
- **端口**: 8001
- **功能**: 交易记录、股票数据管理
- **关系**: Quant Trading 使用其股票数据

### Market Data Service
- **功能**: 市场数据获取
- **关系**: Quant Trading 使用其数据接口

---

## 🧪 测试

### 运行测试
```bash
pytest tests/
```

### 测试策略
```bash
# 测试短期技术策略
python -m tests.test_short_term_technical

# 测试美股龙头策略
python -m tests.test_us_leader_hunter
```

---

## 📝 开发路线图

### 已完成 ✅
- [x] 策略引擎框架
- [x] 4个内置策略
- [x] 策略执行API
- [x] 数据库集成

### 进行中 🔄
- [ ] 回测引擎完善
- [ ] 风控系统开发
- [ ] 实盘交易接口

### 计划中 📋
- [ ] 更多策略开发
- [ ] 机器学习策略
- [ ] 组合优化
- [ ] 自动化报告

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 贡献策略
如果你开发了优秀的策略，欢迎提交PR：
1. 在 `app/core/strategy/` 下创建策略目录
2. 实现 `BaseStrategy` 接口
3. 编写策略文档
4. 添加测试用例
5. 提交 PR

---

## 📄 许可证

MIT License

---

## 📞 获取帮助

- 查看 [策略文档](文档/策略文档/)
- 阅读各策略的快速开始指南
- 查看API文档: http://localhost:8002/docs

---

**专业量化交易系统**: 为美股市场量身打造的量化交易平台。
