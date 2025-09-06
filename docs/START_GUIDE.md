# 🚀 知行交易系统启动指南

## 📋 系统状态

✅ **架构重构完成** - 分层清晰，扩展性良好  
✅ **代码清理完成** - 删除无用代码，结构优化  
⚠️ **等待手动启动** - 由于环境限制，需要手动启动测试  

## 🎯 快速启动

### 1. 启动后端服务

```bash
# 进入后端目录
cd api-server

# 方式一：启动最小测试版本（推荐先测试）
python minimal_test.py

# 方式二：启动完整版本
python simple_start.py

# 方式三：使用虚拟环境
source venv/bin/activate
python minimal_test.py
```

### 2. 启动前端服务

```bash
# 在项目根目录
npm run dev
```

### 3. 访问测试

- **后端API文档**: http://localhost:8000/docs
- **后端健康检查**: http://localhost:8000/api/health  
- **前端界面**: http://localhost:3000
- **架构测试页面**: 已在浏览器中打开

## 🏗️ 新架构特点

### 📁 目录结构
```
api-server/app/
├── api/v1/endpoints/       # API层 - HTTP接口
├── core/                   # 核心层 - 业务逻辑
│   ├── interfaces.py       # 抽象接口定义
│   ├── strategy/           # 策略引擎
│   ├── analysis/           # 技术分析
│   ├── market_data/        # 数据获取
│   └── container.py        # 依赖注入
├── services/               # 服务层 - 业务服务
├── repositories/           # 仓库层 - 数据访问
└── models/                 # 模型层 - 数据模型
```

### 🔧 核心改进

1. **依赖注入容器** - 统一管理所有服务依赖
2. **接口抽象** - 所有核心组件都有抽象接口
3. **策略模式** - 策略可以动态注册和扩展
4. **工厂模式** - 数据源可以灵活切换
5. **版本控制** - API支持版本化 (/api/v1/)

## 🧪 测试步骤

### 后端测试
```bash
# 1. 测试基础连接
curl http://localhost:8000/api/health

# 2. 测试API文档
open http://localhost:8000/docs

# 3. 测试策略接口
curl http://localhost:8000/api/v1/strategies/

# 4. 测试股票接口
curl http://localhost:8000/api/v1/stocks/
```

### 前端测试
1. 访问 http://localhost:3000
2. 测试策略管理功能
3. 测试股票添加功能
4. 测试选股结果查看

## 📊 API接口

### 策略相关
- `GET /api/v1/strategies/` - 获取所有策略
- `POST /api/v1/strategies/{id}/execute` - 执行策略
- `POST /api/v1/strategies/execute-all` - 执行所有策略
- `GET /api/v1/strategies/available` - 获取可用策略类型

### 股票相关
- `GET /api/v1/stocks/` - 获取所有股票
- `POST /api/v1/stocks/` - 添加股票
- `DELETE /api/v1/stocks/{symbol}` - 删除股票
- `GET /api/v1/stocks/search` - 搜索股票

### 市场数据
- `GET /api/v1/market-data/klines/{symbol}` - 获取K线数据
- `GET /api/v1/market-data/info/{symbol}` - 获取股票信息
- `POST /api/v1/market-data/update` - 更新市场数据

## 🔍 故障排除

### 后端启动失败
1. 检查Python版本 (需要3.8+)
2. 检查依赖安装: `pip install -r requirements.txt`
3. 检查端口占用: `lsof -i :8000`

### 前端启动失败
1. 检查Node.js版本
2. 重新安装依赖: `npm install`
3. 清理缓存: `npm run clean`

### API连接失败
1. 确认后端服务已启动
2. 检查CORS配置
3. 查看浏览器控制台错误

## 🎉 成功标志

当看到以下内容时，说明启动成功：

**后端成功**:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
```

**前端成功**:
```
✓ Ready in 2.3s
○ Local:        http://localhost:3000
○ Network:      http://192.168.x.x:3000
```

## 🚀 下一步

启动成功后，可以：
1. 添加测试股票（如AAPL、TSLA、MSFT）
2. 执行选股策略
3. 查看选股结果
4. 测试技术分析功能

---

**现在请按照上述步骤手动启动系统进行测试！** 🎯
