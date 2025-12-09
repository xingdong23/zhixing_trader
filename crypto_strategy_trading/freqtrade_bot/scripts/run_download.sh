#!/bin/bash
# 下载历史数据脚本

cd "$(dirname "$0")/.."

# 默认下载最近 30 天的 15m 数据
DAYS=${1:-30}
TIMEFRAME=${2:-15m}

echo "Downloading data for the last $DAYS days (timeframe: $TIMEFRAME)..."

freqtrade download-data \
    --config configs/config_okx.json \
    --days $DAYS \
    --timeframe $TIMEFRAME \
    --datadir user_data/data \
    -v
