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
from .models import Base, StockDB, QuoteDB, KLineDB, StockInfo, QuoteData


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
    
    # ==================== 股票信息操作 ====================
    
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
    
    def close(self):
        """关闭数据库连接"""
        if self.engine:
            self.engine.dispose()
            logger.info("Database connection closed")


# 全局数据库服务实例
db_service = DatabaseService()
