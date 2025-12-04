#!/bin/bash

# Pump Hunter 启动脚本

cd "$(dirname "$0")"

# 默认模拟盘模式
MODE=${1:-paper}

echo "=========================================="
echo "🎯 启动 Pump Hunter 追涨猎手"
echo "   模式: $MODE"
echo "=========================================="

# 运行
python -m live_trading.pump_hunter.trader --mode $MODE

