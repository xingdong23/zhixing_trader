"""
依赖注入容器
管理所有服务的依赖关系
"""
from typing import Dict, Any
from loguru import logger

from .interfaces import (
    IMarketDataProvider, IStockRepository, IKLineRepository,
    IStrategyRepository, ISelectionResultRepository
)
from .market_data.yahoo_provider import YahooFinanceProvider
from ..repositories.stock_repository import StockRepository
from ..repositories.kline_repository import KLineRepository
from ..services.strategy_service import StrategyService
from ..services.market_data_service import MarketDataService


class Container:
    """依赖注入容器"""
    
    def __init__(self):
        self._services: Dict[str, Any] = {}
        self._initialized = False
    
    def initialize(self):
        """初始化所有服务"""
        if self._initialized:
            return
        
        try:
            logger.info("初始化依赖注入容器...")
            
            # 创建数据提供者
            self._services['market_data_provider'] = YahooFinanceProvider(rate_limit_delay=0.2)
            
            # 创建仓库
            self._services['stock_repository'] = StockRepository()
            self._services['kline_repository'] = KLineRepository()

            # 创建服务
            self._services['market_data_service'] = MarketDataService(
                self._services['market_data_provider'],
                self._services['stock_repository'],
                self._services['kline_repository']
            )

            self._services['strategy_service'] = StrategyService(
                self._services['stock_repository'],
                self._services['kline_repository'],
                self._services['market_data_provider']
            )
            
            self._initialized = True
            logger.info("依赖注入容器初始化完成")
            
        except Exception as e:
            logger.error(f"初始化依赖注入容器失败: {e}")
            raise
    
    def get_service(self, service_name: str) -> Any:
        """获取服务"""
        if not self._initialized:
            self.initialize()
        
        service = self._services.get(service_name)
        if service is None:
            raise ValueError(f"服务 {service_name} 未注册")
        
        return service
    
    def get_market_data_provider(self) -> IMarketDataProvider:
        """获取市场数据提供者"""
        return self.get_service('market_data_provider')
    
    def get_stock_repository(self) -> IStockRepository:
        """获取股票仓库"""
        return self.get_service('stock_repository')
    
    def get_strategy_service(self) -> StrategyService:
        """获取策略服务"""
        return self.get_service('strategy_service')
    
    def get_market_data_service(self) -> MarketDataService:
        """获取市场数据服务"""
        return self.get_service('market_data_service')


# 全局容器实例
container = Container()
