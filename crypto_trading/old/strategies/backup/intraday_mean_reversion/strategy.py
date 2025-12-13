from typing import List, Dict, Any, Optional
from datetime import datetime

import numpy as np
import logging

logger = logging.getLogger(__name__)


class IntradayMeanReversionStrategy:
    """Intraday mean-reversion strategy on a single timeframe (e.g. 5m).

    Assumes klines as list of dicts with keys: timestamp, open, high, low, close, volume.
    BacktestEngine handles actual execution and PnL; this class just emits signals
    and maintains simple daily risk state.
    """

    def __init__(self, parameters: Dict[str, Any]):
        if not parameters:
            raise ValueError("IntradayMeanReversionStrategy requires parameters from config file")

        self.name = "Intraday Mean Reversion"
        self.parameters = parameters

        # Capital & risk
        self.capital = float(parameters.get("total_capital", 300.0))
        self.risk_per_trade_pct = float(parameters.get("risk_per_trade_pct", 0.012))  # 1.2%
        self.max_daily_loss_pct = float(parameters.get("max_daily_loss_pct", 0.05))   # 5%
        self.max_trades_per_day = int(parameters.get("max_trades_per_day", 8))
        self.max_consecutive_losses = int(parameters.get("max_consecutive_losses", 3))
        self.leverage = float(parameters.get("leverage", 2.0))

        # Mean-reversion bands
        self.ma_period = int(parameters.get("ma_period", 50))
        self.bb_period = int(parameters.get("bb_period", self.ma_period))
        self.bb_std = float(parameters.get("bb_std", 2.0))
        self.z_entry = float(parameters.get("z_entry", 2.0))
        self.z_exit = float(parameters.get("z_exit", 0.5))

        # Volatility filter
        self.atr_period = int(parameters.get("atr_period", 14))
        self.min_atr_pct = float(parameters.get("min_atr_pct", 0.002))
        self.max_atr_pct = float(parameters.get("max_atr_pct", 0.03))
        self.atr_stop_mult = float(parameters.get("atr_stop_mult", 1.0))
        self.rr_target = float(parameters.get("rr_target", 1.7))  # TP distance = rr_target * stop_distance

        # Time window
        self.trading_start_hour = int(parameters.get("trading_start_hour", 8))
        self.trading_end_hour = int(parameters.get("trading_end_hour", 22))
        self.max_holding_minutes = int(parameters.get("max_holding_minutes", 180))

        # Direction
        self.allow_short = bool(parameters.get("allow_short", True))

        # Trend filter: avoid very strong trends when doing mean reversion
        self.trend_ma_period = int(parameters.get("trend_ma_period", 100))
        self.max_trend_slope = float(parameters.get("max_trend_slope", 0.002))  # 0.2% over lookback
        self.trend_slope_lookback = int(parameters.get("trend_slope_lookback", 12))  # bars

        self.use_candlestick_filter = bool(parameters.get("use_candlestick_filter", False))
        self.min_body_pct = float(parameters.get("min_body_pct", 0.0005))
        self.min_shadow_body_ratio = float(parameters.get("min_shadow_body_ratio", 2.0))
        self.max_opposite_shadow_body_ratio = float(parameters.get("max_opposite_shadow_body_ratio", 1.0))
        self.min_range_body_ratio = float(parameters.get("min_range_body_ratio", 2.0))
        self.min_prior_trend_bars = int(parameters.get("min_prior_trend_bars", 2))

        # State
        self.current_position: Optional[Dict[str, Any]] = None
        self.daily_pnl = 0.0
        self.daily_trades = 0
        self.consecutive_losses = 0

    # ===== Backtest integration =====

    def reset_daily_stats(self):
        self.daily_pnl = 0.0
        self.daily_trades = 0
        self.consecutive_losses = 0

    def update_capital(self, new_capital: float):
        try:
            self.capital = float(new_capital)
        except Exception:
            logger.warning(f"Failed to update capital with value: {new_capital}")

    def update_position(self, signal: Dict[str, Any]):
        sig = signal.get("signal")
        sig_type = signal.get("type", "entry")

        if sig in ["buy", "sell"] and sig_type in ["entry", None]:
            side = "long" if sig == "buy" else "short"
            entry_price = float(signal["price"])
            amount = float(signal["amount"])
            ts = signal.get("timestamp")
            if isinstance(ts, datetime):
                entry_time = ts
            else:
                entry_time = datetime.utcnow()

            stop_loss = float(signal.get("stop_loss", entry_price))
            take_profit = float(signal.get("take_profit", entry_price))

            self.current_position = {
                "side": side,
                "entry_price": entry_price,
                "amount": amount,
                "entry_time": entry_time,
                "stop_loss": stop_loss,
                "take_profit": take_profit,
            }
        elif sig_type in ["stop_loss", "take_profit", "timeout"]:
            if not self.current_position:
                return
            exit_ratio = float(signal.get("exit_ratio", 1.0))
            if exit_ratio >= 1.0:
                self.current_position = None
            else:
                self.current_position["amount"] *= (1.0 - exit_ratio)
        elif sig_type == "force_close":
            self.current_position = None

    def record_trade(self, signal: Dict[str, Any]):  # required by BacktestEngine
        return

    def on_trade(self, trade: Dict[str, Any]):
        """Update daily stats from BacktestEngine trade dict."""
        net_pnl = float(trade.get("net_pnl", 0.0))
        self.daily_pnl += net_pnl

        # Treat any complete exit as one trade
        self.daily_trades += 1
        if net_pnl < 0:
            self.consecutive_losses += 1
        else:
            self.consecutive_losses = 0

    # ===== Core logic =====

    def analyze(self, klines: List[Dict[str, Any]]) -> Dict[str, Any]:
        if len(klines) < max(self.trend_ma_period, self.bb_period, self.atr_period) + 5:
            return {"signal": "hold", "reason": "not_enough_data"}

        last = klines[-1]
        ts = last["timestamp"]
        if not isinstance(ts, datetime):
            ts = datetime.fromtimestamp(ts / 1000)
        price = float(last["close"])

        if self._should_stop_trading(ts):
            return {"signal": "hold", "reason": "daily_risk_or_session"}

        closes = np.array([float(k["close"]) for k in klines], dtype=float)
        highs = np.array([float(k["high"]) for k in klines], dtype=float)
        lows = np.array([float(k["low"]) for k in klines], dtype=float)

        # Volatility filter
        atr = self._atr(highs, lows, closes, self.atr_period)
        if atr <= 0:
            return {"signal": "hold", "reason": "atr_zero"}
        atr_pct = atr / price
        if atr_pct < self.min_atr_pct or atr_pct > self.max_atr_pct:
            return {"signal": "hold", "reason": "atr_filter"}

        # Trend filter (avoid strong trend days)
        if self._is_strong_trend(closes):
            return {"signal": "hold", "reason": "strong_trend_filter"}

        # Compute mean & z-score
        ma = self._sma(closes, self.ma_period)
        mean = ma[-1]
        std = self._rolling_std(closes, self.bb_period)[-1]
        if std <= 0:
            return {"signal": "hold", "reason": "std_zero"}

        z = (price - mean) / std

        if self.current_position:
            exit_sig = self._check_exit(ts, price, z)
            if exit_sig:
                return exit_sig
            return {"signal": "hold", "reason": "in_position"}

        return self._check_entry(price, mean, std, z, atr, klines)

    # ===== Risk / filters =====

    def _should_stop_trading(self, current_time: datetime) -> bool:
        hour = current_time.hour
        if hour < self.trading_start_hour or hour >= self.trading_end_hour:
            return True
        if self.daily_pnl <= -self.max_daily_loss_pct * self.capital:
            return True
        if self.daily_trades >= self.max_trades_per_day:
            return True
        if self.consecutive_losses >= self.max_consecutive_losses:
            return True
        return False

    def _is_strong_trend(self, closes: np.ndarray) -> bool:
        ma = self._sma(closes, self.trend_ma_period)
        if len(ma) < self.trend_slope_lookback + 1:
            return False
        a = ma[-self.trend_slope_lookback - 1]
        b = ma[-1]
        if a <= 0:
            return False
        slope = (b - a) / a
        return abs(slope) > self.max_trend_slope

    # ===== Entry / Exit =====

    def _check_entry(self, price: float, mean: float, std: float, z: float, atr: float, klines: List[Dict[str, Any]]) -> Dict[str, Any]:
        leverage = self.leverage

        # Long: price significantly below mean
        if z <= -self.z_entry:
            if self.use_candlestick_filter and not self._is_bullish_reversal_candle(klines):
                return {"signal": "hold", "reason": "no_bullish_pattern"}
            stop_loss = price - self.atr_stop_mult * atr
            if stop_loss <= 0 or stop_loss >= price:
                return {"signal": "hold", "reason": "invalid_long_stop"}
            stop_dist = price - stop_loss
            tp_price = price + self.rr_target * stop_dist
            amount = self._position_size(price, stop_loss, leverage, side="long")
            if amount <= 0:
                return {"signal": "hold", "reason": "size_zero"}
            return {
                "signal": "buy",
                "type": "entry",
                "price": price,
                "amount": amount,
                "stop_loss": stop_loss,
                "take_profit": tp_price,
                "leverage": leverage,
                "reason": "mean_reversion_long_z_oversold",
            }

        # Short: price significantly above mean
        if self.allow_short and z >= self.z_entry:
            if self.use_candlestick_filter and not self._is_bearish_reversal_candle(klines):
                return {"signal": "hold", "reason": "no_bearish_pattern"}
            stop_loss = price + self.atr_stop_mult * atr
            if stop_loss <= price:
                return {"signal": "hold", "reason": "invalid_short_stop"}
            stop_dist = stop_loss - price
            tp_price = price - self.rr_target * stop_dist
            amount = self._position_size(price, stop_loss, leverage, side="short")
            if amount <= 0:
                return {"signal": "hold", "reason": "size_zero"}
            return {
                "signal": "sell",
                "type": "entry",
                "price": price,
                "amount": amount,
                "stop_loss": stop_loss,
                "take_profit": tp_price,
                "leverage": leverage,
                "reason": "mean_reversion_short_z_overbought",
            }

        return {"signal": "hold", "reason": "no_entry"}

    def _check_exit(self, ts: datetime, price: float, z: float) -> Optional[Dict[str, Any]]:
        pos = self.current_position
        if not pos:
            return None

        side = pos["side"]
        stop_loss = pos["stop_loss"]
        take_profit = pos["take_profit"]
        holding_minutes = (ts - pos["entry_time"]).total_seconds() / 60.0

        # Hard stop
        if side == "long" and price <= stop_loss:
            return {
                "signal": "sell",
                "type": "stop_loss",
                "price": stop_loss,
                "amount": pos["amount"],
            }
        if side == "short" and price >= stop_loss:
            return {
                "signal": "buy",
                "type": "stop_loss",
                "price": stop_loss,
                "amount": pos["amount"],
            }

        # Take profit
        if side == "long" and price >= take_profit:
            return {
                "signal": "sell",
                "type": "take_profit",
                "price": take_profit,
                "amount": pos["amount"],
            }
        if side == "short" and price <= take_profit:
            return {
                "signal": "buy",
                "type": "take_profit",
                "price": take_profit,
                "amount": pos["amount"],
            }

        # Z-score back to neutral zone: exit to avoid re-trending
        if side == "long" and z >= -self.z_exit:
            return {
                "signal": "sell",
                "type": "timeout",
                "price": price,
                "amount": pos["amount"],
            }
        if side == "short" and z <= self.z_exit:
            return {
                "signal": "buy",
                "type": "timeout",
                "price": price,
                "amount": pos["amount"],
            }

        # Time stop
        if holding_minutes >= self.max_holding_minutes:
            return {
                "signal": "sell" if side == "long" else "buy",
                "type": "timeout",
                "price": price,
                "amount": pos["amount"],
            }

        return None

    # ===== helpers =====

    def _is_bullish_reversal_candle(self, klines: List[Dict[str, Any]]) -> bool:
        if len(klines) < self.min_prior_trend_bars + 1:
            return False
        last = klines[-1]
        o = float(last["open"])
        c = float(last["close"])
        h = float(last["high"])
        l = float(last["low"])
        price = c
        if price <= 0:
            return False
        body = abs(c - o)
        rng = h - l
        if rng <= 0:
            return False
        body_pct = body / price
        if body_pct < self.min_body_pct:
            return False
        lower = min(o, c) - l
        upper = h - max(o, c)
        if lower < self.min_shadow_body_ratio * body:
            return False
        if upper > self.max_opposite_shadow_body_ratio * body:
            return False
        if rng < self.min_range_body_ratio * body:
            return False

        recent = klines[-(self.min_prior_trend_bars + 1):-1]
        down_bars = 0
        for k in recent:
            if float(k["close"]) < float(k["open"]):
                down_bars += 1
        return down_bars >= 1

    def _is_bearish_reversal_candle(self, klines: List[Dict[str, Any]]) -> bool:
        if len(klines) < self.min_prior_trend_bars + 1:
            return False
        last = klines[-1]
        o = float(last["open"])
        c = float(last["close"])
        h = float(last["high"])
        l = float(last["low"])
        price = c
        if price <= 0:
            return False
        body = abs(c - o)
        rng = h - l
        if rng <= 0:
            return False
        body_pct = body / price
        if body_pct < self.min_body_pct:
            return False
        upper = h - max(o, c)
        lower = min(o, c) - l
        if upper < self.min_shadow_body_ratio * body:
            return False
        if lower > self.max_opposite_shadow_body_ratio * body:
            return False
        if rng < self.min_range_body_ratio * body:
            return False

        recent = klines[-(self.min_prior_trend_bars + 1):-1]
        up_bars = 0
        for k in recent:
            if float(k["close"]) > float(k["open"]):
                up_bars += 1
        return up_bars >= 1

    @staticmethod
    def _sma(values: np.ndarray, period: int) -> np.ndarray:
        n = len(values)
        if n == 0:
            return np.array([])
        period = max(int(period), 1)
        if n < period:
            return np.full_like(values, values.mean(), dtype=float)
        sma = np.zeros_like(values, dtype=float)
        cumsum = np.cumsum(values, dtype=float)
        sma[:period] = values[:period].mean()
        for i in range(period, n):
            sma[i] = (cumsum[i] - cumsum[i - period]) / period
        return sma

    @staticmethod
    def _rolling_std(values: np.ndarray, period: int) -> np.ndarray:
        n = len(values)
        if n == 0:
            return np.array([])
        period = max(int(period), 1)
        if n < period:
            return np.full_like(values, values.std() if n > 1 else 0.0, dtype=float)
        std = np.zeros_like(values, dtype=float)
        for i in range(n):
            start = max(0, i - period + 1)
            std[i] = values[start : i + 1].std(ddof=0)
        return std

    @staticmethod
    def _atr(highs: np.ndarray, lows: np.ndarray, closes: np.ndarray, period: int) -> float:
        n = len(closes)
        if n < period + 1:
            return 0.0
        trs = []
        for i in range(1, n):
            tr = max(
                highs[i] - lows[i],
                abs(highs[i] - closes[i - 1]),
                abs(lows[i] - closes[i - 1]),
            )
            trs.append(tr)
        if len(trs) < period:
            return 0.0
        return float(np.mean(trs[-period:]))

    def _position_size(self, entry_price: float, stop_loss: float, leverage: float, side: str = "long") -> float:
        """Calculate position size based on risk per trade and margin constraint.

        - Risk is defined on *account equity*, not on leveraged nominal.
        - BacktestEngine will apply leverage when calculating required margin, so we
          should not double-count leverage here.
        - Additionally, cap size so that required margin does not exceed capital.
        """
        if entry_price <= 0 or leverage <= 0:
            return 0.0
        if side == "long":
            stop_dist = entry_price - stop_loss
        else:
            stop_dist = stop_loss - entry_price
        if stop_dist <= 0:
            return 0.0

        # 1) Risk-based size: risk_per_trade_pct * capital will be lost if stop hit
        risk_amount = self.capital * self.risk_per_trade_pct
        base_amount = risk_amount / stop_dist

        # 2) Margin constraint: required margin = entry_price * amount / leverage
        max_amount_by_margin = (self.capital * leverage) / entry_price
        amount = min(base_amount, max_amount_by_margin)

        if amount <= 0:
            return 0.0
        return float(amount)
