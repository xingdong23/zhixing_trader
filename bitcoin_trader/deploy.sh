#!/bin/bash

# Bitcoin Trader 云端部署脚本
# 服务器: 101.42.14.209

set -e  # 遇到错误立即退出

SERVER_IP="101.42.14.209"
SERVER_USER="root"
DEPLOY_DIR="/opt/bitcoin_trader"
PROJECT_NAME="bitcoin_trader"

echo "════════════════════════════════════════════════════════════════"
echo "  🚀 Bitcoin Trader 云端部署"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "目标服务器: $SERVER_IP"
echo "部署目录: $DEPLOY_DIR"
echo ""

# 1. 打包项目文件
echo "📦 步骤 1: 打包项目文件..."
tar -czf /tmp/${PROJECT_NAME}.tar.gz \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.env' \
    --exclude='logs' \
    --exclude='.git' \
    app/ examples/ *.py *.sh *.txt *.md .env.example .gitignore

echo "✅ 打包完成: /tmp/${PROJECT_NAME}.tar.gz"
echo ""

# 2. 上传到服务器
echo "📤 步骤 2: 上传到服务器..."
scp /tmp/${PROJECT_NAME}.tar.gz ${SERVER_USER}@${SERVER_IP}:/tmp/

echo "✅ 上传完成"
echo ""

# 3. 在服务器上部署
echo "🔧 步骤 3: 在服务器上部署..."
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'

set -e

DEPLOY_DIR="/opt/bitcoin_trader"
PROJECT_NAME="bitcoin_trader"

echo "→ 创建部署目录..."
mkdir -p $DEPLOY_DIR
cd $DEPLOY_DIR

echo "→ 解压项目文件..."
tar -xzf /tmp/${PROJECT_NAME}.tar.gz -C $DEPLOY_DIR
rm /tmp/${PROJECT_NAME}.tar.gz

echo "→ 检查 Python 环境..."
if ! command -v python3 &> /dev/null; then
    echo "安装 Python3..."
    yum install -y python3 python3-pip || apt-get install -y python3 python3-pip
fi

python3 --version

echo "→ 安装依赖..."
pip3 install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

echo "→ 检查 .env 配置..."
if [ ! -f ".env" ]; then
    echo "⚠️  未找到 .env 文件，从示例创建..."
    cp .env.example .env
    echo ""
    echo "⚠️  请编辑 /opt/bitcoin_trader/.env 文件，配置 OKX API 信息："
    echo "   vim /opt/bitcoin_trader/.env"
    echo ""
fi

echo "→ 创建日志目录..."
mkdir -p logs

echo "→ 设置文件权限..."
chmod +x *.sh *.py

ENDSSH

echo "✅ 服务器部署完成"
echo ""

# 4. 创建 systemd 服务
echo "🔧 步骤 4: 创建系统服务..."
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'

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

[Install]
WantedBy=multi-user.target
EOF

echo "→ 重载 systemd..."
systemctl daemon-reload

echo "✅ 系统服务创建完成"

ENDSSH

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  ✅ 部署完成！"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "下一步操作："
echo ""
echo "1. 配置 OKX API（必须）："
echo "   ssh ${SERVER_USER}@${SERVER_IP}"
echo "   vim /opt/bitcoin_trader/.env"
echo ""
echo "2. 启动交易机器人："
echo "   ssh ${SERVER_USER}@${SERVER_IP}"
echo "   systemctl start bitcoin-trader"
echo ""
echo "3. 查看运行状态："
echo "   systemctl status bitcoin-trader"
echo ""
echo "4. 查看日志："
echo "   tail -f /opt/bitcoin_trader/logs/trader.log"
echo ""
echo "5. 停止机器人："
echo "   systemctl stop bitcoin-trader"
echo ""
echo "6. 设置开机自启："
echo "   systemctl enable bitcoin-trader"
echo ""
echo "════════════════════════════════════════════════════════════════"
