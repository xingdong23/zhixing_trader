"""
内存股票数据仓库实现
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel
from .stock_repository import StockRepository


class Stock(BaseModel):
    """股票数据模型"""
    symbol: str
    name: str
    current_price: float
    change: float = 0.0
    change_percent: float = 0.0
    volume: int = 0
    market_cap: int = 0
    industry: str = ""
    concept_tags: List[str] = []


class MemoryStockRepository(StockRepository):
    """内存中的股票数据仓库实现"""
    
    def __init__(self):
        self._stocks: Dict[str, Stock] = {}
        self._initialized = False
        self._init_sample_data()
    
    def _init_sample_data(self):
        """初始化示例数据"""
        if self._initialized:
            return
            
        sample_stocks = [
            Stock(
                symbol="AAPL",
                name="苹果公司",
                current_price=175.0,
                change=2.5,
                change_percent=1.45,
                volume=50000000,
                market_cap=2800000000000,
                industry="科技",
                concept_tags=["人工智能", "消费电子"]
            ),
            Stock(
                symbol="MSFT",
                name="微软公司",
                current_price=310.0,
                change=-1.2,
                change_percent=-0.39,
                volume=25000000,
                market_cap=2300000000000,
                industry="科技",
                concept_tags=["云计算", "人工智能"]
            ),
            Stock(
                symbol="GOOGL",
                name="谷歌",
                current_price=125.0,
                change=0.8,
                change_percent=0.64,
                volume=30000000,
                market_cap=1600000000000,
                industry="科技",
                concept_tags=["人工智能", "云计算"]
            ),
            Stock(
                symbol="TSLA",
                name="特斯拉",
                current_price=250.0,
                change=5.2,
                change_percent=2.12,
                volume=45000000,
                market_cap=800000000000,
                industry="汽车",
                concept_tags=["新能源汽车", "人工智能"]
            ),
            Stock(
                symbol="NVDA",
                name="英伟达",
                current_price=450.0,
                change=12.5,
                change_percent=2.86,
                volume=35000000,
                market_cap=1100000000000,
                industry="科技",
                concept_tags=["人工智能", "芯片半导体"]
            )
        ]
        
        for stock in sample_stocks:
            self._stocks[stock.symbol] = stock
        
        self._initialized = True
    
    async def get_all(self) -> List[Stock]:
        """获取所有股票"""
        return list(self._stocks.values())
    
    async def get_by_symbol(self, symbol: str) -> Optional[Stock]:
        """根据股票代码获取股票"""
        return self._stocks.get(symbol)
    
    async def get_by_symbols(self, symbols: List[str]) -> List[Stock]:
        """根据股票代码列表获取股票"""
        return [self._stocks[symbol] for symbol in symbols if symbol in self._stocks]
    
    async def search(self, query: str) -> List[Stock]:
        """搜索股票"""
        query = query.lower()
        results = []
        
        for stock in self._stocks.values():
            if (query in stock.symbol.lower() or 
                query in stock.name.lower() or
                any(query in tag.lower() for tag in stock.concept_tags)):
                results.append(stock)
        
        return results
    
    async def get_by_concept(self, concept: str) -> List[Stock]:
        """根据概念获取股票"""
        results = []
        for stock in self._stocks.values():
            if concept in stock.concept_tags:
                results.append(stock)
        return results
    
    async def get_by_industry(self, industry: str) -> List[Stock]:
        """根据行业获取股票"""
        results = []
        for stock in self._stocks.values():
            if stock.industry == industry:
                results.append(stock)
        return results
    
    async def create(self, stock: Stock) -> Stock:
        """创建股票"""
        self._stocks[stock.symbol] = stock
        return stock
    
    async def update(self, symbol: str, stock_data: Dict[str, Any]) -> Optional[Stock]:
        """更新股票"""
        if symbol not in self._stocks:
            return None
        
        stock = self._stocks[symbol]
        for key, value in stock_data.items():
            if hasattr(stock, key):
                setattr(stock, key, value)
        
        return stock
    
    async def delete(self, symbol: str) -> bool:
        """删除股票"""
        if symbol in self._stocks:
            del self._stocks[symbol]
            return True
        return False
    
    async def get_market_overview(self) -> Dict[str, Any]:
        """获取市场概览"""
        stocks = list(self._stocks.values())
        if not stocks:
            return {
                "total_stocks": 0,
                "gainers": 0,
                "losers": 0,
                "unchanged": 0,
                "total_volume": 0,
                "total_market_cap": 0
            }
        
        gainers = sum(1 for stock in stocks if stock.change > 0)
        losers = sum(1 for stock in stocks if stock.change < 0)
        unchanged = sum(1 for stock in stocks if stock.change == 0)
        total_volume = sum(stock.volume for stock in stocks)
        total_market_cap = sum(stock.market_cap for stock in stocks)
        
        return {
            "total_stocks": len(stocks),
            "gainers": gainers,
            "losers": losers,
            "unchanged": unchanged,
            "total_volume": total_volume,
            "total_market_cap": total_market_cap
        }
