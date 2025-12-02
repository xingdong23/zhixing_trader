"""
EMA Simple Trend 策略运行脚本

使用说明：
python app/run/ema_simple_trend.py --mode paper  # 模拟盘
python app/run/ema_simple_trend.py --mode live   # 实盘
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

from strategies.ema_simple_trend.strategy_multiframe import EMASimpleTrendMultiframeStrategy
from live_trading.common.db_logger import DBLogger
from live_trading.common.mysql_logger import MySQLLogger

# 加载环境变量
load_dotenv()

# 配置日志（按天轮转，保留7天）
log_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
file_handler = TimedRotatingFileHandler(
    filename='logs/ema_simple_trend.log',
    when='midnight',
    backupCount=7,
    encoding='utf-8'
)
file_handler.setFormatter(log_formatter)
console_handler = logging.StreamHandler()
console_handler.setFormatter(log_formatter)
logging.basicConfig(level=logging.INFO, handlers=[file_handler, console_handler])

logger = logging.getLogger(__name__)


class EMASimpleTrendTrader:
    """EMA Simple Trend 交易机器人"""
    
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
        """
        初始化交易机器人
        
        Args:
            mode: 运行模式 'paper' 或 'live'
            symbol: 交易对（可选，默认 ETH/USDT）
            timeframe: 时间框架（可选，默认 1H）
            once: 是否仅运行一次检查后退出
        """
        self.mode = mode
        
        # 加载配置
        config_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            'strategies/ema_simple_trend/config_multiframe.json'
        )
        
        with open(config_path, 'r', encoding='utf-8') as f:
            self.config = json.load(f)
        
        # 初始化交易所
        self.exchange = self._init_exchange()
        
        # 初始化策略（实盘模式不从文件加载日线数据）
        self.strategy = EMASimpleTrendMultiframeStrategy(
            self.config.get('capital_management', self.config),
            load_daily_from_file=False  # 实盘模式从API获取
        )
        
        # 交易对和时间框架（支持参数覆盖）
        self.symbol = symbol or "ETH/USDT"
        self.timeframe = (timeframe or "1H").upper()  # OKX格式：1H, 4H, 1D等
        
        # 运行状态
        self.running = False
        self.last_kline_time = None
        self.once = once
        # 数据库记录器（优先读取JSON配置，其次CLI覆盖，最后ENV/默认）
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
        
        # 获取资金配置
        capital = self.config.get('capital_management', {}).get('total_capital', 300.0)
        logger.info(f"EMA Simple Trend 交易机器人初始化完成 - 模式: {mode}, 资金: {capital} USDT")
    
    def _init_exchange(self) -> ccxt.Exchange:
        """初始化交易所"""
        api_key = os.getenv("OKX_API_KEY")
        api_secret = os.getenv("OKX_API_SECRET")
        passphrase = os.getenv("OKX_PASSPHRASE")
        
        if not all([api_key, api_secret, passphrase]):
            raise ValueError("请在.env文件中配置OKX API密钥")
        
        exchange = ccxt.okx({
            'apiKey': api_key,
            'secret': api_secret,
            'password': passphrase,
            'enableRateLimit': True,
        })
        
        # 设置为合约交易模式
        exchange.options['defaultType'] = 'swap'
        
        if self.mode == "paper":
            logger.info("✓ 使用OKX模拟盘API Key（虚拟资金，真实API调用）")
        else:
            logger.warning("⚠️  使用OKX实盘API Key（真实资金）- 请谨慎操作！")
        
        return exchange
    
    async def fetch_klines(self, timeframe: str = None, limit: int = 200) -> pd.DataFrame:
        """
        获取K线数据
        
        Args:
            timeframe: 时间框架，默认使用self.timeframe
            limit: K线数量
        """
        try:
            if timeframe is None:
                timeframe = self.timeframe
                
            inst_id = self.symbol.replace('/', '-')
            url = 'https://www.okx.com/api/v5/market/candles'
            params = {
                'instId': inst_id,
                'bar': timeframe,
                'limit': str(limit),
            }

            # 简单重试机制，最多3次，指数退避
            for attempt in range(3):
                try:
                    resp = requests.get(url, params=params, timeout=15)
                    data = resp.json()
                    if data.get('code') == '0':
                        candles = data.get('data', [])
                        candles = list(reversed(candles))
                        # 转换为DataFrame
                        df = pd.DataFrame(candles, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume', 'volCcy', 'volCcyQuote', 'confirm'])
                        df['timestamp'] = pd.to_datetime(df['timestamp'].astype(int), unit='ms')
                        df[['open', 'high', 'low', 'close', 'volume']] = df[['open', 'high', 'low', 'close', 'volume']].astype(float)
                        return df[['timestamp', 'open', 'high', 'low', 'close', 'volume']]
                    else:
                        logger.warning(f"获取K线数据失败(第{attempt+1}次): {data}")
                except Exception as e:
                    logger.warning(f"请求OKX失败(第{attempt+1}次): {e}")
                # 退避等待
                await asyncio.sleep(2 * (attempt + 1))

            # 多次重试失败
            logger.error("获取K线数据失败: 超过最大重试次数")
            return pd.DataFrame()
            
        except Exception as e:
            logger.error(f"获取K线数据失败: {e}")
            return pd.DataFrame()
    
    async def run_strategy_cycle(self):
        """运行一次策略循环"""
        try:
            # 获取1小时K线数据
            df_1h = await self.fetch_klines(timeframe='1H', limit=200)
            
            if df_1h.empty:
                logger.warning("未获取到1小时K线数据")
                return
            
            # 检查是否有新K线
            current_kline_time = df_1h.iloc[-1]['timestamp']
            if self.last_kline_time and current_kline_time == self.last_kline_time:
                return
            
            self.last_kline_time = current_kline_time
            
            # 如果策略启用了日线趋势过滤，获取日线数据并更新
            if self.strategy.use_daily_trend_filter:
                df_1d = await self.fetch_klines(timeframe='1D', limit=100)
                if not df_1d.empty:
                    # 转换为策略需要的格式
                    daily_klines = []
                    for _, row in df_1d.iterrows():
                        daily_klines.append({
                            'timestamp': row['timestamp'],
                            'open': row['open'],
                            'high': row['high'],
                            'low': row['low'],
                            'close': row['close'],
                            'volume': row['volume']
                        })
                    # 更新策略的日线数据
                    self.strategy.update_daily_data(daily_klines)
                    logger.debug(f"✓ 已更新日线数据: {len(daily_klines)} 条")
            
            # 转换DataFrame为字典列表（策略需要的格式）
            klines_1h = []
            for _, row in df_1h.iterrows():
                klines_1h.append({
                    'timestamp': row['timestamp'],
                    'open': row['open'],
                    'high': row['high'],
                    'low': row['low'],
                    'close': row['close'],
                    'volume': row['volume']
                })
            
            # 运行策略分析
            signal = self.strategy.analyze(klines_1h)
            
            logger.info(f"策略信号: {signal['signal']} - {signal['reason']}")
            
            # 如果有交易信号：写入数据库（信号 + 订单占位）
            if signal["signal"] in ["buy", "sell", "close"]:
                logger.info(f"🔔 交易信号触发!")
                logger.info(f"  信号: {signal['signal']}")
                logger.info(f"  价格: {signal.get('price', 0):.2f}")
                logger.info(f"  原因: {signal['reason']}")
                
                try:
                    sig_id = self.db.log_signal(
                        mode=self.mode,
                        symbol=self.symbol,
                        timeframe=self.timeframe,
                        signal=signal,
                    )
                    # 当前不下单：记录一条未下单的占位订单，便于审计
                    self.db.log_order(
                        signal_id=sig_id,
                        side=signal["signal"],
                        price=signal.get("price"),
                        amount=signal.get("amount"),
                        status="not_placed",
                        details={"reason": "read-only key / dry-run", "mode": self.mode},
                    )
                except Exception as e:
                    logger.error(f"记录交易信号到数据库失败: {e}")
                
        except Exception as e:
            logger.error(f"策略循环出错: {e}")
            import traceback
            traceback.print_exc()
    
    async def start(self):
        """启动交易机器人"""
        self.running = True
        logger.info("="*60)
        logger.info("🚀 EMA Simple Trend 交易机器人启动")
        logger.info("="*60)
        logger.info(f"交易对: {self.symbol}")
        logger.info(f"时间框架: {self.timeframe}")
        capital = self.config.get('capital_management', {}).get('total_capital', 300.0)
        logger.info(f"初始资金: {capital} USDT")
        logger.info(f"运行模式: {self.mode}")
        logger.info("="*60)
        
        # 记录配置快照（不保存明文密钥，仅记录是否存在）
        try:
            env_info = {
                "has_api_key": bool(os.getenv("OKX_API_KEY")),
                "has_api_secret": bool(os.getenv("OKX_API_SECRET")),
                "has_passphrase": bool(os.getenv("OKX_PASSPHRASE")),
            }
            self.db.log_config_snapshot(
                mode=self.mode,
                symbol=self.symbol,
                timeframe=self.timeframe,
                config=self.config,
                env_info=env_info,
            )
        except Exception as e:
            logger.error(f"记录配置快照失败: {e}")

        # 单次检查模式：运行一次后退出
        if self.once:
            try:
                await self.run_strategy_cycle()
                logger.info("✅ 单次检查完成，程序退出")
            except Exception as e:
                logger.error(f"单次检查失败: {e}")
            self.stop()
            return

        cycle_count = 0
        while self.running:
            try:
                # 运行策略
                await self.run_strategy_cycle()
                cycle_count += 1
                
                # 每次循环后输出心跳日志
                logger.info(f"💓 策略运行中 - 第 {cycle_count} 次检查完成，等待下一个小时...")
                
                # 等待1小时，但每5分钟输出一次心跳
                for i in range(12):  # 12 * 5分钟 = 60分钟
                    await asyncio.sleep(300)  # 5分钟
                    if i < 11:  # 不在最后一次输出
                        logger.info(f"⏰ 心跳检测 - 策略正常运行中 ({(i+1)*5}分钟/{60}分钟)")
                
            except KeyboardInterrupt:
                logger.info("收到停止信号")
                break
            except Exception as e:
                logger.error(f"运行出错: {e}")
                import traceback
                traceback.print_exc()
                await asyncio.sleep(60)
        
        self.stop()
    
    def stop(self):
        """停止交易机器人"""
        self.running = False
        logger.info("="*60)
        logger.info("🛑 EMA Simple Trend 交易机器人停止")
        logger.info("="*60)


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='EMA Simple Trend 策略')
    parser.add_argument('--mode', type=str, default='paper', 
                       choices=['paper', 'live'],
                       help='运行模式: paper(模拟盘) 或 live(实盘)')
    parser.add_argument('--symbol', type=str, default=None, help='交易对, 如 ETH/USDT')
    parser.add_argument('--timeframe', type=str, default=None, help='时间框架, 如 1H/4H/1D')
    parser.add_argument('--once', action='store_true', help='仅运行一次检查后退出')
    parser.add_argument('--yes', action='store_true', help='实盘模式跳过交互确认')
    parser.add_argument('--db-path', type=str, default=None, help='SQLite数据库路径, 默认 logs/trading.sqlite3')
    parser.add_argument('--db', type=str, default=None, choices=['sqlite', 'mysql'], help='数据库后端: sqlite 或 mysql（默认从配置文件读取）')
    parser.add_argument('--mysql-host', type=str, default=None, help='MySQL 主机, 默认 127.0.0.1')
    parser.add_argument('--mysql-port', type=int, default=None, help='MySQL 端口, 默认 3306')
    parser.add_argument('--mysql-user', type=str, default=None, help='MySQL 用户, 默认 root')
    parser.add_argument('--mysql-password', type=str, default=None, help='MySQL 密码')
    parser.add_argument('--mysql-database', type=str, default=None, help='MySQL 数据库名, 默认 trading')
    
    args = parser.parse_args()
    
    # 创建日志目录
    os.makedirs('logs', exist_ok=True)
    
    # 实盘模式需要确认（允许通过 --yes 跳过）
    if args.mode == 'live' and not args.yes:
        print("\n" + "="*60)
        print("⚠️  警告：您即将在实盘模式下运行策略！")
        print("="*60)
        print("这将使用真实资金进行交易，存在亏损风险。")
        confirm = input("确认继续？(输入 'YES' 继续): ")
        if confirm != 'YES':
            print("已取消")
            return
    
    # 创建并启动交易机器人
    trader = EMASimpleTrendTrader(
        mode=args.mode,
        symbol=args.symbol,
        timeframe=args.timeframe,
        once=args.once,
        db_path=args.db_path,
        db_backend=args.db,
        mysql_host=args.mysql_host,
        mysql_port=args.mysql_port,
        mysql_user=args.mysql_user,
        mysql_password=args.mysql_password,
        mysql_database=args.mysql_database,
    )
    
    try:
        asyncio.run(trader.start())
    except KeyboardInterrupt:
        logger.info("用户中断")
    except Exception as e:
        logger.error(f"程序异常: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
