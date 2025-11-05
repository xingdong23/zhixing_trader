"""
趋势突破策略
Trend Breakout Strategy - 捕捉突破行情，追求高收益
"""

from typing import List, Dict, Any
import numpy as np
import logging

logger = logging.getLogger(__name__)


class TrendBreakoutStrategy:
    """趋势突破策略 - 激进型"""
    
    def __init__(self, parameters: Dict[str, Any]):
        """
        初始化策略
        
        Args:
            parameters: 策略参数字典
        """
        self.name = "趋势突破策略"
        self.parameters = parameters
        
        # 基础参数
        self.capital = float(parameters.get('total_capital', 300.0))
        self.position_size = float(parameters.get('position_size', 0.5))  # 50%仓位（降低风险）
        
        # 均线参数
        self.ema_fast = int(parameters.get('ema_fast', 9))
        self.ema_medium = int(parameters.get('ema_medium', 21))
        self.ema_slow = int(parameters.get('ema_slow', 50))
        
        # 突破参数
        self.breakout_period = int(parameters.get('breakout_period', 20))
        self.volume_multiplier = float(parameters.get('volume_multiplier', 1.5))
        
        # 止盈止损
        self.stop_loss = float(parameters.get('stop_loss', 0.03))  # 3%
        self.take_profit_1 = float(parameters.get('take_profit_1', 0.05))  # 5%
        self.take_profit_2 = float(parameters.get('take_profit_2', 0.10))  # 10%
        
        # 风控参数
        self.max_daily_loss = float(parameters.get('max_daily_loss', 0.05))
        self.max_position_ratio = float(parameters.get('max_position_ratio', 0.9))
        
        # 冷却期参数（防止频繁交易同一点位）
        self.cooldown_bars = int(parameters.get('cooldown_bars', 60))  # 默认60根K线（5小时）
        self.last_exit_time = None
        
        # 状态变量
        self.current_position = None
        self.entry_price = None
        self.partial_closed = False  # 是否已部分止盈
        self.daily_pnl = 0.0
        self.total_trades = 0
        self.winning_trades = 0
        
        logger.info(f"✓ {self.name}初始化完成")
        logger.info(f"  资金: {self.capital} USDT")
        logger.info(f"  仓位: {self.position_size * 100}%")
        logger.info(f"  止损: {self.stop_loss * 100}%")
        logger.info(f"  止盈: {self.take_profit_1 * 100}% / {self.take_profit_2 * 100}%")
    
    def analyze(self, klines: List[Dict]) -> Dict[str, Any]:
        """分析市场并生成交易信号"""
        
        if len(klines) < self.ema_slow:
            return {"signal": "hold", "reason": "数据不足"}
        
        current_price = klines[-1]['close']
        current_time = klines[-1]['timestamp']
        
        # 检查冷却期（防止止损后立即重新开仓）
        if self.last_exit_time and not self.current_position:
            bars_since_exit = (current_time - self.last_exit_time) / 300000  # 5分钟 = 300000毫秒
            if bars_since_exit < self.cooldown_bars:
                return {
                    "signal": "hold", 
                    "reason": f"冷却期 ({int(bars_since_exit)}/{self.cooldown_bars}根K线)"
                }
            else:
                # 冷却期结束，重置
                self.last_exit_time = None
                logger.info("✓ 冷却期结束，可以重新入场")
        
        # 检查风控
        if not self._check_risk_controls():
            return {"signal": "hold", "reason": "触发风控限制"}
        
        # 如果有持仓，检查止盈止损
        if self.current_position:
            exit_signal = self._check_exit_conditions(current_price, klines)
            if exit_signal:
                # 记录退出时间（用于冷却期）
                self.last_exit_time = current_time
                return exit_signal
        
        # 如果没有持仓，寻找入场机会
        if not self.current_position:
            entry_signal = self._check_entry_conditions(current_price, klines)
            if entry_signal:
                return entry_signal
        
        return {"signal": "hold", "reason": "无交易信号"}
    
    def _calculate_ema(self, data: np.ndarray, period: int) -> float:
        """计算EMA"""
        if len(data) < period:
            return np.mean(data)
        
        multiplier = 2 / (period + 1)
        ema = data[0]
        
        for price in data[1:]:
            ema = (price - ema) * multiplier + ema
        
        return ema
    
    def _identify_trend(self, klines: List[Dict]) -> str:
        """
        识别趋势方向
        
        Returns:
            "uptrend", "downtrend", "sideways"
        """
        closes = np.array([float(k["close"]) for k in klines[-self.ema_slow-10:]])
        
        ema_fast = self._calculate_ema(closes, self.ema_fast)
        ema_medium = self._calculate_ema(closes, self.ema_medium)
        ema_slow = self._calculate_ema(closes, self.ema_slow)
        
        # 多头排列
        if ema_fast > ema_medium > ema_slow:
            return "uptrend"
        # 空头排列
        elif ema_fast < ema_medium < ema_slow:
            return "downtrend"
        # 震荡
        else:
            return "sideways"
    
    def _check_breakout(self, klines: List[Dict]) -> bool:
        """
        检查是否突破
        
        Returns:
            True if 突破, False otherwise
        """
        current_price = float(klines[-1]["close"])
        recent_highs = [float(k["high"]) for k in klines[-self.breakout_period-1:-1]]
        
        # 突破最近N根K线的最高点
        highest = max(recent_highs)
        
        return current_price > highest
    
    def _check_volume_surge(self, klines: List[Dict]) -> bool:
        """
        检查成交量是否放大
        
        Returns:
            True if 成交量放大, False otherwise
        """
        current_volume = float(klines[-1]["volume"])
        avg_volume = np.mean([float(k["volume"]) for k in klines[-20:-1]])
        
        return current_volume > avg_volume * self.volume_multiplier
    
    def _check_entry_conditions(self, current_price: float, klines: List[Dict]) -> Dict[str, Any]:
        """检查入场条件"""
        
        # 1. 识别趋势
        trend = self._identify_trend(klines)
        
        # 只在上涨趋势中做多
        if trend != "uptrend":
            return None
        
        # 2. 检查突破
        if not self._check_breakout(klines):
            return None
        
        # 3. 检查成交量
        if not self._check_volume_surge(klines):
            return None
        
        # 4. 额外确认：价格在EMA9之上
        closes = np.array([float(k["close"]) for k in klines[-self.ema_fast-5:]])
        ema_fast = self._calculate_ema(closes, self.ema_fast)
        
        if current_price < ema_fast:
            return None
        
        # 所有条件满足，生成买入信号
        amount = (self.capital * self.position_size) / current_price
        
        logger.info("🚀 趋势突破买入信号:")
        logger.info(f"  价格: {current_price}")
        logger.info(f"  趋势: {trend}")
        logger.info("  突破确认: ✓")
        logger.info("  成交量放大: ✓")
        
        return {
            "signal": "buy",
            "type": "entry",
            "price": current_price,
            "amount": amount,
            "leverage": self.parameters.get("leverage", 1.0),
            "reason": f"趋势突破 @ {current_price:.2f} (上涨趋势+突破+量能)"
        }
    
    def _check_exit_conditions(self, current_price: float, klines: List[Dict]) -> Dict[str, Any]:
        """检查出场条件（优先级：止损 > 止盈 > 趋势反转）"""
        
        if not self.entry_price:
            return None
        
        profit_ratio = (current_price - self.entry_price) / self.entry_price
        
        # 1. 硬止损（最高优先级）- 必须立即执行
        if profit_ratio <= -self.stop_loss:
            logger.warning(f"⛔ 触发硬止损: {profit_ratio*100:.2f}%")
            return self._create_exit_signal(current_price, "stop_loss", "硬止损")
        
        # 2. 第二次止盈 (10%) - 全部平仓
        if profit_ratio >= self.take_profit_2:
            logger.info(f"💰💰 第二次止盈: {profit_ratio*100:.2f}%")
            return self._create_exit_signal(current_price, "take_profit", "第二次止盈")
        
        # 3. 第一次止盈 (5%) - 部分平仓
        if not self.partial_closed and profit_ratio >= self.take_profit_1:
            logger.info(f"💰 第一次止盈: {profit_ratio*100:.2f}%")
            self.partial_closed = True
            
            # 平掉50%仓位
            amount = self.current_position.get("amount", 0) * 0.5
            
            return {
                "signal": "sell",
                "type": "take_profit",
                "price": current_price,
                "amount": amount,
                "reason": f"第一次止盈 @ {current_price:.2f} (+{profit_ratio*100:.2f}%)"
            }
        
        # 4. 移动止损 (盈利5%后，止损移至成本价)
        if self.partial_closed and profit_ratio <= 0:
            logger.info(f"🔒 移动止损触发: {profit_ratio*100:.2f}%")
            return self._create_exit_signal(current_price, "trailing_stop", "移动止损")
        
        # 5. 趋势反转（仅在亏损<2%时才考虑）
        if profit_ratio > -0.02:  # 只有小幅亏损时才看趋势
            trend = self._identify_trend(klines)
            if trend == "downtrend" and profit_ratio < 0:
                logger.info(f"📉 趋势反转止损: {profit_ratio*100:.2f}%")
                return self._create_exit_signal(current_price, "trend_reversal", "趋势反转")
        
        return None
    
    def _create_exit_signal(self, current_price: float, exit_type: str, reason: str) -> Dict[str, Any]:
        """创建出场信号"""
        amount = self.current_position.get("amount", 0) if self.current_position else 0
        
        profit_ratio = 0
        if self.entry_price:
            profit_ratio = (current_price - self.entry_price) / self.entry_price
        
        return {
            "signal": "sell",
            "type": exit_type,
            "price": current_price,
            "amount": amount,
            "reason": f"{reason} @ {current_price:.2f} ({profit_ratio*100:+.2f}%)"
        }
    
    def _check_risk_controls(self) -> bool:
        """检查风控条件"""
        
        # 日亏损限制
        if self.daily_pnl < -self.capital * self.max_daily_loss:
            logger.warning(f"⚠️ 触发日亏损限制: {self.daily_pnl:.2f} USDT")
            return False
        
        return True
    
    def update_position(self, position: Dict[str, Any], current_time: int = None):
        """更新持仓信息"""
        # 如果从有持仓变为无持仓，记录退出时间
        if self.current_position and not position:
            if current_time:
                self.last_exit_time = current_time
            else:
                import time
                self.last_exit_time = int(time.time() * 1000)  # 当前时间戳（毫秒）
            logger.info(f"📊 清仓，进入冷却期 ({self.cooldown_bars}根K线)")
        
        self.current_position = position
        
        if position and not self.entry_price:
            self.entry_price = position.get("price") or position.get("entry_price")
            self.partial_closed = False
            if self.entry_price:
                logger.info(f"📊 建仓: {self.entry_price:.2f}")
        elif not position:
            self.entry_price = None
            self.partial_closed = False
    
    def record_trade(self, trade: Dict[str, Any]):
        """记录交易（兼容回测引擎）"""
        self.total_trades += 1
        if trade.get("pnl_amount", 0) > 0:
            self.winning_trades += 1
