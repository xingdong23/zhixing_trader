"""
交易策略模块统一注册点

约定：
- 每个策略实现一个清晰的策略类（如 XxxStrategy）
- 在此文件集中导出，并登记到 STRATEGY_REGISTRY
- 回测和实盘通过字符串名称引用策略，避免在核心入口硬编码各个策略路径
"""

# 基础与趋势类策略
from .high_frequency import HighFrequencyScalpingStrategy
from .intraday_scalping import IntradayScalpingStrategy
from .trend_momentum import TrendMomentumStrategy
from .trend_following import TrendFollowingStrategy
from .trend_breakout import TrendBreakoutStrategy

# 均线与波动类策略
from .ema_crossover import EMACrossoverStrategy
from .ema144_trend import EMA144TrendStrategy
from .bollinger_bands import BollingerBandsStrategy
from .ema_rsi_volume import EMARSIVolumeStrategy
from .compression_expansion import CompressionExpansionStrategy
from .triple_ma import TripleMAStrategy
from .williams_volatility_breakout import WilliamsVolatilityBreakoutStrategy

# 网格与概率类策略
from .grid_trading import GridTradingStrategy
from .probability_profit import ProbabilityProfitStrategy

# EMA Simple Trend 系列
from .ema_simple_trend import EMASimpleTrendStrategy
from .ema_simple_trend.strategy_multiframe import EMASimpleTrendMultiframeStrategy
from .ema_simple_trend.strategy_multiframe_unified_regime import EMASimpleTrendMultiframeUnifiedRegimeStrategy

# RSI 2-Day 系列
from .rsi_2day.strategy import RSI2DayStrategy
from .rsi_2day.strategy_adaptive import AdaptiveRSI2DayStrategy

# 形态/突破类策略
from .nr7_breakout import NR7BreakoutStrategy
from .false_breakout import FalseBreakoutStrategy

# 熊市/特殊 regime 策略
from .bear_trend_enhanced.strategy_bear_regime import BearTrendRegimeStrategy


__all__ = [
    # 基础
    'HighFrequencyScalpingStrategy',
    'IntradayScalpingStrategy',
    'TrendMomentumStrategy',
    'TrendFollowingStrategy',
    'TrendBreakoutStrategy',

    # 均线与波动
    'EMACrossoverStrategy',
    'EMA144TrendStrategy',
    'BollingerBandsStrategy',
    'EMARSIVolumeStrategy',
    'CompressionExpansionStrategy',
    'TripleMAStrategy',
    'WilliamsVolatilityBreakoutStrategy',

    # 网格/概率
    'GridTradingStrategy',
    'ProbabilityProfitStrategy',

    # EMA Simple Trend
    'EMASimpleTrendStrategy',
    'EMASimpleTrendMultiframeStrategy',
    'EMASimpleTrendMultiframeUnifiedRegimeStrategy',

    # RSI 2-Day
    'RSI2DayStrategy',
    'AdaptiveRSI2DayStrategy',

    # 形态/突破
    'NR7BreakoutStrategy',
    'FalseBreakoutStrategy',

    # Regime
    'BearTrendRegimeStrategy',
]

# 统一策略注册表（回测 / 实盘通过名字调用）
STRATEGY_REGISTRY = {
    # 高频与动量
    'high_frequency': HighFrequencyScalpingStrategy,
    'intraday_scalping': IntradayScalpingStrategy,
    'trend_momentum': TrendMomentumStrategy,

    # 趋势
    'trend_following': TrendFollowingStrategy,
    'trend_breakout': TrendBreakoutStrategy,

    # 均线&波动
    'ema_crossover': EMACrossoverStrategy,
    'ema144_trend': EMA144TrendStrategy,
    'bollinger_bands': BollingerBandsStrategy,
    'ema_rsi_volume': EMARSIVolumeStrategy,
    'compression_expansion': CompressionExpansionStrategy,
    'triple_ma': TripleMAStrategy,
    'williams_volatility_breakout': WilliamsVolatilityBreakoutStrategy,

    # 网格&概率
    'grid_trading': GridTradingStrategy,
    'probability_profit': ProbabilityProfitStrategy,

    # EMA Simple Trend 系列
    'ema_simple_trend': EMASimpleTrendStrategy,
    'ema_simple_trend_multiframe': EMASimpleTrendMultiframeStrategy,
    'ema_simple_trend_unified_regime': EMASimpleTrendMultiframeUnifiedRegimeStrategy,

    # RSI 2-Day 系列
    'rsi_2day': RSI2DayStrategy,
    'rsi_2day_adaptive': AdaptiveRSI2DayStrategy,

    # 形态/突破
    'nr7_breakout': NR7BreakoutStrategy,
    'false_breakout': FalseBreakoutStrategy,

    # 熊市/Regime
    'bear_trend_regime': BearTrendRegimeStrategy,
}


def get_strategy_class(name: str):
    """
    根据名称获取策略类。
    所有调用方统一通过此函数获取，避免在入口到处硬编码 import。
    """
    try:
        return STRATEGY_REGISTRY[name]
    except KeyError:
        raise ValueError(f"未知的策略名称: {name}. 可用策略: {sorted(STRATEGY_REGISTRY.keys())}")
