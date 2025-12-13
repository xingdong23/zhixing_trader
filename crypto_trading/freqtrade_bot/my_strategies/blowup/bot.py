"""
5分钟爆破猎手 - Bybit 实盘Bot

使用方法:
1. 设置环境变量 BYBIT_API_KEY 和 BYBIT_API_SECRET
2. python3 blowup_live_bot.py

风险警告: 10x杠杆交易，可能导致本金全部损失！
"""
import os
import sys
import time
import logging
from datetime import datetime, timezone
from typing import Optional

# Bybit SDK
try:
    from pybit.unified_trading import HTTP
except ImportError:
    print("请安装 pybit: pip install pybit")
    sys.exit(1)

# 配置
API_KEY = os.environ.get("BYBIT_API_KEY", "")
API_SECRET = os.environ.get("BYBIT_API_SECRET", "")
SYMBOL = "BTCUSDT"
LEVERAGE = 10
INITIAL_CAPITAL = 300.0

# 策略参数 (与回测一致)
TAKE_PROFIT_PCT = 0.005     # 0.5% 价格止盈
STOP_LOSS_PCT = 0.003       # 0.3% 价格止损
BREAKOUT_PERIOD = 20
VOLUME_MA_PERIOD = 50
VOLUME_MULTIPLIER = 1.8
MAX_HOLD_MINUTES = 15
MAX_DAILY_TRADES = 6
MAX_CONSECUTIVE_LOSS = 3
TRADING_HOURS = [0, 1, 2, 3, 14, 15, 16, 17]  # UTC

# 终止条件
TARGET_BALANCE = 600.0      # 翻倍停止
MIN_BALANCE = 50.0          # 爆仓停止
MAX_RUNTIME_HOURS = 72      # 最大运行时间

