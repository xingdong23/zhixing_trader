#!/bin/bash

# EMA Simple Trend 优化版 - 回测运行脚本
# 
# 使用方法：
#   cd app/strategies/ema_simple_trend
#   bash run_backtest.sh

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 EMA Simple Trend 优化版 - 回测启动"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 策略配置: config.json"
echo "📊 回测配置: backtest_config.json"
echo "⏰ 数据周期: 2年 (2023-01 至 2025-10)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 返回项目根目录
cd ../../../

# 运行回测
python3 backtest/run_backtest.py --config app/strategies/ema_simple_trend/backtest_config.json

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 回测完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
