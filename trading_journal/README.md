# 📒 Trading Journal - 交易日志系统

专业的交易记录和管理系统，支持股票数据管理、交易记录、绩效分析。

---

## 📖 快速导航

### 🚀 快速开始
- **[启动指南](文档/快速开始/启动指南.md)** - 快速启动系统
- **[环境变量示例](文档/快速开始/环境变量示例.md)** - 环境配置说明

### 💾 数据库
- **[数据库优化](文档/数据库/数据库优化.md)** - 数据库性能优化
- **[数据库变更总结](文档/数据库/数据库变更总结.md)** - 数据库变更记录

### 📈 股票初始化
- **[股票初始化指南](文档/股票初始化/股票初始化指南.md)** - 如何初始化股票数据
- **[股票初始化总结](文档/股票初始化/股票初始化总结.md)** - 初始化过程总结
- **[测试数据创建总结](文档/股票初始化/测试数据创建总结.md)** - 测试数据创建

### ⚙️ 功能特性
- **[高级交易系统](文档/功能特性/高级交易系统.md)** - 高级功能介绍
- **[分类系统指南](文档/功能特性/分类系统指南.md)** - 股票分类管理
- **[分类集成指南](文档/功能特性/分类集成指南.md)** - 分类功能集成
- **[分类功能总结](文档/功能特性/分类功能总结.md)** - 功能实现总结
- **[分类更新V2](文档/功能特性/分类更新V2.md)** - V2版本更新
- **[智能同步系统](文档/功能特性/智能同步系统.md)** - 数据同步机制
- **[编辑计划功能](文档/功能特性/编辑计划功能.md)** - 交易计划编辑
- **[简化交易计划](文档/功能特性/简化交易计划.md)** - 简化版交易计划
- **[快照功能](文档/功能特性/快照功能.md)** - 数据快照功能

### 🧪 测试
- **[测试指南](文档/测试/测试指南.md)** - 测试方法说明
- **[粘贴测试指南](文档/测试/粘贴测试指南.md)** - 粘贴导入测试

### 🏗️ 架构设计
- **[交易系统PRD](文档/架构设计/交易系统PRD.md)** - 产品需求文档
- **[设计系统](文档/架构设计/设计系统.md)** - 系统设计文档
- **[API重构](文档/架构设计/API重构.md)** - API重构方案
- **[重构计划](文档/架构设计/重构计划.md)** - 重构计划
- **[重构执行](文档/架构设计/重构执行.md)** - 重构实施记录
- **[实施路线图](文档/架构设计/实施路线图.md)** - 功能路线图
- **[多K线表设计](文档/架构设计/多K线表设计.md)** - K线数据表设计

---

## 🎯 系统特点

### ✨ 核心功能
- ✅ **股票数据管理** - 股票基础信息、分类管理
- ✅ **数据同步** - 自动同步市场数据
- ✅ **分类系统** - 灵活的股票分类管理
- 🔄 **交易记录** - 交易历史记录（待增强）
- 🔄 **绩效分析** - 交易绩效分析（待增强）

### 📊 数据管理
- **股票信息** - symbol、名称、行业、市值等
- **K线数据** - 日线、周线、月线等多时间周期
- **股票分类** - 自定义分类体系
- **持仓管理** - 持仓记录和管理

---

## 🚀 快速开始

### 1. 安装依赖
```bash
cd trading_journal
pip install -r requirements.txt
```

### 2. 配置数据库
```bash
# 编辑配置文件
vim app/config.py

# 配置MySQL连接
DATABASE_URL=mysql+pymysql://user:pass@localhost:3306/trading_journal
```

### 3. 初始化数据库
```bash
# 运行初始化脚本
python scripts/init_database.py
```

### 4. 启动服务
```bash
# 启动API服务（端口8001）
python run.py
```

### 5. 访问API文档
http://localhost:8001/docs

---

## 📦 项目结构

```
trading_journal/
├── app/
│   ├── api/                      # API接口
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── stocks.py     # 股票API
│   │       │   ├── categories.py # 分类API
│   │       │   └── data_sync.py  # 数据同步API
│   │       └── api.py            # API路由
│   ├── core/
│   │   └── container.py          # 依赖注入
│   ├── services/                 # 业务服务
│   │   ├── stock_service.py      # 股票服务
│   │   ├── category_service.py   # 分类服务
│   │   └── sync_service.py       # 同步服务
│   ├── repositories/             # 数据访问
│   │   ├── stock_repository.py
│   │   └── category_repository.py
│   ├── utils/
│   │   └── market_data_helper.py # 数据源辅助
│   ├── models.py                 # 数据模型
│   ├── database.py               # 数据库连接
│   ├── config.py                 # 配置管理
│   └── main.py                   # FastAPI应用
├── scripts/                      # 工具脚本
│   └── init_database.py          # 数据库初始化
├── tests/                        # 测试代码
├── 文档/                         # 📚 项目文档
│   ├── 快速开始/
│   ├── 数据库/
│   ├── 股票初始化/
│   ├── 功能特性/
│   ├── 测试/
│   └── 架构设计/
├── requirements.txt              # 依赖列表
└── run.py                        # 启动脚本
```

