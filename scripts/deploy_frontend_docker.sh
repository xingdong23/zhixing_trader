#!/bin/bash

# 智行交易系统 - 前端 Docker 部署脚本（服务器端）
# 使用方法：在服务器上执行 bash /opt/zhixing_trader/scripts/deploy_frontend_docker.sh

set -e  # 遇到错误立即退出

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 智行交易系统 - 前端 Docker 部署"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 配置
PROJECT_DIR="/opt/zhixing_trader"
FRONTEND_DIR="$PROJECT_DIR/zhixing_frontend"
CONTAINER_NAME="zhixing-frontend"
IMAGE_NAME="zhixing-frontend:latest"
HOST_PORT=8090  # 使用 8090 端口
CONTAINER_PORT=3000

# 1. 拉取最新代码
echo "📦 [1/5] 拉取最新代码..."
cd $PROJECT_DIR
git pull origin main
echo "✅ 代码更新完成"
echo ""

# 2. 进入前端目录
cd $FRONTEND_DIR
echo "📂 当前目录: $FRONTEND_DIR"
echo ""

# 3. 删除平台特定依赖
echo "🔧 [2/5] 清理平台特定依赖..."
sed -i '/@next\/swc-darwin-arm64/d' package.json 2>/dev/null || true
rm -f package-lock.json pnpm-lock.yaml
echo "✅ 清理完成"
echo ""

# 4. 构建 Docker 镜像
echo "🔨 [3/5] 构建 Docker 镜像..."
docker build -t $IMAGE_NAME .
echo "✅ 镜像构建完成"
echo ""

# 5. 停止并删除旧容器
echo "🛑 [4/5] 停止旧容器..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true
echo "✅ 旧容器已清理"
echo ""

# 6. 启动新容器
echo "🚀 [5/5] 启动新容器..."
docker run -d \
  --name $CONTAINER_NAME \
  -p $HOST_PORT:$CONTAINER_PORT \
  --restart unless-stopped \
  $IMAGE_NAME

echo "✅ 容器已启动"
echo ""

# 等待容器启动
echo "⏳ 等待服务启动..."
sleep 5

# 显示容器状态
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 容器状态"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker ps | grep $CONTAINER_NAME
echo ""

# 显示日志
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 最近日志"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker logs $CONTAINER_NAME --tail 20
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 部署完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 访问地址: http://101.42.14.209:$HOST_PORT"
echo ""
echo "📝 常用命令："
echo "  查看日志: docker logs -f $CONTAINER_NAME"
echo "  重启容器: docker restart $CONTAINER_NAME"
echo "  停止容器: docker stop $CONTAINER_NAME"
echo "  进入容器: docker exec -it $CONTAINER_NAME sh"
echo ""
