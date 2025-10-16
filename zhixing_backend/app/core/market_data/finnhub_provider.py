"""
Finnhub 数据提供者
官网: https://finnhub.io/
免费额度: 60次/分钟，无日限制
"""
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional
import aiohttp
from loguru import logger

from app.core.interfaces import IMarketDataProvider, KLineData, StockInfo


class FinnhubProvider(IMarketDataProvider):
    """Finnhub 数据提供者"""
    
    def __init__(self, api_key: str, rate_limit_delay: float = 1.0):
        """
        初始化 Finnhub Provider
        
        Args:
            api_key: Finnhub API Key
            rate_limit_delay: 请求间隔(秒)，默认1秒 (60次/分钟)
        """
        self.api_key = api_key
        self.rate_limit_delay = rate_limit_delay
        self.base_url = "https://finnhub.io/api/v1"
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
        
        params['token'] = self.api_key
        url = f"{self.base_url}/{endpoint}"
        
        session = await self._get_session()
        
        try:
            async with session.get(url, params=params) as response:
                if response.status == 429:
                    raise Exception("Finnhub API 限流")
                
                if response.status != 200:
                    text = await response.text()
                    raise Exception(f"Finnhub API错误: {response.status} - {text}")
                
                data = await response.json()
                
                # 检查错误
                if isinstance(data, dict) and data.get('error'):
                    raise Exception(f"Finnhub API返回错误: {data['error']}")
                
                # 限流延迟
                if self.rate_limit_delay > 0:
                    await asyncio.sleep(self.rate_limit_delay)
                
                return data
        
        except Exception as e:
            logger.error(f"[Finnhub] 请求失败: {e}")
            raise
    
    def _interval_to_resolution(self, interval: str) -> str:
        """
        将interval转换为Finnhub的resolution格式
        
        Args:
            interval: 标准间隔 (1m, 5m, 15m, 1h, 1d等)
            
        Returns:
            Finnhub resolution (1, 5, 15, 60, D, W, M)
        """
        mapping = {
            '1m': '1',
            '5m': '5',
            '15m': '15',
            '30m': '30',
            '1h': '60',
            '1d': 'D',
            '1wk': 'W',
            '1mo': 'M',
        }
        
        return mapping.get(interval, 'D')
    
    def _period_to_dates(self, period: str) -> tuple:
        """
        将period转换为起止日期
        
        Args:
            period: 时间范围 (1d, 5d, 1mo, 3mo, 6mo, 1y, 5y等)
            
        Returns:
            (start_timestamp, end_timestamp)
        """
        end_date = datetime.now()
        
        # 解析period
        if period.endswith('d'):
            days = int(period[:-1])
            start_date = end_date - timedelta(days=days)
        elif period.endswith('mo'):
            months = int(period[:-2])
            start_date = end_date - timedelta(days=months * 30)
        elif period.endswith('y'):
            years = int(period[:-1])
            start_date = end_date - timedelta(days=years * 365)
        else:
            # 默认1个月
            start_date = end_date - timedelta(days=30)
        
        return int(start_date.timestamp()), int(end_date.timestamp())
    
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
            period: 时间范围 (1d, 5d, 1mo, 3mo, 6mo, 1y, 5y等)
            interval: 时间间隔 (1m, 5m, 15m, 30m, 1h, 1d, 1wk, 1mo)
            
        Returns:
            K线数据列表
        """
        logger.debug(f"[Finnhub] 获取股票数据: {symbol}, period: {period}, interval: {interval}")
        
        try:
            # 转换参数
            resolution = self._interval_to_resolution(interval)
            start_ts, end_ts = self._period_to_dates(period)
            
            # 请求数据
            data = await self._request('stock/candle', {
                'symbol': symbol,
                'resolution': resolution,
                'from': start_ts,
                'to': end_ts
            })
            
            # 检查状态
            if data.get('s') == 'no_data':
                logger.warning(f"[Finnhub] 未获取到股票 {symbol} 的数据")
                return []
            
            if data.get('s') != 'ok':
                logger.warning(f"[Finnhub] 数据状态异常: {data.get('s')}")
                return []
            
            # 解析数据
            klines = []
            timestamps = data.get('t', [])
            opens = data.get('o', [])
            highs = data.get('h', [])
            lows = data.get('l', [])
            closes = data.get('c', [])
            volumes = data.get('v', [])
            
            for i in range(len(timestamps)):
                kline = KLineData(
                    datetime=datetime.fromtimestamp(timestamps[i]),
                    open=float(opens[i]),
                    high=float(highs[i]),
                    low=float(lows[i]),
                    close=float(closes[i]),
                    volume=int(volumes[i])
                )
                klines.append(kline)
            
            logger.debug(f"[Finnhub] 成功获取股票 {symbol} 的 {len(klines)} 条K线数据")
            return klines
        
        except Exception as e:
            logger.error(f"[Finnhub] 获取股票数据失败: {e}")
            return []
    
    async def get_stock_info(self, symbol: str) -> Optional[StockInfo]:
        """
        获取股票基本信息
        
        Args:
            symbol: 股票代码
            
        Returns:
            股票信息，失败返回None
        """
        logger.debug(f"[Finnhub] 获取股票信息: {symbol}")
        
        try:
            # 获取公司信息
            profile = await self._request('stock/profile2', {'symbol': symbol})
            
            if not profile:
                logger.warning(f"[Finnhub] 未获取到股票 {symbol} 的信息")
                return None
            
            # 获取实时报价
            quote = await self._request('quote', {'symbol': symbol})
            
            stock_info = StockInfo(
                symbol=symbol,
                name=profile.get('name', symbol),
                current_price=quote.get('c', 0.0),
                market_cap=profile.get('marketCapitalization', 0) * 1_000_000,  # 转换为实际市值
                industry=profile.get('finnhubIndustry', '未知'),
                sector=profile.get('finnhubIndustry', '未知'),
                description=f"{profile.get('name', '')} - {profile.get('finnhubIndustry', '')}"
            )
            
            logger.debug(f"[Finnhub] 成功获取股票 {symbol} 的信息")
            return stock_info
        
        except Exception as e:
            logger.error(f"[Finnhub] 获取股票信息失败: {e}")
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
            # 如果返回的当前价格大于0，认为有效
            return quote.get('c', 0) > 0
        except Exception as e:
            logger.error(f"[Finnhub] 验证股票代码失败: {e}")
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
                logger.error(f"[Finnhub] 获取 {symbol} 数据失败: {e}")
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

