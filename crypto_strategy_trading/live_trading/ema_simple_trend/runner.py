"""
EMA Simple Trend 策略运行脚本

使用说明：
python live_trading/ema_simple_trend/runner.py --mode paper  # 模拟盘
python live_trading/ema_simple_trend/runner.py --mode live   # 实盘
"""

import os
import sys
import asyncio
import argparse
import logging
from dotenv import load_dotenv

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from live_trading.common.base_trader import BaseTrader
from strategies.ema_simple_trend.strategy import EMASimpleTrendMultiframeStrategy

logger = logging.getLogger(__name__)

# 加载环境变量
load_dotenv()


class EMASimpleTrendTrader(BaseTrader):
    """EMA Simple Trend 交易机器人"""
    
    def __init__(self, **kwargs):
        # 构造配置文件路径
        config_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            'strategies/ema_simple_trend/config.json'
        )
        
        super().__init__(
            name="ema_simple_trend",
            config_path=config_path,
            **kwargs
        )

    def _init_strategy(self):
        # 初始化策略（实盘模式不从文件加载日线数据）
        return EMASimpleTrendMultiframeStrategy(
            self.config.get('capital_management', self.config),
            load_daily_from_file=False  # 实盘模式从API获取
        )
    
    async def run_strategy_cycle(self):
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
                    daily_klines = df_1d.to_dict('records')
                    # 更新策略的日线数据
                    self.strategy.update_daily_data(daily_klines)
                    logger.debug(f"✓ 已更新日线数据: {len(daily_klines)} 条")
            
            # 转换DataFrame为字典列表（策略需要的格式）
            klines_1h = df_1h.to_dict('records')
            
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


def main():
    parser = argparse.ArgumentParser(description='EMA Simple Trend 策略')
    parser.add_argument('--mode', type=str, default='paper', choices=['paper', 'live'])
    parser.add_argument('--symbol', type=str, default=None)
    parser.add_argument('--timeframe', type=str, default=None)
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
        pass

if __name__ == "__main__":
    main()
