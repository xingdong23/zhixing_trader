#!/bin/bash
# Pumpkin Soup 策略启动脚本

# 设置项目路径
PROJECT_DIR="/opt/zhixing_trader/crypto_strategy_trading"
# 如果本地开发，使用当前目录
if [ ! -d "$PROJECT_DIR" ]; then
    PROJECT_DIR="$(pwd)"
fi

cd "$PROJECT_DIR" || exit 1

# 设置Python路径
export PYTHONPATH="$PROJECT_DIR"

# 运行模式
MODE="${1:-paper}"
shift || true
EXTRA_ARGS="$@"

# 停止旧进程
echo "停止旧进程..."
pkill -9 -f "python live_trading/pumpkin_soup/runner.py" || true
sleep 2

# 启动策略
echo "启动 Pumpkin Soup 策略 - 模式: $MODE"
nohup env PYTHONPATH="$PROJECT_DIR" python live_trading/pumpkin_soup/runner.py --mode "$MODE" $EXTRA_ARGS >/dev/null 2>&1 &

PID=$!
echo "✅ 策略已启动 PID: $PID"
echo ""
echo "查看日志："
echo "  tail -f logs/pumpkin_soup.log"
