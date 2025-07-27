# 知行交易系统 - 重构后的分层架构

## 🏗️ 架构重构完成

系统已经重构为**分层清晰、扩展性良好**的架构，删除了所有无用代码！

## 🏛️ 新架构特点

### 📁 **分层清晰**
```
api-server/app/
├── api/                    # API层 - HTTP接口
│   └── v1/endpoints/       # 版本化的API端点
├── core/                   # 核心层 - 业务逻辑
│   ├── interfaces.py       # 抽象接口定义
│   ├── strategy/           # 策略引擎
│   ├── analysis/           # 技术分析
│   └── market_data/        # 数据获取
├── services/               # 服务层 - 业务服务
├── repositories/           # 仓库层 - 数据访问
└── models/                 # 模型层 - 数据模型
```

### 🔧 **扩展性设计**
- **依赖注入**：使用Container管理所有依赖
- **接口抽象**：所有核心组件都有抽象接口
- **策略模式**：策略可以动态注册和扩展
- **工厂模式**：数据源可以灵活切换
- **版本控制**：API支持版本化

### ✅ **核心功能**
- **Yahoo Finance数据**：真实股票数据获取
- **技术分析引擎**：专业的TA-Lib指标计算
- **策略执行引擎**：可扩展的选股策略系统
- **RESTful API**：标准化的HTTP接口

## 🚀 快速启动

### 1. 启动后端服务

```bash
# 方法一：使用启动脚本（推荐）
python start_backend.py

# 方法二：手动启动
cd api-server
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. 启动前端

```bash
# 在另一个终端
npm run dev
```

### 3. 访问应用

- **前端界面**：http://localhost:3000
- **后端API**：http://localhost:8000
- **API文档**：http://localhost:8000/docs
- **健康检查**：http://localhost:8000/api/health

## 📋 新API接口

### 策略相关
```
GET    /api/v1/strategies/                    # 获取所有策略
POST   /api/v1/strategies/{id}/execute        # 执行策略
POST   /api/v1/strategies/execute-all         # 执行所有策略
GET    /api/v1/strategies/available           # 获取可用策略类型
POST   /api/v1/strategies/trigger-data-update # 手动更新数据
```

### 股票相关
```
GET    /api/v1/stocks/                        # 获取所有股票
POST   /api/v1/stocks/                        # 添加股票
DELETE /api/v1/stocks/{symbol}                # 删除股票
GET    /api/v1/stocks/search?keyword=xxx      # 搜索股票
GET    /api/v1/stocks/{symbol}                # 获取股票详情
```

### 市场数据
```
GET    /api/v1/market-data/klines/{symbol}    # 获取K线数据
GET    /api/v1/market-data/info/{symbol}      # 获取股票信息
POST   /api/v1/market-data/validate/{symbol}  # 验证股票代码
POST   /api/v1/market-data/update             # 更新市场数据
DELETE /api/v1/market-data/cleanup            # 清理过期数据
```

## 📋 使用流程

### 第一次使用

1. **启动后端**：运行 `python start_backend.py`
2. **添加自选股**：在前端添加一些测试股票（如AAPL、TSLA、MSFT）
3. **手动更新数据**：点击"手动触发数据更新"按钮
4. **执行策略**：点击策略的"运行策略"按钮
5. **查看结果**：在选股结果页面查看筛选出的股票

### 日常使用

- **自动运行**：系统每天6点自动更新数据并执行策略
- **手动执行**：随时可以手动触发策略执行
- **结果查看**：在"选股结果"页面查看最新的选股结果

## 🎯 核心策略说明

### 1. EMA55回踩企稳策略

**策略逻辑**：
- 检测前期主升浪（涨幅>20%）
- 回踩EMA55不破（允许3%误差）
- 1小时级别企稳（8小时内波动<2%）

**评分规则**：
- 基础分：50分
- 主升浪涨幅加分：最高25分
- 回踩幅度适中加分：15分
- 企稳确认加分：15分

### 2. 均线缠绕突破策略

**策略逻辑**：
- 5日、10日、20日均线缠绕（价格区间<2%）
- 缠绕持续至少5天
- 向上突破3%以上
- 成交量放大确认（1.5倍以上）

**评分规则**：
- 基础分：60分
- 缠绕时间加分：最高20分
- 突破幅度加分：最高15分
- 成交量确认加分：10分

## 🔧 技术架构

### 后端技术栈
- **FastAPI**：高性能异步Web框架
- **SQLAlchemy**：ORM数据库操作
- **TA-Lib**：专业技术指标计算
- **yfinance**：Yahoo Finance数据获取
- **SQLite**：轻量级数据库（可迁移到MySQL）

### 数据库设计
- **stocks**：股票基础信息
- **klines**：K线数据（OHLCV）
- **strategies**：选股策略配置
- **selection_results**：选股结果记录

### API接口
```
GET    /strategies              # 获取所有策略
POST   /strategies              # 创建新策略
POST   /strategies/{id}/execute # 执行策略
GET    /strategies/{id}/results # 获取策略结果
POST   /strategies/trigger-data-update # 手动更新数据
```

## 📊 数据流程

1. **数据获取**：Yahoo Finance → 本地数据库
2. **技术分析**：K线数据 → TA-Lib计算 → 技术指标
3. **策略执行**：技术指标 → 策略算法 → 选股结果
4. **结果展示**：选股结果 → 前端界面

## 🔍 调试和监控

### 查看日志
```bash
# 后端日志会显示在终端
# 包含数据更新、策略执行、API调用等信息
```

### 检查数据库
```bash
# SQLite数据库文件位置
ls -la api-server/data/

# 可以使用SQLite浏览器查看数据
```

### API测试
```bash
# 健康检查
curl http://localhost:8000/api/health

# 获取策略列表
curl http://localhost:8000/strategies

# 执行策略
curl -X POST http://localhost:8000/strategies/1/execute
```

## 🚨 常见问题

### Q: 策略执行没有结果？
A: 确保自选股列表不为空，且已经获取了足够的历史数据（至少60个数据点）。

### Q: 数据更新失败？
A: 检查网络连接，Yahoo Finance API可能有访问限制。

### Q: 前端无法连接后端？
A: 确保后端服务在8000端口正常运行，检查CORS配置。

### Q: 如何添加新的选股策略？
A: 在 `technical_analysis.py` 中实现新的分析方法，在 `strategy_service.py` 中添加策略执行逻辑。

## 🎯 下一步优化

1. **更多策略**：添加更多技术分析策略
2. **实时数据**：集成实时股价数据源
3. **回测功能**：添加策略历史回测
4. **风险管理**：完善风险评估和仓位管理
5. **通知系统**：选股结果邮件/微信通知

---

**恭喜！** 🎉 你现在拥有一个完整的、真实的股票选股系统了！

不再是模拟数据，而是：
- ✅ 真实的Yahoo Finance数据
- ✅ 真实的技术指标计算  
- ✅ 真实的选股策略算法
- ✅ 完整的数据持久化
- ✅ 自动化的定时任务

开始你的量化交易之旅吧！ 🚀
