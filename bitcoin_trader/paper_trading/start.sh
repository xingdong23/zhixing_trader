#!/bin/bash

# 模拟盘启动脚本

echo "================================"
echo "  模拟盘交易系统 - 启动脚本"
echo "================================"
echo ""

# 检查Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安装"
    exit 1
fi

echo "✅ Python版本: $(python3 --version)"

# 检查配置文件
if [ ! -f "config/.env" ]; then
    echo "❌ 配置文件不存在"
    echo "   请先复制配置模板: cp config/.env.example config/.env"
    echo "   然后编辑 config/.env 填入API Key"
    exit 1
fi

echo "✅ 配置文件存在"

# 检查依赖
echo ""
echo "检查Python依赖..."
pip3 list | grep -q "requests" || pip3 install -r requirements.txt

echo ""
echo "================================"
echo "  启动模拟盘系统..."
echo "================================"
echo ""

# 启动主程序
cd src
python3 main.py
