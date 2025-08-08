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
from ..database import db_service


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
        
        # 从数据库加载启用的策略
        self._load_enabled_strategies_from_db()
    
    def _load_enabled_strategies_from_db(self):
        """从数据库加载启用的策略并注册到引擎"""
        try:
            enabled = db_service.get_enabled_strategies()
            for s in enabled:
                import json
                config = json.loads(s.configuration) if s.configuration else {}
                strategy = StrategyFactory.create_strategy(s.impl_type, config)
                if strategy is not None:
                    # 设置策略ID，便于结果落库时引用
                    if hasattr(strategy, 'strategy_id'):
                        strategy.strategy_id = s.id
                    self.strategy_engine.register_strategy(s.id, strategy)
                    logger.info(f"策略已加载: id={s.id}, type={s.impl_type}, name={s.name}")
                else:
                    logger.warning(f"未能创建策略: id={s.id}, type={s.impl_type}")
        except Exception as e:
            logger.error(f"加载启用策略失败: {e}")
    
    async def execute_strategy(self, strategy_id: int) -> List[SelectionResult]:
        """执行策略"""
        try:
            return await self.strategy_engine.execute_strategy(strategy_id)
        except Exception as e:
            logger.error(f"执行策略 {strategy_id} 失败: {e}")
            return []
    
    async def execute_all_strategies(self) -> Dict[str, List[SelectionResult]]:
        """执行所有策略"""
        try:
            return await self.strategy_engine.execute_all_strategies()
        except Exception as e:
            logger.error(f"执行所有策略失败: {e}")
            return {}
    
    def get_available_strategies(self) -> List[int]:
        """获取可用策略ID列表"""
        return self.strategy_engine.get_registered_strategies()
    
    def create_custom_strategy(self, strategy_type: str, config: Dict[str, Any]) -> bool:
        """创建自定义策略（临时注册，不落库）"""
        try:
            strategy = StrategyFactory.create_strategy(strategy_type, config)
            if strategy:
                temp_id = max(self.strategy_engine.get_registered_strategies() + [0]) + 1
                self.strategy_engine.register_strategy(temp_id, strategy)
                logger.info(f"创建自定义策略: {strategy.name}, 临时ID={temp_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"创建自定义策略失败: {e}")
            return False
