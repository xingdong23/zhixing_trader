# 🚀 阿里云部署指南

本文档详细说明如何将Bitcoin Trader策略部署到阿里云服务器。

---

## 📋 部署前准备

### 1. 阿里云资源准备

#### 推荐配置
- **服务器类型**: ECS云服务器
- **规格**: 
  - CPU: 2核
  - 内存: 4GB
  - 带宽: 1-3 Mbps
  - 系统盘: 40GB
- **操作系统**: Ubuntu 22.04 LTS 或 CentOS 8
- **地域**: 建议选择香港或新加坡（网络延迟低）

#### 成本估算
- 按量付费: ~0.3元/小时
- 包年包月: ~200-400元/月

### 2. OKX API密钥准备

#### 模拟盘（推荐先测试）
1. 访问 https://www.okx.com/account/my-api
2. 选择"模拟盘交易"
3. 创建API密钥，记录：
   - API Key
   - Secret Key
   - Passphrase（API密码）
4. 权限设置：勾选"交易"权限

#### 实盘（谨慎使用）
- 同上步骤，但选择"实盘交易"
- ⚠️ **强烈建议先在模拟盘测试至少1周**

---

## 🛠️ 部署步骤

### 方式一：Docker部署（推荐）

#### 步骤1：连接服务器
```bash
# 使用SSH连接到阿里云ECS
ssh root@your_server_ip
```

#### 步骤2：安装Docker
```bash
# 安装Docker
curl -fsSL https://get.docker.com | bash -s docker --mirror Aliyun

# 启动Docker服务
systemctl start docker
systemctl enable docker

# 安装Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 验证安装
docker --version
docker-compose --version
```

#### 步骤3：上传项目代码
```bash
# 方式1：使用Git（推荐）
cd /opt
git clone <your_repository_url>
cd bitcoin_trader

# 方式2：使用SCP上传
# 在本地执行：
scp -r /path/to/bitcoin_trader root@your_server_ip:/opt/
```

#### 步骤4：配置环境变量
```bash
# 复制环境配置文件
cp .env.production .env

# 编辑配置文件，填入真实的API密钥
vim .env

# 修改以下内容：
# OKX_API_KEY=你的API_KEY
# OKX_API_SECRET=你的API_SECRET
# OKX_PASSPHRASE=你的PASSPHRASE
# OKX_TESTNET=True  # 模拟盘用True，实盘用False
```

#### 步骤5：构建并启动容器
```bash
# 构建Docker镜像
docker-compose build

# 启动服务（后台运行）
docker-compose up -d

# 查看运行状态
docker-compose ps

# 查看实时日志
docker-compose logs -f
```

#### 步骤6：验证运行
```bash
# 查看容器日志
docker logs -f bitcoin-trader

# 应该看到类似输出：
# 🚀 高频短线交易机器人启动
# 交易对: BTC/USDT
# 初始资金: 300 USDT
# 运行模式: paper
```

---

### 方式二：直接部署（不使用Docker）

#### 步骤1：安装Python环境
```bash
# 安装Python 3.10
sudo apt update
sudo apt install -y python3.10 python3.10-venv python3-pip

# 验证版本
python3.10 --version
```

#### 步骤2：创建项目目录
```bash
# 创建目录
mkdir -p /opt/bitcoin_trader
cd /opt/bitcoin_trader

# 上传代码（使用git或scp）
git clone <your_repository_url> .
```

#### 步骤3：安装依赖
```bash
# 创建虚拟环境
python3.10 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r app/requirements.txt -i https://mirrors.aliyun.com/pypi/simple/
```

#### 步骤4：配置环境变量
```bash
# 复制并编辑环境配置
cp .env.production .env
vim .env

# 填入真实的API密钥
```

#### 步骤5：创建systemd服务
```bash
# 创建服务文件
sudo vim /etc/systemd/system/bitcoin-trader.service
```

添加以下内容：
```ini
[Unit]
Description=Bitcoin Trading Strategy
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/bitcoin_trader
Environment="PATH=/opt/bitcoin_trader/venv/bin"
ExecStart=/opt/bitcoin_trader/venv/bin/python app/run/high_frequency.py --mode paper
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### 步骤6：启动服务
```bash
# 重载systemd配置
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start bitcoin-trader

# 设置开机自启
sudo systemctl enable bitcoin-trader

