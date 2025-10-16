# 📚 知行交易系统 - 文档中心

> 完整的项目文档，按类别精心组织

## 📖 文档导航

### 🚀 [01-getting-started](./01-getting-started/) - 快速入门

新手必读，快速上手系统。

| 文档 | 说明 | 适用人群 |
|------|------|----------|
| [START_GUIDE.md](./01-getting-started/START_GUIDE.md) | 系统启动指南 | ⭐ 所有用户 |
| [ENV_EXAMPLE.md](./01-getting-started/ENV_EXAMPLE.md) | 环境变量配置示例 | ⭐ 开发者 |

**快速开始**：
```bash
# 1. 查看启动指南
cat docs/01-getting-started/START_GUIDE.md

# 2. 配置环境变量
cp docs/01-getting-started/ENV_EXAMPLE.md .env

# 3. 启动服务
./start_with_mysql.sh
```

---

### ✨ [02-features](./02-features/) - 功能特性

系统所有功能的详细说明。

#### 核心功能

| 文档 | 功能 | 优先级 | 状态 |
|------|------|--------|------|
| [CATEGORY_SYSTEM_GUIDE.md](./02-features/CATEGORY_SYSTEM_GUIDE.md) | 多级分类树系统 | ⭐⭐⭐ | ✅ 已完成 |
| [SMART_SYNC_SYSTEM.md](./02-features/SMART_SYNC_SYSTEM.md) | 智能数据同步 | ⭐⭐⭐ | ✅ 已完成 |
| [SNAPSHOT_FEATURE.md](./02-features/SNAPSHOT_FEATURE.md) | 快照功能 | ⭐⭐ | ✅ 已完成 |
| [EDIT_PLAN_FEATURE.md](./02-features/EDIT_PLAN_FEATURE.md) | 编辑计划功能 | ⭐⭐ | ✅ 已完成 |

#### 分类系统详解

| 文档 | 说明 |
|------|------|
| [CATEGORY_FEATURE_SUMMARY.md](./02-features/CATEGORY_FEATURE_SUMMARY.md) | 分类功能总结 |
| [CATEGORY_INTEGRATION_GUIDE.md](./02-features/CATEGORY_INTEGRATION_GUIDE.md) | 分类集成指南 |
| [CATEGORY_UPDATE_V2.md](./02-features/CATEGORY_UPDATE_V2.md) | 分类系统v2更新 |

#### 交易策略

| 文档 | 说明 |
|------|------|
| [ADVANCED_TRADING_SYSTEM.md](./02-features/ADVANCED_TRADING_SYSTEM.md) | 高级交易系统 |
| [SIMPLIFIED_TRADING_PLAN.md](./02-features/SIMPLIFIED_TRADING_PLAN.md) | 简化交易计划 |

---

### 📊 [03-data-sources](./03-data-sources/) - 数据源

多数据源配置和集成指南。

| 文档 | 说明 | 重要度 |
|------|------|--------|
| [ALPHA_VANTAGE_SETUP.md](./03-data-sources/ALPHA_VANTAGE_SETUP.md) | ⭐ Alpha Vantage 快速配置 | ⭐⭐⭐ |
| [ALPHA_VANTAGE_INTEGRATION.md](./03-data-sources/ALPHA_VANTAGE_INTEGRATION.md) | Alpha Vantage 详细集成文档 | ⭐⭐⭐ |
| [CONFIG_ALPHAVANTAGE.md](./03-data-sources/CONFIG_ALPHAVANTAGE.md) | 配置说明 | ⭐⭐ |
| [ALPHAVANTAGE_TEST_REPORT.md](./03-data-sources/ALPHAVANTAGE_TEST_REPORT.md) | 集成测试报告 | ⭐ |
| [DATA_SOURCE_TEST_REPORT.md](./03-data-sources/DATA_SOURCE_TEST_REPORT.md) | 数据源对比测试 | ⭐ |

**数据源对比**：

| 数据源 | 免费额度 | 稳定性 | 推荐度 |
|--------|---------|--------|--------|
| 雅虎财经 | 不限 | ⭐⭐⭐ | 主数据源 |
| Alpha Vantage | 500次/天 | ⭐⭐⭐⭐⭐ | 备用数据源 |
| **混合模式** | 最大化 | ⭐⭐⭐⭐⭐ | **强烈推荐** |

