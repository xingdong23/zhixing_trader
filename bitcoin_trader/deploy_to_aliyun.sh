#!/bin/bash

# 阿里云部署脚本
# 用途：在阿里云服务器上部署高频短线交易策略

set -e  # 遇到错误立即退出

echo "================================"
echo "高频短线策略 - 阿里云部署脚本"
echo "================================"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 配置变量
DEPLOY_DIR="/opt/zhixing_trader"
REPO_URL="https://github.com/xingdong23/zhixing_trader.git"
PYTHON_VERSION="3.9"
VENV_DIR="venv"

echo -e "${YELLOW}步骤 1: 检查部署目录${NC}"
if [ ! -d "$DEPLOY_DIR" ]; then
    echo "目录不存在，克隆代码仓库..."
    cd /opt
    git clone $REPO_URL
    echo -e "${GREEN}✅ 代码克隆完成${NC}"
else
    echo "目录已存在，拉取最新代码..."
    cd $DEPLOY_DIR
    git pull origin main
    echo -e "${GREEN}✅ 代码更新完成${NC}"
fi

cd $DEPLOY_DIR/bitcoin_trader

echo -e "${YELLOW}步骤 2: 检查 Python 环境${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 未安装，请先安装 Python $PYTHON_VERSION${NC}"
    exit 1
fi

PYTHON_VER=$(python3 --version | awk '{print $2}')
echo "当前 Python 版本: $PYTHON_VER"

echo -e "${YELLOW}步骤 3: 创建/激活虚拟环境${NC}"
if [ ! -d "$VENV_DIR" ]; then
    echo "创建虚拟环境..."
    python3 -m venv $VENV_DIR
    echo -e "${GREEN}✅ 虚拟环境创建完成${NC}"
fi

source $VENV_DIR/bin/activate
echo -e "${GREEN}✅ 虚拟环境已激活${NC}"

echo -e "${YELLOW}步骤 4: 安装/更新依赖${NC}"
pip install --upgrade pip
pip install -r requirements.txt
echo -e "${GREEN}✅ 依赖安装完成${NC}"

echo -e "${YELLOW}步骤 5: 检查数据库连接${NC}"
# 测试 MySQL 连接
if command -v mysql &> /dev/null; then
    echo "MySQL 已安装"
    # 这里可以添加数据库连接测试
else
    echo -e "${YELLOW}⚠️  MySQL 客户端未找到${NC}"
fi

echo -e "${YELLOW}步骤 6: 创建必要的目录${NC}"
mkdir -p logs
mkdir -p data
mkdir -p strategy_configs
echo -e "${GREEN}✅ 目录创建完成${NC}"

echo -e "${YELLOW}步骤 7: 检查配置文件${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env 文件不存在，请创建并配置${NC}"
    echo "示例："
    echo "OKX_API_KEY=your_api_key"
    echo "OKX_SECRET_KEY=your_secret_key"
    echo "OKX_PASSPHRASE=your_passphrase"
    echo "DATABASE_URL=mysql://user:password@localhost/dbname"
else
    echo -e "${GREEN}✅ .env 文件已存在${NC}"
fi

echo -e "${YELLOW}步骤 8: 运行测试${NC}"
echo "运行单元测试..."
python test_high_frequency_strategy.py
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 单元测试通过${NC}"
else
    echo -e "${RED}❌ 单元测试失败${NC}"
    exit 1
fi

echo ""
echo "================================"
echo -e "${GREEN}🎉 部署完成！${NC}"
echo "================================"
echo ""
echo "下一步操作："
echo "1. 配置 .env 文件（API 密钥、数据库连接）"
echo "2. 配置策略参数：strategy_configs/high_frequency_config.json"
echo "3. 运行模拟盘测试："
echo "   python run_high_frequency_strategy.py --mode paper --capital 300"
echo ""
echo "4. 使用 screen 或 systemd 后台运行："
echo "   screen -S trading"
echo "   python run_high_frequency_strategy.py --mode paper --capital 300"
echo "   Ctrl+A+D 退出 screen"
echo ""
echo "5. 查看日志："
echo "   tail -f logs/trading_*.log"
echo ""
echo -e "${YELLOW}⚠️  重要提醒：务必先在模拟盘测试至少1周！${NC}"
echo ""
