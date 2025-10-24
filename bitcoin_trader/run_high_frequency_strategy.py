"""
高频短线策略实盘运行脚本

使用说明：
1. 确保已配置OKX API密钥（.env文件）
2. 建议先在模拟盘测试
3. 严格遵守风险控制规则

运行方式：
python run_high_frequency_strategy.py --mode paper  # 模拟盘
python run_high_frequency_strategy.py --mode live   # 实盘（谨慎使用）
"""

import os
import sys
import asyncio
import argparse
import logging
from datetime import datetime, timedelta
from typing import Dict, List

# 添加项目路径
sys.path.append('.')

from dotenv import load_dotenv
import ccxt

from app.core.strategies.high_frequency_scalping_strategy import HighFrequencyScalpingStrategy
from app.core.risk_manager import RiskManager, RiskLimits

# 加载环境变量
load_dotenv()

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'logs/high_frequency_strategy_{datetime.now().strftime("%Y%m%d")}.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


class HighFrequencyTrader:
    """高频交易机器人"""
    
    def __init__(self, mode: str = "paper", capital: float = 300.0):
        """
        初始化交易机器人
        
        Args:
            mode: 运行模式 'paper' 或 'live'
            capital: 初始资金
        """
        self.mode = mode
        self.capital = capital
        
        # 初始化交易所
        self.exchange = self._init_exchange()
        
        # 初始化策略
        self.strategy = HighFrequencyScalpingStrategy({
            "total_capital": capital,
            "leverage": 3.0,  # 3倍杠杆
        })
        
        # 初始化风险管理器
        self.risk_manager = RiskManager(
            initial_capital=capital,
            limits=RiskLimits(
                max_daily_loss=0.08,  # 8%
                max_single_loss=0.02,  # 2%
                max_consecutive_losses=2,
                max_trades_per_day=8,
                max_leverage=5.0
            )
        )
        
        # 交易对
        self.symbol = "BTC/USDT"
        
        # 运行状态
        self.running = False
        self.last_kline_time = None
        
        logger.info(f"高频交易机器人初始化完成 - 模式: {mode}, 资金: {capital} USDT")
    
    def _init_exchange(self) -> ccxt.Exchange:
        """初始化交易所"""
        api_key = os.getenv("OKX_API_KEY")
        api_secret = os.getenv("OKX_API_SECRET")
        passphrase = os.getenv("OKX_PASSPHRASE")
        
        if not all([api_key, api_secret, passphrase]):
            raise ValueError("请在.env文件中配置OKX API密钥")
        
        # 创建OKX交易所实例
        config = {
            'apiKey': api_key,
            'secret': api_secret,
            'password': passphrase,
            'enableRateLimit': True,
        }
        
        # 设置为模拟盘或实盘
        if self.mode == "paper":
            config['options'] = {
                'defaultType': 'swap',  # 合约交易
            }
            config['hostname'] = 'www.okx.com'  # 使用模拟盘域名
            exchange = ccxt.okx(config)
            exchange.set_sandbox_mode(True)
            logger.info("✓ 使用OKX模拟盘")
        else:
            exchange = ccxt.okx(config)
            logger.warning("⚠️  使用OKX实盘 - 请谨慎操作！")
        
        return exchange
    
    async def fetch_klines(self, timeframe: str = '5m', limit: int = 200) -> List[Dict]:
        """获取K线数据"""
        try:
            ohlcv = self.exchange.fetch_ohlcv(
                symbol=self.symbol,
                timeframe=timeframe,
                limit=limit
            )
            
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
            
            return klines
            
        except Exception as e:
            logger.error(f"获取K线数据失败: {e}")
            return []
    
    async def execute_trade(self, signal: Dict):
        """执行交易"""
        try:
            # 风险检查
            allowed, reason = self.risk_manager.check_trade_allowed(
                symbol=self.symbol,
                side=signal["signal"],
                amount=signal.get("amount", 0),
                price=signal.get("price", 0)
            )
            
            if not allowed:
                logger.warning(f"交易被风控拒绝: {reason}")
                return
            
            # 执行订单
            if signal["signal"] == "buy":
                order = self.exchange.create_market_buy_order(
                    symbol=self.symbol,
                    amount=signal["amount"]
                )
                logger.info(f"✓ 买入订单执行成功: {order}")
                
            elif signal["signal"] == "sell":
                order = self.exchange.create_market_sell_order(
                    symbol=self.symbol,
                    amount=signal["amount"]
                )
                logger.info(f"✓ 卖出订单执行成功: {order}")
            
            # 更新策略持仓
            self.strategy.update_position(signal)
            
            # 记录交易
            self.strategy.record_trade(signal)
            self.risk_manager.record_trade({
                "symbol": self.symbol,
                "side": signal["signal"],
                "amount": signal.get("amount", 0),
                "price": signal.get("price", 0),
                "pnl": signal.get("pnl", 0) * signal.get("price", 0) * signal.get("amount", 0)
            })
            
        except Exception as e:
            logger.error(f"执行交易失败: {e}")
    
    async def run_strategy_cycle(self):
        """运行一次策略循环"""
        try:
            # 获取5分钟K线数据
            klines = await self.fetch_klines(timeframe='5m', limit=200)
            
            if not klines:
                logger.warning("未获取到K线数据")
                return
            
            # 检查是否有新K线
            current_kline_time = klines[-1]["timestamp"]
            if self.last_kline_time and current_kline_time == self.last_kline_time:
                # 没有新K线，跳过
                return
            
            self.last_kline_time = current_kline_time
            
            # 运行策略分析
            signal = self.strategy.analyze(klines)
            
            logger.info(f"策略信号: {signal['signal']} - {signal['reason']}")
            
            # 如果有交易信号，执行交易
            if signal["signal"] in ["buy", "sell"]:
                logger.info(f"🔔 交易信号触发!")
                logger.info(f"  信号: {signal['signal']}")
                logger.info(f"  价格: {signal.get('price', 0):.2f}")
                logger.info(f"  数量: {signal.get('amount', 0):.6f}")
                logger.info(f"  止损: {signal.get('stop_loss', 0):.2f}")
                logger.info(f"  止盈: {signal.get('take_profit', 0):.2f}")
                
                await self.execute_trade(signal)
            
            # 打印统计信息
            stats = self.strategy.get_statistics()
            logger.info(f"📊 策略统计: 今日交易={stats['daily_trades']}, "
                       f"胜率={stats['win_rate']:.1f}%, "
                       f"盈亏={self.strategy.daily_pnl:.2f} USDT")
            
        except Exception as e:
            logger.error(f"策略循环出错: {e}")
            import traceback
            traceback.print_exc()
    
    async def start(self):
        """启动交易机器人"""
        self.running = True
        logger.info("="*60)
        logger.info("🚀 高频短线交易机器人启动")
        logger.info("="*60)
        logger.info(f"交易对: {self.symbol}")
        logger.info(f"初始资金: {self.capital} USDT")
        logger.info(f"运行模式: {self.mode}")
        logger.info(f"杠杆倍数: {self.strategy.parameters['leverage']}x")
        logger.info("="*60)
        
        # 每日重置时间
        last_reset_date = datetime.now().date()
        
        while self.running:
            try:
                # 检查是否需要重置每日统计
                current_date = datetime.now().date()
                if current_date > last_reset_date:
                    logger.info("📅 新的一天，重置统计数据")
                    self.strategy.reset_daily_stats()
                    self.risk_manager.reset_daily_stats()
                    last_reset_date = current_date
                
                # 运行策略
                await self.run_strategy_cycle()
                
                # 等待30秒再次检查（高频策略）
                await asyncio.sleep(30)
                
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
        logger.info("🛑 高频短线交易机器人停止")
        logger.info("="*60)
        
        # 打印最终统计
        stats = self.strategy.get_statistics()
        logger.info(f"最终统计:")
        logger.info(f"  总交易次数: {stats['daily_trades']}")
        logger.info(f"  盈利次数: {stats['winning_trades']}")
        logger.info(f"  亏损次数: {stats['losing_trades']}")
        logger.info(f"  胜率: {stats['win_rate']:.1f}%")
        logger.info(f"  总盈亏: {self.strategy.daily_pnl:.2f} USDT")
        logger.info("="*60)


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='高频短线交易策略')
    parser.add_argument('--mode', type=str, default='paper', 
                       choices=['paper', 'live'],
                       help='运行模式: paper(模拟盘) 或 live(实盘)')
    parser.add_argument('--capital', type=float, default=300.0,
                       help='初始资金(USDT)')
    
    args = parser.parse_args()
    
    # 创建日志目录
    os.makedirs('logs', exist_ok=True)
    
    # 实盘模式需要确认
    if args.mode == 'live':
        print("\n" + "="*60)
        print("⚠️  警告：您即将在实盘模式下运行策略！")
        print("="*60)
        print("这将使用真实资金进行交易，存在亏损风险。")
        print("请确保：")
        print("1. 已充分测试策略")
        print("2. 了解所有风险")
        print("3. 设置了合理的止损")
        print("="*60)
        confirm = input("确认继续？(输入 'YES' 继续): ")
        if confirm != 'YES':
            print("已取消")
            return
    
    # 创建并启动交易机器人
    trader = HighFrequencyTrader(mode=args.mode, capital=args.capital)
    
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
