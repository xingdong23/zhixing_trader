#!/bin/bash
# 运行回测脚本

cd "$(dirname "$0")/.."

STRATEGY=${1:-MartingaleFTStrategy}
DAYS=${2:-7}

echo "Running backtest for strategy: $STRATEGY (last $DAYS days)..."

freqtrade backtesting \
    --config configs/config_okx.json \
    --strategy $STRATEGY \
    --days $DAYS \
    --datadir user_data/data \
    --export trades \
    -v
