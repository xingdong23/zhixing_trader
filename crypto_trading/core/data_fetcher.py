"""
数据获取器 - 获取和缓存历史数据
"""
import pandas as pd
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional

from .exchange import ExchangeClient

logger = logging.getLogger(__name__)


class DataFetcher:
    """
    数据获取器
    负责获取历史数据并缓存到本地
    """
    
    def __init__(self, exchange: ExchangeClient, data_dir: Path):
        """
        Args:
            exchange: 交易所客户端
            data_dir: 数据存储目录
        """
        self.exchange = exchange
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
    
    def fetch_historical(
        self,
        symbol: str,
        timeframe: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 1000
    ) -> pd.DataFrame:
        """
        获取历史 K 线数据
        
        Args:
            symbol: 交易对
            timeframe: 时间周期
            start_date: 开始日期 (YYYY-MM-DD)
            end_date: 结束日期 (YYYY-MM-DD)
            limit: 每次请求数量
            
        Returns:
            DataFrame with OHLCV data
        """
        # 简单实现：直接从交易所获取
        # TODO: 支持分页获取更长时间的数据
        df = self.exchange.fetch_ohlcv(symbol, timeframe, limit)
        
        if start_date:
            df = df[df['date'] >= pd.to_datetime(start_date)]
        if end_date:
            df = df[df['date'] <= pd.to_datetime(end_date)]
        
        return df
    
    def save_to_csv(self, df: pd.DataFrame, filename: str) -> Path:
        """保存数据到 CSV"""
        filepath = self.data_dir / filename
        df.to_csv(filepath, index=False)
        logger.info(f"Data saved to {filepath}")
        return filepath
    
    def load_from_csv(self, filename: str) -> Optional[pd.DataFrame]:
        """从 CSV 加载数据"""
        filepath = self.data_dir / filename
        if filepath.exists():
            df = pd.read_csv(filepath)
            df['date'] = pd.to_datetime(df['date'])
            return df
        return None
