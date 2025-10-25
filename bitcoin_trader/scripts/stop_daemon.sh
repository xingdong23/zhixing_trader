#!/bin/bash
# 停止高频策略脚本

echo "🛑 停止高频策略..."

# 查找并停止进程
if pgrep -f "run_high_frequency_strategy.py" > /dev/null; then
    pkill -f "run_high_frequency_strategy.py"
    sleep 2
    
    # 确认是否已停止
    if pgrep -f "run_high_frequency_strategy.py" > /dev/null; then
        echo "❌ 进程未能正常停止，尝试强制停止..."
        pkill -9 -f "run_high_frequency_strategy.py"
    fi
    
    echo "✓ 策略已停止"
else
    echo "ℹ️  策略未在运行"
fi
