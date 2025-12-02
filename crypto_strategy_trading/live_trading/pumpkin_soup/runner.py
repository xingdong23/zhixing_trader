"""
Pumpkin Soup 策略运行脚本

使用说明：
python live_trading/pumpkin_soup/runner.py --mode paper  # 模拟盘
python live_trading/pumpkin_soup/runner.py --mode live   # 实盘
"""

import os
import sys
import asyncio
import argparse
import logging
import json
from datetime import datetime
from typing import Dict, List
from logging.handlers import TimedRotatingFileHandler

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from dotenv import load_dotenv
import ccxt
import requests
import pandas as pd

from strategies.pumpkin_soup.strategy import PumpkinSoupStrategy
from live_trading.common.db_logger import DBLogger
from live_trading.common.mysql_logger import MySQLLogger

# 加载环境变量
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(env_path)

# 配置日志
log_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
file_handler = TimedRotatingFileHandler(
    filename='logs/pumpkin_soup.log',
    when='midnight',
    backupCount=7,
    encoding='utf-8'
)
file_handler.setFormatter(log_formatter)
console_handler = logging.StreamHandler()
console_handler.setFormatter(log_formatter)
logging.basicConfig(level=logging.INFO, handlers=[file_handler, console_handler])

logger = logging.getLogger(__name__)


