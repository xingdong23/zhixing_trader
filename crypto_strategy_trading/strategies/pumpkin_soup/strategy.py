"""
南瓜汤 (Pumpkin Soup Modified Indicator, PSMI) 策略
基于顺势回调逻辑的日内交易策略

核心逻辑：
1. 导航（EMA均线）：三条EMA定方向（K线在三条EMA之上做多，之下做空）
2. 油门（EWO波浪）：监测回调（顺势中等待EWO变色，代表主力休息/回调）
3. 发令枪（LX信号）：确认入场（LX3预警/LX4确认信号）

实现细节：
- EMA参数：默认使用 8, 21, 55 (斐波那契数列) 或 8, 13, 48 (参考EMA Crossover)
- EWO (Elliott Wave Oscillator)：5 EMA - 35 EMA 的差值
- LX信号：基于价格动能和反转形态的逻辑模拟
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np
import logging
import hashlib

logger = logging.getLogger(__name__)

class PumpkinSoupStrategy:
    """南瓜汤 (PSMI) 顺势回调策略"""
    
    def __init__(self, parameters: Dict[str, Any]):
        self.name = "南瓜汤(PSMI)策略"
        self.parameters = parameters
        
        # 策略参数
        self.ema_fast_len = int(parameters.get("ema_fast_len", 8))
        self.ema_mid_len = int(parameters.get("ema_mid_len", 21))
        self.ema_slow_len = int(parameters.get("ema_slow_len", 55))
        
        self.ewo_fast_len = int(parameters.get("ewo_fast_len", 5))
        self.ewo_slow_len = int(parameters.get("ewo_slow_len", 35))
        
        # 过滤器参数 (默认关闭)
        self.enable_chop_filter = parameters.get("enable_chop_filter", False)
        self.choppiness_threshold = float(parameters.get("choppiness_threshold", 61.8))
        self.enable_adx_filter = parameters.get("enable_adx_filter", False)
        self.adx_threshold = float(parameters.get("adx_threshold", 20.0))
        
        # 宏观趋势过滤器 (Regime Filter)
        self.enable_regime_filter = parameters.get("enable_regime_filter", False)
        self.regime_ema_len = int(parameters.get("regime_ema_len", 800))
        logger.info(f"Regime Filter Enabled: {self.enable_regime_filter}, Length: {self.regime_ema_len}")
        
        # 多周期共振参数
        self.enable_mtf_filter = parameters.get("enable_mtf_filter", True)
        self.htf_multiplier = int(parameters.get("htf_multiplier", 4))  # 高级别周期倍数，4=4H(相对1H)

        # 波动率目标 (Volatility Targeting)
        self.enable_vol_targeting = parameters.get("enable_vol_targeting", False)
        self.volatility_target = float(parameters.get("volatility_target", 0.40)) # 40% 年化波动率
        self.volatility_window = int(parameters.get("volatility_window", 480)) # 20天 (24*20)
        if self.enable_vol_targeting:
            logger.info(f"Vol Targeting Enabled: Target={self.volatility_target:.2%}, Window={self.volatility_window}")
        
        # 持仓信息
        self.current_position: Optional[Dict] = None
        
        # 统计信息
        self.daily_trades = []
        self.daily_pnl = 0.0
        self.consecutive_losses = 0
        self.total_trades = 0
        
        # 缓存
        self.last_klines_hash = None
        self.cached_indicators = {}
        
    def analyze(self, klines: List[Dict]) -> Dict[str, Any]:
        """分析市场并生成交易信号"""
        try:
            if not klines or len(klines) < 100:
                return {"signal": "hold", "reason": "数据不足"}
            
            current_time = klines[-1].get("open_time", datetime.now().timestamp() * 1000) / 1000
            
            # 1. 风控检查
            if not self._check_risk_controls(current_time):
                return {"signal": "hold", "reason": "触发风控"}
            
            # 2. 持仓管理
            if self.current_position:
                exit_signal = self._check_exit_conditions(klines, current_time)
                if exit_signal:
                    return exit_signal
                return {"signal": "hold", "reason": "持仓中"}
            
            # 3. 寻找入场机会
            return self._generate_entry_signal(klines)
            
        except Exception as e:
            logger.error(f"❌ 策略分析异常: {e}", exc_info=True)
            return {"signal": "hold", "reason": f"分析异常: {str(e)}"}

    def _generate_entry_signal(self, klines: List[Dict]) -> Dict[str, Any]:
        """生成入场信号"""
        closes = np.array([k["close"] for k in klines])
        highs = np.array([k["high"] for k in klines])
        lows = np.array([k["low"] for k in klines])
        
        # 暂存 klines 供 Vol Target 使用
        self.latest_klines = klines
        
        # 计算指标
        ema_fast = self._calculate_ema(closes, self.ema_fast_len)
        ema_mid = self._calculate_ema(closes, self.ema_mid_len)
        ema_slow = self._calculate_ema(closes, self.ema_slow_len)
        ewo = self._calculate_ewo(closes)
        
        current_price = closes[-1]
        current_ema_fast = ema_fast[-1]
        current_ema_mid = ema_mid[-1]
        current_ema_slow = ema_slow[-1]
        
        # 1. 趋势判断 (导航) - 严格条件，只做强趋势
        # 强多头：价格 > 所有EMA，且EMA多头排列
        ema_bull_aligned = (current_ema_fast > current_ema_mid > current_ema_slow)
        is_bull_trend = (current_price > current_ema_fast) and ema_bull_aligned
                       
        # 强空头：价格 < 所有EMA，且EMA空头排列
        ema_bear_aligned = (current_ema_fast < current_ema_mid < current_ema_slow)
        is_bear_trend = (current_price < current_ema_fast) and ema_bear_aligned
        
        if not (is_bull_trend or is_bear_trend):
            return {"signal": "hold", "reason": "趋势不明确"}
        
        # 趋势强度过滤：EMA之间的距离要够大
        ema_spread = abs(current_ema_fast - current_ema_slow) / current_price
        if ema_spread < 0.015:  # EMA距离小于1.5%，趋势不够强
            return {"signal": "hold", "reason": "趋势强度不足"}
        
        # 趋势持续性过滤：检查过去5根K线EMA排列是否一致
        lookback_trend = 5
        trend_consistent = True
        for i in range(-lookback_trend, 0):
            if is_bull_trend:
                if not (ema_fast[i] > ema_mid[i] > ema_slow[i]):
                    trend_consistent = False
                    break
            else:
                if not (ema_fast[i] < ema_mid[i] < ema_slow[i]):
                    trend_consistent = False
                    break
        
        if not trend_consistent:
            return {"signal": "hold", "reason": "趋势不稳定"}
        
        # 多周期共振过滤：只过滤明确反向的高级别趋势
        # 宽松版：mixed时允许交易，只有明确反向时才过滤
        if self.enable_mtf_filter:
            htf_trend = self._get_htf_trend(closes)
            if is_bull_trend and htf_trend == "bear":
                return {"signal": "hold", "reason": "高级别空头趋势，不做多"}
            if is_bear_trend and htf_trend == "bull":
                return {"signal": "hold", "reason": "高级别多头趋势，不做空"}
                
        # 宏观趋势过滤 (Regime Filter)
        regime = self._check_regime_filter(closes, current_price)
        if is_bull_trend and regime == "bear":
            return {"signal": "hold", "reason": "宏观空头趋势 (Regime)，禁止做多"}
        if is_bear_trend and regime == "bull":
            return {"signal": "hold", "reason": "宏观多头趋势 (Regime)，禁止做空"}
        
        # EWO方向过滤：EWO符号必须与趋势一致
        current_ewo = ewo[-1]
        if is_bull_trend and current_ewo < 0:
            return {"signal": "hold", "reason": "EWO为负，多头动能不足"}
        if is_bear_trend and current_ewo > 0:
            return {"signal": "hold", "reason": "EWO为正，空头动能不足"}

        # 1.5 震荡过滤 (CHOP & ADX)
        if self.enable_chop_filter:
            chop = self._calculate_chop(klines)
            if chop > self.choppiness_threshold:
                return {"signal": "hold", "reason": f"市场震荡 (CHOP={chop:.1f})"}
                
        if self.enable_adx_filter:
            adx = self._calculate_adx(klines)
            if adx < self.adx_threshold:
                return {"signal": "hold", "reason": f"趋势太弱 (ADX={adx:.1f})"}
            
        # 2. 回调识别 (油门 - EWO)
        # EWO变色逻辑：
        # 上涨趋势中，EWO变红(数值下降)代表回调
        # 下跌趋势中，EWO变绿(数值上升)代表回调
        current_ewo = ewo[-1]
        prev_ewo = ewo[-2]
        prev2_ewo = ewo[-3]
        
        # 3. 触发信号 (发令枪 - LX模拟)
        # 这里我们模拟LX信号逻辑：
        # LX3/LX4 本质上是动能衰竭后的反转确认
        # 我们用简单的逻辑模拟：回调后，价格重新突破短期均线，且EWO恢复顺势方向
        
        atr = self._calculate_atr(klines)
        
        if is_bull_trend:
            # 多头趋势入场
            is_pullback = prev_ewo < prev2_ewo
            momentum_recovery = current_ewo > prev_ewo
            price_breakout = current_price > highs[-2]
            
            if is_pullback and (momentum_recovery or price_breakout):
                # 止损设在近期低点
                lookback = 10
                recent_low = np.min(lows[-lookback:])
                stop_loss = min(recent_low, current_price - 2 * atr)
                
                # 优化：确保止损距离不要太小，避免噪音止损
                min_stop_dist = current_price * 0.005
                if current_price - stop_loss < min_stop_dist:
                    stop_loss = current_price - min_stop_dist

                return self._create_long_signal(current_price, stop_loss, atr)

        elif is_bear_trend:
            # 空头趋势入场
            is_pullback = prev_ewo > prev2_ewo
            momentum_recovery = current_ewo < prev_ewo
            price_breakout = current_price < lows[-2]
            
            if is_pullback and (momentum_recovery or price_breakout):
                # 止损设在近期高点
                lookback = 10
                recent_high = np.max(highs[-lookback:])
                stop_loss = max(recent_high, current_price + 2 * atr)
                
                # 优化：确保止损距离不要太小，避免噪音止损
                min_stop_dist = current_price * 0.005
                if stop_loss - current_price < min_stop_dist:
                    stop_loss = current_price + min_stop_dist

                return self._create_short_signal(current_price, stop_loss, atr)
                
        return {"signal": "hold", "reason": "无入场信号"}

    def _create_long_signal(self, price: float, stop_loss: float, atr: float) -> Dict[str, Any]:
        # 使用 95% 的资金计算，预留 5% 防止滑点和手续费导致资金不足
        capital = float(self.parameters.get("total_capital", 1000.0)) * 0.95
        leverage = float(self.parameters.get("leverage", 5.0))
        
        risk_amount = price - stop_loss
        if risk_amount <= 0:
            risk_amount = atr
            stop_loss = price - atr
        
        # 基于风险的仓位管理
        # 风险金额 = 总资金 * 单笔风险比例 (例如 5%)
        risk_per_trade = float(self.parameters.get("risk_per_trade", 0.05))
        risk_capital = capital * risk_per_trade
        
        # 仓位大小 = 风险金额 / (入场价 - 止损价)
        # 例如：风险15U，止损距离100U，则仓位 = 0.15 BTC
        position_size = risk_capital / risk_amount
        
        # --- 波动率目标调整 (Vol Targeting) ---
        if self.enable_vol_targeting:
            # 计算当前波动率 (年化)
            # 注意：这里需要传入 klines 历史数据，但 _create_long_signal 签名没带 klines
            # 我们需要修改调用处或者在这里获取。由于 _create_long_signal 是内部调用，
            # 我们可以假设 self.klines 存在，或者修改方法签名。
            # 为了简单，我们暂存最近的 klines 到 self.latest_klines
            if hasattr(self, 'latest_klines') and self.latest_klines:
                current_vol = self._calculate_volatility(self.latest_klines, self.volatility_window)
                if current_vol > 0:
                    # 目标敞口 = 资金 * (目标波动率 / 当前波动率)
                    # 仓位 = 目标敞口 / 价格
                    vol_target_exposure = capital * (self.volatility_target / current_vol)
                    vol_target_size = vol_target_exposure / price
                    
                    if vol_target_size < position_size:
                        logger.info(f"Vol Target 限制仓位: 原 {position_size:.4f} -> 新 {vol_target_size:.4f} (Vol: {current_vol:.2%})")
                        position_size = vol_target_size
        # -------------------------------------

        # 杠杆限制检查
        max_position_value = capital * leverage
        if position_size * price > max_position_value:
            position_size = max_position_value / price
            logger.warning(f"仓位受杠杆限制，已调整: {position_size:.4f}")
        
        # 盈亏比 2:1
        take_profit = price + (risk_amount * 2.0)
        
        return {
            "signal": "buy",
            "price": price,
            "amount": position_size,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "leverage": leverage,
            "reason": "PSMI多头信号"
        }

    def _create_short_signal(self, price: float, stop_loss: float, atr: float) -> Dict[str, Any]:
        # 使用 95% 的资金计算，预留 5% 防止滑点和手续费导致资金不足
        capital = float(self.parameters.get("total_capital", 1000.0)) * 0.95
        leverage = float(self.parameters.get("leverage", 5.0))
        
        risk_amount = stop_loss - price
        if risk_amount <= 0:
            risk_amount = atr
            stop_loss = price + atr
        
        # 基于风险的仓位管理
        risk_per_trade = float(self.parameters.get("risk_per_trade", 0.05))
        risk_capital = capital * risk_per_trade
        
        # 仓位大小 = 风险金额 / (止损价 - 入场价)
        position_size = risk_capital / risk_amount
        
        # --- 波动率目标调整 (Vol Targeting) ---
        if self.enable_vol_targeting:
            if hasattr(self, 'latest_klines') and self.latest_klines:
                current_vol = self._calculate_volatility(self.latest_klines, self.volatility_window)
                if current_vol > 0:
                    vol_target_exposure = capital * (self.volatility_target / current_vol)
                    vol_target_size = vol_target_exposure / price
                    
                    if vol_target_size < position_size:
                        logger.info(f"Vol Target 限制仓位: 原 {position_size:.4f} -> 新 {vol_target_size:.4f} (Vol: {current_vol:.2%})")
                        position_size = vol_target_size
        # -------------------------------------

        # 杠杆限制检查
        max_position_value = capital * leverage
        if position_size * price > max_position_value:
            position_size = max_position_value / price
            logger.warning(f"仓位受杠杆限制，已调整: {position_size:.4f}")
        
        # 盈亏比 2:1
        take_profit = price - (risk_amount * 2.0)
        
        return {
            "signal": "sell",
            "price": price,
            "amount": position_size,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "leverage": leverage,
            "reason": "PSMI空头信号"
        }

    def _check_exit_conditions(self, klines: List[Dict], current_time: float) -> Optional[Dict[str, Any]]:
        if not self.current_position:
            return None
            
        position = self.current_position
        current_price = klines[-1]["close"]
        side = position["side"]
        
        # 1. 止损止盈
        if side == "long":
            if current_price <= position["stop_loss"]:
                return self._create_exit_signal("stop_loss", current_price)
            if current_price >= position["take_profit"]:
                return self._create_exit_signal("take_profit", current_price)
        else:
            if current_price >= position["stop_loss"]:
                return self._create_exit_signal("stop_loss", current_price)
            if current_price <= position["take_profit"]:
                return self._create_exit_signal("take_profit", current_price)
                
        # 2. 动能耗尽出场 (EWO反向)
        # 可选：如果EWO出现明显的背离或反向信号，提前离场
        
        return None

    def _create_exit_signal(self, exit_type: str, price: float) -> Dict[str, Any]:
        side = self.current_position["side"]
        pnl = (price - self.current_position["entry_price"]) / self.current_position["entry_price"]
        if side == "short":
            pnl = -pnl
            
        return {
            "signal": "sell" if side == "long" else "buy",
            "price": price,
            "amount": self.current_position["amount"],
            "type": exit_type,
            "pnl": pnl,
            "reason": f"{exit_type}触发"
        }

    def _get_htf_trend(self, closes: np.ndarray) -> str:
        """
        获取高级别周期的趋势方向
        使用"放大参数法"：在1H上计算放大N倍参数的EMA来近似高级别趋势
        4H EMA8 ≈ 1H EMA32, 4H EMA21 ≈ 1H EMA84, 4H EMA55 ≈ 1H EMA220
        """
        multiplier = self.htf_multiplier
        
        # 放大参数
        htf_slow_len = self.ema_slow_len * multiplier  # 55*4=220
        
        if len(closes) < htf_slow_len + 10:
            return "unknown"
        
        # 在1H数据上计算放大参数的EMA
        htf_ema_fast = self._calculate_ema(closes, self.ema_fast_len * multiplier)
        htf_ema_mid = self._calculate_ema(closes, self.ema_mid_len * multiplier)
        htf_ema_slow = self._calculate_ema(closes, self.ema_slow_len * multiplier)
        
        current_price = closes[-1]
        ema_f = htf_ema_fast[-1]
        ema_m = htf_ema_mid[-1]
        ema_s = htf_ema_slow[-1]
        
        # 带缓冲区的宽松版：价格需要明确高于/低于EMA220一定距离
        # 避免在EMA220附近频繁切换趋势判断
        buffer = 0.02  # 2%缓冲区
        
        if current_price > ema_s * (1 + buffer):
            return "bull"
        elif current_price < ema_s * (1 - buffer):
            return "bear"
        else:
            return "mixed"  # 价格在EMA220±2%范围内，趋势不明确

    def _calculate_ema(self, data: np.ndarray, period: int) -> np.ndarray:
        if len(data) == 0: return np.array([])
        alpha = 2.0 / (period + 1.0)
        ema = np.zeros(len(data))
        ema[0] = data[0]
        for i in range(1, len(data)):
            ema[i] = alpha * data[i] + (1.0 - alpha) * ema[i-1]
        return ema

    def _calculate_ewo(self, data: np.ndarray) -> np.ndarray:
        # EWO = EMA(5) - EMA(35)
        ema_fast = self._calculate_ema(data, self.ewo_fast_len)
        ema_slow = self._calculate_ema(data, self.ewo_slow_len)
        return ema_fast - ema_slow

    def _calculate_atr(self, klines: List[Dict], period: int = 14) -> float:
        if len(klines) < period + 1: return 0.0
        highs = np.array([k["high"] for k in klines])
        lows = np.array([k["low"] for k in klines])
        closes = np.array([k["close"] for k in klines])
        
        tr = np.maximum(highs[1:] - lows[1:], 
                       np.maximum(np.abs(highs[1:] - closes[:-1]), 
                                np.abs(lows[1:] - closes[:-1])))
        return float(np.mean(tr[-period:]))

    def _calculate_chop(self, klines: List[Dict], period: int = 14) -> float:
        """计算 Choppiness Index"""
        if len(klines) < period + 1: return 50.0
        
        highs = np.array([k["high"] for k in klines])
        lows = np.array([k["low"] for k in klines])
        closes = np.array([k["close"] for k in klines])
        
        # True Range
        tr = np.maximum(highs[1:] - lows[1:], 
                       np.maximum(np.abs(highs[1:] - closes[:-1]), 
                                np.abs(lows[1:] - closes[:-1])))
        
        atr_sum = np.sum(tr[-period:])
        
        # Max High - Min Low over period
        max_hi = np.max(highs[-period:])
        min_lo = np.min(lows[-period:])
        range_diff = max_hi - min_lo
        
        if range_diff == 0: return 50.0
        
        # CHOP = 100 * LOG10(SUM(ATR(1), n) / (MaxHi(n) - MinLo(n))) / LOG10(n)
        try:
            chop = 100 * np.log10(atr_sum / range_diff) / np.log10(period)
            return float(chop)
        except:
            return 50.0

    def _calculate_adx(self, klines: List[Dict], period: int = 14) -> float:
        """计算 ADX (使用 Wilder's Smoothing)"""
        if len(klines) < period * 2 + 1: return 0.0
        
        highs = np.array([k["high"] for k in klines])
        lows = np.array([k["low"] for k in klines])
        closes = np.array([k["close"] for k in klines])
        
        # 1. True Range
        tr = np.maximum(highs[1:] - lows[1:], 
                       np.maximum(np.abs(highs[1:] - closes[:-1]), 
                                np.abs(lows[1:] - closes[:-1])))
        
        # 2. Directional Movement
        up_move = highs[1:] - highs[:-1]
        down_move = lows[:-1] - lows[1:]
        
        plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
        minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)
        
        # 3. Wilder's Smoothing Helper
        def wilder_smooth(data, period):
            # 初始化：第一个值用简单平均
            smoothed = np.zeros(len(data))
            smoothed[period-1] = np.mean(data[:period])
            
            # 后续值：Previous * (n-1)/n + Current
            for i in range(period, len(data)):
                smoothed[i] = smoothed[i-1] * (period - 1) / period + data[i]
            return smoothed

        # 平滑 TR, +DM, -DM
        # 注意：我们需要从数据开头开始计算以获得准确的平滑值
        # 这里为了确保数组长度对齐，我们对整个数组进行平滑
        tr_smooth = wilder_smooth(tr, period)
        plus_dm_smooth = wilder_smooth(plus_dm, period)
        minus_dm_smooth = wilder_smooth(minus_dm, period)
        
        # 避免除零
        tr_smooth = np.where(tr_smooth == 0, 1e-10, tr_smooth)
        
        # 4. DI Calculation
        plus_di = 100 * plus_dm_smooth / tr_smooth
        minus_di = 100 * minus_dm_smooth / tr_smooth
        
        # 5. DX Calculation
        dx = 100 * np.abs(plus_di - minus_di) / (plus_di + minus_di + 1e-10)
        
        # 6. ADX Calculation (DX的平滑)
        adx = wilder_smooth(dx, period)
        
        return float(adx[-1])

    def _calculate_volatility(self, klines: List[Dict], window: int) -> float:
        """计算年化波动率 (基于 Close)"""
        if len(klines) < window + 1:
            return 0.0
            
        closes = np.array([k["close"] for k in klines])
        # 计算对数收益率
        returns = np.diff(np.log(closes))
        
        # 取最近 window 个收益率
        recent_returns = returns[-window:]
        
        # 计算标准差
        std_dev = np.std(recent_returns)
        
        # 年化 (假设 1H 数据: sqrt(365 * 24))
        annualized_vol = std_dev * np.sqrt(365 * 24)
        
        return float(annualized_vol)

    def _check_regime_filter(self, closes: np.ndarray, current_price: float) -> str:
        """
        检查宏观趋势 (Regime Filter)
        返回: "bull", "bear", "all"
        """
        if not self.enable_regime_filter:
            return "all"
            
        if len(closes) < self.regime_ema_len:
            logger.debug(f"Regime Filter: Data insufficient ({len(closes)} < {self.regime_ema_len})")
            return "all"
            
        regime_ema = self._calculate_ema(closes, self.regime_ema_len)
        current_regime_ema = regime_ema[-1]
        
        logger.info(f"Regime Check: Price={current_price:.2f}, EMA({self.regime_ema_len})={current_regime_ema:.2f}")
        
        if current_price > current_regime_ema:
            return "bull"  # 只做多
        else:
            return "bear"  # 只做空

    def _check_risk_controls(self, current_time: float) -> bool:
        """检查风控条件"""
        # 1. 每日亏损限制
        max_daily_loss_pct = float(self.parameters.get("max_daily_loss_pct", 0.15))
        capital = float(self.parameters.get("total_capital", 1000.0))
        
        # 如果当日亏损超过限制 (例如 15%)，停止交易
        if self.daily_pnl < -(capital * max_daily_loss_pct):
            logger.warning(f"触发每日亏损风控: 当前亏损 {self.daily_pnl:.2f}, 限制 {-(capital * max_daily_loss_pct):.2f}")
            return False
            
        # 2. 连败限制 (可选)
        max_consecutive_losses = int(self.parameters.get("max_consecutive_losses", 10))
        if self.consecutive_losses >= max_consecutive_losses:
            logger.warning(f"触发连败风控: 连续亏损 {self.consecutive_losses} 次")
            return False
            
        return True

    def update_position(self, signal: Dict[str, Any]):
        if signal["signal"] in ["buy", "sell"] and "type" not in signal:
            self.current_position = {
                "side": "long" if signal["signal"] == "buy" else "short",
                "entry_price": signal["price"],
                "amount": signal["amount"],
                "stop_loss": signal["stop_loss"],
                "take_profit": signal["take_profit"],
                "entry_time": datetime.now()
            }
        elif "type" in signal:
            self.current_position = None

    def record_trade(self, signal: Dict[str, Any]):
        if "pnl" in signal:
            self.daily_pnl += signal["pnl"]
            if signal["pnl"] < 0:
                self.consecutive_losses += 1
            else:
                self.consecutive_losses = 0
            self.total_trades += 1
            
    def reset_daily_stats(self):
        self.daily_pnl = 0.0
        self.daily_trades = []
        
    def get_statistics(self) -> Dict[str, Any]:
        return {
            "total_trades": self.total_trades,
            "daily_pnl": self.daily_pnl,
            "consecutive_losses": self.consecutive_losses
        }