#!/bin/bash

# Set PYTHONPATH to current directory
export PYTHONPATH=$PYTHONPATH:$(pwd)

# Check if config file exists
CONFIG_FILE="strategies/pumpkin_soup/config_live.json"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: Config file $CONFIG_FILE not found!"
    exit 1
fi

# Run the strategy
echo "Starting Pumpkin Soup Strategy (Live)..."
python live_trading/pumpkin_soup/runner.py --config "$CONFIG_FILE"
