"""
统一多空 + Regime 控制版 EMA 多时间框架策略

设计依据:
- 按照 [`UNIFIED_MTF_REGIME_DESIGN.md`](crypto_strategy_trading/strategies/ema_simple_trend/UNIFIED_MTF_REGIME_DESIGN.md)
- 在独立文件中实现统一多空 + Regime，不影响原有
  [`strategy_multiframe.py`](crypto_strategy_trading/strategies/ema_simple_trend/strategy_multiframe.py)
- 接口兼容:
  - EMASimpleTrendMultiframeUnifiedRegimeStrategy.__init__(parameters, load_daily_from_file=True)
  - analyze(klines) -> Dict[str, Any]
  - update_position / record_trade / on_trade 与回测引擎约定兼容
- 策略只依赖 parameters，不耦合具体 backtest_*.json 名称

Regime 概要:
- 使用日线 EMA21 / EMA50 / EMA200 构造 BULL / BEAR / NEUTRAL 三状态
- 模式:
  - simple_ema21: 仅基于 EMA21 上下带
  - ema50_200: 仅基于 EMA50/EMA200 金叉死叉 + 确认条数
  - hybrid(默认): EMA21 快速趋势 + EMA50/200 确认熊市
- 策略行为:
  - BULL: 只做多
  - BEAR: 只做空（更严格过滤）
  - NEUTRAL: 由 neutral_trade_mode 控制(默认 no_trade)
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np
import pandas as pd
import logging
import os

logger = logging.getLogger(__name__)


class EMASimpleTrendMultiframeUnifiedRegimeStrategy:
    """EMA 多时间框架统一多空 + Regime 策略"""

    def __init__(self, parameters: Dict[str, Any], load_daily_from_file: bool = True):
        """
        Args:
            parameters: 策略参数配置
            load_daily_from_file: 回测场景下是否从 CSV 加载日线数据
        """
        self.name = "EMA多周期-统一多空-Regime"

        # 基础资金与风险参数
        self.parameters = parameters
        self.capital = float(parameters.get("total_capital", 1000.0))
        self.position_size = float(parameters.get("position_size", 0.5))

        self.max_risk_per_trade = float(parameters.get("max_risk_per_trade", 0.015))
        self.max_daily_drawdown = float(parameters.get("max_daily_drawdown", 0.15))

        # 杠杆设置
        self.base_leverage = float(parameters.get("leverage", 2.0))
        self.leverage = self.base_leverage

        self.use_dynamic_leverage = bool(parameters.get("use_dynamic_leverage", False))
        self.min_leverage = float(parameters.get("min_leverage", 1.0))
        self.max_leverage = float(parameters.get("max_leverage", 4.0))
        self.leverage_increase_step = float(parameters.get("leverage_increase_step", 0.4))
        self.leverage_decrease_step = float(parameters.get("leverage_decrease_step", 0.8))
        self.leverage_after_drawdown = float(parameters.get("leverage_after_drawdown", 1.0))

        self.last_trade_profit: Optional[float] = None
        self.daily_pnl: float = 0.0

        # 波动率动态仓位
        self.use_volatility_position_sizing = bool(
            parameters.get("use_volatility_position_sizing", True)
        )
        self.atr_period = int(parameters.get("atr_period", 14))
        self.min_position_size = float(parameters.get("min_position_size", 0.2))
        self.max_position_size = float(parameters.get("max_position_size", 0.9))

        # 1h EMA 组合
        self.ema_fast = int(parameters.get("ema_fast", 5))
        self.ema_medium = int(parameters.get("ema_medium", 13))
        self.ema_slow = int(parameters.get("ema_slow", 21))

        # 日线配置
        self.use_daily_trend_filter = bool(parameters.get("use_daily_trend_filter", True))
        self.daily_ema_period = int(parameters.get("daily_ema_period", 21))
        self.daily_data_file = parameters.get(
            "daily_data_file", "backtest/data/ETHUSDT-1d-ALL.csv"
        )

        # Regime 参数
        self.regime_mode = str(parameters.get("regime_mode", "hybrid"))
        self.regime_band_pct = float(parameters.get("regime_band_pct", 0.01))
        self.bull_confirm_bars = int(parameters.get("bull_confirm_bars", 0))
        self.bear_confirm_bars = int(parameters.get("bear_confirm_bars", 3))
        self.exit_on_regime_flip = bool(parameters.get("exit_on_regime_flip", True))

        # 多空开关
        self.allow_long = bool(parameters.get("allow_long", True))
        self.allow_short = bool(parameters.get("allow_short", False))

        # 中性区行为
        # - no_trade: 中性不開新仓
        # - long_only_strict: 仅允许更严格多头
        # - both_strict: 多空都用严格条件（高门槛）
        self.neutral_trade_mode = str(parameters.get("neutral_trade_mode", "no_trade"))

        # 多头 / 空头最小 RR
        self.min_rr_ratio = float(parameters.get("min_rr_ratio", 1.6))
        self.min_rr_ratio_short = float(parameters.get("min_rr_ratio_short", 1.8))

        # 空头专用安全约束
        self.max_risk_per_trade_short = float(
            parameters.get("max_risk_per_trade_short", self.max_risk_per_trade * 0.7)
        )
        self.leverage_short = float(parameters.get("leverage_short", self.leverage))
        self.min_distance_from_low = float(
            parameters.get("min_distance_from_low", 0.005)
        )  # 距离近期低点的最小距离，避免极端追空

        # 止盈止损 / ATR / 移动止损
        self.stop_loss_pct = float(parameters.get("stop_loss_pct", 0.025))
        self.take_profit_pct = float(parameters.get("take_profit_pct", 0.18))
        self.partial_take_profit_pct = float(
            parameters.get("partial_take_profit_pct", 0.05)
        )

        self.use_atr_stop = bool(parameters.get("use_atr_stop", True))
        self.atr_stop_multiplier = float(parameters.get("atr_stop_multiplier", 2.0))
        self.atr_tp_multiplier = float(parameters.get("atr_tp_multiplier", 4.0))

        self.use_trailing_stop = bool(parameters.get("use_trailing_stop", True))
        self.trailing_stop_activation = float(
            parameters.get("trailing_stop_activation", 0.05)
        )
        self.trailing_stop_distance = float(
            parameters.get("trailing_stop_distance", 0.03)
        )

        self.use_trailing_take_profit = bool(
            parameters.get("use_trailing_take_profit", True)
        )
        self.trailing_take_profit_activation = float(
            parameters.get("trailing_take_profit_activation", 0.06)
        )
        self.trailing_take_profit_distance = float(
            parameters.get("trailing_take_profit_distance", 0.025)
        )

        # 趋势强度过滤
        self.trend_strength_filter = bool(
            parameters.get("trend_strength_filter", True)
        )
        self.ema_slope_threshold = float(parameters.get("ema_slope_threshold", 0.00003))
        self.ema_band_distance_min = float(
            parameters.get("ema_band_distance_min", 0.0008)
        )

        # 量能过滤（可选）
        self.volume_confirmation = bool(parameters.get("volume_confirmation", False))
        self.volume_multiplier = float(parameters.get("volume_multiplier", 1.05))

        # 状态变量
        self.current_position: Optional[Dict[str, Any]] = None
        self.entry_price: Optional[float] = None
        self.total_trades: int = 0
        self.winning_trades: int = 0
        self.partial_closed: bool = False
        self.trailing_stop_price: Optional[float] = None
        self.trailing_take_profit_price: Optional[float] = None
        self.highest_price: Optional[float] = None
        self.last_exit_index: Optional[int] = None

        # 日线数据
        self.daily_data: Optional[pd.DataFrame] = None
        if self.use_daily_trend_filter and load_daily_from_file:
            self._load_daily_data()

        logger.info(f"✓ {self.name} 初始化完成 (Unified Regime)")
        logger.info(f"  资金: {self.capital}, 仓位: {self.position_size}, 杠杆: {self.leverage}")
        logger.info(
            f"  Regime: mode={self.regime_mode}, band={self.regime_band_pct}, "
            f"bull_confirm={self.bull_confirm_bars}, bear_confirm={self.bear_confirm_bars}"
        )
        logger.info(
            f"  权限: allow_long={self.allow_long}, allow_short={self.allow_short}, "
            f"neutral_mode={self.neutral_trade_mode}"
        )

    # ========== 日线数据 & Regime ==========

    def _load_daily_data(self) -> None:
        """加载日线数据，并计算 ema21/50/200 与趋势字段。"""
        try:
            possible_paths = [
                self.daily_data_file,
                os.path.join("..", "..", "..", self.daily_data_file),
                os.path.join(os.getcwd(), self.daily_data_file),
            ]
            for path in possible_paths:
                if os.path.exists(path):
                    df = pd.read_csv(path)

                    if "open_time" in df.columns:
                        df["datetime"] = pd.to_datetime(df["open_time"], unit="ms")
                    elif "timestamp" in df.columns:
                        df["datetime"] = pd.to_datetime(df["timestamp"], unit="ms")
                    elif "date" in df.columns:
                        df["datetime"] = pd.to_datetime(df["date"])
                    else:
                        logger.error(f"日线数据缺少时间字段: {path}")
                        continue

                    df["date"] = df["datetime"].dt.date
                    if "close" not in df.columns:
                        logger.error(f"日线数据缺少 close 字段: {path}")
                        continue

                    closes = df["close"].values.astype(float)
                    df["ema21"] = self._calculate_ema(closes, 21)
                    df["ema50"] = self._calculate_ema(closes, 50)
                    df["ema200"] = self._calculate_ema(closes, 200)

                    df["trend"] = np.where(df["close"] > df["ema21"], "BULLISH", "BEARISH")

                    self.daily_data = df
                    logger.info(f"✓ 日线数据加载成功: {path}, 条数={len(df)}")
                    return

            logger.warning("⚠ 未找到日线数据文件, Regime 与日线过滤将失效")
            self.use_daily_trend_filter = False

        except Exception as e:
            logger.error(f"✗ 加载日线数据失败: {e}")
            self.use_daily_trend_filter = False

    def update_daily_data(self, daily_klines: List[Dict]) -> None:
        """实盘更新日线数据。"""
        if not daily_klines:
            return
        try:
            df = pd.DataFrame(daily_klines)
            if "close" not in df.columns:
                logger.error("日线数据缺少 close 字段")
                return

            if "datetime" in df.columns:
                df["datetime"] = pd.to_datetime(df["datetime"])
            elif "timestamp" in df.columns:
                df["datetime"] = pd.to_datetime(df["timestamp"], unit="ms")
            else:
                logger.error("日线数据缺少 datetime/timestamp 字段")
                return

            df["date"] = df["datetime"].dt.date
            closes = df["close"].values.astype(float)
            df["ema21"] = self._calculate_ema(closes, 21)
            df["ema50"] = self._calculate_ema(closes, 50)
            df["ema200"] = self._calculate_ema(closes, 200)
            df["trend"] = np.where(df["close"] > df["ema21"], "BULLISH", "BEARISH")
            self.daily_data = df
            self.use_daily_trend_filter = True
            logger.info(f"✓ 日线数据已更新: {len(df)} 条")
        except Exception as e:
            logger.error(f"✗ 更新日线数据失败: {e}")

    @staticmethod
    def _calculate_ema(data: np.ndarray, period: int) -> np.ndarray:
        if len(data) == 0:
            return np.array([], dtype=float)
        alpha = 2.0 / (period + 1.0)
        ema = np.zeros(len(data), dtype=float)
        ema[0] = float(data[0])
        for i in range(1, len(data)):
            ema[i] = alpha * float(data[i]) + (1.0 - alpha) * ema[i - 1]
        return ema

    def _get_regime(self, current_time: datetime) -> Optional[str]:
        """
        根据日线数据与 regime_mode 返回:
        - "BULL" / "BEAR" / "NEUTRAL" / None
        """
        if not self.use_daily_trend_filter or self.daily_data is None:
            return None

        current_date = current_time.date()
        df = self.daily_data

        row = df[df["date"] == current_date]
        if len(row) == 0:
            # 使用最近一条历史数据
            row = df[df["date"] < current_date]
            if len(row) == 0:
                return None
            row = row.iloc[[-1]]
        else:
            row = row.iloc[[-1]]

        close = float(row["close"].iloc[0])
        ema21 = float(row["ema21"].iloc[0])
        ema50 = float(row["ema50"].iloc[0])
        ema200 = float(row["ema200"].iloc[0])
        trend = str(row["trend"].iloc[0])
        mode = (self.regime_mode or "hybrid").lower()
        band = self.regime_band_pct

        # simple_ema21
        if mode == "simple_ema21":
            upper = ema21 * (1 + band)
            lower = ema21 * (1 - band)
            if close > upper:
                return "BULL"
            if close < lower:
                return "BEAR"
            return "NEUTRAL"

        # ema50_200
        if mode == "ema50_200":
            lookback = max(self.bull_confirm_bars, self.bear_confirm_bars, 1)
            df_valid = df[df["date"] <= current_date].tail(lookback)
            if len(df_valid) == 0:
                return None

            ema50_s = df_valid["ema50"]
            ema200_s = df_valid["ema200"]
            close_s = df_valid["close"]

            bull_cond = (ema50_s > ema200_s) & (close_s > ema50_s)
            bear_cond = (ema50_s < ema200_s) & (close_s < ema50_s)

            if (
                self.bull_confirm_bars > 0
                and len(df_valid) >= self.bull_confirm_bars
                and bull_cond.tail(self.bull_confirm_bars).all()
            ):
                return "BULL"
            if (
                self.bear_confirm_bars > 0
                and len(df_valid) >= self.bear_confirm_bars
                and bear_cond.tail(self.bear_confirm_bars).all()
            ):
                return "BEAR"
            return "NEUTRAL"

        # hybrid: 推荐默认
        df_valid = df[df["date"] <= current_date].tail(max(self.bear_confirm_bars, 5))

        # 牛市: EMA21 BULLISH，且未出现明显长期死叉
        if trend == "BULLISH":
            if ema50 >= ema200 or self.bull_confirm_bars == 0:
                return "BULL"

        # 熊市: EMA21 BEARISH + EMA50 < EMA200 且持续 bear_confirm_bars 天
        if trend == "BEARISH" and len(df_valid) > 0 and self.bear_confirm_bars > 0:
            ema50_s = df_valid["ema50"]
            ema200_s = df_valid["ema200"]
            cond = ema50_s < ema200_s
            if len(cond) >= self.bear_confirm_bars and cond.tail(self.bear_confirm_bars).all():
                return "BEAR"

        return "NEUTRAL"

    # ========== ATR & 仓位 ==========

    def _calc_atr(self, klines: List[Dict], period: int) -> Optional[float]:
        if len(klines) < period + 2:
            return None
        highs = [k["high"] for k in klines[-(period + 1) :]]
        lows = [k["low"] for k in klines[-(period + 1) :]]
        closes = [k["close"] for k in klines[-(period + 1) :]]
        trs = []
        for i in range(1, len(highs)):
            tr = max(
                highs[i] - lows[i],
                abs(highs[i] - closes[i - 1]),
                abs(lows[i] - closes[i - 1]),
            )
            trs.append(tr)
        return float(np.mean(trs)) if trs else None

    def _dynamic_position_ratio(
        self,
        entry_price: float,
        stop_loss: float,
        max_risk_per_trade: float,
        leverage: float,
    ) -> float:
        """返回名义仓位占比 (0-1)。"""
        if entry_price <= 0 or stop_loss <= 0:
            return self.position_size

        risk_per_unit = abs(entry_price - stop_loss)
        if risk_per_unit <= 0:
            return self.position_size

        max_risk_amount = self.capital * max_risk_per_trade
        max_qty_by_risk = (max_risk_amount * leverage) / risk_per_unit

        base_qty = (self.capital * self.position_size * leverage) / entry_price
        qty = min(base_qty, max_qty_by_risk)

        notional_ratio = (qty * entry_price) / max(self.capital, 1e-8)
        notional_ratio = max(
            self.min_position_size, min(self.max_position_size, notional_ratio)
        )
        return notional_ratio

    # ========== analyze: Regime -> exit or entry ==========

    def analyze(self, klines: List[Dict]) -> Dict[str, Any]:
        """主入口：返回当前bar的交易信号。"""
        if len(klines) < self.ema_slow + 5:
            return {"signal": "hold", "reason": "数据不足"}

        last = klines[-1]
        current_price = float(last["close"])
        ts = last.get("timestamp") or last.get("time")

        if isinstance(ts, (int, float)):
            current_time = datetime.fromtimestamp(ts / 1000.0)
        elif isinstance(ts, datetime):
            current_time = ts
        else:
            # 没有时间信息时无法用日线与 Regime，只能退化成本地多空逻辑
            current_time = None

        # Regime 与日线趋势
        regime = None
        daily_trend = None
        if current_time is not None:
            daily_trend = self._get_daily_trend(current_time)
            regime = self._get_regime(current_time)

        # 有持仓: 优先处理出场
        if self.current_position is not None:
            exit_signal = self._check_exit_conditions(
                current_price, klines, daily_trend, regime
            )
            if exit_signal:
                return exit_signal
            return {
                "signal": "hold",
                "reason": f"持仓中 (regime={regime}, daily_trend={daily_trend})",
            }

        # 无持仓: Regime + 统一多空逻辑
        entry_signal = self._check_entry_conditions_unified(
            current_price, klines, daily_trend, regime
        )
        if entry_signal:
            return entry_signal

        return {
            "signal": "hold",
            "reason": f"等待信号 (regime={regime}, daily_trend={daily_trend})",
        }

    def _get_daily_trend(self, current_time: datetime) -> Optional[str]:
        """保留简单日线 EMA21 趋势定义，供日志参考/对比。"""
        if not self.use_daily_trend_filter or self.daily_data is None:
            return None

        current_date = current_time.date()
        df = self.daily_data

        row = df[df["date"] == current_date]
        if len(row) > 0:
            return str(row.iloc[0]["trend"])

        row = df[df["date"] <= current_date]
        if len(row) > 0:
            return str(row.iloc[-1]["trend"])

        return None

    # ========== 统一多空入场逻辑 ==========

    def _check_entry_conditions_unified(
        self,
        current_price: float,
        klines: List[Dict],
        daily_trend: Optional[str],
        regime: Optional[str],
    ) -> Optional[Dict[str, Any]]:
        closes = np.array([k["close"] for k in klines], dtype=float)
        ema_fast = self._calculate_ema(closes, self.ema_fast)
        ema_medium = self._calculate_ema(closes, self.ema_medium)
        ema_slow = self._calculate_ema(closes, self.ema_slow)

        if len(ema_slow) < 4:
            return None

        ctx = {
            "closes": closes,
            "ema_fast": ema_fast,
            "ema_medium": ema_medium,
            "ema_slow": ema_slow,
        }

        # 冷却期
        if self.reentry_cooldown and self.last_exit_index is not None:
            current_index = len(klines) - 1
            if current_index - self.last_exit_index < self.reentry_cooldown:
                return None

        # Regime 优先决定方向权限
        if regime == "BULL":
            if not self.allow_long:
                return None
            return self._check_long_entry_conditions(
                current_price, klines, daily_trend, regime, ctx, strict=False
            )

        if regime == "BEAR":
            if not self.allow_short:
                return None
            return self._check_short_entry_conditions(
                current_price, klines, daily_trend, regime, ctx, strict=False
            )

        # NEUTRAL or None
        if self.neutral_trade_mode == "no_trade":
            return None

        if self.neutral_trade_mode == "long_only_strict":
            if not self.allow_long:
                return None
            return self._check_long_entry_conditions(
                current_price, klines, daily_trend, "NEUTRAL", ctx, strict=True
            )

        if self.neutral_trade_mode == "both_strict":
            long_sig = (
                self._check_long_entry_conditions(
                    current_price, klines, daily_trend, "NEUTRAL", ctx, strict=True
                )
                if self.allow_long
                else None
            )
            if long_sig:
                return long_sig
            if self.allow_short:
                return self._check_short_entry_conditions(
                    current_price, klines, daily_trend, "NEUTRAL", ctx, strict=True
                )

        return None

    def _check_long_entry_conditions(
        self,
        current_price: float,
        klines: List[Dict],
        daily_trend: Optional[str],
        regime: Optional[str],
        ctx: Dict[str, Any],
        strict: bool = False,
    ) -> Optional[Dict[str, Any]]:
        closes = ctx["closes"]
        ema_fast = ctx["ema_fast"]
        ema_medium = ctx["ema_medium"]
        ema_slow = ctx["ema_slow"]

        current_ema_fast = ema_fast[-1]
        current_ema_medium = ema_medium[-1]
        current_ema_slow = ema_slow[-1]

        prev_price = closes[-2]
        prev_ema_medium = ema_medium[-2]

        # 多头排列
        is_bullish_alignment = current_ema_fast > current_ema_medium > current_ema_slow

        # 趋势强度过滤
        strong_bull = True
        if self.trend_strength_filter and len(ema_slow) >= 4:
            ema_slow_slope = (ema_slow[-1] - ema_slow[-4]) / max(ema_slow[-4], 1e-8)
            ema_band_dist = (current_ema_medium - current_ema_slow) / max(
                current_price, 1e-8
            )
            slope_thr = self.ema_slope_threshold * (1.5 if strict else 1.0)
            band_thr = self.ema_band_distance_min * (1.5 if strict else 1.0)
            strong_bull = ema_slow_slope > slope_thr and ema_band_dist > band_thr

        # 突破中轨
        price_cross_above = prev_price <= prev_ema_medium and current_price > current_ema_medium

        if not (price_cross_above and is_bullish_alignment and strong_bull):
            return None

        # Regime / 日线过滤：在显著熊市不做多
        if regime == "BEAR":
            return None
        if daily_trend == "BEARISH" and not strict:
            return None

        signal = self._create_long_signal(current_price, klines)
        rr = signal.get("rr")
        rr_min = self.min_rr_ratio * (1.2 if strict else 1.0)
        if rr is not None and rr < rr_min:
            return None

        logger.info(f"✓ 多头信号: regime={regime}, strict={strict}, rr={rr}")
        return signal

    def _check_short_entry_conditions(
        self,
        current_price: float,
        klines: List[Dict],
        daily_trend: Optional[str],
        regime: Optional[str],
        ctx: Dict[str, Any],
        strict: bool = False,
    ) -> Optional[Dict[str, Any]]:
        closes = ctx["closes"]
        ema_fast = ctx["ema_fast"]
        ema_medium = ctx["ema_medium"]
        ema_slow = ctx["ema_slow"]

        current_ema_fast = ema_fast[-1]
        current_ema_medium = ema_medium[-1]
        current_ema_slow = ema_slow[-1]

        prev_price = closes[-2]
        prev_ema_medium = ema_medium[-2]

        # 空头排列
        is_bearish_alignment = current_ema_fast < current_ema_medium < current_ema_slow

        # 趋势强度: 明确向下
        strong_bear = True
        if self.trend_strength_filter and len(ema_slow) >= 4:
            ema_slow_slope = (ema_slow[-1] - ema_slow[-4]) / max(ema_slow[-4], 1e-8)
            ema_band_dist = (current_ema_medium - current_ema_slow) / max(
                current_price, 1e-8
            )
            slope_thr = self.ema_slope_threshold * (1.5 if strict else 1.0)
            band_thr = self.ema_band_distance_min * (1.5 if strict else 1.0)
            strong_bear = ema_slow_slope < -slope_thr and ema_band_dist < -band_thr

        # 跌破中轨
        price_cross_below = prev_price >= prev_ema_medium and current_price < current_ema_medium

        if not (price_cross_below and is_bearish_alignment and strong_bear):
            return None

        # Regime 授权: 默认仅 BEAR 或严格 NEUTRAL+strict 可开空
        if regime != "BEAR":
            if not (strict and regime in ("NEUTRAL", None)):
                return None

        # 日线为强牛时避免做空（除非 strict 特判）
        if daily_trend == "BULLISH" and not strict:
            return None

        # 位置过滤：避免极端低位追空
        recent_lows = [k["low"] for k in (klines[-50:] if len(klines) >= 50 else klines)]
        if recent_lows:
            recent_low = min(recent_lows)
            if recent_low > 0:
                dist = (current_price - recent_low) / recent_low
                if dist < self.min_distance_from_low:
                    return None

        signal = self._create_short_signal(current_price, klines)
        # 调整空头风险参数
        signal["leverage"] = min(signal.get("leverage", self.leverage_short), self.leverage_short)

        rr = signal.get("rr")
        rr_min = self.min_rr_ratio_short * (1.2 if strict else 1.0)
        if rr is not None and rr < rr_min:
            return None

        logger.info(f"✓ 空头信号: regime={regime}, strict={strict}, rr={rr}")
        return signal

    # ========== 信号构造 ==========

    def _create_long_signal(self, price: float, klines: List[Dict]) -> Dict[str, Any]:
        # 止损
        if self.use_atr_stop:
            atr = self._calc_atr(klines, self.atr_period)
            if atr:
                stop_loss = max(
                    price - self.atr_stop_multiplier * atr,
                    price * (1 - self.stop_loss_pct),
                )
            else:
                stop_loss = price * (1 - self.stop_loss_pct)
        else:
            stop_loss = price * (1 - self.stop_loss_pct)

        # 止盈
        if self.use_atr_stop:
            atr = self._calc_atr(klines, self.atr_period)
            if atr:
                take_profit = max(
                    price + self.atr_tp_multiplier * atr,
                    price * (1 + self.take_profit_pct),
                )
            else:
                take_profit = price * (1 + self.take_profit_pct)
        else:
            take_profit = price * (1 + self.take_profit_pct)

        # 仓位
        if self.use_volatility_position_sizing:
            notional_ratio = self._dynamic_position_ratio(
                price, stop_loss, self.max_risk_per_trade, self.leverage
            )
        else:
            notional_ratio = self.position_size

        amount = (self.capital * notional_ratio * self.leverage) / max(price, 1e-8)

        rr = None
        if stop_loss and take_profit and price > 0:
            risk = price - stop_loss
            reward = take_profit - price
            if risk > 0:
                rr = reward / risk

        return {
            "signal": "buy",
            "type": "entry",
            "side": "LONG",
            "price": price,
            "amount": amount,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "reason": "统一多空: 多头条件满足(EMA多头排列+Regime允许)",
            "leverage": self.leverage,
            "rr": rr,
        }

    def _create_short_signal(self, price: float, klines: List[Dict]) -> Dict[str, Any]:
        if self.use_atr_stop:
            atr = self._calc_atr(klines, self.atr_period)
            if atr:
                stop_loss = min(
                    price + self.atr_stop_multiplier * atr,
                    price * (1 + self.stop_loss_pct),
                )
            else:
                stop_loss = price * (1 + self.stop_loss_pct)
        else:
            stop_loss = price * (1 + self.stop_loss_pct)

        if self.use_atr_stop:
            atr = self._calc_atr(klines, self.atr_period)
            if atr:
                take_profit = min(
                    price - self.atr_tp_multiplier * atr,
                    price * (1 - self.take_profit_pct),
                )
            else:
                take_profit = price * (1 - self.take_profit_pct)
        else:
            take_profit = price * (1 - self.take_profit_pct)

        # 使用空头专用风险参数
        if self.use_volatility_position_sizing:
            notional_ratio = self._dynamic_position_ratio(
                price, stop_loss, self.max_risk_per_trade_short, self.leverage_short
            )
        else:
            notional_ratio = self.position_size

        amount = (self.capital * notional_ratio * self.leverage_short) / max(price, 1e-8)

        rr = None
        if stop_loss and take_profit and price > 0:
            risk = stop_loss - price
            reward = price - take_profit
            if risk > 0:
                rr = reward / risk

        return {
            "signal": "sell",
            "type": "entry",
            "side": "SHORT",
            "price": price,
            "amount": amount,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "reason": "统一多空: 空头条件满足(EMA空头排列+Regime允许)",
            "leverage": self.leverage_short,
            "rr": rr,
        }

    # ========== 出场与状态 ==========

    def _check_exit_conditions(
        self,
        current_price: float,
        klines: List[Dict],
        daily_trend: Optional[str],
        regime: Optional[str],
    ) -> Optional[Dict[str, Any]]:
        if not self.current_position or self.entry_price is None:
            return None

        side = self.current_position.get("side", "LONG")

        # 最高/最低价更新（用于追踪止损）
        if side == "LONG":
            if self.highest_price is None or current_price > self.highest_price:
                self.highest_price = current_price
        else:
            if self.highest_price is None or current_price < self.highest_price:
                self.highest_price = current_price

        # 盈亏比例
        if side == "LONG":
            pnl_pct = (current_price - self.entry_price) / max(
                self.entry_price, 1e-8
            )
        else:
            pnl_pct = (self.entry_price - current_price) / max(
                self.entry_price, 1e-8
            )

        # 固定止损
        if pnl_pct <= -self.stop_loss_pct:
            return self._create_exit_signal("stop_loss")

        # 部分止盈
        if (
            self.partial_take_profit_pct > 0
            and not self.partial_closed
            and pnl_pct >= self.partial_take_profit_pct
        ):
            self.partial_closed = True
            return self._create_exit_signal(
                "partial_take_profit", partial=True, exit_ratio=0.5
            )

        # 全部止盈
        if pnl_pct >= self.take_profit_pct:
            return self._create_exit_signal("take_profit")

        # 追踪止损
        if (
            self.use_trailing_stop
            and pnl_pct >= self.trailing_stop_activation
            and self.highest_price is not None
        ):
            if side == "LONG":
                trailing = self.highest_price * (1 - self.trailing_stop_distance)
                if current_price <= trailing:
                    return self._create_exit_signal("trailing_stop")
            else:
                trailing = self.highest_price * (1 + self.trailing_stop_distance)
                if current_price >= trailing:
                    return self._create_exit_signal("trailing_stop")

        # Regime Flip 保护性平仓
        if self.exit_on_regime_flip and regime is not None:
            if side == "LONG" and regime == "BEAR":
                return self._create_exit_signal("regime_flip")
            if side == "SHORT" and regime == "BULL":
                return self._create_exit_signal("regime_flip")

        # 可选: 使用日线 simple trend 作为兜底
        if daily_trend:
            if side == "LONG" and daily_trend == "BEARISH":
                return self._create_exit_signal("trend_reversal")
            if side == "SHORT" and daily_trend == "BULLISH":
                return self._create_exit_signal("trend_reversal")

        return None

    def _create_exit_signal(
        self, exit_type: str, partial: bool = False, exit_ratio: float = 1.0
    ) -> Dict[str, Any]:
        exit_ratio = max(0.0, min(1.0, exit_ratio))
        return {
            "signal": "close",
            "type": exit_type,
            "reason": exit_type,
            "partial": partial,
            "exit_ratio": exit_ratio,
        }

    # ========== 回测引擎接口 (兼容原实现) ==========

    def update_position(self, signal: Dict[str, Any]) -> None:
        if signal.get("signal") in ("buy", "sell"):
            self.current_position = signal
            self.entry_price = float(signal.get("price", 0.0))
            self.partial_closed = False
            self.highest_price = self.entry_price

    def record_trade(self, signal: Dict[str, Any]) -> None:
        if signal.get("partial"):
            self.partial_closed = True
            return

        if signal.get("signal") == "close":
            pnl = float(signal.get("pnl_amount", 0.0))
            self.total_trades += 1
            if pnl > 0:
                self.winning_trades += 1

            if self.use_dynamic_leverage:
                self._adjust_leverage(pnl)

            self.current_position = None
            self.entry_price = None
            self.partial_closed = False
            self.highest_price = None

            if "bar_index" in signal:
                self.last_exit_index = int(signal["bar_index"])

    def _adjust_leverage(self, pnl: float) -> None:
        old = self.leverage
        if pnl > 0:
            self.leverage = min(
                self.leverage + self.leverage_increase_step, self.max_leverage
            )
        else:
            self.leverage = max(
                self.leverage - self.leverage_decrease_step, self.min_leverage
            )
        if self.leverage != old:
            logger.info(
                f"[UnifiedRegime] 杠杆调整: {old:.2f}x -> {self.leverage:.2f}x, pnl={pnl:.4f}"
            )

    def on_trade(self, trade: Dict[str, Any]) -> None:
        if trade.get("type") == "entry":
            self.current_position = trade
            self.entry_price = float(trade.get("price", 0.0))
            self.partial_closed = False
            self.highest_price = self.entry_price
            self.total_trades += 1
            return

        if trade.get("type") in {
            "stop_loss",
            "take_profit",
            "partial_take_profit",
            "trailing_stop",
            "trend_reversal",
            "regime_flip",
            "force_close",
        }:
            pnl = float(trade.get("pnl_amount", 0.0))

            if trade.get("partial"):
                logger.info(
                    f"[UnifiedRegime] 部分平仓: type={trade.get('type')}, pnl={pnl:.4f}"
                )
                self.partial_closed = True
                return

            if pnl > 0:
                self.winning_trades += 1

            if self.use_dynamic_leverage:
                self._adjust_leverage(pnl)

            self.current_position = None
            self.entry_price = None
            self.partial_closed = False
            self.highest_price = None

            if "bar_index" in trade:
                self.last_exit_index = int(trade["bar_index"])