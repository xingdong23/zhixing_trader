"""
多重EMA交叉双向趋势策略 - 基于8/13/48/200 EMA系统

核心思想：
1. 使用EMA 8/13/48/200构建多层趋势过滤系统
2. 双向交易：既做多也做空
3. 做多信号：8 EMA上穿13 EMA，且价格在200 EMA之上
4. 做空信号：8 EMA下穿13 EMA，且价格在200 EMA之下

信号分类：
- 多头入场：8 EMA上穿13 EMA，且价格在200 EMA之上
- 空头入场：8 EMA下穿13 EMA，且价格在200 EMA之下
- 持仓管理：根据方向使用不同的EMA支撑/阻力
- 出场信号：跌破/突破关键EMA或触发止损止盈

适用场景：趋势市场、双向交易
优势：顺势交易、牛熊都可盈利、风险可控
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np
import logging

logger = logging.getLogger(__name__)


class EMACrossoverStrategy:
    """多重EMA交叉双向趋势策略"""
    
    def __init__(self, parameters: Dict[str, Any]):
        """
        初始化策略
        
        Args:
            parameters: 策略参数字典
        """
        
        self.name = "多重EMA交叉双向策略"
        self.parameters = parameters
        
        # 持仓信息
        self.current_position: Optional[Dict] = None
        
        # 统计信息
        self.daily_trades = []
        self.daily_pnl = 0.0
        self.consecutive_losses = 0
        self.total_trades = 0
        
        # 暂停交易控制
        self.pause_until_timestamp = 0  # 暂停交易直到此时间戳
        self.last_loss_count = 0  # 上次触发暂停时的连续亏损次数
        
        # 是否允许做空（默认允许）
        self.allow_short = parameters.get("allow_short", True)
        
    def analyze(self, klines: List[Dict]) -> Dict[str, Any]:
        """
        分析市场并生成交易信号
        
        Args:
            klines: K线数据列表
            
        Returns:
            交易信号字典
        """
        if not klines or len(klines) < 250:
            return {"signal": "hold", "reason": "数据不足，需要至少250根K线"}
        
        # 获取当前时间（回测时使用K线时间，实盘使用实际时间）
        current_time = klines[-1].get("open_time", datetime.now().timestamp() * 1000) / 1000
        
        # 检查风控
        if not self._check_risk_controls(current_time):
            return {"signal": "hold", "reason": "触发风控限制"}
        
        # 如果有持仓，检查出场条件
        if self.current_position:
            exit_signal = self._check_exit_conditions(klines)
            if exit_signal:
                return exit_signal
            return {"signal": "hold", "reason": "持仓中，等待出场信号"}
        
        # 无持仓，寻找入场机会
        return self._generate_entry_signal(klines)
    
    def _generate_entry_signal(self, klines: List[Dict]) -> Dict[str, Any]:
        """
        生成入场信号（双向）
        
        核心逻辑：
        1. 计算EMA 8/13/48/200
        2. 判断市场状态（牛市/熊市/震荡）
        3. 牛市只做多，熊市只做空，震荡双向
        4. 做多：8 EMA上穿13 EMA，且价格在200 EMA之上
        5. 做空：8 EMA下穿13 EMA，且价格在200 EMA之下
        """
        closes = np.array([k["close"] for k in klines])
        highs = np.array([k["high"] for k in klines])
        lows = np.array([k["low"] for k in klines])
        
        # 计算各周期EMA
        ema8 = self._calculate_ema(closes, 8)
        ema13 = self._calculate_ema(closes, 13)
        ema48 = self._calculate_ema(closes, 48)
        ema200 = self._calculate_ema(closes, 200)
        
        current_price = closes[-1]
        
        # 检查EMA排列
        current_ema8 = ema8[-1]
        current_ema13 = ema13[-1]
        current_ema48 = ema48[-1]
        current_ema200 = ema200[-1]
        
        prev_ema8 = ema8[-2]
        prev_ema13 = ema13[-2]
        
        # 计算ATR
        atr_val = self._calculate_atr(klines, 14)
        
        # === 新增：市场状态判断 ===
        market_regime = self._identify_market_regime(closes, ema200)
        
        # 根据市场状态过滤交易方向
        can_long = market_regime in ["bull", "neutral"]
        can_short = market_regime in ["bear", "neutral"]
        
        logger.info(f"市场状态: {market_regime}, 可做多: {can_long}, 可做空: {can_short}")
        
        # 检查8 EMA上穿13 EMA（金叉）- 做多信号
        is_golden_cross = (prev_ema8 <= prev_ema13) and (current_ema8 > current_ema13)
        
        # 检查8 EMA下穿13 EMA（死叉）- 做空信号
        is_death_cross = (prev_ema8 >= prev_ema13) and (current_ema8 < current_ema13)
        
        # 做多条件：金叉且价格在200 EMA之上，且市场允许做多
        if can_long and is_golden_cross and current_price > current_ema200:
            lookback = int(self.parameters.get("stop_lookback", 20))
            recent_low = float(np.min(lows[-lookback:]))
            
            logger.info(f"✓ 做多信号：8EMA={current_ema8:.2f}, 13EMA={current_ema13:.2f}, 200EMA={current_ema200:.2f}")
            logger.info(f"  价格={current_price:.2f}, 近期低点={recent_low:.2f}")
            
            return self._create_long_signal(
                current_price, 
                recent_low, 
                atr_val,
                current_ema8,
                current_ema13,
                current_ema48,
                is_golden_cross
            )
        
        # 做空条件：死叉且价格在200 EMA之下，且市场允许做空
        if self.allow_short and can_short and is_death_cross and current_price < current_ema200:
            lookback = int(self.parameters.get("stop_lookback", 20))
            recent_high = float(np.max(highs[-lookback:]))
            
            logger.info(f"✓ 做空信号：8EMA={current_ema8:.2f}, 13EMA={current_ema13:.2f}, 200EMA={current_ema200:.2f}")
            logger.info(f"  价格={current_price:.2f}, 近期高点={recent_high:.2f}")
            
            return self._create_short_signal(
                current_price,
                recent_high,
                atr_val,
                current_ema8,
                current_ema13,
                current_ema48,
                is_death_cross
            )
        
        # 趋势延续入场（可选）
        if can_long and current_price > current_ema200:
            ema_alignment = current_ema8 > current_ema13 and current_ema13 > current_ema48
            if ema_alignment and current_ema8 > current_ema13:
                lookback = int(self.parameters.get("stop_lookback", 20))
                recent_low = float(np.min(lows[-lookback:]))
                
                logger.info(f"✓ 趋势做多：8EMA={current_ema8:.2f} > 13EMA={current_ema13:.2f} > 48EMA={current_ema48:.2f}")
                
                return self._create_long_signal(
                    current_price, 
                    recent_low, 
                    atr_val,
                    current_ema8,
                    current_ema13,
                    current_ema48,
                    False
                )
        
        if self.allow_short and can_short and current_price < current_ema200:
            ema_alignment = current_ema8 < current_ema13 and current_ema13 < current_ema48
            if ema_alignment and current_ema8 < current_ema13:
                lookback = int(self.parameters.get("stop_lookback", 20))
                recent_high = float(np.max(highs[-lookback:]))
                
                logger.info(f"✓ 趋势做空：8EMA={current_ema8:.2f} < 13EMA={current_ema13:.2f} < 48EMA={current_ema48:.2f}")
                
                return self._create_short_signal(
                    current_price,
                    recent_high,
                    atr_val,
                    current_ema8,
                    current_ema13,
                    current_ema48,
                    False
                )
        
        return {"signal": "hold", "reason": f"等待交叉信号，价格={current_price:.2f}, 200EMA={current_ema200:.2f}"}
    
    def _create_long_signal(
        self, 
        price: float, 
        recent_low: float,
        atr: float,
        ema8: float,
        ema13: float,
        ema48: float,
        is_golden_cross: bool
    ) -> Dict[str, Any]:
        """创建做多信号"""
        capital = float(self.parameters.get("total_capital", 300.0))
        leverage = float(self.parameters.get("leverage", 2.0))
        risk_per_trade = float(self.parameters.get("risk_per_trade", 0.02))
        
        # 止损设置：近期低点 或 48 EMA下方
        stop_below_ema48 = ema48 * (1 - 0.005)
        stop_loss = min(recent_low, stop_below_ema48)
        
        # 确保止损不要太近
        min_stop_distance = price * 0.01
        if price - stop_loss < min_stop_distance:
            stop_loss = price - min_stop_distance
        
        # 止盈设置：使用风险回报比
        risk_reward_ratio = float(self.parameters.get("risk_reward_ratio", 3.0))
        risk_amount = price - stop_loss
        take_profit = price + (risk_amount * risk_reward_ratio)
        
        # 计算仓位
        use_leverage_sizing = self.parameters.get("use_leverage_sizing", False)
        
        if use_leverage_sizing:
            position_ratio = float(self.parameters.get("position_ratio", 0.5))
            
            # 亏损后减仓逻辑
            reduce_position_after_loss = self.parameters.get("reduce_position_after_loss", False)
            if reduce_position_after_loss and self.consecutive_losses > 0:
                # 每连续亏损一次，仓位减少20%
                reduction_factor = 0.8 ** self.consecutive_losses
                position_ratio = position_ratio * reduction_factor
                logger.info(f"⚠️ 做多仓位调整：连续亏损{self.consecutive_losses}次，仓位从50%降至{position_ratio:.2%}")
            
            position_value = capital * leverage * position_ratio
            amount = position_value / price
        else:
            risk_capital = capital * risk_per_trade
            amount = risk_capital / risk_amount
        
        signal_type = "金叉做多" if is_golden_cross else "趋势做多"
        
        return {
            "signal": "buy",
            "price": price,
            "amount": amount,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "leverage": leverage,
            "atr": atr,
            "entry_ema8": ema8,
            "entry_ema13": ema13,
            "entry_ema48": ema48,
            "signal_type": signal_type,
            "reason": f"{signal_type} 止损={stop_loss:.2f} 止盈={take_profit:.2f}"
        }
    
    def _create_short_signal(
        self,
        price: float,
        recent_high: float,
        atr: float,
        ema8: float,
        ema13: float,
        ema48: float,
        is_death_cross: bool
    ) -> Dict[str, Any]:
        """创建做空信号"""
        capital = float(self.parameters.get("total_capital", 300.0))
        leverage = float(self.parameters.get("leverage", 2.0))
        risk_per_trade = float(self.parameters.get("risk_per_trade", 0.02))
        
        # 止损设置：近期高点 或 48 EMA上方
        stop_above_ema48 = ema48 * (1 + 0.005)
        stop_loss = max(recent_high, stop_above_ema48)
        
        # 确保止损不要太近
        min_stop_distance = price * 0.01
        if stop_loss - price < min_stop_distance:
            stop_loss = price + min_stop_distance
        
        # 止盈设置：使用风险回报比
        risk_reward_ratio = float(self.parameters.get("risk_reward_ratio", 3.0))
        risk_amount = stop_loss - price
        take_profit = price - (risk_amount * risk_reward_ratio)
        
        # 计算仓位
        use_leverage_sizing = self.parameters.get("use_leverage_sizing", False)
        
        if use_leverage_sizing:
            position_ratio = float(self.parameters.get("position_ratio", 0.5))
            
            # 亏损后减仓逻辑
            reduce_position_after_loss = self.parameters.get("reduce_position_after_loss", False)
            if reduce_position_after_loss and self.consecutive_losses > 0:
                # 每连续亏损一次，仓位减少20%
                reduction_factor = 0.8 ** self.consecutive_losses
                position_ratio = position_ratio * reduction_factor
                logger.info(f"⚠️ 做空仓位调整：连续亏损{self.consecutive_losses}次，仓位从50%降至{position_ratio:.2%}")
            
            position_value = capital * leverage * position_ratio
            amount = position_value / price
        else:
            risk_capital = capital * risk_per_trade
            amount = risk_capital / risk_amount
        
        signal_type = "死叉做空" if is_death_cross else "趋势做空"
        
        return {
            "signal": "sell",
            "price": price,
            "amount": amount,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "leverage": leverage,
            "atr": atr,
            "entry_ema8": ema8,
            "entry_ema13": ema13,
            "entry_ema48": ema48,
            "signal_type": signal_type,
            "reason": f"{signal_type} 止损={stop_loss:.2f} 止盈={take_profit:.2f}"
        }
    
    def _check_exit_conditions(self, klines: List[Dict]) -> Optional[Dict[str, Any]]:
        """
        检查出场条件（双向）
        """
        if not self.current_position:
            return None
        
        position = self.current_position
        current_price = klines[-1]["close"]
        entry_price = position["entry_price"]
        stop_loss = position["stop_loss"]
        take_profit = position["take_profit"]
        side = position["side"]
        
        # === 新增：单笔最大亏损限制（优先级最高）===
        max_position_loss = float(self.parameters.get("risk_control", {}).get("max_position_loss", 0.08))
        
        if side == "long":
            current_loss_ratio = (entry_price - current_price) / entry_price
            if current_loss_ratio > max_position_loss:
                logger.warning(f"⚠️ 多单触发最大亏损限制: 入场={entry_price:.2f}, 当前={current_price:.2f}, 亏损={current_loss_ratio:.2%}")
                pnl_ratio = (current_price - entry_price) / entry_price
                return {
                    "signal": "sell",
                    "price": current_price,
                    "amount": position["amount"],
                    "type": "max_loss_stop",
                    "pnl": pnl_ratio,
                    "reason": f"触发最大亏损限制 {current_loss_ratio:.2%}"
                }
        else:  # short
            current_loss_ratio = (current_price - entry_price) / entry_price
            if current_loss_ratio > max_position_loss:
                logger.warning(f"⚠️ 空单触发最大亏损限制: 入场={entry_price:.2f}, 当前={current_price:.2f}, 亏损={current_loss_ratio:.2%}")
                pnl_ratio = (entry_price - current_price) / entry_price
                return {
                    "signal": "buy",
                    "price": current_price,
                    "amount": position["amount"],
                    "type": "max_loss_stop",
                    "pnl": pnl_ratio,
                    "reason": f"触发最大亏损限制 {current_loss_ratio:.2%}"
                }
        
        # 计算EMA
        closes = np.array([k["close"] for k in klines])
        
        ema8 = self._calculate_ema(closes, 8)
        ema13 = self._calculate_ema(closes, 13)
        ema48 = self._calculate_ema(closes, 48)
        
        current_ema8 = ema8[-1]
        current_ema13 = ema13[-1]
        current_ema48 = ema48[-1]
        
        # 计算盈亏
        if side == "long":
            pnl_ratio = (current_price - entry_price) / entry_price
            
            # 1. 固定止损
            if current_price <= stop_loss:
                logger.info(f"多单触发止损: 价格={current_price:.2f}, 止损={stop_loss:.2f}")
                return self._create_exit_signal("stop_loss", current_price, pnl_ratio)
            
            # 2. 固定止盈
            if current_price >= take_profit:
                logger.info(f"多单触发止盈: 价格={current_price:.2f}, 止盈={take_profit:.2f}")
                return self._create_exit_signal("take_profit", current_price, pnl_ratio)
            
            # 3. 价格跌破13 EMA（如果已盈利且开启）
            use_ema13_break = self.parameters.get("exit_conditions", {}).get("use_ema13_break", True)
            if use_ema13_break and current_price < current_ema13 and pnl_ratio > 0.005:
                logger.info(f"多单跌破13 EMA: 价格={current_price:.2f}, 13EMA={current_ema13:.2f}")
                return self._create_exit_signal("ema13_break", current_price, pnl_ratio)
            
            # 4. 价格跌破48 EMA（如果开启）
            use_ema48_break = self.parameters.get("exit_conditions", {}).get("use_ema48_break", False)
            if use_ema48_break and current_price < current_ema48:
                logger.info(f"多单跌破48 EMA: 价格={current_price:.2f}, 48EMA={current_ema48:.2f}")
                return self._create_exit_signal("ema48_break", current_price, pnl_ratio)
            
            # 5. 移动止盈（如果开启）
            use_trailing_stop = self.parameters.get("exit_conditions", {}).get("use_trailing_stop", False)
            trailing_profit_threshold = self.parameters.get("exit_conditions", {}).get("trailing_stop_activation", 0.03)
            if use_trailing_stop and pnl_ratio > trailing_profit_threshold and current_price < current_ema8:
                logger.info(f"多单移动止盈: 价格={current_price:.2f}, 8EMA={current_ema8:.2f}")
                return self._create_exit_signal("trailing_stop", current_price, pnl_ratio)
        
        else:  # short
            pnl_ratio = (entry_price - current_price) / entry_price
            
            # 1. 固定止损
            if current_price >= stop_loss:
                logger.info(f"空单触发止损: 价格={current_price:.2f}, 止损={stop_loss:.2f}")
                return self._create_exit_signal("stop_loss", current_price, pnl_ratio)
            
            # 2. 固定止盈
            if current_price <= take_profit:
                logger.info(f"空单触发止盈: 价格={current_price:.2f}, 止盈={take_profit:.2f}")
                return self._create_exit_signal("take_profit", current_price, pnl_ratio)
            
            # 3. 价格突破13 EMA（如果已盈利且开启）
            use_ema13_break = self.parameters.get("exit_conditions", {}).get("use_ema13_break", True)
            if use_ema13_break and current_price > current_ema13 and pnl_ratio > 0.005:
                logger.info(f"空单突破13 EMA: 价格={current_price:.2f}, 13EMA={current_ema13:.2f}")
                return self._create_exit_signal("ema13_break", current_price, pnl_ratio)
            
            # 4. 价格突破48 EMA（如果开启）
            use_ema48_break = self.parameters.get("exit_conditions", {}).get("use_ema48_break", False)
            if use_ema48_break and current_price > current_ema48:
                logger.info(f"空单突破48 EMA: 价格={current_price:.2f}, 48EMA={current_ema48:.2f}")
                return self._create_exit_signal("ema48_break", current_price, pnl_ratio)
            
            # 5. 移动止盈（如果开启）
            use_trailing_stop = self.parameters.get("exit_conditions", {}).get("use_trailing_stop", False)
            trailing_profit_threshold = self.parameters.get("exit_conditions", {}).get("trailing_stop_activation", 0.03)
            if use_trailing_stop and pnl_ratio > trailing_profit_threshold and current_price > current_ema8:
                logger.info(f"空单移动止盈: 价格={current_price:.2f}, 8EMA={current_ema8:.2f}")
                return self._create_exit_signal("trailing_stop", current_price, pnl_ratio)
        
        return None
    
    def _create_exit_signal(self, exit_type: str, price: float, pnl_ratio: float) -> Dict[str, Any]:
        """创建出场信号"""
        side = self.current_position["side"]
        signal_type = "buy" if side == "short" else "sell"
        
        return {
            "signal": signal_type,
            "price": price,
            "amount": self.current_position["amount"],
            "type": exit_type,
            "pnl": pnl_ratio,
            "reason": f"{side}出场 {exit_type} 盈亏={pnl_ratio:+.2%}"
        }
    
    def _check_risk_controls(self, current_timestamp: float) -> bool:
        """
        检查风控条件
        
        Args:
            current_timestamp: 当前时间戳（秒）
        """
        # 检查是否在暂停期
        if current_timestamp < self.pause_until_timestamp:
            remaining_hours = (self.pause_until_timestamp - current_timestamp) / 3600
            logger.warning(f"⏸️ 暂停交易中，剩余 {remaining_hours:.1f} 小时")
            return False
        
        # 检查日内亏损限制
        max_daily_loss = self.parameters.get("max_daily_loss", 0.05)
        capital = self.parameters.get("total_capital", 300.0)
        
        if self.daily_pnl < -capital * max_daily_loss:
            logger.warning(f"触发日内亏损限制: {self.daily_pnl:.2f}")
            return False
        
        # 检查连续亏损限制
        max_consecutive_losses = self.parameters.get("max_consecutive_losses", 3)
        if self.consecutive_losses >= max_consecutive_losses:
            # 触发连续亏损熔断
            pause_hours = self.parameters.get("pause_hours_after_consecutive_loss", 24)
            self.pause_until_timestamp = current_timestamp + (pause_hours * 3600)
            pause_until_time = datetime.fromtimestamp(self.pause_until_timestamp).strftime('%Y-%m-%d %H:%M')
            logger.warning(f"🛑 连续亏损{self.consecutive_losses}次，暂停交易{pause_hours}小时至 {pause_until_time}")
            return False
        
        return True
    
    def _identify_market_regime(self, closes: np.ndarray, ema200: np.ndarray) -> str:
        """
        识别市场状态（牛市/熊市/震荡）
        
        判断逻辑：
        1. 强牛市：价格持续在EMA200上方 + EMA200上行
        2. 强熊市：价格持续在EMA200下方 + EMA200下行
        3. 震荡市：价格在EMA200附近波动
        
        Returns:
            "bull"（牛市）, "bear"（熊市）, "neutral"（震荡）
        """
        if len(closes) < 20 or len(ema200) < 20:
            return "neutral"
        
        current_price = closes[-1]
        current_ema200 = ema200[-1]
        
        # 计算EMA200的斜率（趋势方向）
        lookback = int(self.parameters.get("market_regime", {}).get("ema200_lookback", 10))
        ema200_slope = (ema200[-1] - ema200[-lookback]) / ema200[-lookback]
        
        # 计算价格与EMA200的距离
        price_distance = (current_price - current_ema200) / current_ema200
        distance_threshold = float(self.parameters.get("market_regime", {}).get("price_distance_threshold", 0.03))
        
        # 计算最近N根K线中价格在EMA200上方/下方的比例
        lookback_bars = 20
        above_count = np.sum(closes[-lookback_bars:] > ema200[-lookback_bars:])
        above_ratio = above_count / lookback_bars
        
        # 强牛市判断：价格持续在EMA200上方 + EMA200上行
        if above_ratio > 0.7 and ema200_slope > 0.001:
            logger.info(f"💚 强牛市: 价格在200EMA上方{above_ratio:.1%}, EMA200斜率={ema200_slope:+.3%}")
            return "bull"
        
        # 强熊市判断：价格持续在EMA200下方 + EMA200下行
        if above_ratio < 0.3 and ema200_slope < -0.001:
            logger.info(f"❤️ 强熊市: 价格在200EMA下方{1-above_ratio:.1%}, EMA200斜率={ema200_slope:+.3%}")
            return "bear"
        
        # 震荡市
        logger.info(f"🟡 震荡市: 上方比例={above_ratio:.1%}, EMA200斜率={ema200_slope:+.3%}")
        return "neutral"
    
    def _calculate_ema(self, data: np.ndarray, period: int) -> np.ndarray:
        """计算EMA（指数移动平均）"""
        if len(data) == 0:
            return np.array([])
        alpha = 2.0 / (period + 1.0)
        ema = np.zeros(len(data), dtype=float)
        ema[0] = float(data[0])
        for i in range(1, len(data)):
            ema[i] = alpha * float(data[i]) + (1.0 - alpha) * ema[i - 1]
        return ema
    
    def _calculate_atr(self, klines: List[Dict], period: int = 14) -> float:
        """计算ATR（平均真实波幅）"""
        if len(klines) < period + 1:
            return 0.0
        
        highs = np.array([k["high"] for k in klines], dtype=float)
        lows = np.array([k["low"] for k in klines], dtype=float)
        closes = np.array([k["close"] for k in klines], dtype=float)
        
        tr = np.maximum(
            highs[1:] - lows[1:],
            np.maximum(
                np.abs(highs[1:] - closes[:-1]),
                np.abs(lows[1:] - closes[:-1])
            )
        )
        
        if len(tr) < period:
            return float(np.mean(tr)) if len(tr) > 0 else 0.0
        
        atr_prev = float(np.sum(tr[:period]) / period)
        for i in range(period, len(tr)):
            atr_prev = (atr_prev * (period - 1) + tr[i]) / period
        
        return float(atr_prev)
    
    def update_position(self, signal: Dict[str, Any]):
        """更新持仓状态"""
        exit_types = ["stop_loss", "take_profit", "ema13_break", "ema48_break", "trailing_stop", "force_close", "max_loss_stop"]
        
        # 开仓
        if signal["signal"] == "buy" and signal.get("type") not in exit_types:
            self.current_position = {
                "side": "long",
                "entry_price": signal["price"],
                "amount": signal["amount"],
                "stop_loss": signal.get("stop_loss", signal["price"] * 0.95),
                "take_profit": signal.get("take_profit", signal["price"] * 1.10),
                "entry_time": datetime.now(),
                "signal_type": signal.get("signal_type", "趋势做多"),
                "entry_ema8": signal.get("entry_ema8"),
                "entry_ema13": signal.get("entry_ema13"),
                "entry_ema48": signal.get("entry_ema48")
            }
            logger.info(f"✓ 开多仓: {signal['price']:.2f}, 类型={self.current_position['signal_type']}")
        
        elif signal["signal"] == "sell" and signal.get("type") not in exit_types:
            self.current_position = {
                "side": "short",
                "entry_price": signal["price"],
                "amount": signal["amount"],
                "stop_loss": signal.get("stop_loss", signal["price"] * 1.05),
                "take_profit": signal.get("take_profit", signal["price"] * 0.90),
                "entry_time": datetime.now(),
                "signal_type": signal.get("signal_type", "趋势做空"),
                "entry_ema8": signal.get("entry_ema8"),
                "entry_ema13": signal.get("entry_ema13"),
                "entry_ema48": signal.get("entry_ema48")
            }
            logger.info(f"✓ 开空仓: {signal['price']:.2f}, 类型={self.current_position['signal_type']}")
        
        # 平仓
        elif signal.get("type") in exit_types:
            if self.current_position:
                logger.info(f"✓ 平仓: {signal.get('type')}, PNL={signal.get('pnl', 0):.2%}")
                self.current_position = None
    
    def record_trade(self, signal: Dict[str, Any]):
        """记录交易"""
        trade = {
            "timestamp": datetime.now(),
            "signal": signal["signal"],
            "price": signal["price"],
            "amount": signal.get("amount", 0),
            "type": signal.get("type", "entry"),
            "pnl": signal.get("pnl", 0)
        }
        
        self.daily_trades.append(trade)
        
        # 更新盈亏和连续亏损
        exit_types = ["stop_loss", "take_profit", "ema13_break", "ema48_break", "trailing_stop", "max_loss_stop"]
        if "pnl" in signal and signal.get("type") in exit_types:
            pnl_amount = signal["pnl"] * signal["price"] * signal.get("amount", 0)
            self.daily_pnl += pnl_amount
            self.total_trades += 1
            
            if signal["pnl"] < 0:
                self.consecutive_losses += 1
                logger.info(f"📉 亏损交易，连续亏损次数: {self.consecutive_losses}")
            else:
                if self.consecutive_losses > 0:
                    logger.info(f"✅ 盈利交易，重置连续亏损计数")
                self.consecutive_losses = 0
    
    def reset_daily_stats(self):
        """重置每日统计（但保留连续亏损计数器）"""
        logger.info(f"EMA双向策略日统计 - 盈亏: {self.daily_pnl:.2f}, 交易: {len(self.daily_trades)}, 连续亏损: {self.consecutive_losses}")
        self.daily_trades.clear()
        self.daily_pnl = 0.0
        # 注意：不重置 consecutive_losses，让它跨天累积，只在盈利交易时重置
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取策略统计信息"""
        return {
            "total_trades": self.total_trades,
            "daily_pnl": self.daily_pnl,
            "consecutive_losses": self.consecutive_losses,
            "has_position": self.current_position is not None,
            "position_info": self.current_position if self.current_position else None
        }
