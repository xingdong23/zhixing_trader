#!/bin/bash

# 高频短线策略启动脚本
# 用于在阿里云服务器上启动策略

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 配置
WORK_DIR="/opt/zhixing_trader/bitcoin_trader"
VENV_DIR="venv"
LOG_DIR="logs"
MODE="${1:-paper}"  # paper 或 live
CAPITAL="${2:-300}"  # 默认300 USDT

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}高频短线策略启动脚本${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# 检查参数
if [ "$MODE" != "paper" ] && [ "$MODE" != "live" ]; then
    echo -e "${RED}错误: 模式必须是 'paper' 或 'live'${NC}"
    echo "用法: $0 [paper|live] [资金]"
    exit 1
fi

# 警告
if [ "$MODE" == "live" ]; then
    echo -e "${RED}⚠️  警告: 您正在启动实盘交易！${NC}"
    echo -e "${RED}⚠️  这将使用真实资金进行交易！${NC}"
    echo ""
    read -p "确认继续？(输入 YES 继续): " confirm
    if [ "$confirm" != "YES" ]; then
        echo "已取消"
        exit 0
    fi
fi

# 进入工作目录
cd $WORK_DIR

# 激活虚拟环境
echo -e "${YELLOW}激活虚拟环境...${NC}"
source $VENV_DIR/bin/activate

# 创建日志目录
mkdir -p $LOG_DIR

# 生成日志文件名
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$LOG_DIR/high_frequency_${MODE}_${TIMESTAMP}.log"

echo -e "${GREEN}配置信息:${NC}"
echo "  - 模式: $MODE"
echo "  - 资金: $CAPITAL USDT"
echo "  - 日志: $LOG_FILE"
echo ""

# 检查是否已有进程在运行
if pgrep -f "run_high_frequency_strategy.py" > /dev/null; then
    echo -e "${YELLOW}检测到已有策略进程在运行${NC}"
    echo "进程列表:"
    ps aux | grep run_high_frequency_strategy.py | grep -v grep
    echo ""
    read -p "是否停止现有进程？(y/n): " stop_existing
    if [ "$stop_existing" == "y" ]; then
        pkill -f "run_high_frequency_strategy.py"
        echo -e "${GREEN}已停止现有进程${NC}"
        sleep 2
    else
        echo "保持现有进程运行"
        exit 0
    fi
fi

# 启动策略
echo -e "${GREEN}启动高频短线策略...${NC}"
echo ""

if [ "$MODE" == "paper" ]; then
    echo -e "${YELLOW}模拟盘模式 - 无风险测试${NC}"
else
    echo -e "${RED}实盘模式 - 使用真实资金${NC}"
fi

echo ""
echo "按 Ctrl+C 停止策略"
echo "或使用 screen/tmux 后台运行"
echo ""
echo "================================"
echo ""

# 运行策略
python run_high_frequency_strategy.py \
    --mode $MODE \
    --capital $CAPITAL \
    --symbol BTC/USDT \
    --timeframe 5m \
    2>&1 | tee $LOG_FILE

echo ""
echo -e "${GREEN}策略已停止${NC}"