# 日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    handlers=[
        logging.FileHandler('blowup_bot.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class BlowupHunterBot:
    def __init__(self):
        if not API_KEY or not API_SECRET:
            raise ValueError("请设置 BYBIT_API_KEY 和 BYBIT_API_SECRET 环境变量")
        
        self.session = HTTP(
            testnet=False,  # 改为True使用测试网
            api_key=API_KEY,
            api_secret=API_SECRET
        )
        
        self.position = None
        self.entry_price = 0.0
        self.entry_time = None
        self.daily_trades = 0
        self.consecutive_losses = 0
        self.last_trade_date = None
        self.start_time = datetime.now(timezone.utc)
        
        logger.info("=" * 50)
        logger.info("5分钟爆破猎手 Bot 启动")
        logger.info(f"Symbol: {SYMBOL}, Leverage: {LEVERAGE}x")
        logger.info("=" * 50)
    
    def get_balance(self) -> float:
        """获取USDT余额"""
        try:
            result = self.session.get_wallet_balance(accountType="UNIFIED", coin="USDT")
            balance = float(result['result']['list'][0]['totalEquity'])
            return balance
        except Exception as e:
            logger.error(f"获取余额失败: {e}")
            return 0.0
    
    def get_klines(self, limit: int = 60) -> list:
        """获取K线数据"""
        try:
            result = self.session.get_kline(
                category="linear",
                symbol=SYMBOL,
                interval="5",
                limit=limit
            )
            return result['result']['list'][::-1]  # 倒序，最新在最后
        except Exception as e:
            logger.error(f"获取K线失败: {e}")
            return []
    
    def set_leverage(self):
        """设置杠杆"""
        try:
            self.session.set_leverage(
                category="linear",
                symbol=SYMBOL,
                buyLeverage=str(LEVERAGE),
                sellLeverage=str(LEVERAGE)
            )
            logger.info(f"杠杆设置为 {LEVERAGE}x")
        except Exception as e:
            if "leverage not modified" not in str(e).lower():
                logger.warning(f"设置杠杆: {e}")
    
    def check_signal(self, klines: list) -> bool:
        """检查入场信号"""
        if len(klines) < VOLUME_MA_PERIOD + 5:
            return False
        
        # 当前UTC小时
        current_hour = datetime.now(timezone.utc).hour
        if current_hour not in TRADING_HOURS:
            return False
        
        # 计算指标
        closes = [float(k[4]) for k in klines]
        highs = [float(k[2]) for k in klines]
        volumes = [float(k[5]) for k in klines]
        
        current_close = closes[-1]
        
        # 前20根最高价
        highest_20 = max(highs[-21:-1])
        
        # 50周期均量
        volume_ma = sum(volumes[-VOLUME_MA_PERIOD:]) / VOLUME_MA_PERIOD
        current_volume = volumes[-1]
        
        # 突破 + 放量
        breakout = current_close > highest_20
        volume_spike = current_volume > volume_ma * VOLUME_MULTIPLIER
        
        if breakout and volume_spike:
            logger.info(f"信号触发! Close={current_close:.2f} > H20={highest_20:.2f}, Vol={current_volume:.0f} > MA*1.8={volume_ma*1.8:.0f}")
            return True
        
        return False
    
    def open_long(self, balance: float):
        """开多"""
        try:
            # 计算仓位
            risk_amount = balance * 0.03  # 3%风险
            position_usd = risk_amount / (STOP_LOSS_PCT * LEVERAGE)
            
            # 获取当前价格
            ticker = self.session.get_tickers(category="linear", symbol=SYMBOL)
            current_price = float(ticker['result']['list'][0]['lastPrice'])
            
            qty = round(position_usd / current_price, 3)
            
            # 下单
            result = self.session.place_order(
                category="linear",
                symbol=SYMBOL,
                side="Buy",
                orderType="Market",
                qty=str(qty),
                stopLoss=str(round(current_price * (1 - STOP_LOSS_PCT), 2)),
                takeProfit=str(round(current_price * (1 + TAKE_PROFIT_PCT), 2))
            )
            
            self.position = "long"
            self.entry_price = current_price
            self.entry_time = datetime.now(timezone.utc)
            self.daily_trades += 1
            
            logger.info(f"✅ 开多成功! 价格={current_price:.2f}, 数量={qty}, TP={current_price*(1+TAKE_PROFIT_PCT):.2f}, SL={current_price*(1-STOP_LOSS_PCT):.2f}")
            
        except Exception as e:
            logger.error(f"开仓失败: {e}")
    
    def close_position(self, reason: str):
        """平仓"""
        try:
            result = self.session.place_order(
                category="linear",
                symbol=SYMBOL,
                side="Sell",
                orderType="Market",
                qty="0",  # 全部平仓
                reduceOnly=True
            )
            
            logger.info(f"❌ 平仓成功! 原因={reason}")
            self.position = None
            
        except Exception as e:
            logger.error(f"平仓失败: {e}")
    
    def check_timeout(self) -> bool:
        """检查持仓超时"""
        if self.position and self.entry_time:
            elapsed = (datetime.now(timezone.utc) - self.entry_time).total_seconds() / 60
            if elapsed >= MAX_HOLD_MINUTES:
                return True
        return False
    
    def should_stop(self, balance: float) -> bool:
        """检查终止条件"""
        # 翻倍
        if balance >= TARGET_BALANCE:
            logger.info(f"🎯 目标达成! 余额={balance:.2f}")
            return True
        
        # 爆仓
        if balance <= MIN_BALANCE:
            logger.info(f"💀 账户不足! 余额={balance:.2f}")
            return True
        
        # 超时
        elapsed_hours = (datetime.now(timezone.utc) - self.start_time).total_seconds() / 3600
        if elapsed_hours >= MAX_RUNTIME_HOURS:
            logger.info(f"⏰ 运行时间超过 {MAX_RUNTIME_HOURS} 小时，停止")
            return True
        
        return False
    
    def reset_daily_counters(self):
        """重置每日计数器"""
        today = datetime.now(timezone.utc).date()
        if self.last_trade_date != today:
            self.daily_trades = 0
            self.consecutive_losses = 0
            self.last_trade_date = today
            logger.info("每日计数器已重置")
    
    def run(self):
        """主循环"""
        self.set_leverage()
        
        while True:
            try:
                balance = self.get_balance()
                if self.should_stop(balance):
                    break
                
                self.reset_daily_counters()
                
                # 检查限制
                if self.daily_trades >= MAX_DAILY_TRADES:
                    logger.debug("今日交易次数已达上限")
                    time.sleep(300)
                    continue
                
                if self.consecutive_losses >= MAX_CONSECUTIVE_LOSS:
                    logger.info("连续亏损，今日停止")
                    time.sleep(300)
                    continue
                
                # 获取K线
                klines = self.get_klines()
                if not klines:
                    time.sleep(10)
                    continue
                
                # 持仓处理
                if self.position:
                    if self.check_timeout():
                        self.close_position("timeout")
                else:
                    # 检查入场
                    if self.check_signal(klines):
                        self.open_long(balance)
                
                # 等待下一根K线
                time.sleep(60)  # 1分钟检查一次
                
            except KeyboardInterrupt:
                logger.info("收到中断信号，退出...")
                if self.position:
                    self.close_position("manual_stop")
                break
            except Exception as e:
                logger.error(f"主循环错误: {e}")
                time.sleep(30)
        
        logger.info("Bot 已停止")

if __name__ == "__main__":
    bot = BlowupHunterBot()
    bot.run()
