"""
富途OpenAPI客户端
"""
import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime
import futu as ft
from loguru import logger

from .config import settings
from .models import StockInfo, QuoteData, WatchlistGroup, KLineData


class FutuApiClient:
    """富途API客户端"""
    
    def __init__(self):
        self.quote_ctx = None
        self.trade_ctx = None
        self.is_connected = False
        self.subscribed_stocks = set()
    
    async def connect(self) -> bool:
        """连接到富途OpenAPI"""
        try:
            logger.info(f"Attempting to connect to Futu OpenAPI at {settings.futu_host}:{settings.futu_port}")

            # 创建行情上下文
            self.quote_ctx = ft.OpenQuoteContext(
                host=settings.futu_host,
                port=settings.futu_port
            )

            # 测试连接
            ret, data = self.quote_ctx.get_global_state()
            if ret != ft.RET_OK:
                raise Exception(f"Failed to get global state: {data}")

            # 创建交易上下文（用于获取自选股）
            self.trade_ctx = ft.OpenSecTradeContext(
                filter_trdmarket=ft.TrdMarket.HK,  # 可以根据需要调整
                host=settings.futu_host,
                port=settings.futu_port,
                security_firm=ft.SecurityFirm.FUTUSECURITIES
            )

            # 解锁交易（如果需要）
            if settings.futu_password:
                ret, data = self.trade_ctx.unlock_trade(settings.futu_password)
                if ret != ft.RET_OK:
                    logger.warning(f"Failed to unlock trade: {data}")

            self.is_connected = True
            logger.info("Successfully connected to Futu OpenAPI")
            return True

        except Exception as e:
            logger.warning(f"Failed to connect to Futu OpenAPI: {e}")
            self.is_connected = False
            # 清理连接
            if self.quote_ctx:
                try:
                    self.quote_ctx.close()
                except:
                    pass
                self.quote_ctx = None
            if self.trade_ctx:
                try:
                    self.trade_ctx.close()
                except:
                    pass
                self.trade_ctx = None
            return False
    
    async def disconnect(self):
        """断开连接"""
        try:
            if self.quote_ctx:
                self.quote_ctx.close()
            if self.trade_ctx:
                self.trade_ctx.close()
            
            self.is_connected = False
            logger.info("Disconnected from Futu OpenAPI")
            
        except Exception as e:
            logger.error(f"Error during disconnect: {e}")
    
    def _parse_market(self, market_code: str) -> str:
        """解析市场代码"""
        market_map = {
            ft.Market.HK: "HK",
            ft.Market.US: "US", 
            ft.Market.SH: "CN",
            ft.Market.SZ: "CN",
        }
        return market_map.get(market_code, "US")
    
    def _get_market_by_code(self, code: str) -> ft.Market:
        """根据股票代码推断市场"""
        if code.startswith("HK") or (code.isdigit() and len(code) == 5):
            return ft.Market.HK
        elif code.isalpha():
            return ft.Market.US
        elif code.startswith("SH") or code.startswith("sh"):
            return ft.Market.SH
        elif code.startswith("SZ") or code.startswith("sz"):
            return ft.Market.SZ
        else:
            return ft.Market.US  # 默认美股
    
    async def get_watchlist(self) -> List[WatchlistGroup]:
        """获取自选股列表"""
        if not self.is_connected:
            raise Exception("Not connected to Futu API")
        
        try:
            # 获取自选股分组
            ret, data = self.quote_ctx.get_user_security_group()
            if ret != ft.RET_OK:
                raise Exception(f"Failed to get watchlist: {data}")
            
            groups = []
            for group_info in data:
                group_id = str(group_info['group_id'])
                group_name = group_info['group_name']
                
                # 获取分组内的股票
                ret, stocks_data = self.quote_ctx.get_user_security_group(group_name)
                if ret != ft.RET_OK:
                    logger.warning(f"Failed to get stocks for group {group_name}: {stocks_data}")
                    continue
                
                stocks = []
                for stock_info in stocks_data:
                    stock = StockInfo(
                        code=stock_info['code'],
                        name=stock_info['name'],
                        market=self._parse_market(stock_info['market']),
                        lot_size=stock_info.get('lot_size', 100),
                        sec_type=stock_info.get('sec_type', 'STOCK')
                    )
                    stocks.append(stock)
                
                group = WatchlistGroup(
                    group_id=group_id,
                    group_name=group_name,
                    stocks=stocks
                )
                groups.append(group)
            
            logger.info(f"Retrieved {len(groups)} watchlist groups")
            return groups
            
        except Exception as e:
            logger.error(f"Failed to get watchlist: {e}")
            raise
    
    async def get_quotes(self, codes: List[str]) -> List[QuoteData]:
        """获取股票行情"""
        if not self.is_connected:
            raise Exception("Not connected to Futu API")
        
        try:
            # 按市场分组股票代码
            market_codes = {}
            for code in codes:
                market = self._get_market_by_code(code)
                if market not in market_codes:
                    market_codes[market] = []
                market_codes[market].append(code)
            
            all_quotes = []
            
            # 分市场获取行情
            for market, stock_codes in market_codes.items():
                ret, data = self.quote_ctx.get_market_snapshot(stock_codes)
                if ret != ft.RET_OK:
                    logger.warning(f"Failed to get quotes for market {market}: {data}")
                    continue
                
                for quote_info in data:
                    quote = QuoteData(
                        code=quote_info['code'],
                        name=quote_info['name'],
                        cur_price=quote_info['cur_price'],
                        prev_close_price=quote_info.get('prev_close_price'),
                        open_price=quote_info.get('open_price'),
                        high_price=quote_info.get('high_price'),
                        low_price=quote_info.get('low_price'),
                        volume=quote_info.get('volume'),
                        turnover=quote_info.get('turnover'),
                        change_val=quote_info.get('change_val'),
                        change_rate=quote_info.get('change_rate'),
                        amplitude=quote_info.get('amplitude'),
                        update_time=quote_info.get('update_time')
                    )
                    all_quotes.append(quote)
            
            logger.info(f"Retrieved quotes for {len(all_quotes)} stocks")
            return all_quotes
            
        except Exception as e:
            logger.error(f"Failed to get quotes: {e}")
            raise
    
    async def get_kline_data(
        self, 
        code: str, 
        period: str = "K_DAY", 
        count: int = 100
    ) -> List[KLineData]:
        """获取K线数据"""
        if not self.is_connected:
            raise Exception("Not connected to Futu API")
        
        try:
            market = self._get_market_by_code(code)
            
            # 转换周期参数
            ktype_map = {
                "K_1M": ft.KLType.K_1M,
                "K_5M": ft.KLType.K_5M,
                "K_15M": ft.KLType.K_15M,
                "K_30M": ft.KLType.K_30M,
                "K_60M": ft.KLType.K_60M,
                "K_DAY": ft.KLType.K_DAY,
                "K_WEEK": ft.KLType.K_WEEK,
                "K_MON": ft.KLType.K_MON,
            }
            
            ktype = ktype_map.get(period, ft.KLType.K_DAY)
            
            ret, data = self.quote_ctx.get_history_kline(
                code=code,
                num=count,
                ktype=ktype,
                autype=ft.AuType.QFQ  # 前复权
            )
            
            if ret != ft.RET_OK:
                raise Exception(f"Failed to get K-line data: {data}")
            
            klines = []
            for kline_info in data:
                kline = KLineData(
                    code=code,
                    time_key=kline_info['time_key'],
                    open_price=kline_info['open'],
                    close_price=kline_info['close'],
                    high_price=kline_info['high'],
                    low_price=kline_info['low'],
                    volume=kline_info.get('volume'),
                    turnover=kline_info.get('turnover'),
                    pe=kline_info.get('pe'),
                    change_rate=kline_info.get('change_rate')
                )
                klines.append(kline)
            
            logger.info(f"Retrieved {len(klines)} K-line records for {code}")
            return klines
            
        except Exception as e:
            logger.error(f"Failed to get K-line data for {code}: {e}")
            raise
    
    async def subscribe_quotes(self, codes: List[str]) -> bool:
        """订阅实时行情"""
        if not self.is_connected:
            raise Exception("Not connected to Futu API")
        
        try:
            # 按市场分组
            market_codes = {}
            for code in codes:
                market = self._get_market_by_code(code)
                if market not in market_codes:
                    market_codes[market] = []
                market_codes[market].append(code)
            
            # 分市场订阅
            for market, stock_codes in market_codes.items():
                ret, data = self.quote_ctx.subscribe(stock_codes, [ft.SubType.QUOTE])
                if ret != ft.RET_OK:
                    logger.warning(f"Failed to subscribe quotes for market {market}: {data}")
                    continue
                
                self.subscribed_stocks.update(stock_codes)
            
            logger.info(f"Subscribed to quotes for {len(codes)} stocks")
            return True
            
        except Exception as e:
            logger.error(f"Failed to subscribe quotes: {e}")
            return False
    
    async def unsubscribe_quotes(self, codes: List[str]) -> bool:
        """取消订阅实时行情"""
        if not self.is_connected:
            raise Exception("Not connected to Futu API")
        
        try:
            # 按市场分组
            market_codes = {}
            for code in codes:
                if code in self.subscribed_stocks:
                    market = self._get_market_by_code(code)
                    if market not in market_codes:
                        market_codes[market] = []
                    market_codes[market].append(code)
            
            # 分市场取消订阅
            for market, stock_codes in market_codes.items():
                ret, data = self.quote_ctx.unsubscribe(stock_codes, [ft.SubType.QUOTE])
                if ret != ft.RET_OK:
                    logger.warning(f"Failed to unsubscribe quotes for market {market}: {data}")
                    continue
                
                self.subscribed_stocks.difference_update(stock_codes)
            
            logger.info(f"Unsubscribed from quotes for {len(codes)} stocks")
            return True
            
        except Exception as e:
            logger.error(f"Failed to unsubscribe quotes: {e}")
            return False
    
    def get_status(self) -> Dict[str, Any]:
        """获取客户端状态"""
        return {
            "connected": self.is_connected,
            "subscribed_stocks_count": len(self.subscribed_stocks),
            "quote_ctx_ready": self.quote_ctx is not None,
            "trade_ctx_ready": self.trade_ctx is not None,
        }


# 全局富途客户端实例
futu_client = FutuApiClient()
