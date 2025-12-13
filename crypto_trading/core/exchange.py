"""
统一的交易所接口，封装 ccxt
"""
import ccxt
import pandas as pd
import logging
from typing import Optional, Dict, List, Any

logger = logging.getLogger(__name__)


class ExchangeClient:
    """
    统一的交易所客户端
    封装 ccxt，提供简洁的交易所操作接口
    """
    
    SUPPORTED_EXCHANGES = ['okx', 'binance', 'bybit']
    
    def __init__(
        self,
        exchange_name: str,
        api_key: str = "",
        secret: str = "",
        password: str = "",
        sandbox: bool = False,
        options: Optional[Dict] = None
    ):
        """
        初始化交易所客户端
        
        Args:
            exchange_name: 交易所名称 (okx, binance, bybit)
            api_key: API Key
            secret: Secret Key
            password: Passphrase (OKX 需要)
            sandbox: 是否使用沙盒模式
            options: 额外选项
        """
        if exchange_name not in self.SUPPORTED_EXCHANGES:
            raise ValueError(f"Unsupported exchange: {exchange_name}")
        
        self.exchange_name = exchange_name
        self.exchange = self._init_exchange(
            exchange_name, api_key, secret, password, sandbox, options or {}
        )
        
        logger.info(f"ExchangeClient initialized: {exchange_name}")
    
    def _init_exchange(
        self,
        name: str,
        api_key: str,
        secret: str,
        password: str,
        sandbox: bool,
        options: Dict
    ) -> ccxt.Exchange:
        """初始化 ccxt 交易所实例"""
        exchange_class = getattr(ccxt, name)
        
        config = {
            'apiKey': api_key,
            'secret': secret,
            'enableRateLimit': True,
            'options': options
        }
        
        if password:
            config['password'] = password
        
        exchange = exchange_class(config)
        
        if sandbox:
            exchange.set_sandbox_mode(True)
        
        return exchange
    
    # ==================== 行情接口 ====================
    
    def fetch_ohlcv(
        self,
        symbol: str,
        timeframe: str = '4h',
        limit: int = 100
    ) -> pd.DataFrame:
        """
        获取 K 线数据
        
        Args:
            symbol: 交易对 (e.g., 'DOGE/USDT:USDT')
            timeframe: 时间周期 (e.g., '1h', '4h', '1d')
            limit: 获取数量
            
        Returns:
            DataFrame with columns: [date, open, high, low, close, volume]
        """
        try:
            ohlcv = self.exchange.fetch_ohlcv(symbol, timeframe, limit=limit)
            df = pd.DataFrame(
                ohlcv,
                columns=['timestamp', 'open', 'high', 'low', 'close', 'volume']
            )
            df['date'] = pd.to_datetime(df['timestamp'], unit='ms')
            
            # 确保数值类型
            for col in ['open', 'high', 'low', 'close', 'volume']:
                df[col] = df[col].astype(float)
            
            return df
        except Exception as e:
            logger.error(f"Failed to fetch OHLCV: {e}")
            raise
    
    def fetch_ticker(self, symbol: str) -> Dict[str, Any]:
        """
        获取最新行情
        
        Returns:
            dict with 'last', 'bid', 'ask', 'high', 'low', 'volume', etc.
        """
        try:
            return self.exchange.fetch_ticker(symbol)
        except Exception as e:
            logger.error(f"Failed to fetch ticker: {e}")
            raise
    
    def get_current_price(self, symbol: str) -> float:
        """获取当前价格"""
        ticker = self.fetch_ticker(symbol)
        return float(ticker.get('last', 0))
    
    # ==================== 账户接口 ====================
    
    def fetch_balance(self, currency: str = 'USDT') -> Dict[str, float]:
        """
        获取账户余额
        
        Returns:
            dict with 'total', 'free', 'used'
        """
        try:
            balance = self.exchange.fetch_balance()
            currency_balance = balance.get(currency, {})
            return {
                'total': float(currency_balance.get('total', 0)),
                'free': float(currency_balance.get('free', 0)),
                'used': float(currency_balance.get('used', 0))
            }
        except Exception as e:
            logger.error(f"Failed to fetch balance: {e}")
            raise
    
    def fetch_positions(self, symbol: str = None) -> List[Dict]:
        """
        获取持仓信息
        
        Args:
            symbol: 交易对，None 表示获取所有
            
        Returns:
            List of position dicts
        """
        try:
            symbols = [symbol] if symbol else None
            positions = self.exchange.fetch_positions(symbols)
            return positions
        except Exception as e:
            logger.error(f"Failed to fetch positions: {e}")
            raise
    
    def get_position(self, symbol: str) -> Optional[Dict]:
        """获取指定交易对的持仓"""
        positions = self.fetch_positions(symbol)
        for pos in positions:
            if pos['symbol'] == symbol and float(pos.get('contracts', 0)) > 0:
                return pos
        return None
    
    # ==================== 交易接口 ====================
    
    def set_leverage(self, leverage: int, symbol: str) -> bool:
        """设置杠杆"""
        try:
            self.exchange.set_leverage(leverage, symbol)
            logger.info(f"Leverage set to {leverage}x for {symbol}")
            return True
        except Exception as e:
            logger.warning(f"Failed to set leverage: {e}")
            return False
    
    def set_margin_mode(self, mode: str, symbol: str) -> bool:
        """设置保证金模式 (isolated/cross)"""
        try:
            self.exchange.set_margin_mode(mode, symbol)
            logger.info(f"Margin mode set to {mode} for {symbol}")
            return True
        except Exception as e:
            logger.warning(f"Failed to set margin mode: {e}")
            return False
    
    def create_market_order(
        self,
        symbol: str,
        side: str,
        amount: float,
        reduce_only: bool = False
    ) -> Dict:
        """
        创建市价单
        
        Args:
            symbol: 交易对
            side: 'buy' or 'sell'
            amount: 数量
            reduce_only: 是否只减仓
            
        Returns:
            Order info dict
        """
        try:
            params = {'reduceOnly': reduce_only} if reduce_only else {}
            order = self.exchange.create_market_order(symbol, side, amount, params=params)
            logger.info(f"Market order created: {side} {amount} {symbol}")
            return order
        except Exception as e:
            logger.error(f"Failed to create order: {e}")
            raise
    
    def create_limit_order(
        self,
        symbol: str,
        side: str,
        amount: float,
        price: float
    ) -> Dict:
        """创建限价单"""
        try:
            order = self.exchange.create_limit_order(symbol, side, amount, price)
            logger.info(f"Limit order created: {side} {amount} {symbol} @ {price}")
            return order
        except Exception as e:
            logger.error(f"Failed to create limit order: {e}")
            raise
    
    def cancel_order(self, order_id: str, symbol: str) -> bool:
        """取消订单"""
        try:
            self.exchange.cancel_order(order_id, symbol)
            logger.info(f"Order cancelled: {order_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to cancel order: {e}")
            return False
    
    # ==================== 辅助方法 ====================
    
    def get_account_summary(self, symbol: str = None) -> Dict:
        """
        获取账户摘要信息（余额 + 持仓 + 当前价格）
        
        Returns:
            dict with balance, position, price info
        """
        summary = {
            'exchange': self.exchange_name,
            'connected': True
        }
        
        try:
            # 余额
            balance = self.fetch_balance()
            summary['balance'] = balance
            
            # 持仓
            if symbol:
                position = self.get_position(symbol)
                if position:
                    summary['position'] = {
                        'symbol': symbol,
                        'contracts': float(position.get('contracts', 0)),
                        'entry_price': float(position.get('entryPrice', 0)),
                        'unrealized_pnl': float(position.get('unrealizedPnl', 0)),
                        'leverage': position.get('leverage', 0)
                    }
                else:
                    summary['position'] = None
                
                # 当前价格
                summary['current_price'] = self.get_current_price(symbol)
            
            return summary
        except Exception as e:
            logger.error(f"Failed to get account summary: {e}")
            summary['connected'] = False
            summary['error'] = str(e)
            return summary
