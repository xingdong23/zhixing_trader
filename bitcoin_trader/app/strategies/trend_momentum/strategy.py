"""
趋势动量策略 - 基于EMA趋势和RSI动量的复合策略

核心思想：
1. 使用EMA21/EMA55双均线判断趋势方向
2. 使用RSI14判断动量状态
3. 综合趋势和动量生成多级信号
4. 动态止损止盈

信号分类：
- 多头倾向 + 动量上攻 → 强势做多
- 空头倾向 + 动量下压 → 强势做空
- 强势空头 + 动量回升 → 观望或轻仓
- 其他组合 → 按规则处理

适用场景：趋势市场、震荡突破
优势：多维度确认、风险可控
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np
import logging

logger = logging.getLogger(__name__)


class TrendMomentumStrategy:
    """趋势动量策略"""
    
    def __init__(self, parameters: Dict[str, Any]):
        """
        初始化趋势动量策略
        
        Args:
            parameters: 策略参数字典
        """
        
        self.name = "趋势动量策略"
        self.parameters = parameters
        
        # 持仓信息
        self.current_position: Optional[Dict] = None
        
        # 统计信息
        self.daily_trades = []
        self.daily_pnl = 0.0
        self.consecutive_losses = 0
        self.total_trades = 0
        
    def analyze(self, klines: List[Dict]) -> Dict[str, Any]:
        """
        分析市场并生成交易信号
        
        Args:
            klines: K线数据列表
            
        Returns:
            交易信号字典
        """
        if not klines or len(klines) < 100:
            return {"signal": "hold", "reason": "数据不足，需要至少100根K线"}
        
        # 检查风控
        if not self._check_risk_controls():
            return {"signal": "hold", "reason": "触发风控限制"}
        
        # 转换为Heikin-Ashi K线（如果启用）
        use_heikin_ashi = self.parameters.get("use_heikin_ashi", True)
        if use_heikin_ashi:
            klines = self._convert_to_heikin_ashi(klines)
        
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
        生成入场信号
        
        核心逻辑：
        1. 计算EMA21和EMA55判断趋势
        2. 计算RSI14判断动量
        3. 综合判断生成信号
        """
        closes = np.array([k["close"] for k in klines])
        
        # 计算指标
        ema21 = self._calculate_ema(closes, 21)
        ema55 = self._calculate_ema(closes, 55)
        rsi14 = self._calculate_rsi(closes, 14)
        atr_val = self._calculate_atr(klines, int(self.parameters.get("atr_period", 14)))
        
        current_price = closes[-1]
        
        # 判断趋势
        trend = self._determine_trend(ema21[-1], ema55[-1])
        
        # 判断动量
        momentum = self._determine_momentum(rsi14[-1])
        
        # 记录当前状态
        logger.info(f"趋势={trend}, 动量={momentum}, 价格={current_price:.2f}, EMA21={ema21[-1]:.2f}, EMA55={ema55[-1]:.2f}, RSI={rsi14[-1]:.1f}")
        
        # 生成交易信号
        signal = self._generate_signal_from_trend_momentum(
            trend, momentum, current_price, atr_val, ema21[-1], ema55[-1], rsi14[-1]
        )
        
        return signal
    
    def _determine_trend(self, ema21: float, ema55: float) -> str:
        """
        判断趋势方向
        
        Args:
            ema21: EMA21值
            ema55: EMA55值
            
        Returns:
            趋势类型：多头倾向、空头倾向、震荡
        """
        diff_percent = (ema21 - ema55) / ema55
        
        if diff_percent > 0.01:  # EMA21 > EMA55 超过1%
            return "多头倾向"
        elif diff_percent < -0.01:  # EMA21 < EMA55 超过1%
            return "空头倾向"
        else:
            return "震荡"
    
    def _determine_momentum(self, rsi: float) -> str:
        """
        判断动量状态
        
        Args:
            rsi: RSI值
            
        Returns:
            动量状态：动量上攻、动量回升、动量回落、动量下压
        """
        if rsi >= 70:
            return "动量上攻"
        elif rsi >= 50:
            return "动量回升"
        elif rsi >= 30:
            return "动量回落"
        else:
            return "动量下压"
    
    def _generate_signal_from_trend_momentum(
        self, 
        trend: str, 
        momentum: str, 
        price: float, 
        atr: float,
        ema21: float,
        ema55: float,
        rsi: float
    ) -> Dict[str, Any]:
        """
        根据趋势和动量生成交易信号
        
        交易规则：
        1. 多头倾向 + 动量上攻 → 做多（强势）
        2. 多头倾向 + 动量回升 → 做多（中等）
        3. 空头倾向 + 动量下压 → 做空（强势）
        4. 空头倾向 + 动量回落 → 做空（中等）
        5. 强势空头 + 动量回升 → 观望（可能反转）
        6. 其他情况 → 观望
        """
        
        # 做多信号
        if trend == "多头倾向" and momentum in ["动量上攻", "动量回升"]:
            strength = "强势" if momentum == "动量上攻" else "中等"
            return self._create_long_signal(price, atr, strength, trend, momentum)
        
        # 做空信号
        elif trend == "空头倾向" and momentum in ["动量下压", "动量回落"]:
            strength = "强势" if momentum == "动量下压" else "中等"
            return self._create_short_signal(price, atr, strength, trend, momentum)
        
        # 观望情况
        else:
            reason = f"{trend} + {momentum}，等待更好的入场时机"
            return {"signal": "hold", "reason": reason}
    
    def _create_long_signal(
        self, 
        price: float, 
        atr: float, 
        strength: str,
        trend: str,
        momentum: str
    ) -> Dict[str, Any]:
        """创建做多信号"""
        capital = float(self.parameters.get("total_capital", 300.0))
        leverage = float(self.parameters.get("leverage", 2.0))
        risk_per_trade = float(self.parameters.get("risk_per_trade", 0.02))
        
        # 根据信号强度调整止损倍数
        if strength == "强势":
            stop_mult = 2.0
            target_mult = 6.0
        else:  # 中等
            stop_mult = 2.5
            target_mult = 5.0
        
        # 计算仓位（支持杠杆放大）
        use_leverage_sizing = self.parameters.get("use_leverage_sizing", False)
        
        if use_leverage_sizing:
            # 激进模式：使用杠杆放大仓位
            position_ratio = float(self.parameters.get("position_ratio", 0.5))
            position_value = capital * leverage * position_ratio
            amount = position_value / price
        else:
            # 保守模式：风险等额
            stop_distance = max(atr * stop_mult, price * 0.001)
            risk_amount = capital * risk_per_trade
            amount = risk_amount / stop_distance
        
        # 止损止盈
        stop_loss = price - (atr * stop_mult)
        take_profit = price + (atr * target_mult)
        
        return {
            "signal": "buy",
            "price": price,
            "amount": amount,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "leverage": leverage,
            "atr": atr,
            "strength": strength,
            "trend": trend,
            "momentum": momentum,
            "reason": f"{trend}+{momentum} {strength}做多 止损={stop_loss:.2f}"
        }
    
    def _create_short_signal(
        self, 
        price: float, 
        atr: float, 
        strength: str,
        trend: str,
        momentum: str
    ) -> Dict[str, Any]:
        """创建做空信号"""
        capital = float(self.parameters.get("total_capital", 300.0))
        leverage = float(self.parameters.get("leverage", 2.0))
        risk_per_trade = float(self.parameters.get("risk_per_trade", 0.02))
        
        # 根据信号强度调整止损倍数
        if strength == "强势":
            stop_mult = 2.0
            target_mult = 6.0
        else:  # 中等
            stop_mult = 2.5
            target_mult = 5.0
        
        # 计算仓位（支持杠杆放大）
        use_leverage_sizing = self.parameters.get("use_leverage_sizing", False)
        
        if use_leverage_sizing:
            # 激进模式：使用杠杆放大仓位
            position_ratio = float(self.parameters.get("position_ratio", 0.5))
            position_value = capital * leverage * position_ratio
            amount = position_value / price
        else:
            # 保守模式：风险等额
            stop_distance = max(atr * stop_mult, price * 0.001)
            risk_amount = capital * risk_per_trade
            amount = risk_amount / stop_distance
        
        # 止损止盈
        stop_loss = price + (atr * stop_mult)
        take_profit = price - (atr * target_mult)
        
        return {
            "signal": "sell",
            "price": price,
            "amount": amount,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "leverage": leverage,
            "atr": atr,
            "strength": strength,
            "trend": trend,
            "momentum": momentum,
            "reason": f"{trend}+{momentum} {strength}做空 止损={stop_loss:.2f}"
        }
    
    def _check_exit_conditions(self, klines: List[Dict]) -> Optional[Dict[str, Any]]:
        """
        检查出场条件
        
        出场逻辑：
        1. 固定止损止盈
        2. 趋势反转（EMA21穿越EMA55）
        3. 动量反转（RSI穿越50）
        4. 移动止盈（盈利后跟踪）
        """
        if not self.current_position:
            return None
        
        position = self.current_position
        current_price = klines[-1]["close"]
        side = position["side"]
        entry_price = position["entry_price"]
        stop_loss = position["stop_loss"]
        take_profit = position["take_profit"]
        
        # 计算指标
        closes = np.array([k["close"] for k in klines])
        ema21 = self._calculate_ema(closes, 21)
        ema55 = self._calculate_ema(closes, 55)
        rsi14 = self._calculate_rsi(closes, 14)
        atr_val = self._calculate_atr(klines, int(self.parameters.get("atr_period", 14)))
        
        # 计算盈亏
        if side == "long":
            pnl_ratio = (current_price - entry_price) / entry_price
            
            # 止损
            if current_price <= stop_loss:
                logger.info(f"触发止损: 价格={current_price:.2f}, 止损={stop_loss:.2f}")
                return self._create_exit_signal("stop_loss", current_price, pnl_ratio)
            
            # 止盈
            if current_price >= take_profit:
                logger.info(f"触发止盈: 价格={current_price:.2f}, 止盈={take_profit:.2f}")
                return self._create_exit_signal("take_profit", current_price, pnl_ratio)
            
            # 趋势反转（EMA21跌破EMA55）
            if ema21[-1] < ema55[-1]:
                logger.info(f"趋势反转: EMA21={ema21[-1]:.2f} < EMA55={ema55[-1]:.2f}")
                return self._create_exit_signal("trend_reversal", current_price, pnl_ratio)
            
            # 动量反转（RSI跌破50）
            if rsi14[-1] < 50 and pnl_ratio > 0.01:
                logger.info(f"动量反转: RSI={rsi14[-1]:.1f} < 50")
                return self._create_exit_signal("momentum_reversal", current_price, pnl_ratio)
            
            # 移动止盈（盈利超过3%后，使用EMA21作为追踪止损）
            if pnl_ratio > 0.03:
                trailing_stop = ema21[-1]
                if current_price < trailing_stop:
                    logger.info(f"移动止盈: 价格={current_price:.2f}, 追踪止损={trailing_stop:.2f}")
                    return self._create_exit_signal("trailing_stop", current_price, pnl_ratio)
        
        else:  # short
            pnl_ratio = (entry_price - current_price) / entry_price
            
            # 止损
            if current_price >= stop_loss:
                logger.info(f"触发止损: 价格={current_price:.2f}, 止损={stop_loss:.2f}")
                return self._create_exit_signal("stop_loss", current_price, pnl_ratio)
            
            # 止盈
            if current_price <= take_profit:
                logger.info(f"触发止盈: 价格={current_price:.2f}, 止盈={take_profit:.2f}")
                return self._create_exit_signal("take_profit", current_price, pnl_ratio)
            
            # 趋势反转（EMA21突破EMA55）
            if ema21[-1] > ema55[-1]:
                logger.info(f"趋势反转: EMA21={ema21[-1]:.2f} > EMA55={ema55[-1]:.2f}")
                return self._create_exit_signal("trend_reversal", current_price, pnl_ratio)
            
            # 动量反转（RSI突破50）
            if rsi14[-1] > 50 and pnl_ratio > 0.01:
                logger.info(f"动量反转: RSI={rsi14[-1]:.1f} > 50")
                return self._create_exit_signal("momentum_reversal", current_price, pnl_ratio)
            
            # 移动止盈（盈利超过3%后，使用EMA21作为追踪止损）
            if pnl_ratio > 0.03:
                trailing_stop = ema21[-1]
                if current_price > trailing_stop:
                    logger.info(f"移动止盈: 价格={current_price:.2f}, 追踪止损={trailing_stop:.2f}")
                    return self._create_exit_signal("trailing_stop", current_price, pnl_ratio)
        
        return None
    
    def _create_exit_signal(self, exit_type: str, price: float, pnl_ratio: float) -> Dict[str, Any]:
        """创建出场信号"""
        return {
            "signal": "sell" if self.current_position["side"] == "long" else "buy",
            "price": price,
            "amount": self.current_position["amount"],
            "type": exit_type,
            "pnl": pnl_ratio,
            "reason": f"出场 {exit_type} 盈亏={pnl_ratio:+.2%}"
        }
    
    def _check_risk_controls(self) -> bool:
        """检查风控条件"""
        # 检查日内亏损
        max_daily_loss = self.parameters.get("max_daily_loss", 0.05)
        capital = self.parameters.get("total_capital", 300.0)
        
        if self.daily_pnl < -capital * max_daily_loss:
            logger.warning(f"触发日内亏损限制: {self.daily_pnl:.2f}")
            return False
        
        # 检查连续亏损
        max_consecutive_losses = self.parameters.get("max_consecutive_losses", 3)
        if self.consecutive_losses >= max_consecutive_losses:
            logger.warning(f"连续亏损{self.consecutive_losses}次，暂停交易")
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
    
    def _calculate_rsi(self, closes: np.ndarray, period: int = 14) -> np.ndarray:
        """计算RSI（相对强弱指标）"""
        n = len(closes)
        if n == 0:
            return np.array([])
        if n < period + 1:
            return np.full(n, 50.0)
        
        deltas = np.diff(closes)
        gains = np.where(deltas > 0, deltas, 0.0)
        losses = np.where(deltas < 0, -deltas, 0.0)
        rsi = np.full(n, 50.0)
        
        # 初值
        avg_gain = np.sum(gains[:period]) / period
        avg_loss = np.sum(losses[:period]) / period
        rs = (avg_gain / avg_loss) if avg_loss != 0 else np.inf
        rsi[period] = 100.0 - (100.0 / (1.0 + rs)) if np.isfinite(rs) else 100.0
        
        # 递推
        for i in range(period + 1, n):
            gain = gains[i - 1]
            loss = losses[i - 1]
            avg_gain = (avg_gain * (period - 1) + gain) / period
            avg_loss = (avg_loss * (period - 1) + loss) / period
            rs = (avg_gain / avg_loss) if avg_loss != 0 else np.inf
            rsi[i] = 100.0 - (100.0 / (1.0 + rs)) if np.isfinite(rs) else 100.0
        
        return rsi
    
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
    
    def _convert_to_heikin_ashi(self, klines: List[Dict]) -> List[Dict]:
        """
        转换为Heikin-Ashi K线（平均K线）
        
        Heikin-Ashi计算公式：
        - HA_Close = (Open + High + Low + Close) / 4
        - HA_Open = (Previous HA_Open + Previous HA_Close) / 2
        - HA_High = Max(High, HA_Open, HA_Close)
        - HA_Low = Min(Low, HA_Open, HA_Close)
        
        Args:
            klines: 原始K线数据
            
        Returns:
            Heikin-Ashi K线数据
        """
        if not klines:
            return klines
        
        ha_klines = []
        ha_open = (klines[0]["open"] + klines[0]["close"]) / 2
        
        for i, kline in enumerate(klines):
            # 计算HA收盘价
            ha_close = (kline["open"] + kline["high"] + kline["low"] + kline["close"]) / 4
            
            # 计算HA开盘价（第一根使用原始数据）
            if i == 0:
                ha_open = (kline["open"] + kline["close"]) / 2
            else:
                ha_open = (ha_klines[i-1]["open"] + ha_klines[i-1]["close"]) / 2
            
            # 计算HA最高价和最低价
            ha_high = max(kline["high"], ha_open, ha_close)
            ha_low = min(kline["low"], ha_open, ha_close)
            
            # 创建HA K线
            ha_kline = {
                "timestamp": kline.get("timestamp"),
                "open": ha_open,
                "high": ha_high,
                "low": ha_low,
                "close": ha_close,
                "volume": kline.get("volume", 0)
            }
            
            ha_klines.append(ha_kline)
        
        return ha_klines
    
    def update_position(self, signal: Dict[str, Any]):
        """更新持仓状态"""
        if signal["signal"] in ["buy", "sell"] and signal.get("type") not in ["stop_loss", "take_profit", "trend_reversal", "momentum_reversal", "trailing_stop"]:
            # 开仓
            self.current_position = {
                "side": "long" if signal["signal"] == "buy" else "short",
                "entry_price": signal["price"],
                "amount": signal["amount"],
                "stop_loss": signal["stop_loss"],
                "take_profit": signal["take_profit"],
                "entry_time": datetime.now(),
                "strength": signal.get("strength", "中等"),
                "trend": signal.get("trend", ""),
                "momentum": signal.get("momentum", "")
            }
            logger.info(f"✓ {self.current_position['side']}开仓: {signal['price']:.2f}, 强度={self.current_position['strength']}")
        
        elif signal.get("type") in ["stop_loss", "take_profit", "trend_reversal", "momentum_reversal", "trailing_stop"]:
            # 平仓
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
        if "pnl" in signal and signal.get("type") in ["stop_loss", "take_profit", "trend_reversal", "momentum_reversal", "trailing_stop"]:
            pnl_amount = signal["pnl"] * signal["price"] * signal.get("amount", 0)
            self.daily_pnl += pnl_amount
            self.total_trades += 1
            
            if signal["pnl"] < 0:
                self.consecutive_losses += 1
            else:
                self.consecutive_losses = 0
    
    def reset_daily_stats(self):
        """重置每日统计"""
        logger.info(f"趋势动量策略日统计 - 盈亏: {self.daily_pnl:.2f}, 交易: {len(self.daily_trades)}, 连续亏损: {self.consecutive_losses}")
        self.daily_trades.clear()
        self.daily_pnl = 0.0
        # 重置连续亏损计数器
        self.consecutive_losses = 0
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取策略统计信息"""
        return {
            "total_trades": self.total_trades,
            "daily_pnl": self.daily_pnl,
            "consecutive_losses": self.consecutive_losses,
            "has_position": self.current_position is not None,
            "position_info": self.current_position if self.current_position else None
        }