# 查看状态
sudo systemctl status bitcoin-trader

# 查看日志
sudo journalctl -u bitcoin-trader -f
```

---

## 📊 监控与管理

### 查看日志
```bash
# Docker方式
docker logs -f bitcoin-trader

# systemd方式
sudo journalctl -u bitcoin-trader -f

# 查看策略日志文件
tail -f /opt/bitcoin_trader/logs/high_frequency_*.log
```

### 停止服务
```bash
# Docker方式
docker-compose down

# systemd方式
sudo systemctl stop bitcoin-trader
```

### 重启服务
```bash
# Docker方式
docker-compose restart

# systemd方式
sudo systemctl restart bitcoin-trader
```

### 更新代码
```bash
# 停止服务
docker-compose down  # 或 sudo systemctl stop bitcoin-trader

# 拉取最新代码
git pull

# 重新构建（Docker方式）
docker-compose build
docker-compose up -d

# 重启服务（systemd方式）
sudo systemctl restart bitcoin-trader
```

---

## 🔒 安全建议

### 1. 服务器安全
```bash
# 修改SSH端口
sudo vim /etc/ssh/sshd_config
# Port 22 改为其他端口，如 Port 2222

# 禁用root密码登录，使用密钥认证
# PasswordAuthentication no

# 重启SSH服务
sudo systemctl restart sshd

# 配置防火墙
sudo ufw allow 2222/tcp  # SSH端口
sudo ufw enable
```

### 2. API密钥安全
- ✅ 使用环境变量存储，不要硬编码
- ✅ .env文件权限设置为600
  ```bash
  chmod 600 .env
  ```
- ✅ 不要将.env文件提交到Git
- ✅ 定期更换API密钥
- ✅ 设置API白名单IP（在OKX后台）

### 3. 资金安全
- ✅ **先在模拟盘运行至少1-2周**
- ✅ 实盘初期使用小额资金测试
- ✅ 设置合理的止损和风控参数
- ✅ 定期检查交易记录

---

## 📈 性能优化

### 1. 网络优化
```bash
# 使用阿里云香港或新加坡节点
# 延迟测试
ping www.okx.com
```

### 2. 资源监控
```bash
# 安装监控工具
sudo apt install htop

# 查看资源使用
htop

# 查看Docker资源使用
docker stats
```

### 3. 日志管理
```bash
# 定期清理旧日志
find /opt/bitcoin_trader/logs -name "*.log" -mtime +7 -delete

# 配置logrotate自动清理
sudo vim /etc/logrotate.d/bitcoin-trader
```

---

## ⚠️ 故障排查

### 问题1：无法连接OKX API
```bash
# 检查网络连接
curl -I https://www.okx.com

# 检查DNS解析
nslookup www.okx.com

# 解决方案：
# 1. 检查服务器网络
# 2. 检查防火墙规则
# 3. 尝试使用代理
```

### 问题2：容器频繁重启
```bash
# 查看容器日志
docker logs bitcoin-trader

# 常见原因：
# 1. API密钥配置错误
# 2. 网络连接问题
# 3. 内存不足
```

### 问题3：策略不执行交易
```bash
# 检查日志中的策略信号
tail -f logs/high_frequency_*.log

# 可能原因：
# 1. 市场条件不满足入场条件
# 2. 风控限制触发
# 3. 资金不足
```

---

## 📞 技术支持

### 日志位置
- 应用日志: `/opt/bitcoin_trader/logs/`
- Docker日志: `docker logs bitcoin-trader`
- 系统日志: `journalctl -u bitcoin-trader`

### 常用命令速查
```bash
# 查看运行状态
docker-compose ps
sudo systemctl status bitcoin-trader

# 实时日志
docker-compose logs -f
tail -f logs/high_frequency_*.log

# 重启服务
docker-compose restart
sudo systemctl restart bitcoin-trader

# 停止服务
docker-compose down
sudo systemctl stop bitcoin-trader
```

---

## 🎯 下一步

1. ✅ 完成部署后，先在模拟盘运行1-2周
2. ✅ 每天检查日志和交易记录
3. ✅ 根据实际表现调整策略参数
4. ✅ 确认稳定盈利后，再考虑实盘
5. ✅ 实盘初期使用小额资金（如100-300 USDT）

---

**最后更新**: 2025-11-04  
**状态**: ✅ 生产就绪
