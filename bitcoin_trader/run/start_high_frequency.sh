#!/bin/bash
# 快速启动脚本

echo "================================"
echo "  比特币高频交易策略"
echo "================================"
echo ""
echo "请选择运行模式："
echo "1) 模拟盘（推荐）"
echo "2) 实盘（谨慎）"
echo ""
read -p "请输入选项 (1/2): " choice

case $choice in
    1)
        echo ""
        echo "启动模拟盘交易..."
        cd "$(dirname "$0")/.."
        python run/high_frequency.py --mode paper
        ;;
    2)
        echo ""
        echo "⚠️  警告：即将启动实盘交易！"
        read -p "确认继续？(yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            cd "$(dirname "$0")/.."
            python run/high_frequency.py --mode live
        else
            echo "已取消"
        fi
        ;;
    *)
        echo "无效选项"
        exit 1
        ;;
esac
