"""
策略服务
负责策略的管理和执行
"""
from typing import List, Dict, Optional, Any
from datetime import datetime
from loguru import logger

from ..core.interfaces import (
    IStrategyEngine, IStockRepository, IKLineRepository, 
    IMarketDataProvider, SelectionResult
)
from ..core.strategy.engine import StrategyEngine, StrategyFactory
from ..core.strategy.implementations import EMA55PullbackStrategy


class StrategyService:
    """策略服务实现"""
    
    def __init__(
        self,
        stock_repository: IStockRepository,
        kline_repository: IKLineRepository,
        market_data_provider: IMarketDataProvider
    ):
        self.stock_repository = stock_repository
        self.kline_repository = kline_repository
        self.market_data_provider = market_data_provider
        
        # 初始化策略引擎
        self.strategy_engine = StrategyEngine(
            stock_repository,
            kline_repository,
            market_data_provider
        )
        
        # 注册默认策略
        self._register_default_strategies()
    
    def _register_default_strategies(self):
        """注册默认策略 - 暂时只注册EMA55策略"""
        try:
            # EMA55回踩策略
            ema55_config = {
                'ema_period': 55,
                'pullback_tolerance': 0.03,
                'stabilization_hours': 8,
                'stabilization_volatility': 0.02,
                'min_uptrend_gain': 0.20
            }
            ema55_strategy = EMA55PullbackStrategy(ema55_config)
            self.strategy_engine.register_strategy(ema55_strategy)

            logger.info("EMA55回踩策略注册完成")

        except Exception as e:
            logger.error(f"注册默认策略失败: {e}")
    
    async def execute_strategy(self, strategy_id: int) -> List[SelectionResult]:
        """执行策略"""
        try:
            return await self.strategy_engine.execute_strategy(strategy_id)
        except Exception as e:
            logger.error(f"执行策略失败: {e}")
            return []
    
    async def execute_all_strategies(self) -> Dict[str, List[SelectionResult]]:
        """执行所有策略"""
        try:
            return await self.strategy_engine.execute_all_strategies()
        except Exception as e:
            logger.error(f"执行所有策略失败: {e}")
            return {}
    
    def get_available_strategies(self) -> List[str]:
        """获取可用策略"""
        return self.strategy_engine.get_registered_strategies()
    
    def create_custom_strategy(self, strategy_type: str, config: Dict[str, Any]) -> bool:
        """创建自定义策略"""
        try:
            strategy = StrategyFactory.create_strategy(strategy_type, config)
            if strategy:
                self.strategy_engine.register_strategy(strategy)
                logger.info(f"创建自定义策略: {strategy.name}")
                return True
            return False
        except Exception as e:
            logger.error(f"创建自定义策略失败: {e}")
            return False
