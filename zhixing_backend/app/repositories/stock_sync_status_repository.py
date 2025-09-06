"""
股票同步状态仓库
负责管理股票同步状态的数据库操作
"""
import json
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import func, and_, or_
from loguru import logger

from ..models import StockSyncStatusDB, KLineDB
from ..database import db_service


class StockSyncStatusRepository:
    """股票同步状态仓库实现"""
    
    def __init__(self):
        self.db_service = db_service
    
    async def get_or_create_sync_status(self, stock_code: str, timeframe: str) -> StockSyncStatusDB:
        """获取或创建股票同步状态记录"""
        try:
            with self.db_service.get_session() as session:
                # 尝试获取现有记录
                status = session.query(StockSyncStatusDB).filter(
                    and_(
                        StockSyncStatusDB.stock_code == stock_code,
                        StockSyncStatusDB.timeframe == timeframe
                    )
                ).first()
                
                if status:
                    return status
                
                # 创建新记录
                target_start = self._get_target_start_date(timeframe)
                target_end = date.today()
                
                status = StockSyncStatusDB(
                    stock_code=stock_code,
                    timeframe=timeframe,
                    target_start_date=target_start,
                    target_end_date=target_end,
                    sync_status='pending'
                )
                
                session.add(status)
                session.commit()
                session.refresh(status)
                
                logger.info(f"创建新的同步状态记录: {stock_code} {timeframe}")
                return status
                
        except Exception as e:
            logger.error(f"获取或创建同步状态失败: {stock_code} {timeframe}: {e}")
            raise
    
    async def update_boundary_info(self, stock_code: str, timeframe: str) -> bool:
        """更新边界信息（从klines表查询最早和最新数据时间）"""
        try:
            with self.db_service.get_session() as session:
                # 获取时间周期映射
                period_map = {
                    "1d": "K_DAY",
                    "1h": "K_60M",
                    "15m": "K_15M",
                    "5m": "K_5M",
                    "1m": "K_1M"
                }
                period = period_map.get(timeframe, "K_DAY")
                
                # 查询边界信息
                boundary_query = session.query(
                    func.min(KLineDB.time_key).label('earliest'),
                    func.max(KLineDB.time_key).label('latest'),
                    func.count(KLineDB.id).label('total_count')
                ).filter(
                    and_(
                        KLineDB.code == stock_code,
                        KLineDB.period == period
                    )
                ).first()
                
                earliest_str = boundary_query.earliest
                latest_str = boundary_query.latest
                total_count = boundary_query.total_count or 0
                
                # 转换为日期
                earliest_date = None
                latest_date = None
                
                if earliest_str:
                    earliest_date = datetime.strptime(earliest_str, "%Y-%m-%d %H:%M:%S").date()
                if latest_str:
                    latest_date = datetime.strptime(latest_str, "%Y-%m-%d %H:%M:%S").date()
                
                # 更新同步状态记录
                status = await self.get_or_create_sync_status(stock_code, timeframe)
                
                session.query(StockSyncStatusDB).filter(
                    and_(
                        StockSyncStatusDB.stock_code == stock_code,
                        StockSyncStatusDB.timeframe == timeframe
                    )
                ).update({
                    'earliest_data_date': earliest_date,
                    'latest_data_date': latest_date,
                    'total_records': total_count,
                    'updated_at': datetime.utcnow()
                })
                
                session.commit()
                
                logger.debug(f"更新边界信息: {stock_code} {timeframe} - "
                           f"最早: {earliest_date}, 最新: {latest_date}, 总数: {total_count}")
                return True
                
        except Exception as e:
            logger.error(f"更新边界信息失败: {stock_code} {timeframe}: {e}")
            return False
    
    async def get_sync_status(self, stock_code: str, timeframe: str) -> Optional[StockSyncStatusDB]:
        """获取同步状态"""
        try:
            with self.db_service.get_session() as session:
                return session.query(StockSyncStatusDB).filter(
                    and_(
                        StockSyncStatusDB.stock_code == stock_code,
                        StockSyncStatusDB.timeframe == timeframe
                    )
                ).first()
        except Exception as e:
            logger.error(f"获取同步状态失败: {stock_code} {timeframe}: {e}")
            return None
    
    async def update_sync_status(
        self, 
        stock_code: str, 
        timeframe: str,
        status: str = None,
        failed_ranges: List[Dict] = None,
        error_message: str = None,
        increment_retry: bool = False
    ) -> bool:
        """更新同步状态"""
        try:
            with self.db_service.get_session() as session:
                update_data = {
                    'updated_at': datetime.utcnow()
                }
                
                if status:
                    update_data['sync_status'] = status
                    update_data['last_sync_time'] = datetime.utcnow()
                    
                    if status == 'completed':
                        update_data['last_successful_sync'] = datetime.utcnow()
                        update_data['failed_ranges'] = None  # 清除失败记录
                        update_data['retry_count'] = 0
                
                if failed_ranges is not None:
                    update_data['failed_ranges'] = json.dumps(failed_ranges) if failed_ranges else None
                
                if error_message:
                    update_data['last_error'] = error_message
                
                if increment_retry:
                    # 获取当前重试次数并加1
                    current_status = session.query(StockSyncStatusDB).filter(
                        and_(
                            StockSyncStatusDB.stock_code == stock_code,
                            StockSyncStatusDB.timeframe == timeframe
                        )
                    ).first()
                    
                    current_retry = current_status.retry_count if current_status else 0
                    update_data['retry_count'] = current_retry + 1
                
                # 执行更新
                updated_rows = session.query(StockSyncStatusDB).filter(
                    and_(
                        StockSyncStatusDB.stock_code == stock_code,
                        StockSyncStatusDB.timeframe == timeframe
                    )
                ).update(update_data)
                
                session.commit()
                
                if updated_rows == 0:
                    logger.warning(f"未找到要更新的同步状态记录: {stock_code} {timeframe}")
                    return False
                
                return True
                
        except Exception as e:
            logger.error(f"更新同步状态失败: {stock_code} {timeframe}: {e}")
            return False
    
    async def get_stocks_needing_sync(self) -> List[Tuple[str, str]]:
        """获取需要同步的股票列表（股票代码，时间周期）"""
        try:
            with self.db_service.get_session() as session:
                today = date.today()
                
                # 查询需要同步的记录
                query = session.query(
                    StockSyncStatusDB.stock_code,
                    StockSyncStatusDB.timeframe
                ).filter(
                    or_(
                        # 从未同步过
                        StockSyncStatusDB.sync_status == 'pending',
                        # 有失败的范围
                        StockSyncStatusDB.failed_ranges.isnot(None),
                        # 最新数据不是今天
                        StockSyncStatusDB.latest_data_date < today,
                        # 历史数据不完整
                        StockSyncStatusDB.earliest_data_date > StockSyncStatusDB.target_start_date
                    )
                )
                
                results = query.all()
                return [(row.stock_code, row.timeframe) for row in results]
                
        except Exception as e:
            logger.error(f"获取需要同步的股票列表失败: {e}")
            return []
    
    async def get_all_sync_status(self) -> List[Dict[str, Any]]:
        """获取所有股票的同步状态概览"""
        try:
            with self.db_service.get_session() as session:
                statuses = session.query(StockSyncStatusDB).all()
                
                result = []
                for status in statuses:
                    failed_ranges = []
                    if status.failed_ranges:
                        try:
                            failed_ranges = json.loads(status.failed_ranges)
                        except:
                            pass
                    
                    result.append({
                        'stock_code': status.stock_code,
                        'timeframe': status.timeframe,
                        'sync_status': status.sync_status,
                        'earliest_data_date': status.earliest_data_date.isoformat() if status.earliest_data_date else None,
                        'latest_data_date': status.latest_data_date.isoformat() if status.latest_data_date else None,
                        'target_start_date': status.target_start_date.isoformat() if status.target_start_date else None,
                        'target_end_date': status.target_end_date.isoformat() if status.target_end_date else None,
                        'total_records': status.total_records,
                        'expected_records': status.expected_records,
                        'last_sync_time': status.last_sync_time.isoformat() if status.last_sync_time else None,
                        'last_successful_sync': status.last_successful_sync.isoformat() if status.last_successful_sync else None,
                        'failed_ranges': failed_ranges,
                        'retry_count': status.retry_count,
                        'last_error': status.last_error
                    })
                
                return result
                
        except Exception as e:
            logger.error(f"获取同步状态概览失败: {e}")
            return []
    
    def _get_target_start_date(self, timeframe: str) -> date:
        """根据时间周期计算目标开始日期"""
        today = date.today()
        
        if timeframe == "1d":
            # 日线数据：获取1年前的数据
            return today - timedelta(days=365)
        elif timeframe == "1h":
            # 小时线数据：获取60天前的数据
            return today - timedelta(days=60)
        else:
            # 其他周期：默认30天
            return today - timedelta(days=30)
    
    async def initialize_all_stocks(self, stock_codes: List[str]) -> bool:
        """为所有股票初始化同步状态记录"""
        try:
            for stock_code in stock_codes:
                for timeframe in ['1d', '1h']:
                    await self.get_or_create_sync_status(stock_code, timeframe)
                    await self.update_boundary_info(stock_code, timeframe)
            
            logger.info(f"为 {len(stock_codes)} 只股票初始化同步状态完成")
            return True
            
        except Exception as e:
            logger.error(f"初始化同步状态失败: {e}")
            return False
