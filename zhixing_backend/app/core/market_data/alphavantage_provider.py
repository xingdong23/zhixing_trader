"""
Alpha Vantage 数据提供者
实现从 Alpha Vantage API 获取股票数据
官方文档: https://www.alphavantage.co/documentation/
"""
import aiohttp
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from loguru import logger
import os

from ..interfaces import IMarketDataProvider, KLineData


class AlphaVantageProvider(IMarketDataProvider):
    """Alpha Vantage 数据提供者实现"""
    
    def __init__(self, api_key: Optional[str] = None, rate_limit_delay: float = 12.0):
        """
        初始化 Alpha Vantage Provider
        
        Args:
            api_key: Alpha Vantage API 密钥
            rate_limit_delay: API 调用间隔（免费版限制：5次/分钟，即12秒/次）
        """
        self.api_key = api_key or os.getenv("ALPHA_VANTAGE_API_KEY", "demo")
        self.base_url = "https://www.alphavantage.co/query"
        self.rate_limit_delay = rate_limit_delay
        self.last_request_time = 0
    
    async def _rate_limit(self):
        """实施速率限制"""
        now = asyncio.get_event_loop().time()
        time_since_last = now - self.last_request_time
        
        if time_since_last < self.rate_limit_delay:
            await asyncio.sleep(self.rate_limit_delay - time_since_last)
        
        self.last_request_time = asyncio.get_event_loop().time()
    
    async def _make_request(self, params: Dict[str, str]) -> Optional[Dict]:
        """发起 API 请求"""
        try:
            await self._rate_limit()
            
            params["apikey"] = self.api_key
            
            async with aiohttp.ClientSession() as session:
                async with session.get(self.base_url, params=params, timeout=aiohttp.ClientTimeout(total=30)) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        # 检查 API 错误
                        if "Error Message" in data:
                            logger.error(f"Alpha Vantage API错误: {data['Error Message']}")
                            return None
                        
                        if "Note" in data:
                            logger.warning(f"Alpha Vantage API限流: {data['Note']}")
                            return None
                        
                        return data
                    else:
                        logger.error(f"Alpha Vantage API请求失败: {response.status}")
                        return None
        
        except asyncio.TimeoutError:
            logger.error("Alpha Vantage API请求超时")
            return None
        except Exception as e:
            logger.error(f"Alpha Vantage API请求异常: {e}")
            return None
    
    def _parse_interval(self, interval: str) -> tuple[str, str]:
        """
        将内部interval格式转换为Alpha Vantage API参数
        
        Args:
            interval: 内部格式 (如 "1d", "1h", "15m")
        
        Returns:
            (function, interval) 元组
        """
        if interval == "1d":
            return "TIME_SERIES_DAILY", None
        elif interval == "1h" or interval == "60m":
            return "TIME_SERIES_INTRADAY", "60min"
        elif interval == "15m":
            return "TIME_SERIES_INTRADAY", "15min"
        elif interval == "5m":
            return "TIME_SERIES_INTRADAY", "5min"
        elif interval == "1m":
            return "TIME_SERIES_INTRADAY", "1min"
        else:
            # 默认返回日线
            return "TIME_SERIES_DAILY", None
    
    async def get_stock_data(self, symbol: str, period: str, interval: str) -> List[KLineData]:
        """
        获取股票K线数据
        
        Args:
            symbol: 股票代码 (如 "AAPL", "IBM")
            period: 时间范围 (如 "1y", "6mo", "1mo") - 用于计算outputsize
            interval: 时间间隔 (如 "1d", "1h", "15m")
        
        Returns:
            K线数据列表
        """
        try:
            logger.debug(f"[AlphaVantage] 获取股票数据: {symbol}, period: {period}, interval: {interval}")
            
            function, av_interval = self._parse_interval(interval)
            
            # 构建请求参数
            params = {
                "function": function,
                "symbol": symbol,
                "outputsize": "full"  # 获取完整历史数据
            }
            
            # 对于日内数据，添加 interval 参数
            if av_interval:
                params["interval"] = av_interval
            
            # 发起请求
            data = await self._make_request(params)
            
            if not data:
                logger.warning(f"未获取到股票 {symbol} 的数据")
                return []
            
            # 解析数据
            kline_data = self._parse_time_series(data, symbol, function)
            
            # 根据 period 过滤数据
            kline_data = self._filter_by_period(kline_data, period)
            
            logger.debug(f"[AlphaVantage] 成功获取股票 {symbol} 的 {len(kline_data)} 条K线数据")
            return kline_data
        
        except Exception as e:
            logger.error(f"[AlphaVantage] 获取股票 {symbol} 数据失败: {e}")
            return []
    
    def _parse_time_series(self, data: Dict, symbol: str, function: str) -> List[KLineData]:
        """解析 Alpha Vantage 时间序列数据"""
        kline_data = []
        
        try:
            # 根据 function 确定时间序列的 key
            time_series_key = None
            if function == "TIME_SERIES_DAILY":
                time_series_key = "Time Series (Daily)"
            elif function == "TIME_SERIES_INTRADAY":
                # 查找包含 "Time Series" 的 key
                for key in data.keys():
                    if "Time Series" in key:
                        time_series_key = key
                        break
            
            if not time_series_key or time_series_key not in data:
                logger.error(f"未找到时间序列数据，可用keys: {list(data.keys())}")
                return []
            
            time_series = data[time_series_key]
            
            # 解析每个时间点的数据
            for timestamp, values in time_series.items():
                try:
                    # 解析时间戳
                    dt = datetime.strptime(timestamp, "%Y-%m-%d %H:%M:%S") if " " in timestamp else datetime.strptime(timestamp, "%Y-%m-%d")
                    
                    # 解析 OHLCV 数据
                    kline = KLineData(
                        datetime=dt,
                        open=float(values.get("1. open", 0)),
                        high=float(values.get("2. high", 0)),
                        low=float(values.get("3. low", 0)),
                        close=float(values.get("4. close", 0)),
                        volume=int(values.get("5. volume", 0)),
                        symbol=symbol
                    )
                    kline_data.append(kline)
                
                except (ValueError, KeyError) as e:
                    logger.warning(f"解析数据点失败: {timestamp}, {e}")
                    continue
            
            # 按时间排序（从旧到新）
            kline_data.sort(key=lambda x: x.datetime)
            
            return kline_data
        
        except Exception as e:
            logger.error(f"解析时间序列数据失败: {e}")
            return []
    
    def _filter_by_period(self, kline_data: List[KLineData], period: str) -> List[KLineData]:
        """根据时间范围过滤数据"""
        if not kline_data:
            return []
        
        try:
            # 解析 period
            now = datetime.now()
            
            if period == "1d":
                cutoff = now - timedelta(days=1)
            elif period == "5d":
                cutoff = now - timedelta(days=5)
            elif period == "1mo":
                cutoff = now - timedelta(days=30)
            elif period == "3mo":
                cutoff = now - timedelta(days=90)
            elif period == "6mo":
                cutoff = now - timedelta(days=180)
            elif period == "1y":
                cutoff = now - timedelta(days=365)
            elif period == "2y":
                cutoff = now - timedelta(days=730)
            elif period == "5y":
                cutoff = now - timedelta(days=1825)
            elif period == "max":
                return kline_data  # 返回所有数据
            else:
                # 默认返回最近一年
                cutoff = now - timedelta(days=365)
            
            # 过滤数据
            filtered = [k for k in kline_data if k.datetime >= cutoff]
            return filtered
        
        except Exception as e:
            logger.error(f"过滤数据失败: {e}")
            return kline_data
    
    async def get_stock_info(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        获取股票基本信息
        使用 Alpha Vantage OVERVIEW API
        """
        try:
            logger.debug(f"[AlphaVantage] 获取股票 {symbol} 基本信息")
            
            params = {
                "function": "OVERVIEW",
                "symbol": symbol
            }
            
            data = await self._make_request(params)
            
            if not data or not data.get("Symbol"):
                logger.warning(f"未获取到股票 {symbol} 的基本信息")
                return None
            
            # 转换为统一格式
            return {
                "symbol": symbol,
                "name": data.get("Name", symbol),
                "current_price": 0,  # OVERVIEW不包含实时价格，需要另外获取
                "market_cap": int(data.get("MarketCapitalization", 0)),
                "industry": data.get("Industry", ""),
                "sector": data.get("Sector", ""),
                "currency": data.get("Currency", "USD"),
                "exchange": data.get("Exchange", ""),
                "description": data.get("Description", ""),
                "pe_ratio": float(data.get("PERatio", 0) or 0),
                "dividend_yield": float(data.get("DividendYield", 0) or 0),
            }
        
        except Exception as e:
            logger.error(f"[AlphaVantage] 获取股票 {symbol} 基本信息失败: {e}")
            return None
    
    async def validate_symbol(self, symbol: str) -> bool:
        """验证股票代码是否有效"""
        try:
            # 尝试获取最近5天的数据
            data = await self.get_stock_data(symbol, "5d", "1d")
            return len(data) > 0
        
        except Exception as e:
            logger.error(f"[AlphaVantage] 验证股票代码 {symbol} 失败: {e}")
            return False
    
    async def get_quote(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        获取股票实时报价
        使用 GLOBAL_QUOTE API
        """
        try:
            logger.debug(f"[AlphaVantage] 获取股票 {symbol} 实时报价")
            
            params = {
                "function": "GLOBAL_QUOTE",
                "symbol": symbol
            }
            
            data = await self._make_request(params)
            
            if not data or "Global Quote" not in data:
                return None
            
            quote = data["Global Quote"]
            
            return {
                "symbol": symbol,
                "price": float(quote.get("05. price", 0)),
                "change": float(quote.get("09. change", 0)),
                "change_percent": quote.get("10. change percent", "0%").rstrip("%"),
                "volume": int(quote.get("06. volume", 0)),
                "latest_trading_day": quote.get("07. latest trading day", ""),
                "previous_close": float(quote.get("08. previous close", 0)),
                "open": float(quote.get("02. open", 0)),
                "high": float(quote.get("03. high", 0)),
                "low": float(quote.get("04. low", 0)),
            }
        
        except Exception as e:
            logger.error(f"[AlphaVantage] 获取股票 {symbol} 实时报价失败: {e}")
            return None

