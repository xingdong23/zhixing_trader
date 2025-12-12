#!/bin/bash

# V11 Multi-Process Launcher
# Starts bots for DOGE, XRP, BNB, SOL

echo "🚀 Starting V11 Crypto Bots..."

# 1. DOGE (The King)
nohup python live_runner.py --config config_doge.json > logs/doge.log 2>&1 &
echo "✅ Started DOGE Bot (PID $!)"

# 2. XRP (The Prince)
nohup python live_runner.py --config config_xrp.json > logs/xrp.log 2>&1 &
echo "✅ Started XRP Bot (PID $!)"

# 3. BNB (The Tank)
nohup python live_runner.py --config config_bnb.json > logs/bnb.log 2>&1 &
echo "✅ Started BNB Bot (PID $!)"

# 4. SOL (The Knight)
nohup python live_runner.py --config config_sol.json > logs/sol.log 2>&1 &
echo "✅ Started SOL Bot (PID $!)"

echo "--------------------------------------"
echo "Check logs in logs/ dir (e.g., tail -f logs/doge.log)"
