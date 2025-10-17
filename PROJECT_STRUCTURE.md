# 项目目录结构说明

## 根目录结构

```
zhixing_trader/                    # 项目根目录
│
├── 📄 核心文档
│   ├── README.md                  # 项目总览（⭐ 从这里开始）
│   ├── ARCHITECTURE.md            # 整体架构设计
│   ├── MODULE_GUIDE.md            # 模块开发指南
│   ├── DOCS_INDEX.md              # 文档索引
│   └── PROJECT_STRUCTURE.md       # 本文件
│
├── 🔧 配置文件
│   ├── .env.example              # 环境变量示例
│   ├── .env                      # 实际环境变量（不提交）
│   └── .gitignore                # Git忽略配置
│
├── 📚 docs/                       # 共享文档目录
│   ├── README.md                 # 文档中心
│   ├── 01-getting-started/       # 快速入门
│   ├── 02-features/              # 功能特性
│   ├── 03-data-sources/          # 数据源配置
│   ├── 04-testing/               # 测试文档
│   ├── 05-architecture/          # 架构设计
│   ├── 06-legacy/                # 历史文档
│   ├── DOCUMENTATION_SUMMARY.md  # 文档总结
│   ├── MULTI_DATA_SOURCE_SUMMARY.md
│   └── OPTIMIZATION_SUMMARY.md
│
├── 🛠️ scripts/                    # 项目级脚本
│   ├── README.md                 # 脚本说明
│   ├── setup_alphavantage.sh     # Alpha Vantage配置
│   └── start_with_mysql.sh       # MySQL启动检查
│
├── 💾 data/                       # 数据目录
│   ├── README.md                 # 数据说明
│   ├── test/                     # 测试数据
│   │   └── test_stocks.csv
│   ├── sample/                   # 示例数据（可选）
│   └── backups/                  # 备份（不提交）
│
├── 📈 zhixing_backend/            # 股票交易模块（端口 8000）
│   ├── app/                      # 应用代码
│   ├── scripts/                  # 模块脚本
│   ├── tests/                    # 测试代码
│   ├── requirements.txt          # Python依赖
│   ├── run.py                    # 启动脚本
│   └── README.md                 # 模块说明
│
├── 🪙 bitcoin_trader/             # 比特币交易模块（端口 8001）
│   ├── app/                      # 应用代码
│   │   ├── api/v1/              # API接口
│   │   ├── core/                # 核心功能
│   │   ├── models.py            # 数据模型
│   │   └── main.py              # 应用入口
│   ├── scripts/                  # 模块脚本
│   ├── docs/                     # 模块文档
│   │   ├── ARCHITECTURE.md
│   │   ├── QUICKSTART.md
│   │   └── CUSTOM_STRATEGY.md
│   ├── requirements.txt
│   ├── start.sh                  # 启动脚本
│   └── README.md
│
└── 💻 zhixing_fronted/            # 前端界面（端口 3000）
    ├── app/                      # Next.js应用
    ├── components/               # React组件
    ├── lib/                      # 工具库
    ├── package.json
    └── README.md
```

## 目录职责说明

### 根目录文件

| 文件/目录 | 职责 | 是否提交 |
|----------|------|---------|
| README.md | 项目总览，快速导航 | ✅ 提交 |
| ARCHITECTURE.md | 整体架构设计文档 | ✅ 提交 |
| MODULE_GUIDE.md | 新模块开发指南 | ✅ 提交 |
| DOCS_INDEX.md | 所有文档的索引 | ✅ 提交 |
| PROJECT_STRUCTURE.md | 目录结构说明（本文件） | ✅ 提交 |
| .env.example | 环境变量示例 | ✅ 提交 |
| .env | 实际环境变量 | ❌ 不提交 |
| .gitignore | Git忽略配置 | ✅ 提交 |

### docs/ - 共享文档

存放项目级别的文档，主要是股票交易模块的文档（历史原因）。

**原则**：
- 通用的、跨模块的文档放这里
- 各模块专属文档放在模块的 `docs/` 目录

### scripts/ - 项目级脚本

存放项目级别的工具脚本。

**原则**：
- 跨模块的、通用的脚本放这里
- 模块专用脚本放在模块的 `scripts/` 目录

**示例**：
- ✅ 数据库初始化脚本（通用）
- ✅ 环境配置脚本（通用）
- ❌ 特定交易策略脚本（应该放模块内）

### data/ - 数据目录

存放测试数据、示例数据等。

**原则**：
- 运行时数据存放在数据库
- 测试数据可以放这里
- 大文件、敏感数据不提交

