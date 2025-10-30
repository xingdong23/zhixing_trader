#!/bin/bash

# EMA交叉策略 - 多周期批量回测脚本

echo "=========================================="
echo "EMA交叉策略 - 批量回测"
echo "=========================================="
echo ""

cd "$(dirname "$0")/.."

# 定义回测配置文件列表
configs=(
    "backtest/configs/ema_crossover_5m.json"
    "backtest/configs/ema_crossover_15m.json"
    "backtest/configs/ema_crossover_1h.json"
    "backtest/configs/ema_crossover_4h.json"
)

# 定义周期名称
names=(
    "5分钟"
    "15分钟"
    "1小时"
    "4小时"
)

# 依次运行每个配置
for i in "${!configs[@]}"; do
    config="${configs[$i]}"
    name="${names[$i]}"
    
    echo ""
    echo "=========================================="
    echo "开始回测: $name 级别"
    echo "=========================================="
    echo ""
    
    python backtest/run_backtest.py --config "$config"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ $name 级别回测完成"
    else
        echo ""
        echo "❌ $name 级别回测失败"
    fi
    
    echo ""
    echo "等待3秒..."
    sleep 3
done

echo ""
echo "=========================================="
echo "所有回测完成！"
echo "=========================================="
echo ""
echo "查看回测结果："
echo "  ls -lht backtest/results/ema_crossover_*"