**配置示例**：
```bash
# .env 配置（推荐）
MARKET_DATA_PROVIDER=hybrid
PRIMARY_DATA_SOURCE=yahoo
ALPHA_VANTAGE_API_KEY=your_api_key
```

---

### 🧪 [04-testing](./04-testing/) - 测试文档

测试指南和测试工具。

#### 测试指南

| 文档 | 说明 |
|------|------|
| [TESTING_GUIDE.md](./04-testing/TESTING_GUIDE.md) | 完整测试指南 |
| [PASTE_TEST_GUIDE.md](./04-testing/PASTE_TEST_GUIDE.md) | 粘贴功能测试 |

#### 测试工具

| 工具 | 功能 | 使用方式 |
|------|------|----------|
| [test_category_system.html](./04-testing/test_category_system.html) | 分类系统测试 | 浏览器打开 |
| [test_data_sources.html](./04-testing/test_data_sources.html) | 数据源测试 | 浏览器打开 |
| [test_strategy.html](./04-testing/test_strategy.html) | 策略测试 | 浏览器打开 |
| [test_sync.html](./04-testing/test_sync.html) | 同步测试 | 浏览器打开 |

**快速测试**：
```bash
# 打开测试页面
open docs/04-testing/test_data_sources.html

# 或使用脚本测试
python zhixing_backend/scripts/test_data_sources.py
```

---

### 🏗️ [05-architecture](./05-architecture/) - 架构设计

系统架构和技术文档。

#### 系统设计

| 文档 | 说明 | 面向人群 |
|------|------|----------|
| [TRADING_SYSTEM_PRD.md](./05-architecture/TRADING_SYSTEM_PRD.md) | 产品需求文档 | 产品经理 |
| [DESIGN_SYSTEM.md](./05-architecture/DESIGN_SYSTEM.md) | 系统设计文档 | 架构师 |
| [IMPLEMENTATION_ROADMAP.md](./05-architecture/IMPLEMENTATION_ROADMAP.md) | 实施路线图 | 项目经理 |

#### 重构文档

| 文档 | 说明 |
|------|------|
| [API_REFACTOR.md](./05-architecture/API_REFACTOR.md) | API重构方案 |
| [REFACTOR_PLAN.md](./05-architecture/REFACTOR_PLAN.md) | 重构计划 |
| [REFACTOR_EXECUTION.md](./05-architecture/REFACTOR_EXECUTION.md) | 重构执行记录 |

**技术栈**：
```
前端: Next.js + React + TypeScript + Tailwind CSS
后端: FastAPI + Python + SQLAlchemy
数据库: MySQL
数据源: Yahoo Finance + Alpha Vantage (混合模式)
```

---

### 📦 [06-legacy](./06-legacy/) - 历史文档

过期或参考文档，仅供查阅。

| 文档 | 说明 |
|------|------|
| [CLEANUP_NOTICE.md](./06-legacy/CLEANUP_NOTICE.md) | 清理通知 |
| [DEMO.md](./06-legacy/DEMO.md) | 演示文档 |
| [xiangfa.md](./06-legacy/xiangfa.md) | 想法记录 |

> ⚠️ 这些文档可能已过期，仅供历史参考。

---

## 🗂️ 文档分类说明

### 📁 目录结构

```
docs/
├── 01-getting-started/      # 🚀 新手入门
│   ├── START_GUIDE.md
│   └── ENV_EXAMPLE.md
├── 02-features/             # ✨ 功能文档
│   ├── CATEGORY_SYSTEM_GUIDE.md
│   ├── SMART_SYNC_SYSTEM.md
│   └── ...
├── 03-data-sources/         # 📊 数据源
│   ├── ALPHA_VANTAGE_SETUP.md
│   ├── ALPHA_VANTAGE_INTEGRATION.md
│   └── ...
├── 04-testing/              # 🧪 测试
│   ├── TESTING_GUIDE.md
│   ├── test_*.html
│   └── ...
├── 05-architecture/         # 🏗️ 架构
│   ├── TRADING_SYSTEM_PRD.md
│   ├── DESIGN_SYSTEM.md
│   └── ...
└── 06-legacy/               # 📦 历史
    └── ...
```

### 🎯 使用建议

