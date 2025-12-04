# -*- coding: utf-8 -*-
"""
OKX 专业资金费率 Delta Neutral 套利机器人（飞书版）
已替换所有 Telegram 为飞书 webhook
"""

import ccxt
import time
import logging
import requests
import json
from datetime import datetime

# ====================== 配置区 ======================
API_KEY = '你的OKX API_KEY'
API_SECRET = '你的OKX SECRET_KEY'
PASSPHRASE = '你的OKX PASSPHRASE'

# 飞书机器人 Webhook（自己建一个飞书群 → 加机器人 → 复制 webhook 地址）
FEISHU_WEBHOOK = 'https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxxxxxxxxxxx'

SYMBOL = 'ETH-USDT'
SWAP_SYMBOL = 'ETH-USDT-SWAP'
TARGET_LEVERAGE = 2.0                 # 风险敞口 1.5~3.0 随便调
REBALANCE_INTERVAL = 4 * 3600         # 每4小时平衡一次
FUNDING_RATE_THRESHOLD = 0.0001       # 资金费率低于0.01%暂停
MAX_SLIPPAGE = 0.001
MAKER_ORDER_LEVELS = 5
# ===================================================

okx = ccxt.okx({
    'apiKey': API_KEY,
    'secret': API_SECRET,
    'password': PASSPHRASE,
    'enableRateLimit': True,
    'options': {'defaultType': 'swap'}
})

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(message)s')

def send_feishu(msg):
    """发送飞书消息（支持富文本）"""
    payload = {
        "msg_type": "text",
        "content": {
            "text": f"[资金费率套利机器人]\n{msg}\n时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        }
    }
    try:
        requests.post(FEISHU_WEBHOOK, json=payload, timeout=10)
    except Exception as e:
        logging.error(f"飞书发送失敗: {e}")

def send_feishu_rich(title, content):
    """更漂亮的卡片消息（可选）"""
    payload = {
        "msg_type": "interactive",
        "card": {
            "elements": [{"tag": "markdown", "content": content}],
            "header": {
                "title": {"tag": "plain_text", "content": title},
                "template": "green" if "完成" in title or "启动" in title else "red"
            }
        }
    }
    try:
        requests.post(FEISHU_WEBHOOK, json=payload, timeout=10)
    except Exception as e:
        logging.error(f"飞书卡片发送失败: {e}")

# 下面所有函数和之前完全一样，只是把 send_telegram 换成 send_feishu
def get_funding_rate():
    info = okx.fetch_funding_rate(SWAP_SYMBOL)
    return float(info['fundingRate'])

def get_spot_balance():
    bal = okx.fetch_balance(params={'type': 'spot'})
    return float(bal['ETH']['total']) if 'ETH' in bal else 0.0

# def get_swap_position():
#     pos = okx.fetch_positions([SWAP_SYMBOL])
#     for p in pos:
#         if p['contracts'] != 0:
# DCALL            return {
#     'side': 'short' if float(p['contracts']) < 0 else 'long',
#     'size': abs(float(p['contracts'])),
#     'entry': float(p['entryPrice'])
# }
# return {'side': None, 'size': 0}

def cancel_all_orders(symbol):
    try:
        orders = okx.fetch_open_orders(symbol)
        for o in orders:
            okx.cancel_order(o['id'], symbol)
    except: pass

def place_limit_orders(side, size_eth, price, levels=MAKER_ORDER_LEVELS):
    size_per = size_eth / levels
    for i in range(levels):
        offset = (i + 1) * 0.0005 if side == 'buy' else -(i + 1) * 0.0005
        p = round(price * (1 + offset), 2)
        try:
            if side == 'buy':
                okx.create_limit_buy_order(SWAP_SYMBOL, size_per * 100, p)   # OKX 1张=0.01 ETH
            else:
                okx.create_limit_sell_order(SWAP_SYMBOL, size_per * 100, p)
            time.sleep(0.3)  # 防止频率过快
        except Exception as e:
            logging.error(f"限价单失败: {e}")

def rebalance():
    funding_rate = get_funding_rate()
    logging.info(f"当前资金费率: {funding_rate*10000:.2f}bp (8小时)")

    if abs(funding_rate) < FUNDING_RATE_THRESHOLD:
        send_feishu("⚠️ 资金费率过低，已暂停套利")
        return

    spot_eth = get_spot_balance()
    spot_price = okx.fetch_ticker(SYMBOL)['last']
    spot_value = spot_eth * spot_price
    target_nominal = spot_value * TARGET_LEVERAGE
    target_contracts = int(target_nominal / spot_price * 100)  # 张数

    current_pos = get_swap_position()

    # 永远做被付钱的一方
    if funding_rate > 0:
        desired_side = 'short'
        extra = "现货持 ETH + 合约做空"
    else:
        desired_side = 'long'
        extra = "现货持 USDT + 合约做多"
        if spot_eth > 0.01:
            okx.create_market_sell_order(SYMBOL, spot_eth * 0.99)
            send_feishu(f"费率转负，已现货卖出 {spot_eth:.4f} ETH")

    if current_pos['side'] and current_pos['side'] != desired_side:
        okx.create_market_order(SWAP_SYMBOL, 'sell' if current_pos['side']=='long' else 'buy', current_pos['size'])
        send_feishu("🔄 资金费率反向，已自动翻仓")

    need_size = abs(target_contracts - (current_pos['size'] if current_pos['side']==desired_side else 0))
    if need_size < 5:  # 小于0.05 ETH 不动
        send_feishu(f"✅ Delta 已中性，无需调整\n当前费率 {funding_rate*10000:.2f}bp")
        return

    cancel_all_orders(SWAP_SYMBOL)
    time.sleep(2)

    side = 'sell' if desired_side == 'short' else 'buy'
    send_feishu(f"🔄 正在再平衡 {desired_side.upper()}\n需要调整 {need_size} 张（约 {need_size/100:.4f} ETH）\n费率 {funding_rate*10000:.2f}bp")

    place_limit_orders(side, need_size / 100, spot_price)

def set_leverage():
    try:
        okx.set_leverage(int(TARGET_LEVERAGE), SWAP_SYMBOL, params={'mgnMode': 'cross'})
    except: pass

def main():
    send_feishu("🤖 OKX 资金费率套利机器人已启动（飞书版）")
    set_leverage()

    while True:
        try:
            rebalance()
        except Exception as e:
            error_msg = f"🚨 机器人异常: {str(e)}"
            logging.error(error_msg)
            send_feishu(error_msg)

        time.sleep(REBALANCE_INTERVAL)

if __name__ == '__main__':
    main()