class PumpkinSoupTrader:
    """Pumpkin Soup 交易机器人"""
    
    def __init__(
        self,
        mode: str = "paper",
        symbol: str = None,
        timeframe: str = None,
        once: bool = False,
        db_path: str = None,
        db_backend: str = "sqlite",
        mysql_host: str = None,
        mysql_port: int = None,
        mysql_user: str = None,
        mysql_password: str = None,
        mysql_database: str = None,
    ):
        self.mode = mode
        
        # 加载配置
        config_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            'strategies/pumpkin_soup/config_live.json'
        )
        
        if not os.path.exists(config_path):
            logger.warning(f"配置文件不存在: {config_path}, 尝试加载默认 config.json")
            config_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                'strategies/pumpkin_soup/config.json'
            )

        with open(config_path, 'r', encoding='utf-8') as f:
            self.config = json.load(f)
        
        # 初始化交易所
        self.exchange = self._init_exchange()
        
        # 准备策略参数
        strategy_params = self.config.get('strategy', {}).get('parameters', {}).copy()
        risk_params = self.config.get('risk_management', {}).copy()
        # 合并参数
        strategy_params.update(risk_params)
        
        # 初始化策略
        self.strategy = PumpkinSoupStrategy(strategy_params)
        
        # 交易对和时间框架
        self.symbol = symbol or self.config.get('strategy', {}).get('symbol', "BTC/USDT")
        self.timeframe = (timeframe or self.config.get('strategy', {}).get('timeframe', "1H")).upper()
        
        # 运行状态
        self.running = False
        self.last_kline_time = None
        self.once = once
        
        # 数据库记录器
        cfg_db = (self.config or {}).get('database', {})
        cfg_backend = (cfg_db.get('backend') or '').lower() if isinstance(cfg_db, dict) else ''
        eff_backend = (db_backend or cfg_backend or 'sqlite').lower()
        if eff_backend == 'mysql':
            cfg_mysql = cfg_db.get('mysql', {}) if isinstance(cfg_db, dict) else {}
            eff_host = mysql_host or cfg_mysql.get('host') or os.getenv('MYSQL_HOST', '127.0.0.1')
            eff_port = int(mysql_port or cfg_mysql.get('port') or os.getenv('MYSQL_PORT', 3306))
            eff_user = mysql_user or cfg_mysql.get('user') or os.getenv('MYSQL_USER', 'root')
            eff_password = mysql_password or cfg_mysql.get('password') or os.getenv('MYSQL_PASSWORD', '')
            eff_database = mysql_database or cfg_mysql.get('database') or os.getenv('MYSQL_DB', 'trading')
            self.db = MySQLLogger(
                host=eff_host,
                port=eff_port,
                user=eff_user,
                password=eff_password,
                database=eff_database,
            )
            logger.info(f"✓ 使用 MySQL 记录器 - {eff_user}@{eff_host}:{eff_port}/{eff_database}")
        else:
            eff_db_path = db_path or 'logs/trading.sqlite3'
            self.db = DBLogger(eff_db_path)
            logger.info(f"✓ 使用 SQLite 记录器 - {eff_db_path}")
        
        capital = risk_params.get('total_capital', 0.0)
        logger.info(f"Pumpkin Soup 交易机器人初始化完成 - 模式: {mode}, 资金: {capital} USDT")
    
    def _init_exchange(self) -> ccxt.Exchange:
        """初始化交易所"""
        # 优先使用 config 中的配置，如果没有则使用环境变量
        exchange_config = self.config.get('exchange', {})
        api_key = exchange_config.get('api_key') or os.getenv("BINANCE_API_KEY") or os.getenv("OKX_API_KEY")
        api_secret = exchange_config.get('api_secret') or os.getenv("BINANCE_API_SECRET") or os.getenv("OKX_API_SECRET")
        passphrase = os.getenv("OKX_PASSPHRASE") # Binance 不需要
        
        exchange_name = exchange_config.get('name', 'binance')
        
        if not all([api_key, api_secret]):
            # 如果是模拟盘且没有配置，可能只是为了测试逻辑，给个警告
            if self.mode == 'paper':
                logger.warning("未配置 API Key，将无法获取私有数据或下单")
            else:
                raise ValueError("请在 config_live.json 或 .env 文件中配置 API 密钥")
        
        exchange_class = getattr(ccxt, exchange_name)
        exchange_params = {
            'apiKey': api_key,
            'secret': api_secret,
            'enableRateLimit': True,
        }
        if passphrase:
            exchange_params['password'] = passphrase
            
        exchange = exchange_class(exchange_params)
        
        # 设置为合约交易模式 (Binance 需要显式指定 defaultType='future' 或 'swap')
        if exchange_name == 'binance':
            exchange.options['defaultType'] = 'future'
        elif exchange_name == 'okx':
            exchange.options['defaultType'] = 'swap'
        
        if self.mode == "paper":
            logger.info(f"✓ 使用 {exchange_name} 模拟盘/测试模式")
            exchange.set_sandbox_mode(True) # 尝试开启沙箱模式 (如果支持)
        else:
            logger.warning(f"⚠️  使用 {exchange_name} 实盘模式 - 请谨慎操作！")
        
        return exchange
    
    async def fetch_klines(self, timeframe: str = None, limit: int = 200) -> pd.DataFrame:
        try:
            if timeframe is None:
                timeframe = self.timeframe
            
            # 使用 ccxt 获取 K 线
            # 注意：不同交易所的 symbol 格式可能不同，这里假设 config 中配置正确
            ohlcv = self.exchange.fetch_ohlcv(self.symbol, timeframe, limit=limit)
            
            df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            # timestamp 已经是毫秒
            return df
            
        except Exception as e:
            logger.error(f"获取K线数据失败: {e}")
            return pd.DataFrame()
    
    async def run_strategy_cycle(self):
        try:
            # 获取 K 线 (Pumpkin Soup 需要较多数据计算 EMA55)
            df = await self.fetch_klines(limit=300)
            
            if df.empty:
                logger.warning("未获取到K线数据")
                return
            
            current_kline_time = df.iloc[-1]['timestamp']
            if self.last_kline_time and current_kline_time == self.last_kline_time:
                return
            
            self.last_kline_time = current_kline_time
            
            # 转换为字典列表
            klines = df.to_dict('records')
            
            # 运行策略分析
            signal = self.strategy.analyze(klines)
            
            # 更新持仓状态 (策略内部维护)
            self.strategy.update_position(signal)
            
            logger.info(f"策略信号: {signal['signal']} - {signal['reason']}")
            
            # 如果有交易信号
            if signal["signal"] in ["buy", "sell"]:
                logger.info(f"🔔 交易信号触发!")
                logger.info(f"  信号: {signal['signal']}")
                logger.info(f"  价格: {signal.get('price', 0):.2f}")
                logger.info(f"  数量: {signal.get('amount', 0):.4f}")
                logger.info(f"  原因: {signal['reason']}")
                
                try:
                    sig_id = self.db.log_signal(
                        mode=self.mode,
                        symbol=self.symbol,
                        timeframe=self.timeframe,
                        signal=signal,
                    )
                    
                    # 记录下单日志 (Dry Run)
                    self.db.log_order(
                        signal_id=sig_id,
                        side=signal["signal"],
                        price=signal.get("price"),
                        amount=signal.get("amount"),
                        status="not_placed",
                        details={"reason": "dry-run/script-only", "mode": self.mode},
                    )
                    
                    # TODO: 在这里添加实际下单逻辑 (ccxt create_order)
                    # if self.mode == 'live':
                    #     order = self.exchange.create_order(...)
                    
                except Exception as e:
                    logger.error(f"记录交易信号到数据库失败: {e}")
                
        except Exception as e:
            logger.error(f"策略循环出错: {e}")
            import traceback
            traceback.print_exc()

    async def start(self):
        self.running = True
        logger.info("="*60)
        logger.info("🚀 Pumpkin Soup 交易机器人启动")
        logger.info("="*60)
        logger.info(f"交易对: {self.symbol}")
        logger.info(f"时间框架: {self.timeframe}")
        
        if self.once:
            await self.run_strategy_cycle()
            self.stop()
            return

        while self.running:
            try:
                await self.run_strategy_cycle()
                
                # 等待下一个周期 (简单休眠，实际可优化为对齐时间)
                # 1H K线，每 1 分钟检查一次即可
                await asyncio.sleep(60) 
                
            except KeyboardInterrupt:
                break
            except Exception as e:
                logger.error(f"运行出错: {e}")
                await asyncio.sleep(60)
        
        self.stop()

    def stop(self):
        self.running = False
        logger.info("🛑 交易机器人停止")

def main():
    parser = argparse.ArgumentParser(description='Pumpkin Soup 策略')
    parser.add_argument('--mode', type=str, default='paper', choices=['paper', 'live'])
    parser.add_argument('--once', action='store_true', help='仅运行一次')
    parser.add_argument('--yes', action='store_true', help='实盘确认')
    
    args = parser.parse_args()
    
    os.makedirs('logs', exist_ok=True)
    
    if args.mode == 'live' and not args.yes:
        print("⚠️  警告：实盘模式！")
        if input("确认继续？(YES): ") != "YES":
            return
            
    trader = PumpkinSoupTrader(mode=args.mode, once=args.once)
    
    try:
        asyncio.run(trader.start())
    except KeyboardInterrupt:
        pass

if __name__ == "__main__":
    main()
