"""
Pump Hunter 实盘交易器

全市场扫描，追踪突然拉升的币种
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

# 添加项目根目录到路径
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

from strategies.pump_hunter import PumpHunterStrategy

logger = logging.getLogger(__name__)


class PumpHunterTrader:
    """
    Pump Hunter 实盘交易器
    
    全市场扫描USDT交易对，追踪突然拉升的币种
    """
    
    def __init__(
        self,
        config_path: str = None,
        mode: str = "paper",
        once: bool = False,
    ):
        self.name = "PumpHunter"
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
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                'strategies', 'pump_hunter', 'config.json'
            )
        self.config = self._load_config(config_path)
        
        # 设置日志
        self._setup_logging()
        
        # 初始化交易所
        self.exchange: ccxt.Exchange = None
        
        # 初始化策略
        self.strategy = PumpHunterStrategy(self.config.get('parameters', {}))
        
        # 缓存
        self.symbols_cache: List[str] = []
        self.symbols_cache_time: datetime = None
        self.symbols_cache_ttl = 300  # 5分钟刷新一次交易对列表
        
        # 扫描配置
        self.scan_interval = 10  # 每10秒扫描一次
        self.kline_limit = 10    # 获取最近10根K线
        
        logger.info(f"✓ {self.name} Trader 初始化完成")
        logger.info(f"  模式: {self.mode}")
        logger.info(f"  扫描间隔: {self.scan_interval}秒")
    
    def _load_config(self, config_path: str) -> Dict:
        """加载配置文件"""
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        else:
            logger.warning(f"配置文件不存在: {config_path}, 使用默认配置")
            return {"parameters": {}}
    
    def _setup_logging(self):
        """设置日志"""
        os.makedirs('logs', exist_ok=True)
        
        log_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        
        file_handler = TimedRotatingFileHandler(
            filename=f'logs/{self.name.lower()}.log',
            when='midnight',
            backupCount=7,
            encoding='utf-8'
        )
        file_handler.setFormatter(log_formatter)
        
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(log_formatter)
        
        root_logger = logging.getLogger()
        root_logger.setLevel(logging.INFO)
        if not root_logger.handlers:
            root_logger.addHandler(file_handler)
            root_logger.addHandler(console_handler)
    
    async def _init_exchange(self):
        """初始化交易所连接"""
        api_key = os.getenv('BINANCE_API_KEY')
        api_secret = os.getenv('BINANCE_API_SECRET')
        
        if not api_key or not api_secret:
            if self.mode != 'paper':
                raise ValueError("实盘模式需要配置 BINANCE_API_KEY 和 BINANCE_API_SECRET")
            logger.warning("未找到API密钥，模拟盘功能可能受限")
        
        self.exchange = ccxt.binance({
            'apiKey': api_key,
            'secret': api_secret,
            'enableRateLimit': True,
            'options': {'defaultType': 'future'}
        })
        
        if self.mode == 'paper':
            logger.info("✓ 使用 Binance 模拟盘模式")
            self.exchange.set_sandbox_mode(True)
        else:
            logger.warning("⚠️ 使用 Binance 实盘模式 - 真实资金操作！")
    
    async def _get_usdt_symbols(self) -> List[str]:
        """获取所有USDT永续合约交易对"""
        now = datetime.now()
        
        # 检查缓存
        if (self.symbols_cache and self.symbols_cache_time and 
            (now - self.symbols_cache_time).seconds < self.symbols_cache_ttl):
            return self.symbols_cache
        
        try:
            markets = await self.exchange.load_markets()
            symbols = []
            
            for symbol, market in markets.items():
                # 只要USDT永续合约
                if (market.get('quote') == 'USDT' and 
                    market.get('swap') and 
                    market.get('active') and
                    not symbol.endswith(':USDT')):  # 排除重复
                    symbols.append(symbol)
            
            # 去重并排序
            symbols = sorted(set(symbols))
            
            self.symbols_cache = symbols
            self.symbols_cache_time = now
            
            logger.info(f"✓ 获取到 {len(symbols)} 个USDT永续合约")
            return symbols
            
        except Exception as e:
            logger.error(f"获取交易对列表失败: {e}")
            return self.symbols_cache or []
    
    async def _fetch_tickers(self) -> Dict[str, Dict]:
        """批量获取所有ticker信息"""
        try:
            tickers = await self.exchange.fetch_tickers()
            return tickers
        except Exception as e:
            logger.error(f"获取tickers失败: {e}")
            return {}
    
    async def _fetch_klines(self, symbol: str, limit: int = 10) -> pd.DataFrame:
        """获取单个币种的K线数据"""
        try:
            ohlcv = await self.exchange.fetch_ohlcv(symbol, '1m', limit=limit)
            df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            return df
        except Exception as e:
            logger.debug(f"获取 {symbol} K线失败: {e}")
            return pd.DataFrame()
    
    async def _fetch_market_data(self, symbols: List[str], tickers: Dict) -> Dict[str, pd.DataFrame]:
        """批量获取市场数据（只获取有潜力的币种）"""
        market_data = {}
        
        # 先用ticker数据过滤，只获取短期有涨幅的币种的K线
        potential_symbols = []
        min_volume = self.strategy.min_volume_24h_usdt
        
        for symbol in symbols:
            ticker = tickers.get(symbol, {})
            volume_24h = ticker.get('quoteVolume', 0) or 0
            change_pct = ticker.get('percentage', 0) or 0
            
            # 过滤条件：成交额足够 且 有正向变化
            if volume_24h >= min_volume and change_pct > -5:
                potential_symbols.append(symbol)
        
        logger.debug(f"筛选出 {len(potential_symbols)} 个潜力币种")
        
        # 分批获取K线数据，避免请求过快
        batch_size = 10
        for i in range(0, len(potential_symbols), batch_size):
            batch = potential_symbols[i:i+batch_size]
            tasks = [self._fetch_klines(s, self.kline_limit) for s in batch]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for symbol, result in zip(batch, results):
                if isinstance(result, pd.DataFrame) and not result.empty:
                    market_data[symbol] = result
            
            # 稍微等待，避免触发限流
            if i + batch_size < len(potential_symbols):
                await asyncio.sleep(0.5)
        
        return market_data
    
    async def _execute_order(self, signal: Dict) -> bool:
        """执行订单"""
        symbol = signal['symbol']
        side = 'buy' if signal['signal'] == 'buy' else 'sell'
        amount = signal['amount']
        
        try:
            if self.mode == 'paper':
                # 模拟盘：直接假设成交
                logger.info(f"📝 [模拟] {side.upper()} {symbol} 数量:{amount:.4f}")
                return True
            else:
                # 实盘：市价单
                order = await self.exchange.create_market_order(
                    symbol=symbol,
                    side=side,
                    amount=amount
                )
                logger.info(f"✅ [实盘] 订单成交: {order['id']}")
                return True
                
        except Exception as e:
            logger.error(f"❌ 订单执行失败: {symbol} - {e}")
            return False
    
    async def _close_position(self, signal: Dict) -> bool:
        """平仓"""
        symbol = signal['symbol']
        pos = self.strategy.get_position(symbol)
        
        if pos is None:
            return False
        
        try:
            if self.mode == 'paper':
                logger.info(f"📝 [模拟] 平仓 {symbol}")
                return True
            else:
                # 实盘：市价平仓
                order = await self.exchange.create_market_order(
                    symbol=symbol,
                    side='sell',  # 做多平仓用卖
                    amount=pos.amount,
                    params={'reduceOnly': True}
                )
                logger.info(f"✅ [实盘] 平仓成交: {order['id']}")
                return True
                
        except Exception as e:
            logger.error(f"❌ 平仓失败: {symbol} - {e}")
            return False
    
    async def run_cycle(self):
        """运行一个扫描周期"""
        now = datetime.now()
        
        # 1. 获取交易对列表
        symbols = await self._get_usdt_symbols()
        if not symbols:
            logger.warning("未获取到交易对")
            return
        
        # 2. 获取所有ticker
        tickers = await self._fetch_tickers()
        if not tickers:
            logger.warning("未获取到ticker数据")
            return
        
        # 3. 检查现有持仓
        if self.strategy.positions:
            current_prices = {s: tickers.get(s, {}).get('last', 0) for s in self.strategy.positions}
            close_signals = self.strategy.check_positions(current_prices, now)
            
            for signal in close_signals:
                success = await self._close_position(signal)
                if success:
                    self.strategy.update_position(signal)
        
        # 4. 扫描新信号
        market_data = await self._fetch_market_data(symbols, tickers)
        signals = self.strategy.scan_market(market_data, tickers)
        
        # 5. 执行交易
        for signal in signals:
            # 再次检查持仓数量限制
            if len(self.strategy.positions) >= self.strategy.max_positions:
                logger.info(f"已达最大持仓数 {self.strategy.max_positions}，跳过新信号")
                break
            
            success = await self._execute_order(signal)
            if success:
                self.strategy.update_position(signal)
        
        # 6. 打印状态
        stats = self.strategy.get_stats()
        if stats['current_positions'] > 0 or stats['trade_count'] > 0:
            logger.info(f"📊 状态: 持仓{stats['current_positions']}/{self.strategy.max_positions} | "
                       f"交易{stats['trade_count']}次 | 胜率{stats['win_rate']:.1f}% | "
                       f"盈亏{stats['total_pnl']:+.2f}U")
    
    async def start(self):
        """启动交易器"""
        self.running = True
        
        logger.info("=" * 60)
        logger.info(f"🚀 {self.name} 启动中...")
        logger.info("=" * 60)
        
        # 初始化交易所
        await self._init_exchange()
        
        # 健康检查
        try:
            await self.exchange.fetch_time()
            logger.info("✓ 交易所连接正常")
        except Exception as e:
            logger.error(f"❌ 交易所连接失败: {e}")
            return
        
        self.send_alert("🎯 Pump Hunter 启动", f"模式: {self.mode}\n开始扫描全市场...")
        
        if self.once:
            await self.run_cycle()
            await self.stop()
            return
        
        # 主循环
        while self.running:
            try:
                await self.run_cycle()
                await asyncio.sleep(self.scan_interval)
            except KeyboardInterrupt:
                break
            except Exception as e:
                logger.error(f"主循环出错: {e}")
                await asyncio.sleep(30)
        
        await self.stop()
    
    async def stop(self):
        """停止交易器"""
        self.running = False
        
        # 打印最终统计
        stats = self.strategy.get_stats()
        logger.info("=" * 60)
        logger.info(f"🛑 {self.name} 停止")
        logger.info(f"   总交易: {stats['trade_count']}次")
        logger.info(f"   胜率: {stats['win_rate']:.1f}%")
        logger.info(f"   总盈亏: {stats['total_pnl']:+.2f}U")
        logger.info(f"   剩余资金: {stats['remaining_capital']:.2f}U")
        logger.info("=" * 60)
        
        self.send_alert("🛑 Pump Hunter 停止", 
                       f"总交易: {stats['trade_count']}次\n"
                       f"胜率: {stats['win_rate']:.1f}%\n"
                       f"盈亏: {stats['total_pnl']:+.2f}U")
        
        # 关闭交易所连接
        if self.exchange:
            await self.exchange.close()
    
    def send_alert(self, title: str, message: str):
        """发送飞书报警"""
        webhook = os.getenv("FEISHU_WEBHOOK")
        if not webhook:
            return
        
        try:
            data = {
                "msg_type": "post",
                "content": {
                    "post": {
                        "zh_cn": {
                            "title": title,
                            "content": [[{"tag": "text", "text": message}]]
                        }
                    }
                }
            }
            requests.post(webhook, json=data, timeout=5)
        except Exception as e:
            logger.debug(f"发送报警失败: {e}")


async def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Pump Hunter 追涨猎手')
    parser.add_argument('--mode', type=str, default='paper', choices=['paper', 'live'],
                       help='交易模式: paper(模拟盘) / live(实盘)')
    parser.add_argument('--once', action='store_true', help='只运行一次')
    parser.add_argument('--config', type=str, default=None, help='配置文件路径')
    
    args = parser.parse_args()
    
    trader = PumpHunterTrader(
        config_path=args.config,
        mode=args.mode,
        once=args.once
    )
    
    await trader.start()


if __name__ == '__main__':
    asyncio.run(main())
