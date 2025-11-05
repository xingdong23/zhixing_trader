"""
市场数据服务
负责数据的获取、更新和管理
"""
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from loguru import logger

from ..core.interfaces import (
    IMarketDataProvider, IStockRepository, IKLineRepository, KLineData
)


class MarketDataService:
    """市场数据服务实现"""
    
    def __init__(
        self,
        market_data_provider: IMarketDataProvider,
        stock_repository: IStockRepository,
        kline_repository: IKLineRepository
    ):
        self.market_data_provider = market_data_provider
        self.stock_repository = stock_repository
        self.kline_repository = kline_repository
    
    async def update_watchlist_data(self) -> Dict[str, Dict[str, int]]:
        """更新自选股数据"""
        try:
            logger.info("开始更新自选股数据...")
            
            # 获取自选股列表
            stocks = await self.stock_repository.get_all_stocks()
            if not stocks:
                logger.warning("自选股列表为空")
                return {}
            
            symbols = [stock.code if hasattr(stock, 'code') else stock.symbol for stock in stocks]
            logger.info(f"找到 {len(symbols)} 只自选股需要更新")
            
            # 获取数据
            daily_data = await self._get_multiple_stocks_data(symbols, "1y", "1d")
            hourly_data = await self._get_multiple_stocks_data(symbols, "60d", "1h")
            
            # 保存数据
            update_counts = {}
            for symbol in symbols:
                daily_count = await self._save_stock_data(symbol, daily_data.get(symbol, []), "1d")
                hourly_count = await self._save_stock_data(symbol, hourly_data.get(symbol, []), "1h")
                
                update_counts[symbol] = {
                    'daily': daily_count,
                    'hourly': hourly_count
                }
            
            total_daily = sum(counts['daily'] for counts in update_counts.values())
            total_hourly = sum(counts['hourly'] for counts in update_counts.values())
            
            logger.info(f"自选股数据更新完成: 日线 {total_daily} 条, 小时线 {total_hourly} 条")
            return update_counts
            
        except Exception as e:
            logger.error(f"更新自选股数据失败: {e}")
            return {}
    
    async def _get_multiple_stocks_data(self, symbols: List[str], 
                                      period: str, interval: str) -> Dict[str, List[KLineData]]:
        """批量获取股票数据"""
        if hasattr(self.market_data_provider, 'get_multiple_stocks_data'):
            return await self.market_data_provider.get_multiple_stocks_data(symbols, period, interval)
        else:
            # 如果提供者不支持批量获取，则逐个获取
            results = {}
            for symbol in symbols:
                data = await self.market_data_provider.get_stock_data(symbol, period, interval)
                results[symbol] = data
            return results
    
    async def _save_stock_data(self, symbol: str, kline_data: List[KLineData], 
                             timeframe: str) -> int:
        """保存股票数据"""
        try:
            saved_count = 0
            
            for kline in kline_data:
                # 检查是否已存在
                existing = await self.kline_repository.get_kline_data(
                    symbol, timeframe, kline.datetime, kline.datetime
                )
                
                if not existing:
                    data_dict = {
                        'symbol': symbol,
                        'timeframe': timeframe,
                        'datetime': kline.datetime,
                        'open': kline.open,
                        'high': kline.high,
                        'low': kline.low,
                        'close': kline.close,
                        'volume': kline.volume,
                        'data_source': 'yahoo'
                    }
                    
                    success = await self.kline_repository.save_kline_data(data_dict)
                    if success:
                        saved_count += 1
            
            return saved_count
            
        except Exception as e:
            logger.error(f"保存股票 {symbol} 数据失败: {e}")
            return 0
    
    async def get_stock_kline_data(self, symbol: str, timeframe: str = "1d", 
                                 days: int = 252) -> List[KLineData]:
        """获取股票K线数据"""
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            # 先从数据库获取
            db_data = await self.kline_repository.get_kline_data(
                symbol, timeframe, start_date, end_date
            )
            
            if db_data:
                # 转换为KLineData格式
                kline_data = []
                for row in db_data:
                    kline = KLineData(
                        datetime=row.datetime if hasattr(row, 'datetime') else row.time_key,
                        open=row.open if hasattr(row, 'open') else row.open_price,
                        high=row.high if hasattr(row, 'high') else row.high_price,
                        low=row.low if hasattr(row, 'low') else row.low_price,
                        close=row.close if hasattr(row, 'close') else row.close_price,
                        volume=row.volume,
                        symbol=symbol
                    )
                    kline_data.append(kline)
                
                logger.debug(f"从数据库获取股票 {symbol} 的 {len(kline_data)} 条K线数据")
                return kline_data
            else:
                # 数据库没有数据，从API获取
                logger.debug(f"数据库无数据，从API获取股票 {symbol} 数据")
                period = "1y" if days >= 252 else f"{days}d"
                return await self.market_data_provider.get_stock_data(symbol, period, timeframe)
                
        except Exception as e:
            logger.error(f"获取股票 {symbol} K线数据失败: {e}")
            return []
    
    async def validate_stock_symbol(self, symbol: str) -> bool:
        """验证股票代码"""
        try:
            return await self.market_data_provider.validate_symbol(symbol)
        except Exception as e:
            logger.error(f"验证股票代码 {symbol} 失败: {e}")
            return False
    
    async def get_stock_info(self, symbol: str) -> Optional[Dict]:
        """获取股票基本信息"""
        try:
            return await self.market_data_provider.get_stock_info(symbol)
        except Exception as e:
            logger.error(f"获取股票 {symbol} 基本信息失败: {e}")
            return None
    
    async def cleanup_old_data(self, days_to_keep: int = 90) -> int:
        """清理过期数据"""
        try:
            cutoff_date = datetime.now() - timedelta(days=days_to_keep)
            deleted_count = await self.kline_repository.cleanup_old_data(cutoff_date)
            logger.info(f"清理了 {deleted_count} 条过期K线数据")
            return deleted_count
        except Exception as e:
            logger.error(f"清理过期数据失败: {e}")
            return 0
