#!/bin/bash

# 比特币交易模块启动脚本

echo "🚀 启动比特币交易模块..."

# 检查Python版本
python_version=$(python3 --version 2>&1 | awk '{print $2}' | cut -d. -f1,2)
required_version="3.9"

if (( $(echo "$python_version < $required_version" | bc -l) )); then
    echo "❌ 错误: 需要 Python 3.9 或更高版本 (当前: $python_version)"
    exit 1
fi

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
echo "🔧 激活虚拟环境..."
source venv/bin/activate

# 安装依赖
echo "📥 检查并安装依赖..."
pip install -q -r requirements.txt

# 检查.env文件
if [ ! -f ".env" ]; then
    echo "⚠️  警告: .env 文件不存在"
    echo "📝 请创建 .env 文件并配置必要的环境变量"
    echo "参考 .env.example 文件"
    echo ""
    read -p "是否继续使用默认配置？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 已取消启动"
        exit 1
    fi
fi

# 启动服务
echo "🎯 启动服务..."
echo "📍 API地址: http://localhost:8001"
echo "📚 API文档: http://localhost:8001/docs"
echo ""
python run.py

