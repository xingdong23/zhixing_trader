"""
实时行情监控 - WebSocket 数据流处理
"""
import asyncio
from typing import Dict, Any, Callable, List, Optional
from datetime import datetime
import logging
import json

import ccxt.async_support as ccxt_async

logger = logging.getLogger(__name__)


class MarketMonitor:
    """
    实时行情监控器
    
    功能：
    1. WebSocket 实时行情订阅
    2. K线数据实时更新
    3. 订单簿监控
    4. 成交数据流
    """
    
    def __init__(self, exchange: ccxt_async.Exchange):
        """
        初始化行情监控器
        
        Args:
            exchange: ccxt 交易所实例（需支持 WebSocket）
        """
        self.exchange = exchange
        self.subscriptions: Dict[str, List[Callable]] = {}
        self.running = False
        self.tasks: List[asyncio.Task] = []
        
        # 数据缓存
        self.tickers: Dict[str, Dict] = {}
        self.orderbooks: Dict[str, Dict] = {}
        self.recent_trades: Dict[str, List[Dict]] = {}
        
        logger.info("行情监控器初始化完成")
    
    async def start(self):
        """启动监控"""
        if self.running:
            logger.warning("行情监控器已在运行")
            return
        
        self.running = True
        logger.info("行情监控器启动")
    
    async def stop(self):
        """停止监控"""
        self.running = False
        
        # 取消所有任务
        for task in self.tasks:
            task.cancel()
        
        await asyncio.gather(*self.tasks, return_exceptions=True)
        self.tasks.clear()
        
        logger.info("行情监控器已停止")
    
    async def subscribe_ticker(self, symbol: str, callback: Optional[Callable] = None):
        """
        订阅实时行情
        
        Args:
            symbol: 交易对，如 'BTC/USDT'
            callback: 回调函数，接收 ticker 数据
        """
        logger.info(f"订阅实时行情: {symbol}")
        
        if callback:
            if symbol not in self.subscriptions:
                self.subscriptions[symbol] = []
            self.subscriptions[symbol].append(callback)
        
        # 创建监控任务
        task = asyncio.create_task(self._watch_ticker(symbol))
        self.tasks.append(task)
    
    async def subscribe_orderbook(self, symbol: str, callback: Optional[Callable] = None):
        """
        订阅订单簿
        
        Args:
            symbol: 交易对
            callback: 回调函数，接收 orderbook 数据
        """
        logger.info(f"订阅订单簿: {symbol}")
        
        if callback:
            key = f"{symbol}_orderbook"
            if key not in self.subscriptions:
                self.subscriptions[key] = []
            self.subscriptions[key].append(callback)
        
        task = asyncio.create_task(self._watch_orderbook(symbol))
        self.tasks.append(task)
    
    async def subscribe_trades(self, symbol: str, callback: Optional[Callable] = None):
        """
        订阅成交数据
        
        Args:
            symbol: 交易对
            callback: 回调函数，接收 trades 数据
        """
        logger.info(f"订阅成交数据: {symbol}")
        
        if callback:
            key = f"{symbol}_trades"
            if key not in self.subscriptions:
                self.subscriptions[key] = []
            self.subscriptions[key].append(callback)
        
        task = asyncio.create_task(self._watch_trades(symbol))
        self.tasks.append(task)
    
    async def _watch_ticker(self, symbol: str):
        """监控实时行情"""
        while self.running:
            try:
                # 检查交易所是否支持 WebSocket
                if hasattr(self.exchange, 'watch_ticker'):
                    ticker = await self.exchange.watch_ticker(symbol)
                else:
                    # 降级到轮询模式
                    ticker = await self.exchange.fetch_ticker(symbol)
                    await asyncio.sleep(1)  # 避免频繁请求
                
                # 更新缓存
                self.tickers[symbol] = ticker
                
                # 触发回调
                if symbol in self.subscriptions:
                    for callback in self.subscriptions[symbol]:
                        try:
                            if asyncio.iscoroutinefunction(callback):
                                await callback(ticker)
                            else:
                                callback(ticker)
                        except Exception as e:
                            logger.error(f"回调执行失败: {e}")
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"监控行情失败 {symbol}: {e}")
                await asyncio.sleep(5)  # 错误后等待重试
    
    async def _watch_orderbook(self, symbol: str):
        """监控订单簿"""
        while self.running:
            try:
                if hasattr(self.exchange, 'watch_order_book'):
                    orderbook = await self.exchange.watch_order_book(symbol)
                else:
                    orderbook = await self.exchange.fetch_order_book(symbol)
                    await asyncio.sleep(1)
                
                # 更新缓存
                self.orderbooks[symbol] = orderbook
                
                # 触发回调
                key = f"{symbol}_orderbook"
                if key in self.subscriptions:
                    for callback in self.subscriptions[key]:
                        try:
                            if asyncio.iscoroutinefunction(callback):
                                await callback(orderbook)
                            else:
                                callback(orderbook)
                        except Exception as e:
                            logger.error(f"回调执行失败: {e}")
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"监控订单簿失败 {symbol}: {e}")
                await asyncio.sleep(5)
    
    async def _watch_trades(self, symbol: str):
        """监控成交数据"""
        while self.running:
            try:
                if hasattr(self.exchange, 'watch_trades'):
                    trades = await self.exchange.watch_trades(symbol)
                else:
                    trades = await self.exchange.fetch_trades(symbol, limit=50)
                    await asyncio.sleep(1)
                
                # 更新缓存（保留最近100条）
                if symbol not in self.recent_trades:
                    self.recent_trades[symbol] = []
                
                self.recent_trades[symbol].extend(trades)
                self.recent_trades[symbol] = self.recent_trades[symbol][-100:]
                
                # 触发回调
                key = f"{symbol}_trades"
                if key in self.subscriptions:
                    for callback in self.subscriptions[key]:
                        try:
                            if asyncio.iscoroutinefunction(callback):
                                await callback(trades)
                            else:
                                callback(trades)
                        except Exception as e:
                            logger.error(f"回调执行失败: {e}")
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"监控成交数据失败 {symbol}: {e}")
                await asyncio.sleep(5)
    
    def get_ticker(self, symbol: str) -> Optional[Dict]:
        """获取最新行情"""
        return self.tickers.get(symbol)
    
    def get_orderbook(self, symbol: str) -> Optional[Dict]:
        """获取最新订单簿"""
        return self.orderbooks.get(symbol)
    
    def get_recent_trades(self, symbol: str, limit: int = 20) -> List[Dict]:
        """获取最近成交"""
        trades = self.recent_trades.get(symbol, [])
        return trades[-limit:]
    
    def get_market_summary(self, symbol: str) -> Dict[str, Any]:
        """获取市场摘要"""
        ticker = self.get_ticker(symbol)
        orderbook = self.get_orderbook(symbol)
        recent_trades = self.get_recent_trades(symbol, 10)
        
        summary = {
            'symbol': symbol,
            'timestamp': datetime.now().isoformat(),
            'ticker': None,
            'orderbook_snapshot': None,
            'recent_trades_count': len(recent_trades)
        }
        
        if ticker:
            summary['ticker'] = {
                'last': ticker.get('last'),
                'bid': ticker.get('bid'),
                'ask': ticker.get('ask'),
                'volume': ticker.get('volume'),
                'change': ticker.get('change'),
                'percentage': ticker.get('percentage')
            }
        
        if orderbook:
            summary['orderbook_snapshot'] = {
                'best_bid': orderbook['bids'][0] if orderbook.get('bids') else None,
                'best_ask': orderbook['asks'][0] if orderbook.get('asks') else None,
                'bid_depth': len(orderbook.get('bids', [])),
                'ask_depth': len(orderbook.get('asks', []))
            }
        
        return summary