**注意**：
- 已在 `.gitignore` 中配置，不会提交实际数据
- 仅提交 README 和必要的测试数据

### 模块目录

每个模块是一个独立的应用，有完整的目录结构。

**标准结构**：
```
module_name/
├── app/              # 应用代码
├── scripts/          # 模块脚本
├── tests/            # 测试代码
├── docs/             # 模块文档
├── requirements.txt  # Python依赖
├── .env.example     # 环境变量示例
└── README.md        # 模块说明
```

## 文件组织原则

### 1. 关注点分离

- **代码** → 模块的 `app/` 目录
- **文档** → `docs/` 或 模块的 `docs/`
- **脚本** → `scripts/` 或 模块的 `scripts/`
- **数据** → `data/` 或 数据库
- **配置** → `.env` 或 模块的 `.env`

### 2. 层级清晰

```
项目级别          → 根目录（README, ARCHITECTURE等）
  ↓
模块级别          → 模块目录（模块README, 模块文档等）
  ↓
功能级别          → 模块的app/目录（代码实现）
```

### 3. 职责明确

| 需求 | 位置 |
|------|------|
| 了解项目概况 | `README.md` |
| 了解架构设计 | `ARCHITECTURE.md` |
| 开发新模块 | `MODULE_GUIDE.md` |
| 查找文档 | `DOCS_INDEX.md` |
| 配置环境 | `.env.example` |
| 查看目录结构 | `PROJECT_STRUCTURE.md` |
| 运行脚本 | `scripts/` |
| 模块详情 | `模块名/README.md` |

## 环境变量管理

### 多层级配置

```
.env                      # 根目录：项目通用配置
├── zhixing_backend/.env # 模块：股票交易专用配置
├── bitcoin_trader/.env  # 模块：比特币交易专用配置
└── sentiment_monitor/.env # 模块：舆情监控专用配置
```

### 配置优先级

1. 模块的 `.env` （最高优先级）
2. 根目录的 `.env`
3. 系统环境变量
4. 默认值（代码中定义）

### 配置示例

**根目录 `.env`** - 共享配置：
```env
DB_HOST=localhost
DB_PORT=3306
REDIS_HOST=localhost
LOG_LEVEL=INFO
```

**模块 `.env`** - 模块专用：
```env
APP_NAME=BitcoinTrader
API_PORT=8001
BINANCE_API_KEY=xxx
```

## 文档查找指南

### 我想了解...

| 需求 | 查看 |
|------|------|
| 项目是什么 | `README.md` |
| 如何开始 | `README.md` → 快速开始 |
| 系统架构 | `ARCHITECTURE.md` |
| 如何开发新模块 | `MODULE_GUIDE.md` |
| 所有文档列表 | `DOCS_INDEX.md` |
| 目录结构 | `PROJECT_STRUCTURE.md`（本文） |
| 股票交易功能 | `docs/README.md` |
| 比特币交易功能 | `bitcoin_trader/README.md` |
| 如何写策略 | `bitcoin_trader/docs/CUSTOM_STRATEGY.md` |

## 添加新模块

当添加新模块时：

1. **创建模块目录**
   ```bash
   mkdir new_module
   ```

2. **创建标准结构**（参考 `MODULE_GUIDE.md`）

3. **更新根目录文档**
   - [ ] 更新 `README.md`（添加模块说明）
   - [ ] 更新 `DOCS_INDEX.md`（添加模块文档链接）
   - [ ] 更新 `PROJECT_STRUCTURE.md`（本文件）
   - [ ] 更新 `ARCHITECTURE.md`（如有架构变化）

4. **创建模块文档**
   - [ ] 模块的 `README.md`
   - [ ] 模块的 `docs/` 目录

## 清理原则

### 什么应该在根目录？

✅ **应该**：
- 项目核心文档（README、架构、指南）
- 配置文件（.env.example, .gitignore）
- 通用的脚本和数据目录

❌ **不应该**：
- 模块专用的代码
- 模块专用的文档
- 临时文件、测试数据
- IDE配置文件
- 编译产物

### 定期清理

建议定期检查并清理：
- 过时的文档 → 移到 `docs/06-legacy/`
- 临时文件 → 删除
- 未使用的脚本 → 删除或归档
- 散落的配置 → 整合到 `.env`

## 总结

- ✅ **代码在模块内** - 每个模块独立完整
- ✅ **文档有层级** - 项目级 vs 模块级
- ✅ **配置分离** - 根目录通用 + 模块专用
- ✅ **脚本分类** - 通用脚本 vs 模块脚本
- ✅ **数据隔离** - 测试数据 vs 运行时数据

---

**最后更新**: 2025-10-17

