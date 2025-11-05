#!/usr/bin/env python3
"""
币安历史数据下载工具
支持下载U本位合约的K线数据
"""

import requests
import os
from datetime import datetime, timedelta
from pathlib import Path
import zipfile
import pandas as pd


class BinanceDataDownloader:
    """币安数据下载器"""
    
    BASE_URL = "https://data.binance.vision/data/futures/um/daily/klines"
    
    def __init__(self, symbol: str = "ETHUSDT", interval: str = "1m", output_dir: str = "data"):
        """
        初始化下载器
        
        Args:
            symbol: 交易对，如 ETHUSDT
            interval: K线周期，如 1m, 5m, 15m, 1h
            output_dir: 输出目录
        """
        self.symbol = symbol
        self.interval = interval
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
    def download_single_day(self, date: str) -> bool:
        """
        下载单日数据
        
        Args:
            date: 日期，格式 YYYY-MM-DD
            
        Returns:
            是否下载成功
        """
        # 构建URL
        filename = f"{self.symbol}-{self.interval}-{date}.zip"
        url = f"{self.BASE_URL}/{self.symbol}/{self.interval}/{filename}"
        
        print(f"下载: {date} ...", end=" ")
        
        try:
            # 下载文件
            response = requests.get(url, timeout=30)
            
            if response.status_code == 200:
                # 保存zip文件
                zip_path = self.output_dir / filename
                with open(zip_path, 'wb') as f:
                    f.write(response.content)
                
                # 解压
                csv_filename = f"{self.symbol}-{self.interval}-{date}.csv"
                with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                    zip_ref.extractall(self.output_dir)
                
                # 删除zip文件
                zip_path.unlink()
                
                print(f"✓ 成功")
                return True
            elif response.status_code == 404:
                print(f"✗ 数据不存在")
                return False
            else:
                print(f"✗ 失败 (HTTP {response.status_code})")
                return False
                
        except Exception as e:
            print(f"✗ 错误: {e}")
            return False
    
    def download_date_range(self, start_date: str, end_date: str):
        """
        下载日期范围内的数据
        
        Args:
            start_date: 开始日期，格式 YYYY-MM-DD
            end_date: 结束日期，格式 YYYY-MM-DD
        """
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
        
        print(f"\n{'='*60}")
        print(f"下载币安历史数据")
        print(f"{'='*60}")
        print(f"交易对: {self.symbol}")
        print(f"周期: {self.interval}")
        print(f"日期范围: {start_date} ~ {end_date}")
        print(f"输出目录: {self.output_dir}")
        print(f"{'='*60}\n")
        
        success_count = 0
        fail_count = 0
        
        current = start
        while current <= end:
            date_str = current.strftime("%Y-%m-%d")
            
            if self.download_single_day(date_str):
                success_count += 1
            else:
                fail_count += 1
            
            current += timedelta(days=1)
        
        print(f"\n{'='*60}")
        print(f"下载完成")
        print(f"成功: {success_count} 天")
        print(f"失败: {fail_count} 天")
        print(f"{'='*60}\n")
    
    def merge_csv_files(self, output_filename: str = None):
        """
        合并所有CSV文件为一个
        
        Args:
            output_filename: 输出文件名，默认为 {symbol}-{interval}-merged.csv
        """
        if output_filename is None:
            output_filename = f"{self.symbol}-{self.interval}-merged.csv"
        
        # 查找所有CSV文件
        csv_files = sorted(self.output_dir.glob(f"{self.symbol}-{self.interval}-*.csv"))
        
        if not csv_files:
            print("没有找到CSV文件")
            return
        
        print(f"\n合并 {len(csv_files)} 个文件...")
        
        # 读取并合并
        dfs = []
        for csv_file in csv_files:
            df = pd.read_csv(csv_file, header=None)
            dfs.append(df)
            print(f"  读取: {csv_file.name}")
        
        # 合并
        merged_df = pd.concat(dfs, ignore_index=True)
        
        # 添加列名
        merged_df.columns = [
            'open_time', 'open', 'high', 'low', 'close', 'vol',
            'close_time', 'quote_vol', 'count', 'taker_buy_vol',
            'taker_buy_quote_vol', 'ignore'
        ]
        
        # 去重（按open_time）
        before_count = len(merged_df)
        merged_df = merged_df.drop_duplicates(subset=['open_time'], keep='first')
        after_count = len(merged_df)
        
        # 排序
        merged_df = merged_df.sort_values('open_time').reset_index(drop=True)
        
        # 保存
        output_path = self.output_dir / output_filename
        merged_df.to_csv(output_path, index=False)
        
        print(f"\n✓ 合并完成")
        print(f"  总行数: {after_count}")
        print(f"  去重: {before_count - after_count} 行")
        print(f"  输出: {output_path}")


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='下载币安历史K线数据')
    parser.add_argument('--symbol', default='ETHUSDT', help='交易对，如 ETHUSDT')
    parser.add_argument('--interval', default='1m', help='K线周期，如 1m, 5m, 15m')
    parser.add_argument('--start', required=True, help='开始日期，格式 YYYY-MM-DD')
    parser.add_argument('--end', required=True, help='结束日期，格式 YYYY-MM-DD')
    parser.add_argument('--output', default='data', help='输出目录')
    parser.add_argument('--merge', action='store_true', help='合并所有CSV文件')
    
    args = parser.parse_args()
    
    # 创建下载器
    downloader = BinanceDataDownloader(
        symbol=args.symbol,
        interval=args.interval,
        output_dir=args.output
    )
    
    # 下载数据
    downloader.download_date_range(args.start, args.end)
    
    # 合并文件
    if args.merge:
        downloader.merge_csv_files()


if __name__ == '__main__':
    main()
