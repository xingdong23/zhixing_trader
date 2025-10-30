#!/usr/bin/env python3
"""
数据合并脚本 - 合并多个月的历史数据
"""

import pandas as pd
import glob
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def merge_month_data(symbol: str, months: list, output_file: str):
    """
    合并指定月份的数据
    
    Args:
        symbol: 交易对，如 "ETHUSDT"
        months: 月份列表，如 ["2024-05", "2024-06", "2024-07"]
        output_file: 输出文件路径
    """
    
    all_files = []
    
    for month in months:
        pattern = f"data/{symbol}-5m-{month}-*.csv"
        files = sorted(glob.glob(pattern))
        logger.info(f"找到 {month}: {len(files)} 个文件")
        all_files.extend(files)
    
    if not all_files:
        logger.error("未找到匹配的文件")
        return
    
    logger.info(f"总共 {len(all_files)} 个文件")
    logger.info("开始合并...")
    
    dfs = []
    for file in all_files:
        df = pd.read_csv(file)
        dfs.append(df)
    
    # 合并
    merged_df = pd.concat(dfs, ignore_index=True)
    
    # 按时间排序
    merged_df = merged_df.sort_values('open_time').reset_index(drop=True)
    
    # 去重
    before_count = len(merged_df)
    merged_df = merged_df.drop_duplicates(subset=['open_time'], keep='first')
    after_count = len(merged_df)
    
    if before_count != after_count:
        logger.info(f"去除 {before_count - after_count} 条重复数据")
    
    # 保存
    merged_df.to_csv(output_file, index=False)
    
    # 统计
    logger.info(f"✓ 合并完成:")
    logger.info(f"  - 输出文件: {output_file}")
    logger.info(f"  - 数据条数: {len(merged_df)}")
    logger.info(f"  - 时间范围: {merged_df['open_time'].min()} ~ {merged_df['open_time'].max()}")
    logger.info(f"  - 文件大小: {Path(output_file).stat().st_size / 1024 / 1024:.2f} MB")


if __name__ == "__main__":
    # 合并6个月数据（2024年5月-10月）
    merge_month_data(
        symbol="ETHUSDT",
        months=["2024-05", "2024-06", "2024-07", "2024-08", "2024-09", "2024-10"],
        output_file="data/ETHUSDT-5m-6months.csv"
    )
    
    print("\n" + "="*60)
    print("也可以合并特定月份，例如：")
    print("="*60)
    
    # 合并3个月数据（8-10月）
    merge_month_data(
        symbol="ETHUSDT",
        months=["2024-08", "2024-09", "2024-10"],
        output_file="data/ETHUSDT-5m-3months.csv"
    )

