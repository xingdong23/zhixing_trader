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

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from dotenv import load_dotenv
import ccxt
import requests
import pandas as pd

from strategies.ema_simple_trend.strategy_multiframe import EMASimpleTrendMultiframeStrategy

# 加载环境变量
load_dotenv()

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'logs/ema_simple_trend_{datetime.now().strftime("%Y%m%d")}.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


class EMASimpleTrendTrader:
    """EMA Simple Trend 交易机器人"""
    
    def __init__(self, mode: str = "paper"):
        """
        初始化交易机器人
        
        Args:
            mode: 运行模式 'paper' 或 'live'
        """
        self.mode = mode
        
        # 加载配置
        config_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
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
        
        # 交易对和时间框架
        self.symbol = "ETH/USDT"
        self.timeframe = "1h"
        
        # 运行状态
        self.running = False
        self.last_kline_time = None
        
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
            resp = requests.get(url, params=params, timeout=15)
            data = resp.json()
            
            if data.get('code') != '0':
                logger.error(f"获取K线数据失败: {data}")
                return pd.DataFrame()

            candles = data.get('data', [])
            candles = list(reversed(candles))
            
            # 转换为DataFrame
            df = pd.DataFrame(candles, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume', 'volCcy', 'volCcyQuote', 'confirm'])
            df['timestamp'] = pd.to_datetime(df['timestamp'].astype(int), unit='ms')
            df[['open', 'high', 'low', 'close', 'volume']] = df[['open', 'high', 'low', 'close', 'volume']].astype(float)
            
            return df[['timestamp', 'open', 'high', 'low', 'close', 'volume']]
            
        except Exception as e:
            logger.error(f"获取K线数据失败: {e}")
            return pd.DataFrame()
    
    async def run_strategy_cycle(self):
        """运行一次策略循环"""
        try:
            # 获取1小时K线数据
            df_1h = await self.fetch_klines(timeframe='1h', limit=200)
            
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
            
            # 运行策略分析
            signal = self.strategy.analyze(df_1h)
            
            logger.info(f"策略信号: {signal['signal']} - {signal['reason']}")
            
            # 如果有交易信号
            if signal["signal"] in ["buy", "sell", "close"]:
                logger.info(f"🔔 交易信号触发!")
                logger.info(f"  信号: {signal['signal']}")
                logger.info(f"  价格: {signal.get('price', 0):.2f}")
                logger.info(f"  原因: {signal['reason']}")
                
                # 这里可以添加实际的交易执行逻辑
                # 由于您的API只有读权限，所以只记录信号
                
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
        
        while self.running:
            try:
                # 运行策略
                await self.run_strategy_cycle()
                
                # 等待1小时（因为是1小时K线）
                await asyncio.sleep(3600)
                
            except KeyboardInterrupt:
                logger.info("收到停止信号")
                break
            except Exception as e:
                logger.error(f"运行出错: {e}")
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
    
    args = parser.parse_args()
    
    # 创建日志目录
    os.makedirs('logs', exist_ok=True)
    
    # 实盘模式需要确认
    if args.mode == 'live':
        print("\n" + "="*60)
        print("⚠️  警告：您即将在实盘模式下运行策略！")
        print("="*60)
        print("这将使用真实资金进行交易，存在亏损风险。")
        confirm = input("确认继续？(输入 'YES' 继续): ")
        if confirm != 'YES':
            print("已取消")
            return
    
    # 创建并启动交易机器人
    trader = EMASimpleTrendTrader(mode=args.mode)
    
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
