"""
高频短线策略简化版运行脚本
直接使用OKX API，不依赖沙盒模式
"""

import os
import sys
import asyncio
import logging
from datetime import datetime
from dotenv import load_dotenv
import ccxt

sys.path.append('.')
from app.core.strategies.high_frequency_scalping_strategy import HighFrequencyScalpingStrategy

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'logs/strategy_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# 初始化OKX交易所
exchange = ccxt.okx({
    'apiKey': os.getenv("OKX_API_KEY"),
    'secret': os.getenv("OKX_API_SECRET"),
    'password': os.getenv("OKX_PASSPHRASE"),
    'enableRateLimit': True,
})

# 初始化策略
strategy = HighFrequencyScalpingStrategy({
    "total_capital": 300.0,
    "leverage": 3.0,
})

logger.info("="*60)
logger.info("高频短线策略启动")
logger.info("="*60)

async def main():
    """主循环"""
    while True:
        try:
            # 获取K线数据
            ohlcv = exchange.fetch_ohlcv('BTC/USDT', '5m', limit=200)
            
            # 转换为策略需要的格式
            klines = []
            for candle in ohlcv:
                klines.append({
                    "timestamp": datetime.fromtimestamp(candle[0] / 1000),
                    "open": candle[1],
                    "high": candle[2],
                    "low": candle[3],
                    "close": candle[4],
                    "volume": candle[5]
                })
            
            # 分析信号
            signal = strategy.analyze(klines)
            
            logger.info(f"信号: {signal['signal']} - {signal['reason']}")
            
            if signal['signal'] in ['buy', 'sell']:
                logger.info(f"🔔 交易信号!")
                logger.info(f"  价格: {signal.get('price', 0):.2f}")
                logger.info(f"  数量: {signal.get('amount', 0):.6f}")
                logger.info(f"  止损: {signal.get('stop_loss', 0):.2f}")
                logger.info(f"  止盈: {signal.get('take_profit', 0):.2f}")
            
            # 等待30秒
            await asyncio.sleep(30)
            
        except KeyboardInterrupt:
            logger.info("停止运行")
            break
        except Exception as e:
            logger.error(f"错误: {e}")
            await asyncio.sleep(60)

if __name__ == "__main__":
    asyncio.run(main())
