#!/bin/bash
# 部署脚本 - 在阿里云服务器上部署交易程序

set -e

echo "========================================="
echo "  比特币交易程序部署脚本"
echo "========================================="
echo ""

# 配置
DEPLOY_USER="trader"
DEPLOY_DIR="/home/$DEPLOY_USER/bitcoin_trader"
SERVICE_NAME="bitcoin_trader"

# 检查是否以root运行
if [ "$EUID" -ne 0 ]; then 
    echo "❌ 请使用root权限运行此脚本"
    echo "   sudo bash deployment/deploy.sh"
    exit 1
fi

echo "1. 创建部署用户..."
if id "$DEPLOY_USER" &>/dev/null; then
    echo "   ✓ 用户 $DEPLOY_USER 已存在"
else
    useradd -m -s /bin/bash $DEPLOY_USER
    echo "   ✓ 用户 $DEPLOY_USER 创建成功"
fi

echo ""
echo "2. 安装系统依赖..."
apt-get update
apt-get install -y python3 python3-pip python3-venv git jq curl

echo ""
echo "3. 创建工作目录..."
mkdir -p $DEPLOY_DIR/logs
mkdir -p $DEPLOY_DIR/deployment
chown -R $DEPLOY_USER:$DEPLOY_USER $DEPLOY_DIR

echo ""
echo "4. 安装Python依赖..."
su - $DEPLOY_USER -c "cd $DEPLOY_DIR && python3 -m venv .venv"
su - $DEPLOY_USER -c "cd $DEPLOY_DIR && .venv/bin/pip install -r requirements.txt"

echo ""
echo "5. 配置systemd服务..."
cp deployment/bitcoin_trader.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable $SERVICE_NAME
echo "   ✓ systemd服务已配置"

echo ""
echo "6. 设置健康检查定时任务..."
chmod +x deployment/health_check.sh

# 添加crontab（每分钟检查一次）
(crontab -u $DEPLOY_USER -l 2>/dev/null || true; echo "* * * * * $DEPLOY_DIR/deployment/health_check.sh") | crontab -u $DEPLOY_USER -
echo "   ✓ 健康检查定时任务已设置"

echo ""
echo "7. 配置日志轮转..."
cat > /etc/logrotate.d/$SERVICE_NAME << EOF
$DEPLOY_DIR/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 $DEPLOY_USER $DEPLOY_USER
    sharedscripts
    postrotate
        systemctl reload $SERVICE_NAME > /dev/null 2>&1 || true
    endscript
}
EOF
echo "   ✓ 日志轮转已配置"

echo ""
echo "========================================="
echo "  部署完成！"
echo "========================================="
echo ""
echo "⚠️  重要提示："
echo "1. 请配置 .env 文件中的API密钥"
echo "2. 请配置 deployment/health_check.sh 中的告警webhook"
echo ""
echo "启动命令："
echo "  sudo systemctl start $SERVICE_NAME"
echo ""
echo "查看状态："
echo "  sudo systemctl status $SERVICE_NAME"
echo ""
echo "查看日志："
echo "  tail -f $DEPLOY_DIR/logs/high_frequency_*.log"
echo ""
echo "停止服务："
echo "  sudo systemctl stop $SERVICE_NAME"
echo ""
