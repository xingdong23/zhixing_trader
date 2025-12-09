"""
合并ETH 5分钟数据
"""
import pandas as pd
import glob
import os
from pathlib import Path

def merge_eth_5m_data():
    data_dir = Path(__file__).parent.parent / 'data'
    
    # 找到所有5分钟ETH数据
    pattern = str(data_dir / 'ETHUSDT-5m-2024-*.csv')
    files = sorted(glob.glob(pattern))
    
    print(f"找到 {len(files)} 个文件")
    
    if not files:
        print("未找到数据文件!")
        return
    
    dfs = []
    for file in files:
        print(f"处理: {os.path.basename(file)}")
        df = pd.read_csv(file)
        dfs.append(df)
    
    # 合并
    merged = pd.concat(dfs, ignore_index=True)
    
    # 去重并排序
    merged = merged.drop_duplicates(subset=['open_time'])
    merged = merged.sort_values('open_time')
    
    # 保存
    output_file = data_dir / 'ETHUSDT-5m-2024-merged.csv'
    merged.to_csv(output_file, index=False)
    
    print(f"\n✓ 合并完成!")
    print(f"  总K线数: {len(merged)}")
    print(f"  时间范围: {merged['open_time'].min()} - {merged['open_time'].max()}")
    print(f"  保存位置: {output_file}")
    
    # 转换时间戳显示
    merged['datetime'] = pd.to_datetime(merged['open_time'], unit='ms')
    print(f"  日期范围: {merged['datetime'].min()} - {merged['datetime'].max()}")
    
    return output_file

if __name__ == '__main__':
    merge_eth_5m_data()
