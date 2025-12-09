#!/bin/bash
# 运行 FreqAI 回测脚本
# 用法: ./run_freqai_backtest.sh [天数]

cd "$(dirname "$0")/.."

DAYS=${1:-30}

echo "Starting FreqAI Backtest (Training & Verification)..."
echo "Strategy: FreqAIStrategy"
echo "Days: $DAYS"

# 注意: FreqAI 需要同时加载 交易所配置(数据定义) 和 FreqAI配置(模型定义)
freqtrade backtesting \
    --config configs/config_okx.json \
    --config configs/config_freqai.json \
    --strategy FreqAIStrategy \
    --days $DAYS \
    --datadir user_data/data \
    --export trades \
    --freqaimodel CustomLGBM \
    -v
