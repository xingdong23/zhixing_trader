"""
Bear trend enhanced strategy module.

说明：
- 不修改已有 ema_simple_trend_multiframe 源码；
- 本策略只在熊市 / 空头趋势环境下启用；
- 通过更大级别周期(日线/周线)识别 BEAR regime；
- 在 BEAR 中按独立规则寻找交易机会（默认设计为：熊市中的高质量反弹多头，后续可扩展安全做空）。
"""

from dataclasses import dataclass
from typing import Dict, Any, Optional
import pandas as pd
import numpy as np


@dataclass
class BearRegimeConfig:
    # 大级别数据
    daily_data_file: str = "backtest/data/ETHUSDT-1d-ALL.csv"
    # 熊市判定参数
    bear_ema_fast: int = 50
    bear_ema_slow: int = 200
    bear_confirm_bars: int = 5
    # 入场过滤参数（熊市中的反弹机会）
    pullback_min_drop_pct: float = 0.12  # 近段跌幅至少 12%
    pullback_rebound_trigger_pct: float = 0.03  # 出现 >=3% 反弹确认
    # 资金&风控（独立于主策略，可单独限制风险敞口）
    max_risk_per_trade: float = 0.005
    max_concurrent_positions: int = 1


class BearTrendRegimeStrategy:
    """
    熊市增强策略（骨架版）：
    - 供回测框架调用时与主策略并行存在；
    - 仅在 is_bear_regime 为 True 的区间评估信号；
    - 核心逻辑：先用日线 EMA 定义 regime，再在 1h 级别寻找“超跌后结构性反弹”机会。
    """

    def __init__(self, parameters: Dict[str, Any]):
        self.config = BearRegimeConfig(**parameters.get("bear_regime", {}))
        self.daily_trend: Optional[pd.DataFrame] = None
        self.is_bear_regime = False
        self.positions = []
        self.current_risk_exposure = 0.0

    def load_daily_trend(self):
        path = self.config.daily_data_file
        if not os.path.exists(path):
            print(f"[BearRegime] 日线数据文件不存在: {path}，熊市策略禁用")
            self.daily_trend = None
            self.is_bear_regime = False
            return

        df = pd.read_csv(path)
        if "open_time" not in df.columns:
            print(f"[BearRegime] 日线数据缺少 open_time: {path}")
            self.daily_trend = None
            self.is_bear_regime = False
            return

        df["datetime"] = pd.to_datetime(df["open_time"], unit="ms")
        df = df.set_index("datetime").sort_index()
        df["ema_fast"] = df["close"].ewm(span=self.config.bear_ema_fast, adjust=False).mean()
        df["ema_slow"] = df["close"].ewm(span=self.config.bear_ema_slow, adjust=False).mean()
        df["bear_flag"] = (df["ema_fast"] < df["ema_slow"]).astype(int)
        df["bear_run"] = df["bear_flag"] * (df["bear_flag"].groupby((df["bear_flag"] != df["bear_flag"].shift()).cumsum()).cumcount() + 1)
        # 连续 bear_confirm_bars 根都在快线<慢线，则认为进入熊市
        df["is_bear_regime"] = df["bear_run"] >= self.config.bear_confirm_bars
        self.daily_trend = df
        self.is_bear_regime = bool(df["is_bear_regime"].iloc[-1])

    def on_bar(self, bar: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        被回测引擎按 1h K 线调用的信号入口（示意接口，不与现有引擎强绑定，仅提供结构）.
        返回:
            { "action": "open_long"/"close_long"/None, ... }
        """
        if self.daily_trend is None:
            return None

        ts = pd.to_datetime(bar["open_time"], unit="ms")
        # 对齐日线 regime
        day = ts.normalize()
        if day not in self.daily_trend.index:
            return None

        row = self.daily_trend.loc[day]
        if not bool(row.get("is_bear_regime", False)):
            # 非熊市区间，本策略不出手
            return None

        # 简化版熊市反弹逻辑（占位，可后续细化）:
        # 条件示例：
        # 1. 当前价格相对最近 N 日高点有较大跌幅（超跌）
        # 2. 出现反转 K 线（这里用价格较前几根有明显反弹）
        price = float(bar["close"])
        window = self.daily_trend.loc[:day].tail(20)
        if len(window) < 10:
            return None

        recent_max = window["close"].max()
        drop_pct = (recent_max - price) / recent_max if recent_max > 0 else 0.0

        if drop_pct < self.config.pullback_min_drop_pct:
            return None

        # 触发反弹信号（可以结合 1h EMA/实体放量等，这里先留骨架）
        # 示例：当小时收盘较当日低点反弹 >= pullback_rebound_trigger_pct
        day_lows = window["low"]
        recent_low = day_lows.min()
        if recent_low > 0 and (price - recent_low) / recent_low >= self.config.pullback_rebound_trigger_pct:
            return {
                "action": "open_long",
                "reason": "bear_regime_rebound",
                "price": price,
                "risk_fraction": self.config.max_risk_per_trade
            }

        return None
