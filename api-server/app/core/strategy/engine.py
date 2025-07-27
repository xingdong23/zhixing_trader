"""
策略执行引擎
负责策略的注册、执行和管理
"""
import asyncio
from typing import Dict, List, Optional
from datetime import datetime
from loguru import logger

from ..interfaces import (
    IStrategyEngine, IStrategy, IStockRepository, 
    IKLineRepository, IMarketDataProvider, SelectionResult
)


class StrategyEngine(IStrategyEngine):
    """策略执行引擎实现"""
    
    def __init__(
        self,
        stock_repository: IStockRepository,
        kline_repository: IKLineRepository,
        market_data_provider: IMarketDataProvider
    ):
        self.stock_repository = stock_repository
        self.kline_repository = kline_repository
        self.market_data_provider = market_data_provider
        self.strategies: Dict[str, IStrategy] = {}
        
    def register_strategy(self, strategy: IStrategy) -> None:
        """注册策略"""
        self.strategies[strategy.name] = strategy
        logger.info(f"注册策略: {strategy.name}")
    
    async def execute_strategy(self, strategy_id: int) -> List[SelectionResult]:
        """执行单个策略"""
        try:
            # 这里需要从数据库获取策略配置
            # 简化实现，直接使用注册的策略
            if not self.strategies:
                logger.warning("没有注册的策略")
                return []
            
            # 获取第一个策略作为示例
            strategy = list(self.strategies.values())[0]
            
            # 获取自选股数据
            stocks = await self.stock_repository.get_all_stocks()
            if not stocks:
                logger.warning("自选股列表为空")
                return []
            
            # 获取股票数据 - 优先从本地数据库获取
            stock_data = {}
            for stock in stocks:
                symbol = stock.code if hasattr(stock, 'code') else stock.symbol

                # TODO: 优先从本地数据库获取数据
                # 如果本地数据不存在或过期，则从Yahoo获取

                # 暂时仍从Yahoo获取（后续改为从本地数据库）
                daily_data = await self.market_data_provider.get_stock_data(
                    symbol, "1y", "1d"
                )
                hourly_data = await self.market_data_provider.get_stock_data(
                    symbol, "60d", "1h"
                )

                stock_data[symbol] = {
                    'daily': daily_data,
                    'hourly': hourly_data
                }

                logger.debug(f"获取股票 {symbol} 数据: 日线 {len(daily_data)} 条, 小时线 {len(hourly_data)} 条")
            
            # 执行策略
            results = await strategy.execute(stock_data)
            
            logger.info(f"策略 {strategy.name} 执行完成，筛选出 {len(results)} 只股票")
            return results
            
        except Exception as e:
            logger.error(f"执行策略失败: {e}")
            return []
    
    async def execute_all_strategies(self) -> Dict[str, List[SelectionResult]]:
        """执行所有启用的策略"""
        try:
            all_results = {}
            
            for strategy_name, strategy in self.strategies.items():
                try:
                    # 这里应该检查策略是否启用
                    results = await self.execute_strategy(1)  # 简化实现
                    all_results[strategy_name] = results
                except Exception as e:
                    logger.error(f"执行策略 {strategy_name} 失败: {e}")
                    all_results[strategy_name] = []
            
            return all_results
            
        except Exception as e:
            logger.error(f"执行所有策略失败: {e}")
            return {}
    
    def get_registered_strategies(self) -> List[str]:
        """获取已注册的策略列表"""
        return list(self.strategies.keys())
    
    def get_strategy(self, name: str) -> Optional[IStrategy]:
        """获取指定策略"""
        return self.strategies.get(name)


class StrategyFactory:
    """策略工厂"""

    @staticmethod
    def create_strategy(strategy_type: str, config: Dict) -> Optional[IStrategy]:
        """根据类型创建策略"""
        from .implementations import EMA55PullbackStrategy

        strategy_map = {
            'ema55_pullback': EMA55PullbackStrategy,
            # 暂时只保留一个策略
        }

        strategy_class = strategy_map.get(strategy_type)
        if strategy_class:
            return strategy_class(config)

        logger.error(f"未知的策略类型: {strategy_type}")
        return None

    @staticmethod
    def get_available_strategies() -> List[str]:
        """获取可用的策略类型"""
        return ['ema55_pullback']  # 暂时只返回一个策略
