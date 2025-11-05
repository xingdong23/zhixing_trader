#!/bin/bash

# 智行交易系统 - 前端部署脚本（服务器端）
# 使用方法：在服务器上执行 bash /opt/zhixing_trader/scripts/deploy_frontend.sh

set -e  # 遇到错误立即退出

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 智行交易系统 - 前端部署"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 项目目录
PROJECT_DIR="/opt/zhixing_trader"
FRONTEND_DIR="$PROJECT_DIR/zhixing_frontend"

# 进入项目目录
cd $PROJECT_DIR

# 1. 拉取最新代码
echo "📦 [1/5] 拉取最新代码..."
git pull origin main
echo "✅ 代码更新完成"
echo ""

# 2. 进入前端目录
cd $FRONTEND_DIR
echo "📂 当前目录: $FRONTEND_DIR"
echo ""

# 3. 检查并安装pnpm
if ! command -v pnpm &> /dev/null
then
    echo "📥 [2/5] 安装pnpm..."
    npm install -g pnpm
    echo "✅ pnpm安装完成"
else
    echo "✅ [2/5] pnpm已安装"
fi
echo ""

# 4. 安装依赖
echo "📥 [3/5] 安装依赖包..."
pnpm install --frozen-lockfile
echo "✅ 依赖安装完成"
echo ""

# 5. 构建项目
echo "🔨 [4/5] 构建生产版本..."
pnpm run build
echo "✅ 构建完成"
echo ""

# 6. 重启服务
echo "🔄 [5/5] 重启服务..."

# 检查PM2是否安装
if ! command -v pm2 &> /dev/null
then
    echo "📥 安装PM2..."
    npm install -g pm2
    echo "✅ PM2安装完成"
fi

# 检查服务是否已存在
if pm2 list | grep -q "zhixing-frontend"; then
    echo "重启现有服务..."
    pm2 restart zhixing-frontend
else
    echo "启动新服务..."
    pm2 start npm --name "zhixing-frontend" -- start
    pm2 save
fi

echo "✅ 服务已启动"
echo ""

# 显示服务状态
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 服务状态"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pm2 list
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 部署完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 访问地址: http://101.42.14.209:3000"
echo ""
echo "📝 常用命令："
echo "  查看日志: pm2 logs zhixing-frontend"
echo "  重启服务: pm2 restart zhixing-frontend"
echo "  查看状态: pm2 status"
echo ""

