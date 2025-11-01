# 模拟盘交易系统

## 📋 系统说明

这是一个完整的**模拟盘（Paper Trading）系统**，用于在不进行真实交易的情况下，验证交易策略的实际表现。

### ✅ 核心功能

- 连接欧易API获取实时行情数据
- 运行多时间框架EMA策略生成交易信号
- 所有信号和订单保存到数据库
- 模拟订单执行（不真实下单）
- 实时追踪持仓和盈亏
- 自动止损止盈管理
- 每日统计报告

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cd paper_trading
pip install -r requirements.txt
```

### 2. 配置API Key

复制配置文件模板：

```bash
cp config/.env.example config/.env
```

编辑 `config/.env` 文件，填入你的欧易API配置：

```
OKX_API_KEY=your_api_key_here
OKX_SECRET_KEY=your_secret_key_here  
OKX_PASSPHRASE=your_passphrase_here
```

**注意：只需要「读取」权限，不需要交易权限！**

### 3. 初始化数据库

```bash
# 使用SQLite（推荐，简单）
python src/init_db.py

# 或使用MySQL
# 先创建数据库: CREATE DATABASE trading_paper;
# 然后在.env中配置MySQL信息
```

### 4. 测试连接

```bash
python src/test_connection.py
```

### 5. 启动模拟盘

```bash
python src/main.py
```

---

## 📂 目录结构

```
paper_trading/
├── config/                  # 配置文件
│   ├── .env.example        # 配置模板
│   └── .env                # 实际配置（需自行创建）
├── src/                     # 源代码
│   ├── config.py           # 配置管理
│   ├── database.py         # 数据库管理
│   ├── okx_connector.py    # 欧易API连接
│   ├── paper_engine.py     # 模拟交易引擎
│   ├── strategy_runner.py  # 策略执行器
│   ├── monitor.py          # 监控模块
│   ├── init_db.py          # 数据库初始化
│   ├── test_connection.py  # 连接测试
│   └── main.py             # 主程序
├── sql/                     # SQL脚本
│   └── create_tables.sql   # 创建表
├── logs/                    # 日志文件
├── requirements.txt         # Python依赖
└── README.md               # 本文档
```

---

## 📊 数据库表说明

### 1. trading_signals（交易信号表）
记录所有生成的交易信号

### 2. orders（订单表）
记录所有模拟订单及其盈亏

### 3. positions（持仓表）
当前持仓信息

### 4. account_balance（账户余额表）
账户资金变化历史

### 5. daily_summary（每日汇总表）
每日交易统计

---

## ⚙️ 配置说明

### 主要配置项

```
# 初始资金
INITIAL_BALANCE=300

# 杠杆倍数
LEVERAGE=2.7

# 仓位大小
POSITION_SIZE=0.85

# 止损止盈
STOP_LOSS_PCT=0.032   # 3.2%
TAKE_PROFIT_PCT=0.07  # 7%

# 交易对
SYMBOL=ETH-USDT-SWAP

# 检查间隔
CHECK_INTERVAL=300           # 5分钟检查持仓
SIGNAL_CHECK_INTERVAL=3600   # 1小时检查信号
```

---

## 🔍 查询数据

### 使用命令行工具

```bash
# 查看当前状态
python src/cli.py status

# 查看余额
python src/cli.py balance

# 查看持仓
python src/cli.py positions

# 查看交易历史
python src/cli.py history

# 查看今日统计
python src/cli.py today
```

### 直接查询数据库

```bash
# SQLite
sqlite3 paper_trading.db

# 查看最近10个信号
SELECT * FROM trading_signals ORDER BY timestamp DESC LIMIT 10;

# 查看所有订单
SELECT * FROM orders ORDER BY entry_time DESC;

# 查看当前持仓
SELECT * FROM positions;

# 查看账户余额
SELECT * FROM account_balance ORDER BY timestamp DESC LIMIT 1;
```

---

## 🌐 Web监控界面（可选）

启动Web界面：

```bash
python src/web_monitor.py
```

然后访问: http://localhost:8888

---

## ☁️ 部署到云端

### 使用Docker

```bash
docker-compose up -d
```

### 使用Supervisor（推荐）

```bash
# 安装supervisor
sudo apt-get install supervisor

# 复制配置
sudo cp deploy/supervisor.conf /etc/supervisor/conf.d/paper_trading.conf

# 重启supervisor
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start paper_trading
```

---

## 📧 通知配置（可选）

### 邮件通知

在 `.env` 中配置：

```
EMAIL_ENABLED=true
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_FROM=your_email@gmail.com
EMAIL_TO=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

### 企业微信通知

```
WECHAT_ENABLED=true
WECHAT_WEBHOOK=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx
```

---

## 🐛 常见问题

### 1. API连接失败？

- 检查API Key是否正确
- 检查是否设置了IP白名单
- 检查网络连接

### 2. 数据库连接失败？

- 检查数据库配置是否正确
- SQLite：检查文件路径权限
- MySQL：检查数据库是否已创建

### 3. 没有生成信号？

- 检查当前市场是否符合策略条件
- 查看日志文件了解详细信息
- 日线趋势是否符合（只在牛市做多）

---

## 📝 日志查看

```bash
# 实时查看日志
tail -f logs/paper_trading.log

# 查看错误日志
grep ERROR logs/paper_trading.log

# 查看今天的日志
grep "$(date +%Y-%m-%d)" logs/paper_trading.log
```

---

## 🔒 安全建议

1. ✅ API Key只申请「读取」权限
2. ✅ 不要申请「交易」和「提现」权限
3. ✅ 设置IP白名单限制访问
4. ✅ 定期轮换API Key
5. ✅ 不要将 `.env` 文件提交到Git
6. ✅ 数据库密码使用强密码
7. ✅ 定期备份数据库

---

## 📞 技术支持

如有问题，请查看：
- 日志文件: `logs/paper_trading.log`
- 系统日志表: `system_logs`

---

*最后更新: 2025-11-01*
