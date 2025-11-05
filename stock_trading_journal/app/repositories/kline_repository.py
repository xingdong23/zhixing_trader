"""
K线数据仓库
负责K线数据的持久化操作
"""
from typing import List, Optional, Dict, Any, TYPE_CHECKING

if TYPE_CHECKING:
    from ..core.interfaces import KLineData
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

    async def get_latest_price_data(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        获取多只股票的最新价格数据（从日线K线数据）
        
        Args:
            symbols: 股票代码列表
            
        Returns:
            Dict[symbol, {price: float, change_percent: float, last_update: str}]
        """
        try:
            result = {}
            with db_service.get_session() as session:
                for symbol in symbols:
                    # 获取最近两个交易日的K线数据（去重）
                    subquery = (session.query(KLineDB.time_key, 
                                             func.max(KLineDB.close_price).label('close_price'))
                              .filter(
                                  KLineDB.code == symbol,
                                  KLineDB.period == "K_DAY"
                              )
                              .group_by(KLineDB.time_key)
                              .order_by(KLineDB.time_key.desc())
                              .limit(2)
                              .subquery())
                    
                    latest_klines = (session.query(subquery.c.time_key, subquery.c.close_price)
                                   .order_by(subquery.c.time_key.desc())
                                   .all())
                    
                    if latest_klines:
                        current = latest_klines[0]
                        current_price = current.close_price
                        last_update = current.time_key
                        
                        # 计算涨跌幅
                        change_percent = None
                        if len(latest_klines) >= 2:
                            previous = latest_klines[1]
                            prev_price = previous.close_price
                            if prev_price and prev_price > 0:
                                change_percent = ((current_price - prev_price) / prev_price) * 100
                        
                        result[symbol] = {
                            "price": current_price,
                            "change_percent": change_percent,
                            "last_update": str(last_update)
                        }
            
            return result
            
        except Exception as e:
            logger.error(f"获取最新价格数据失败: {e}")
            return {}

    async def get_single_latest_price_data(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        获取单只股票的最新价格数据（从日线K线数据）
        
        Args:
            symbol: 股票代码
            
        Returns:
            {price: float, change_percent: float, last_update: str} 或 None
        """
        try:
            result = await self.get_latest_price_data([symbol])
            return result.get(symbol)
        except Exception as e:
            logger.error(f"获取股票 {symbol} 最新价格数据失败: {e}")
            return None

    async def has_sufficient_data(self, symbol: str, min_daily_records: int = 100, min_hourly_records: int = 100) -> bool:
        """
        检查股票是否有足够的K线数据用于策略分析
        
        Args:
            symbol: 股票代码
            min_daily_records: 最少日线记录数
            min_hourly_records: 最少小时线记录数
            
        Returns:
            bool: 是否有足够数据
        """
        try:
            with db_service.get_session() as session:
                # 检查日线数据
                daily_count = session.query(func.count(KLineDB.id)).filter(
                    KLineDB.code == symbol,
                    KLineDB.period == "K_DAY"
                ).scalar() or 0
                
                # 检查小时线数据
                hourly_count = session.query(func.count(KLineDB.id)).filter(
                    KLineDB.code == symbol,
                    KLineDB.period == "K_60M"
                ).scalar() or 0
                
                has_enough = daily_count >= min_daily_records and hourly_count >= min_hourly_records
                
                if not has_enough:
                    logger.debug(f"股票 {symbol} 数据不足: 日线 {daily_count}/{min_daily_records}, 小时线 {hourly_count}/{min_hourly_records}")
                
                return has_enough
                
        except Exception as e:
            logger.error(f"检查股票 {symbol} 数据充足性失败: {e}")
            return False

    async def get_stocks_with_sufficient_data(self, symbols: List[str], min_daily_records: int = 100, min_hourly_records: int = 100) -> List[str]:
        """
        批量检查股票数据充足性，返回有足够数据的股票列表
        
        Args:
            symbols: 股票代码列表
            min_daily_records: 最少日线记录数
            min_hourly_records: 最少小时线记录数
            
        Returns:
            List[str]: 有足够数据的股票代码列表
        """
        try:
            sufficient_symbols = []
            with db_service.get_session() as session:
                for symbol in symbols:
                    # 检查日线数据
                    daily_count = session.query(func.count(KLineDB.id)).filter(
                        KLineDB.code == symbol,
                        KLineDB.period == "K_DAY"
                    ).scalar() or 0
                    
                    # 检查小时线数据
                    hourly_count = session.query(func.count(KLineDB.id)).filter(
                        KLineDB.code == symbol,
                        KLineDB.period == "K_60M"
                    ).scalar() or 0
                    
                    if daily_count >= min_daily_records and hourly_count >= min_hourly_records:
                        sufficient_symbols.append(symbol)
                    else:
                        logger.debug(f"跳过数据不足的股票 {symbol}: 日线 {daily_count}/{min_daily_records}, 小时线 {hourly_count}/{min_hourly_records}")
            
            logger.info(f"在 {len(symbols)} 只股票中，{len(sufficient_symbols)} 只有足够数据用于策略分析")
            return sufficient_symbols
            
        except Exception as e:
            logger.error(f"批量检查股票数据充足性失败: {e}")
            return []

    async def get_kline_data_from_db(self, symbol: str, period: str, limit: int = 1000) -> List['KLineData']:
        """
        从数据库获取K线数据，转换为策略所需格式
        
        Args:
            symbol: 股票代码
            period: 周期 ("K_DAY" 或 "K_60M")
            limit: 获取记录数限制
            
        Returns:
            List[KLineData]: K线数据列表，按时间正序
        """
        try:
            from ..core.interfaces import KLineData
            
            with db_service.get_session() as session:
                klines = session.query(KLineDB).filter(
                    KLineDB.code == symbol,
                    KLineDB.period == period
                ).order_by(KLineDB.time_key.desc()).limit(limit).all()
                
                # 转换为策略所需的KLineData格式
                result = []
                for kline in reversed(klines):  # 转为正序（时间从早到晚）
                    kline_data = KLineData(
                        datetime=datetime.strptime(kline.time_key, "%Y-%m-%d %H:%M:%S"),
                        open=kline.open_price,
                        high=kline.high_price,
                        low=kline.low_price,
                        close=kline.close_price,
                        volume=kline.volume or 0,
                        symbol=symbol
                    )
                    result.append(kline_data)
                
                return result
                
        except Exception as e:
            logger.error(f"从数据库获取K线数据失败 {symbol} {period}: {e}")
            return []
