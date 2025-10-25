#!/bin/bash
# 后台启动高频策略脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR" || exit 1

# 激活虚拟环境
source venv/bin/activate

# 设置日志文件
LOG_FILE="logs/high_frequency_daemon_$(date +%Y%m%d_%H%M%S).log"

# 检查是否已经在运行
if pgrep -f "run_high_frequency_strategy.py" > /dev/null; then
    echo "❌ 策略已经在运行中"
    pgrep -af "run_high_frequency_strategy.py"
    exit 1
fi

# 后台启动策略
echo "🚀 启动高频策略（后台运行）..."
echo "📝 日志文件: $LOG_FILE"

nohup python runners/run_high_frequency_strategy.py --mode paper --capital 300 > "$LOG_FILE" 2>&1 &

PID=$!
echo "✓ 策略已启动，PID: $PID"
echo "查看日志: tail -f $LOG_FILE"
echo "停止策略: kill $PID 或 pkill -f run_high_frequency_strategy.py"
