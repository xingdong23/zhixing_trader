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
            # 尝试自动检测是否有列名
            df = pd.read_csv(file_path)
            # 如果第一列是 'open_time' 字符串，说明有列名，已经正确读取
            # 如果第一列是数字，说明没有列名，需要手动添加
            if df.columns[0] != 'open_time':
                # 没有列名，使用默认列名
                df.columns = [
                    'open_time', 'open', 'high', 'low', 'close', 'vol',
                    'close_time', 'quote_vol', 'count', 'taker_buy_vol',
                    'taker_buy_quote_vol', 'ignore'
                ]
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
        
        # 确保数值列是正确的类型
        numeric_columns = ['open_time', 'open', 'high', 'low', 'close', 'vol', 
                          'close_time', 'quote_vol', 'count', 'taker_buy_vol', 
                          'taker_buy_quote_vol']
        for col in numeric_columns:
            if col in self.df.columns:
                self.df[col] = pd.to_numeric(self.df[col], errors='coerce')
        
        # 删除包含NaN的行（通常是列名行）
        before_count = len(self.df)
        self.df = self.df.dropna()
        after_count = len(self.df)
        if before_count != after_count:
            logger.info(f"✓ 去除 {before_count - after_count} 条无效数据")
        
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
    
    def resample_to_30m(self) -> pd.DataFrame:
        """
        将5分钟数据重采样为30分钟数据
        
        Returns:
            30分钟K线DataFrame
        """
        if self.df is None:
            self.load()
        
        logger.info("重采样为30分钟K线...")
        
        # 转换时间戳
        self.df['timestamp'] = pd.to_datetime(self.df['open_time'], unit='ms')
        self.df.set_index('timestamp', inplace=True)
        
        # 确定volume列名
        vol_col = 'volume' if 'volume' in self.df.columns else 'vol'
        
        # 重采样规则
        agg_dict = {
            'open': 'first',
            'high': 'max',
            'low': 'min',
            'close': 'last',
        }
        if vol_col in self.df.columns:
            agg_dict[vol_col] = 'sum'
        
        resampled = self.df.resample('30min').agg(agg_dict).dropna()
        
        logger.info(f"✓ 重采样完成: {len(resampled)} 根30分钟K线")
        
        return resampled
    
    def resample_to_1h(self) -> pd.DataFrame:
        """
        将5分钟数据重采样为1小时数据
        
        Returns:
            1小时K线DataFrame
        """
        if self.df is None:
            self.load()
        
        logger.info("重采样为1小时K线...")
        
        # 转换时间戳
        self.df['timestamp'] = pd.to_datetime(self.df['open_time'], unit='ms')
        self.df.set_index('timestamp', inplace=True)
        
        # 确定volume列名
        vol_col = 'volume' if 'volume' in self.df.columns else 'vol'
        
        # 重采样规则
        agg_dict = {
            'open': 'first',
            'high': 'max',
            'low': 'min',
            'close': 'last',
        }
        if vol_col in self.df.columns:
            agg_dict[vol_col] = 'sum'
        
        resampled = self.df.resample('1h').agg(agg_dict).dropna()
        
        logger.info(f"✓ 重采样完成: {len(resampled)} 根1小时K线")
        
        return resampled
    
    def resample_to_15m(self) -> pd.DataFrame:
        """
        将5分钟数据重采样为15分钟数据
        
        Returns:
            15分钟K线DataFrame
        """
        if self.df is None:
            self.load()
        
        logger.info("重采样为15分钟K线...")
        
        # 转换时间戳
        self.df['timestamp'] = pd.to_datetime(self.df['open_time'], unit='ms')
        self.df.set_index('timestamp', inplace=True)
        
        # 确定volume列名
        vol_col = 'volume' if 'volume' in self.df.columns else 'vol'
        
        # 重采样规则
        agg_dict = {
            'open': 'first',
            'high': 'max',
            'low': 'min',
            'close': 'last',
        }
        if vol_col in self.df.columns:
            agg_dict[vol_col] = 'sum'
        
        resampled = self.df.resample('15min').agg(agg_dict).dropna()
        
        logger.info(f"✓ 重采样完成: {len(resampled)} 根15分钟K线")
        
        return resampled
    
    def resample_to_4h(self) -> pd.DataFrame:
        """
        将5分钟数据重采样为4小时数据
        
        Returns:
            4小时K线DataFrame
        """
        if self.df is None:
            self.load()
        
        logger.info("重采样为4小时K线...")
        
        # 转换时间戳
        self.df['timestamp'] = pd.to_datetime(self.df['open_time'], unit='ms')
        self.df.set_index('timestamp', inplace=True)
        
        # 确定volume列名
        vol_col = 'volume' if 'volume' in self.df.columns else 'vol'
        
        # 重采样规则
        agg_dict = {
            'open': 'first',
            'high': 'max',
            'low': 'min',
            'close': 'last',
        }
        if vol_col in self.df.columns:
            agg_dict[vol_col] = 'sum'
        
        resampled = self.df.resample('4h').agg(agg_dict).dropna()
        
        logger.info(f"✓ 重采样完成: {len(resampled)} 根4小时K线")
        
        return resampled
    
    def resample_to_1d(self) -> pd.DataFrame:
        """
        将小时数据重采样为1天数据
        
        Returns:
            1天K线DataFrame
        """
        if self.df is None:
            self.load()
        
        logger.info("重采样为1天K线...")
        
        # 转换时间戳
        self.df['timestamp'] = pd.to_datetime(self.df['open_time'], unit='ms')
        self.df.set_index('timestamp', inplace=True)
        
        # 确定volume列名
        vol_col = 'volume' if 'volume' in self.df.columns else 'vol'
        
        # 重采样规则
        agg_dict = {
            'open': 'first',
            'high': 'max',
            'low': 'min',
            'close': 'last',
        }
        if vol_col in self.df.columns:
            agg_dict[vol_col] = 'sum'
        
        resampled = self.df.resample('1D').agg(agg_dict).dropna()
        
        logger.info(f"✓ 重采样完成: {len(resampled)} 根1天K线")
        
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
