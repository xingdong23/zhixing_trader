"""
欧易API连接模块
"""
import time
import hmac
import base64
import hashlib
import requests
from datetime import datetime
from typing import List, Dict, Optional
from config import Config
import logging

logger = logging.getLogger(__name__)


class OKXConnector:
    """欧易API连接器"""
    
    def __init__(self):
        self.api_key = Config.OKX_API_KEY
        self.secret_key = Config.OKX_SECRET_KEY
        self.passphrase = Config.OKX_PASSPHRASE
        self.base_url = Config.OKX_BASE_URL
        
        if not all([self.api_key, self.secret_key, self.passphrase]):
            raise ValueError("欧易API配置不完整")
        
        logger.info("✅ 欧易API连接器初始化成功")
    
    def _get_timestamp(self) -> str:
        """获取时间戳"""
        return datetime.utcnow().isoformat("T", "milliseconds") + "Z"
    
    def _sign(self, timestamp: str, method: str, request_path: str, body: str = '') -> str:
        """生成签名"""
        message = timestamp + method + request_path + body
        mac = hmac.new(
            bytes(self.secret_key, encoding='utf8'),
            bytes(message, encoding='utf-8'),
            digestmod=hashlib.sha256
        )
        return base64.b64encode(mac.digest()).decode()
    
    def _get_headers(self, method: str, request_path: str, body: str = '') -> Dict:
        """获取请求头"""
        timestamp = self._get_timestamp()
        sign = self._sign(timestamp, method, request_path, body)
        
        return {
            'OK-ACCESS-KEY': self.api_key,
            'OK-ACCESS-SIGN': sign,
            'OK-ACCESS-TIMESTAMP': timestamp,
            'OK-ACCESS-PASSPHRASE': self.passphrase,
            'Content-Type': 'application/json'
        }
    
    def _request(self, method: str, endpoint: str, params: Dict = None) -> Dict:
        """发送请求"""
        url = self.base_url + endpoint
        
        try:
            if method == 'GET':
                if params:
                    query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
                    request_path = endpoint + '?' + query_string
                else:
                    request_path = endpoint
                
                headers = self._get_headers('GET', request_path)
                response = requests.get(url, headers=headers, params=params, timeout=10)
            
            else:
                headers = self._get_headers(method, endpoint)
                response = requests.request(method, url, headers=headers, json=params, timeout=10)
            
            response.raise_for_status()
            data = response.json()
            
            if data.get('code') == '0':
                return data.get('data', [])
            else:
                logger.error(f"❌ API请求失败: {data.get('msg')}")
                return []
            
        except Exception as e:
            logger.error(f"❌ API请求异常: {e}")
            return []
    
    def get_klines(self, symbol: str, timeframe: str = '1H', limit: int = 100) -> List[Dict]:
        """
        获取K线数据
        
        Args:
            symbol: 交易对，如 ETH-USDT-SWAP
            timeframe: 时间周期，如 1H, 1D
            limit: 获取数量，最大300
        
        Returns:
            K线数据列表
        """
        endpoint = '/api/v5/market/candles'
        params = {
            'instId': symbol,
            'bar': timeframe,
            'limit': min(limit, 300)
        }
        
        data = self._request('GET', endpoint, params)
        
        if not data:
            return []
        
        # 转换为统一格式
        klines = []
        for item in data:
            klines.append({
                'timestamp': int(item[0]),
                'open': float(item[1]),
                'high': float(item[2]),
                'low': float(item[3]),
                'close': float(item[4]),
                'volume': float(item[5]),
                'datetime': datetime.fromtimestamp(int(item[0]) / 1000)
            })
        
        # 按时间正序排列
        klines.reverse()
        
        logger.info(f"✅ 获取K线数据成功: {symbol} {timeframe} {len(klines)}条")
        return klines
    
    def get_current_price(self, symbol: str) -> Optional[float]:
        """
        获取当前价格
        
        Args:
            symbol: 交易对
        
        Returns:
            当前价格
        """
        endpoint = '/api/v5/market/ticker'
        params = {'instId': symbol}
        
        data = self._request('GET', endpoint, params)
        
        if data and len(data) > 0:
            price = float(data[0]['last'])
            logger.debug(f"当前价格: {symbol} = {price}")
            return price
        
        return None
    
    def get_account_balance(self) -> Optional[Dict]:
        """
        获取账户余额（模拟盘不需要，但提供接口）
        
        Returns:
            账户余额信息
        """
        endpoint = '/api/v5/account/balance'
        data = self._request('GET', endpoint)
        
        if data and len(data) > 0:
            return data[0]
        
        return None
    
    def test_connection(self) -> bool:
        """
        测试连接
        
        Returns:
            连接是否成功
        """
        try:
            price = self.get_current_price(Config.SYMBOL)
            if price:
                logger.info(f"✅ 欧易API连接测试成功: {Config.SYMBOL} 当前价格 {price}")
                return True
            else:
                logger.error("❌ 欧易API连接测试失败")
                return False
        except Exception as e:
            logger.error(f"❌ 欧易API连接测试异常: {e}")
            return False


# 单例模式
_okx_instance = None

def get_okx() -> OKXConnector:
    """获取欧易连接器实例"""
    global _okx_instance
    if _okx_instance is None:
        _okx_instance = OKXConnector()
    return _okx_instance


if __name__ == '__main__':
    # 测试
    logging.basicConfig(level=logging.INFO)
    
    okx = get_okx()
    
    # 测试连接
    if okx.test_connection():
        print("✅ 连接成功")
        
        # 获取K线
        klines = okx.get_klines('ETH-USDT-SWAP', '1H', 10)
        print(f"\n获取到 {len(klines)} 条K线数据")
        if klines:
            print(f"最新K线: {klines[-1]}")
    else:
        print("❌ 连接失败")
