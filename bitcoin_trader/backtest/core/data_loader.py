"""
数据加载器 - 优雅地处理历史数据
"""

import pandas as pd
import numpy as np
from datetime import datetime
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)


class DataLoader:
    """历史数据加载器"""
    
    def __init__(self, csv_path: str):
        """
        初始化数据加载器
        
        Args:
            csv_path: CSV文件路径
        """
        self.csv_path = csv_path
        self.df = None
        
    def load(self) -> pd.DataFrame:
        """加载CSV数据"""
        logger.info(f"加载数据: {self.csv_path}")
        
        self.df = pd.read_csv(self.csv_path)
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
