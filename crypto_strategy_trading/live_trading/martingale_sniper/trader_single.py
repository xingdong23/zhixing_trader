"""
Martingale Sniper 实盘交易器 - 单币种版本

只监控指定币种，不扫描全市场
"""

import os
import sys
import asyncio
import logging
import json
import pandas as pd
import ccxt.async_support as ccxt
from datetime import datetime
from typing import Dict, Optional
from logging.handlers import TimedRotatingFileHandler
from dotenv import load_dotenv
import requests

project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

# 使用importlib绕过strategies/__init__.py的问题
import importlib.util
spec = importlib.util.spec_from_file_location(
    "strategy_single",
    os.path.join(project_root, "strategies", "martingale_sniper", "strategy_single.py")
)
strategy_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(strategy_module)
MartingaleSniperSingleStrategy = strategy_module.MartingaleSniperSingleStrategy

logger = logging.getLogger(__name__)


class MartingaleSniperSingleTrader:
    """马丁狙击手 - 单币种交易器"""
    
    def __init__(
        self,
        symbol: str = "DOGE/USDT:USDT",
        config_path: str = None,
        mode: str = "paper",
        once: bool = False,
    ):
        self.name = "MartingaleSniper"
        self.symbol = symbol
        self.mode = mode
        self.once = once
        self.running = False
        
        # 加载环境变量
        load_dotenv()
        
        # 加载配置
        if config_path is None:
            config_path = os.path.join(
                project_root, 'strategies', 'martingale_sniper', 'config.json'
            )
        self.config = self._load_config(config_path)
        
        # 设置交易币种
        self.config['parameters']['symbol'] = symbol
        
        # 设置日志
        self._setup_logging()
        
        # 初始化交易所
        self.exchange: ccxt.Exchange = None
        
        # 初始化策略
        self.strategy = MartingaleSniperSingleStrategy(self.config.get('parameters', {}))
        
        # 扫描配置
        self.scan_interval = 5  # 5秒检查一次
        self.kline_limit = 10
        
        logger.info(f"✓ {self.name} 单币种交易器初始化")
        logger.info(f"  交易币种: {self.symbol}")
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
            f'logs/{self.name.lower()}_single.log',
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
    
    async def _fetch_klines(self, limit: int = 10) -> pd.DataFrame:
        """获取K线数据"""
        try:
            ohlcv = await self.exchange.fetch_ohlcv(self.symbol, '1m', limit=limit)
            df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            return df
        except Exception as e:
            logger.error(f"获取K线失败: {e}")
            return pd.DataFrame()
    
    async def _fetch_price(self) -> Optional[float]:
        """获取当前价格"""
        try:
            ticker = await self.exchange.fetch_ticker(self.symbol)
            return ticker.get('last')
        except Exception as e:
            logger.error(f"获取价格失败: {e}")
            return None
    
    async def _execute_order(self, signal: Dict) -> bool:
        """执行订单"""
        try:
            if self.mode == 'paper':
                logger.info(f"📝 [模拟] BUY {self.symbol} @ {signal['price']:.6f}")
                return True
            else:
                # 🚨 设置逐仓模式
                try:
                    await self.exchange.set_margin_mode('isolated', self.symbol)
                except:
                    pass  # 可能已经是逐仓模式
                
                # 设置杠杆
                await self.exchange.set_leverage(signal['leverage'], self.symbol)
                
                # 下单
                order = await self.exchange.create_market_order(
                    symbol=self.symbol, side='buy', amount=signal['amount']
                )
                logger.info(f"✅ [实盘] 订单: {order['id']}")
                return True
        except Exception as e:
            logger.error(f"❌ 订单失败: {e}")
            return False
    
    async def _close_position(self) -> bool:
        """平仓"""
        try:
            pos = self.strategy.current_position
            if pos is None:
                return False
            
            if self.mode == 'paper':
                logger.info(f"📝 [模拟] 平仓 {self.symbol}")
                return True
            else:
                order = await self.exchange.create_market_order(
                    symbol=self.symbol, side='sell', amount=pos.amount,
                    params={'reduceOnly': True}
                )
                logger.info(f"✅ [实盘] 平仓: {order['id']}")
                return True
        except Exception as e:
            logger.error(f"❌ 平仓失败: {e}")
            return False
    
    async def run_cycle(self):
        """运行一个周期"""
        now = datetime.now()
        
        # 检查游戏是否结束
        if self.strategy.is_game_over():
            logger.warning(f"💀 游戏结束 - 资金不足")
            self.running = False
            return
        
        # 获取当前价格
        price = await self._fetch_price()
        if price is None:
            return
        
        # 检查持仓
        if self.strategy.current_position:
            close_signal = self.strategy.check_position(price, now)
            if close_signal:
                success = await self._close_position()
                if success:
                    self.strategy.update_position(close_signal)
        
        # 寻找开仓信号
        if self.strategy.current_position is None:
            df = await self._fetch_klines(self.kline_limit)
            if not df.empty:
                signal = self.strategy.analyze(df)
                if signal:
                    success = await self._execute_order(signal)
                    if success:
                        self.strategy.update_position(signal)
        
        # 打印状态
        stats = self.strategy.get_stats()
        if stats['total_trades'] > 0 or stats['has_position']:
            pos_str = f"持仓中" if stats['has_position'] else "空仓"
            logger.info(f"📊 {self.symbol} | 资金:{stats['current_capital']:.1f}U | "
                       f"L{stats['martingale_level']+1}下注:{stats['current_bet']}U | "
                       f"轮次:{stats['rounds_won']}/{stats['total_rounds']} | {pos_str}")
    
    async def start(self):
        """启动"""
        self.running = True
        
        logger.info("=" * 60)
        logger.info(f"🎰 {self.name} 单币种模式启动")
        logger.info(f"   交易币种: {self.symbol}")
        logger.info("=" * 60)
        
        await self._init_exchange()
        
        # 健康检查
        try:
            await self.exchange.fetch_time()
            logger.info("✓ 交易所连接正常")
        except Exception as e:
            logger.error(f"❌ 连接失败: {e}")
            return
        
        self.send_alert("🎰 马丁狙击手启动", 
                       f"币种: {self.symbol}\n模式: {self.mode}")
        
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
        """停止"""
        self.running = False
        
        stats = self.strategy.get_stats()
        logger.info("=" * 60)
        logger.info(f"🛑 {self.name} 停止")
        logger.info(f"   币种: {self.symbol}")
        logger.info(f"   资金: {stats['current_capital']:.2f}U")
        logger.info(f"   收益: {stats['return_pct']:+.1f}%")
        logger.info(f"   轮次: {stats['rounds_won']}/{stats['total_rounds']}")
        logger.info("=" * 60)
        
        self.send_alert("🛑 马丁狙击手停止",
                       f"币种: {self.symbol}\n"
                       f"资金: {stats['current_capital']:.2f}U\n"
                       f"收益: {stats['return_pct']:+.1f}%")
        
        if self.exchange:
            await self.exchange.close()
    
    def send_alert(self, title: str, message: str):
        """发送飞书报警"""
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
    
    parser = argparse.ArgumentParser(description='马丁狙击手 - 单币种模式')
    parser.add_argument('--symbol', default='DOGE/USDT:USDT', help='交易币种')
    parser.add_argument('--mode', default='paper', choices=['paper', 'live'])
    parser.add_argument('--once', action='store_true')
    parser.add_argument('--config', default=None)
    
    args = parser.parse_args()
    
    trader = MartingaleSniperSingleTrader(
        symbol=args.symbol,
        config_path=args.config,
        mode=args.mode,
        once=args.once
    )
    
    await trader.start()


if __name__ == '__main__':
    asyncio.run(main())
