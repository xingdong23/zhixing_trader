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
        # 使用策略ID进行注册与检索
        self.strategies_by_id: Dict[int, IStrategy] = {}
        
    def register_strategy(self, strategy_id: int, strategy: IStrategy) -> None:
        """按ID注册策略实例"""
        self.strategies_by_id[strategy_id] = strategy
        logger.info(f"注册策略: id={strategy_id}, name={strategy.name}")
    
    async def execute_strategy(self, strategy_id: int) -> List[SelectionResult]:
        """执行单个策略"""
        try:
            if strategy_id not in self.strategies_by_id:
                logger.warning(f"策略 {strategy_id} 未注册")
                return []
            strategy = self.strategies_by_id[strategy_id]
            
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
            
            for sid, strategy in self.strategies_by_id.items():
                try:
                    results = await self.execute_strategy(sid)
                    all_results[strategy.name] = results
                except Exception as e:
                    logger.error(f"执行策略 {sid} 失败: {e}")
                    all_results[strategy.name] = []
            
            return all_results
            
        except Exception as e:
            logger.error(f"执行所有策略失败: {e}")
            return {}

    async def execute_strategy_with_progress(self, strategy_id: int, progress_cb) -> List[SelectionResult]:
        """执行策略并通过回调报告进度。
        progress_cb(current:int, total:int, symbol:Optional[str], phase:str)
        """
        if strategy_id not in self.strategies_by_id:
            logger.warning(f"策略 {strategy_id} 未注册")
            return []

        strategy = self.strategies_by_id[strategy_id]

        stocks = await self.stock_repository.get_all_stocks()
        if not stocks:
            return []

        results: List[SelectionResult] = []
        total = len(stocks)

        stock_data = {}
        for idx, stock in enumerate(stocks, start=1):
            symbol = stock.code if hasattr(stock, 'code') else stock.symbol
            await progress_cb(idx - 1, total, symbol, 'fetch')
            try:
                daily_data = await self.market_data_provider.get_stock_data(symbol, "1y", "1d")
                hourly_data = await self.market_data_provider.get_stock_data(symbol, "60d", "1h")
                stock_data[symbol] = { 'daily': daily_data, 'hourly': hourly_data }
            except Exception as e:
                logger.error(f"获取 {symbol} 数据失败: {e}")
                await progress_cb(idx, total, symbol, 'fetch_error')
                continue

        # 汇总执行
        await progress_cb(total, total, None, 'execute')
        results = await strategy.execute(stock_data)
        await progress_cb(total, total, None, 'done')
        return results
    
    def get_registered_strategies(self) -> List[int]:
        """获取已注册的策略ID列表"""
        return list(self.strategies_by_id.keys())
    
    def get_strategy(self, strategy_id: int) -> Optional[IStrategy]:
        """获取指定策略"""
        return self.strategies_by_id.get(strategy_id)


class StrategyFactory:
    """策略工厂"""

    @staticmethod
    def create_strategy(strategy_type: str, config: Dict) -> Optional[IStrategy]:
        """根据类型创建策略"""
        # 延迟导入各策略模块，按 impl_type 名称映射
        from .ema55_pullback import EMA55PullbackStrategy

        strategy_map = {
            'ema55_pullback': EMA55PullbackStrategy,
            # 新增策略时仅需在此注册映射或改为动态发现
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
