# 🎯 智行交易系统 V3.0

> Zhixing Trader - 统一量化交易平台（股票 + 加密货币）

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14+-black.svg)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📖 简介

智行交易系统是一个专业的量化交易平台，支持股票和加密货币的策略研究、回测和实盘交易。系统采用模块化架构，各模块独立部署，职责清晰。

### ✨ 核心特性

- 📊 **多市场支持** - 股票（美股/A股）+ 加密货币
- 🧪 **策略回测** - 完整的回测引擎，支持历史数据验证
- 🤖 **实盘交易** - 自动化交易执行（模拟盘/实盘）
- 📝 **交易日志** - 专业的交易记录和分析系统
- 📈 **数据服务** - 多数据源整合，智能切换
- 🎨 **可视化界面** - 现代化Web界面

---

## 🚀 快速开始

### 环境要求

- Python 3.10+
- MySQL 8.0+
- Node.js 18+ (前端)

### 启动服务

```bash
# 1. 启动交易日志服务 (端口: 8001)
cd trading_journal
python run.py

# 2. 启动股票策略交易服务 (端口: 8002)
cd stock_strategy_trading
python run.py

# 3. 启动前端 (端口: 3000)
cd zhixing_frontend
npm install
npm run dev
```

📘 **详细指南**: [启动服务指南](文档/01-快速开始/启动服务指南.md)

---

## 📦 系统模块

### 1️⃣ Trading Journal (交易日志)
**端口**: 8001 | **技术**: FastAPI + MySQL

交易记录管理、股票数据管理、智能数据同步

```bash
cd trading_journal && python run.py
```

🔗 API文档: http://localhost:8001/docs

---

### 2️⃣ Stock Strategy Trading (股票策略交易)
**端口**: 8002 | **技术**: FastAPI + MySQL

股票策略研究、策略执行引擎、回测和实盘交易

```bash
cd stock_strategy_trading && python run.py
```

🔗 API文档: http://localhost:8002/docs

---

### 3️⃣ Crypto Strategy Trading (加密货币策略交易)
**独立模块** | **技术**: Python + OKX API

加密货币策略研究和实盘交易

```bash
# 回测
cd crypto_strategy_trading
python backtest/run_backtest.py --config strategies/ema_simple_trend/backtest_multiframe_2years.json

# 实盘（模拟盘）
python live_trading/ema_simple_trend.py
```

---

### 4️⃣ Stock Market Data (股票行情数据服务)
**独立模块** | **技术**: Python + 多数据源

多数据源整合、智能切换、数据缓存

```bash
cd stock_market_data
python examples/quick_start.py
```

---

### 5️⃣ Unified Backtesting (统一回测引擎)
**独立模块** | **技术**: Python + Pandas

统一回测引擎、投资组合管理、性能分析

```bash
cd unified_backtesting
# 查看README了解使用方法
```

---

### 6️⃣ Zhixing Frontend (前端界面)
**端口**: 3000 | **技术**: Next.js + React + TypeScript

现代化Web界面、交易日志、策略监控、数据可视化

```bash
cd zhixing_frontend
npm install && npm run dev
```

🔗 访问地址: http://localhost:3000

---

## 🏗️ 项目结构

```
zhixing_trader/
├── trading_journal/              # 交易日志模块 (8001)
├── stock_strategy_trading/       # 股票策略交易模块 (8002)
├── crypto_strategy_trading/      # 加密货币策略交易模块
├── stock_market_data/            # 股票行情数据服务
├── unified_backtesting/          # 统一回测引擎
├── zhixing_frontend/             # 前端界面 (3000)
├── database/                     # 数据库Schema
└── 文档/                         # 项目文档
```

📘 **详细结构**: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)

---

## 📊 功能概览

### Trading Journal (交易日志)
- ✅ 交易记录管理
- ✅ 股票数据管理
- ✅ 分类系统
- ✅ 智能数据同步
- ✅ K线数据存储
- 🔄 绩效分析（增强中）

### Stock Strategy Trading (股票策略交易)
- ✅ 策略开发框架
- ✅ 策略执行引擎
- ✅ 短期技术策略
- ✅ 美股龙头策略
- ✅ 回测系统
- ✅ 风险管理

### Crypto Strategy Trading (加密货币策略交易)
- ✅ EMA趋势策略（胜率71%，收益率78%）
- ✅ 高频交易策略
- ✅ 布林带策略
- ✅ 完整回测系统
- ✅ 实盘交易（OKX）
- ✅ Docker部署

### Stock Market Data (股票行情数据)
- ✅ Yahoo Finance
- ✅ Alpha Vantage
- ✅ Twelve Data
- ✅ 富途OpenAPI
- ✅ 智能数据源切换
- ✅ 数据缓存机制

