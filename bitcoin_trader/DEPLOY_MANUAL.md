# Bitcoin Trader 手动部署指南

## 服务器信息
- IP: 101.42.14.209
- 用户: root
- 密码: czbcxy25809*

## 部署步骤

### 1. 登录服务器

```bash
ssh root@101.42.14.209
# 输入密码: czbcxy25809*
```

### 2. 安装必要工具

```bash
# 检查 Python
python3 --version

# 如果没有 Python，安装它
yum install -y python3 python3-pip

# 检查 Git
git --version

# 如果没有 Git，安装它
yum install -y git
```

### 3. 创建部署目录

```bash
mkdir -p /opt/bitcoin_trader
cd /opt/bitcoin_trader
```

### 4. 上传项目文件

从本地机器执行（在 bitcoin_trader 目录下）：

```bash
# 打包项目
tar -czf /tmp/bitcoin_trader.tar.gz \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.env' \
    --exclude='logs' \
    --exclude='.git' \
    app/ examples/ *.py *.sh *.txt *.md .env.example .gitignore

# 上传到服务器
scp /tmp/bitcoin_trader.tar.gz root@101.42.14.209:/tmp/
```

### 5. 在服务器上解压

```bash
cd /opt/bitcoin_trader
tar -xzf /tmp/bitcoin_trader.tar.gz
rm /tmp/bitcoin_trader.tar.gz
```

### 6. 安装 Python 依赖

```bash
cd /opt/bitcoin_trader
pip3 install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### 7. 配置 OKX API

```bash
# 复制配置文件
cp .env.example .env

# 编辑配置文件
vim .env
```

在 `.env` 文件中填入你的 OKX API 信息：

```env
OKX_API_KEY=你的API密钥
OKX_API_SECRET=你的Secret密钥
OKX_PASSPHRASE=你的API密码
OKX_TESTNET=True
```

保存并退出（按 ESC，输入 `:wq`，回车）

### 8. 创建日志目录

```bash
mkdir -p /opt/bitcoin_trader/logs
chmod +x *.sh *.py
```

### 9. 创建系统服务

```bash
cat > /etc/systemd/system/bitcoin-trader.service << 'EOF'
[Unit]
Description=Bitcoin Trader - OKX Live Trading
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/bitcoin_trader
ExecStart=/usr/bin/python3 /opt/bitcoin_trader/run_okx_live_demo.py
Restart=on-failure
RestartSec=10
StandardOutput=append:/opt/bitcoin_trader/logs/trader.log
StandardError=append:/opt/bitcoin_trader/logs/trader.error.log
Environment="PYTHONUNBUFFERED=1"

[Install]
WantedBy=multi-user.target
EOF

# 重载 systemd
systemctl daemon-reload
```

### 10. 启动交易机器人

```bash
# 启动服务
systemctl start bitcoin-trader

# 查看状态
systemctl status bitcoin-trader

# 查看日志
tail -f /opt/bitcoin_trader/logs/trader.log
```

### 11. 设置开机自启（可选）

```bash
systemctl enable bitcoin-trader
```

## 常用命令

```bash
# 启动
systemctl start bitcoin-trader

# 停止
systemctl stop bitcoin-trader

# 重启
systemctl restart bitcoin-trader

# 查看状态
systemctl status bitcoin-trader

# 查看日志
tail -f /opt/bitcoin_trader/logs/trader.log

# 查看错误日志
tail -f /opt/bitcoin_trader/logs/trader.error.log

# 查看最近100行日志
tail -n 100 /opt/bitcoin_trader/logs/trader.log
```

## 测试运行（不使用系统服务）

如果想先测试，可以直接运行：

```bash
cd /opt/bitcoin_trader
python3 run_okx_live_demo.py
```

按 Ctrl+C 停止。

## 故障排查

### 1. 查看服务状态

```bash
systemctl status bitcoin-trader
```

### 2. 查看错误日志

```bash
tail -f /opt/bitcoin_trader/logs/trader.error.log
```

### 3. 检查配置文件

```bash
cat /opt/bitcoin_trader/.env
```

### 4. 手动测试连接

```bash
cd /opt/bitcoin_trader
python3 -c "from app.config import settings; print(f'OKX_API_KEY: {settings.OKX_API_KEY[:10]}...')"
```

### 5. 检查依赖

```bash
pip3 list | grep ccxt
```

## 注意事项

1. ⚠️ 确保 .env 文件中的 OKX API 配置正确
2. ⚠️ 确保 API 权限包含读取和交易权限
3. ⚠️ 建议先在模拟盘测试（OKX_TESTNET=True）
4. ⚠️ 定期查看日志，监控交易情况
5. ⚠️ 设置合理的风险限制参数
