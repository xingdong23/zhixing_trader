# 📚 智行交易系统 - 项目导航

> **最后更新**: 2025-11-05  
> **版本**: V3.0

---

## 🎯 系统简介

智行交易系统是一个专业的量化交易平台，支持**股票**和**加密货币**的策略开发、回测和实盘交易。

---

## 🚀 快速开始

### 方式一：Docker部署（推荐）

```bash
# 启动所有服务
docker-compose up -d

# 访问服务
# 前端: http://localhost:3000
# 交易日志API: http://localhost:8001/docs
# 策略交易API: http://localhost:8002/docs
```

### 方式二：本地开发

```bash
# 1. 启动交易日志服务
cd stock_trading_journal && python run.py

# 2. 启动股票策略交易服务
cd stock_strategy_trading && python run.py

# 3. 启动前端
cd zhixing_frontend && npm run dev

# 4. 运行加密货币策略
cd crypto_strategy_trading && python live_trading/ema_simple_trend.py
```

---

## 📦 核心模块

### 1️⃣ stock_trading_journal (股票交易日志)
- **端口**: 8001
- **功能**: 交易记录、股票管理、数据同步
- **文档**: `stock_trading_journal/文档/`

### 2️⃣ stock_strategy_trading (股票策略交易)
- **端口**: 8002
- **功能**: 策略开发、回测、实盘交易
- **文档**: `stock_strategy_trading/文档/`

### 3️⃣ crypto_strategy_trading (加密货币交易)
- **功能**: EMA策略、高频策略、实盘交易（OKX）
- **主力策略**: EMA Simple Trend (收益率 +78%)
- **文档**: `crypto_strategy_trading/docs/`

### 4️⃣ stock_market_data (股票行情数据)
- **功能**: 多数据源接入（Yahoo Finance、Alpha Vantage、富途）
- **文档**: `stock_market_data/文档/`

### 5️⃣ unified_backtesting (统一回测引擎)
- **功能**: 股票和加密货币的统一回测框架
- **文档**: `unified_backtesting/README.md`

### 6️⃣ zhixing_frontend (前端界面)
- **端口**: 3000
- **技术**: Next.js 15 + React 19 + shadcn/ui
- **功能**: 交易监控、策略管理、数据可视化

---

## 🗄️ 数据库

所有数据库Schema定义在 `database/schema/` 目录：

- `trading_journal_schema.mysql.sql` - 交易日志数据库
- `stock_strategy_trading_schema.mysql.sql` - 股票策略数据库
- `crypto_trading_schema.mysql.sql` - 加密货币数据库

**详细说明**: `database/README.md`

---

## 📖 文档导航

### 快速开始
- [启动服务指南](文档/01-快速开始/启动服务指南.md)
- [项目结构说明](文档/01-快速开始/项目结构说明.md)

### 架构设计
- [系统架构](文档/02-架构设计/系统架构.md)
- [模块指南](文档/02-架构设计/模块指南.md)

### 重构记录
- [完整重构总结](文档/03-重构记录/完整重构总结.md)
- [数据库重构总结](文档/03-重构记录/数据库重构总结.md)

### 模块交付
- [7个核心功能开发完成](文档/04-模块交付/7个核心功能开发完成.md)
- [市场数据服务完成](文档/04-模块交付/市场数据服务完成.md)

**完整文档**: [文档/README.md](文档/README.md)

---

## 🛠️ 技术栈

### 后端
- **语言**: Python 3.10+
- **框架**: FastAPI
- **数据库**: MySQL 8.0+
- **依赖管理**: pip + requirements.txt

### 前端
- **框架**: Next.js 15
- **UI**: React 19 + shadcn/ui
- **样式**: Tailwind CSS
- **包管理**: pnpm

### 数据源
- **股票**: Yahoo Finance, Alpha Vantage, 富途OpenAPI
- **加密货币**: Binance, OKX

---

## 📊 核心功能状态

### 已完成 ✅
- [x] 交易日志系统
- [x] 股票数据管理
- [x] 策略开发框架
- [x] 多数据源支持
- [x] 加密货币策略（EMA Simple Trend）
- [x] 统一回测引擎
- [x] 前端界面

### 开发中 🔄
- [ ] 参数优化工具
- [ ] 高级可视化报告
- [ ] 风控系统增强

---

## 🔗 相关链接

- **API文档**: 
  - 交易日志: http://localhost:8001/docs
  - 策略交易: http://localhost:8002/docs
  
- **前端**: http://localhost:3000

- **GitHub**: (填入你的仓库地址)

---

## ⚠️ 重要提示

1. **环境隔离**: 开发和生产环境使用不同的配置文件
2. **数据备份**: 定期备份数据库
3. **API密钥**: 妥善保管交易所API密钥，设置IP白名单
4. **风险控制**: 实盘交易前务必在模拟盘充分测试
5. **小额起步**: 初期使用小额资金，逐步增加

---

## 📝 版本历史

### V3.0 (2025-11-05) - 统一量化平台
- ✅ 新增统一回测模块
- ✅ 支持股票和加密货币统一管理
- ✅ 模块重命名，职责更清晰
- ✅ 完善的文档体系

### V2.0 (2025-10-17) - 模块化架构
- ✅ 拆分为独立模块
- ✅ 清晰的职责划分

### V1.0
- ✅ 单体后端架构
- ✅ 基础策略系统

---

## 📞 支持与反馈

如有问题或建议，请：
1. 查看项目文档
2. 提交 GitHub Issue
3. 联系项目维护人

---

**Happy Trading! 📈**

