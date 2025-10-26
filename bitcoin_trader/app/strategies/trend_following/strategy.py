"""
趋势跟踪策略 - 优雅的趋势市盈利方案

核心思想：
1. 识别强劲趋势（EMA + ADX）
2. 趋势确认后入场
3. 使用ATR动态止损
4. 让利润充分奔跑

适用场景：单边趋势市、突破行情
优势：盈亏比高（3:1以上）、交易次数少、适合手续费环境
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np
import logging

logger = logging.getLogger(__name__)


class TrendFollowingStrategy:
    """趋势跟踪策略"""
    
    def __init__(self, parameters: Dict[str, Any]):
        """
        初始化趋势跟踪策略
        
        Args:
            parameters: 策略参数字典
        """
        
        self.name = "趋势跟踪策略"
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
        if not klines or len(klines) < 200:
            return {"signal": "hold", "reason": "数据不足，需要至少200根K线"}
        
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
        """
        生成入场信号
        
        核心逻辑：
        1. 快速EMA上穿慢速EMA（趋势确认）
        2. 价格在长期EMA之上/之下（趋势过滤）
        3. ADX > 25（趋势强度确认）
        4. 成交量放大（动能确认）
        """
        closes = np.array([k["close"] for k in klines])
        volumes = np.array([k["volume"] for k in klines])
        
        # 计算技术指标
        ema_fast = self._calculate_ema(closes, self.parameters.get("ema_fast", 20))
        ema_slow = self._calculate_ema(closes, self.parameters.get("ema_slow", 50))
        ema_filter = self._calculate_ema(closes, self.parameters.get("ema_filter", 200))
        adx = self._calculate_adx(klines, self.parameters.get("adx_period", 14))
        atr = self._calculate_atr(klines, self.parameters.get("atr_period", 14))
        
        current_price = closes[-1]
        
        # 检查趋势强度
        adx_threshold = self.parameters.get("adx_threshold", 25)
        if adx[-1] < adx_threshold:
            return {"signal": "hold", "reason": f"趋势不够强 ADX={adx[-1]:.1f} < {adx_threshold}"}
        
        # 检查成交量
        if self.parameters.get("volume_confirmation", True):
            avg_volume = np.mean(volumes[-20:])
            volume_multiplier = self.parameters.get("volume_multiplier", 1.2)
            if volumes[-1] < avg_volume * volume_multiplier:
                return {"signal": "hold", "reason": "成交量不足"}
        
        # 做多信号
        long_conditions = {
            "ema_cross": ema_fast[-2] <= ema_slow[-2] and ema_fast[-1] > ema_slow[-1],
            "above_filter": current_price > ema_filter[-1],
            "strong_trend": adx[-1] > adx_threshold,
            "uptrend": ema_fast[-1] > ema_slow[-1]
        }
        
        if all(long_conditions.values()):
            return self._create_long_signal(current_price, atr)
        
        # 做空信号
        short_conditions = {
            "ema_cross": ema_fast[-2] >= ema_slow[-2] and ema_fast[-1] < ema_slow[-1],
            "below_filter": current_price < ema_filter[-1],
            "strong_trend": adx[-1] > adx_threshold,
            "downtrend": ema_fast[-1] < ema_slow[-1]
        }
        
        if all(short_conditions.values()):
            return self._create_short_signal(current_price, atr)
        
        return {"signal": "hold", "reason": "未满足趋势跟踪入场条件"}
    
    def _create_long_signal(self, price: float, atr: float) -> Dict[str, Any]:
        """创建做多信号"""
        # 计算仓位大小
        capital = self.parameters.get("total_capital", 300.0)
        position_percent = self.parameters.get("position_size_percent", 0.30)
        position_value = capital * position_percent
        leverage = self.parameters.get("leverage", 2.0)
        amount = (position_value * leverage) / price
        
        # 计算止损止盈（基于ATR）
        stop_loss_atr = self.parameters.get("stop_loss_atr", 2.0)
        profit_target_atr = self.parameters.get("profit_target_atr", 4.0)
        
        stop_loss = price - (atr * stop_loss_atr)
        take_profit = price + (atr * profit_target_atr)
        
        return {
            "signal": "buy",
            "price": price,
            "amount": amount,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "leverage": leverage,
            "atr": atr,
            "reason": f"趋势做多 止损={stop_loss:.2f} 止盈={take_profit:.2f}"
        }
    
    def _create_short_signal(self, price: float, atr: float) -> Dict[str, Any]:
        """创建做空信号"""
        capital = self.parameters.get("total_capital", 300.0)
        position_percent = self.parameters.get("position_size_percent", 0.30)
        position_value = capital * position_percent
        leverage = self.parameters.get("leverage", 2.0)
        amount = (position_value * leverage) / price
        
        stop_loss_atr = self.parameters.get("stop_loss_atr", 2.0)
        profit_target_atr = self.parameters.get("profit_target_atr", 4.0)
        
        stop_loss = price + (atr * stop_loss_atr)
        take_profit = price - (atr * profit_target_atr)
        
        return {
            "signal": "sell",
            "price": price,
            "amount": amount,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "leverage": leverage,
            "atr": atr,
            "reason": f"趋势做空 止损={stop_loss:.2f} 止盈={take_profit:.2f}"
        }
    
    def _check_exit_conditions(self, klines: List[Dict]) -> Optional[Dict[str, Any]]:
        """
        检查出场条件
        
        出场逻辑：
        1. 触及止损/止盈
        2. EMA反向交叉（趋势反转）
        3. 追踪止损（保护利润）
        4. 超过最大持仓时间
        """
        if not self.current_position:
            return None
        
        position = self.current_position
        current_price = klines[-1]["close"]
        side = position["side"]
        entry_price = position["entry_price"]
        stop_loss = position["stop_loss"]
        take_profit = position["take_profit"]
        
        # 计算当前盈亏
        if side == "long":
            pnl_ratio = (current_price - entry_price) / entry_price
            
            # 检查止损
            if current_price <= stop_loss:
                return self._create_exit_signal("stop_loss", current_price, pnl_ratio)
            
            # 检查止盈
            if current_price >= take_profit:
                return self._create_exit_signal("take_profit", current_price, pnl_ratio)
        
        else:  # short
            pnl_ratio = (entry_price - current_price) / entry_price
            
            if current_price >= stop_loss:
                return self._create_exit_signal("stop_loss", current_price, pnl_ratio)
            
            if current_price <= take_profit:
                return self._create_exit_signal("take_profit", current_price, pnl_ratio)
        
        # 检查EMA反转
        if self.parameters.get("use_ema_exit", True):
            closes = np.array([k["close"] for k in klines])
            ema_fast = self._calculate_ema(closes, self.parameters.get("ema_fast", 20))
            ema_slow = self._calculate_ema(closes, self.parameters.get("ema_slow", 50))
            
            if side == "long" and ema_fast[-1] < ema_slow[-1]:
                return self._create_exit_signal("trend_reversal", current_price, pnl_ratio)
            
            if side == "short" and ema_fast[-1] > ema_slow[-1]:
                return self._create_exit_signal("trend_reversal", current_price, pnl_ratio)
        
        # 检查追踪止损（盈利时）
        if pnl_ratio > 0.01:  # 盈利超过1%
            atr = self._calculate_atr(klines[-50:], self.parameters.get("atr_period", 14))
            trailing_atr = self.parameters.get("trailing_stop_atr", 3.0)
            
            if side == "long":
                trailing_stop = current_price - (atr * trailing_atr)
                if trailing_stop > position["stop_loss"]:
                    position["stop_loss"] = trailing_stop
                    logger.info(f"追踪止损更新: {trailing_stop:.2f}")
            else:
                trailing_stop = current_price + (atr * trailing_atr)
                if trailing_stop < position["stop_loss"]:
                    position["stop_loss"] = trailing_stop
                    logger.info(f"追踪止损更新: {trailing_stop:.2f}")
        
        # 检查最大持仓时间
        holding_time = (datetime.now() - position["entry_time"]).days
        max_days = self.parameters.get("max_holding_days", 30)
        if holding_time >= max_days:
            return self._create_exit_signal("timeout", current_price, pnl_ratio)
        
        return None
    
    def _create_exit_signal(self, exit_type: str, price: float, pnl_ratio: float) -> Dict[str, Any]:
        """创建出场信号"""
        return {
            "signal": "sell" if self.current_position["side"] == "long" else "buy",
            "price": price,
            "amount": self.current_position["amount"],
            "type": exit_type,
            "pnl": pnl_ratio,
            "reason": f"趋势出场 {exit_type} 盈亏={pnl_ratio:+.2%}"
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
        max_consecutive_losses = self.parameters.get("max_consecutive_losses", 2)
        if self.consecutive_losses >= max_consecutive_losses:
            logger.warning(f"连续亏损{self.consecutive_losses}次，暂停交易")
            return False
        
        return True
    
    def _calculate_ema(self, data: np.ndarray, period: int) -> np.ndarray:
        """计算指数移动平均线"""
        return np.array([np.mean(data[max(0, i-period+1):i+1]) for i in range(len(data))])
    
    def _calculate_atr(self, klines: List[Dict], period: int = 14) -> float:
        """计算ATR"""
        if len(klines) < period + 1:
            return 0.0
        
        true_ranges = []
        for i in range(1, len(klines)):
            high = klines[i]["high"]
            low = klines[i]["low"]
            prev_close = klines[i-1]["close"]
            
            tr = max(high - low, abs(high - prev_close), abs(low - prev_close))
            true_ranges.append(tr)
        
        return np.mean(true_ranges[-period:]) if true_ranges else 0.0
    
    def _calculate_adx(self, klines: List[Dict], period: int = 14) -> np.ndarray:
        """
        计算ADX（平均趋向指数）
        
        ADX用于衡量趋势强度，不区分方向
        ADX > 25: 强趋势
        ADX < 20: 弱趋势或震荡
        """
        if len(klines) < period * 2:
            return np.zeros(len(klines))
        
        highs = np.array([k["high"] for k in klines])
        lows = np.array([k["low"] for k in klines])
        closes = np.array([k["close"] for k in klines])
        
        # 计算+DM和-DM
        plus_dm = np.maximum(highs[1:] - highs[:-1], 0)
        minus_dm = np.maximum(lows[:-1] - lows[1:], 0)
        
        # 计算TR
        tr = np.maximum(
            highs[1:] - lows[1:],
            np.maximum(
                np.abs(highs[1:] - closes[:-1]),
                np.abs(lows[1:] - closes[:-1])
            )
        )
        
        # 平滑处理
        atr = np.zeros(len(tr))
        plus_di = np.zeros(len(tr))
        minus_di = np.zeros(len(tr))
        
        for i in range(period - 1, len(tr)):
            atr[i] = np.mean(tr[max(0, i-period+1):i+1])
            plus_di[i] = 100 * np.mean(plus_dm[max(0, i-period+1):i+1]) / atr[i] if atr[i] > 0 else 0
            minus_di[i] = 100 * np.mean(minus_dm[max(0, i-period+1):i+1]) / atr[i] if atr[i] > 0 else 0
        
        # 计算DX和ADX
        dx = 100 * np.abs(plus_di - minus_di) / (plus_di + minus_di + 1e-10)
        adx = np.zeros(len(dx) + 1)
        
        for i in range(period - 1, len(dx)):
            adx[i+1] = np.mean(dx[max(0, i-period+1):i+1])
        
        return adx
    
    def update_position(self, signal: Dict[str, Any]):
        """更新持仓状态"""
        if signal["signal"] in ["buy", "sell"] and signal.get("type") not in ["stop_loss", "take_profit", "trend_reversal", "timeout"]:
            # 开仓
            self.current_position = {
                "side": "long" if signal["signal"] == "buy" else "short",
                "entry_price": signal["price"],
                "amount": signal["amount"],
                "stop_loss": signal["stop_loss"],
                "take_profit": signal["take_profit"],
                "entry_time": datetime.now()
            }
            logger.info(f"✓ 趋势{self.current_position['side']}开仓: {signal['price']:.2f}")
        
        elif signal.get("type") in ["stop_loss", "take_profit", "trend_reversal", "timeout"]:
            # 平仓
            if self.current_position:
                logger.info(f"✓ 趋势平仓: {signal.get('type')}, PNL={signal.get('pnl', 0):.2%}")
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
        if "pnl" in signal and signal.get("type") in ["stop_loss", "take_profit", "trend_reversal", "timeout"]:
            pnl_amount = signal["pnl"] * signal["price"] * signal.get("amount", 0)
            self.daily_pnl += pnl_amount
            self.total_trades += 1
            
            if signal["pnl"] < 0:
                self.consecutive_losses += 1
            else:
                self.consecutive_losses = 0
    
    def reset_daily_stats(self):
        """重置每日统计"""
        logger.info(f"趋势策略日统计 - 盈亏: {self.daily_pnl:.2f}, 交易: {len(self.daily_trades)}")
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
