"""
K线数据仓库
负责K线数据的持久化操作
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import func
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
    
    async def get_data_statistics(self) -> Dict[str, Any]:
        """获取数据统计信息"""
        try:
            with db_service.get_session() as session:
                # 获取基础统计信息
                total_symbols = session.query(func.count(func.distinct(KLineDB.code))).scalar() or 0
                total_records = session.query(func.count(KLineDB.id)).scalar() or 0
                
                # 获取所有时间周期
                timeframes_result = session.query(func.distinct(KLineDB.period)).all()
                timeframes = [row[0] for row in timeframes_result]
                
                # 获取所有股票代码
                symbols_result = session.query(func.distinct(KLineDB.code)).all()
                symbols = [row[0] for row in symbols_result]
                
                # 按时间周期统计数据量
                timeframe_counts = {}
                for period in timeframes:
                    count = session.query(func.count(KLineDB.id)).filter(KLineDB.period == period).scalar() or 0
                    timeframe_counts[period] = count
                
                # 获取最新更新时间
                latest_updates = {}
                for symbol in symbols:
                    for period in timeframes:
                        latest_time = session.query(func.max(KLineDB.created_at)).filter(
                            KLineDB.code == symbol,
                            KLineDB.period == period
                        ).scalar()
                        if latest_time:
                            key = f"{symbol}_{period}"
                            latest_updates[key] = latest_time.isoformat()
                
                stats = {
                    "total_symbols": total_symbols,
                    "total_records": total_records,
                    "timeframes": timeframes,
                    "symbols": symbols,
                    "data_by_timeframe": timeframe_counts,
                    "latest_updates": latest_updates
                }
                
                return stats
                
        except Exception as e:
            logger.error(f"获取K线数据统计失败: {e}")
            return {
                "total_symbols": 0,
                "total_records": 0,
                "timeframes": [],
                "symbols": [],
                "data_by_timeframe": {},
                "latest_updates": {}
            }

    async def get_last_datetime(self, symbol: str, timeframe: str) -> Optional[datetime]:
        """获取某股票某周期最新一条K线的时间（用于增量同步起点）"""
        try:
            period_map = {
                "1d": "K_DAY",
                "1h": "K_60M",
                "15m": "K_15M",
                "5m": "K_5M",
                "1m": "K_1M",
            }
            period = period_map.get(timeframe, timeframe)
            with db_service.get_session() as session:
                latest_time_key = session.query(func.max(KLineDB.time_key)).filter(
                    KLineDB.code == symbol,
                    KLineDB.period == period,
                ).scalar()
                if latest_time_key:
                    # time_key 格式为 '%Y-%m-%d %H:%M:%S'
                    return datetime.strptime(latest_time_key, "%Y-%m-%d %H:%M:%S")
                return None
        except Exception as e:
            logger.error(f"获取最新K线时间失败: {symbol} {timeframe}: {e}")
            return None
