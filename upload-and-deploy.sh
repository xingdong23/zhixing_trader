#!/bin/bash

# 【知行交易】本地上传和远程部署脚本
# 在本地运行此脚本

set -e

SERVER_IP="101.42.14.209"
SERVER_USER="root"
SERVER_PASSWORD="czbcxy25809*"
LOCAL_PROJECT_DIR="/Users/chengzheng/workspace/chuangxin/zhixing_trader"
REMOTE_APP_DIR="/root/zhixing-trader"

echo "🚀 开始上传和部署【知行交易】应用..."

# 检查本地项目目录
if [ ! -d "$LOCAL_PROJECT_DIR" ]; then
    echo "❌ 本地项目目录不存在: $LOCAL_PROJECT_DIR"
    exit 1
fi

cd "$LOCAL_PROJECT_DIR"

echo "📦 打包项目文件..."
# 排除不需要的文件
tar -czf zhixing-trader.tar.gz \
    --exclude=node_modules \
    --exclude=.next \
    --exclude=.git \
    --exclude=*.log \
    src/ \
    package.json \
    next.config.mjs \
    tailwind.config.ts \
    postcss.config.mjs \
    tsconfig.json \
    README.md \
    DEMO.md

echo "📤 上传项目文件到服务器..."
scp zhixing-trader.tar.gz $SERVER_USER@$SERVER_IP:/root/

echo "📤 上传部署脚本..."
scp deploy.sh $SERVER_USER@$SERVER_IP:/root/

echo "🔧 在服务器上执行部署..."
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
cd /root

# 解压项目文件
if [ -f zhixing-trader.tar.gz ]; then
    echo "解压项目文件..."
    mkdir -p /root/zhixing-trader
    tar -xzf zhixing-trader.tar.gz -C /root/zhixing-trader/
    rm zhixing-trader.tar.gz
fi

# 执行部署脚本
if [ -f deploy.sh ]; then
    chmod +x deploy.sh
    ./deploy.sh
fi
ENDSSH

echo "🧹 清理本地临时文件..."
rm -f zhixing-trader.tar.gz

echo "✅ 部署完成！"
echo "🌐 访问地址: http://$SERVER_IP"
echo ""
echo "📋 后续管理命令："
echo "ssh $SERVER_USER@$SERVER_IP"
echo "pm2 status"
echo "pm2 logs zhixing-trader"
