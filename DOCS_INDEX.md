# 📚 文档索引

所有项目文档已经过重新整理，现在位于 `docs/` 目录下，按功能分类。

## 📂 文档目录结构

```
docs/
├── 📖 README.md                    ← 完整的文档中心（从这里开始！）
├── 🚀 01-getting-started/          快速入门指南
├── ✨ 02-features/                 功能特性文档
├── 📊 03-data-sources/             数据源配置
├── 🧪 04-testing/                  测试文档和工具
├── 🏗️ 05-architecture/             架构设计文档
└── 📦 06-legacy/                   历史参考文档
```

## 🎯 快速导航

### 新用户
👉 **从这里开始**: [docs/README.md](./docs/README.md)

### 常用文档

| 需求 | 文档 |
|------|------|
| 启动系统 | [START_GUIDE.md](./docs/01-getting-started/START_GUIDE.md) |
| 配置环境 | [ENV_EXAMPLE.md](./docs/01-getting-started/ENV_EXAMPLE.md) |
| 配置数据源 | [ALPHA_VANTAGE_SETUP.md](./docs/03-data-sources/ALPHA_VANTAGE_SETUP.md) |
| 分类功能 | [CATEGORY_SYSTEM_GUIDE.md](./docs/02-features/CATEGORY_SYSTEM_GUIDE.md) |
| 系统测试 | [TESTING_GUIDE.md](./docs/04-testing/TESTING_GUIDE.md) |

## 📊 文档统计

- **总文档数**: 31个
- **分类数**: 6个
- **测试工具**: 4个HTML页面
- **最后更新**: 2025-10-16

## 🔍 搜索文档

```bash
# 在所有文档中搜索关键词
grep -r "关键词" docs/

# 列出所有文档
find docs/ -name "*.md" -o -name "*.html"
```

## 📝 文档更新日志

### 2025-10-16 - 文档重组
- ✅ 将分散的文档整理到分类目录
- ✅ 创建详细的文档中心索引
- ✅ 添加快速导航和查找功能
- ✅ 优化文档命名和组织结构

---

**💡 提示**: 
- 完整的文档导航和说明请查看 [docs/README.md](./docs/README.md)
- 所有功能文档都有详细的使用说明和示例代码
- 测试工具可以直接在浏览器中打开使用

**🚀 开始使用**: `cd docs && cat README.md`