---

## 🎮 API使用示例

### 获取股票列表
```bash
curl http://localhost:8001/api/v1/stocks/overview
```

### 获取股票详情
```bash
curl http://localhost:8001/api/v1/stocks/{symbol}
```

### 创建分类
```bash
curl -X POST http://localhost:8001/api/v1/categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "科技股",
    "description": "科技行业股票"
  }'
```

### 同步股票数据
```bash
curl -X POST http://localhost:8001/api/v1/sync/stocks \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": ["AAPL", "GOOGL", "MSFT"],
    "data_types": ["info", "kline"]
  }'
```

---

## 💾 数据库设计

### 核心表结构

#### stocks - 股票表
- id: 主键
- symbol: 股票代码
- name: 股票名称
- market: 市场（US/HK/CN）
- exchange: 交易所
- status: 状态

#### categories - 分类表
- id: 主键
- name: 分类名称
- parent_id: 父分类ID
- level: 层级
- description: 描述

#### category_stock_relations - 分类关系表
- id: 主键
- category_id: 分类ID
- stock_id: 股票ID

#### kline_daily - 日线表
- id: 主键
- stock_id: 股票ID
- trade_date: 交易日期
- open/high/low/close: OHLC
- volume: 成交量

详见 [多K线表设计](文档/架构设计/多K线表设计.md)

---

## 🔌 数据源集成

系统通过 `market_data_service` 模块统一接入市场数据：
- **Yahoo Finance** - 主要数据源
- **Alpha Vantage** - 备用数据源
- **Twelve Data** - 补充数据源
- **富途 OpenAPI** - 港股美股实时数据

详见 [Market Data Service 文档](../market_data_service/README.md)

---

## 📊 股票分类系统

### 分类层级
```
行业分类 (Level 1)
├── 科技 (Level 2)
│   ├── 互联网
│   ├── 半导体
│   └── 软件
├── 金融
│   ├── 银行
│   ├── 保险
│   └── 证券
└── 消费
    ├── 零售
    └── 食品
```

### 使用场景
- 股票筛选
- 组合管理
- 行业分析
- 自选股管理

详见 [分类系统指南](文档/功能特性/分类系统指南.md)

---

## 🔄 数据同步

### 同步类型
1. **股票信息同步** - 基础信息、公司概况
2. **K线数据同步** - 历史和实时K线
3. **分类数据同步** - 行业分类信息

### 同步策略
- **定时同步** - 每日定时自动同步
- **手动同步** - 按需手动触发
- **增量同步** - 只同步变化的数据

详见 [智能同步系统](文档/功能特性/智能同步系统.md)

---


## ⚙️ 配置说明

### 环境变量
```bash
# 数据库配置
DATABASE_URL=mysql+pymysql://user:pass@localhost:3306/trading_journal

# 数据源配置（使用 market_data_service）
# 详见 market_data_service 模块文档
```

详见 [环境变量示例](文档/快速开始/环境变量示例.md)

---

## 🧪 测试

### 运行测试
```bash
pytest tests/
```

### 测试覆盖
- 股票API测试
- 分类API测试
- 数据同步测试
- 数据库操作测试

详见 [测试指南](文档/测试/测试指南.md)

---

## 🔗 相关服务

### Quant Trading
- **端口**: 8002
- **功能**: 量化交易、策略执行
- **关系**: 使用 Trading Journal 的股票数据

### Market Data Service
- **功能**: 市场数据获取
- **关系**: Trading Journal 通过其获取数据

---

## 📈 开发路线图

### 已完成 ✅
- [x] 股票数据管理
- [x] 分类系统
- [x] 数据同步
- [x] 基础API

### 进行中 🔄
- [ ] 交易记录增强
- [ ] 绩效分析功能
- [ ] 持仓管理完善

### 计划中 📋
- [ ] 自选股组合
- [ ] 实时提醒
- [ ] 数据分析报告
- [ ] 移动端支持

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

MIT License

---

## 📞 获取帮助

- 查看 [快速开始](文档/快速开始/)
- 阅读 [功能特性](文档/功能特性/)
- 查看 [架构设计](文档/架构设计/)
- API文档: http://localhost:8001/docs

---

**专业交易日志系统**: 记录、分析、优化你的每一笔交易。

