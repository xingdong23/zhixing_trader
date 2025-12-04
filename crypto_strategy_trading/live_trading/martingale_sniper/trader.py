"""
Martingale Sniper 实盘交易器

马丁狙击手 - 高风险高回报策略
"""

import os
import sys
import asyncio
import logging
import json
import pandas as pd
import ccxt.async_support as ccxt
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from logging.handlers import TimedRotatingFileHandler
from dotenv import load_dotenv
import requests

project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

# 使用importlib绕过strategies/__init__.py的导入问题
import importlib.util
spec = importlib.util.spec_from_file_location(
    "martingale_strategy",
    os.path.join(project_root, "strategies", "martingale_sniper", "strategy.py")
)
martingale_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(martingale_module)
MartingaleSniperStrategy = martingale_module.MartingaleSniperStrategy

logger = logging.getLogger(__name__)


class MartingaleSniperTrader:
    """马丁狙击手实盘交易器"""
    
    def __init__(
        self,
        config_path: str = None,
        mode: str = "paper",
        once: bool = False,
    ):
        self.name = "MartingaleSniper"
        self.mode = mode
        self.once = once
        self.running = False
        
        # 加载环境变量
        env_path = os.path.join(os.path.dirname(__file__), '.env')
        if os.path.exists(env_path):
            load_dotenv(env_path)
        else:
            load_dotenv()
        
        # 加载配置
        if config_path is None:
            config_path = os.path.join(
                project_root, 'strategies', 'martingale_sniper', 'config.json'
            )
        self.config = self._load_config(config_path)
        
        # 设置日志
        self._setup_logging()
        
        # 初始化交易所
        self.exchange: ccxt.Exchange = None
        
        # 初始化策略
        self.strategy = MartingaleSniperStrategy(self.config.get('parameters', {}))
        
        # 缓存
        self.symbols_cache: List[str] = []
        self.symbols_cache_time: datetime = None
        
        # 扫描配置
        self.scan_interval = 5  # 5秒扫描一次
        self.kline_limit = 10
        
        logger.info(f"✓ {self.name} Trader 初始化完成")
        logger.info(f"  模式: {self.mode}")
    
    def _load_config(self, config_path: str) -> Dict:
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {"parameters": {}}
    
    def _setup_logging(self):
        os.makedirs('logs', exist_ok=True)
        
        formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        
        fh = TimedRotatingFileHandler(
            f'logs/{self.name.lower()}.log',
            when='midnight', backupCount=7, encoding='utf-8'
        )
        fh.setFormatter(formatter)
        
        ch = logging.StreamHandler()
        ch.setFormatter(formatter)
        
        root = logging.getLogger()
        root.setLevel(logging.INFO)
        if not root.handlers:
            root.addHandler(fh)
            root.addHandler(ch)
    
    async def _init_exchange(self):
        api_key = os.getenv('BINANCE_API_KEY')
        api_secret = os.getenv('BINANCE_API_SECRET')
        
        if not api_key or not api_secret:
            if self.mode != 'paper':
                raise ValueError("实盘模式需要配置 API")
            logger.warning("未找到API密钥")
        
        self.exchange = ccxt.binance({
            'apiKey': api_key,
            'secret': api_secret,
            'enableRateLimit': True,
            'options': {'defaultType': 'future'}
        })
        
        if self.mode == 'paper':
            logger.info("✓ 模拟盘模式")
            self.exchange.set_sandbox_mode(True)
        else:
            logger.warning("⚠️ 实盘模式 - 真实资金!")
    
    async def _get_symbols(self) -> List[str]:
        now = datetime.now()
        if self.symbols_cache and self.symbols_cache_time and \
           (now - self.symbols_cache_time).seconds < 300:
            return self.symbols_cache
        
        try:
            markets = await self.exchange.load_markets()
            symbols = [s for s, m in markets.items() 
                      if m.get('quote') == 'USDT' and m.get('swap') and m.get('active')]
            self.symbols_cache = sorted(set(symbols))
            self.symbols_cache_time = now
            return self.symbols_cache
        except Exception as e:
            logger.error(f"获取交易对失败: {e}")
            return self.symbols_cache or []
    
    async def _fetch_tickers(self) -> Dict:
        try:
            return await self.exchange.fetch_tickers()
        except Exception as e:
            logger.error(f"获取tickers失败: {e}")
            return {}
    
    async def _fetch_klines(self, symbol: str, limit: int = 10) -> pd.DataFrame:
        try:
            ohlcv = await self.exchange.fetch_ohlcv(symbol, '1m', limit=limit)
            df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            return df
        except:
            return pd.DataFrame()
    
    async def _fetch_market_data(self, symbols: List[str], tickers: Dict) -> Dict[str, pd.DataFrame]:
        data = {}
        min_vol = self.strategy.min_volume_24h_usdt
        
        # 只获取高成交量币种
        potential = [s for s in symbols 
                    if (tickers.get(s, {}).get('quoteVolume', 0) or 0) >= min_vol]
        
        batch_size = 10
        for i in range(0, len(potential), batch_size):
            batch = potential[i:i+batch_size]
            tasks = [self._fetch_klines(s, self.kline_limit) for s in batch]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for sym, res in zip(batch, results):
                if isinstance(res, pd.DataFrame) and not res.empty:
                    data[sym] = res
            
            if i + batch_size < len(potential):
                await asyncio.sleep(0.3)
        
        return data
    
    async def _execute_order(self, signal: Dict) -> bool:
        symbol = signal['symbol']
        amount = signal['amount']
        
        try:
            if self.mode == 'paper':
                logger.info(f"📝 [模拟] BUY {symbol} 数量:{amount:.4f}")
                return True
            else:
                # 设置杠杆
                await self.exchange.set_leverage(signal['leverage'], symbol)
                
                order = await self.exchange.create_market_order(
                    symbol=symbol, side='buy', amount=amount
                )
                logger.info(f"✅ [实盘] 订单: {order['id']}")
                return True
        except Exception as e:
            logger.error(f"❌ 订单失败: {e}")
            return False
    
    async def _close_position(self, signal: Dict) -> bool:
        symbol = signal['symbol']
        
        try:
            if self.mode == 'paper':
                logger.info(f"📝 [模拟] 平仓 {symbol}")
                return True
            else:
                pos = self.strategy.current_position
                if pos:
                    order = await self.exchange.create_market_order(
                        symbol=symbol, side='sell', amount=pos.amount,
                        params={'reduceOnly': True}
                    )
                    logger.info(f"✅ [实盘] 平仓: {order['id']}")
                return True
        except Exception as e:
            logger.error(f"❌ 平仓失败: {e}")
            return False
    
    async def run_cycle(self):
        now = datetime.now()
        
        # 检查游戏是否结束
        if self.strategy.is_game_over():
            logger.warning(f"💀 游戏结束 - 资金不足")
            self.running = False
            return
        
        symbols = await self._get_symbols()
        if not symbols:
            return
        
        tickers = await self._fetch_tickers()
        if not tickers:
            return
        
        # 检查现有持仓
        if self.strategy.current_position:
            pos = self.strategy.current_position
            price = tickers.get(pos.symbol, {}).get('last')
            if price:
                close_signal = self.strategy.check_position(price, now)
                if close_signal:
                    success = await self._close_position(close_signal)
                    if success:
                        self.strategy.update_position(close_signal)
        
        # 寻找新信号
        if self.strategy.current_position is None:
            market_data = await self._fetch_market_data(symbols, tickers)
            signal = self.strategy.scan_market(market_data, tickers)
            
            if signal:
                success = await self._execute_order(signal)
                if success:
                    self.strategy.update_position(signal)
        
        # 打印状态
        stats = self.strategy.get_stats()
        if stats['total_trades'] > 0:
            pos_str = f"持仓:{stats['has_position']}" if stats['has_position'] else "空仓"
            logger.info(f"📊 资金:{stats['current_capital']:.1f}U | "
                       f"L{stats['martingale_level']+1}下注:{stats['current_bet']}U | "
                       f"轮次:{stats['rounds_won']}/{stats['total_rounds']} | {pos_str}")
    
    async def start(self):
        self.running = True
        
        logger.info("=" * 60)
        logger.info(f"🎰 {self.name} 启动")
        logger.info("=" * 60)
        
        await self._init_exchange()
        
        try:
            await self.exchange.fetch_time()
            logger.info("✓ 交易所连接正常")
        except Exception as e:
            logger.error(f"❌ 连接失败: {e}")
            return
        
        self.send_alert("🎰 马丁狙击手启动", 
                       f"模式: {self.mode}\n本金: {self.strategy.total_capital}U")
        
        if self.once:
            await self.run_cycle()
            await self.stop()
            return
        
        while self.running:
            try:
                await self.run_cycle()
                await asyncio.sleep(self.scan_interval)
            except KeyboardInterrupt:
                break
            except Exception as e:
                logger.error(f"错误: {e}")
                await asyncio.sleep(10)
        
        await self.stop()
    
    async def stop(self):
        self.running = False
        
        stats = self.strategy.get_stats()
        logger.info("=" * 60)
        logger.info(f"🛑 {self.name} 停止")
        logger.info(f"   资金: {stats['current_capital']:.2f}U")
        logger.info(f"   收益: {stats['total_return_pct']:+.1f}%")
        logger.info(f"   轮次: {stats['rounds_won']}/{stats['total_rounds']}")
        logger.info("=" * 60)
        
        self.send_alert("🛑 马丁狙击手停止",
                       f"资金: {stats['current_capital']:.2f}U\n"
                       f"收益: {stats['total_return_pct']:+.1f}%")
        
        if self.exchange:
            await self.exchange.close()
    
    def send_alert(self, title: str, message: str):
        webhook = os.getenv("FEISHU_WEBHOOK")
        if not webhook:
            return
        try:
            data = {"msg_type": "post", "content": {"post": {"zh_cn": {
                "title": title, "content": [[{"tag": "text", "text": message}]]
            }}}}
            requests.post(webhook, json=data, timeout=5)
        except:
            pass


async def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='马丁狙击手')
    parser.add_argument('--mode', default='paper', choices=['paper', 'live'])
    parser.add_argument('--once', action='store_true')
    parser.add_argument('--config', default=None)
    
    args = parser.parse_args()
    
    trader = MartingaleSniperTrader(
        config_path=args.config,
        mode=args.mode,
        once=args.once
    )
    
    await trader.start()


if __name__ == '__main__':
    asyncio.run(main())
