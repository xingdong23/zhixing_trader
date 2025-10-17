# 📚 文档索引

智行交易系统采用**模块化架构**，每个模块都有独立的文档。

## 📂 文档目录结构

```
zhixing_trader/
├── 📖 README.md                      ← 项目总览（从这里开始！）
├── 🏗️ ARCHITECTURE.md                整体架构设计
├── 📚 DOCS_INDEX.md                  本文档索引
├── 🔧 MODULE_GUIDE.md                模块开发指南
│
├── docs/                            共享文档目录
│   ├── 📖 README.md                 文档中心
│   ├── 🚀 01-getting-started/       快速入门指南
│   ├── ✨ 02-features/              功能特性文档
│   ├── 📊 03-data-sources/          数据源配置
│   ├── 🧪 04-testing/               测试文档和工具
│   ├── 🏗️ 05-architecture/          架构设计文档
│   └── 📦 06-legacy/                历史参考文档
│
├── zhixing_backend/                 股票交易模块
│   └── [模块文档]
│
├── bitcoin_trader/                  比特币交易模块 🆕
│   ├── README.md                    模块说明
│   └── docs/                        模块文档
│       ├── ARCHITECTURE.md          架构文档
│       └── QUICKSTART.md           快速开始
│
└── zhixing_fronted/                 前端界面
    └── README.md
```

## 🎯 快速导航

### 新用户
👉 **从这里开始**: [README.md](./README.md) - 项目总览

### 架构和设计
| 文档 | 说明 |
|------|------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 整体架构设计 |
| [MODULE_GUIDE.md](./MODULE_GUIDE.md) | 模块开发指南 |

### 各模块文档

#### 📈 股票交易模块 (zhixing_backend)
| 需求 | 文档 |
|------|------|
| 启动系统 | [START_GUIDE.md](./docs/01-getting-started/START_GUIDE.md) |
| 配置环境 | [ENV_EXAMPLE.md](./docs/01-getting-started/ENV_EXAMPLE.md) |
| 配置数据源 | [ALPHA_VANTAGE_SETUP.md](./docs/03-data-sources/ALPHA_VANTAGE_SETUP.md) |
| 分类功能 | [CATEGORY_SYSTEM_GUIDE.md](./docs/02-features/CATEGORY_SYSTEM_GUIDE.md) |
| 系统测试 | [TESTING_GUIDE.md](./docs/04-testing/TESTING_GUIDE.md) |

#### 🪙 比特币交易模块 (bitcoin_trader) 🆕
| 需求 | 文档 |
|------|------|
| 模块说明 | [bitcoin_trader/README.md](./bitcoin_trader/README.md) |
| 快速开始 | [bitcoin_trader/docs/QUICKSTART.md](./bitcoin_trader/docs/QUICKSTART.md) |
| 架构设计 | [bitcoin_trader/docs/ARCHITECTURE.md](./bitcoin_trader/docs/ARCHITECTURE.md) |

## 📊 文档统计

- **模块数**: 3个 (股票、比特币、前端)
- **共享文档**: 31个
- **模块文档**: 3个
- **测试工具**: 4个HTML页面
- **最后更新**: 2025-10-17

## 🔍 搜索文档

```bash
# 在所有文档中搜索关键词
grep -r "关键词" docs/

# 列出所有文档
find docs/ -name "*.md" -o -name "*.html"
```

## 📝 文档更新日志

### 2025-10-17 - 模块化架构
- ✅ 创建比特币交易模块 (bitcoin_trader)
- ✅ 建立模块化架构文档
- ✅ 添加模块开发指南
- ✅ 更新项目总览文档

### 2025-10-16 - 文档重组
- ✅ 将分散的文档整理到分类目录
- ✅ 创建详细的文档中心索引
- ✅ 添加快速导航和查找功能
- ✅ 优化文档命名和组织结构

---

**💡 提示**: 
- 项目总览: [README.md](./README.md)
- 架构设计: [ARCHITECTURE.md](./ARCHITECTURE.md)
- 模块开发: [MODULE_GUIDE.md](./MODULE_GUIDE.md)
- 股票模块文档: [docs/README.md](./docs/README.md)
- 比特币模块文档: [bitcoin_trader/README.md](./bitcoin_trader/README.md)

**🚀 开始使用**: 
- 股票交易: `cd zhixing_backend && python run.py`
- 比特币交易: `cd bitcoin_trader && python run.py`
- 前端界面: `cd zhixing_fronted && npm run dev`

