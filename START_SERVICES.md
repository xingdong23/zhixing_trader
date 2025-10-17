# 🚀 Zhixing Trader V2 - 服务启动指南

## 📊 当前运行状态

### ✅ 两个服务已成功启动！

| 服务 | 端口 | PID | 状态 | 文档 |
|------|------|-----|------|------|
| **Trading Journal** | 8001 | 72209 | ✅ 运行中 | http://localhost:8001/docs |
| **Quant Trading** | 8002 | 72337 | ✅ 运行中 | http://localhost:8002/docs |

---

## 🎯 服务说明

### Trading Journal (交易日志模块)
**端口**: 8001  
**功能**:
- 📊 股票数据管理
- 📁 分类管理
- 📈 市场数据
- 🔄 数据同步
- 📝 交易日志（待增强）

**主要API**:
```bash
# 查看股票概览
curl http://localhost:8001/api/v1/stocks/overview

# 数据同步
curl -X POST http://localhost:8001/api/v1/data-sync/sync/smart

# 查看分类
curl http://localhost:8001/api/v1/categories/
```

---

### Quant Trading (股票量化模块)
**端口**: 8002  
**功能**:
- 🎯 策略开发
- 🔬 策略执行
- 📊 信号生成
- 🔄 策略回测（待完善）
- 💰 实盘交易（待完善）

**主要API**:
```bash
# 查看所有策略
curl http://localhost:8002/api/v1/strategies/

# 执行策略
curl -X POST http://localhost:8002/api/v1/strategies/2/execute

# 健康检查
curl http://localhost:8002/health
```

---

## 🛠️ 管理命令

### 查看服务状态
```bash
ps aux | grep "run.py" | grep -v grep
```

### 查看日志
```bash
# Trading Journal
tail -f /tmp/trading_journal.log

# Quant Trading
tail -f /tmp/quant_trading.log
```

### 停止服务
```bash
# 停止Trading Journal
kill 72209

# 停止Quant Trading
kill 72337

# 或者停止所有
pkill -f "run.py"
```

### 重启服务
```bash
# 停止所有
pkill -f "run.py"

# 启动Trading Journal
cd trading_journal
nohup python run.py > /tmp/trading_journal.log 2>&1 &

# 启动Quant Trading
cd quant_trading
nohup python run.py > /tmp/quant_trading.log 2>&1 &
```

---

## 📖 API文档

### Swagger UI

**Trading Journal**:
- 访问: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

**Quant Trading**:
- 访问: http://localhost:8002/docs
- ReDoc: http://localhost:8002/redoc

---

## 🧪 快速测试

### 测试Trading Journal
```bash
# 查看股票
curl http://localhost:8001/api/v1/stocks/overview | python3 -m json.tool

# 查看分类
curl http://localhost:8001/api/v1/categories/ | python3 -m json.tool
```

### 测试Quant Trading
```bash
# 查看策略列表
curl http://localhost:8002/api/v1/strategies/ | python3 -m json.tool

# 查看可用策略
curl http://localhost:8002/api/v1/strategies/available | python3 -m json.tool
```

---

## 📦 架构说明

```
┌─────────────────────┐
│  Zhixing Frontend   │ (3000)
│      前端应用        │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     │           │
┌────▼────┐ ┌───▼──────┐
│Trading  │ │  Quant   │
│Journal  │ │ Trading  │
│(8001)   │ │ (8002)   │
└────┬────┘ └───┬──────┘
     │          │
     └────┬─────┘
          │
    ┌─────▼──────┐
    │   MySQL    │
    │  Database  │
    └────────────┘
```

### 模块职责

**Trading Journal**:
- 股票基础数据管理
- 交易记录和日志
- 数据同步服务

**Quant Trading**:
- 策略开发和管理
- 策略执行和回测
- 信号生成和交易

**共享**:
- 同一个MySQL数据库
- 共享的market_data_service

---

## 🔧 配置文件

### Trading Journal
```bash
trading_journal/app/config.py
# 端口: 8001
# 数据库: mysql://root:***@127.0.0.1:3306/zhixing_trader
```

### Quant Trading
```bash
quant_trading/app/config.py
# 端口: 8002
# 数据库: mysql://root:***@127.0.0.1:3306/zhixing_trader
```

---

## 📝 开发指南

### 添加新策略到Quant Trading

1. 在 `quant_trading/app/core/strategy/` 创建策略目录
2. 实现策略类继承 `BaseStrategy`
3. 在数据库中注册策略

### 添加新API到Trading Journal

1. 在 `trading_journal/app/api/v1/endpoints/` 创建端点文件
2. 在 `api.py` 中注册路由

---

## 🐛 故障排查

### 端口被占用
```bash
# 查看端口占用
lsof -i :8001
lsof -i :8002

# 停止占用进程
kill <PID>
```

### 服务无法启动
```bash
# 查看日志
tail -100 /tmp/trading_journal.log
tail -100 /tmp/quant_trading.log

# 检查数据库连接
mysql -u root -p -h 127.0.0.1 zhixing_trader
```

### 导入错误
```bash
# 检查Python路径
cd trading_journal && python -c "import app; print(app)"
cd quant_trading && python -c "import app; print(app)"
```

---

## 📚 相关文档

1. **[REFACTOR_V2_COMPLETION.md](REFACTOR_V2_COMPLETION.md)** - 重构完成报告
2. **[REFACTOR_PLAN_V2.md](REFACTOR_PLAN_V2.md)** - 重构方案
3. **[quant_trading/README.md](quant_trading/README.md)** - 量化模块文档
4. **[market_data_service/README.md](market_data_service/README.md)** - 数据服务文档

---

## ✅ 验证清单

- [x] Trading Journal 启动成功 (PID: 72209)
- [x] Quant Trading 启动成功 (PID: 72337)
- [x] API端点可访问
- [x] 数据库连接正常
- [x] 策略列表可查询
- [x] 股票数据可查询
- [ ] 前端可以访问（待测试）
- [ ] 策略可以执行（待测试）

---

## 🎉 快速开始

### 1. 访问API文档
```bash
open http://localhost:8001/docs  # Trading Journal
open http://localhost:8002/docs  # Quant Trading
```

### 2. 查看策略
```bash
curl http://localhost:8002/api/v1/strategies/ | python3 -m json.tool
```

### 3. 查看股票
```bash
curl http://localhost:8001/api/v1/stocks/overview | python3 -m json.tool
```

---

**服务已就绪，可以开始使用！** 🚀

