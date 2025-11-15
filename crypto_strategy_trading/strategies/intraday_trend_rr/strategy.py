from typing import List, Dict, Any, Optional
from datetime import datetime

import numpy as np
import logging

logger = logging.getLogger(__name__)


class IntradayTrendRRStrategy:
    """Intraday trend-following strategy focusing on high R/R (small loss, larger win).

    Assumptions:
    - Input klines are single timeframe (e.g. 5m), provided as list of dicts with keys
      ['timestamp', 'open', 'high', 'low', 'close', 'volume'].
    - BacktestEngine handles position & PnL. This strategy only emits signals and
      maintains lightweight state for risk limits.
    """

    def __init__(self, parameters: Dict[str, Any]):
        if not parameters:
            raise ValueError("IntradayTrendRRStrategy requires parameters from config file")

        self.name = "Intraday Trend R/R Strategy"
        self.parameters = parameters

        # Capital & risk
        self.capital = float(parameters.get("total_capital", 300.0))
        self.risk_per_trade_pct = float(parameters.get("risk_per_trade_pct", 0.012))  # 1.2%
        self.max_daily_loss_pct = float(parameters.get("max_daily_loss_pct", 0.04))   # 4%
        self.max_trades_per_day = int(parameters.get("max_trades_per_day", 5))
        self.max_consecutive_losses = int(parameters.get("max_consecutive_losses", 3))

        # Trend & entry
        self.ema_fast_period = int(parameters.get("ema_fast_period", 20))
        self.ema_slow_period = int(parameters.get("ema_slow_period", 50))
        self.atr_period = int(parameters.get("atr_period", 14))
        self.min_atr_pct = float(parameters.get("min_atr_pct", 0.003))   # 0.3%
        self.max_atr_pct = float(parameters.get("max_atr_pct", 0.02))    # 2%

        # R-multiple design
        self.r_multiple_tp1 = float(parameters.get("r_multiple_tp1", 1.8))
        self.r_multiple_tp2 = float(parameters.get("r_multiple_tp2", 3.0))
        self.tp1_close_ratio = float(parameters.get("tp1_close_ratio", 0.5))  # close 50% at TP1
        self.max_holding_minutes = int(parameters.get("max_holding_minutes", 6 * 60))  # intraday

        # Session filter (UTC hours)
        self.trading_start_hour = int(parameters.get("trading_start_hour", 8))
        self.trading_end_hour = int(parameters.get("trading_end_hour", 22))

        # Leverage (for position sizing)
        self.leverage = float(parameters.get("leverage", 3.0))

        # State
        self.current_position: Optional[Dict[str, Any]] = None
        self.daily_pnl = 0.0
        self.daily_trades = 0
        self.consecutive_losses = 0
        self.current_date: Optional[datetime.date] = None

    # ====== Backtest integration ======

    def reset_daily_stats(self):
        """Called by BacktestEngine when a new day starts."""
        self.daily_pnl = 0.0
        self.daily_trades = 0
        self.consecutive_losses = 0

    def update_capital(self, new_capital: float):
        try:
            self.capital = float(new_capital)
        except Exception:
            logger.warning(f"Failed to update capital with value: {new_capital}")

    def update_position(self, signal: Dict[str, Any]):
        """Mirror BacktestEngine position state based on our own signals."""
        sig = signal.get("signal")
        sig_type = signal.get("type", "entry")

        if sig in ["buy", "sell"] and sig_type in ["entry", None]:
            # Opening new position
            side = "long" if sig == "buy" else "short"
            entry_price = float(signal["price"])
            amount = float(signal["amount"])
            timestamp = signal.get("timestamp")
            if isinstance(timestamp, datetime):
                entry_time = timestamp
            else:
                # BacktestEngine will pass timestamp only in on_trade, not here.
                entry_time = datetime.utcnow()

            stop_loss = float(signal.get("stop_loss", entry_price))
            take_profit = float(signal.get("take_profit", entry_price))

            # Pre-compute R distance
            if side == "long":
                stop_dist = max(entry_price - stop_loss, 1e-8)
            else:
                stop_dist = max(stop_loss - entry_price, 1e-8)

            r_value = stop_dist / entry_price
            tp1_price = entry_price + self.r_multiple_tp1 * stop_dist if side == "long" else entry_price - self.r_multiple_tp1 * stop_dist
            tp2_price = entry_price + self.r_multiple_tp2 * stop_dist if side == "long" else entry_price - self.r_multiple_tp2 * stop_dist

            self.current_position = {
                "side": side,
                "entry_price": entry_price,
                "amount": amount,
                "entry_time": entry_time,
                "stop_loss": stop_loss,
                "take_profit": take_profit,
                "r_value": r_value,
                "tp1_price": tp1_price,
                "tp2_price": tp2_price,
                "tp1_done": False,
            }
        elif sig_type == "force_close":
            # End-of-backtest forced close
            self.current_position = None
        elif sig_type in ["stop_loss", "take_profit", "trailing_stop", "partial_take_profit", "timeout"]:
            # Close or partial close
            exit_ratio = float(signal.get("exit_ratio", 1.0))
            if not self.current_position:
                return
            if exit_ratio >= 1.0:
                self.current_position = None
            else:
                self.current_position["amount"] *= (1.0 - exit_ratio)
                if sig_type == "partial_take_profit":
                    self.current_position["tp1_done"] = True

    def record_trade(self, signal: Dict[str, Any]):
        # Not used; BacktestEngine will call on_trade() with full trade dict.
        return

    def on_trade(self, trade: Dict[str, Any]):
        """Receive final trade info (from BacktestEngine)."""
        net_pnl = float(trade.get("net_pnl", 0.0))
        exit_type = trade.get("exit_type", "")
        exit_ratio = float(trade.get("exit_ratio", 1.0)) if "exit_ratio" in trade else 1.0

        # Update daily stats; count only full exits as one trade
        self.daily_pnl += net_pnl
        if exit_ratio >= 0.999:
            self.daily_trades += 1
            if net_pnl < 0:
                self.consecutive_losses += 1
            else:
                self.consecutive_losses = 0

    # ====== Core logic ======

    def analyze(self, klines: List[Dict[str, Any]]) -> Dict[str, Any]:
        if len(klines) < max(self.ema_slow_period, self.atr_period) + 5:
            return {"signal": "hold", "reason": "not_enough_data"}

        last_bar = klines[-1]
        ts = last_bar["timestamp"]
        if not isinstance(ts, datetime):
            ts = datetime.fromtimestamp(ts / 1000)
        current_price = float(last_bar["close"])

        # Daily risk gates
        if self._should_stop_trading(ts):
            return {"signal": "hold", "reason": "daily_limits"}

        closes = np.array([float(k["close"]) for k in klines], dtype=float)
        highs = np.array([float(k["high"]) for k in klines], dtype=float)
        lows = np.array([float(k["low"]) for k in klines], dtype=float)

        ema_fast = self._ema(closes, self.ema_fast_period)
        ema_slow = self._ema(closes, self.ema_slow_period)
        atr = self._atr(highs, lows, closes, self.atr_period)
        if atr <= 0:
            return {"signal": "hold", "reason": "atr_zero"}

        atr_pct = atr / current_price
        if atr_pct < self.min_atr_pct or atr_pct > self.max_atr_pct:
            return {"signal": "hold", "reason": "atr_filter"}

        # If in position: manage exits
        if self.current_position:
            exit_signal = self._check_exit(klines, ema_fast, ema_slow)
            if exit_signal:
                return exit_signal
            return {"signal": "hold", "reason": "in_position"}

        # No position: look for entry
        return self._generate_entry(klines, ema_fast, ema_slow, atr)

    # ====== Risk / session ======

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

    # ====== Entry / Exit ======

    def _generate_entry(self, klines: List[Dict[str, Any]], ema_fast: np.ndarray, ema_slow: np.ndarray, atr: float) -> Dict[str, Any]:
        closes = np.array([float(k["close"]) for k in klines], dtype=float)
        highs = np.array([float(k["high"]) for k in klines], dtype=float)
        lows = np.array([float(k["low"]) for k in klines], dtype=float)

        current_price = closes[-1]
        prev_price = closes[-2]
        fast_now = ema_fast[-1]
        fast_prev = ema_fast[-2]
        slow_now = ema_slow[-1]
        slow_prev = ema_slow[-2]

        trend_up = fast_now > slow_now
        trend_down = fast_now < slow_now

        # Simple pullback + breakout pattern on same TF
        recent_high = np.max(highs[-6:-1])
        recent_low = np.min(lows[-6:-1])

        # Long setup
        long_trend_ok = trend_up and fast_now > fast_prev and slow_now > slow_prev
        long_pullback = prev_price <= fast_prev and prev_price >= slow_prev
        long_breakout = current_price > recent_high

        # Short setup
        short_trend_ok = trend_down and fast_now < fast_prev and slow_now < slow_prev
        short_pullback = prev_price >= fast_prev and prev_price <= slow_prev
        short_breakout = current_price < recent_low

        leverage = self.leverage

        # Long entry
        if long_trend_ok and long_pullback and long_breakout:
            stop_loss = current_price - 1.0 * atr
            if stop_loss <= 0:
                return {"signal": "hold", "reason": "invalid_stop"}
            amount = self._position_size(current_price, stop_loss, leverage)
            if amount <= 0:
                return {"signal": "hold", "reason": "size_zero"}

            take_profit = current_price + self.r_multiple_tp2 * (current_price - stop_loss)
            return {
                "signal": "buy",
                "type": "entry",
                "price": current_price,
                "amount": amount,
                "stop_loss": stop_loss,
                "take_profit": take_profit,
                "leverage": leverage,
                "reason": "trend_up_pullback_breakout",
            }

        # Short entry
        if short_trend_ok and short_pullback and short_breakout:
            stop_loss = current_price + 1.0 * atr
            amount = self._position_size(current_price, stop_loss, leverage, side="short")
            if amount <= 0:
                return {"signal": "hold", "reason": "size_zero"}
            take_profit = current_price - self.r_multiple_tp2 * (stop_loss - current_price)
            return {
                "signal": "sell",
                "type": "entry",
                "price": current_price,
                "amount": amount,
                "stop_loss": stop_loss,
                "take_profit": take_profit,
                "leverage": leverage,
                "reason": "trend_down_pullback_breakout",
            }

        return {"signal": "hold", "reason": "no_entry"}

    def _check_exit(self, klines: List[Dict[str, Any]], ema_fast: np.ndarray, ema_slow: np.ndarray) -> Optional[Dict[str, Any]]:
        pos = self.current_position
        if not pos:
            return None

        last_bar = klines[-1]
        current_price = float(last_bar["close"])
        high = float(last_bar["high"])
        low = float(last_bar["low"])
        ts = last_bar["timestamp"]
        if not isinstance(ts, datetime):
            ts = datetime.fromtimestamp(ts / 1000)

        side = pos["side"]
        entry_price = pos["entry_price"]
        stop_loss = pos["stop_loss"]
        tp1_price = pos["tp1_price"]
        tp2_price = pos["tp2_price"]
        tp1_done = pos.get("tp1_done", False)

        # Holding time
        holding_minutes = (ts - pos["entry_time"]).total_seconds() / 60.0

        # Hard stop
        if side == "long" and low <= stop_loss:
            return {
                "signal": "sell",
                "type": "stop_loss",
                "price": stop_loss,
                "amount": pos["amount"],
            }
        if side == "short" and high >= stop_loss:
            return {
                "signal": "buy",
                "type": "stop_loss",
                "price": stop_loss,
                "amount": pos["amount"],
            }

        # Partial take profit at TP1
        if not tp1_done:
            if side == "long" and high >= tp1_price:
                return {
                    "signal": "sell",
                    "type": "partial_take_profit",
                    "price": tp1_price,
                    "amount": pos["amount"] * self.tp1_close_ratio,
                    "exit_ratio": self.tp1_close_ratio,
                }
            if side == "short" and low <= tp1_price:
                return {
                    "signal": "buy",
                    "type": "partial_take_profit",
                    "price": tp1_price,
                    "amount": pos["amount"] * self.tp1_close_ratio,
                    "exit_ratio": self.tp1_close_ratio,
                }

        # Full take profit at TP2
        if side == "long" and high >= tp2_price:
            return {
                "signal": "sell",
                "type": "take_profit",
                "price": tp2_price,
                "amount": pos["amount"],
            }
        if side == "short" and low <= tp2_price:
            return {
                "signal": "buy",
                "type": "take_profit",
                "price": tp2_price,
                "amount": pos["amount"],
            }

        # Time stop (avoid overnight)
        if holding_minutes >= self.max_holding_minutes:
            return {
                "signal": "sell" if side == "long" else "buy",
                "type": "timeout",
                "price": current_price,
                "amount": pos["amount"],
            }

        # Simple trend exit: fast EMA crossing slow EMA against position
        fast_now = ema_fast[-1]
        slow_now = ema_slow[-1]
        fast_prev = ema_fast[-2]
        slow_prev = ema_slow[-2]

        if side == "long" and fast_prev >= slow_prev and fast_now < slow_now:
            return {
                "signal": "sell",
                "type": "trailing_stop",
                "price": current_price,
                "amount": pos["amount"],
            }
        if side == "short" and fast_prev <= slow_prev and fast_now > slow_now:
            return {
                "signal": "buy",
                "type": "trailing_stop",
                "price": current_price,
                "amount": pos["amount"],
            }

        return None

    # ====== Helpers ======

    @staticmethod
    def _ema(values: np.ndarray, period: int) -> np.ndarray:
        if len(values) == 0:
            return np.array([])
        period = max(int(period), 1)
        alpha = 2.0 / (period + 1.0)
        ema = np.zeros_like(values, dtype=float)
        ema[0] = values[0]
        for i in range(1, len(values)):
            ema[i] = alpha * values[i] + (1.0 - alpha) * ema[i - 1]
        return ema

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
        """Risk-based position sizing: risk_per_trade_pct * capital defines 1R."""
        if entry_price <= 0 or leverage <= 0:
            return 0.0
        if side == "long":
            stop_dist = entry_price - stop_loss
        else:
            stop_dist = stop_loss - entry_price
        if stop_dist <= 0:
            return 0.0

        risk_amount = self.capital * self.risk_per_trade_pct
        # nominal position value considering leverage
        max_nominal = risk_amount * leverage / (stop_dist / entry_price)
        amount = max_nominal / entry_price
        return max(amount, 0.0)
