"""
交易所管理器 - 统一管理所有交易所连接
"""
import ccxt
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


class ExchangeManager:
    """交易所管理器"""
    
    def __init__(self):
        self.exchanges: Dict[str, ccxt.Exchange] = {}
    
    def get_exchange(self, exchange_name: str, testnet: bool = True) -> ccxt.Exchange:
        """
        获取交易所实例
        
        Args:
            exchange_name: 交易所名称 (binance, okx, etc.)
            testnet: 是否使用测试网
        
        Returns:
            交易所实例
        """
        key = f"{exchange_name}_{'testnet' if testnet else 'mainnet'}"
        
        if key not in self.exchanges:
            self.exchanges[key] = self._create_exchange(exchange_name, testnet)
        
        return self.exchanges[key]
    
    def _create_exchange(self, exchange_name: str, testnet: bool) -> ccxt.Exchange:
        """
        创建交易所实例
        
        Args:
            exchange_name: 交易所名称
            testnet: 是否使用测试网
        
        Returns:
            交易所实例
        """
        from app.config import settings
        
        # 获取交易所类
        exchange_class = getattr(ccxt, exchange_name)
        
        # 配置参数
        config = {
            'enableRateLimit': True,
        }
        
        # 根据交易所配置API密钥
        if exchange_name == 'binance':
            if settings.BINANCE_API_KEY and settings.BINANCE_API_SECRET:
                config['apiKey'] = settings.BINANCE_API_KEY
                config['secret'] = settings.BINANCE_API_SECRET
            if testnet:
                config['options'] = {'defaultType': 'future'}
                config['urls'] = {
                    'test': {
                        'dapiPublic': 'https://testnet.binancefuture.com/dapi/v1',
                        'dapiPrivate': 'https://testnet.binancefuture.com/dapi/v1',
                        'fapiPublic': 'https://testnet.binancefuture.com/fapi/v1',
                        'fapiPrivate': 'https://testnet.binancefuture.com/fapi/v1',
                    }
                }
        
        elif exchange_name == 'okx':
            if settings.OKX_API_KEY and settings.OKX_API_SECRET and settings.OKX_PASSPHRASE:
                config['apiKey'] = settings.OKX_API_KEY
                config['secret'] = settings.OKX_API_SECRET
                config['password'] = settings.OKX_PASSPHRASE
            if testnet:
                config['hostname'] = 'okx.com'
        
        # 创建交易所实例
        exchange = exchange_class(config)
        
        if testnet:
            exchange.set_sandbox_mode(True)
        
        logger.info(f"创建交易所实例: {exchange_name} ({'测试网' if testnet else '主网'})")
        
        return exchange
    
    async def close_all(self):
        """关闭所有交易所连接"""
        for key, exchange in self.exchanges.items():
            try:
                await exchange.close()
                logger.info(f"关闭交易所连接: {key}")
            except Exception as e:
                logger.error(f"关闭交易所连接失败 {key}: {e}")
        
        self.exchanges.clear()

