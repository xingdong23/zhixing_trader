"""
股票数据仓库
负责股票数据的持久化操作
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from loguru import logger

from ..core.interfaces import IStockRepository
from ..models import StockDB
from ..database import db_service


class StockRepository(IStockRepository):
    """股票数据仓库实现"""
    
    async def get_all_stocks(self) -> List[StockDB]:
        """获取所有股票"""
        try:
            return db_service.get_all_stocks()
        except Exception as e:
            logger.error(f"获取所有股票失败: {e}")
            return []
    
    async def get_stock_by_symbol(self, symbol: str) -> Optional[StockDB]:
        """根据代码获取股票"""
        try:
            return db_service.get_stock_by_code(symbol)
        except Exception as e:
            logger.error(f"获取股票 {symbol} 失败: {e}")
            return None
    
    async def save_stock(self, stock_data: Dict[str, Any]) -> int:
        """保存股票信息"""
        try:
            stock_id = db_service.add_stock(stock_data)
            if stock_id:
                logger.debug(f"保存股票成功: {stock_data.get('code', 'unknown')}")
                return stock_id
            return 0
        except Exception as e:
            logger.error(f"保存股票失败: {e}")
            return 0
    
    async def update_stock(self, symbol: str, stock_data: Dict[str, Any]) -> bool:
        """更新股票信息"""
        try:
            import json

            # 更新字段
            with db_service.get_session() as session:
                # 重新查询股票以确保在当前session中
                from ..models import StockDB
                stock = session.query(StockDB).filter(
                    StockDB.code == symbol,
                    StockDB.is_active == True
                ).first()

                if not stock:
                    return False
                
                # 移除concept_ids字段（已废弃，使用categories系统）
                stock_data.pop('concept_ids', None)

                # 处理其他字段
                for key, value in stock_data.items():
                    if hasattr(stock, key):
                        setattr(stock, key, value)

                # 更新时间戳
                from datetime import datetime
                stock.updated_at = datetime.utcnow()

                session.commit()
                logger.info(f"股票 {symbol} 更新成功")
                return True

        except Exception as e:
            logger.error(f"更新股票 {symbol} 失败: {e}")
            return False
    
    async def delete_stock(self, symbol: str) -> bool:
        """删除股票"""
        try:
            return db_service.remove_stock(symbol)
        except Exception as e:
            logger.error(f"删除股票 {symbol} 失败: {e}")
            return False
    
    async def search_stocks(self, keyword: str) -> List[StockDB]:
        """搜索股票"""
        try:
            stocks = await self.get_all_stocks()
            results = []
            
            keyword_lower = keyword.lower()
            for stock in stocks:
                if (keyword_lower in stock.code.lower() or 
                    keyword_lower in stock.name.lower()):
                    results.append(stock)
            
            return results
            
        except Exception as e:
            logger.error(f"搜索股票失败: {e}")
            return []
    
    async def get_stocks_by_industry(self, industry: str) -> List[StockDB]:
        """根据行业获取股票"""
        try:
            stocks = await self.get_all_stocks()
            return [stock for stock in stocks if stock.industry == industry]
        except Exception as e:
            logger.error(f"获取行业 {industry} 股票失败: {e}")
            return []
    
    async def get_stock_count(self) -> int:
        """获取股票总数"""
        try:
            stocks = await self.get_all_stocks()
            return len(stocks)
        except Exception as e:
            logger.error(f"获取股票总数失败: {e}")
            return 0

    async def get_stocks_paginated(self, page: int = 1, page_size: int = 50) -> List[StockDB]:
        """分页获取股票列表"""
        try:
            with db_service.get_session() as session:
                offset = (page - 1) * page_size
                stocks = session.query(StockDB).filter(
                    StockDB.is_active == True
                ).offset(offset).limit(page_size).all()
                return stocks
        except Exception as e:
            logger.error(f"分页获取股票失败: {e}")
            return []

    async def get_active_stock_count(self) -> int:
        """获取活跃股票总数"""
        try:
            with db_service.get_session() as session:
                count = session.query(StockDB).filter(
                    StockDB.is_active == True
                ).count()
                return count
        except Exception as e:
            logger.error(f"获取活跃股票总数失败: {e}")
            return 0
