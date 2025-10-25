"""
高频短线策略运行脚本

使用说明：
python run/high_frequency.py --mode paper  # 模拟盘
python run/high_frequency.py --mode live   # 实盘
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
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
import ccxt
import requests

from strategies.high_frequency import HighFrequencyScalpingStrategy, RiskManager, RiskLimits

# 加载环境变量
load_dotenv()

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'logs/high_frequency_{datetime.now().strftime("%Y%m%d")}.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


class HighFrequencyTrader:
    """高频交易机器人"""
    
    def __init__(self, mode: str = "paper", config_file: str = None):
        """
        初始化交易机器人
        
        Args:
            mode: 运行模式 'paper' 或 'live'
            config_file: 配置文件路径
        """
        self.mode = mode
        
        # 加载配置
        self.config = self._load_config(config_file)
        
        # 初始化交易所
        self.exchange = self._init_exchange()
        
        # 初始化策略
        self.strategy = HighFrequencyScalpingStrategy({
            "total_capital": self.config['trading']['capital'],
            "leverage": self.config['trading']['leverage'],
        })
        
        # 初始化风险管理器
        risk_config = self.config['risk_control']
        self.risk_manager = RiskManager(
            initial_capital=self.config['trading']['capital'],
            limits=RiskLimits(
                max_daily_loss=risk_config['max_daily_loss'],
                max_single_loss=0.02,
                max_consecutive_losses=risk_config['max_consecutive_losses'],
                max_trades_per_day=risk_config['max_trades_per_day'],
                max_leverage=5.0
            )
        )
        
        # 交易对
        self.symbol = self.config['trading']['symbol']
        self.timeframe = self.config['trading']['timeframe']
        
        # 运行状态
        self.running = False
        self.last_kline_time = None
        
        logger.info(f"高频交易机器人初始化完成 - 模式: {mode}, 资金: {self.config['trading']['capital']} USDT")
    
    def _load_config(self, config_file: str = None) -> Dict:
        """加载配置文件"""
        if config_file is None:
            config_file = 'config/high_frequency.json'
        
        config_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            config_file
        )
        
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
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
        
        if self.mode == "paper":
            logger.info("✓ 使用OKX模拟盘API Key")
        else:
            logger.warning("⚠️  使用OKX实盘API Key - 请谨慎操作！")
        
        return exchange
    
    async def fetch_klines(self, limit: int = 200) -> List[Dict]:
        """获取K线数据"""
        try:
            inst_id = self.symbol.replace('/', '-')
            url = 'https://www.okx.com/api/v5/market/candles'
            params = {
                'instId': inst_id,
                'bar': self.timeframe,
                'limit': str(limit),
            }
            resp = requests.get(url, params=params, timeout=15)
            data = resp.json()
            
            if data.get('code') != '0':
                logger.error(f"获取K线数据失败: {data}")
                return []

            candles = data.get('data', [])
            candles = list(reversed(candles))
            
            klines: List[Dict] = []
            for c in candles:
                ts = int(float(c[0]))
                klines.append({
                    'timestamp': datetime.fromtimestamp(ts / 1000),
                    'open': float(c[1]),
                    'high': float(c[2]),
                    'low': float(c[3]),
                    'close': float(c[4]),
                    'volume': float(c[5]) if len(c) > 5 and c[5] is not None else 0.0,
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
            
            # 执行订单（模拟盘和实盘都真实调用OKX API）
            if signal["signal"] == "buy":
                order = self.exchange.create_market_buy_order(
                    symbol=self.symbol,
                    amount=signal["amount"]
                )
                mode_text = "模拟盘" if self.mode == 'paper' else "实盘"
                logger.info(f"✓ [{mode_text}] 买入订单执行成功: {order}")
                
            elif signal["signal"] == "sell":
                order = self.exchange.create_market_sell_order(
                    symbol=self.symbol,
                    amount=signal["amount"]
                )
                mode_text = "模拟盘" if self.mode == 'paper' else "实盘"
                logger.info(f"✓ [{mode_text}] 卖出订单执行成功: {order}")
            
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
            # 获取K线数据
            klines = await self.fetch_klines(limit=200)
            
            if not klines:
                logger.warning("未获取到K线数据")
                return
            
            # 检查是否有新K线
            current_kline_time = klines[-1]["timestamp"]
            if self.last_kline_time and current_kline_time == self.last_kline_time:
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
        logger.info(f"初始资金: {self.config['trading']['capital']} USDT")
        logger.info(f"运行模式: {self.mode}")
        logger.info(f"杠杆倍数: {self.config['trading']['leverage']}x")
        logger.info("="*60)
        
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
                
                # 等待30秒
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
    parser.add_argument('--config', type=str, default=None,
                       help='配置文件路径')
    
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
    trader = HighFrequencyTrader(mode=args.mode, config_file=args.config)
    
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
