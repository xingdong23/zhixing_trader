#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OKX 资金费率套利全自动机器人

功能：
1. 自动监控资金费率
2. 自动调整现货+合约对冲仓位
3. 自动翻仓（费率反转时）
4. Telegram通知（可选）
5. 完整日志记录

使用方法：
    python live_trading/funding_arbitrage.py --mode paper  # 模拟盘测试
    python live_trading/funding_arbitrage.py --mode live   # 实盘运行
"""

import os
import sys
import time
import argparse
import logging
import requests
from datetime import datetime
from typing import Dict, Any, Optional

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import ccxt
from strategies.funding_arbitrage import FundingArbitrageStrategy


class FundingArbitrageBot:
    """资金费率套利机器人"""
    
    def __init__(self, config: Dict[str, Any], mode: str = "paper"):
        """
        初始化机器人
        
        Args:
            config: 配置字典
            mode: 运行模式 'paper'(模拟) 或 'live'(实盘)
        """
        self.config = config
        self.mode = mode
        self.is_live = (mode == "live")
        
        # 初始化日志
        self._setup_logging()
        
        # 初始化交易所
        self._setup_exchange()
        
        # 初始化策略
        self.strategy = FundingArbitrageStrategy(config["strategy_params"])
        
        # Telegram配置
        self.telegram_token = config.get("telegram_token", "")
        self.telegram_chat_id = config.get("telegram_chat_id", "")
        
        # 运行状态
        self.last_day = None
        self.running = True
        
        self.logger.info("=" * 60)
        self.logger.info(f"🤖 资金费率套利机器人启动")
        self.logger.info(f"模式: {'🔴 实盘' if self.is_live else '🟢 模拟盘'}")
        self.logger.info(f"交易对: {config['symbol']}")
        self.logger.info(f"杠杆: {config['strategy_params']['leverage']}x")
        self.logger.info(f"检查间隔: {config.get('check_interval', 600)}秒")
        self.logger.info("=" * 60)
        
        self.send_telegram(f"🤖 资金费率套利机器人启动\n"
                          f"模式: {'实盘' if self.is_live else '模拟盘'}\n"
                          f"交易对: {config['symbol']}")
    
    def _setup_logging(self):
        """设置日志"""
        log_dir = "logs"
        os.makedirs(log_dir, exist_ok=True)
        
        log_file = os.path.join(
            log_dir, 
            f"funding_arbitrage_{self.mode}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
        )
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s [%(levelname)s] %(message)s',
            handlers=[
                logging.FileHandler(log_file, encoding='utf-8'),
                logging.StreamHandler()
            ]
        )
        
        self.logger = logging.getLogger(__name__)
        self.logger.info(f"日志文件: {log_file}")
    
    def _setup_exchange(self):
        """设置交易所连接"""
        # 从环境变量读取API密钥
        api_key = os.getenv("OKX_API_KEY", "")
        secret_key = os.getenv("OKX_SECRET_KEY", "")
        passphrase = os.getenv("OKX_PASSPHRASE", "")
        
        if not all([api_key, secret_key, passphrase]):
            self.logger.warning("⚠️  未配置OKX API密钥，请在.env文件中配置")
            self.logger.warning("   OKX_API_KEY=你的API Key")
            self.logger.warning("   OKX_SECRET_KEY=你的Secret Key")
            self.logger.warning("   OKX_PASSPHRASE=你的Passphrase")
        
        # 初始化OKX交易所
        self.exchange = ccxt.okx({
            'apiKey': api_key,
            'secret': secret_key,
            'password': passphrase,
            'enableRateLimit': True,
            'options': {
                'defaultType': 'swap',  # 永续合约
                'sandboxMode': not self.is_live  # 模拟盘模式
            }
        })
        
        if not self.is_live:
            self.exchange.set_sandbox_mode(True)
            self.logger.info("✓ 使用OKX模拟盘")
        else:
            self.logger.info("✓ 使用OKX实盘")
    
    def send_telegram(self, msg: str):
        """发送Telegram通知"""
        if not self.telegram_token or not self.telegram_chat_id:
            return
        
        try:
            url = f"https://api.telegram.org/bot{self.telegram_token}/sendMessage"
            requests.post(
                url, 
                data={'chat_id': self.telegram_chat_id, 'text': msg}, 
                timeout=10
            )
        except Exception as e:
            self.logger.debug(f"Telegram发送失败: {e}")
    
    def get_funding_rate(self) -> float:
        """获取资金费率"""
        try:
            symbol = self.config["symbol"]
            swap_symbol = f"{symbol}-SWAP"
            
            # 获取资金费率
            funding_rate_data = self.exchange.fetch_funding_rate(swap_symbol)
            funding_rate = funding_rate_data.get('fundingRate', 0.0)
            
            return funding_rate
        except Exception as e:
            self.logger.error(f"获取资金费率失败: {e}")
            return 0.0
    
    def get_current_price(self) -> float:
        """获取当前价格"""
        try:
            symbol = self.config["symbol"]
            swap_symbol = f"{symbol}-SWAP"
            
            ticker = self.exchange.fetch_ticker(swap_symbol)
            return ticker['last']
        except Exception as e:
            self.logger.error(f"获取价格失败: {e}")
            return 0.0
    
    def get_spot_balance(self) -> float:
        """获取现货余额"""
        try:
            symbol = self.config["symbol"]
            base_currency = symbol.split("-")[0]  # ETH
            
            balance = self.exchange.fetch_balance()
            spot_balance = balance.get(base_currency, {}).get('free', 0.0)
            
            return spot_balance
        except Exception as e:
            self.logger.error(f"获取现货余额失败: {e}")
            return 0.0
    
    def get_futures_position(self) -> Dict[str, Any]:
        """获取合约持仓"""
        try:
            symbol = self.config["symbol"]
            swap_symbol = f"{symbol}-SWAP"
            
            positions = self.exchange.fetch_positions([swap_symbol])
            
            if positions:
                pos = positions[0]
                side = 'long' if pos['side'] == 'long' else 'short'
                size = abs(float(pos.get('contracts', 0)))
                
                return {'side': side, 'size': size}
            
            return {'side': None, 'size': 0.0}
        except Exception as e:
            self.logger.error(f"获取合约持仓失败: {e}")
            return {'side': None, 'size': 0.0}
    
    def close_futures_position(self):
        """平掉所有合约仓位"""
        try:
            position = self.get_futures_position()
            
            if position['size'] > 0:
                symbol = self.config["symbol"]
                swap_symbol = f"{symbol}-SWAP"
                
                # 平仓
                side = 'sell' if position['side'] == 'long' else 'buy'
                
                order = self.exchange.create_order(
                    symbol=swap_symbol,
                    type='market',
                    side=side,
                    amount=position['size'],
                    params={'reduceOnly': True}
                )
                
                self.logger.info(f"✓ 平仓成功: {position['side']} {position['size']}")
                time.sleep(2)  # 等待订单执行
        except Exception as e:
            self.logger.error(f"平仓失败: {e}")
    
    def open_futures_position(self, side: str, size: float):
        """开合约仓位"""
        try:
            symbol = self.config["symbol"]
            swap_symbol = f"{symbol}-SWAP"
            
            # 设置杠杆
            leverage = self.config['strategy_params']['leverage']
            self.exchange.set_leverage(leverage, swap_symbol)
            
            # 开仓
            order_side = 'buy' if side == 'long' else 'sell'
            
            order = self.exchange.create_order(
                symbol=swap_symbol,
                type='market',
                side=order_side,
                amount=size
            )
            
            self.logger.info(f"✓ 开仓成功: {side.upper()} {size:.4f}")
            return order
        except Exception as e:
            self.logger.error(f"开仓失败: {e}")
            return None
    
    def rebalance(self):
        """执行仓位再平衡"""
        try:
            # 获取市场数据
            current_price = self.get_current_price()
            funding_rate = self.get_funding_rate()
            spot_balance = self.get_spot_balance()
            
            self.logger.info(f"📊 当前价格: ${current_price:.2f}, "
                           f"资金费率: {funding_rate*100:.4f}%, "
                           f"现货余额: {spot_balance:.4f}")
            
            # 发送每日通知
            now = datetime.now()
            if self.last_day != now.day:
                self.send_telegram(
                    f"【{now.strftime('%Y-%m-%d')}】\n"
                    f"机器人正常运行\n"
                    f"资金费率: {funding_rate*100:.4f}%\n"
                    f"价格: ${current_price:.2f}"
                )
                self.last_day = now.day
            
            # 准备市场数据
            market_data = {
                "funding_rate": funding_rate,
                "spot_balance": spot_balance
            }
            
            # 模拟K线数据（只需要价格）
            klines = [{"close": current_price}]
            
            # 获取当前持仓
            current_position = self.get_futures_position()
            self.strategy.current_position = current_position
            
            # 分析并生成信号
            signal = self.strategy.analyze(klines, market_data)
            
            # 执行交易
            if signal["signal"] in ["rebalance", "flip"]:
                self.logger.info(f"🔄 {signal['reason']}")
                
                if signal["signal"] == "flip":
                    self.send_telegram(f"⚡ 费率反转！正在自动翻仓...")
                
                # 先平掉现有仓位
                self.close_futures_position()
                
                # 开新仓位
                target_side = signal["side"]
                target_size = signal["target_size"]
                
                if target_size > 0:
                    self.open_futures_position(target_side, target_size)
                    
                    # 更新策略状态
                    self.strategy.update_position(signal)
                    
                    self.send_telegram(
                        f"✅ 仓位已调整\n"
                        f"方向: {target_side.upper()}\n"
                        f"大小: {target_size:.4f}\n"
                        f"价值: ${signal['target_value']:.2f}\n"
                        f"资金费率: {funding_rate*100:.4f}%"
                    )
            else:
                self.logger.info(f"✓ {signal['reason']}")
        
        except Exception as e:
            self.logger.error(f"❌ 再平衡失败: {e}")
            self.send_telegram(f"❌ 出错: {str(e)}")
    
    def run(self):
        """主循环"""
        check_interval = self.config.get("check_interval", 600)  # 默认10分钟
        
        self.logger.info(f"🚀 开始运行，每{check_interval}秒检查一次")
        
        while self.running:
            try:
                self.rebalance()
                
                # 等待下次检查
                time.sleep(check_interval)
                
            except KeyboardInterrupt:
                self.logger.info("⏹️  收到停止信号")
                self.running = False
                break
            except Exception as e:
                self.logger.error(f"❌ 主循环错误: {e}")
                self.send_telegram(f"❌ 主循环错误: {str(e)}")
                time.sleep(60)  # 出错后等待1分钟
        
        self.logger.info("👋 机器人已停止")
        self.send_telegram("👋 资金费率套利机器人已停止")


def load_config(config_file: str) -> Dict[str, Any]:
    """加载配置文件"""
    import json
    
    if os.path.exists(config_file):
        with open(config_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    else:
        # 默认配置
        return {
            "symbol": "ETH-USDT",
            "check_interval": 600,  # 10分钟
            "strategy_params": {
                "symbol": "ETH-USDT",
                "leverage": 1.8,
                "target_delta": 0.98,
                "funding_threshold": 0.0001
            },
            "telegram_token": "7825962342:AAFUeP2Ra9gug4NCv8IHtdS99PiKU35Gltc",
            "telegram_chat_id": "85973068545"
        }


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="OKX资金费率套利机器人")
    parser.add_argument(
        "--mode", 
        type=str, 
        choices=["paper", "live"], 
        default="paper",
        help="运行模式: paper(模拟盘) 或 live(实盘)"
    )
    parser.add_argument(
        "--config",
        type=str,
        default="strategies/funding_arbitrage/config.json",
        help="配置文件路径"
    )
    
    args = parser.parse_args()
    
    # 实盘模式需要二次确认
    if args.mode == "live":
        print("\n" + "=" * 60)
        print("⚠️  警告：你即将启动实盘模式！")
        print("=" * 60)
        confirm = input("请输入 'YES' 确认启动实盘: ")
        if confirm != "YES":
            print("已取消")
            return
    
    # 加载配置
    config = load_config(args.config)
    
    # 启动机器人
    bot = FundingArbitrageBot(config, mode=args.mode)
    bot.run()


if __name__ == "__main__":
    main()
