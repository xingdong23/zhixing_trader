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
from dotenv import load_dotenv
import time

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from live_trading.common.base_trader import BaseTrader
from strategies.pumpkin_soup.strategy import PumpkinSoupStrategy
from live_trading.pumpkin_soup.executor import PumpkinSoupExecutor
from ccxt.base.errors import InsufficientFunds

logger = logging.getLogger(__name__)

# 加载环境变量 (优先加载当前目录下的 .env)
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(env_path)


class PumpkinSoupTrader(BaseTrader):
    """Pumpkin Soup 交易机器人"""
    
    def __init__(self, **kwargs):
        # 构造配置文件路径
        config_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            'strategies/pumpkin_soup/config_live.json'
        )
        
        super().__init__(
            name="pumpkin_soup",
            config_path=config_path,
            **kwargs
        )
        
        # 初始化执行器
        self.executor = PumpkinSoupExecutor(
            exchange=self.exchange,
            symbol=self.symbol,
            strategy=self.strategy,
            mode=self.mode,
            db=self.db,
            alert_callback=self.send_alert
        )

    def _init_strategy(self):
        # 准备策略参数
        strategy_params = self.config.get('strategy', {}).get('parameters', {}).copy()
        risk_params = self.config.get('risk_management', {}).copy()
        # 合并参数
        strategy_params.update(risk_params)
        
        return PumpkinSoupStrategy(strategy_params)

    async def start(self):
        """重写启动方法，添加初始状态同步"""
        await self.executor.sync_state()
        await super().start()
    
    async def run_strategy_cycle(self):
        try:
            # 0. 定期同步状态 (每5分钟)
            current_time = time.time()
            if not hasattr(self, 'last_sync_time'): self.last_sync_time = 0
            
            if current_time - self.last_sync_time > 300:
                await self.executor.sync_state()
                self.last_sync_time = current_time

            # 获取 K 线
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
            
            logger.info(f"策略信号: {signal['signal']} - {signal['reason']}")
            
            # 如果有交易信号
            if signal["signal"] in ["buy", "sell"]:
                logger.info(f"🔔 交易信号触发: {signal['signal']}")
                
                try:
                    # 1. 记录信号到数据库
                    sig_id = self.db.log_signal(
                        mode=self.mode,
                        symbol=self.symbol,
                        timeframe=self.timeframe,
                        signal=signal,
                    )
                    
                    # 2. 执行交易 (委托给 executor)
                    await self.executor.execute_trade(signal)
                    
                    # 3. 交易成功后，更新策略内部状态
                    self.strategy.update_position(signal)
                    
                    # 4. 记录下单日志
                    self.db.log_order(
                        signal_id=sig_id,
                        side=signal["signal"],
                        price=signal.get("price"),
                        amount=signal.get("amount"),
                        status="placed",
                        details={"mode": self.mode},
                    )
                    
                except InsufficientFunds:
                    self.stop()
                except Exception as e:
                    logger.error(f"❌ 交易流程失败: {e}")
            
            # 如果是平仓信号 (exit)
            elif signal.get("type") in ["stop_loss", "take_profit"]:
                 logger.info(f"🔔 平仓信号触发: {signal['type']}")
                 try:
                     await self.executor.execute_trade(signal)
                     self.strategy.update_position(signal)
                 except Exception as e:
                     logger.error(f"❌ 平仓失败: {e}")

        except Exception as e:
            logger.error(f"策略循环出错: {e}")
            import traceback
            traceback.print_exc()


def main():
    parser = argparse.ArgumentParser(description='Pumpkin Soup 策略')
    parser.add_argument('--mode', type=str, default='paper', choices=['paper', 'live'])
    parser.add_argument('--once', action='store_true', help='仅运行一次')
    parser.add_argument('--yes', action='store_true', help='实盘确认')
    
    # 数据库相关参数
    parser.add_argument('--db-path', type=str, default=None)
    parser.add_argument('--db', type=str, default=None, choices=['sqlite', 'mysql'])
    parser.add_argument('--mysql-host', type=str, default=None)
    parser.add_argument('--mysql-port', type=int, default=None)
    parser.add_argument('--mysql-user', type=str, default=None)
    parser.add_argument('--mysql-password', type=str, default=None)
    parser.add_argument('--mysql-database', type=str, default=None)
    
    args = parser.parse_args()
    
    if args.mode == 'live' and not args.yes:
        print("⚠️  警告：实盘模式！")
        if input("确认继续？(YES): ") != "YES":
            return
            
    trader = PumpkinSoupTrader(
        mode=args.mode, 
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
        pass

if __name__ == "__main__":
    main()
