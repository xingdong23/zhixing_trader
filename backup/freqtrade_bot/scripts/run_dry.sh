#!/bin/bash
# 运行 Dry-run 模拟交易脚本

cd "$(dirname "$0")/.."

STRATEGY=${1:-MartingaleFTStrategy}

echo "Starting Dry-run with strategy: $STRATEGY..."

freqtrade trade \
    --config configs/config_okx.json \
    --strategy $STRATEGY \
    --datadir user_data/data \
    --dry-run \
    -v
