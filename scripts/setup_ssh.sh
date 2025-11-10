#!/bin/bash

# SSH免密登录配置脚本（本地执行）
# 使用方法：bash scripts/setup_ssh.sh

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 配置SSH免密登录"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

SERVER="101.42.14.209"
USER="root"

# 检查是否已有SSH密钥
if [ ! -f ~/.ssh/id_rsa ]; then
    echo "📝 生成SSH密钥..."
    ssh-keygen -t rsa -b 4096 -C "zhixing_trader_deploy" -f ~/.ssh/id_rsa -N ""
    echo "✅ SSH密钥生成完成"
else
    echo "✅ SSH密钥已存在"
fi
echo ""

# 复制公钥到服务器
echo "📤 复制公钥到服务器..."
echo "⚠️  请输入服务器密码（最后一次）: czbcxy25809*"
ssh-copy-id -i ~/.ssh/id_rsa.pub $USER@$SERVER

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 配置完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎉 现在可以免密登录："
echo "   ssh $USER@$SERVER"
echo ""


