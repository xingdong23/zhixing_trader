#!/bin/bash
# 一键部署到阿里云服务器
# 自动配置所有环境和API密钥

SERVER_IP="101.42.14.209"
SERVER_USER="root"
SERVER_PASS="czbcxy25809*"

echo "════════════════════════════════════════════════════════════════"
echo "  🚀 开始部署到阿里云服务器"
echo "════════════════════════════════════════════════════════════════"
echo ""

# 使用 sshpass 自动输入密码（如果没有安装，会提示手动输入）
if ! command -v sshpass &> /dev/null; then
    echo "⚠️  未安装 sshpass，将需要手动输入密码"
    echo "   安装方法: brew install sshpass"
    SSH_CMD="ssh"
    SCP_CMD="scp"
else
    SSH_CMD="sshpass -p ${SERVER_PASS} ssh -o StrictHostKeyChecking=no"
    SCP_CMD="sshpass -p ${SERVER_PASS} scp -o StrictHostKeyChecking=no"
fi

# 上传 .env 文件
echo "📤 上传配置文件..."
$SCP_CMD .env ${SERVER_USER}@${SERVER_IP}:/tmp/.env.bitcoin_trader

# 执行部署
echo "🔧 执行部署..."
$SSH_CMD ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'

set -e

echo "════════════════════════════════════════════════════════════════"
echo "  步骤 1: 安装依赖"
echo "════════════════════════════════════════════════════════════════"

# 安装依赖
yum install -y git python3 python3-pip

echo "✅ Git: $(git --version)"
echo "✅ Python: $(python3 --version)"
echo "✅ pip3: $(pip3 --version)"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  步骤 2: 克隆/更新代码"
echo "════════════════════════════════════════════════════════════════"

cd /opt

if [ -d "zhixing_trader" ]; then
    echo "→ 目录已存在，拉取最新代码..."
    cd zhixing_trader
    git pull origin main
else
    echo "→ 克隆代码仓库..."
    git clone https://github.com/xingdong23/zhixing_trader.git
    cd zhixing_trader
fi

echo "✅ 当前分支: $(git branch --show-current)"
echo "✅ 最新提交: $(git log -1 --oneline)"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  步骤 3: 安装 Python 依赖"
echo "════════════════════════════════════════════════════════════════"

cd /opt/zhixing_trader/bitcoin_trader

pip3 install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

echo "✅ Python 依赖安装完成"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  步骤 4: 配置环境文件"
echo "════════════════════════════════════════════════════════════════"

# 复制上传的 .env 文件
if [ -f "/tmp/.env.bitcoin_trader" ]; then
    cp /tmp/.env.bitcoin_trader .env
    rm /tmp/.env.bitcoin_trader
    echo "✅ .env 配置文件已更新"
else
    echo "⚠️  未找到上传的配置文件"
fi

# 创建日志目录
mkdir -p logs
echo "✅ 日志目录已创建"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  步骤 5: 配置 systemd 服务"
echo "════════════════════════════════════════════════════════════════"

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
Environment="PYTHONUNBUFFERED=1"

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
echo "✅ systemd 服务已配置"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  步骤 6: 运行测试"
echo "════════════════════════════════════════════════════════════════"

cd /opt/zhixing_trader/bitcoin_trader
python3 test_strategy_integration.py

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  步骤 7: 启动服务"
echo "════════════════════════════════════════════════════════════════"

# 停止旧服务（如果存在）
systemctl stop bitcoin-trader 2>/dev/null || true

# 启动服务
systemctl start bitcoin-trader

# 等待2秒
sleep 2

# 查看状态
systemctl status bitcoin-trader --no-pager

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  ✅ 部署完成！"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "服务状态:"
systemctl is-active bitcoin-trader && echo "  ✅ 服务运行中" || echo "  ❌ 服务未运行"
echo ""
echo "查看日志:"
echo "  tail -f /opt/zhixing_trader/bitcoin_trader/logs/trader.log"
echo ""

ENDSSH

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  🎉 部署成功！"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📊 查看实时日志:"
echo "  ssh root@${SERVER_IP}"
echo "  tail -f /opt/zhixing_trader/bitcoin_trader/logs/trader.log"
echo ""
echo "🔧 管理服务:"
echo "  systemctl status bitcoin-trader   # 查看状态"
echo "  systemctl stop bitcoin-trader     # 停止服务"
echo "  systemctl restart bitcoin-trader  # 重启服务"
echo ""
