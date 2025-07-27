"""
数据库服务模块
"""
import os
from typing import List, Optional
from sqlalchemy import create_engine, and_
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError
from loguru import logger

from .config import settings
from .models import (
    Base, StockDB, QuoteDB, KLineDB, StrategyDB, SelectionResultDB,
    ConceptDB, ConceptStockRelationDB, ExpertDB, ExpertOpinionDB,
    TradingPlaybookDB, SelectionStrategyDB, StockInfo, QuoteData
)


class DatabaseService:
    """数据库服务类"""
    
    def __init__(self):
        self.engine = None
        self.SessionLocal = None
        self.init_database()
    
    def init_database(self):
        """初始化数据库"""
        try:
            # 确保数据目录存在
            db_path = settings.database_url.replace("sqlite:///", "")
            os.makedirs(os.path.dirname(db_path), exist_ok=True)
            
            # 创建数据库引擎
            self.engine = create_engine(
                settings.database_url,
                connect_args={"check_same_thread": False}  # SQLite特定配置
            )
            
            # 创建会话工厂
            self.SessionLocal = sessionmaker(
                autocommit=False, 
                autoflush=False, 
                bind=self.engine
            )
            
            # 创建所有表
            Base.metadata.create_all(bind=self.engine)
            
            logger.info(f"Database initialized: {settings.database_url}")
            
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
            raise
    
    def get_session(self) -> Session:
        """获取数据库会话"""
        return self.SessionLocal()

    def create_tables(self):
        """创建所有数据库表"""
        try:
            Base.metadata.create_all(bind=self.engine)
            logger.info("All database tables created successfully")
        except Exception as e:
            logger.error(f"Failed to create database tables: {e}")
            raise
    
    # ==================== 股票信息操作 ====================
    
    def add_stock(self, stock_data: dict) -> Optional[int]:
        """添加股票"""
        try:
            import json
            with self.get_session() as session:
                # 检查是否已存在
                existing = session.query(StockDB).filter(
                    StockDB.code == stock_data.get('code')
                ).first()

                if existing:
                    logger.warning(f"Stock {stock_data.get('code')} already exists")
                    return existing.id

                # 创建新股票记录
                stock = StockDB(
                    code=stock_data.get('code'),
                    name=stock_data.get('name'),
                    market=stock_data.get('market', 'US'),
                    group_id=stock_data.get('group_id'),
                    group_name=stock_data.get('group_name'),
                    lot_size=stock_data.get('lot_size', 100),
                    sec_type=stock_data.get('sec_type', 'STOCK'),
                    # 处理标签数据
                    industry_tags=json.dumps(stock_data.get('industry_tags', [])) if stock_data.get('industry_tags') else None,
                    fundamental_tags=json.dumps(stock_data.get('fundamental_tags', [])) if stock_data.get('fundamental_tags') else None,
                    market_cap=stock_data.get('market_cap'),
                    watch_level=stock_data.get('watch_level'),
                    concept_ids=json.dumps(stock_data.get('concept_ids', [])) if stock_data.get('concept_ids') else None,
                    notes=stock_data.get('notes')
                )

                session.add(stock)
                session.commit()
                session.refresh(stock)

                logger.info(f"Added stock: {stock.code} - {stock.name}")
                return stock.id

        except SQLAlchemyError as e:
            logger.error(f"Failed to add stock: {e}")
            return None

    def upsert_stock(self, stock_info: StockInfo, group_id: str = None, group_name: str = None) -> bool:
        """插入或更新股票信息"""
        try:
            with self.get_session() as session:
                # 查找现有记录
                existing = session.query(StockDB).filter(StockDB.code == stock_info.code).first()

                if existing:
                    # 更新现有记录
                    existing.name = stock_info.name
                    existing.market = stock_info.market
                    existing.group_id = group_id
                    existing.group_name = group_name
                    existing.lot_size = stock_info.lot_size
                    existing.sec_type = stock_info.sec_type
                    existing.is_active = True
                else:
                    # 创建新记录
                    new_stock = StockDB(
                        code=stock_info.code,
                        name=stock_info.name,
                        market=stock_info.market,
                        group_id=group_id,
                        group_name=group_name,
                        lot_size=stock_info.lot_size,
                        sec_type=stock_info.sec_type,
                        is_active=True
                    )
                    session.add(new_stock)

                session.commit()
                return True

        except SQLAlchemyError as e:
            logger.error(f"Failed to upsert stock {stock_info.code}: {e}")
            return False
    
    def upsert_stocks_batch(self, stocks_data: List[tuple]) -> bool:
        """批量插入或更新股票信息"""
        try:
            with self.get_session() as session:
                for stock_info, group_id, group_name in stocks_data:
                    # 查找现有记录
                    existing = session.query(StockDB).filter(StockDB.code == stock_info.code).first()
                    
                    if existing:
                        # 更新现有记录
                        existing.name = stock_info.name
                        existing.market = stock_info.market
                        existing.group_id = group_id
                        existing.group_name = group_name
                        existing.lot_size = stock_info.lot_size
                        existing.sec_type = stock_info.sec_type
                        existing.is_active = True
                    else:
                        # 创建新记录
                        new_stock = StockDB(
                            code=stock_info.code,
                            name=stock_info.name,
                            market=stock_info.market,
                            group_id=group_id,
                            group_name=group_name,
                            lot_size=stock_info.lot_size,
                            sec_type=stock_info.sec_type,
                            is_active=True
                        )
                        session.add(new_stock)
                
                session.commit()
                logger.info(f"Batch upserted {len(stocks_data)} stocks")
                return True
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to batch upsert stocks: {e}")
            return False
    
    def get_all_stocks(self) -> List[StockDB]:
        """获取所有活跃股票"""
        try:
            with self.get_session() as session:
                return session.query(StockDB).filter(StockDB.is_active == True).all()
        except SQLAlchemyError as e:
            logger.error(f"Failed to get all stocks: {e}")
            return []
    
    def get_stocks_by_group(self, group_id: str) -> List[StockDB]:
        """根据分组获取股票"""
        try:
            with self.get_session() as session:
                return session.query(StockDB).filter(
                    and_(StockDB.group_id == group_id, StockDB.is_active == True)
                ).all()
        except SQLAlchemyError as e:
            logger.error(f"Failed to get stocks by group {group_id}: {e}")
            return []
    
    def get_stock_by_code(self, code: str) -> Optional[StockDB]:
        """根据代码获取股票"""
        try:
            with self.get_session() as session:
                return session.query(StockDB).filter(
                    and_(StockDB.code == code, StockDB.is_active == True)
                ).first()
        except SQLAlchemyError as e:
            logger.error(f"Failed to get stock {code}: {e}")
            return None
    
    # ==================== 行情数据操作 ====================
    
    def save_quote(self, quote_data: QuoteData) -> bool:
        """保存行情数据"""
        try:
            with self.get_session() as session:
                quote_record = QuoteDB(
                    code=quote_data.code,
                    cur_price=quote_data.cur_price,
                    prev_close_price=quote_data.prev_close_price,
                    open_price=quote_data.open_price,
                    high_price=quote_data.high_price,
                    low_price=quote_data.low_price,
                    volume=quote_data.volume,
                    turnover=quote_data.turnover,
                    change_val=quote_data.change_val,
                    change_rate=quote_data.change_rate,
                    amplitude=quote_data.amplitude,
                    update_time=quote_data.update_time
                )
                session.add(quote_record)
                session.commit()
                return True
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to save quote for {quote_data.code}: {e}")
            return False
    
    def get_latest_quotes(self, codes: Optional[List[str]] = None) -> List[QuoteDB]:
        """获取最新行情数据"""
        try:
            with self.get_session() as session:
                # 构建子查询获取每个股票的最新记录
                subquery = session.query(
                    QuoteDB.code,
                    session.query(QuoteDB.id).filter(
                        QuoteDB.code == QuoteDB.code
                    ).order_by(QuoteDB.created_at.desc()).limit(1).label('latest_id')
                ).subquery()
                
                query = session.query(QuoteDB).join(
                    subquery, QuoteDB.id == subquery.c.latest_id
                )
                
                if codes:
                    query = query.filter(QuoteDB.code.in_(codes))
                
                return query.all()
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to get latest quotes: {e}")
            return []
    
    def cleanup_old_quotes(self, days_to_keep: int = 7) -> int:
        """清理旧的行情数据"""
        try:
            from datetime import datetime, timedelta
            
            cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
            
            with self.get_session() as session:
                deleted_count = session.query(QuoteDB).filter(
                    QuoteDB.created_at < cutoff_date
                ).delete()
                session.commit()
                
                logger.info(f"Cleaned up {deleted_count} old quote records")
                return deleted_count
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to cleanup old quotes: {e}")
            return 0
    
    # ==================== 统计信息 ====================
    
    def get_stats(self) -> dict:
        """获取数据库统计信息"""
        try:
            with self.get_session() as session:
                stats = {
                    "stocks": session.query(StockDB).filter(StockDB.is_active == True).count(),
                    "quotes": session.query(QuoteDB).count(),
                    "klines": session.query(KLineDB).count(),
                }
                return stats
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to get database stats: {e}")
            return {"stocks": 0, "quotes": 0, "klines": 0}

    def get_kline_data(self, symbol: str, timeframe: str, start_date, end_date) -> List[KLineDB]:
        """获取K线数据"""
        try:
            with self.get_session() as session:
                # 将timeframe转换为period格式
                period_map = {
                    "1d": "K_DAY",
                    "1h": "K_60M",
                    "15m": "K_15M",
                    "5m": "K_5M",
                    "1m": "K_1M"
                }
                period = period_map.get(timeframe, "K_DAY")

                return (session.query(KLineDB)
                       .filter(
                           and_(
                               KLineDB.code == symbol,
                               KLineDB.period == period,
                               KLineDB.time_key >= start_date.strftime("%Y-%m-%d %H:%M:%S"),
                               KLineDB.time_key <= end_date.strftime("%Y-%m-%d %H:%M:%S")
                           )
                       )
                       .order_by(KLineDB.time_key.asc())
                       .all())

        except SQLAlchemyError as e:
            logger.error(f"Failed to get kline data for {symbol}: {e}")
            return []

    def save_kline_data(self, kline_data: dict) -> bool:
        """保存K线数据"""
        try:
            with self.get_session() as session:
                # 检查是否已存在
                existing = (session.query(KLineDB)
                          .filter(
                              and_(
                                  KLineDB.code == kline_data['symbol'],
                                  KLineDB.period == kline_data['timeframe'],
                                  KLineDB.time_key == kline_data['datetime'].strftime("%Y-%m-%d %H:%M:%S")
                              )
                          )
                          .first())

                if not existing:
                    # 转换数据格式
                    period_map = {
                        "1d": "K_DAY",
                        "1h": "K_60M",
                        "15m": "K_15M",
                        "5m": "K_5M",
                        "1m": "K_1M"
                    }

                    kline = KLineDB(
                        code=kline_data['symbol'],
                        period=period_map.get(kline_data['timeframe'], "K_DAY"),
                        time_key=kline_data['datetime'].strftime("%Y-%m-%d %H:%M:%S"),
                        open_price=kline_data['open'],
                        close_price=kline_data['close'],
                        high_price=kline_data['high'],
                        low_price=kline_data['low'],
                        volume=kline_data['volume']
                    )

                    session.add(kline)
                    session.commit()
                    return True

                return False  # 已存在

        except SQLAlchemyError as e:
            logger.error(f"Failed to save kline data: {e}")
            return False

    def cleanup_old_kline_data(self, cutoff_date) -> int:
        """清理过期K线数据"""
        try:
            with self.get_session() as session:
                deleted_count = (session.query(KLineDB)
                               .filter(KLineDB.time_key < cutoff_date.strftime("%Y-%m-%d %H:%M:%S"))
                               .delete())
                session.commit()
                logger.info(f"Cleaned up {deleted_count} old kline records")
                return deleted_count

        except SQLAlchemyError as e:
            logger.error(f"Failed to cleanup old kline data: {e}")
            return 0
    
    # ==================== 策略相关方法 ====================

    def create_strategy(self, strategy_data: dict) -> Optional[int]:
        """创建新策略"""
        try:
            with self.get_session() as session:
                strategy = StrategyDB(**strategy_data)
                session.add(strategy)
                session.commit()
                session.refresh(strategy)
                logger.info(f"Created strategy: {strategy.name}")
                return strategy.id

        except SQLAlchemyError as e:
            logger.error(f"Failed to create strategy: {e}")
            return None

    def get_strategy(self, strategy_id: int) -> Optional[StrategyDB]:
        """获取策略"""
        try:
            with self.get_session() as session:
                return session.query(StrategyDB).filter(StrategyDB.id == strategy_id).first()

        except SQLAlchemyError as e:
            logger.error(f"Failed to get strategy {strategy_id}: {e}")
            return None

    def get_all_strategies(self) -> List[StrategyDB]:
        """获取所有策略"""
        try:
            with self.get_session() as session:
                return session.query(StrategyDB).order_by(StrategyDB.created_at.desc()).all()

        except SQLAlchemyError as e:
            logger.error(f"Failed to get all strategies: {e}")
            return []

    def get_enabled_strategies(self) -> List[StrategyDB]:
        """获取所有启用的策略"""
        try:
            with self.get_session() as session:
                return session.query(StrategyDB).filter(StrategyDB.enabled == True).all()

        except SQLAlchemyError as e:
            logger.error(f"Failed to get enabled strategies: {e}")
            return []

    def update_strategy(self, strategy_id: int, strategy_data: dict) -> bool:
        """更新策略"""
        try:
            with self.get_session() as session:
                strategy = session.query(StrategyDB).filter(StrategyDB.id == strategy_id).first()
                if strategy:
                    for key, value in strategy_data.items():
                        if hasattr(strategy, key):
                            setattr(strategy, key, value)
                    session.commit()
                    logger.info(f"Updated strategy: {strategy_id}")
                    return True
                return False

        except SQLAlchemyError as e:
            logger.error(f"Failed to update strategy {strategy_id}: {e}")
            return False

    def update_strategy_execution(self, strategy_id: int, execution_time) -> bool:
        """更新策略执行记录"""
        try:
            with self.get_session() as session:
                strategy = session.query(StrategyDB).filter(StrategyDB.id == strategy_id).first()
                if strategy:
                    strategy.last_execution_time = execution_time
                    strategy.execution_count += 1
                    session.commit()
                    return True
                return False

        except SQLAlchemyError as e:
            logger.error(f"Failed to update strategy execution {strategy_id}: {e}")
            return False

    def delete_strategy(self, strategy_id: int) -> bool:
        """删除策略"""
        try:
            with self.get_session() as session:
                strategy = session.query(StrategyDB).filter(StrategyDB.id == strategy_id).first()
                if strategy and not strategy.is_system_default:
                    session.delete(strategy)
                    session.commit()
                    logger.info(f"Deleted strategy: {strategy_id}")
                    return True
                return False

        except SQLAlchemyError as e:
            logger.error(f"Failed to delete strategy {strategy_id}: {e}")
            return False

    # ==================== 选股结果相关方法 ====================

    def save_selection_result(self, result_data: dict) -> Optional[int]:
        """保存选股结果"""
        try:
            with self.get_session() as session:
                result = SelectionResultDB(**result_data)
                session.add(result)
                session.commit()
                session.refresh(result)
                return result.id

        except SQLAlchemyError as e:
            logger.error(f"Failed to save selection result: {e}")
            return None

    def get_strategy_results(self, strategy_id: int, limit: int = 20) -> List[SelectionResultDB]:
        """获取策略的执行结果"""
        try:
            with self.get_session() as session:
                return (session.query(SelectionResultDB)
                       .filter(SelectionResultDB.strategy_id == strategy_id)
                       .order_by(SelectionResultDB.execution_time.desc())
                       .limit(limit)
                       .all())

        except SQLAlchemyError as e:
            logger.error(f"Failed to get strategy results for {strategy_id}: {e}")
            return []

    def get_latest_selection_results(self, strategy_id: Optional[int] = None) -> List[SelectionResultDB]:
        """获取最新的选股结果"""
        try:
            with self.get_session() as session:
                query = session.query(SelectionResultDB)

                if strategy_id:
                    query = query.filter(SelectionResultDB.strategy_id == strategy_id)

                # 获取最新执行时间
                latest_time_subquery = (session.query(SelectionResultDB.execution_time)
                                       .order_by(SelectionResultDB.execution_time.desc())
                                       .limit(1)
                                       .subquery())

                return (query.filter(SelectionResultDB.execution_time == latest_time_subquery.c.execution_time)
                       .order_by(SelectionResultDB.score.desc())
                       .all())

        except SQLAlchemyError as e:
            logger.error(f"Failed to get latest selection results: {e}")
            return []

    def cleanup_old_selection_results(self, days_to_keep: int = 30) -> int:
        """清理过期的选股结果"""
        try:
            from datetime import datetime, timedelta
            cutoff_date = datetime.now() - timedelta(days=days_to_keep)

            with self.get_session() as session:
                deleted_count = (session.query(SelectionResultDB)
                               .filter(SelectionResultDB.execution_time < cutoff_date)
                               .delete())
                session.commit()
                logger.info(f"Cleaned up {deleted_count} old selection results")
                return deleted_count

        except SQLAlchemyError as e:
            logger.error(f"Failed to cleanup old selection results: {e}")
            return 0

    def close(self):
        """关闭数据库连接"""
        if self.engine:
            self.engine.dispose()
            logger.info("Database connection closed")


# 全局数据库服务实例
db_service = DatabaseService()
