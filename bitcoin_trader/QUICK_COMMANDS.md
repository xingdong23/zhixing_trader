# 🚀 常用命令速查表

## 📋 目录

- [SSH登录](#ssh登录)
- [策略管理](#策略管理)
- [日志查看](#日志查看)
- [进程管理](#进程管理)
- [代码部署](#代码部署)
- [回测运行](#回测运行)
- [系统监控](#系统监控)

---

## 🔐 SSH登录

### 登录阿里云服务器

```bash
ssh -i ~/.ssh/aliyun_trader root@101.42.14.209
```

### 进入项目目录

```bash
cd /opt/zhixing_trader/bitcoin_trader
```

---

## 🎯 策略管理

### 启动策略（模拟盘）

```bash
# 本地执行
ssh -i ~/.ssh/aliyun_trader root@101.42.14.209 "cd /opt/zhixing_trader/bitcoin_trader && bash live_trading/start_ema_simple_trend.sh paper"

# 或登录后执行
cd /opt/zhixing_trader/bitcoin_trader
bash live_trading/start_ema_simple_trend.sh paper
```

### 启动策略（实盘 - 谨慎！）

```bash
bash live_trading/start_ema_simple_trend.sh live
```

### 停止策略

```bash
# 本地执行
ssh -i ~/.ssh/aliyun_trader root@101.42.14.209 "pkill -9 -f 'python.*ema_simple_trend'"

# 或登录后执行
pkill -9 -f 'python.*ema_simple_trend'
```

### 重启策略

```bash
# 本地一键重启
ssh -i ~/.ssh/aliyun_trader root@101.42.14.209 "cd /opt/zhixing_trader/bitcoin_trader && bash live_trading/start_ema_simple_trend.sh paper"
```

---

## 📊 日志查看

### 实时查看最新日志（按天滚动）

```bash
# 本地执行
ssh -i ~/.ssh/aliyun_trader root@101.42.14.209 "tail -f /opt/zhixing_trader/bitcoin_trader/logs/ema_simple_trend.log"

# 或登录后执行
cd /opt/zhixing_trader/bitcoin_trader
tail -f logs/ema_simple_trend.log
```

### 查看最近30行日志

```bash
# 本地执行
ssh -i ~/.ssh/aliyun_trader root@101.42.14.209 "tail -n 30 /opt/zhixing_trader/bitcoin_trader/logs/ema_simple_trend.log"

# 或登录后执行
tail -n 30 logs/ema_simple_trend.log
```

### 查看最近100行日志

```bash
tail -n 100 logs/ema_simple_trend.log
```

### 列出所有日志文件（当前文件 + 历史滚动文件）

```bash
ls -lht logs/ema_simple_trend.log*
```

### 查看特定日期的历史日志

```bash
# 例如：查看 2025-11-04 的历史滚动文件（TimedRotatingFileHandler 默认后缀为 .yyyy-mm-dd）
cat logs/ema_simple_trend.log.2025-11-04
```

### 搜索日志中的关键词

```bash
# 搜索交易信号
grep "交易信号触发" logs/ema_simple_trend.log logs/ema_simple_trend.log.*

# 搜索错误
grep "ERROR" logs/ema_simple_trend.log logs/ema_simple_trend.log.*

# 搜索买入信号
grep "signal.*buy" logs/ema_simple_trend.log logs/ema_simple_trend.log.*
```

---

## 🔍 进程管理

### 查看策略进程状态

```bash
# 本地执行
ssh -i ~/.ssh/aliyun_trader root@101.42.14.209 "ps aux | grep python | grep ema_simple_trend"

# 或登录后执行
ps aux | grep python | grep ema_simple_trend
```

### 查看进程详细信息

```bash
ps aux | grep ema_simple_trend | grep -v grep
```

### 查看进程资源占用

```bash
top -p $(pgrep -f ema_simple_trend)
```

### 查看所有Python进程

```bash
ps aux | grep python
```

---

## 📦 代码部署

### 本地提交代码

```bash
# 在本地项目目录执行
cd /Users/chengzheng/workspace/chuangxin/zhixing_trader/bitcoin_trader

# 提交所有更改
git add -A
git commit -m "描述你的更改"
git push origin main
```

### 部署到阿里云（SCP方式）

```bash
# 传输单个文件
scp -i ~/.ssh/aliyun_trader live_trading/ema_simple_trend.py root@101.42.14.209:/opt/zhixing_trader/bitcoin_trader/live_trading/

# 传输策略文件
scp -i ~/.ssh/aliyun_trader strategies/ema_simple_trend/strategy_multiframe.py root@101.42.14.209:/opt/zhixing_trader/bitcoin_trader/strategies/ema_simple_trend/

# 传输配置文件
scp -i ~/.ssh/aliyun_trader strategies/ema_simple_trend/config_multiframe.json root@101.42.14.209:/opt/zhixing_trader/bitcoin_trader/strategies/ema_simple_trend/
```

### 部署后重启策略

```bash
# 一键部署并重启
scp -i ~/.ssh/aliyun_trader live_trading/ema_simple_trend.py root@101.42.14.209:/opt/zhixing_trader/bitcoin_trader/live_trading/ && \
ssh -i ~/.ssh/aliyun_trader root@101.42.14.209 "cd /opt/zhixing_trader/bitcoin_trader && bash live_trading/start_ema_simple_trend.sh paper"
```

### 清理Python缓存

```bash
# 登录后执行
cd /opt/zhixing_trader/bitcoin_trader
find . -name '*.pyc' -delete
find . -name '__pycache__' -type d -exec rm -rf {} + 2>/dev/null || true
```

---

## 🧪 回测运行

### 运行回测（本地）

```bash
cd /Users/chengzheng/workspace/chuangxin/zhixing_trader/bitcoin_trader

# 运行2年回测
python backtest/run_backtest.py strategies/ema_simple_trend/backtest_multiframe_2years.json
```

### 查看回测结果

```bash
# 列出最近的回测结果
ls -lt backtest/results/*.json | head -10

# 查看特定回测结果
cat backtest/results/backtest_20251104_*.json | jq .
```

---

## 📈 系统监控

### 查看服务器资源

```bash
# CPU和内存使用
ssh -i ~/.ssh/aliyun_trader root@101.42.14.209 "top -bn1 | head -20"

# 磁盘使用
ssh -i ~/.ssh/aliyun_trader root@101.42.14.209 "df -h"

# 内存使用
ssh -i ~/.ssh/aliyun_trader root@101.42.14.209 "free -h"
```

### 查看网络连接

```bash
# 查看OKX API连接
netstat -an | grep ESTABLISHED | grep 443
```

### 查看日志大小

```bash
du -sh logs/
ls -lh logs/ | tail -20
```

### 清理旧日志（保留最近7天）

```bash
find logs/ -name "ema_simple_trend_*.log" -mtime +7 -delete
```

---

## 🔧 故障排查

### 策略无法启动

```bash
# 1. 检查Python环境
which python
python --version

# 2. 检查虚拟环境
source venv/bin/activate
pip list | grep ccxt

# 3. 检查配置文件
cat strategies/ema_simple_trend/config_multiframe.json

# 4. 手动运行查看错误
cd /opt/zhixing_trader/bitcoin_trader
export PYTHONPATH=/opt/zhixing_trader/bitcoin_trader
source venv/bin/activate
python live_trading/ema_simple_trend.py --mode paper
```

### 无法获取数据

```bash
# 测试OKX API连接
curl -s "https://www.okx.com/api/v5/market/candles?instId=ETH-USDT&bar=1H&limit=10" | jq .

# 检查DNS
ping www.okx.com
```

### 策略异常退出

```bash
# 查看最新错误日志
grep -i error logs/ema_simple_trend_*.log | tail -20

# 查看Python错误
grep -i traceback logs/ema_simple_trend_*.log -A 10
```

---

## 📝 快速操作组合

### 完整部署流程

```bash
# 1. 本地提交代码
cd /Users/chengzheng/workspace/chuangxin/zhixing_trader/bitcoin_trader
git add -A && git commit -m "更新策略" && git push origin main

# 2. 部署到服务器
scp -i ~/.ssh/aliyun_trader live_trading/ema_simple_trend.py root@101.42.14.209:/opt/zhixing_trader/bitcoin_trader/live_trading/

# 3. 重启策略
ssh -i ~/.ssh/aliyun_trader root@101.42.14.209 "cd /opt/zhixing_trader/bitcoin_trader && bash live_trading/start_ema_simple_trend.sh paper"

# 4. 查看日志
ssh -i ~/.ssh/aliyun_trader root@101.42.14.209 "sleep 5 && cd /opt/zhixing_trader/bitcoin_trader && ls -lt logs/ema_simple_trend_*.log | head -1 | awk '{print \$NF}' | xargs tail -30"
```

### 每日检查

```bash
# 1. 检查进程状态
ssh -i ~/.ssh/aliyun_trader root@101.42.14.209 "ps aux | grep ema_simple_trend | grep -v grep"

# 2. 查看最新日志
ssh -i ~/.ssh/aliyun_trader root@101.42.14.209 "cd /opt/zhixing_trader/bitcoin_trader && ls -lt logs/ema_simple_trend_*.log | head -1 | awk '{print \$NF}' | xargs tail -50"

# 3. 检查是否有交易信号
ssh -i ~/.ssh/aliyun_trader root@101.42.14.209 "grep '交易信号触发' /opt/zhixing_trader/bitcoin_trader/logs/ema_simple_trend_*.log | tail -10"
```

---

## 🎯 别名设置（可选）

在本地 `~/.zshrc` 或 `~/.bashrc` 中添加：

```bash
# 阿里云快捷命令
alias trader-ssh='ssh -i ~/.ssh/aliyun_trader root@101.42.14.209'
alias trader-log='ssh -i ~/.ssh/aliyun_trader root@101.42.14.209 "tail -f /opt/zhixing_trader/bitcoin_trader/logs/ema_simple_trend_*.log | tail -1"'
alias trader-status='ssh -i ~/.ssh/aliyun_trader root@101.42.14.209 "ps aux | grep ema_simple_trend | grep -v grep"'
alias trader-restart='ssh -i ~/.ssh/aliyun_trader root@101.42.14.209 "cd /opt/zhixing_trader/bitcoin_trader && bash live_trading/start_ema_simple_trend.sh paper"'
alias trader-stop='ssh -i ~/.ssh/aliyun_trader root@101.42.14.209 "pkill -9 -f python.*ema_simple_trend"'
```

使用方法：

```bash
source ~/.zshrc  # 重新加载配置

trader-ssh       # 登录服务器
trader-log       # 查看日志
trader-status    # 查看状态
trader-restart   # 重启策略
trader-stop      # 停止策略
```

---

## 📌 重要提示

1. **模拟盘优先**: 始终先在模拟盘测试，确认无误后再考虑实盘
2. **定期检查**: 建议每天至少检查一次策略运行状态和日志
3. **备份重要数据**: 定期备份配置文件和重要日志
4. **监控资源**: 注意服务器CPU、内存、磁盘使用情况
5. **安全第一**: 妥善保管SSH密钥和API密钥

---

**最后更新**: 2025-11-04  
**当前策略**: EMA Simple Trend (多时间框架)  
**运行模式**: 模拟盘  
**服务器**: 阿里云 101.42.14.209
