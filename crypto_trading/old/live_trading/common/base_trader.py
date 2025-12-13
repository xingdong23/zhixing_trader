import os
import sys
import asyncio
import logging
import json
import pandas as pd
import ccxt
from datetime import datetime
from typing import Dict, List, Optional, Any
from logging.handlers import TimedRotatingFileHandler
from dotenv import load_dotenv

from live_trading.common.db_logger import DBLogger
from live_trading.common.mysql_logger import MySQLLogger
import requests
import time

logger = logging.getLogger(__name__)

class BaseTrader:
    """
    加密货币交易策略基类。
    处理通用逻辑：交易所连接、数据获取、日志记录、主循环。
    """

    def __init__(
        self,
        name: str,
        config_path: str,
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
        self.name = name
        self.mode = mode
        self.once = once
        self.running = False
        self.last_kline_time = None

        # 1. 加载配置
        self.config = self._load_config(config_path)

        # 2. 设置日志
        self._setup_logging()

        # 3. 初始化交易所
        self.exchange = self._init_exchange()

        # 4. 初始化数据库
        self.db = self._init_database(
            db_path, db_backend, mysql_host, mysql_port, mysql_user, mysql_password, mysql_database
        )

        # 5. 设置交易对和时间框架 (命令行参数覆盖配置文件)
        self.symbol = symbol or self.config.get('strategy', {}).get('symbol', "BTC/USDT")
        self.timeframe = (timeframe or self.config.get('strategy', {}).get('timeframe', "1H")).upper()
        
        # 6. 初始化策略 (抽象方法)
        self.strategy = self._init_strategy()

        logger.info(f"{self.name} 交易机器人初始化完成 - 模式: {self.mode}, 交易对: {self.symbol}, 时间周期: {self.timeframe}")

    def _load_config(self, config_path: str) -> Dict:
        if not os.path.exists(config_path):
            # 如果实盘配置不存在，尝试在同一目录下查找默认的 config.json
            default_config = config_path.replace('_live.json', '.json')
            if os.path.exists(default_config):
                logger.warning(f"配置文件 {config_path} 未找到，使用默认配置 {default_config}")
                config_path = default_config
            else:
                raise FileNotFoundError(f"配置文件未找到: {config_path}")

        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _setup_logging(self):
        # 确保日志目录存在
        os.makedirs('logs', exist_ok=True)
        
        log_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        file_handler = TimedRotatingFileHandler(
            filename=f'logs/{self.name}.log',
            when='midnight',
            backupCount=7,
            encoding='utf-8'
        )
        file_handler.setFormatter(log_formatter)
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(log_formatter)
        
        # 获取根记录器并设置处理程序（如果尚未设置）
        root_logger = logging.getLogger()
        root_logger.setLevel(logging.INFO)
        if not root_logger.handlers:
            root_logger.addHandler(file_handler)
            root_logger.addHandler(console_handler)

    def _init_exchange(self) -> ccxt.Exchange:
        # 尝试从策略目录加载 .env，或依赖全局环境变量
        # (子类可以在调用 super().__init__ 之前加载特定的 .env 文件)
        
        exchange_config = self.config.get('exchange', {})
        exchange_name = exchange_config.get('name', 'binance')
        
        # 尝试从环境变量获取密钥 (标准化命名)
        api_key = os.getenv(f"{exchange_name.upper()}_API_KEY") or exchange_config.get('api_key')
        api_secret = os.getenv(f"{exchange_name.upper()}_API_SECRET") or exchange_config.get('api_secret')
        passphrase = os.getenv(f"{exchange_name.upper()}_PASSPHRASE")

        if not all([api_key, api_secret]):
             if self.mode == 'paper':
                 logger.warning("未找到 API 密钥。模拟盘模式功能可能受限。")
             else:
                 raise ValueError(f"实盘模式需要配置 {exchange_name} 的 API 密钥。")

        exchange_class = getattr(ccxt, exchange_name)
        exchange_params = {
            'apiKey': api_key,
            'secret': api_secret,
            'enableRateLimit': True,
        }
        if passphrase:
            exchange_params['password'] = passphrase

        exchange = exchange_class(exchange_params)

        # 设置市场类型 (swap/future)
        if exchange_name == 'binance':
            exchange.options['defaultType'] = 'future'
        elif exchange_name == 'okx':
            exchange.options['defaultType'] = 'swap'

        if self.mode == "paper":
            logger.info(f"✓ 使用 {exchange_name} 模拟盘/沙箱模式")
            exchange.set_sandbox_mode(True)
        else:
            logger.warning(f"⚠️  使用 {exchange_name} 实盘模式 - 真实资金操作！")

        return exchange

    def _init_database(self, db_path, db_backend, host, port, user, password, database):
        cfg_db = (self.config or {}).get('database', {})
        cfg_backend = (cfg_db.get('backend') or '').lower() if isinstance(cfg_db, dict) else ''
        eff_backend = (db_backend or cfg_backend or 'sqlite').lower()

        if eff_backend == 'mysql':
            cfg_mysql = cfg_db.get('mysql', {}) if isinstance(cfg_db, dict) else {}
            eff_host = host or cfg_mysql.get('host') or os.getenv('MYSQL_HOST', '127.0.0.1')
            eff_port = int(port or cfg_mysql.get('port') or os.getenv('MYSQL_PORT', 3306))
            eff_user = user or cfg_mysql.get('user') or os.getenv('MYSQL_USER', 'root')
            eff_password = password or cfg_mysql.get('password') or os.getenv('MYSQL_PASSWORD', '')
            eff_database = database or cfg_mysql.get('database') or os.getenv('MYSQL_DB', 'trading')
            
            db = MySQLLogger(host=eff_host, port=eff_port, user=eff_user, password=eff_password, database=eff_database)
            logger.info(f"✓ 使用 MySQL 记录器 - {eff_user}@{eff_host}:{eff_port}/{eff_database}")
            return db
        else:
            eff_db_path = db_path or 'logs/trading.sqlite3'
            db = DBLogger(eff_db_path)
            logger.info(f"✓ 使用 SQLite 记录器 - {eff_db_path}")
            return db

    def _init_strategy(self):
        raise NotImplementedError("子类必须实现 _init_strategy")

    async def fetch_klines(self, timeframe: str = None, limit: int = 200) -> pd.DataFrame:
        try:
            tf = timeframe or self.timeframe
            ohlcv = self.exchange.fetch_ohlcv(self.symbol, tf, limit=limit)
            df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            return df
        except Exception as e:
            logger.error(f"获取 K 线数据失败: {e}")
            return pd.DataFrame()

    async def run_strategy_cycle(self):
        raise NotImplementedError("子类必须实现 run_strategy_cycle")

    async def start(self):
        self.running = True
        logger.info("="*60)
        logger.info(f"🚀 {self.name} 已启动")
        logger.info("="*60)
        
        # 0. 启动前健康检查
        if not await self.check_health():
            logger.critical("❌ 健康检查失败，无法启动")
            self.send_alert("启动失败", f"{self.name} 健康检查未通过，请检查日志")
            return
            
        self.send_alert("启动成功", f"🚀 {self.name} 交易机器人已启动\n模式: {self.mode}\n交易对: {self.symbol}")

        if self.once:
            await self.run_strategy_cycle()
            self.stop()
            return

        while self.running:
            try:
                await self.run_strategy_cycle()
                # 等待下一个周期 (目前简单休眠)
                await asyncio.sleep(60)
            except KeyboardInterrupt:
                break
            except Exception as e:
                logger.error(f"主循环出错: {e}")
                await asyncio.sleep(60)
        
        self.stop()

    def stop(self):
        self.running = False
        logger.info(f"🛑 {self.name} 已停止")
        self.send_alert("停止运行", f"🛑 {self.name} 交易机器人已停止")

    async def check_health(self) -> bool:
        """启动前健康检查"""
        try:
            # 1. 检查交易所连接
            logger.info("正在检查交易所连接...")
            await self.exchange.fetch_time()
            logger.info("✓ 交易所连接正常")
            
            # 2. 检查数据库连接 (如果是 MySQL)
            # SQLite 是本地文件，通常没问题
            
            # 3. 检查余额 (确保 API Key 权限正确)
            logger.info("正在检查账户权限...")
            await self.exchange.fetch_balance()
            logger.info("✓ 账户权限正常")
            
            return True
        except Exception as e:
            logger.error(f"健康检查失败: {e}")
            return False

    def send_alert(self, title: str, message: str):
        """发送飞书报警"""
        webhook = os.getenv("FEISHU_WEBHOOK")
        if not webhook:
            return
            
        try:
            # 构造飞书富文本消息
            data = {
                "msg_type": "post",
                "content": {
                    "post": {
                        "zh_cn": {
                            "title": title,
                            "content": [
                                [{"tag": "text", "text": message}]
                            ]
                        }
                    }
                }
            }
            response = requests.post(webhook, json=data, timeout=5)
            if response.status_code != 200:
                logger.error(f"发送报警失败: {response.text}")
        except Exception as e:
            logger.error(f"发送报警异常: {e}")
