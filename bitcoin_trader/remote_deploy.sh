#!/bin/bash

# Bitcoin Trader 远程部署脚本
# 通过 Git 直接在服务器上部署

SERVER_IP="101.42.14.209"
SERVER_USER="root"
SERVER_PASSWORD="czbcxy25809*"
DEPLOY_DIR="/opt/bitcoin_trader"
GIT_REPO="https://github.com/yourusername/zhixing_trader.git"  # 需要替换为实际的 Git 仓库地址

echo "════════════════════════════════════════════════════════════════"
echo "  🚀 Bitcoin Trader 远程部署（Git 方式）"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "目标服务器: $SERVER_IP"
echo "部署目录: $DEPLOY_DIR"
echo ""

# 使用 sshpass 自动输入密码（如果没有配置 SSH 密钥）
# 注意：生产环境建议使用 SSH 密钥而不是密码

ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'

set -e

DEPLOY_DIR="/opt/bitcoin_trader"

echo "════════════════════════════════════════════════════════════════"
echo "  📦 步骤 1: 准备环境"
echo "════════════════════════════════════════════════════════════════"

# 检查并安装必要工具
echo "→ 检查系统工具..."

if ! command -v git &> /dev/null; then
    echo "安装 Git..."
    yum install -y git || apt-get install -y git
fi

if ! command -v python3 &> /dev/null; then
    echo "安装 Python3..."
    yum install -y python3 python3-pip || apt-get install -y python3 python3-pip
fi

echo "✅ Git 版本: $(git --version)"
echo "✅ Python 版本: $(python3 --version)"
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "  📥 步骤 2: 下载代码"
echo "════════════════════════════════════════════════════════════════"

# 创建部署目录
mkdir -p /opt
cd /opt

# 如果目录已存在，先备份
if [ -d "$DEPLOY_DIR" ]; then
    echo "→ 备份现有目录..."
    mv $DEPLOY_DIR ${DEPLOY_DIR}_backup_$(date +%Y%m%d_%H%M%S)
fi

# 这里我们直接创建目录并手动复制文件
# 因为代码可能还没推送到 Git
echo "→ 创建项目目录..."
mkdir -p $DEPLOY_DIR
cd $DEPLOY_DIR

echo "✅ 项目目录已创建: $DEPLOY_DIR"
echo ""
echo "⚠️  注意: 请手动上传项目文件到服务器"
echo "   可以使用 scp 或 rsync 命令"
echo ""

ENDSSH

echo "════════════════════════════════════════════════════════════════"
echo "  📤 步骤 3: 上传项目文件"
echo "════════════════════════════════════════════════════════════════"

# 从本地上传项目文件
echo "→ 正在上传项目文件..."

# 使用 rsync 同步文件（排除不必要的文件）
rsync -avz --progress \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.env' \
    --exclude='logs/' \
    --exclude='.git/' \
    --exclude='*.log' \
    ./ ${SERVER_USER}@${SERVER_IP}:${DEPLOY_DIR}/

echo "✅ 文件上传完成"
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "  🔧 步骤 4: 配置服务器环境"
echo "════════════════════════════════════════════════════════════════"

ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'

set -e
cd /opt/bitcoin_trader

echo "→ 安装 Python 依赖..."
pip3 install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

echo "→ 创建配置文件..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "⚠️  已创建 .env 文件，请配置 OKX API 信息"
fi

echo "→ 创建日志目录..."
mkdir -p logs

echo "→ 设置执行权限..."
chmod +x *.sh *.py

echo "✅ 环境配置完成"

ENDSSH

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  🎯 步骤 5: 创建系统服务"
echo "════════════════════════════════════════════════════════════════"

ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'

echo "→ 创建 systemd 服务..."

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

# 环境变量
Environment="PYTHONUNBUFFERED=1"

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload

echo "✅ 系统服务已创建"

ENDSSH

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  ✅ 部署完成！"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📋 下一步操作："
echo ""
echo "1. 【必须】配置 OKX API："
echo "   ssh ${SERVER_USER}@${SERVER_IP}"
echo "   vim /opt/bitcoin_trader/.env"
echo "   # 填入你的 OKX API Key, Secret, Passphrase"
echo ""
echo "2. 启动交易机器人："
echo "   systemctl start bitcoin-trader"
echo ""
echo "3. 查看运行状态："
echo "   systemctl status bitcoin-trader"
echo ""
echo "4. 查看实时日志："
echo "   tail -f /opt/bitcoin_trader/logs/trader.log"
echo ""
echo "5. 停止机器人："
echo "   systemctl stop bitcoin-trader"
echo ""
echo "6. 设置开机自启："
echo "   systemctl enable bitcoin-trader"
echo ""
echo "7. 查看错误日志："
echo "   tail -f /opt/bitcoin_trader/logs/trader.error.log"
echo ""
echo "════════════════════════════════════════════════════════════════"
