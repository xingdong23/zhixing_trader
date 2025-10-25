"""
数据加载器 - 优雅地处理历史数据
"""

import pandas as pd
import numpy as np
from datetime import datetime
from typing import List, Dict, Union
from pathlib import Path
import logging
import glob

logger = logging.getLogger(__name__)


class DataLoader:
    """历史数据加载器"""
    
    def __init__(self, csv_path: Union[str, List[str]]):
        """
        初始化数据加载器
        
        Args:
            csv_path: CSV文件路径或路径列表，支持：
                     - 单个文件: "data/ETH-USDT-1m-2025.10.23.csv"
                     - 多个文件: ["file1.csv", "file2.csv"]
                     - 目录: "data/" (加载目录下所有CSV)
                     - 通配符: "data/ETH-USDT-*.csv"
        """
        self.csv_path = csv_path
        self.df = None
        
    def _get_file_list(self) -> List[str]:
        """获取要加载的文件列表"""
        if isinstance(self.csv_path, list):
            # 已经是列表
            return self.csv_path
        
        path_str = str(self.csv_path)
        
        # 检查是否是目录
        if Path(path_str).is_dir():
            # 加载目录下所有CSV文件
            files = list(Path(path_str).glob('*.csv'))
            return [str(f) for f in sorted(files)]
        
        # 检查是否包含通配符
        if '*' in path_str or '?' in path_str:
            # 使用glob匹配
            files = glob.glob(path_str)
            return sorted(files)
        
        # 单个文件
        return [path_str]
    
    def load(self) -> pd.DataFrame:
        """
        加载CSV数据，支持多文件自动合并
        
        Returns:
            合并后的DataFrame，按时间排序
        """
        file_list = self._get_file_list()
        
        if not file_list:
            raise FileNotFoundError(f"未找到匹配的文件: {self.csv_path}")
        
        logger.info(f"找到 {len(file_list)} 个数据文件")
        
        # 加载所有文件
        dfs = []
        for file_path in file_list:
            logger.info(f"  加载: {Path(file_path).name}")
            df = pd.read_csv(file_path)
            dfs.append(df)
        
        # 合并所有DataFrame
        if len(dfs) == 1:
            self.df = dfs[0]
        else:
            logger.info("合并多个文件...")
            self.df = pd.concat(dfs, ignore_index=True)
            
            # 按时间排序
            if 'open_time' in self.df.columns:
                self.df = self.df.sort_values('open_time').reset_index(drop=True)
                logger.info("✓ 已按时间排序")
            
            # 去重（如果有重复的时间戳）
            if 'open_time' in self.df.columns:
                before_count = len(self.df)
                self.df = self.df.drop_duplicates(subset=['open_time'], keep='first')
                after_count = len(self.df)
                if before_count != after_count:
                    logger.info(f"✓ 去除 {before_count - after_count} 条重复数据")
        
        logger.info(f"✓ 加载完成: {len(self.df)} 条数据")
        
        return self.df
    
    def resample_to_5m(self) -> pd.DataFrame:
        """
        将1分钟数据重采样为5分钟数据
        
        Returns:
            5分钟K线DataFrame
        """
        if self.df is None:
            self.load()
        
        logger.info("重采样为5分钟K线...")
        
        # 转换时间戳
        self.df['timestamp'] = pd.to_datetime(self.df['open_time'], unit='ms')
        self.df.set_index('timestamp', inplace=True)
        
        # 重采样规则
        resampled = self.df.resample('5T').agg({
            'open': 'first',
            'high': 'max',
            'low': 'min',
            'close': 'last',
            'vol': 'sum',
        }).dropna()
        
        logger.info(f"✓ 重采样完成: {len(resampled)} 根5分钟K线")
        
        return resampled
    
    def to_klines(self, df: pd.DataFrame = None) -> List[Dict]:
        """
        转换为策略所需的K线格式
        
        Args:
            df: DataFrame，如果为None则使用内部df
            
        Returns:
            K线字典列表
        """
        if df is None:
            df = self.df
        
        klines = []
        for idx, row in df.iterrows():
            klines.append({
                'timestamp': idx if isinstance(idx, datetime) else datetime.fromtimestamp(row['open_time'] / 1000),
                'open': float(row['open']),
                'high': float(row['high']),
                'low': float(row['low']),
                'close': float(row['close']),
                'volume': float(row['vol']) if 'vol' in row else float(row.get('volume', 0)),
            })
        
        return klines
    
    def get_date_range(self) -> tuple:
        """获取数据的日期范围"""
        if self.df is None:
            self.load()
        
        start = pd.to_datetime(self.df['open_time'].min(), unit='ms')
        end = pd.to_datetime(self.df['open_time'].max(), unit='ms')
        
        return start, end