### Unified Backtesting (统一回测)
- ✅ 统一回测引擎
- ✅ 投资组合管理
- ✅ 性能指标分析
- ✅ 策略适配器
- 🔄 参数优化（开发中）
- 🔄 可视化报告（完善中）

---

## 🛠️ 技术栈

### 后端
- **框架**: FastAPI, Python 3.10+
- **数据库**: MySQL 8.0+
- **数据源**: yfinance, Alpha Vantage, Twelve Data, 富途
- **交易所**: OKX (加密货币)

### 前端
- **框架**: Next.js 14, React 18
- **语言**: TypeScript
- **UI**: Tailwind CSS, shadcn/ui
- **状态管理**: React Context

### 部署
- **容器**: Docker, Docker Compose
- **云服务**: 阿里云ECS
- **进程管理**: systemd

---

## 📚 文档导航

### 快速开始
- [启动服务指南](文档/01-快速开始/启动服务指南.md)
- [项目结构说明](文档/01-快速开始/项目结构说明.md)
- [项目详细结构](PROJECT_STRUCTURE.md)

### 架构设计
- [系统架构](文档/02-架构设计/系统架构.md)
- [模块指南](文档/02-架构设计/模块指南.md)

### 模块文档
- [Trading Journal 文档](trading_journal/文档/)
- [Stock Strategy Trading 文档](stock_strategy_trading/文档/)
- [Crypto Strategy Trading 文档](crypto_strategy_trading/docs/)
- [Stock Market Data 文档](stock_market_data/文档/)
- [Unified Backtesting 文档](unified_backtesting/README.md)

### 重构记录
- [完整重构总结](文档/03-重构记录/完整重构总结.md)
- [数据库重构总结](文档/03-重构记录/数据库重构总结.md)

### 模块交付
- [模块交付记录](文档/04-模块交付/)

👉 **[查看完整文档导航](文档/README.md)**

---

## 📝 版本历史

### V3.0 (2025-11-05) - 统一量化平台 🆕
- ✅ 模块重命名，职责更清晰
  - `bitcoin_trader` → `crypto_strategy_trading`
  - `market_data_service` → `stock_market_data`
  - `quant_trading` → `stock_strategy_trading`
- ✅ 新增统一回测模块 `unified_backtesting`
- ✅ 支持股票和加密货币统一回测
- ✅ 完整的回测引擎架构
- ✅ 项目结构优化和文档整理

### V2.0 (2025-10-17) - 模块化架构
- ✅ 拆分为独立模块
- ✅ 清晰的职责划分
- ✅ 独立部署和扩展
- ✅ 加密货币策略实盘

### V1.0 - 初始版本
- ✅ 单体后端架构
- ✅ 基础策略系统
- ✅ 数据同步功能

---

## ⚙️ 配置说明

### 环境变量

各模块需要配置相应的环境变量：

**Trading Journal & Stock Strategy Trading**
```bash
# .env
DATABASE_URL=mysql://user:password@localhost/trading_journal
MARKET_DATA_API_KEY=your_api_key
```

**Crypto Strategy Trading**
```bash
# .env
OKX_API_KEY=your_api_key
OKX_SECRET_KEY=your_secret_key
OKX_PASSPHRASE=your_passphrase
```

**Stock Market Data**
```bash
# .env
ALPHA_VANTAGE_API_KEY=your_api_key
TWELVE_DATA_API_KEY=your_api_key
FUTU_HOST=127.0.0.1
FUTU_PORT=11111
```

---

## 🔐 安全注意事项

1. ✅ **不要将 `.env` 文件提交到 Git**
2. ✅ **使用强密码保护数据库**
3. ✅ **API密钥设置IP白名单**
4. ✅ **实盘交易前充分测试**
5. ✅ **小额资金起步**
6. ✅ **严格执行风控规则**

---

## 🤝 贡献

欢迎贡献代码和文档！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

---

## 📞 支持

- 📚 **文档**: 查看 [文档目录](文档/)
- 🐛 **问题**: 提交 [GitHub Issue](https://github.com/yourusername/zhixing_trader/issues)
- 💬 **讨论**: [GitHub Discussions](https://github.com/yourusername/zhixing_trader/discussions)

---

## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源协议

---

## 🙏 致谢

感谢所有贡献者和使用者！

---

<div align="center">

**智行交易系统** - 让量化交易更简单

Made with ❤️ by Cheng Zheng

[文档](文档/) • [快速开始](文档/01-快速开始/启动服务指南.md) • [项目结构](PROJECT_STRUCTURE.md)

</div>
