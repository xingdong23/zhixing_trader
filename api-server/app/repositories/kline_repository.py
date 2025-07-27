"""
K线数据仓库
负责K线数据的持久化操作
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.exc import SQLAlchemyError
from loguru import logger

from ..core.interfaces import IKLineRepository
from ..models import KLineDB
from ..database import db_service


class KLineRepository(IKLineRepository):
    """K线数据仓库实现"""
    
    async def get_kline_data(self, symbol: str, timeframe: str, 
                           start_date: datetime, end_date: datetime) -> List[KLineDB]:
        """获取K线数据"""
        try:
            return db_service.get_kline_data(symbol, timeframe, start_date, end_date)
        except Exception as e:
            logger.error(f"获取K线数据失败: {e}")
            return []
    
    async def save_kline_data(self, kline_data: Dict[str, Any]) -> bool:
        """保存K线数据"""
        try:
            return db_service.save_kline_data(kline_data)
        except Exception as e:
            logger.error(f"保存K线数据失败: {e}")
            return False
    
    async def cleanup_old_data(self, cutoff_date: datetime) -> int:
        """清理过期数据"""
        try:
            return db_service.cleanup_old_kline_data(cutoff_date)
        except Exception as e:
            logger.error(f"清理过期数据失败: {e}")
            return 0
