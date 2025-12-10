"""
从币安公共API下载历史K线数据 (无需API Key)
"""
import requests
import pandas as pd
import time
import os
from datetime import datetime, timedelta

DATA_DIR = "/Users/chengzheng/workspace/chuangxin/zhixing_trader/crypto_strategy_trading/data"
SYMBOL = "SOLUSDT"
INTERVAL = "5m"

# 下载时间范围 - 2023年1月到现在
START_DATE = "2023-01-01"
END_DATE = "2024-12-01"

def download_klines(symbol, interval, start_time, end_time, limit=1000):
    """从币安API下载K线数据"""
    url = "https://api.binance.com/api/v3/klines"
    params = {
        "symbol": symbol,
        "interval": interval,
        "startTime": start_time,
        "endTime": end_time,
        "limit": limit
    }
    
    try:
        response = requests.get(url, params=params, timeout=30)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error: {response.status_code}")
            return None
    except Exception as e:
        print(f"Request failed: {e}")
        return None

def main():
    print(f"下载 {SYMBOL} {INTERVAL} 数据")
    print(f"时间范围: {START_DATE} ~ {END_DATE}")
    print("-" * 50)
    
    # 转换日期为毫秒时间戳
    start_dt = datetime.strptime(START_DATE, "%Y-%m-%d")
    end_dt = datetime.strptime(END_DATE, "%Y-%m-%d")
    
    all_data = []
    current_start = int(start_dt.timestamp() * 1000)
    final_end = int(end_dt.timestamp() * 1000)
    
    batch = 0
    while current_start < final_end:
        # 每次最多1000条，5分钟数据约3.5天
        current_end = min(current_start + 1000 * 5 * 60 * 1000, final_end)
        
        data = download_klines(SYMBOL, INTERVAL, current_start, current_end)
        
        if data is None:
            print("下载失败，等待后重试...")
            time.sleep(5)
            continue
        
        if len(data) == 0:
            break
        
        all_data.extend(data)
        batch += 1
        
        # 更新进度
        current_dt = datetime.fromtimestamp(current_start / 1000)
        print(f"Batch {batch}: {current_dt.strftime('%Y-%m-%d')} | 共 {len(all_data)} 条")
        
        # 下一批从最后一条之后开始
        current_start = data[-1][0] + 1
        
        # 避免API限流
        time.sleep(0.5)
    
    if not all_data:
        print("未下载到数据")
        return
    
    # 转换为DataFrame
    columns = ['open_time', 'open', 'high', 'low', 'close', 'volume',
               'close_time', 'quote_volume', 'count', 
               'taker_buy_volume', 'taker_buy_quote_volume', 'ignore']
    
    df = pd.DataFrame(all_data, columns=columns)
    
    # 去重
    df = df.drop_duplicates(subset=['open_time'])
    df = df.sort_values('open_time').reset_index(drop=True)
    
    # 保存
    output_file = os.path.join(DATA_DIR, f"{SYMBOL}-5m-2023-2024.csv")
    df.to_csv(output_file, index=False)
    
    print("-" * 50)
    print(f"下载完成！")
    print(f"总数据: {len(df)} 条")
    print(f"保存到: {output_file}")
    
    # 显示日期范围
    df['date'] = pd.to_datetime(df['open_time'], unit='ms')
    print(f"日期范围: {df['date'].min()} ~ {df['date'].max()}")

if __name__ == "__main__":
    main()
