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
        self.pending_entry: Optional[Dict[str, Any]] = None
        
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
        
        # 处理待执行的下一根开盘入场
        if self.pending_entry:
            side = self.pending_entry["side"]
            entry_ema = self.pending_entry.get("entry_ema", "ema21")
            price = klines[-1]["open"]
            atr_val = self._calculate_atr(klines, int(self.parameters.get("atr_period", 14)))
            signal = self._create_long_signal(price, atr_val, entry_ema) if side == "long" else self._create_short_signal(price, atr_val, entry_ema)
            signal["reason"] = (signal.get("reason", "") + " | 下一根开盘成交").strip()
            self.pending_entry = None  # 清空待执行
            return signal
        
        # 无持仓，寻找入场机会
        return self._generate_entry_signal(klines)
    
    def _generate_entry_signal(self, klines: List[Dict]) -> Dict[str, Any]:
        """
        生成入场信号 - 多均线回踩策略
        
        核心逻辑：
        1. 使用EMA8, EMA21, EMA55, EMA144多均线系统
        2. 多头趋势：EMA8 > EMA21 > EMA55 > EMA144
        3. 入场时机：价格回踩EMA21或EMA55，出现反转K线
        4. 反转K线：前一根阴线，当前阳线，且收盘价高于前一根K线最高价
        """
        closes = np.array([k["close"] for k in klines])
        highs = np.array([k["high"] for k in klines])
        lows = np.array([k["low"] for k in klines])
        opens = np.array([k["open"] for k in klines])
        
        # 计算多条EMA
        ema8 = self._calculate_ema(closes, 8)
        ema21 = self._calculate_ema(closes, 21)
        ema55 = self._calculate_ema(closes, 55)
        ema144 = self._calculate_ema(closes, 144)
        atr_val = self._calculate_atr(klines, int(self.parameters.get("atr_period", 14)))
        
        # 可选ADX过滤
        use_adx_filter = bool(self.parameters.get("use_adx_filter", False))
        if use_adx_filter:
            adx_arr = self._calculate_adx(klines, int(self.parameters.get("adx_period", 14)))
            adx_min = float(self.parameters.get("adx_min", 25))
            if len(adx_arr) > 0 and adx_arr[-1] < adx_min:
                return {"signal": "hold", "reason": f"趋势强度不足 ADX={adx_arr[-1]:.1f} < {adx_min}"}
        
        current_price = closes[-1]
        current_open = opens[-1]
        current_high = highs[-1]
        current_low = lows[-1]
        prev_close = closes[-2]
        prev_open = opens[-2]
        prev_high = highs[-2]
        
        # 判断当前K线是否为反转阳线
        is_bullish_reversal = (
            prev_close < prev_open and  # 前一根是阴线
            current_price > current_open and  # 当前是阳线
            current_price > prev_high  # 当前收盘突破前高
        )
        
        # 判断当前K线是否为反转阴线
        is_bearish_reversal = (
            prev_close > prev_open and  # 前一根是阳线
            current_price < current_open and  # 当前是阴线
            current_price < lows[-2]  # 当前收盘跌破前低
        )
        
        # 多头趋势判断：完美均线排列
        is_uptrend = (
            ema8[-1] > ema21[-1] and
            ema21[-1] > ema55[-1] and
            ema55[-1] > ema144[-1]
        )
        
        # 空头趋势判断：完美均线排列
        is_downtrend = (
            ema8[-1] < ema21[-1] and
            ema21[-1] < ema55[-1] and
            ema55[-1] < ema144[-1]
        )
        
        # 做多信号：多头趋势 + 回踩EMA21或EMA55 + 反转阳线
        if is_uptrend and is_bullish_reversal:
            # ATR自适应触线判定
            touch_k = float(self.parameters.get("touch_atr_k", 0.25))
            thr = touch_k * atr_val
            
            # 检查回踩EMA21
            if abs(current_low - ema21[-1]) <= thr or current_low < ema21[-1] < prev_high:
                logger.info(f"✓ 回踩EMA21反转: 价格={current_price:.2f}, EMA21={ema21[-1]:.2f}")
                if bool(self.parameters.get("enter_on_next_open", True)):
                    self.pending_entry = {"side": "long", "entry_ema": "ema21"}
                    return {"signal": "hold", "reason": "回踩EMA21确认，已排队下一根开盘入场"}
                return self._create_long_signal(current_price, atr_val, "ema21")
            
            # 检查是否回踩EMA55
            if abs(current_low - ema55[-1]) <= thr or current_low < ema55[-1] < prev_high:
                logger.info(f"✓ 回踩EMA55反转: 价格={current_price:.2f}, EMA55={ema55[-1]:.2f}")
                if bool(self.parameters.get("enter_on_next_open", True)):
                    self.pending_entry = {"side": "long", "entry_ema": "ema55"}
                    return {"signal": "hold", "reason": "回踩EMA55确认，已排队下一根开盘入场"}
                return self._create_long_signal(current_price, atr_val, "ema55")
        
        # 做空信号：空头趋势 + 反弹至EMA21或EMA55 + 反转阴线
        if is_downtrend and is_bearish_reversal:
            # ATR自适应触线判定
            touch_k = float(self.parameters.get("touch_atr_k", 0.25))
            thr = touch_k * atr_val
            
            # 检查反弹至EMA21
            if abs(current_high - ema21[-1]) <= thr or current_high > ema21[-1] > lows[-2]:
                logger.info(f"✓ 反弹EMA21反转: 价格={current_price:.2f}, EMA21={ema21[-1]:.2f}")
                if bool(self.parameters.get("enter_on_next_open", True)):
                    self.pending_entry = {"side": "short", "entry_ema": "ema21"}
                    return {"signal": "hold", "reason": "反弹EMA21确认，已排队下一根开盘做空"}
                return self._create_short_signal(current_price, atr_val, "ema21")
            
            # 检查是否反弹至EMA55
            if abs(current_high - ema55[-1]) <= thr or current_high > ema55[-1] > lows[-2]:
                logger.info(f"✓ 反弹EMA55反转: 价格={current_price:.2f}, EMA55={ema55[-1]:.2f}")
                if bool(self.parameters.get("enter_on_next_open", True)):
                    self.pending_entry = {"side": "short", "entry_ema": "ema55"}
                    return {"signal": "hold", "reason": "反弹EMA55确认，已排队下一根开盘做空"}
                return self._create_short_signal(current_price, atr_val, "ema55")
        
        # 记录等待原因
        if is_uptrend:
            return {"signal": "hold", "reason": f"多头趋势，等待回踩EMA21({ema21[-1]:.2f})或EMA55({ema55[-1]:.2f})"}
        elif is_downtrend:
            return {"signal": "hold", "reason": f"空头趋势，等待反弹至EMA21({ema21[-1]:.2f})或EMA55({ema55[-1]:.2f})"}
        
        return {"signal": "hold", "reason": "趋势不明确，等待均线排列"}
    
    def _create_long_signal(self, price: float, atr: float, entry_ema: str = "ema21") -> Dict[str, Any]:
        """创建做多信号 - 风险等额仓位"""
        capital = float(self.parameters.get("total_capital", 300.0))
        leverage = float(self.parameters.get("leverage", 2.0))
        risk_per_trade = float(self.parameters.get("risk_per_trade", 0.02))
        
        # 根据入场均线设置止损倍数
        if entry_ema == "ema8":
            stop_mult = 1.5  # EMA8入场，止损最紧
        elif entry_ema == "ema21":
            stop_mult = 2.0
        elif entry_ema == "ema55":
            stop_mult = 3.0
        else:  # ema144
            stop_mult = 4.0  # EMA144入场，止损最宽
        
        stop_distance = max(atr * stop_mult, price * 0.001)
        risk_amount = capital * risk_per_trade
        amount = risk_amount / stop_distance
        
        # 初始止损
        stop_loss = price - (atr * stop_mult)
        
        # 不设固定止盈，使用移动止盈
        take_profit = price + (atr * 6.0)  # 初始目标
        
        return {
            "signal": "buy",
            "price": price,
            "amount": amount,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "leverage": leverage,
            "atr": atr,
            "entry_ema": entry_ema,  # 记录从哪个均线入场
            "reason": f"回踩{entry_ema.upper()}做多 止损={stop_loss:.2f}"
        }
    
    def _create_short_signal(self, price: float, atr: float, entry_ema: str = "ema21") -> Dict[str, Any]:
        """创建做空信号 - 风险等额仓位"""
        capital = float(self.parameters.get("total_capital", 300.0))
        leverage = float(self.parameters.get("leverage", 2.0))
        risk_per_trade = float(self.parameters.get("risk_per_trade", 0.02))
        
        # 根据入场均线设置止损倍数
        if entry_ema == "ema8":
            stop_mult = 1.5
        elif entry_ema == "ema21":
            stop_mult = 2.0
        elif entry_ema == "ema55":
            stop_mult = 3.0
        else:  # ema144
            stop_mult = 4.0
        
        stop_distance = max(atr * stop_mult, price * 0.001)
        risk_amount = capital * risk_per_trade
        amount = risk_amount / stop_distance
        
        # 初始止损
        stop_loss = price + (atr * stop_mult)
        
        # 不设固定止盈，使用移动止盈
        take_profit = price - (atr * 6.0)
        
        return {
            "signal": "sell",
            "price": price,
            "amount": amount,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "leverage": leverage,
            "atr": atr,
            "entry_ema": entry_ema,
            "reason": f"反弹{entry_ema.upper()}做空 止损={stop_loss:.2f}"
        }
    
    def _check_exit_conditions(self, klines: List[Dict]) -> Optional[Dict[str, Any]]:
        """
        检查出场条件 - 趋势不破不止损
        
        出场逻辑：
        1. EMA21入场：跌破EMA8下方2ATR止损
        2. EMA55入场：跌破EMA21止损
        3. 移动止盈：盈利后跟随最高点设置止损
        4. 趋势反转：均线排列反转
        """
        if not self.current_position:
            return None
        
        position = self.current_position
        current_price = klines[-1]["close"]
        side = position["side"]
        entry_price = position["entry_price"]
        entry_ema = position.get("entry_ema", "ema21")
        
        # 计算EMA
        closes = np.array([k["close"] for k in klines])
        ema8 = self._calculate_ema(closes, 8)
        ema21 = self._calculate_ema(closes, 21)
        atr_period = int(self.parameters.get("atr_period", 14))
        atr_last = self._calculate_atr(klines, atr_period)
        
        # 计算盈亏比例
        if side == "long":
            pnl_ratio = (current_price - entry_price) / entry_price
            
            # 根据入场均线设置止损
            if entry_ema == "ema21":
                # EMA21入场：跌破EMA8下方2ATR止损
                stop_loss_line = ema8[-1] - (atr_last * 2.0)
                if current_price < stop_loss_line:
                    logger.info(f"跌破EMA8-2ATR止损: 价格={current_price:.2f}, 止损线={stop_loss_line:.2f}")
                    return self._create_exit_signal("stop_loss", current_price, pnl_ratio)
            else:  # ema55
                # EMA55入场：跌破EMA21止损
                if current_price < ema21[-1]:
                    logger.info(f"跌破EMA21止损: 价格={current_price:.2f}, EMA21={ema21[-1]:.2f}")
                    return self._create_exit_signal("stop_loss", current_price, pnl_ratio)
            
            # 移动止盈：盈利超过2%后，设置追踪止损
            if pnl_ratio > 0.02:
                if bool(self.parameters.get("use_chandelier_exit", True)):
                    ch_period = int(self.parameters.get("chandelier_period", 22))
                    ch_mult = float(self.parameters.get("chandelier_atr_mult", 3.0))
                    highs = np.array([k["high"] for k in klines])
                    hh = np.max(highs[-ch_period:]) if len(highs) >= ch_period else np.max(highs)
                    trailing_stop = hh - ch_mult * atr_last
                else:
                    trailing_stop = ema8[-1]
                if current_price < trailing_stop:
                    logger.info(f"移动止盈触发: 价格={current_price:.2f}, 止盈线={trailing_stop:.2f}, 盈利={pnl_ratio:.2%}")
                    return self._create_exit_signal("trailing_stop", current_price, pnl_ratio)
            
            # 趋势反转：均线排列反转
            if ema8[-1] < ema21[-1]:
                logger.info("趋势反转: EMA8跌破EMA21")
                return self._create_exit_signal("trend_reversal", current_price, pnl_ratio)
        
        else:  # short
            pnl_ratio = (entry_price - current_price) / entry_price
            
            # 根据入场均线设置止损
            if entry_ema == "ema21":
                # EMA21入场：突破EMA8上方2ATR止损
                stop_loss_line = ema8[-1] + (atr_last * 2.0)
                if current_price > stop_loss_line:
                    logger.info(f"突破EMA8+2ATR止损: 价格={current_price:.2f}, 止损线={stop_loss_line:.2f}")
                    return self._create_exit_signal("stop_loss", current_price, pnl_ratio)
            else:  # ema55
                # EMA55入场：突破EMA21止损
                if current_price > ema21[-1]:
                    logger.info(f"突破EMA21止损: 价格={current_price:.2f}, EMA21={ema21[-1]:.2f}")
                    return self._create_exit_signal("stop_loss", current_price, pnl_ratio)
            
            # 移动止盈：盈利超过2%后，设置追踪止损
            if pnl_ratio > 0.02:
                if bool(self.parameters.get("use_chandelier_exit", True)):
                    ch_period = int(self.parameters.get("chandelier_period", 22))
                    ch_mult = float(self.parameters.get("chandelier_atr_mult", 3.0))
                    lows = np.array([k["low"] for k in klines])
                    ll = np.min(lows[-ch_period:]) if len(lows) >= ch_period else np.min(lows)
                    trailing_stop = ll + ch_mult * atr_last
                else:
                    trailing_stop = ema8[-1]
                if current_price > trailing_stop:
                    logger.info(f"移动止盈触发: 价格={current_price:.2f}, 止盈线={trailing_stop:.2f}, 盈利={pnl_ratio:.2%}")
                    return self._create_exit_signal("trailing_stop", current_price, pnl_ratio)
            
            # 趋势反转：均线排列反转
            if ema8[-1] > ema21[-1]:
                logger.info("趋势反转: EMA8突破EMA21")
                return self._create_exit_signal("trend_reversal", current_price, pnl_ratio)
        
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
        """计算真实EMA（指数加权移动平均）"""
        if len(data) == 0:
            return np.array([])
        alpha = 2.0 / (period + 1.0)
        ema = np.zeros(len(data), dtype=float)
        ema[0] = float(data[0])
        for i in range(1, len(data)):
            ema[i] = alpha * float(data[i]) + (1.0 - alpha) * ema[i - 1]
        return ema
    
    def _calculate_rsi(self, closes: np.ndarray, period: int = 14) -> np.ndarray:
        """计算RSI（Wilder 平滑）"""
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
        """计算ATR（Wilder 平滑），返回最新值"""
        if len(klines) < period + 1:
            return 0.0
        highs = np.array([k["high"] for k in klines], dtype=float)
        lows = np.array([k["low"] for k in klines], dtype=float)
        closes = np.array([k["close"] for k in klines], dtype=float)
        tr = np.maximum(highs[1:] - lows[1:], np.maximum(np.abs(highs[1:] - closes[:-1]), np.abs(lows[1:] - closes[:-1])))
        if len(tr) < period:
            return float(np.mean(tr)) if len(tr) > 0 else 0.0
        atr_prev = float(np.sum(tr[:period]) / period)
        for i in range(period, len(tr)):
            atr_prev = (atr_prev * (period - 1) + tr[i]) / period
        return float(atr_prev)
    
    def _calculate_adx(self, klines: List[Dict], period: int = 14) -> np.ndarray:
        """计算ADX（DMI + Wilder 平滑），返回与klines等长的数组（前段为0）"""
        n = len(klines)
        if n < period + 2:
            return np.zeros(n)
        highs = np.array([k["high"] for k in klines], dtype=float)
        lows = np.array([k["low"] for k in klines], dtype=float)
        closes = np.array([k["close"] for k in klines], dtype=float)
        up_move = highs[1:] - highs[:-1]
        down_move = lows[:-1] - lows[1:]
        plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
        minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)
        tr = np.maximum(highs[1:] - lows[1:], np.maximum(np.abs(highs[1:] - closes[:-1]), np.abs(lows[1:] - closes[:-1])))
        m = len(tr)
        if m < period:
            return np.zeros(n)
        # Wilder 平滑初值
        atr = np.zeros(m)
        pDMs = np.zeros(m)
        mDMs = np.zeros(m)
        atr[period - 1] = np.sum(tr[:period]) / period
        pDMs[period - 1] = np.sum(plus_dm[:period]) / period
        mDMs[period - 1] = np.sum(minus_dm[:period]) / period
        # 递推
        for i in range(period, m):
            atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period
            pDMs[i] = (pDMs[i - 1] * (period - 1) + plus_dm[i]) / period
            mDMs[i] = (mDMs[i - 1] * (period - 1) + minus_dm[i]) / period
        plus_di = np.zeros(m)
        minus_di = np.zeros(m)
        mask = atr > 0
        plus_di[mask] = 100.0 * (pDMs[mask] / atr[mask])
        minus_di[mask] = 100.0 * (mDMs[mask] / atr[mask])
        dx = np.zeros(m)
        denom = plus_di + minus_di
        valid = denom > 0
        dx[valid] = 100.0 * np.abs(plus_di[valid] - minus_di[valid]) / denom[valid]
        adx = np.zeros(m)
        if m >= 2 * period - 1:
            adx[2 * period - 2] = np.mean(dx[period - 1: 2 * period - 1])
            for i in range(2 * period - 1, m):
                adx[i] = (adx[i - 1] * (period - 1) + dx[i]) / period
        # 对齐长度
        out = np.zeros(n)
        out[-m:] = adx
        return out
    
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
                "entry_time": datetime.now(),
                "entry_ema": signal.get("entry_ema", "ema21")
            }
            logger.info(f"✓ 趋势{self.current_position['side']}开仓: {signal['price']:.2f}")
            self.pending_entry = None
        
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
