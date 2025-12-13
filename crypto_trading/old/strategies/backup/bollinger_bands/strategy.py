"""
布林线双向自适应策略

核心思想：
1. 根据布林线带宽判断市场状态（震荡/趋势）
2. 震荡模式：均值回归（触及上下轨反向交易）
3. 趋势模式：趋势跟踪（突破上下轨顺势交易）
4. 使用EMA 200过滤大趋势方向
5. 使用RSI确认超买超卖
6. 双向交易，牛熊通吃

策略逻辑：
- 震荡市：触及下轨→做多→目标中轨，触及上轨→做空→目标中轨
- 趋势市：突破上轨+中轨上行→追多，跌破下轨+中轨下行→追空
- 止损：2倍ATR或突破中轨
- 止盈：回到中轨或3倍风险回报比
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np
import logging

logger = logging.getLogger(__name__)


class BollingerBandsStrategy:
    """布林线双向自适应策略"""
    
    def __init__(self, parameters: Dict[str, Any]):
        self.name = "布林线双向自适应策略"
        self.parameters = parameters
        
        # 持仓信息
        self.current_position: Optional[Dict] = None
        
        # 统计信息
        self.daily_trades = []
        self.daily_pnl = 0.0
        self.consecutive_losses = 0
        self.total_trades = 0
        
        # 策略参数
        self.bb_period = parameters.get("bb_period", 20)
        self.bb_std = parameters.get("bb_std", 2.0)
        self.ema_trend_period = parameters.get("ema_trend_period", 200)
        self.rsi_period = parameters.get("rsi_period", 14)
        self.atr_period = parameters.get("atr_period", 14)
        
        # 带宽阈值
        self.squeeze_threshold = parameters.get("squeeze_threshold", 0.7)  # 收窄阈值
        self.expansion_threshold = parameters.get("expansion_threshold", 1.3)  # 扩张阈值
        
        # 交易参数
        self.leverage = parameters.get("leverage", 5.0)
        self.capital = parameters.get("capital", 300.0)
        self.allow_short = parameters.get("allow_short", True)
        
    def analyze(self, klines: List[Dict]) -> Dict[str, Any]:
        """分析市场并生成交易信号"""
        if not klines or len(klines) < max(self.bb_period, self.ema_trend_period) + 50:
            return {"signal": "hold", "reason": "数据不足"}
        
        # 检查风控
        if not self._check_risk_controls():
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
        """生成入场信号"""
        closes = np.array([k["close"] for k in klines])
        highs = np.array([k["high"] for k in klines])
        lows = np.array([k["low"] for k in klines])
        
        current_price = closes[-1]
        
        # 计算布林线
        bb_middle, bb_upper, bb_lower = self._calculate_bollinger_bands(closes)
        
        # 计算带宽和市场状态
        bb_width = (bb_upper[-1] - bb_lower[-1]) / bb_middle[-1]
        avg_bb_width = np.mean([(bb_upper[i] - bb_lower[i]) / bb_middle[i] 
                                 for i in range(-50, 0)])
        
        # 判断市场状态
        is_squeeze = bb_width < avg_bb_width * self.squeeze_threshold
        is_expansion = bb_width > avg_bb_width * self.expansion_threshold
        
        # 计算EMA 200（大趋势过滤）
        ema_200 = self._calculate_ema(closes, self.ema_trend_period)
        
        # 计算RSI
        rsi = self._calculate_rsi(closes, self.rsi_period)
        
        # 计算ATR
        atr_val = self._calculate_atr(klines, self.atr_period)
        
        # 中轨趋势方向
        middle_trend = "up" if bb_middle[-1] > bb_middle[-5] else "down"
        
        logger.info(f"布林线分析: 价格={current_price:.2f}, 上轨={bb_upper[-1]:.2f}, "
                   f"中轨={bb_middle[-1]:.2f}, 下轨={bb_lower[-1]:.2f}")
        logger.info(f"带宽={bb_width:.4f}, 平均={avg_bb_width:.4f}, "
                   f"状态={'收窄' if is_squeeze else '扩张' if is_expansion else '正常'}")
        logger.info(f"RSI={rsi[-1]:.2f}, EMA200={ema_200[-1]:.2f}, 中轨趋势={middle_trend}")
        
        # 策略逻辑：震荡模式（均值回归）
        if not is_expansion:
            # 做多条件：触及下轨 + RSI超卖
            if current_price <= bb_lower[-1] * 1.002 and rsi[-1] < 40:
                return self._create_long_signal_mean_reversion(
                    current_price, bb_middle[-1], bb_lower[-1], atr_val, 
                    rsi[-1], "震荡做多"
                )
            
            # 做空条件：触及上轨 + RSI超买
            if self.allow_short and current_price >= bb_upper[-1] * 0.998 and rsi[-1] > 60:
                return self._create_short_signal_mean_reversion(
                    current_price, bb_middle[-1], bb_upper[-1], atr_val,
                    rsi[-1], "震荡做空"
                )
        
        # 策略逻辑：趋势模式（突破跟随）
        if is_expansion or bb_width > avg_bb_width * 1.1:
            # 做多条件：突破上轨 + 中轨上行 + 价格在EMA200之上
            if (current_price > bb_upper[-1] and 
                middle_trend == "up" and 
                current_price > ema_200[-1] and
                rsi[-1] < 70):
                
                return self._create_long_signal_trend(
                    current_price, bb_middle[-1], bb_lower[-1], atr_val,
                    rsi[-1], "趋势做多"
                )
            
            # 做空条件：跌破下轨 + 中轨下行 + 价格在EMA200之下
            if (self.allow_short and
                current_price < bb_lower[-1] and
                middle_trend == "down" and
                current_price < ema_200[-1] and
                rsi[-1] > 30):
                
                return self._create_short_signal_trend(
                    current_price, bb_middle[-1], bb_upper[-1], atr_val,
                    rsi[-1], "趋势做空"
                )
        
        return {"signal": "hold", "reason": "无交易信号"}
    
    def _create_long_signal_mean_reversion(
        self, price: float, bb_middle: float, bb_lower: float,
        atr: float, rsi: float, signal_type: str
    ) -> Dict[str, Any]:
        """创建均值回归做多信号"""
        # 止损：下轨下方2倍ATR
        stop_loss = bb_lower - atr * 2.0
        
        # 止盈：中轨
        take_profit = bb_middle
        
        # 确保止损不要太近
        if price - stop_loss < price * 0.01:
            stop_loss = price * 0.99
        
        # 计算仓位
        risk_reward_ratio = (take_profit - price) / (price - stop_loss)
        amount = self._calculate_position_size(price, stop_loss)
        
        logger.info(f"✓ {signal_type}信号: 价格={price:.2f}, 下轨={bb_lower:.2f}, "
                   f"中轨={bb_middle:.2f}, RSI={rsi:.2f}")
        logger.info(f"  止损={stop_loss:.2f}, 止盈={take_profit:.2f}, 盈亏比={risk_reward_ratio:.2f}")
        
        return {
            "signal": "buy",
            "price": price,
            "amount": amount,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "leverage": self.leverage,
            "signal_type": signal_type,
            "reason": f"{signal_type} 目标中轨{bb_middle:.2f}"
        }
    
    def _create_short_signal_mean_reversion(
        self, price: float, bb_middle: float, bb_upper: float,
        atr: float, rsi: float, signal_type: str
    ) -> Dict[str, Any]:
        """创建均值回归做空信号"""
        # 止损：上轨上方2倍ATR
        stop_loss = bb_upper + atr * 2.0
        
        # 止盈：中轨
        take_profit = bb_middle
        
        # 确保止损不要太近
        if stop_loss - price < price * 0.01:
            stop_loss = price * 1.01
        
        # 计算仓位
        risk_reward_ratio = (price - take_profit) / (stop_loss - price)
        amount = self._calculate_position_size(price, stop_loss)
        
        logger.info(f"✓ {signal_type}信号: 价格={price:.2f}, 上轨={bb_upper:.2f}, "
                   f"中轨={bb_middle:.2f}, RSI={rsi:.2f}")
        logger.info(f"  止损={stop_loss:.2f}, 止盈={take_profit:.2f}, 盈亏比={risk_reward_ratio:.2f}")
        
        return {
            "signal": "sell",
            "price": price,
            "amount": amount,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "leverage": self.leverage,
            "signal_type": signal_type,
            "reason": f"{signal_type} 目标中轨{bb_middle:.2f}"
        }
    
    def _create_long_signal_trend(
        self, price: float, bb_middle: float, bb_lower: float,
        atr: float, rsi: float, signal_type: str
    ) -> Dict[str, Any]:
        """创建趋势做多信号"""
        # 止损：中轨或2倍ATR
        stop_loss = min(bb_middle, price - atr * 2.0)
        
        # 止盈：3倍风险回报
        risk_amount = price - stop_loss
        take_profit = price + risk_amount * 3.0
        
        amount = self._calculate_position_size(price, stop_loss)
        
        logger.info(f"✓ {signal_type}信号: 价格={price:.2f}, 中轨={bb_middle:.2f}, RSI={rsi:.2f}")
        logger.info(f"  止损={stop_loss:.2f}, 止盈={take_profit:.2f}")
        
        return {
            "signal": "buy",
            "price": price,
            "amount": amount,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "leverage": self.leverage,
            "signal_type": signal_type,
            "reason": f"{signal_type} 突破上轨追多"
        }
    
    def _create_short_signal_trend(
        self, price: float, bb_middle: float, bb_upper: float,
        atr: float, rsi: float, signal_type: str
    ) -> Dict[str, Any]:
        """创建趋势做空信号"""
        # 止损：中轨或2倍ATR
        stop_loss = max(bb_middle, price + atr * 2.0)
        
        # 止盈：3倍风险回报
        risk_amount = stop_loss - price
        take_profit = price - risk_amount * 3.0
        
        amount = self._calculate_position_size(price, stop_loss)
        
        logger.info(f"✓ {signal_type}信号: 价格={price:.2f}, 中轨={bb_middle:.2f}, RSI={rsi:.2f}")
        logger.info(f"  止损={stop_loss:.2f}, 止盈={take_profit:.2f}")
        
        return {
            "signal": "sell",
            "price": price,
            "amount": amount,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "leverage": self.leverage,
            "signal_type": signal_type,
            "reason": f"{signal_type} 跌破下轨追空"
        }
    
    def _check_exit_conditions(self, klines: List[Dict]) -> Optional[Dict[str, Any]]:
        """检查出场条件"""
        if not self.current_position:
            return None
        
        position = self.current_position
        current_price = klines[-1]["close"]
        entry_price = position["entry_price"]
        stop_loss = position["stop_loss"]
        take_profit = position["take_profit"]
        side = position["side"]
        
        # 计算布林线
        closes = np.array([k["close"] for k in klines])
        bb_middle, bb_upper, bb_lower = self._calculate_bollinger_bands(closes)
        
        # 计算盈亏
        if side == "long":
            pnl_ratio = (current_price - entry_price) / entry_price
            
            # 固定止损
            if current_price <= stop_loss:
                logger.info(f"多单止损: 价格={current_price:.2f}, 止损={stop_loss:.2f}")
                return self._create_exit_signal("stop_loss", current_price, pnl_ratio)
            
            # 固定止盈
            if current_price >= take_profit:
                logger.info(f"多单止盈: 价格={current_price:.2f}, 止盈={take_profit:.2f}")
                return self._create_exit_signal("take_profit", current_price, pnl_ratio)
            
            # 回到中轨（均值回归模式）
            if "震荡" in position.get("signal_type", ""):
                if current_price >= bb_middle[-1] * 0.998:
                    logger.info(f"多单回到中轨: 价格={current_price:.2f}, 中轨={bb_middle[-1]:.2f}")
                    return self._create_exit_signal("target_reached", current_price, pnl_ratio)
            
            # 跌破中轨（趋势反转）
            if current_price < bb_middle[-1] and pnl_ratio < 0:
                logger.info(f"多单跌破中轨: 价格={current_price:.2f}, 中轨={bb_middle[-1]:.2f}")
                return self._create_exit_signal("middle_break", current_price, pnl_ratio)
        
        else:  # short
            pnl_ratio = (entry_price - current_price) / entry_price
            
            # 固定止损
            if current_price >= stop_loss:
                logger.info(f"空单止损: 价格={current_price:.2f}, 止损={stop_loss:.2f}")
                return self._create_exit_signal("stop_loss", current_price, pnl_ratio)
            
            # 固定止盈
            if current_price <= take_profit:
                logger.info(f"空单止盈: 价格={current_price:.2f}, 止盈={take_profit:.2f}")
                return self._create_exit_signal("take_profit", current_price, pnl_ratio)
            
            # 回到中轨（均值回归模式）
            if "震荡" in position.get("signal_type", ""):
                if current_price <= bb_middle[-1] * 1.002:
                    logger.info(f"空单回到中轨: 价格={current_price:.2f}, 中轨={bb_middle[-1]:.2f}")
                    return self._create_exit_signal("target_reached", current_price, pnl_ratio)
            
            # 突破中轨（趋势反转）
            if current_price > bb_middle[-1] and pnl_ratio < 0:
                logger.info(f"空单突破中轨: 价格={current_price:.2f}, 中轨={bb_middle[-1]:.2f}")
                return self._create_exit_signal("middle_break", current_price, pnl_ratio)
        
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
    
    def _calculate_position_size(self, price: float, stop_loss: float) -> float:
        """计算仓位大小"""
        use_leverage_sizing = self.parameters.get("use_leverage_sizing", False)
        
        if use_leverage_sizing:
            # 杠杆模式：固定比例
            position_ratio = self.parameters.get("position_ratio", 0.5)
            position_value = self.capital * self.leverage * position_ratio
            return position_value / price
        else:
            # 风险模式：根据止损距离
            risk_per_trade = self.parameters.get("risk_per_trade", 0.02)
            risk_capital = self.capital * risk_per_trade
            risk_amount = abs(price - stop_loss)
            return risk_capital / risk_amount if risk_amount > 0 else 0
    
    def _calculate_bollinger_bands(self, data: np.ndarray) -> tuple:
        """计算布林线"""
        if len(data) < self.bb_period:
            return np.array([]), np.array([]), np.array([])
        
        # 计算中轨（SMA）
        middle = np.zeros(len(data))
        for i in range(self.bb_period - 1, len(data)):
            middle[i] = np.mean(data[i - self.bb_period + 1:i + 1])
        
        # 计算标准差
        std = np.zeros(len(data))
        for i in range(self.bb_period - 1, len(data)):
            std[i] = np.std(data[i - self.bb_period + 1:i + 1])
        
        # 计算上下轨
        upper = middle + self.bb_std * std
        lower = middle - self.bb_std * std
        
        return middle, upper, lower
    
    def _calculate_ema(self, data: np.ndarray, period: int) -> np.ndarray:
        """计算EMA"""
        if len(data) == 0:
            return np.array([])
        alpha = 2.0 / (period + 1.0)
        ema = np.zeros(len(data), dtype=float)
        ema[0] = float(data[0])
        for i in range(1, len(data)):
            ema[i] = alpha * float(data[i]) + (1.0 - alpha) * ema[i - 1]
        return ema
    
    def _calculate_rsi(self, data: np.ndarray, period: int) -> np.ndarray:
        """计算RSI"""
        if len(data) < period + 1:
            return np.array([50.0] * len(data))
        
        deltas = np.diff(data)
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)
        
        avg_gain = np.zeros(len(data))
        avg_loss = np.zeros(len(data))
        
        avg_gain[period] = np.mean(gains[:period])
        avg_loss[period] = np.mean(losses[:period])
        
        for i in range(period + 1, len(data)):
            avg_gain[i] = (avg_gain[i-1] * (period - 1) + gains[i-1]) / period
            avg_loss[i] = (avg_loss[i-1] * (period - 1) + losses[i-1]) / period
        
        rs = np.where(avg_loss != 0, avg_gain / avg_loss, 0)
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    def _calculate_atr(self, klines: List[Dict], period: int = 14) -> float:
        """计算ATR"""
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
    
    def _check_risk_controls(self) -> bool:
        """检查风控条件"""
        max_daily_loss = self.parameters.get("max_daily_loss", 0.10)
        
        if self.daily_pnl < -self.capital * max_daily_loss:
            logger.warning(f"触发日内亏损限制: {self.daily_pnl:.2f}")
            return False
        
        max_consecutive_losses = self.parameters.get("max_consecutive_losses", 3)
        if self.consecutive_losses >= max_consecutive_losses:
            logger.warning(f"连续亏损{self.consecutive_losses}次，暂停交易")
            return False
        
        return True
    
    def update_position(self, signal: Dict[str, Any]):
        """更新持仓状态"""
        exit_types = ["stop_loss", "take_profit", "target_reached", "middle_break", "force_close"]
        
        # 开仓
        if signal["signal"] == "buy" and signal.get("type") not in exit_types:
            self.current_position = {
                "side": "long",
                "entry_price": signal["price"],
                "amount": signal["amount"],
                "stop_loss": signal.get("stop_loss", signal["price"] * 0.95),
                "take_profit": signal.get("take_profit", signal["price"] * 1.10),
                "entry_time": datetime.now(),
                "signal_type": signal.get("signal_type", "做多")
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
                "signal_type": signal.get("signal_type", "做空")
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
        
        # 更新盈亏
        if "pnl" in signal and signal.get("type") in ["stop_loss", "take_profit", "target_reached", "middle_break"]:
            pnl_amount = signal["pnl"] * signal["price"] * signal.get("amount", 0)
            self.daily_pnl += pnl_amount
            self.total_trades += 1
            
            if signal["pnl"] < 0:
                self.consecutive_losses += 1
            else:
                self.consecutive_losses = 0
    
    def reset_daily_stats(self):
        """重置每日统计"""
        logger.info(f"布林线策略日统计 - 盈亏: {self.daily_pnl:.2f}, 交易: {len(self.daily_trades)}")
        self.daily_trades.clear()
        self.daily_pnl = 0.0
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取策略统计信息"""
        return {
            "total_trades": self.total_trades,
            "daily_pnl": self.daily_pnl,
            "consecutive_losses": self.consecutive_losses,
            "has_position": self.current_position is not None,
            "position_info": self.current_position if self.current_position else None
        }




