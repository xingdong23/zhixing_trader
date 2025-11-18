#!/bin/bash
# OKX资金费率套利机器人启动脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  OKX资金费率套利机器人启动脚本${NC}"
echo -e "${GREEN}======================================${NC}"

# 检查运行模式参数
MODE=${1:-paper}

if [ "$MODE" != "paper" ] && [ "$MODE" != "live" ]; then
    echo -e "${RED}错误: 无效的运行模式 '$MODE'${NC}"
    echo "用法: $0 [paper|live]"
    echo "  paper - 模拟盘模式（推荐）"
    echo "  live  - 实盘模式（谨慎使用）"
    exit 1
fi

# 显示运行模式
if [ "$MODE" = "live" ]; then
    echo -e "${RED}⚠️  警告: 实盘模式！${NC}"
    echo -e "${RED}请确保你已经在模拟盘测试过至少48小时！${NC}"
    read -p "输入 'YES' 继续: " confirm
    if [ "$confirm" != "YES" ]; then
        echo "已取消"
        exit 0
    fi
else
    echo -e "${GREEN}✓ 模拟盘模式${NC}"
fi

# 切换到项目根目录
cd "$PROJECT_ROOT"

# 检查虚拟环境
if [ -d ".venv" ]; then
    echo -e "${GREEN}✓ 激活虚拟环境: .venv${NC}"
    source .venv/bin/activate
elif [ -d ".venv1" ]; then
    echo -e "${GREEN}✓ 激活虚拟环境: .venv1${NC}"
    source .venv1/bin/activate
else
    echo -e "${YELLOW}⚠️  未找到虚拟环境，使用系统Python${NC}"
fi

# 检查环境变量
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  未找到.env文件，请配置OKX API密钥${NC}"
    echo "创建.env文件并添加以下内容:"
    echo "  OKX_API_KEY=你的API Key"
    echo "  OKX_SECRET_KEY=你的Secret Key"
    echo "  OKX_PASSPHRASE=你的Passphrase"
fi

# 设置PYTHONPATH
export PYTHONPATH="$PROJECT_ROOT:$PYTHONPATH"

# 创建日志目录
mkdir -p logs

# 启动机器人
echo -e "${GREEN}🚀 启动资金费率套利机器人...${NC}"
echo "模式: $MODE"
echo "日志目录: logs/"
echo ""

python live_trading/funding_arbitrage.py --mode "$MODE"
