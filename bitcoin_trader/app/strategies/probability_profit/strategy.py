"""
概率盈利策略 - Probability Profit Strategy

核心理念：
1. 小止损（1.5-2%）大止盈（7-10%），盈亏比5:1
2. 胜率35-40%，每笔盈利期望1.5-2%
3. 趋势跟踪+动量突破，EMA作为趋势过滤
4. 严格风控：连亏2次暂停，日损失5%停止
5. 5年零爆仓的保守理念

作者：AI Trading System
日期：2024-10-31
"""

import logging
from typing import Dict, List, Any, Optional
import numpy as np
from datetime import datetime

logger = logging.getLogger(__name__)


class ProbabilityProfitStrategy:
    """概率盈利策略"""
    
    def __init__(self, parameters: Dict[str, Any]):
        """
        初始化策略
        
        Args:
            parameters: 策略参数字典
        """
        
        self.name = "概率盈利策略"
        self.parameters = parameters
        
        # 趋势指标
        self.ema_fast = int(parameters.get("ema_fast", 50))
        self.ema_slow = int(parameters.get("ema_slow", 100))
        
        # 入场条件
        self.breakout_threshold = float(parameters.get("breakout_threshold", 0.005))  # 突破阈值0.5%
        self.trend_min_distance = float(parameters.get("trend_min_distance", 0.01))  # 距离EMA最小1%
        
        # 止损止盈
        self.stop_loss_pct = float(parameters.get("stop_loss_pct", 0.015))  # 止损1.5%
        self.take_profit_pct = float(parameters.get("take_profit_pct", 0.08))  # 止盈8%（约5倍）
        
        # 资金管理
        self.total_capital = float(parameters.get("total_capital", 300.0))
        self.leverage = float(parameters.get("leverage", 3.0))
        self.risk_per_trade = float(parameters.get("risk_per_trade", 0.015))  # 单笔风险1.5%
        
        # 风控
        self.max_daily_loss = float(parameters.get("max_daily_loss", 0.05))  # 日损5%
        self.max_consecutive_losses = int(parameters.get("max_consecutive_losses", 2))  # 连亏2次
        self.pause_hours = int(parameters.get("pause_hours_after_consecutive_loss", 24))  # 暂停24小时
        
        # 状态跟踪
        self.current_position = None
        self.consecutive_losses = 0
        self.daily_pnl = 0.0
        self.daily_trades = 0
        self.last_trade_time = None
        self.pause_until = None
        self.daily_stats = {}
        
        logger.info(f"✓ {self.name}初始化完成")
        logger.info(f"  - 趋势指标: EMA{self.ema_fast}/{self.ema_slow}")
        logger.info(f"  - 止损/止盈: {self.stop_loss_pct:.1%}/{self.take_profit_pct:.1%}")
        logger.info(f"  - 盈亏比: {self.take_profit_pct/self.stop_loss_pct:.1f}:1")
        logger.info(f"  - 资金: {self.total_capital}U, 杠杆{self.leverage}x")
        logger.info(f"  - 风控: 日损{self.max_daily_loss:.0%}, 连亏{self.max_consecutive_losses}次暂停{self.pause_hours}小时")

    def analyze(self, klines: List[Dict]) -> Dict[str, Any]:
        """
        分析市场并生成信号（兼容回测引擎）
        
        Args:
            klines: K线数据列表
            
        Returns:
            交易信号字典
        """
        current_time = klines[-1]["timestamp"] if klines else 0
        return self.generate_signal(klines, current_time)
    
    def generate_signal(self, klines: List[Dict], current_time: float) -> Dict[str, Any]:
        """
        生成交易信号
        
        Args:
            klines: K线数据列表
            current_time: 当前时间戳（秒）
            
        Returns:
            交易信号字典
        """
        
        # 检查暂停状态
        if self.pause_until and current_time < self.pause_until:
            remaining_hours = (self.pause_until - current_time) / 3600
            return {
                "signal": "hold",
                "reason": f"⏸️ 暂停交易中，剩余{remaining_hours:.1f}小时"
            }
        
        # 检查日损失
        if self.daily_pnl <= -self.max_daily_loss * self.total_capital:
            return {
                "signal": "hold",
                "reason": f"⛔ 达到日损失上限 {self.daily_pnl:.2f} USDT"
            }
        
        # 如果有持仓，检查出场条件
        if self.current_position:
            return self._check_exit_conditions(klines, current_time)
        
        # 生成入场信号
        return self._generate_entry_signal(klines, current_time)
    
    def _generate_entry_signal(self, klines: List[Dict], current_time: float) -> Dict[str, Any]:
        """生成入场信号"""
        
        if len(klines) < max(self.ema_slow, 20):
            return {"signal": "hold", "reason": "数据不足"}
        
        # 提取数据
        closes = np.array([k["close"] for k in klines])
        highs = np.array([k["high"] for k in klines])
        lows = np.array([k["low"] for k in klines])
        
        # 计算EMA
        ema_fast = self._calculate_ema(closes, self.ema_fast)
        ema_slow = self._calculate_ema(closes, self.ema_slow)
        
        current_price = closes[-1]
        current_ema_fast = ema_fast[-1]
        current_ema_slow = ema_slow[-1]
        
        # 判断趋势
        trend = "up" if current_ema_fast > current_ema_slow else "down"
        trend_strength = abs(current_ema_fast - current_ema_slow) / current_ema_slow
        
        logger.info(f"价格={current_price:.2f}, EMA{self.ema_fast}={current_ema_fast:.2f}, "
                   f"EMA{self.ema_slow}={current_ema_slow:.2f}, 趋势={trend}, 强度={trend_strength:.2%}")
        
        # === 做多信号 ===
        if trend == "up":
            # 条件1：价格在EMA50上方
            distance_to_ema50 = (current_price - current_ema_fast) / current_ema_fast
            
            # 条件2：最近突破或回踩EMA50
            recent_bars = 5
            recent_lows = lows[-recent_bars:]
            touched_ema50 = np.min(recent_lows) <= current_ema_fast * 1.005  # 允许0.5%容差
            
            # 条件3：价格距离EMA50在合理范围（不能太远）
            if 0 < distance_to_ema50 < 0.03:  # 0-3%之间
                if touched_ema50:
                    logger.info(f"✓ 做多信号：价格回踩EMA{self.ema_fast}，距离={distance_to_ema50:+.2%}")
                    return self._create_long_signal(current_price, current_ema_fast)
        
        # === 做空信号 ===
        elif trend == "down":
            # 条件1：价格在EMA50下方
            distance_to_ema50 = (current_ema_fast - current_price) / current_ema_fast
            
            # 条件2：最近突破或反弹至EMA50
            recent_bars = 5
            recent_highs = highs[-recent_bars:]
            touched_ema50 = np.max(recent_highs) >= current_ema_fast * 0.995  # 允许0.5%容差
            
            # 条件3：价格距离EMA50在合理范围
            if 0 < distance_to_ema50 < 0.03:  # 0-3%之间
                if touched_ema50:
                    logger.info(f"✓ 做空信号：价格反弹至EMA{self.ema_fast}，距离={distance_to_ema50:+.2%}")
                    return self._create_short_signal(current_price, current_ema_fast)
        
        return {
            "signal": "hold",
            "reason": f"等待入场时机，趋势={trend}"
        }
    
    def _create_long_signal(self, price: float, ema_value: float) -> Dict[str, Any]:
        """创建做多信号"""
        
        # 计算止损止盈
        entry_price = price
        stop_loss = entry_price * (1 - self.stop_loss_pct)
        take_profit = entry_price * (1 + self.take_profit_pct)
        
        # 计算仓位（基于1.5%风险）
        risk_amount = self.total_capital * self.risk_per_trade
        position_size = risk_amount / (entry_price * self.stop_loss_pct)
        amount = position_size * self.leverage
        
        logger.info(f"📈 做多: 入场={entry_price:.2f}, 止损={stop_loss:.2f}(-{self.stop_loss_pct:.1%}), "
                   f"止盈={take_profit:.2f}(+{self.take_profit_pct:.1%}), 仓位={amount:.4f}")
        
        return {
            "signal": "buy",
            "price": entry_price,
            "amount": amount,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "leverage": self.leverage,
            "ema_value": ema_value,
            "signal_type": f"概率盈利-做多",
            "reason": f"回踩EMA{self.ema_fast}做多 止损={stop_loss:.2f} 止盈={take_profit:.2f}"
        }
    
    def _create_short_signal(self, price: float, ema_value: float) -> Dict[str, Any]:
        """创建做空信号"""
        
        # 计算止损止盈
        entry_price = price
        stop_loss = entry_price * (1 + self.stop_loss_pct)
        take_profit = entry_price * (1 - self.take_profit_pct)
        
        # 计算仓位
        risk_amount = self.total_capital * self.risk_per_trade
        position_size = risk_amount / (entry_price * self.stop_loss_pct)
        amount = position_size * self.leverage
        
        logger.info(f"📉 做空: 入场={entry_price:.2f}, 止损={stop_loss:.2f}(+{self.stop_loss_pct:.1%}), "
                   f"止盈={take_profit:.2f}(-{self.take_profit_pct:.1%}), 仓位={amount:.4f}")
        
        return {
            "signal": "sell",
            "price": entry_price,
            "amount": amount,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "leverage": self.leverage,
            "ema_value": ema_value,
            "signal_type": f"概率盈利-做空",
            "reason": f"反弹至EMA{self.ema_fast}做空 止损={stop_loss:.2f} 止盈={take_profit:.2f}"
        }
    
    def _check_exit_conditions(self, klines: List[Dict], current_time: float) -> Optional[Dict[str, Any]]:
        """检查出场条件"""
        
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
        
        # 3. 超时保护（持仓超过72小时）
        max_holding_hours = 72
        holding_hours = (current_time - self.current_position["entry_time"]) / 3600
        if holding_hours > max_holding_hours:
            logger.info(f"⏰ 超时平仓: 持仓{holding_hours:.1f}小时")
            return self._create_exit_signal("timeout", current_price, pnl_ratio)
        
        return None
    
    def _create_exit_signal(self, reason: str, price: float, pnl_ratio: float) -> Dict[str, Any]:
        """创建出场信号"""
        return {
            "signal": "close",
            "price": price,
            "reason": reason,
            "pnl_ratio": pnl_ratio
        }
    
    def update_position(self, signal: Dict[str, Any]) -> None:
        """更新持仓信息（兼容回测引擎）"""
        action = signal.get("signal")
        if action in ["buy", "sell"]:
            self.current_position = {
                "type": "long" if action == "buy" else "short",
                "entry_price": signal["price"],
                "entry_time": signal.get("timestamp", 0),
                "amount": signal["amount"],
                "stop_loss": signal.get("stop_loss"),
                "take_profit": signal.get("take_profit")
            }
    
    def on_trade_executed(self, trade: Dict[str, Any], current_time: float) -> None:
        """交易执行后的回调"""
        
        action = trade.get("action")
        
        if action in ["buy", "sell"]:
            # 开仓
            self.current_position = {
                "type": "long" if action == "buy" else "short",
                "entry_price": trade["price"],
                "entry_time": current_time,
                "amount": trade["amount"],
                "stop_loss": trade.get("stop_loss"),
                "take_profit": trade.get("take_profit")
            }
            logger.info(f"✓ 开仓: {self.current_position['type'].upper()} @ {trade['price']:.2f}")
            
        elif action == "close":
            # 平仓
            pnl = trade.get("pnl", 0)
            self.daily_pnl += pnl
            self.daily_trades += 1
            
            # 更新连亏计数
            if pnl < 0:
                self.consecutive_losses += 1
                logger.warning(f"❌ 亏损: {pnl:.2f} USDT, 连续亏损{self.consecutive_losses}次")
                
                # 触发连亏保护
                if self.consecutive_losses >= self.max_consecutive_losses:
                    self.pause_until = current_time + self.pause_hours * 3600
                    logger.warning(f"⏸️ 连亏{self.consecutive_losses}次，暂停交易{self.pause_hours}小时")
            else:
                self.consecutive_losses = 0
                logger.info(f"✅ 盈利: +{pnl:.2f} USDT")
            
            self.current_position = None
            self.last_trade_time = current_time
    
    def on_day_end(self, date: str, pnl: float, trades: int) -> None:
        """日终统计"""
        self.daily_stats[date] = {
            "pnl": pnl,
            "trades": trades,
            "consecutive_losses": self.consecutive_losses
        }
        
        logger.info(f"概率盈利策略日统计 - 盈亏: {pnl:.2f}, 交易: {trades}, 连续亏损: {self.consecutive_losses}")
        
        # 重置日统计
        self.daily_pnl = 0.0
        self.daily_trades = 0
    
    def _calculate_ema(self, data: np.ndarray, period: int) -> np.ndarray:
        """计算EMA"""
        ema = np.zeros_like(data)
        ema[0] = data[0]
        multiplier = 2.0 / (period + 1)
        
        for i in range(1, len(data)):
            ema[i] = (data[i] - ema[i-1]) * multiplier + ema[i-1]
        
        return ema
    
    def get_strategy_info(self) -> Dict[str, Any]:
        """获取策略信息"""
        return {
            "name": self.name,
            "ema_fast": self.ema_fast,
            "ema_slow": self.ema_slow,
            "stop_loss_pct": self.stop_loss_pct,
            "take_profit_pct": self.take_profit_pct,
            "risk_reward_ratio": self.take_profit_pct / self.stop_loss_pct,
            "risk_per_trade": self.risk_per_trade,
            "max_daily_loss": self.max_daily_loss,
            "max_consecutive_losses": self.max_consecutive_losses
        }

