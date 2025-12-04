"""
EMA100 + RSI-Volume-Price三重共振策略

核心理念：
1. EMA100判断趋势方向和入场时机
2. RSI-Volume-Price三重共振捕捉逃顶信号
3. 78%准确率的反转预警，提前止盈

三重共振条件：
1. RSI过热：RSI > 80（做多）或 RSI < 20（做空）
2. 成交量异常：成交量突然放大但价格涨幅收窄
3. 价格结构：出现长上影线或十字星（犹豫K线）

作者：AI Trading System
日期：2024-10-31
"""

import logging
from typing import Dict, List, Any, Optional
import numpy as np
from datetime import datetime

logger = logging.getLogger(__name__)


class EMARSIVolumeStrategy:
    """EMA100 + RSI-Volume-Price三重共振策略"""
    
    def __init__(self, parameters: Dict[str, Any]):
        """
        初始化策略
        
        Args:
            parameters: 策略参数字典
        """
        
        self.name = "EMA100+RSI量价共振策略"
        self.parameters = parameters
        
        # EMA参数
        self.ema_period = int(parameters.get("ema_period", 100))
        
        # RSI参数
        self.rsi_period = int(parameters.get("rsi_period", 14))
        self.rsi_overbought = float(parameters.get("rsi_overbought", 80))
        self.rsi_oversold = float(parameters.get("rsi_oversold", 20))
        
        # 成交量异常阈值
        self.volume_surge_ratio = float(parameters.get("volume_surge_ratio", 2.0))  # 成交量放大2倍
        self.price_momentum_threshold = float(parameters.get("price_momentum_threshold", 0.005))  # 价格涨幅收窄到0.5%
        
        # K线形态参数
        self.shadow_ratio = float(parameters.get("shadow_ratio", 0.6))  # 上影线占比60%
        self.doji_threshold = float(parameters.get("doji_threshold", 0.3))  # 十字星阈值
        
        # 入场条件
        self.entry_distance_min = float(parameters.get("entry_distance_min", -0.005))
        self.entry_distance_max = float(parameters.get("entry_distance_max", 0.02))
        self.pullback_lookback = int(parameters.get("pullback_lookback", 5))
        
        # 止损止盈
        self.stop_loss_pct = float(parameters.get("stop_loss_pct", 0.025))
        self.risk_reward_ratio = float(parameters.get("risk_reward_ratio", 4.0))
        
        # 资金管理
        self.total_capital = float(parameters.get("total_capital", 300.0))
        self.leverage = float(parameters.get("leverage", 3.0))
        self.risk_per_trade = float(parameters.get("risk_per_trade", 0.025))
        self.position_ratio = float(parameters.get("position_ratio", 0.45))
        
        # 风控
        self.max_daily_loss = float(parameters.get("max_daily_loss", 0.06))
        self.max_consecutive_losses = int(parameters.get("max_consecutive_losses", 2))
        self.pause_hours = int(parameters.get("pause_hours_after_consecutive_loss", 8))
        
        # 状态跟踪
        self.current_position = None
        self.consecutive_losses = 0
        self.daily_pnl = 0.0
        self.pause_until = None
        self.daily_stats = {}
        
        logger.info(f"✓ {self.name}初始化完成")
        logger.info(f"  - 趋势指标: EMA{self.ema_period}")
        logger.info(f"  - 逃顶信号: RSI({self.rsi_period}) > {self.rsi_overbought} + 量价背离 + K线形态")
        logger.info(f"  - 止损/止盈: {self.stop_loss_pct:.1%}/{self.stop_loss_pct * self.risk_reward_ratio:.1%}")
        logger.info(f"  - 资金: {self.total_capital}U, 杠杆{self.leverage}x")

    def analyze(self, klines: List[Dict]) -> Dict[str, Any]:
        """
        分析市场并生成信号
        
        Args:
            klines: K线数据列表
            
        Returns:
            交易信号字典
        """
        
        if len(klines) < max(self.ema_period, self.rsi_period, 20):
            return {"signal": "hold", "reason": "数据不足"}
        
        current_time = klines[-1]["timestamp"] if klines else 0
        
        # 检查暂停状态
        if self.pause_until and current_time < self.pause_until:
            remaining_hours = (self.pause_until - current_time) / 3600
            return {"signal": "hold", "reason": f"⏸️ 暂停交易中，剩余{remaining_hours:.1f}小时"}
        
        # 检查日损失
        if self.daily_pnl <= -self.max_daily_loss * self.total_capital:
            return {"signal": "hold", "reason": f"⛔ 达到日损失上限"}
        
        # 如果有持仓，检查出场条件
        if self.current_position:
            exit_signal = self._check_exit_conditions(klines, current_time)
            if exit_signal:
                return exit_signal
            return {"signal": "hold", "reason": "持仓中"}
        
        # 生成入场信号
        return self._generate_entry_signal(klines)
    
    def _generate_entry_signal(self, klines: List[Dict]) -> Dict[str, Any]:
        """生成入场信号（基于EMA100）"""
        
        closes = np.array([k["close"] for k in klines])
        highs = np.array([k["high"] for k in klines])
        lows = np.array([k["low"] for k in klines])
        
        # 计算EMA
        ema = self._calculate_ema(closes, self.ema_period)
        current_price = closes[-1]
        current_ema = ema[-1]
        
        distance_pct = (current_price - current_ema) / current_ema
        
        logger.info(f"价格={current_price:.2f}, EMA{self.ema_period}={current_ema:.2f}, 距离={distance_pct:+.2%}")
        
        # === 做多信号 ===
        if distance_pct > 0:
            if self.entry_distance_min <= distance_pct <= self.entry_distance_max:
                recent_low = float(np.min(lows[-self.pullback_lookback:]))
                if recent_low <= current_ema * 1.01:
                    logger.info(f"✓ 做多信号：价格回踩EMA{self.ema_period}")
                    return self._create_long_signal(current_price, current_ema)
        
        # === 做空信号 ===
        elif distance_pct < 0:
            if -self.entry_distance_max <= distance_pct <= -self.entry_distance_min:
                recent_high = float(np.max(highs[-self.pullback_lookback:]))
                if recent_high >= current_ema * 0.99:
                    logger.info(f"✓ 做空信号：价格反弹至EMA{self.ema_period}")
                    return self._create_short_signal(current_price, current_ema)
        
        return {"signal": "hold", "reason": f"等待入场时机"}
    
    def _check_exit_conditions(self, klines: List[Dict], current_time: float) -> Optional[Dict[str, Any]]:
        """检查出场条件（关键：加入RSI-Volume-Price三重共振）"""
        
        if not self.current_position:
            return None
        
        current_price = klines[-1]["close"]
        entry_price = self.current_position["entry_price"]
        stop_loss = self.current_position["stop_loss"]
        take_profit = self.current_position["take_profit"]
        position_type = self.current_position["type"]
        
        # 计算盈亏比例
        if position_type == "long":
            pnl_ratio = (current_price - entry_price) / entry_price
        else:
            pnl_ratio = (entry_price - current_price) / entry_price
        
        # 🎯 关键：检查三重共振逃顶信号
        resonance_signal = self._check_triple_resonance(klines, position_type)
        if resonance_signal:
            logger.info(f"🚨 三重共振逃顶信号触发！{resonance_signal}")
            return self._create_exit_signal("triple_resonance", current_price, pnl_ratio)
        
        # 1. 止盈
        if position_type == "long" and current_price >= take_profit:
            logger.info(f"✅ 多单止盈: {entry_price:.2f} → {current_price:.2f}, 盈利={pnl_ratio:+.2%}")
            return self._create_exit_signal("take_profit", current_price, pnl_ratio)
        
        if position_type == "short" and current_price <= take_profit:
            logger.info(f"✅ 空单止盈: {entry_price:.2f} → {current_price:.2f}, 盈利={pnl_ratio:+.2%}")
            return self._create_exit_signal("take_profit", current_price, pnl_ratio)
        
        # 2. 止损
        if position_type == "long" and current_price <= stop_loss:
            logger.info(f"❌ 多单止损: {entry_price:.2f} → {current_price:.2f}, 亏损={pnl_ratio:+.2%}")
            return self._create_exit_signal("stop_loss", current_price, pnl_ratio)
        
        if position_type == "short" and current_price >= stop_loss:
            logger.info(f"❌ 空单止损: {entry_price:.2f} → {current_price:.2f}, 亏损={pnl_ratio:+.2%}")
            return self._create_exit_signal("stop_loss", current_price, pnl_ratio)
        
        # 3. EMA反转
        closes = np.array([k["close"] for k in klines])
        ema = self._calculate_ema(closes, self.ema_period)
        current_ema = ema[-1]
        
        if position_type == "long" and current_price < current_ema:
            logger.info(f"多单跌破EMA{self.ema_period}")
            return self._create_exit_signal("ema_break", current_price, pnl_ratio)
        
        if position_type == "short" and current_price > current_ema:
            logger.info(f"空单突破EMA{self.ema_period}")
            return self._create_exit_signal("ema_break", current_price, pnl_ratio)
        
        return None
    
    def _check_triple_resonance(self, klines: List[Dict], position_type: str) -> Optional[str]:
        """
        检查RSI-Volume-Price三重共振信号
        
        Returns:
            如果触发，返回信号描述；否则返回None
        """
        
        if len(klines) < 20:
            return None
        
        closes = np.array([k["close"] for k in klines])
        volumes = np.array([k["volume"] for k in klines])
        
        current_kline = klines[-1]
        prev_kline = klines[-2]
        
        # 1️⃣ RSI过热检查
        rsi = self._calculate_rsi(closes, self.rsi_period)
        current_rsi = rsi[-1]
        
        rsi_overbought = False
        rsi_oversold = False
        
        if position_type == "long":
            # 做多单，检查RSI是否过热（>80）
            rsi_overbought = current_rsi > self.rsi_overbought
            if not rsi_overbought:
                return None  # RSI未过热，不触发
        else:
            # 做空单，检查RSI是否超卖（<20）
            rsi_oversold = current_rsi < self.rsi_oversold
            if not rsi_oversold:
                return None
        
        # 2️⃣ 成交量异常检查（成交量放大但价格涨幅收窄）
        avg_volume = np.mean(volumes[-20:-1])  # 前19根的平均成交量
        current_volume = volumes[-1]
        volume_ratio = current_volume / avg_volume
        
        # 价格变化幅度
        price_change = abs(current_kline["close"] - current_kline["open"]) / current_kline["open"]
        
        volume_divergence = False
        if volume_ratio > self.volume_surge_ratio and price_change < self.price_momentum_threshold:
            volume_divergence = True
        
        if not volume_divergence:
            return None  # 量价未背离，不触发
        
        # 3️⃣ K线形态检查（长上影线或十字星）
        candle_pattern = False
        
        # 计算K线各部分长度
        body = abs(current_kline["close"] - current_kline["open"])
        upper_shadow = current_kline["high"] - max(current_kline["close"], current_kline["open"])
        lower_shadow = min(current_kline["close"], current_kline["open"]) - current_kline["low"]
        total_range = current_kline["high"] - current_kline["low"]
        
        if total_range > 0:
            # 长上影线（做多逃顶）
            if position_type == "long":
                if upper_shadow / total_range > self.shadow_ratio:
                    candle_pattern = True
                # 或十字星
                elif body / total_range < self.doji_threshold:
                    candle_pattern = True
            
            # 长下影线（做空逃底）
            else:
                if lower_shadow / total_range > self.shadow_ratio:
                    candle_pattern = True
                # 或十字星
                elif body / total_range < self.doji_threshold:
                    candle_pattern = True
        
        if not candle_pattern:
            return None  # K线形态不符合，不触发
        
        # ✅ 三重共振触发！
        return f"RSI={current_rsi:.1f}, 量比={volume_ratio:.2f}x, K线形态警告"
    
    def _create_long_signal(self, price: float, ema_value: float) -> Dict[str, Any]:
        """创建做多信号"""
        
        entry_price = price
        stop_loss = entry_price * (1 - self.stop_loss_pct)
        take_profit = entry_price * (1 + self.stop_loss_pct * self.risk_reward_ratio)
        
        # 计算仓位
        risk_amount = self.total_capital * self.risk_per_trade
        position_size = risk_amount / (entry_price * self.stop_loss_pct)
        amount = position_size * self.leverage
        
        return {
            "signal": "buy",
            "price": entry_price,
            "amount": amount,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "leverage": self.leverage,
            "ema_value": ema_value,
            "signal_type": f"EMA{self.ema_period}+RSI量价共振-做多",
            "reason": f"回踩EMA{self.ema_period}做多，三重共振保护"
        }
    
    def _create_short_signal(self, price: float, ema_value: float) -> Dict[str, Any]:
        """创建做空信号"""
        
        entry_price = price
        stop_loss = entry_price * (1 + self.stop_loss_pct)
        take_profit = entry_price * (1 - self.stop_loss_pct * self.risk_reward_ratio)
        
        risk_amount = self.total_capital * self.risk_per_trade
        position_size = risk_amount / (entry_price * self.stop_loss_pct)
        amount = position_size * self.leverage
        
        return {
            "signal": "sell",
            "price": entry_price,
            "amount": amount,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "leverage": self.leverage,
            "ema_value": ema_value,
            "signal_type": f"EMA{self.ema_period}+RSI量价共振-做空",
            "reason": f"反弹至EMA{self.ema_period}做空，三重共振保护"
        }
    
    def _create_exit_signal(self, exit_type: str, price: float, pnl_ratio: float) -> Dict[str, Any]:
        """创建出场信号"""
        return {
            "signal": "close",
            "type": exit_type,  # 关键：引擎通过'type'字段判断平仓原因
            "price": price,
            "reason": exit_type,
            "pnl_ratio": pnl_ratio
        }
    
    def update_position(self, signal: Dict[str, Any]) -> None:
        """更新持仓信息"""
        action = signal.get("signal")
        if action in ["buy", "sell"]:
            side = "long" if action == "buy" else "short"
            self.current_position = {
                "type": side,
                "side": side,  # 兼容回测引擎
                "entry_price": signal["price"],
                "entry_time": signal.get("timestamp", 0),
                "amount": signal["amount"],
                "stop_loss": signal.get("stop_loss"),
                "take_profit": signal.get("take_profit")
            }
        elif action == "close":
            self.current_position = None
    
    def on_trade_executed(self, trade: Dict[str, Any], current_time: float) -> None:
        """交易执行后的回调"""
        
        action = trade.get("action")
        
        if action in ["buy", "sell"]:
            side = "long" if action == "buy" else "short"
            self.current_position = {
                "type": side,
                "side": side,  # 兼容回测引擎
                "entry_price": trade["price"],
                "entry_time": current_time,
                "amount": trade["amount"],
                "stop_loss": trade.get("stop_loss"),
                "take_profit": trade.get("take_profit")
            }
            
        elif action == "close":
            pnl = trade.get("pnl", 0)
            self.daily_pnl += pnl
            
            if pnl < 0:
                self.consecutive_losses += 1
                if self.consecutive_losses >= self.max_consecutive_losses:
                    self.pause_until = current_time + self.pause_hours * 3600
                    logger.warning(f"⏸️ 连亏{self.consecutive_losses}次，暂停{self.pause_hours}小时")
            else:
                self.consecutive_losses = 0
            
            self.current_position = None
    
    def record_trade(self, signal: Dict[str, Any]) -> None:
        """记录交易（兼容回测引擎）"""
        pass  # 回测引擎会自动记录，这里不需要额外操作
    
    def on_day_end(self, date: str, pnl: float, trades: int) -> None:
        """日终统计"""
        self.daily_stats[date] = {
            "pnl": pnl,
            "trades": trades,
            "consecutive_losses": self.consecutive_losses
        }
        
        logger.info(f"EMA+RSI策略日统计 - 盈亏: {pnl:.2f}, 交易: {trades}, 连续亏损: {self.consecutive_losses}")
        
        self.daily_pnl = 0.0
    
    def _calculate_ema(self, data: np.ndarray, period: int) -> np.ndarray:
        """计算EMA"""
        ema = np.zeros_like(data)
        ema[0] = data[0]
        multiplier = 2.0 / (period + 1)
        
        for i in range(1, len(data)):
            ema[i] = (data[i] - ema[i-1]) * multiplier + ema[i-1]
        
        return ema
    
    def _calculate_rsi(self, closes: np.ndarray, period: int) -> np.ndarray:
        """计算RSI"""
        deltas = np.diff(closes)
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)
        
        avg_gains = np.zeros(len(closes))
        avg_losses = np.zeros(len(closes))
        
        avg_gains[period] = np.mean(gains[:period])
        avg_losses[period] = np.mean(losses[:period])
        
        for i in range(period + 1, len(closes)):
            avg_gains[i] = (avg_gains[i-1] * (period - 1) + gains[i-1]) / period
            avg_losses[i] = (avg_losses[i-1] * (period - 1) + losses[i-1]) / period
        
        rs = avg_gains / (avg_losses + 1e-10)
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    def get_strategy_info(self) -> Dict[str, Any]:
        """获取策略信息"""
        return {
            "name": self.name,
            "ema_period": self.ema_period,
            "rsi_period": self.rsi_period,
            "stop_loss_pct": self.stop_loss_pct,
            "risk_reward_ratio": self.risk_reward_ratio
        }

