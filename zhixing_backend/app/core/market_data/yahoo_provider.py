"""
Yahoo Finance数据提供者
实现从Yahoo Finance获取股票数据
"""
import yfinance as yf
import pandas as pd
from datetime import datetime
from typing import List, Dict, Optional, Any
from loguru import logger
import asyncio
import time

from ..interfaces import IMarketDataProvider, KLineData


class YahooFinanceProvider(IMarketDataProvider):
    """Yahoo Finance数据提供者实现"""
    
    def __init__(self, rate_limit_delay: float = 1.0):
        self.rate_limit_delay = rate_limit_delay
    
    async def get_stock_data(self, symbol: str, period: str, interval: str) -> List[KLineData]:
        """获取股票K线数据"""
        try:
            logger.debug(f"获取股票数据: {symbol}, period: {period}, interval: {interval}")
            
            # 在线程池中执行同步操作
            loop = asyncio.get_event_loop()
            data = await loop.run_in_executor(
                None, 
                self._fetch_yahoo_data, 
                symbol, period, interval
            )
            
            if data is None or data.empty:
                logger.warning(f"未获取到股票 {symbol} 的数据")
                return []
            
            # 转换为KLineData格式
            kline_data = []
            for index, row in data.iterrows():
                if pd.isna(row['Open']) or pd.isna(row['Close']):
                    continue
                
                kline = KLineData(
                    datetime=index.to_pydatetime(),
                    open=float(row['Open']),
                    high=float(row['High']),
                    low=float(row['Low']),
                    close=float(row['Close']),
                    volume=int(row['Volume']) if not pd.isna(row['Volume']) else 0,
                    symbol=symbol
                )
                kline_data.append(kline)
            
            logger.debug(f"成功获取股票 {symbol} 的 {len(kline_data)} 条K线数据")
            return kline_data
            
        except Exception as e:
            logger.error(f"获取股票 {symbol} 数据失败: {e}")
            return []
    
    def _fetch_yahoo_data(self, symbol: str, period: str, interval: str) -> Optional[pd.DataFrame]:
        """同步获取Yahoo Finance数据"""
        try:
            # 添加延迟避免API限制
            time.sleep(self.rate_limit_delay)
            
            ticker = yf.Ticker(symbol)
            data = ticker.history(period=period, interval=interval)
            
            return data if not data.empty else None
            
        except Exception as e:
            logger.error(f"Yahoo Finance API调用失败: {e}")
            return None
    
    async def get_stock_info(self, symbol: str) -> Optional[Dict[str, Any]]:
        """获取股票基本信息"""
        try:
            loop = asyncio.get_event_loop()
            info = await loop.run_in_executor(
                None, 
                self._fetch_stock_info, 
                symbol
            )
            return info
            
        except Exception as e:
            logger.error(f"获取股票 {symbol} 基本信息失败: {e}")
            return None
    
    def _fetch_stock_info(self, symbol: str) -> Optional[Dict[str, Any]]:
        """同步获取股票基本信息"""
        try:
            time.sleep(self.rate_limit_delay)
            
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            if not info:
                return None
            
            return {
                'symbol': symbol,
                'name': info.get('longName', symbol),
                'current_price': info.get('currentPrice', 0),
                'market_cap': info.get('marketCap', 0),
                'industry': info.get('industry', ''),
                'sector': info.get('sector', ''),
                'currency': info.get('currency', 'USD'),
                'exchange': info.get('exchange', '')
            }
            
        except Exception as e:
            logger.error(f"获取股票 {symbol} 基本信息失败: {e}")
            return None
    
    async def validate_symbol(self, symbol: str) -> bool:
        """验证股票代码是否有效"""
        try:
            data = await self.get_stock_data(symbol, "5d", "1d")
            return len(data) > 0
            
        except Exception as e:
            logger.error(f"验证股票代码 {symbol} 失败: {e}")
            return False
    
    async def get_multiple_stocks_data(self, symbols: List[str], 
                                     period: str = "1y", 
                                     interval: str = "1d") -> Dict[str, List[KLineData]]:
        """批量获取多只股票数据"""
        results = {}
        
        # 分批处理，避免API限制
        batch_size = 5
        for i in range(0, len(symbols), batch_size):
            batch = symbols[i:i + batch_size]
            
            # 并发获取当前批次的数据
            tasks = [
                self.get_stock_data(symbol, period, interval) 
                for symbol in batch
            ]
            
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # 处理结果
            for symbol, data in zip(batch, batch_results):
                if isinstance(data, Exception):
                    logger.error(f"获取股票 {symbol} 数据时发生异常: {data}")
                    results[symbol] = []
                else:
                    results[symbol] = data
            
            # 批次间暂停，避免API限制
            if i + batch_size < len(symbols):
                await asyncio.sleep(1)
        
        return results


class MarketDataProviderFactory:
    """市场数据提供者工厂"""
    
    @staticmethod
    def create_provider(provider_type: str, **kwargs) -> IMarketDataProvider:
        """创建数据提供者"""
        if provider_type == "yahoo":
            return YahooFinanceProvider(**kwargs)
        elif provider_type == "alphavantage":
            from .alphavantage_provider import AlphaVantageProvider
            return AlphaVantageProvider(**kwargs)
        elif provider_type == "finnhub":
            from .finnhub_provider import FinnhubProvider
            return FinnhubProvider(**kwargs)
        elif provider_type == "twelvedata":
            from .twelvedata_provider import TwelveDataProvider
            return TwelveDataProvider(**kwargs)
        elif provider_type == "hybrid":
            from .hybrid_provider import HybridProvider
            return HybridProvider(**kwargs)
        elif provider_type == "multi":
            from .multi_provider import MultiProvider
            return MultiProvider(**kwargs)
        else:
            raise ValueError(f"未知的数据提供者类型: {provider_type}")
    
    @staticmethod
    def get_available_providers() -> List[str]:
        """获取可用的数据提供者"""
        return ["yahoo", "alphavantage", "finnhub", "twelvedata", "hybrid", "multi"]
