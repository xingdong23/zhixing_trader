# 智行交易系统 (Zhixing Trader)

这是一个模块化的智能交易系统平台，支持多个独立的交易和分析模块。

## 项目结构

```
zhixing_trader/
│
├── 📄 根目录文档
│   ├── README.md              # 项目总览（⭐ 从这里开始）
│   ├── ARCHITECTURE.md        # 整体架构设计
│   ├── MODULE_GUIDE.md        # 模块开发指南
│   ├── DOCS_INDEX.md          # 文档索引
│   └── PROJECT_STRUCTURE.md  # 目录结构说明
│
├── 📚 docs/                   # 共享文档目录
│   ├── 01-getting-started/   # 快速入门
│   ├── 02-features/          # 功能特性
│   ├── 03-data-sources/      # 数据源配置
│   ├── 04-testing/           # 测试文档
│   ├── 05-architecture/      # 架构设计
│   └── 06-legacy/            # 历史文档
│
├── 🛠️ scripts/                # 项目级脚本
│   ├── setup_alphavantage.sh
│   └── start_with_mysql.sh
│
├── 💾 data/                   # 数据目录
│   └── test/                 # 测试数据
│
├── 📈 zhixing_backend/        # 股票量化交易模块（端口 8000）
│   ├── app/                  # 应用代码
│   ├── scripts/              # 模块脚本
│   ├── tests/                # 测试代码
│   └── requirements.txt
│
├── 🪙 bitcoin_trader/         # 比特币量化交易模块（端口 8001）🆕
│   ├── app/                  # 应用代码
│   │   ├── api/v1/          # API接口
│   │   ├── core/            # 核心功能
│   │   └── main.py          # 主入口
│   ├── scripts/              # 模块脚本
│   ├── docs/                 # 模块文档
│   └── requirements.txt
│
└── 💻 zhixing_fronted/        # 前端界面（端口 3000）
    ├── app/                  # Next.js 应用
    ├── components/           # React 组件
    └── lib/                  # 工具库
```

> 📖 详细目录结构说明请查看 [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)

## 模块说明

### 1. zhixing_backend - 股票交易模块

**功能特性**:
- 📈 A股市场数据采集
- 🤖 多种量化交易策略
- 📊 技术指标分析
- 🔄 数据同步管理
- 📝 交易计划制定

**技术栈**:
- Python 3.9+, FastAPI
- MySQL, Redis
- yfinance, Alpha Vantage

**端口**: 8000

**快速开始**:
```bash
cd zhixing_backend
pip install -r requirements.txt
python run.py
```

**文档**: [zhixing_backend/README.md](zhixing_backend/README.md)

---

### 2. bitcoin_trader - 加密货币交易模块 🆕

**功能特性**:
- 🪙 比特币/加密货币量化交易
- 🔄 多交易所支持 (Binance, OKX, Bybit)
- 📊 实时K线数据和WebSocket
- 🤖 交易策略回测和实盘
- ⚡ 高频交易支持
- 🔐 安全的API密钥管理

**技术栈**:
- Python 3.9+, FastAPI
- MySQL, Redis
- CCXT, Binance API

**端口**: 8001

**快速开始**:
```bash
cd bitcoin_trader
pip install -r requirements.txt
python run.py
```

**文档**: [bitcoin_trader/README.md](bitcoin_trader/README.md)

---

### 3. zhixing_fronted - 前端界面

**功能特性**:
- 💻 统一的Web管理界面
- 📊 数据可视化
- 🎨 现代化UI设计

**技术栈**:
- Next.js, React, TypeScript
- Tailwind CSS
- shadcn/ui

**端口**: 3000

**快速开始**:
```bash
cd zhixing_fronted
npm install
npm run dev
```

---

## 未来规划模块

### 📢 舆情监控模块 (sentiment_monitor) - 规划中

**计划功能**:
- Reddit/Twitter(X) 热门讨论监控
- 大V观点追踪
- 舆情分析和情绪指标
- 异常舆情告警

### 🤖 AI分析模块 - 规划中

**计划功能**:
- 大模型驱动的市场分析
- 智能交易建议
- 新闻事件影响评估

### 📊 数据分析模块 - 规划中

**计划功能**:
- 深度数据挖掘
- 多维度数据分析
- 自定义报表生成

---

## 模块化设计原则

### ✅ 优势

1. **独立开发**: 每个模块可以独立开发和测试
2. **独立部署**: 模块可以单独部署和扩展
3. **技术选型自由**: 不同模块可以使用不同的技术栈
4. **降低耦合**: 模块间通过API通信，降低耦合度
5. **团队协作**: 不同团队可以并行开发不同模块

### 🔧 模块间通信

各模块通过 HTTP API 进行通信：

```
┌─────────────────┐
│  zhixing_fronted│  (端口: 3000)
│    (前端界面)    │
└────────┬────────┘
         │ HTTP
    ┌────┴────┬────────────┐
    │         │            │
┌───▼──────┐ ┌▼──────────┐ ┌▼──────────┐
│zhixing_  │ │bitcoin_   │ │sentiment_ │
│backend   │ │trader     │ │monitor    │
│(8000)    │ │(8001)     │ │(8002)     │
└──────────┘ └───────────┘ └───────────┘
```

### 📝 新增模块指南

创建新模块时，建议遵循以下结构：

```
your_module/
├── app/                 # 应用代码
│   ├── api/            # API接口
│   ├── core/           # 核心业务逻辑
│   ├── models.py       # 数据模型
│   ├── config.py       # 配置管理
│   └── main.py         # 应用入口
├── scripts/            # 工具脚本
├── tests/              # 测试代码
├── docs/               # 模块文档
├── requirements.txt    # 依赖管理
├── .env.example       # 环境变量示例
├── README.md          # 模块说明
└── run.py             # 启动脚本
```

---

## 系统要求

- Python 3.9+
- Node.js 16+
- MySQL 5.7+
- Redis 5.0+

## 开发环境设置

### 1. 克隆项目
```bash
git clone <repository-url>
cd zhixing_trader
```

### 2. 启动各个模块

**股票交易模块**:
```bash
cd zhixing_backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py
```

**比特币交易模块**:
```bash
cd bitcoin_trader
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py
```

**前端界面**:
```bash
cd zhixing_fronted
npm install
npm run dev
```

### 3. 访问服务

- 股票交易API: http://localhost:8000
- 比特币交易API: http://localhost:8001
- 前端界面: http://localhost:3000
- API文档: 
  - http://localhost:8000/docs (股票)
  - http://localhost:8001/docs (比特币)

---

## 文档导航

- [项目文档总览](docs/README.md)
- [文档索引](DOCS_INDEX.md)
- [快速开始指南](docs/01-getting-started/START_GUIDE.md)
- [股票模块文档](zhixing_backend/README.md)
- [比特币模块文档](bitcoin_trader/README.md)

---

## 许可证

MIT License

---

## 贡献

欢迎提交 Issue 和 Pull Request！

---

**最后更新**: 2025-10-17

