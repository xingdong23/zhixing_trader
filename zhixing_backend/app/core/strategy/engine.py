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
        """执行单个策略（优化版：分页处理，优先使用本地数据）"""
        try:
            if strategy_id not in self.strategies_by_id:
                logger.warning(f"策略 {strategy_id} 未注册")
                return []
            strategy = self.strategies_by_id[strategy_id]
            
            # 获取活跃股票总数
            total_stocks = await self.stock_repository.get_active_stock_count()
            if total_stocks == 0:
                logger.warning("自选股列表为空")
                return []
            
            logger.info(f"开始执行策略 {strategy.name}，共 {total_stocks} 只股票")
            
            # 分页处理，每页50只股票
            page_size = 50
            total_pages = (total_stocks + page_size - 1) // page_size
            all_results = []
            processed_count = 0
            
            for page in range(1, total_pages + 1):
                try:
                    # 分页获取股票
                    stocks = await self.stock_repository.get_stocks_paginated(page, page_size)
                    if not stocks:
                        continue
                    
                    # 获取股票代码列表
                    symbols = [stock.code if hasattr(stock, 'code') else stock.symbol for stock in stocks]
                    
                    # 批量检查数据充足性，只处理有足够数据的股票
                    sufficient_symbols = await self.kline_repository.get_stocks_with_sufficient_data(
                        symbols, min_daily_records=100, min_hourly_records=100
                    )
                    
                    if not sufficient_symbols:
                        logger.debug(f"第 {page}/{total_pages} 页没有股票有足够数据，跳过")
                        continue
                    
                    # 优先从本地数据库获取K线数据
                    stock_data = {}
                    for symbol in sufficient_symbols:
                        try:
                            # 从数据库获取日线和小时线数据
                            daily_data = await self.kline_repository.get_kline_data_from_db(
                                symbol, "K_DAY", limit=500  # 获取最近500个交易日
                            )
                            hourly_data = await self.kline_repository.get_kline_data_from_db(
                                symbol, "K_60M", limit=1000  # 获取最近1000小时
                            )
                            
                            if len(daily_data) >= 100 and len(hourly_data) >= 100:
                                stock_data[symbol] = {
                                    'daily': daily_data,
                                    'hourly': hourly_data
                                }
                                logger.debug(f"从数据库获取股票 {symbol} 数据: 日线 {len(daily_data)} 条, 小时线 {len(hourly_data)} 条")
                            else:
                                logger.debug(f"股票 {symbol} 数据库数据不足，跳过")
                                
                        except Exception as e:
                            logger.error(f"获取股票 {symbol} 数据失败: {e}")
                            continue
                    
                    if stock_data:
                        # 执行策略分析
                        page_results = await strategy.execute(stock_data)
                        all_results.extend(page_results)
                        logger.info(f"第 {page}/{total_pages} 页处理完成，筛选出 {len(page_results)} 只股票")
                    
                    processed_count += len(stocks)
                    
                except Exception as e:
                    logger.error(f"处理第 {page}/{total_pages} 页时发生错误: {e}")
                    continue
            
            logger.info(f"策略 {strategy.name} 执行完成，处理了 {processed_count} 只股票，筛选出 {len(all_results)} 只股票")
            return all_results
            
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
        """执行策略并通过回调报告进度（优化版：分页处理，优先使用本地数据）
        progress_cb(current:int, total:int, symbol:Optional[str], phase:str)
        """
        if strategy_id not in self.strategies_by_id:
            logger.warning(f"策略 {strategy_id} 未注册")
            return []

        strategy = self.strategies_by_id[strategy_id]

        # 获取活跃股票总数
        total_stocks = await self.stock_repository.get_active_stock_count()
        if total_stocks == 0:
            await progress_cb(0, 0, None, 'no_stocks')
            return []

        logger.info(f"开始执行策略 {strategy.name}，共 {total_stocks} 只股票")
        await progress_cb(0, total_stocks, None, 'start')
        
        # 分页处理
        page_size = 50
        total_pages = (total_stocks + page_size - 1) // page_size
        all_results = []
        processed_count = 0
        
        for page in range(1, total_pages + 1):
            try:
                await progress_cb(processed_count, total_stocks, None, f'page_{page}_{total_pages}')
                
                # 分页获取股票
                stocks = await self.stock_repository.get_stocks_paginated(page, page_size)
                if not stocks:
                    continue
                
                # 获取股票代码列表
                symbols = [stock.code if hasattr(stock, 'code') else stock.symbol for stock in stocks]
                
                # 批量检查数据充足性
                sufficient_symbols = await self.kline_repository.get_stocks_with_sufficient_data(
                    symbols, min_daily_records=100, min_hourly_records=100
                )
                
                if not sufficient_symbols:
                    processed_count += len(stocks)
                    continue
                
                # 获取数据并执行策略
                stock_data = {}
                for idx, symbol in enumerate(sufficient_symbols):
                    await progress_cb(processed_count + idx, total_stocks, symbol, 'fetch_data')
                    
                    try:
                        # 从数据库获取K线数据
                        daily_data = await self.kline_repository.get_kline_data_from_db(
                            symbol, "K_DAY", limit=500
                        )
                        hourly_data = await self.kline_repository.get_kline_data_from_db(
                            symbol, "K_60M", limit=1000
                        )
                        
                        if len(daily_data) >= 100 and len(hourly_data) >= 100:
                            stock_data[symbol] = {
                                'daily': daily_data,
                                'hourly': hourly_data
                            }
                        
                    except Exception as e:
                        logger.error(f"获取股票 {symbol} 数据失败: {e}")
                        await progress_cb(processed_count + idx, total_stocks, symbol, 'fetch_error')
                        continue
                
                if stock_data:
                    await progress_cb(processed_count, total_stocks, None, 'execute')
                    page_results = await strategy.execute(stock_data)
                    all_results.extend(page_results)
                
                processed_count += len(stocks)
                
            except Exception as e:
                logger.error(f"处理第 {page}/{total_pages} 页时发生错误: {e}")
                continue
        
        await progress_cb(total_stocks, total_stocks, None, 'done')
        logger.info(f"策略执行完成，筛选出 {len(all_results)} 只股票")
        return all_results
    
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
