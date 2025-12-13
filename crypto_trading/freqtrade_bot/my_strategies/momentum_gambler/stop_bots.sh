#!/bin/bash

echo "🛑 Stopping V11 Crypto Bots..."

# Find pids running live_runner.py
pids=$(ps -ef | grep "live_runner.py" | grep -v grep | awk '{print $2}')

if [ -z "$pids" ]; then
    echo "No bots running."
else
    echo "Killing PIDs: $pids"
    kill $pids
    echo "✅ All bots stopped."
fi
