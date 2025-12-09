#!/bin/bash
# 运行 FreqAI 模拟/实盘脚本
# 用法: ./run_freqai_live.sh [dry-run|live]

cd "$(dirname "$0")/.."

MODE=${1:-dry-run}

echo "Starting FreqAI in $MODE mode..."

CMD="freqtrade trade --config configs/config_okx.json --config configs/config_freqai.json --strategy FreqAIStrategy --freqaimodel CustomLGBM --datadir user_data/data"

if [ "$MODE" = "dry-run" ]; then
    CMD="$CMD --dry-run"
fi

echo "Executing: $CMD"
$CMD
