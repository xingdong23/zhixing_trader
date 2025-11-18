#!/bin/bash
# 获取Telegram Chat ID

TOKEN="7825962342:AAFUeP2Ra9gug4NCv8IHtdS99PiKU35Gltc"

echo "============================================================"
echo "  获取Telegram Chat ID"
echo "============================================================"
echo ""
echo "⚠️  请先确保："
echo "  1. 在Telegram中找到你的Bot"
echo "  2. 点击 START 或发送 /start"
echo "  3. 发送任意消息（比如：你好）"
echo ""
echo "正在获取..."
echo ""

curl -s "https://api.telegram.org/bot${TOKEN}/getUpdates" | python3 -m json.tool | grep -A 10 '"chat"'

echo ""
echo "============================================================"
echo "在上面的输出中找到 \"id\": 数字"
echo "这个数字就是你的 Chat ID"
echo "============================================================"
