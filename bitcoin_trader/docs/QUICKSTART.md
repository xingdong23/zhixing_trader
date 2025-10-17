# 快速开始指南

## 环境要求

- Python 3.9+
- MySQL 5.7+
- Redis 5.0+
- 操作系统: macOS / Linux / Windows

## 安装步骤

### 1. 创建虚拟环境

```bash
cd bitcoin_trader
python3 -m venv venv

# macOS/Linux
source venv/bin/activate

# Windows
venv\Scripts\activate
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

**注意**: 如果安装 `ta-lib` 失败，需要先安装系统依赖：

**macOS:**
```bash
brew install ta-lib
```

**Ubuntu/Debian:**
```bash
wget http://prdownloads.sourceforge.net/ta-lib/ta-lib-0.4.0-src.tar.gz
tar -xzf ta-lib-0.4.0-src.tar.gz
cd ta-lib/
./configure --prefix=/usr
make
sudo make install
```

### 3. 配置数据库

创建MySQL数据库：

```sql
CREATE DATABASE bitcoin_trader CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. 配置环境变量

复制环境变量模板（需要手动创建 .env 文件）：

```bash
# 编辑 .env 文件，填入你的配置
```

最小配置示例：
```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=bitcoin_trader

# Binance测试网配置
BINANCE_API_KEY=your_test_api_key
BINANCE_API_SECRET=your_test_api_secret
BINANCE_TESTNET=True
```

### 5. 初始化数据库

```bash
python scripts/init_database.py
```

### 6. 启动服务

```bash
python run.py
```

服务将在 `http://localhost:8001` 启动

### 7. 验证安装

访问 API 文档：
```
http://localhost:8001/docs
```

测试健康检查：
```bash
curl http://localhost:8001/health
```

## 获取测试API密钥

### Binance测试网

1. 访问: https://testnet.binance.vision/
2. 使用GitHub账号登录
3. 生成API Key和Secret

### OKX测试网

1. 访问: https://www.okx.com/
2. 注册账号
3. 在API管理页面创建测试API密钥

## 第一个策略

### 1. 创建策略

使用API创建SMA交叉策略：

```bash
curl -X POST "http://localhost:8001/api/v1/strategy/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "我的第一个策略",
    "code": "my_first_sma",
    "description": "BTC 10/30 SMA交叉策略",
    "exchange": "binance",
    "symbol": "BTC/USDT",
    "interval": "1h",
    "parameters": {
      "short_period": 10,
      "long_period": 30
    },
    "max_position": 1000
  }'
```

### 2. 运行回测

```bash
curl -X POST "http://localhost:8001/api/v1/backtest/run" \
  -H "Content-Type: application/json" \
  -d '{
    "strategy_id": 1,
    "symbol": "BTC/USDT",
    "interval": "1h",
    "start_time": "2024-01-01T00:00:00",
    "end_time": "2024-03-01T00:00:00",
    "initial_capital": 10000
  }'
```

### 3. 查看结果

```bash
curl "http://localhost:8001/api/v1/backtest/result/1"
```

## 常见问题

### Q: 数据库连接失败？
A: 检查 `.env` 文件中的数据库配置是否正确，确保MySQL服务已启动

### Q: 交易所API连接失败？
A: 
- 确认API密钥配置正确
- 检查网络连接
- 确认是否使用测试网配置

### Q: ta-lib 安装失败？
A: 需要先安装系统级的 ta-lib 库，参考上面的安装步骤

### Q: 如何切换到实盘交易？
A: 
1. 修改 `.env` 中的 `BINANCE_TESTNET=False`
2. 配置实盘API密钥
3. 修改 `ENABLE_LIVE_TRADING=True`
⚠️ 注意: 实盘交易有风险，请谨慎操作！

## 下一步

- 阅读 [架构文档](ARCHITECTURE.md)
- 学习如何[开发自定义策略](CUSTOM_STRATEGY.md)
- 了解[风险管理](RISK_MANAGEMENT.md)
- 查看[API文档](http://localhost:8001/docs)

## 获取帮助

如有问题，请查看：
- 项目文档: `docs/`
- 示例代码: `examples/`
- Issue追踪

