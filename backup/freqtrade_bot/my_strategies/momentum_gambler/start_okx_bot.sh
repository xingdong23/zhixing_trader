#!/bin/bash

# V11 OKX Single Bot Launcher
# 单币种 DOGE 启动脚本 (250U 资金版)

echo "🚀 Starting V11 OKX Bot (DOGE)..."

cd "$(dirname "$0")"

# 创建 logs 目录
mkdir -p logs

# 启动 DOGE 机器人
nohup python live_runner.py --config config_okx_doge.json > logs/okx_doge.log 2>&1 &
echo "✅ Started DOGE Bot (PID $!)"

echo "--------------------------------------"
echo "📊 Check log: tail -f logs/okx_doge.log"
echo "🛑 Stop: pkill -f 'config_okx_doge.json'"
