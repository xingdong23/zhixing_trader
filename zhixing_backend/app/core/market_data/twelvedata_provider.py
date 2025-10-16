"""
Twelve Data 数据提供者
官网: https://twelvedata.com/
免费额度: 800次/天, 8次/分钟
"""
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional
import aiohttp
from loguru import logger

from app.core.interfaces import IMarketDataProvider, KLineData, StockInfo


class TwelveDataProvider(IMarketDataProvider):
    """Twelve Data 数据提供者"""
    
    def __init__(self, api_key: str, rate_limit_delay: float = 7.5):
        """
        初始化 Twelve Data Provider
        
        Args:
            api_key: Twelve Data API Key
            rate_limit_delay: 请求间隔(秒)，默认7.5秒 (8次/分钟)
        """
        self.api_key = api_key
        self.rate_limit_delay = rate_limit_delay
        self.base_url = "https://api.twelvedata.com"
        self._session: Optional[aiohttp.ClientSession] = None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """获取或创建session"""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session
    
    async def _request(self, endpoint: str, params: dict = None) -> dict:
        """
        发送API请求
        
        Args:
            endpoint: API端点
            params: 请求参数
            
        Returns:
            响应数据
        """
        if params is None:
            params = {}
        
        params['apikey'] = self.api_key
        url = f"{self.base_url}/{endpoint}"
        
        session = await self._get_session()
        
        try:
            async with session.get(url, params=params) as response:
                if response.status == 429:
                    raise Exception("Twelve Data API 限流")
                
                if response.status != 200:
                    text = await response.text()
                    raise Exception(f"Twelve Data API错误: {response.status} - {text}")
                
                data = await response.json()
                
                # 检查错误
                if isinstance(data, dict):
                    if data.get('status') == 'error':
                        raise Exception(f"Twelve Data API返回错误: {data.get('message', '未知错误')}")
                    
                    if 'code' in data and data['code'] != 200:
                        raise Exception(f"Twelve Data API错误码: {data.get('code')} - {data.get('message', '')}")
                
                # 限流延迟
                if self.rate_limit_delay > 0:
                    await asyncio.sleep(self.rate_limit_delay)
                
                return data
        
        except Exception as e:
            logger.error(f"[TwelveData] 请求失败: {e}")
            raise
    
    def _interval_to_twelvedata(self, interval: str) -> str:
        """
        将interval转换为Twelve Data格式
        
        Args:
            interval: 标准间隔 (1m, 5m, 15m, 1h, 1d等)
            
        Returns:
            Twelve Data interval (1min, 5min, 15min, 1h, 1day等)
        """
        mapping = {
            '1m': '1min',
            '5m': '5min',
            '15m': '15min',
            '30m': '30min',
            '1h': '1h',
            '1d': '1day',
            '1wk': '1week',
            '1mo': '1month',
        }
        
        return mapping.get(interval, '1day')
    
    def _period_to_outputsize(self, period: str, interval: str) -> int:
        """
        根据period和interval计算outputsize
        
        Args:
            period: 时间范围 (1d, 5d, 1mo等)
            interval: 时间间隔
            
        Returns:
            outputsize (数据点数量)
        """
        # 解析period天数
        if period.endswith('d'):
            days = int(period[:-1])
        elif period.endswith('mo'):
            months = int(period[:-2])
            days = months * 30
        elif period.endswith('y'):
            years = int(period[:-1])
            days = years * 365
        else:
            days = 30
        
        # 根据interval计算数据点
        if interval in ['1m', '5m', '15m', '30m']:
            # 日内数据，假设每天6.5小时交易
            minutes_per_interval = int(interval[:-1])
            points_per_day = int((6.5 * 60) / minutes_per_interval)
            return min(days * points_per_day, 5000)  # Twelve Data 限制
        elif interval == '1h':
            return min(days * 7, 5000)
        else:
            # 日线或更长
            return min(days, 5000)
    
    async def get_stock_data(
        self,
        symbol: str,
        period: str = "1mo",
        interval: str = "1d"
    ) -> List[KLineData]:
        """
        获取股票K线数据
        
        Args:
            symbol: 股票代码 (如 AAPL)
            period: 时间范围 (1d, 5d, 1mo, 3mo, 6mo, 1y等)
            interval: 时间间隔 (1m, 5m, 15m, 30m, 1h, 1d, 1wk, 1mo)
            
        Returns:
            K线数据列表
        """
        logger.debug(f"[TwelveData] 获取股票数据: {symbol}, period: {period}, interval: {interval}")
        
        try:
            # 转换参数
            td_interval = self._interval_to_twelvedata(interval)
            outputsize = self._period_to_outputsize(period, interval)
            
            # 请求数据
            data = await self._request('time_series', {
                'symbol': symbol,
                'interval': td_interval,
                'outputsize': outputsize,
                'format': 'JSON'
            })
            
            # 检查数据
            if 'values' not in data:
                logger.warning(f"[TwelveData] 未获取到股票 {symbol} 的数据")
                return []
            
            values = data['values']
            if not values:
                logger.warning(f"[TwelveData] 股票 {symbol} 数据为空")
                return []
            
            # 解析数据
            klines = []
            for item in reversed(values):  # Twelve Data返回的数据是降序的
                try:
                    kline = KLineData(
                        datetime=datetime.strptime(item['datetime'], '%Y-%m-%d %H:%M:%S') 
                                if ' ' in item['datetime'] 
                                else datetime.strptime(item['datetime'], '%Y-%m-%d'),
                        open=float(item['open']),
                        high=float(item['high']),
                        low=float(item['low']),
                        close=float(item['close']),
                        volume=int(float(item.get('volume', 0)))
                    )
                    klines.append(kline)
                except (KeyError, ValueError) as e:
                    logger.warning(f"[TwelveData] 解析数据失败: {e}, item: {item}")
                    continue
            
            logger.debug(f"[TwelveData] 成功获取股票 {symbol} 的 {len(klines)} 条K线数据")
            return klines
        
        except Exception as e:
            logger.error(f"[TwelveData] 获取股票数据失败: {e}")
            return []
    
    async def get_stock_info(self, symbol: str) -> Optional[StockInfo]:
        """
        获取股票基本信息
        
        Args:
            symbol: 股票代码
            
        Returns:
            股票信息，失败返回None
        """
        logger.debug(f"[TwelveData] 获取股票信息: {symbol}")
        
        try:
            # 获取实时报价
            quote = await self._request('quote', {'symbol': symbol})
            
            if not quote or 'close' not in quote:
                logger.warning(f"[TwelveData] 未获取到股票 {symbol} 的报价")
                return None
            
            stock_info = StockInfo(
                symbol=symbol,
                name=quote.get('name', symbol),
                current_price=float(quote.get('close', 0.0)),
                market_cap=0,  # Twelve Data免费版不提供
                industry='未知',
                sector='未知',
                description=f"{quote.get('name', symbol)} - {quote.get('exchange', '')}"
            )
            
            logger.debug(f"[TwelveData] 成功获取股票 {symbol} 的信息")
            return stock_info
        
        except Exception as e:
            logger.error(f"[TwelveData] 获取股票信息失败: {e}")
            return None
    
    async def validate_symbol(self, symbol: str) -> bool:
        """
        验证股票代码是否有效
        
        Args:
            symbol: 股票代码
            
        Returns:
            是否有效
        """
        try:
            quote = await self._request('quote', {'symbol': symbol})
            return 'close' in quote and float(quote['close']) > 0
        except Exception as e:
            logger.error(f"[TwelveData] 验证股票代码失败: {e}")
            return False
    
    async def get_multiple_stocks_data(
        self,
        symbols: List[str],
        period: str = "1mo",
        interval: str = "1d"
    ) -> dict:
        """
        批量获取多个股票的数据
        
        Args:
            symbols: 股票代码列表
            period: 时间范围
            interval: 时间间隔
            
        Returns:
            {symbol: [KLineData]}
        """
        result = {}
        
        for symbol in symbols:
            try:
                data = await self.get_stock_data(symbol, period, interval)
                result[symbol] = data
            except Exception as e:
                logger.error(f"[TwelveData] 获取 {symbol} 数据失败: {e}")
                result[symbol] = []
        
        return result
    
    async def close(self):
        """关闭session"""
        if self._session and not self._session.closed:
            await self._session.close()
    
    def __del__(self):
        """析构时关闭session"""
        if self._session and not self._session.closed:
            try:
                asyncio.create_task(self._session.close())
            except:
                pass

