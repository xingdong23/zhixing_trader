#!/bin/bash

# Bitcoin Trader Git 部署脚本
# 服务器: 101.42.14.209
# 使用 Git 拉取代码部署

set -e  # 遇到错误立即退出

SERVER_IP="101.42.14.209"
SERVER_USER="root"
DEPLOY_DIR="/opt/zhixing_trader"
GIT_REPO="https://github.com/xingdong23/zhixing_trader.git"

echo "════════════════════════════════════════════════════════════════"
echo "  🚀 Bitcoin Trader Git 部署"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "目标服务器: $SERVER_IP"
echo "部署目录: $DEPLOY_DIR"
echo "Git仓库: $GIT_REPO"
echo ""

# 连接到服务器并执行部署
echo "🔧 连接到服务器并部署..."
ssh ${SERVER_USER}@${SERVER_IP} << ENDSSH

set -e

DEPLOY_DIR="$DEPLOY_DIR"
GIT_REPO="$GIT_REPO"

echo "════════════════════════════════════════════════════════════════"
echo "  📦 步骤 1: 检查和安装依赖"
echo "════════════════════════════════════════════════════════════════"

# 检查 Git
if ! command -v git &> /dev/null; then
    echo "→ 安装 Git..."
    yum install -y git || apt-get install -y git
fi
echo "✅ Git 版本: \$(git --version)"

# 检查 Python3
if ! command -v python3 &> /dev/null; then
    echo "→ 安装 Python3..."
    yum install -y python3 python3-pip || apt-get install -y python3 python3-pip
fi
echo "✅ Python 版本: \$(python3 --version)"

# 检查 pip3
if ! command -v pip3 &> /dev/null; then
    echo "→ 安装 pip3..."
    yum install -y python3-pip || apt-get install -y python3-pip
fi
echo "✅ pip3 版本: \$(pip3 --version)"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  📥 步骤 2: 拉取代码"
echo "════════════════════════════════════════════════════════════════"

# 检查目录是否存在
if [ -d "\$DEPLOY_DIR" ]; then
    echo "→ 目录已存在，拉取最新代码..."
    cd \$DEPLOY_DIR
    
    # 检查是否是git仓库
    if [ -d ".git" ]; then
        echo "→ 执行 git pull..."
        git pull origin main
    else
        echo "⚠️  目录存在但不是git仓库，重新克隆..."
        cd ..
        rm -rf \$DEPLOY_DIR
        git clone \$GIT_REPO \$DEPLOY_DIR
    fi
else
    echo "→ 克隆代码仓库..."
    mkdir -p /opt
    cd /opt
    git clone \$GIT_REPO
fi

cd \$DEPLOY_DIR
echo "✅ 当前分支: \$(git branch --show-current)"
echo "✅ 最新提交: \$(git log -1 --oneline)"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  🔧 步骤 3: 安装 Python 依赖"
echo "════════════════════════════════════════════════════════════════"

cd \$DEPLOY_DIR/bitcoin_trader

# 检查 requirements.txt
if [ -f "requirements.txt" ]; then
    echo "→ 安装依赖包..."
    pip3 install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
    echo "✅ 依赖安装完成"
else
    echo "⚠️  未找到 requirements.txt"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  ⚙️  步骤 4: 配置环境"
echo "════════════════════════════════════════════════════════════════"

# 检查 .env 配置
if [ ! -f ".env" ]; then
    echo "→ 创建 .env 配置文件..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ 已从 .env.example 创建 .env"
    else
        # 创建基本的 .env 文件
        cat > .env << 'EOF'
# OKX API 配置
OKX_API_KEY=your_api_key_here
OKX_API_SECRET=your_api_secret_here
OKX_PASSPHRASE=your_passphrase_here

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=shuzhongren
DB_NAME=bitcoin_trader

# 日志配置
LOG_LEVEL=INFO
EOF
        echo "✅ 已创建默认 .env 文件"
    fi
    echo ""
    echo "⚠️  请配置 OKX API 信息："
    echo "   vim \$DEPLOY_DIR/bitcoin_trader/.env"
    echo ""
else
    echo "✅ .env 配置文件已存在"
fi

# 创建日志目录
echo "→ 创建日志目录..."
mkdir -p logs
echo "✅ 日志目录: \$DEPLOY_DIR/bitcoin_trader/logs"

# 设置文件权限
echo "→ 设置文件权限..."
chmod +x *.sh 2>/dev/null || true
chmod +x *.py 2>/dev/null || true
echo "✅ 文件权限设置完成"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  🔧 步骤 5: 配置系统服务"
echo "════════════════════════════════════════════════════════════════"

# 创建 systemd 服务
cat > /etc/systemd/system/bitcoin-trader.service << 'EOF'
[Unit]
Description=Bitcoin Trader - EMA Trend Strategy
After=network.target mysql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/zhixing_trader/bitcoin_trader
ExecStart=/usr/bin/python3 /opt/zhixing_trader/bitcoin_trader/run_okx_live_demo.py
Restart=on-failure
RestartSec=10
StandardOutput=append:/opt/zhixing_trader/bitcoin_trader/logs/trader.log
StandardError=append:/opt/zhixing_trader/bitcoin_trader/logs/trader.error.log

# 环境变量
Environment="PYTHONUNBUFFERED=1"

[Install]
WantedBy=multi-user.target
EOF

echo "→ 重载 systemd..."
systemctl daemon-reload
echo "✅ 系统服务配置完成"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  ✅ 部署完成！"
echo "════════════════════════════════════════════════════════════════"

ENDSSH

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  📋 后续操作指南"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "1️⃣  配置 OKX API（必须）："
echo "   ssh ${SERVER_USER}@${SERVER_IP}"
echo "   vim /opt/zhixing_trader/bitcoin_trader/.env"
echo ""
echo "2️⃣  测试运行："
echo "   ssh ${SERVER_USER}@${SERVER_IP}"
echo "   cd /opt/zhixing_trader/bitcoin_trader"
echo "   python3 test_strategy_integration.py"
echo ""
echo "3️⃣  启动交易机器人："
echo "   systemctl start bitcoin-trader"
echo ""
echo "4️⃣  查看运行状态："
echo "   systemctl status bitcoin-trader"
echo ""
echo "5️⃣  查看实时日志："
echo "   tail -f /opt/zhixing_trader/bitcoin_trader/logs/trader.log"
echo ""
echo "6️⃣  停止机器人："
echo "   systemctl stop bitcoin-trader"
echo ""
echo "7️⃣  设置开机自启："
echo "   systemctl enable bitcoin-trader"
echo ""
echo "8️⃣  更新代码（在本地修改后）："
echo "   # 本地提交："
echo "   git add ."
echo "   git commit -m \"更新说明\""
echo "   git push origin main"
echo ""
echo "   # 服务器更新："
echo "   ssh ${SERVER_USER}@${SERVER_IP}"
echo "   cd /opt/zhixing_trader"
echo "   git pull origin main"
echo "   systemctl restart bitcoin-trader"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""
