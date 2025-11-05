#!/bin/bash
# Bitcoin Trader 阿里云快速部署脚本

set -e

echo "=========================================="
echo "🚀 Bitcoin Trader 阿里云部署脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}请使用root权限运行此脚本${NC}"
    echo "使用: sudo bash deploy/quick_deploy.sh"
    exit 1
fi

# 步骤1：检查系统
echo -e "${GREEN}[1/7] 检查系统环境...${NC}"
if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo "操作系统: $NAME $VERSION"
else
    echo -e "${RED}无法识别操作系统${NC}"
    exit 1
fi

# 步骤2：安装Docker
echo -e "${GREEN}[2/7] 安装Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo "Docker未安装，开始安装..."
    curl -fsSL https://get.docker.com | bash -s docker --mirror Aliyun
    systemctl start docker
    systemctl enable docker
    echo "Docker安装完成"
else
    echo "Docker已安装: $(docker --version)"
fi

# 步骤3：安装Docker Compose
echo -e "${GREEN}[3/7] 安装Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose未安装，开始安装..."
    curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo "Docker Compose安装完成"
else
    echo "Docker Compose已安装: $(docker-compose --version)"
fi

# 步骤4：创建项目目录
echo -e "${GREEN}[4/7] 创建项目目录...${NC}"
PROJECT_DIR="/opt/bitcoin_trader"
if [ ! -d "$PROJECT_DIR" ]; then
    mkdir -p $PROJECT_DIR
    echo "项目目录已创建: $PROJECT_DIR"
else
    echo "项目目录已存在: $PROJECT_DIR"
fi

# 步骤5：配置环境变量
echo -e "${GREEN}[5/7] 配置环境变量...${NC}"
if [ ! -f "$PROJECT_DIR/.env" ]; then
    if [ -f ".env.production" ]; then
        cp .env.production $PROJECT_DIR/.env
        chmod 600 $PROJECT_DIR/.env
        echo -e "${YELLOW}⚠️  请编辑 $PROJECT_DIR/.env 文件，填入真实的OKX API密钥${NC}"
        echo ""
        read -p "按回车键继续编辑配置文件..." 
        vim $PROJECT_DIR/.env
    else
        echo -e "${RED}找不到.env.production文件${NC}"
        exit 1
    fi
else
    echo ".env文件已存在"
fi

# 步骤6：构建Docker镜像
echo -e "${GREEN}[6/7] 构建Docker镜像...${NC}"
cd $PROJECT_DIR
docker-compose build

# 步骤7：启动服务
echo -e "${GREEN}[7/7] 启动服务...${NC}"
docker-compose up -d

echo ""
echo "=========================================="
echo -e "${GREEN}✅ 部署完成！${NC}"
echo "=========================================="
echo ""
echo "📊 查看运行状态:"
echo "   docker-compose ps"
echo ""
echo "📝 查看实时日志:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 停止服务:"
echo "   docker-compose down"
echo ""
echo "🔄 重启服务:"
echo "   docker-compose restart"
echo ""
echo -e "${YELLOW}⚠️  重要提示:${NC}"
echo "1. 当前运行在模拟盘模式"
echo "2. 请检查日志确认策略正常运行"
echo "3. 建议运行1-2周后再考虑实盘"
echo ""
echo "=========================================="
