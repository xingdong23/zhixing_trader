#!/bin/bash

# Bitcoin Trader 自动部署脚本（使用 expect 自动输入密码）

SERVER_IP="101.42.14.209"
SERVER_USER="root"
SERVER_PASSWORD="czbcxy25809*"
DEPLOY_DIR="/opt/bitcoin_trader"

echo "════════════════════════════════════════════════════════════════"
echo "  🚀 Bitcoin Trader 自动部署"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "目标服务器: $SERVER_IP"
echo "部署目录: $DEPLOY_DIR"
echo ""

# 检查 expect 是否安装
if ! command -v expect &> /dev/null; then
    echo "⚠️  expect 未安装，尝试安装..."
    brew install expect || (echo "❌ 请手动安装 expect: brew install expect" && exit 1)
fi

# 创建临时 expect 脚本
cat > /tmp/deploy_expect.sh << 'EOF'
#!/usr/bin/expect -f

set timeout 300
set server_ip [lindex $argv 0]
set server_user [lindex $argv 1]
set server_password [lindex $argv 2]
set deploy_dir [lindex $argv 3]
set local_dir [lindex $argv 4]

# 连接服务器并执行命令
spawn ssh -o StrictHostKeyChecking=no ${server_user}@${server_ip}
expect {
    "password:" {
        send "${server_password}\r"
        exp_continue
    }
    "# " {
        send "echo '✅ SSH 连接成功'\r"
        expect "# "
        
        # 检查 Python
        send "python3 --version\r"
        expect "# "
        
        # 检查 Git
        send "git --version || yum install -y git\r"
        expect "# "
        
        # 创建目录
        send "mkdir -p ${deploy_dir}\r"
        expect "# "
        
        send "echo '✅ 环境准备完成'\r"
        expect "# "
        
        send "exit\r"
    }
}

expect eof
EOF

chmod +x /tmp/deploy_expect.sh

echo "════════════════════════════════════════════════════════════════"
echo "  📦 步骤 1: 测试 SSH 连接"
echo "════════════════════════════════════════════════════════════════"

/tmp/deploy_expect.sh "$SERVER_IP" "$SERVER_USER" "$SERVER_PASSWORD" "$DEPLOY_DIR" "$(pwd)"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  📤 步骤 2: 上传项目文件"
echo "════════════════════════════════════════════════════════════════"

# 使用 expect 进行 scp 上传
cat > /tmp/scp_expect.sh << 'EOF'
#!/usr/bin/expect -f

set timeout 300
set server_ip [lindex $argv 0]
set server_user [lindex $argv 1]
set server_password [lindex $argv 2]
set local_file [lindex $argv 3]
set remote_path [lindex $argv 4]

spawn scp -o StrictHostKeyChecking=no -r ${local_file} ${server_user}@${server_ip}:${remote_path}
expect {
    "password:" {
        send "${server_password}\r"
        exp_continue
    }
    eof
}
EOF

chmod +x /tmp/scp_expect.sh

# 打包项目文件
echo "→ 打包项目文件..."
tar -czf /tmp/bitcoin_trader.tar.gz \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.env' \
    --exclude='logs' \
    --exclude='.git' \
    app/ examples/ *.py *.sh *.txt *.md .env.example .gitignore 2>/dev/null

echo "→ 上传到服务器..."
/tmp/scp_expect.sh "$SERVER_IP" "$SERVER_USER" "$SERVER_PASSWORD" "/tmp/bitcoin_trader.tar.gz" "/tmp/"

echo "✅ 文件上传完成"
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "  🔧 步骤 3: 部署和配置"
echo "════════════════════════════════════════════════════════════════"

# 在服务器上执行部署命令
cat > /tmp/deploy_commands.sh << 'DEPLOY_SCRIPT'
#!/usr/bin/expect -f

set timeout 300
set server_ip [lindex $argv 0]
set server_user [lindex $argv 1]
set server_password [lindex $argv 2]
set deploy_dir [lindex $argv 3]

spawn ssh -o StrictHostKeyChecking=no ${server_user}@${server_ip}
expect "password:"
send "${server_password}\r"

expect "# "
send "cd ${deploy_dir}\r"

expect "# "
send "tar -xzf /tmp/bitcoin_trader.tar.gz -C ${deploy_dir}\r"

expect "# "
send "rm /tmp/bitcoin_trader.tar.gz\r"

expect "# "
send "pip3 install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple\r"

expect "# "
send "if \[ ! -f .env \]; then cp .env.example .env; fi\r"

expect "# "
send "mkdir -p logs\r"

expect "# "
send "chmod +x *.sh *.py\r"

expect "# "
send "cat > /etc/systemd/system/bitcoin-trader.service << 'SERVICEEOF'
\[Unit\]
Description=Bitcoin Trader - OKX Live Trading
After=network.target

\[Service\]
Type=simple
User=root
WorkingDirectory=${deploy_dir}
ExecStart=/usr/bin/python3 ${deploy_dir}/run_okx_live_demo.py
Restart=on-failure
RestartSec=10
StandardOutput=append:${deploy_dir}/logs/trader.log
StandardError=append:${deploy_dir}/logs/trader.error.log
Environment=\"PYTHONUNBUFFERED=1\"

\[Install\]
WantedBy=multi-user.target
SERVICEEOF\r"

expect "# "
send "systemctl daemon-reload\r"

expect "# "
send "echo '✅ 部署完成'\r"

expect "# "
send "exit\r"

expect eof
DEPLOY_SCRIPT

chmod +x /tmp/deploy_commands.sh
/tmp/deploy_commands.sh "$SERVER_IP" "$SERVER_USER" "$SERVER_PASSWORD" "$DEPLOY_DIR"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  ✅ 部署完成！"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📋 下一步操作："
echo ""
echo "1. 【必须】配置 OKX API："
echo "   ssh root@${SERVER_IP}"
echo "   vim /opt/bitcoin_trader/.env"
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
echo "════════════════════════════════════════════════════════════════"

# 清理临时文件
rm -f /tmp/deploy_expect.sh /tmp/scp_expect.sh /tmp/deploy_commands.sh /tmp/bitcoin_trader.tar.gz
