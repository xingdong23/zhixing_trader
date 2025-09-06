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
                from ..models import StockDB, ConceptStockRelationDB
                stock = session.query(StockDB).filter(
                    StockDB.code == symbol,
                    StockDB.is_active == True
                ).first()

                if not stock:
                    return False

                # 处理概念关联
                concept_ids = stock_data.pop('concept_ids', None)
                if concept_ids is not None:
                    # 统一将传入的概念标识转换为 ConceptDB.concept_id
                    from ..models import ConceptDB
                    normalized_concept_ids = []
                    for cid in concept_ids:
                        # 已经是 concept_id 形式
                        concept = session.query(ConceptDB).filter(ConceptDB.concept_id == str(cid)).first()
                        if concept:
                            normalized_concept_ids.append(concept.concept_id)
                            continue

                        # 可能是概念表自增 id，做一次转换
                        try:
                            cid_int = int(str(cid))
                            concept_by_pk = session.query(ConceptDB).filter(ConceptDB.id == cid_int).first()
                            if concept_by_pk:
                                normalized_concept_ids.append(concept_by_pk.concept_id)
                                continue
                        except Exception:
                            pass

                        # 兜底按字符串写入
                        normalized_concept_ids.append(str(cid))

                    # 删除现有的概念关联
                    session.query(ConceptStockRelationDB).filter(
                        ConceptStockRelationDB.stock_code == symbol
                    ).delete()
                    
                    # 添加新的概念关联
                    if normalized_concept_ids:
                        for concept_id in normalized_concept_ids:
                            relation = ConceptStockRelationDB(
                                concept_id=str(concept_id),
                                stock_code=symbol
                            )
                            session.add(relation)
                    
                    logger.info(f"股票 {symbol} 概念关联已更新: {normalized_concept_ids}")

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
