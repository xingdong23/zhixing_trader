#!/bin/bash

# 切换到src目录
cd "$(dirname "$0")/src"

# 启动系统
echo "🚀 启动模拟盘交易系统..."
python3 main.py

