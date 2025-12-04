#!/bin/bash

# Martingale Sniper 启动脚本

cd "$(dirname "$0")"

MODE=${1:-paper}

echo "=========================================="
echo "🎰 启动 Martingale Sniper 马丁狙击手"
echo "   模式: $MODE"
echo "   本金: 300U"
echo "   下注序列: 10→20→40→80→150"
echo "   目标: 翻倍"
echo "   风险: 可能归零"
echo "=========================================="

python -m live_trading.martingale_sniper.trader --mode $MODE
