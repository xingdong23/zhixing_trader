#!/bin/bash

# Bitcoin Trader - OKX 模拟盘快速启动脚本

echo "════════════════════════════════════════════════════════════════"
echo "  🪙 Bitcoin Trader - OKX 模拟盘快速启动"
echo "════════════════════════════════════════════════════════════════"
echo ""

# 检查 Python 环境
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未找到 Python3"
    echo "请先安装 Python 3.8 或更高版本"
    exit 1
fi

echo "✅ Python 版本: $(python3 --version)"
echo ""

# 检查是否在正确的目录
if [ ! -f "requirements.txt" ]; then
    echo "❌ 错误: 请在 bitcoin_trader 目录下运行此脚本"
    exit 1
fi

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "⚠️  警告: 未找到 .env 文件"
    echo ""
    echo "正在创建 .env 文件..."
    cp .env.example .env
    echo "✅ 已创建 .env 文件"
    echo ""
    echo "请编辑 .env 文件，填入你的 OKX API 配置:"
    echo "  1. OKX_API_KEY=你的API密钥"
    echo "  2. OKX_API_SECRET=你的Secret密钥"
    echo "  3. OKX_PASSPHRASE=你的API密码"
    echo ""
    echo "配置完成后，重新运行此脚本"
    exit 0
fi

# 检查依赖
echo "📦 检查依赖..."
if ! python3 -c "import ccxt" 2>/dev/null; then
    echo "⚠️  未安装依赖，正在安装..."
    pip3 install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
    echo "✅ 依赖安装完成"
else
    echo "✅ 依赖已安装"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  🚀 启动 OKX 模拟交易"
echo "════════════════════════════════════════════════════════════════"
echo ""

# 运行交易脚本
python3 examples/okx_demo_trading.py

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  👋 感谢使用 Bitcoin Trader"
echo "════════════════════════════════════════════════════════════════"
