#!/bin/bash

# Martingale Sniper - DOGE专用启动脚本

cd "$(dirname "$0")"

MODE=${1:-paper}
SYMBOL=${2:-"DOGE/USDT:USDT"}

echo "=========================================="
echo "🐕 马丁狙击手 - 单币种模式"
echo "   币种: $SYMBOL"
echo "   模式: $MODE"
echo "   杠杆: 5x (安全)"
echo "   止盈: 15%"
echo "   止损: 10%"
echo "=========================================="

python -m live_trading.martingale_sniper.trader_single --symbol "$SYMBOL" --mode $MODE
