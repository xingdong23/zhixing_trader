#!/bin/bash
# 
# 复制以下命令到阿里云服务器执行
# SSH连接: ssh root@101.42.14.209
# 密码: czbcxy25809*
#

# ============================================================
# 步骤1: 安装依赖
# ============================================================
echo "安装依赖..."
yum install -y git python3 python3-pip

# ============================================================
# 步骤2: 克隆代码（首次部署）
# ============================================================
echo "克隆代码..."
cd /opt
if [ -d "zhixing_trader" ]; then
    echo "目录已存在，拉取最新代码..."
    cd zhixing_trader
    git pull origin main
else
    git clone https://github.com/xingdong23/zhixing_trader.git
    cd zhixing_trader
fi

# ============================================================
# 步骤3: 安装Python依赖
# ============================================================
echo "安装Python依赖..."
cd /opt/zhixing_trader/bitcoin_trader
pip3 install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# ============================================================
# 步骤4: 创建配置文件
# ============================================================
echo "创建配置文件..."
if [ ! -f ".env" ]; then
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
    echo "✅ 已创建 .env 文件，请编辑配置: vim /opt/zhixing_trader/bitcoin_trader/.env"
else
    echo "✅ .env 文件已存在"
fi

# ============================================================
# 步骤5: 创建日志目录
# ============================================================
mkdir -p logs
echo "✅ 日志目录已创建"

# ============================================================
# 步骤6: 配置systemd服务
# ============================================================
echo "配置systemd服务..."
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
echo "✅ systemd服务已配置"

# ============================================================
# 步骤7: 测试
# ============================================================
echo ""
echo "运行测试..."
cd /opt/zhixing_trader/bitcoin_trader
python3 test_strategy_integration.py

echo ""
echo "════════════════════════════════════════════════════════"
echo "  ✅ 部署完成！"
echo "════════════════════════════════════════════════════════"
echo ""
echo "下一步操作："
echo ""
echo "1. 配置OKX API（必须）："
echo "   vim /opt/zhixing_trader/bitcoin_trader/.env"
echo ""
echo "2. 启动服务："
echo "   systemctl start bitcoin-trader"
echo ""
echo "3. 查看状态："
echo "   systemctl status bitcoin-trader"
echo ""
echo "4. 查看日志："
echo "   tail -f /opt/zhixing_trader/bitcoin_trader/logs/trader.log"
echo ""
