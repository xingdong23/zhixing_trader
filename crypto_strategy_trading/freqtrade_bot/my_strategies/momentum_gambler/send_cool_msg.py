import requests

webhook_url = 'https://open.feishu.cn/open-apis/bot/v2/hook/752c4855-357e-4ef3-a3f5-98125782767a'

message = """🚀 V11 交易引擎 已上线 🚀

━━━━━━━━━━━━━━━━━━━━━━━━
⚡ 策略: 动量赌徒 Crazy Bull Edition
🎯 目标: DOGE/USDT 永续合约
💎 杠杆: 10x (逐仓模式)
🔥 周期: 4H 波段交易

━━━━━━━━━━━━━━━━━━━━━━━━
📊 核心算法:
  • Bollinger Band Squeeze Detection
  • ADX > 30 Crazy Bull Breakout
  • Smart Trailing Stop (10%→15%)

🛡️ 风控系统:
  • 硬止损: 8%
  • 移动止盈: 自适应锁利
  • 逐仓隔离: 保护主账户

━━━━━━━━━━━━━━━━━━━━━━━━
💰 当前状态: 观察模式运行中
🤖 AI 赋能，稳健增长

Powered by QuantMind V11 Engine
「让算法替你捕捉疯牛」"""

payload = {
    'msg_type': 'text',
    'content': {
        'text': message
    }
}

resp = requests.post(webhook_url, json=payload, timeout=10)
print(f'Status: {resp.status_code}')
print(f'Response: {resp.text}')
