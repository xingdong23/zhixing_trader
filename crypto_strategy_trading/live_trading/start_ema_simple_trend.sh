#!/bin/bash
# EMA Simple Trend 策略启动脚本

# 设置项目路径
PROJECT_DIR="/opt/zhixing_trader/bitcoin_trader"
cd "$PROJECT_DIR" || exit 1

# 设置Python路径
export PYTHONPATH="$PROJECT_DIR"

# 激活虚拟环境
source venv/bin/activate

# 运行模式：paper(模拟盘) 或 live(实盘)
MODE="${1:-paper}"
shift || true
EXTRA_ARGS="$@"

# 停止旧进程
echo "停止旧进程..."
pkill -9 -f "python.*ema_simple_trend" || true
sleep 2

# 启动策略
echo "启动 EMA Simple Trend 策略 - 模式: $MODE"
# 日志由应用内的 TimedRotatingFileHandler 负责滚动到 logs/ema_simple_trend.log
nohup python live_trading/ema_simple_trend.py --mode "$MODE" $EXTRA_ARGS >/dev/null 2>&1 &

PID=$!
echo "✅ 策略已启动 PID: $PID"
echo ""
echo "查看日志："
echo "  tail -f logs/ema_simple_trend.log"
echo ""
echo "停止策略："
echo "  pkill -9 -f 'python.*ema_simple_trend'"
