# 快速启动指南

## 🚀 5分钟快速上手

### 步骤1：配置API Key

```bash
cd paper_trading

# 复制配置模板
cp config/.env.example config/.env

# 编辑配置文件
nano config/.env  # 或使用 vim、vscode等编辑器
```

在 `.env` 文件中填入你的欧易API信息：

```
OKX_API_KEY=你的API_KEY
OKX_SECRET_KEY=你的SECRET_KEY  
OKX_PASSPHRASE=你的密码短语
```

**⚠️ 重要：**
- 只需要「读取」权限
- 不要申请「交易」和「提现」权限
- 建议设置IP白名单

---

### 步骤2：安装依赖

```bash
pip3 install -r requirements.txt
```

或使用虚拟环境（推荐）：

```bash
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# 或 venv\Scripts\activate  # Windows

pip install -r requirements.txt
```

---

### 步骤3：初始化数据库

```bash
cd src
python3 init_db.py
```

你应该看到：

```
✅ 数据库初始化完成！
已创建 6 个表:
  ✓ trading_signals
  ✓ orders
  ✓ positions
  ✓ account_balance
  ✓ daily_summary
  ✓ system_logs
```

---

### 步骤4：测试API连接

```bash
python3 okx_connector.py
```

你应该看到：

```
✅ 欧易API连接测试成功: ETH-USDT-SWAP 当前价格 xxxx
✅ 连接成功
```

如果失败，检查：
- API Key是否正确
- 是否设置了IP白名单
- 网络连接是否正常

---

### 步骤5：启动模拟盘

```bash
python3 main.py
```

或使用启动脚本：

```bash
cd ..
./start.sh
```

---

## 📊 查看状态

### 实时查看

系统启动后会自动显示状态更新。

### 使用命令行工具

打开新终端：

```bash
cd paper_trading/src

# 查看当前状态
python3 cli.py status

# 查看余额历史
python3 cli.py balance

# 查看持仓
python3 cli.py positions

# 查看交易历史
python3 cli.py history

# 查看今日统计
python3 cli.py today
```

---

## 🔍 查看数据库

### SQLite（默认）

```bash
cd paper_trading
sqlite3 paper_trading.db

# 查看最近10个信号
SELECT * FROM trading_signals ORDER BY timestamp DESC LIMIT 10;

# 查看所有订单
SELECT * FROM orders;

# 查看当前持仓
SELECT * FROM positions;

# 退出
.exit
```

---

## ⚙️ 配置说明

### 主要配置项（.env文件）

```
# 初始资金（默认300u）
INITIAL_BALANCE=300

# 杠杆倍数（默认2.7x）
LEVERAGE=2.7

# 仓位大小（默认85%）
POSITION_SIZE=0.85

# 止损（默认3.2%）
STOP_LOSS_PCT=0.032

# 止盈（默认7%）
TAKE_PROFIT_PCT=0.07

# 交易对
SYMBOL=ETH-USDT-SWAP

# 检查间隔
CHECK_INTERVAL=300           # 5分钟检查持仓
SIGNAL_CHECK_INTERVAL=3600   # 1小时检查信号
```

---

## 📝 日志查看

```bash
# 实时查看日志
tail -f logs/paper_trading.log

# 查看错误
grep ERROR logs/paper_trading.log

# 查看今天的日志
grep "$(date +%Y-%m-%d)" logs/paper_trading.log
```

---

## 🛑 停止系统

按 `Ctrl+C` 即可停止。

系统会自动保存所有数据。

---

## 🐛 常见问题

### 1. API连接失败？

```
❌ 欧易API连接测试失败
```

**解决：**
- 检查API Key、Secret Key、Passphrase是否正确
- 检查是否设置了IP白名单（欧易后台）
- 确认只申请了「读取」权限

---

### 2. 数据库连接失败？

```
❌ 数据库连接失败
```

**解决（SQLite）：**
- 检查`SQLITE_DB_PATH`配置
- 确保目录有写权限

**解决（MySQL）：**
- 检查MySQL是否运行
- 检查数据库是否已创建
- 检查用户名密码是否正确

---

### 3. 没有生成信号？

**可能原因：**
- 当前市场不符合策略条件
- 日线趋势为熊市（策略只在牛市做多）
- 没有到检查时间（默认1小时检查一次）

**查看日志了解详情：**
```bash
tail -f logs/paper_trading.log
```

---

### 4. ImportError模块未找到？

```
ModuleNotFoundError: No module named 'xxx'
```

**解决：**
```bash
pip3 install -r requirements.txt
```

---

## 📞 获取帮助

查看详细文档：
```bash
cat README.md
```

查看系统日志：
```bash
tail -f logs/paper_trading.log
```

---

## 🎯 下一步

系统运行后，你可以：

1. **观察模拟交易** - 看策略在实时市场的表现
2. **调整参数** - 修改`.env`中的配置
3. **查看统计** - 使用cli.py查看各种统计数据
4. **部署到云端** - 让系统24/7运行

---

*最后更新: 2025-11-01*
