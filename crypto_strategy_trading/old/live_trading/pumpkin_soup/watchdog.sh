#!/bin/bash

# Watchdog Script for Pumpkin Soup Strategy
# Usage: ./watchdog.sh [mode]
# Example: ./watchdog.sh live

MODE=${1:-paper}
SCRIPT="live_trading/pumpkin_soup/runner.py"

echo "🐶 Watchdog started for $SCRIPT (Mode: $MODE)"

while true; do
    echo "----------------------------------------"
    echo "🚀 Starting Bot at $(date)"
    
    # Run the python script
    # We use --yes to skip confirmation in live mode if auto-restarting
    python $SCRIPT --mode $MODE --yes
    
    EXIT_CODE=$?
    echo "🛑 Bot stopped with exit code $EXIT_CODE at $(date)"
    
    # Exit code 0 means normal stop (user pressed Ctrl+C or internal stop)
    # Non-zero means crash
    if [ $EXIT_CODE -eq 0 ]; then
        echo "✅ Normal shutdown. Watchdog exiting."
        break
    else
        echo "⚠️  CRASH DETECTED! Restarting in 10 seconds..."
        # Optional: Send curl alert here if python script didn't send one
        sleep 10
    fi
done
