#!/usr/bin/env python3
"""测试Telegram通知"""
import requests

# 配置
telegram_token = "7825962342:AAFUeP2Ra9gug4NCv8IHtdS99PiKU35Gltc"

# 方法1：获取所有更新，找到你的chat_id
print("=" * 60)
print("获取Telegram更新（找到你的Chat ID）")
print("=" * 60)
url = f"https://api.telegram.org/bot{telegram_token}/getUpdates"
response = requests.get(url)
print(f"状态码: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    if data.get('ok') and data.get('result'):
        print("\n找到以下对话：")
        for update in data['result']:
            if 'message' in update:
                chat = update['message']['chat']
                print(f"  Chat ID: {chat['id']}")
                print(f"  类型: {chat['type']}")
                if 'username' in chat:
                    print(f"  用户名: @{chat['username']}")
                if 'first_name' in chat:
                    print(f"  名字: {chat['first_name']}")
                print()
    else:
        print("⚠️  没有找到任何对话")
        print("请先在Telegram中：")
        print("  1. 搜索你的Bot")
        print("  2. 发送 /start 给Bot")
        print("  3. 重新运行此脚本")
else:
    print(f"❌ 错误: {response.text}")

# 方法2：测试发送消息（需要先获取正确的chat_id）
print("\n" + "=" * 60)
print("如果你知道Chat ID，可以在这里测试")
print("=" * 60)
test_chat_id = input("输入你的Chat ID（直接回车跳过）: ").strip()

if test_chat_id:
    url = f"https://api.telegram.org/bot{telegram_token}/sendMessage"
    response = requests.post(
        url,
        data={
            'chat_id': test_chat_id,
            'text': '🤖 测试消息：资金费率套利机器人连接成功！'
        },
        timeout=10
    )
    
    print(f"\n状态码: {response.status_code}")
    if response.status_code == 200:
        print("✅ 消息发送成功！请检查Telegram")
    else:
        print(f"❌ 发送失败: {response.text}")