class KlineMonitor:
    """
    K线数据监控器
    
    实时更新K线数据，支持多周期
    """
    
    def __init__(self, exchange: ccxt_async.Exchange):
        """
        初始化K线监控器
        
        Args:
            exchange: ccxt 交易所实例
        """
        self.exchange = exchange
        self.klines: Dict[str, Dict[str, List[Dict]]] = {}  # {symbol: {timeframe: klines}}
        self.running = False
        self.tasks: List[asyncio.Task] = []
        
        logger.info("K线监控器初始化完成")
    
    async def start(self):
        """启动监控"""
        self.running = True
        logger.info("K线监控器启动")
    
    async def stop(self):
        """停止监控"""
        self.running = False
        
        for task in self.tasks:
            task.cancel()
        
        await asyncio.gather(*self.tasks, return_exceptions=True)
        self.tasks.clear()
        
        logger.info("K线监控器已停止")
    
    async def subscribe_kline(self, symbol: str, timeframe: str = '1m', 
                             callback: Optional[Callable] = None):
        """
        订阅K线数据
        
        Args:
            symbol: 交易对
            timeframe: 时间周期，如 '1m', '5m', '15m', '1h', '4h', '1d'
            callback: 回调函数，接收新K线数据
        """
        logger.info(f"订阅K线数据: {symbol} {timeframe}")
        
        # 初始化存储
        if symbol not in self.klines:
            self.klines[symbol] = {}
        if timeframe not in self.klines[symbol]:
            self.klines[symbol][timeframe] = []
        
        # 创建监控任务
        task = asyncio.create_task(self._watch_kline(symbol, timeframe, callback))
        self.tasks.append(task)
    
    async def _watch_kline(self, symbol: str, timeframe: str, callback: Optional[Callable]):
        """监控K线数据"""
        # 首次加载历史数据
        try:
            ohlcv = await self.exchange.fetch_ohlcv(symbol, timeframe, limit=500)
            self.klines[symbol][timeframe] = self._convert_ohlcv(ohlcv)
            logger.info(f"加载历史K线: {symbol} {timeframe}, {len(ohlcv)} 条")
        except Exception as e:
            logger.error(f"加载历史K线失败: {e}")
        
        # 持续更新
        while self.running:
            try:
                if hasattr(self.exchange, 'watch_ohlcv'):
                    # WebSocket 模式
                    ohlcv = await self.exchange.watch_ohlcv(symbol, timeframe)
                else:
                    # 轮询模式
                    ohlcv = await self.exchange.fetch_ohlcv(symbol, timeframe, limit=1)
                    await asyncio.sleep(self._get_sleep_time(timeframe))
                
                # 更新K线数据
                new_klines = self._convert_ohlcv(ohlcv)
                self._update_klines(symbol, timeframe, new_klines)
                
                # 触发回调
                if callback:
                    try:
                        if asyncio.iscoroutinefunction(callback):
                            await callback(new_klines[-1])
                        else:
                            callback(new_klines[-1])
                    except Exception as e:
                        logger.error(f"回调执行失败: {e}")
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"监控K线失败 {symbol} {timeframe}: {e}")
                await asyncio.sleep(10)
    
    def _convert_ohlcv(self, ohlcv: List) -> List[Dict]:
        """转换OHLCV数据格式"""
        return [
            {
                'timestamp': candle[0],
                'open': candle[1],
                'high': candle[2],
                'low': candle[3],
                'close': candle[4],
                'volume': candle[5]
            }
            for candle in ohlcv
        ]
    
    def _update_klines(self, symbol: str, timeframe: str, new_klines: List[Dict]):
        """更新K线数据"""
        if not new_klines:
            return
        
        existing = self.klines[symbol][timeframe]
        
        for new_kline in new_klines:
            # 检查是否是更新最后一根K线
            if existing and existing[-1]['timestamp'] == new_kline['timestamp']:
                existing[-1] = new_kline
            else:
                existing.append(new_kline)
        
        # 保留最近1000根K线
        self.klines[symbol][timeframe] = existing[-1000:]
    
    def _get_sleep_time(self, timeframe: str) -> int:
        """根据时间周期获取轮询间隔"""
        intervals = {
            '1m': 10,
            '5m': 30,
            '15m': 60,
            '1h': 120,
            '4h': 300,
            '1d': 600
        }
        return intervals.get(timeframe, 60)
    
    def get_klines(self, symbol: str, timeframe: str, limit: Optional[int] = None) -> List[Dict]:
        """获取K线数据"""
        klines = self.klines.get(symbol, {}).get(timeframe, [])
        
        if limit:
            return klines[-limit:]
        return klines
    
    def get_latest_kline(self, symbol: str, timeframe: str) -> Optional[Dict]:
        """获取最新K线"""
        klines = self.get_klines(symbol, timeframe, limit=1)
        return klines[0] if klines else None
