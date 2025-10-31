"""
EMA144趋势跟踪策略 - 基于EMA144的简洁趋势策略

核心思想：
1. EMA144作为多空分界线
2. 价格在EMA144以上只做多，以下只做空
3. 价格回踩EMA144附近时进场
4. 固定止损10%
5. 移动止盈（trailing stop）保护利润

入场逻辑：
- 做多：价格在EMA144上方，且回踩至EMA144附近（距离在设定范围内）
- 做空：价格在EMA144下方，且反弹至EMA144附近（距离在设定范围内）

出场逻辑：
- 固定止损：-10%
- 移动止盈：价格在EMA144上方持续移动时，止损线跟随价格移动
- 趋势反转：价格跌破/突破EMA144

适用场景：趋势市场、中长期趋势跟踪
优势：逻辑简单、顺势而为、风险可控
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np
import logging

logger = logging.getLogger(__name__)


class EMA144TrendStrategy:
    """EMA144趋势跟踪策略"""
    
    def __init__(self, parameters: Dict[str, Any]):
        """
        初始化策略
        
        Args:
            parameters: 策略参数字典
        """
        
        self.name = "EMA144趋势跟踪策略"
        self.parameters = parameters
        
        # EMA周期（可配置）
        self.ema_period = int(parameters.get("ema_period", 144))
        
        # 持仓信息
        self.current_position: Optional[Dict] = None
        
        # 统计信息
        self.daily_trades = []
        self.daily_pnl = 0.0
        self.consecutive_losses = 0
        self.total_trades = 0
        
        # 暂停交易控制
        self.pause_until_timestamp = 0
        
    def analyze(self, klines: List[Dict]) -> Dict[str, Any]:
        """
        分析市场并生成交易信号
        
        Args:
            klines: K线数据列表
            
        Returns:
            交易信号字典
        """
        try:
            if not klines or len(klines) < 200:
                return {"signal": "hold", "reason": "数据不足，需要至少200根K线"}
            
            # 获取当前时间
            current_time = klines[-1].get("open_time", datetime.now().timestamp() * 1000) / 1000
            
            # 检查风控
            if not self._check_risk_controls(current_time):
                return {"signal": "hold", "reason": "触发风控限制"}
            
            # 如果有持仓，检查出场条件
            if self.current_position:
                exit_signal = self._check_exit_conditions(klines, current_time)
                if exit_signal:
                    return exit_signal
                return {"signal": "hold", "reason": "持仓中，等待出场信号"}
            
            # 无持仓，寻找入场机会
            return self._generate_entry_signal(klines)
        except Exception as e:
            logger.error(f"❌ 策略分析异常: {e}", exc_info=True)
            return {"signal": "hold", "reason": f"分析异常: {str(e)}"}
    
    def _generate_entry_signal(self, klines: List[Dict]) -> Dict[str, Any]:
        """
        生成入场信号
        
        核心逻辑：
        1. 计算EMA144
        2. 判断价格相对于EMA144的位置
        3. 检测回踩/反弹机会
        4. 做多：价格在EMA144上方，且回踩至附近
        5. 做空：价格在EMA144下方，且反弹至附近
        """
        closes = np.array([k["close"] for k in klines])
        highs = np.array([k["high"] for k in klines])
        lows = np.array([k["low"] for k in klines])
        
        # 计算EMA
        ema = self._calculate_ema(closes, self.ema_period)
        current_price = closes[-1]
        current_ema = ema[-1]
        
        # 计算价格与EMA的距离百分比
        distance_pct = (current_price - current_ema) / current_ema
        
        # 回踩/反弹阈值（可配置，默认±2%）
        pullback_threshold = float(self.parameters.get("pullback_threshold", 0.02))
        entry_distance_min = float(self.parameters.get("entry_distance_min", -0.005))  # 最小距离-0.5%
        entry_distance_max = float(self.parameters.get("entry_distance_max", 0.02))   # 最大距离+2%
        
        logger.info(f"价格={current_price:.2f}, EMA{self.ema_period}={current_ema:.2f}, 距离={distance_pct:+.2%}")
        
        # === 做多信号 ===
        # 条件：价格在EMA上方，且回踩至附近（距离在设定范围内）
        if distance_pct > 0:  # 价格在EMA上方
            # 检查是否在回踩范围内
            if entry_distance_min <= distance_pct <= entry_distance_max:
                # 确认回踩：最近几根K线最低价接近EMA
                lookback = int(self.parameters.get("pullback_lookback", 5))
                recent_low = float(np.min(lows[-lookback:]))
                
                # 如果最近低点触及或接近EMA，则为有效回踩
                if recent_low <= current_ema * 1.01:  # 允许1%的容差
                    logger.info(f"✓ 做多信号：价格回踩EMA{self.ema_period}，距离={distance_pct:+.2%}")
                    return self._create_long_signal(current_price, current_ema, distance_pct)
        
        # === 做空信号 ===
        # 条件：价格在EMA下方，且反弹至附近（距离在设定范围内）
        elif distance_pct < 0:  # 价格在EMA下方
            # 检查是否在反弹范围内（对称范围）
            if -entry_distance_max <= distance_pct <= -entry_distance_min:
                # 确认反弹：最近几根K线最高价接近EMA
                lookback = int(self.parameters.get("pullback_lookback", 5))
                recent_high = float(np.max(highs[-lookback:]))
                
                # 如果最近高点触及或接近EMA，则为有效反弹
                if recent_high >= current_ema * 0.99:  # 允许1%的容差
                    logger.info(f"✓ 做空信号：价格反弹至EMA{self.ema_period}，距离={distance_pct:+.2%}")
                    return self._create_short_signal(current_price, current_ema, distance_pct)
        
        return {
            "signal": "hold", 
            "reason": f"等待回踩/反弹，距离={distance_pct:+.2%}, EMA{self.ema_period}={current_ema:.2f}"
        }
    
    def _create_long_signal(
        self, 
        price: float, 
        ema_value: float,
        distance_pct: float
    ) -> Dict[str, Any]:
        """创建做多信号"""
        capital = float(self.parameters.get("total_capital", 300.0))
        leverage = float(self.parameters.get("leverage", 2.0))
        
        # 固定止损：-10%
        stop_loss_pct = float(self.parameters.get("stop_loss_pct", 0.10))
        stop_loss = price * (1 - stop_loss_pct)
        
        # 初始止盈：风险回报比（默认3:1）
        risk_reward_ratio = float(self.parameters.get("risk_reward_ratio", 3.0))
        risk_amount = price - stop_loss
        take_profit = price + (risk_amount * risk_reward_ratio)
        
        # 计算仓位
        use_leverage_sizing = self.parameters.get("use_leverage_sizing", False)
        
        if use_leverage_sizing:
            # 使用杠杆放大仓位
            position_ratio = float(self.parameters.get("position_ratio", 0.5))
            
            # 亏损后减仓
            if self.consecutive_losses > 0:
                reduction_factor = 0.8 ** self.consecutive_losses
                position_ratio = position_ratio * reduction_factor
                logger.info(f"⚠️ 仓位调整：连续亏损{self.consecutive_losses}次，仓位降至{position_ratio:.2%}")
            
            position_value = capital * leverage * position_ratio
            amount = position_value / price
        else:
            # 固定风险金额
            risk_per_trade = float(self.parameters.get("risk_per_trade", 0.02))
            risk_capital = capital * risk_per_trade
            amount = risk_capital / risk_amount
        
        return {
            "signal": "buy",
            "price": price,
            "amount": amount,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "leverage": leverage,
            "ema_value": ema_value,
            "distance_pct": distance_pct,
            "signal_type": f"EMA{self.ema_period}回踩做多",
            "reason": f"价格回踩EMA{self.ema_period}做多 止损={stop_loss:.2f}(-{stop_loss_pct:.0%}) 止盈={take_profit:.2f}"
        }
    
    def _create_short_signal(
        self,
        price: float,
        ema_value: float,
        distance_pct: float
    ) -> Dict[str, Any]:
        """创建做空信号"""
        capital = float(self.parameters.get("total_capital", 300.0))
        leverage = float(self.parameters.get("leverage", 2.0))
        
        # 固定止损：+10%
        stop_loss_pct = float(self.parameters.get("stop_loss_pct", 0.10))
        stop_loss = price * (1 + stop_loss_pct)
        
        # 初始止盈：风险回报比（默认3:1）
        risk_reward_ratio = float(self.parameters.get("risk_reward_ratio", 3.0))
        risk_amount = stop_loss - price
        take_profit = price - (risk_amount * risk_reward_ratio)
        
        # 计算仓位
        use_leverage_sizing = self.parameters.get("use_leverage_sizing", False)
        
        if use_leverage_sizing:
            # 使用杠杆放大仓位
            position_ratio = float(self.parameters.get("position_ratio", 0.5))
            
            # 亏损后减仓
            if self.consecutive_losses > 0:
                reduction_factor = 0.8 ** self.consecutive_losses
                position_ratio = position_ratio * reduction_factor
                logger.info(f"⚠️ 仓位调整：连续亏损{self.consecutive_losses}次，仓位降至{position_ratio:.2%}")
            
            position_value = capital * leverage * position_ratio
            amount = position_value / price
        else:
            # 固定风险金额
            risk_per_trade = float(self.parameters.get("risk_per_trade", 0.02))
            risk_capital = capital * risk_per_trade
            amount = risk_capital / risk_amount
        
        return {
            "signal": "sell",
            "price": price,
            "amount": amount,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "leverage": leverage,
            "ema_value": ema_value,
            "distance_pct": distance_pct,
            "signal_type": f"EMA{self.ema_period}反弹做空",
            "reason": f"价格反弹至EMA{self.ema_period}做空 止损={stop_loss:.2f}(+{stop_loss_pct:.0%}) 止盈={take_profit:.2f}"
        }
    
    def _check_exit_conditions(self, klines: List[Dict], current_time: float) -> Optional[Dict[str, Any]]:
        """
        检查出场条件
        
        出场逻辑：
        1. 固定止损：-10%
        2. 固定止盈：达到目标位
        3. 移动止盈：价格在EMA144上方持续移动时，更新止损线
        4. 趋势反转：价格跌破/突破EMA144
        """
        try:
            if not self.current_position:
                return None
            
            position = self.current_position
            current_price = klines[-1]["close"]
            entry_price = position["entry_price"]
            stop_loss = position["stop_loss"]
            take_profit = position["take_profit"]
            side = position["side"]
            
            # 计算EMA
            closes = np.array([k["close"] for k in klines])
            ema = self._calculate_ema(closes, self.ema_period)
            current_ema = ema[-1]
            
            # === 0. 持仓超时检查 ===
            max_holding_hours = self.parameters.get("max_holding_hours", 72)
            holding_hours = (current_time - position["entry_time"].timestamp()) / 3600
            if holding_hours > max_holding_hours:
                logger.warning(f"⏰ 持仓超时: {holding_hours:.1f}小时，强制平仓")
                pnl_ratio = (current_price - entry_price) / entry_price if side == "long" else (entry_price - current_price) / entry_price
                return {
                    "signal": "sell" if side == "long" else "buy",
                    "price": current_price,
                    "amount": position["amount"],
                    "type": "timeout",
                    "pnl": pnl_ratio,
                    "reason": f"持仓超时 {holding_hours:.1f}h"
                }
            
            # === 做多持仓 ===
            if side == "long":
                pnl_ratio = (current_price - entry_price) / entry_price
                
                # 0. RSI三重共振逃顶（优先级最高）
                if pnl_ratio > 0:  # 只在盈利时检测
                    resonance_signal = self._check_triple_resonance(klines, "long")
                    if resonance_signal:
                        logger.warning(f"🚨 多单三重共振逃顶: {resonance_signal}, 盈利={pnl_ratio:+.2%}")
                        return self._create_exit_signal("triple_resonance", current_price, pnl_ratio)
                
                # 1. 固定止损
                if current_price <= stop_loss:
                    logger.info(f"多单触发止损: 价格={current_price:.2f}, 止损={stop_loss:.2f}")
                    return self._create_exit_signal("stop_loss", current_price, pnl_ratio)
                
                # 2. 固定止盈
                if current_price >= take_profit:
                    logger.info(f"多单触发止盈: 价格={current_price:.2f}, 止盈={take_profit:.2f}")
                    return self._create_exit_signal("take_profit", current_price, pnl_ratio)
                
                # 3. 趋势反转：价格跌破EMA
                use_ema144_break = self.parameters.get("use_ema144_break", True)
                if use_ema144_break and current_price < current_ema:
                    logger.info(f"多单跌破EMA{self.ema_period}: 价格={current_price:.2f}, EMA{self.ema_period}={current_ema:.2f}")
                    return self._create_exit_signal("ema144_break", current_price, pnl_ratio)
                
                # 4. 移动止盈：价格在EMA144上方且已盈利
                use_trailing_stop = self.parameters.get("use_trailing_stop", True)
                trailing_activation = self.parameters.get("trailing_activation_pct", 0.02)  # 盈利2%后激活
                
                if use_trailing_stop and pnl_ratio > trailing_activation:
                    # 更新止损线为当前价格的固定百分比
                    trailing_stop_pct = self.parameters.get("trailing_stop_pct", 0.05)  # 跟踪止损5%
                    new_stop = current_price * (1 - trailing_stop_pct)
                    
                    # 只有当新止损高于原止损时才更新
                    if new_stop > position["stop_loss"]:
                        old_stop = position["stop_loss"]
                        position["stop_loss"] = new_stop
                        logger.info(f"📈 移动止盈更新：止损从 {old_stop:.2f} 提升至 {new_stop:.2f}，盈利={pnl_ratio:+.2%}")
                        stop_loss = new_stop  # 更新局部变量
                    
                    # 检查是否触发新止损
                    if current_price <= stop_loss:
                        logger.info(f"多单触发移动止盈: 价格={current_price:.2f}, 止损={stop_loss:.2f}")
                        return self._create_exit_signal("trailing_stop", current_price, pnl_ratio)
            
            # === 做空持仓 ===
            else:  # short
                pnl_ratio = (entry_price - current_price) / entry_price
                
                # 0. RSI三重共振逃底（优先级最高）
                if pnl_ratio > 0:  # 只在盈利时检测
                    resonance_signal = self._check_triple_resonance(klines, "short")
                    if resonance_signal:
                        logger.warning(f"🚨 空单三重共振逃底: {resonance_signal}, 盈利={pnl_ratio:+.2%}")
                        return self._create_exit_signal("triple_resonance", current_price, pnl_ratio)
                
                # 1. 固定止损
                if current_price >= stop_loss:
                    logger.info(f"空单触发止损: 价格={current_price:.2f}, 止损={stop_loss:.2f}")
                    return self._create_exit_signal("stop_loss", current_price, pnl_ratio)
                
                # 2. 固定止盈
                if current_price <= take_profit:
                    logger.info(f"空单触发止盈: 价格={current_price:.2f}, 止盈={take_profit:.2f}")
                    return self._create_exit_signal("take_profit", current_price, pnl_ratio)
                
                # 3. 趋势反转：价格突破EMA
                use_ema144_break = self.parameters.get("use_ema144_break", True)
                if use_ema144_break and current_price > current_ema:
                    logger.info(f"空单突破EMA{self.ema_period}: 价格={current_price:.2f}, EMA{self.ema_period}={current_ema:.2f}")
                    return self._create_exit_signal("ema144_break", current_price, pnl_ratio)
                
                # 4. 移动止盈：价格在EMA144下方且已盈利
                use_trailing_stop = self.parameters.get("use_trailing_stop", True)
                trailing_activation = self.parameters.get("trailing_activation_pct", 0.02)
                
                if use_trailing_stop and pnl_ratio > trailing_activation:
                    # 更新止损线为当前价格的固定百分比
                    trailing_stop_pct = self.parameters.get("trailing_stop_pct", 0.05)
                    new_stop = current_price * (1 + trailing_stop_pct)
                    
                    # 只有当新止损低于原止损时才更新
                    if new_stop < position["stop_loss"]:
                        old_stop = position["stop_loss"]
                        position["stop_loss"] = new_stop
                        logger.info(f"📉 移动止盈更新：止损从 {old_stop:.2f} 降至 {new_stop:.2f}，盈利={pnl_ratio:+.2%}")
                        stop_loss = new_stop  # 更新局部变量
                    
                    # 检查是否触发新止损
                    if current_price >= stop_loss:
                        logger.info(f"空单触发移动止盈: 价格={current_price:.2f}, 止损={stop_loss:.2f}")
                        return self._create_exit_signal("trailing_stop", current_price, pnl_ratio)
            
            return None
        except Exception as e:
            logger.error(f"❌ 出场检查异常: {e}", exc_info=True)
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
        """检查风控条件"""
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
    
    def update_position(self, signal: Dict[str, Any]):
        """更新持仓状态"""
        exit_types = ["stop_loss", "take_profit", "ema144_break", "trailing_stop", "timeout"]
        
        # 开仓
        if signal["signal"] == "buy" and signal.get("type") not in exit_types:
            self.current_position = {
                "side": "long",
                "entry_price": signal["price"],
                "amount": signal["amount"],
                "stop_loss": signal.get("stop_loss", signal["price"] * 0.90),
                "take_profit": signal.get("take_profit", signal["price"] * 1.30),
                "entry_time": datetime.now(),
                "signal_type": signal.get("signal_type", "EMA144回踩做多"),
                "ema144": signal.get("ema144")
            }
            logger.info(f"✓ 开多仓: {signal['price']:.2f}, 类型={self.current_position['signal_type']}")
        
        elif signal["signal"] == "sell" and signal.get("type") not in exit_types:
            self.current_position = {
                "side": "short",
                "entry_price": signal["price"],
                "amount": signal["amount"],
                "stop_loss": signal.get("stop_loss", signal["price"] * 1.10),
                "take_profit": signal.get("take_profit", signal["price"] * 0.70),
                "entry_time": datetime.now(),
                "signal_type": signal.get("signal_type", "EMA144反弹做空"),
                "ema144": signal.get("ema144")
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
        exit_types = ["stop_loss", "take_profit", "ema144_break", "trailing_stop", "timeout", "triple_resonance"]
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
        """重置每日统计"""
        logger.info(f"EMA144策略日统计 - 盈亏: {self.daily_pnl:.2f}, 交易: {len(self.daily_trades)}, 连续亏损: {self.consecutive_losses}")
        self.daily_trades.clear()
        self.daily_pnl = 0.0
        # 注意：不重置 consecutive_losses，让它跨天累积
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取策略统计信息"""
        return {
            "total_trades": self.total_trades,
            "daily_pnl": self.daily_pnl,
            "consecutive_losses": self.consecutive_losses,
            "has_position": self.current_position is not None,
            "position_info": self.current_position if self.current_position else None
        }
    
    def _check_triple_resonance(self, klines: List[Dict], position_type: str) -> Optional[str]:
        """
        检查RSI-Volume-Price三重共振信号
        
        Args:
            klines: K线数据
            position_type: 持仓类型 "long" 或 "short"
            
        Returns:
            如果触发，返回信号描述；否则返回None
        """
        if len(klines) < 20:
            return None
        
        # 获取参数
        rsi_overbought = float(self.parameters.get("rsi_overbought", 80))
        rsi_oversold = float(self.parameters.get("rsi_oversold", 20))
        volume_surge_ratio = float(self.parameters.get("volume_surge_ratio", 2.0))
        price_momentum_threshold = float(self.parameters.get("price_momentum_threshold", 0.005))
        shadow_ratio = float(self.parameters.get("shadow_ratio", 0.6))
        doji_threshold = float(self.parameters.get("doji_threshold", 0.3))
        
        closes = np.array([k["close"] for k in klines])
        volumes = np.array([k["volume"] for k in klines])
        current_kline = klines[-1]
        
        # 1️⃣ RSI过热/超卖检查
        rsi = self._calculate_rsi(closes, 14)
        current_rsi = rsi[-1]
        
        if position_type == "long":
            if current_rsi <= rsi_overbought:
                return None  # RSI未过热
        else:  # short
            if current_rsi >= rsi_oversold:
                return None  # RSI未超卖
        
        # 2️⃣ 成交量异常检查（量价背离）
        avg_volume = np.mean(volumes[-20:-1])
        current_volume = volumes[-1]
        volume_ratio = current_volume / avg_volume if avg_volume > 0 else 0
        
        price_change = abs(current_kline["close"] - current_kline["open"]) / current_kline["open"]
        
        if volume_ratio <= volume_surge_ratio or price_change >= price_momentum_threshold:
            return None  # 未出现量价背离
        
        # 3️⃣ K线形态检查
        body = abs(current_kline["close"] - current_kline["open"])
        upper_shadow = current_kline["high"] - max(current_kline["close"], current_kline["open"])
        lower_shadow = min(current_kline["close"], current_kline["open"]) - current_kline["low"]
        total_range = current_kline["high"] - current_kline["low"]
        
        if total_range == 0:
            return None
        
        candle_pattern = False
        if position_type == "long":
            # 做多逃顶：长上影线或十字星
            if upper_shadow / total_range > shadow_ratio:
                candle_pattern = True
            elif body / total_range < doji_threshold:
                candle_pattern = True
        else:  # short
            # 做空逃底：长下影线或十字星
            if lower_shadow / total_range > shadow_ratio:
                candle_pattern = True
            elif body / total_range < doji_threshold:
                candle_pattern = True
        
        if not candle_pattern:
            return None
        
        # ✅ 三重共振触发
        return f"RSI={current_rsi:.1f}, 量比={volume_ratio:.2f}x, K线形态警告"
    
    def _calculate_rsi(self, closes: np.ndarray, period: int = 14) -> np.ndarray:
        """计算RSI指标"""
        if len(closes) < period + 1:
            return np.zeros_like(closes)
        
        deltas = np.diff(closes)
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)
        
        avg_gains = np.zeros(len(closes))
        avg_losses = np.zeros(len(closes))
        
        # 初始平均
        avg_gains[period] = np.mean(gains[:period])
        avg_losses[period] = np.mean(losses[:period])
        
        # 指数移动平均
        for i in range(period + 1, len(closes)):
            avg_gains[i] = (avg_gains[i-1] * (period - 1) + gains[i-1]) / period
            avg_losses[i] = (avg_losses[i-1] * (period - 1) + losses[i-1]) / period
        
        rs = avg_gains / (avg_losses + 1e-10)
        rsi = 100 - (100 / (1 + rs))
        
        return rsi

