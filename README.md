# 🎯 Zhixing Trader V2.0

智行交易系统 - 模块化股票量化交易平台

---

## 🚀 快速开始

### 启动服务

```bash
# 启动交易日志服务
cd trading_journal && python run.py

# 启动量化交易服务
cd quant_trading && python run.py
```

详细指南：[启动服务指南](文档/01-快速开始/启动服务指南.md)

---

## 📦 系统模块

### Trading Journal (交易日志模块)
**端口**: 8001  
**功能**: 交易记录、股票管理、数据同步

```bash
cd trading_journal
python run.py
```

### Quant Trading (量化交易模块)
**端口**: 8002  
**功能**: 策略开发、策略执行、回测

```bash
cd quant_trading
python run.py
```

### Market Data Service (市场数据服务)
**独立模块**: 市场数据获取服务

```bash
cd market_data_service
python examples/quick_start.py
```

---

## 📖 完整文档

所有文档已整理到 **[文档/](文档/)** 目录：

- **[快速开始](文档/01-快速开始/)** - 快速上手指南
- **[架构设计](文档/02-架构设计/)** - 系统架构说明
- **[重构记录](文档/03-重构记录/)** - 重构过程记录
- **[模块交付](文档/04-模块交付/)** - 各模块交付文档

👉 **[查看完整文档导航](文档/README.md)**

---

## 🏗️ 项目结构

```
zhixing_trader/
├── trading_journal/          # 交易日志模块 (8001)
│   ├── app/                  # 应用代码
│   ├── scripts/              # 工具脚本
│   └── run.py                # 启动脚本
│
├── quant_trading/            # 量化交易模块 (8002)
│   ├── app/                  # 应用代码
│   │   └── core/strategy/    # 策略引擎
│   └── run.py                # 启动脚本
│
├── market_data_service/      # 市场数据服务
│   ├── market_data/          # 数据提供者
│   ├── examples/             # 使用示例
│   └── docs/                 # 文档
│
├── zhixing_fronted/          # 前端 (3000)
│
└── 文档/                     # 📚 项目文档
    ├── 01-快速开始/
    ├── 02-架构设计/
    ├── 03-重构记录/
    └── 04-模块交付/
```

---

## 🔗 API文档

- Trading Journal: http://localhost:8001/docs
- Quant Trading: http://localhost:8002/docs

---

## 🛠️ 技术栈

- **Backend**: FastAPI + Python 3.10+
- **Database**: MySQL 8.0+
- **Frontend**: Next.js + React
- **Data**: yfinance, Alpha Vantage, Twelve Data

---

## 📊 核心功能

### Trading Journal
- ✅ 股票数据管理
- ✅ 分类管理
- ✅ 数据同步
- 🔄 交易记录（待增强）
- 🔄 绩效分析（待增强）

### Quant Trading
- ✅ 策略开发框架
- ✅ 策略执行引擎
- ✅ 内置4个策略
- 🔄 回测引擎（待完善）
- 🔄 风控系统（待开发）

---

## 📝 版本历史

### V2.0 (2025-10-17) - 模块化架构
- ✅ 拆分为两个独立模块
- ✅ 清晰的职责划分
- ✅ 独立部署和扩展

### V1.0
- ✅ 单体后端架构
- ✅ 基础策略系统
- ✅ 数据同步功能

---

## 🤝 贡献

欢迎贡献代码和文档！

---

## 📄 许可证

MIT License

---

**详细文档请查看**: [文档目录](文档/)
