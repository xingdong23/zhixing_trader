
import json
import os

BASE_CONFIG = "config.json"
# 三颗子弹策略: 每次开仓只用总资金的 1/3
# DOGE: 200U -> 66U
# Others: 100U -> 33U
CONFIGS = [
    {"filename": "config_doge.json", "symbol": "DOGE/USDT:USDT", "size": 66.0},
    {"filename": "config_xrp.json", "symbol": "XRP/USDT:USDT", "size": 33.0},
    {"filename": "config_bnb.json", "symbol": "BNB/USDT:USDT", "size": 33.0},
    {"filename": "config_sol.json", "symbol": "SOL/USDT:USDT", "size": 33.0},
]

def main():
    if not os.path.exists(BASE_CONFIG):
        print(f"❌ Base config {BASE_CONFIG} not found!")
        return

    with open(BASE_CONFIG, 'r') as f:
        base_data = json.load(f)

    for cfg in CONFIGS:
        new_data = base_data.copy()
        new_data['trading'] = base_data['trading'].copy()
        
        new_data['trading']['symbol'] = cfg['symbol']
        # Update the position size to the safer 'bullet' size
        new_data['trading']['position_size_usdt'] = cfg['size']
        
        with open(cfg['filename'], 'w') as f:
            json.dump(new_data, f, indent=4)
        
        print(f"✅ Created {cfg['filename']} (Symbol: {cfg['symbol']}, Safe Size: {cfg['size']}U)")

if __name__ == "__main__":
    main()