#### 新用户路径
```
1. START_GUIDE.md           → 了解如何启动系统
2. ENV_EXAMPLE.md           → 配置环境变量
3. ALPHA_VANTAGE_SETUP.md   → 配置数据源
4. CATEGORY_SYSTEM_GUIDE.md → 学习核心功能
```

#### 开发者路径
```
1. DESIGN_SYSTEM.md          → 理解系统架构
2. API_REFACTOR.md           → 了解API设计
3. TESTING_GUIDE.md          → 学习测试方法
4. 功能文档                   → 深入特定功能
```

#### 运维路径
```
1. START_GUIDE.md            → 部署系统
2. ALPHA_VANTAGE_SETUP.md    → 配置数据源
3. SMART_SYNC_SYSTEM.md      → 配置数据同步
4. 测试工具                   → 验证系统
```

---

## 🔍 快速查找

### 按关键词查找

| 关键词 | 相关文档 |
|--------|----------|
| **启动/部署** | [START_GUIDE.md](./01-getting-started/START_GUIDE.md) |
| **环境配置** | [ENV_EXAMPLE.md](./01-getting-started/ENV_EXAMPLE.md) |
| **分类系统** | [CATEGORY_SYSTEM_GUIDE.md](./02-features/CATEGORY_SYSTEM_GUIDE.md) |
| **数据源** | [ALPHA_VANTAGE_SETUP.md](./03-data-sources/ALPHA_VANTAGE_SETUP.md) |
| **数据同步** | [SMART_SYNC_SYSTEM.md](./02-features/SMART_SYNC_SYSTEM.md) |
| **测试** | [TESTING_GUIDE.md](./04-testing/TESTING_GUIDE.md) |
| **架构设计** | [DESIGN_SYSTEM.md](./05-architecture/DESIGN_SYSTEM.md) |
| **API文档** | [API_REFACTOR.md](./05-architecture/API_REFACTOR.md) |

### 按问题查找

| 问题 | 解决方案 |
|------|----------|
| 如何启动系统？ | → [START_GUIDE.md](./01-getting-started/START_GUIDE.md) |
| 如何配置API Key？ | → [ALPHA_VANTAGE_SETUP.md](./03-data-sources/ALPHA_VANTAGE_SETUP.md) |
| 数据源被限流？ | → [DATA_SOURCE_TEST_REPORT.md](./03-data-sources/DATA_SOURCE_TEST_REPORT.md) |
| 如何使用分类？ | → [CATEGORY_SYSTEM_GUIDE.md](./02-features/CATEGORY_SYSTEM_GUIDE.md) |
| 如何测试系统？ | → [TESTING_GUIDE.md](./04-testing/TESTING_GUIDE.md) |

---

## 📊 文档统计

| 分类 | 文档数 | 更新状态 |
|------|--------|----------|
| 快速入门 | 2 | ✅ 最新 |
| 功能特性 | 9 | ✅ 最新 |
| 数据源 | 5 | ✅ 最新 |
| 测试 | 6 | ✅ 最新 |
| 架构 | 6 | ✅ 最新 |
| 历史 | 3 | ⚠️ 过期 |
| **总计** | **31** | - |

---

## 🆘 获取帮助

### 常见问题

1. **找不到某个文档？**
   - 使用上方的"快速查找"表格
   - 在项目根目录搜索：`grep -r "关键词" docs/`

2. **文档过期了？**
   - 检查文档顶部的更新日期
   - 查看 git 历史：`git log --follow <文件路径>`

3. **需要更多文档？**
   - 查看项目 Issues
   - 联系开发团队

### 贡献文档

欢迎贡献文档！请遵循：

1. **文档命名**：使用大写字母和下划线，如 `NEW_FEATURE.md`
2. **文档位置**：放在对应的分类目录下
3. **文档格式**：使用 Markdown，包含标题、说明、示例
4. **更新索引**：在本 README 中添加链接

---

## 📅 最后更新

- **日期**: 2025-10-16
- **版本**: v2.0
- **变更**: 文档重新分类整理，优化目录结构

---

## 📝 更新日志

### v2.0 (2025-10-16)
- ✅ 重新组织文档结构
- ✅ 按功能分类到6个目录
- ✅ 创建详细的文档索引
- ✅ 添加快速查找表格
- ✅ 完善文档导航

### v1.0 (之前)
- 文档分散在根目录和docs目录
- 缺乏统一的组织结构

---

**知行交易系统** - 让交易更智能 🚀
