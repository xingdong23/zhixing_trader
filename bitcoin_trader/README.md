# 🪙 Bitcoin Trader - 比特币短线量化交易系统

基于技术指标的比特币短线自动交易系统，采用稳健盈利策略。

---

## 📖 快速导航

### 🚀 立即开始
- **[快速开始](文档/快速开始.md)** - 5分钟快速上手
- **[快速参考](文档/快速参考.md)** - 常用命令和配置

### 📚 核心文档
- **[架构设计](文档/架构设计.md)** - 系统架构说明
- **[策略执行流程](文档/策略执行流程.md)** - 交易策略详细流程
- **[稳健盈利策略](文档/稳健盈利策略.md)** - 主力策略说明
- **[稳健盈利说明](文档/稳健盈利说明.md)** - 策略实施指南

### 🛠️ 开发文档
- **[自定义策略开发](文档/自定义策略开发.md)** - 如何开发自己的策略

---

## 🎯 系统特点

### ✨ 核心功能
- ✅ **短线交易** - 专注比特币短期价格波动
- ✅ **自动执行** - 24/7 全自动交易
- ✅ **稳健盈利** - 控制风险，稳定盈利
- ✅ **策略可定制** - 支持自定义交易策略

### 📊 技术特点
- **多指标组合** - RSI、MACD、布林带等
- **风险控制** - 止损、止盈、仓位管理
- **实时监控** - 实时价格监控和订单管理
- **回测支持** - 策略回测验证

---

## 🚀 快速开始

### 1. 安装依赖
```bash
cd bitcoin_trader
pip install -r requirements.txt
```

### 2. 配置环境
```bash
# 复制配置文件
cp .env.example .env

# 编辑配置，填入API密钥
vim .env
```

### 3. 启动交易
```bash
# 开发模式
python run.py

# 或使用启动脚本
bash start.sh
```

### 4. 访问文档
- 在线文档: http://localhost:8000/docs
- 策略详情: 查看 [稳健盈利策略](文档/稳健盈利策略.md)

---

## 📦 项目结构

```
bitcoin_trader/
├── app/                      # 应用代码
│   ├── api/                  # API接口
│   ├── core/                 # 核心功能
│   │   ├── exchanges/        # 交易所接口
│   │   └── strategies/       # 交易策略
│   ├── config.py             # 配置管理
│   ├── models.py             # 数据模型
│   └── main.py               # 主程序
├── scripts/                  # 工具脚本
├── tests/                    # 测试代码
├── 文档/                     # 📚 项目文档
│   ├── 快速开始.md
│   ├── 架构设计.md
│   ├── 策略执行流程.md
│   ├── 稳健盈利策略.md
│   └── 自定义策略开发.md
├── requirements.txt          # 依赖列表
└── run.py                    # 启动脚本
```

---

## 🎮 使用示例

### 启动交易机器人
```python
from app.core.strategies import SteadyProfitStrategy
from app.core.exchanges import BinanceExchange

# 初始化交易所
exchange = BinanceExchange(api_key, api_secret)

# 创建策略
strategy = SteadyProfitStrategy(exchange)

# 开始交易
strategy.run()
```

### 回测策略
```bash
python scripts/backtest.py --strategy steady_profit --days 30
```

---

## ⚙️ 配置说明

### 交易所配置
```bash
EXCHANGE_API_KEY=your_api_key
EXCHANGE_API_SECRET=your_api_secret
EXCHANGE_NAME=binance  # binance, okex, etc.
```

### 策略参数
```bash
STRATEGY_NAME=steady_profit
SYMBOL=BTC/USDT
TIMEFRAME=15m
POSITION_SIZE=0.01  # BTC数量
```

详细配置见 [快速开始](文档/快速开始.md)

---

## 📊 策略说明

### 稳健盈利策略
核心思路：通过技术指标组合，捕捉短期价格波动机会

**入场条件**:
- RSI 超卖（< 30）
- MACD 金叉
- 价格触及布林带下轨

**出场条件**:
- 止盈：+2%
- 止损：-1%
- RSI 超买（> 70）

详见 [稳健盈利策略](文档/稳健盈利策略.md)

---

## 🔍 监控与日志

### 实时监控
```bash
# 查看运行状态
curl http://localhost:8000/api/v1/status

# 查看持仓
curl http://localhost:8000/api/v1/positions

# 查看交易历史
curl http://localhost:8000/api/v1/trades
```

### 日志查看
```bash
tail -f logs/trading.log
```

---

## 🛡️ 风险提示

⚠️ **重要提醒**:
1. 加密货币交易具有高风险
2. 建议先在测试环境运行
3. 不要投入超过承受能力的资金
4. 务必设置止损，控制风险
5. 定期检查策略表现

---

## 🧪 测试

### 运行单元测试
```bash
pytest tests/
```

### 运行策略回测
```bash
python scripts/backtest.py
```

---

## 📝 开发指南

想开发自己的交易策略？查看：
- [自定义策略开发](文档/自定义策略开发.md)
- [架构设计](文档/架构设计.md)

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

MIT License

---

## 📞 获取帮助

- 查看 [快速开始](文档/快速开始.md)
- 阅读 [策略执行流程](文档/策略执行流程.md)
- 参考 [快速参考](文档/快速参考.md)

---

**风险警告**: 本系统仅供学习交流，不构成投资建议。请谨慎使用，风险自负。
