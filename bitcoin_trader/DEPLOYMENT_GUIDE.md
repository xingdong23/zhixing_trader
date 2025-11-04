# 🚀 阿里云部署指南 - 快速版

## 📋 部署清单

我已经为您准备好了所有部署所需的文件：

### ✅ 已创建的文件

1. **Dockerfile** - Docker镜像构建文件
2. **docker-compose.yml** - Docker编排配置
3. **.env.production** - 生产环境配置模板
4. **.dockerignore** - Docker构建忽略文件
5. **deploy/aliyun_deploy.md** - 详细部署文档
6. **deploy/quick_deploy.sh** - 一键部署脚本

---

## 🎯 三种部署方式

### 方式一：一键部署（最简单）⭐

```bash
# 1. 上传代码到服务器
scp -r bitcoin_trader root@your_server_ip:/opt/

# 2. 连接服务器
ssh root@your_server_ip

# 3. 运行一键部署脚本
cd /opt/bitcoin_trader
chmod +x deploy/quick_deploy.sh
bash deploy/quick_deploy.sh
```

### 方式二：Docker Compose部署（推荐）

```bash
# 1. 安装Docker和Docker Compose
curl -fsSL https://get.docker.com | bash
systemctl start docker

# 2. 配置环境变量
cp .env.production .env
vim .env  # 填入OKX API密钥

# 3. 启动服务
docker-compose up -d

# 4. 查看日志
docker-compose logs -f
```

### 方式三：直接部署

```bash
# 1. 安装Python 3.10
apt install python3.10 python3.10-venv

# 2. 安装依赖
python3.10 -m venv venv
source venv/bin/activate
pip install -r app/requirements.txt

# 3. 配置环境
cp .env.production .env
vim .env

# 4. 运行策略
python app/run/high_frequency.py --mode paper
```

---

## 🔑 必需配置

### 1. OKX API密钥

编辑 `.env` 文件，填入以下信息：

```bash
OKX_API_KEY=你的API_KEY
OKX_API_SECRET=你的API_SECRET
OKX_PASSPHRASE=你的PASSPHRASE
OKX_TESTNET=True  # 模拟盘用True，实盘用False
```

**获取方式：**
- 模拟盘：https://www.okx.com/account/my-api（选择模拟盘）
- 实盘：https://www.okx.com/account/my-api（选择实盘，谨慎！）

### 2. 阿里云服务器

**推荐配置：**
- CPU: 2核
- 内存: 4GB
- 带宽: 1-3 Mbps
- 系统: Ubuntu 22.04
- 地域: 香港或新加坡

**成本：** 约200-400元/月

---

## 📊 验证部署

### 检查运行状态

```bash
# Docker方式
docker-compose ps
docker logs -f bitcoin-trader

# 直接部署方式
systemctl status bitcoin-trader
journalctl -u bitcoin-trader -f
```

### 预期输出

```
🚀 高频短线交易机器人启动
交易对: BTC/USDT
初始资金: 300 USDT
运行模式: paper
杠杆倍数: 3x
```

---

## 🛠️ 常用命令

### Docker方式

```bash
# 启动
docker-compose up -d

# 停止
docker-compose down

# 重启
docker-compose restart

# 查看日志
docker-compose logs -f

# 查看状态
docker-compose ps
```

### systemd方式

```bash
# 启动
systemctl start bitcoin-trader

# 停止
systemctl stop bitcoin-trader

# 重启
systemctl restart bitcoin-trader

# 查看日志
journalctl -u bitcoin-trader -f
```

---

## ⚠️ 重要提示

### 安全建议

1. ✅ **先在模拟盘运行1-2周**
2. ✅ API密钥设置IP白名单
3. ✅ .env文件权限设为600
4. ✅ 定期检查日志和交易记录
5. ✅ 实盘初期使用小额资金

### 风险控制

- 单日最大亏损：8%
- 单笔止损：0.8-1.2%
- 连续亏损2单停止交易
- 不过夜持仓

---

## 📖 详细文档

- **完整部署指南：** `deploy/aliyun_deploy.md`
- **策略说明：** `README.md`
- **项目结构：** `PROJECT_STRUCTURE.md`

---

## 🆘 故障排查

### 问题1：无法连接OKX

```bash
# 检查网络
ping www.okx.com
curl -I https://www.okx.com

# 解决方案：
# 1. 检查服务器网络
# 2. 检查防火墙
# 3. 尝试更换地域（香港/新加坡）
```

### 问题2：容器启动失败

```bash
# 查看详细日志
docker logs bitcoin-trader

# 常见原因：
# 1. API密钥配置错误
# 2. 端口被占用
# 3. 内存不足
```

### 问题3：策略不交易

```bash
# 查看策略日志
tail -f logs/high_frequency_*.log

# 可能原因：
# 1. 市场条件不满足（正常现象）
# 2. 风控限制触发
# 3. 资金不足
```

---

## 📞 技术支持

### 日志位置

- 应用日志：`logs/high_frequency_*.log`
- Docker日志：`docker logs bitcoin-trader`
- 系统日志：`journalctl -u bitcoin-trader`

### 联系方式

如有问题，请查看详细文档或提交issue。

---

## 🎯 下一步行动

1. [ ] 购买阿里云服务器（2核4G，香港/新加坡）
2. [ ] 注册OKX账号，获取模拟盘API密钥
3. [ ] 上传代码到服务器
4. [ ] 运行一键部署脚本
5. [ ] 验证策略正常运行
6. [ ] 观察1-2周模拟盘表现
7. [ ] 根据表现决定是否实盘

---

**最后更新：** 2025-11-04  
**状态：** ✅ 生产就绪
