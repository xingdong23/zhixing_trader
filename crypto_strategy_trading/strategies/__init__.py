"""
交易策略模块统一注册点

约定：
- 每个策略实现一个清晰的策略类（如 XxxStrategy）
- 在此文件集中导出，并登记到 STRATEGY_REGISTRY
- 回测和实盘通过字符串名称引用策略，避免在核心入口硬编码各个策略路径
"""

# 基础与趋势类策略
# from crypto_strategy_trading.strategies.backup.high_frequency import HighFrequencyScalpingStrategy
# from crypto_strategy_trading.strategies.backup.intraday_scalping import IntradayScalpingStrategy
# from crypto_strategy_trading.strategies.backup.intraday_trend_rr import IntradayTrendRRStrategy
# from crypto_strategy_trading.strategies.backup.intraday_mean_reversion import IntradayMeanReversionStrategy
# from crypto_strategy_trading.strategies.backup.trend_momentum import TrendMomentumStrategy
# from crypto_strategy_trading.strategies.backup.trend_following import TrendFollowingStrategy
# from crypto_strategy_trading.strategies.backup.trend_breakout import TrendBreakoutStrategy

# 均线与波动类策略
# from crypto_strategy_trading.strategies.backup.ema_crossover import EMACrossoverStrategy
# from crypto_strategy_trading.strategies.backup.ema144_trend import EMA144TrendStrategy
# from crypto_strategy_trading.strategies.backup.bollinger_bands import BollingerBandsStrategy
# from crypto_strategy_trading.strategies.backup.ema_rsi_volume import EMARSIVolumeStrategy
# from crypto_strategy_trading.strategies.backup.compression_expansion import CompressionExpansionStrategy
# from crypto_strategy_trading.strategies.backup.triple_ma import TripleMAStrategy
# from crypto_strategy_trading.strategies.backup.williams_volatility_breakout import WilliamsVolatilityBreakoutStrategy

# 网格与概率类策略
# from crypto_strategy_trading.strategies.backup.grid_trading import GridTradingStrategy
# from crypto_strategy_trading.strategies.backup.probability_profit import ProbabilityProfitStrategy

# EMA Simple Trend 系列
# from crypto_strategy_trading.strategies.backup.ema_simple_trend import EMASimpleTrendStrategy
# from crypto_strategy_trading.strategies.backup.ema_simple_trend import EMASimpleTrendMultiframeStrategy

# RSI 2-Day 系列
# from crypto_strategy_trading.strategies.backup.rsi_2day.strategy import RSI2DayStrategy
# from crypto_strategy_trading.strategies.backup.rsi_2day.strategy_adaptive import AdaptiveRSI2DayStrategy

# 形态/突破类策略
# from crypto_strategy_trading.strategies.backup.nr7_breakout import NR7BreakoutStrategy
# from crypto_strategy_trading.strategies.backup.false_breakout import FalseBreakoutStrategy
# from crypto_strategy_trading.strategies.backup.candlestick_patterns import CandlestickPatternStrategy

# 熊市/特殊 regime 策略
# from crypto_strategy_trading.strategies.backup.bear_trend_enhanced.strategy_bear_regime import BearTrendRegimeStrategy
# 南瓜汤策略 (PSMI)
from .pumpkin_soup import PumpkinSoupStrategy

# 套利策略
# from crypto_strategy_trading.strategies.backup.funding_arbitrage import FundingArbitrageStrategy

# 彩票式策略
# from crypto_strategy_trading.strategies.backup.lottery_scalping import LotteryScalpingStrategy

# Alpha Mining
# from .alpha.alpha_mining_demo.strategy import AlphaMiningDemoStrategy
# from .alpha.auto_alpha_20251204_102816.strategy import AutoAlpha20251204102816
# from .alpha.auto_alpha_20251204_102822.strategy import AutoAlpha20251204102822
# from .alpha.auto_alpha_20251204_102829.strategy import AutoAlpha20251204102829
# from .alpha.auto_alpha_20251204_102835.strategy import AutoAlpha20251204102835
from .ai_gambler.strategy import AiGamblerStrategy
from .vwap_mean_reversion.strategy import VwapMeanReversionStrategy
# from .alpha.auto_alpha_20251204_102842.strategy import AutoAlpha20251204102842
# from .alpha.auto_alpha_20251204_102849.strategy import AutoAlpha20251204102849
# from .alpha.auto_alpha_20251204_102855.strategy import AutoAlpha20251204102855
# from .alpha.auto_alpha_20251204_102902.strategy import AutoAlpha20251204102902
# from .alpha.auto_alpha_20251204_102909.strategy import AutoAlpha20251204102909
# from .alpha.auto_alpha_20251204_102915.strategy import AutoAlpha20251204102915
# from .alpha.auto_alpha_20251204_102922.strategy import AutoAlpha20251204102922
# from .alpha.auto_alpha_20251204_102929.strategy import AutoAlpha20251204102929
# from .alpha.auto_alpha_20251204_111517.strategy import AutoAlpha20251204111517
# from .alpha.auto_alpha_20251204_111525.strategy import AutoAlpha20251204111525
# from .alpha.auto_alpha_20251204_111532.strategy import AutoAlpha20251204111532
# from .alpha.auto_alpha_20251204_111539.strategy import AutoAlpha20251204111539
# from .alpha.auto_alpha_20251204_111546.strategy import AutoAlpha20251204111546
# from .alpha.auto_alpha_20251204_111553.strategy import AutoAlpha20251204111553
# from .alpha.auto_alpha_20251204_111600.strategy import AutoAlpha20251204111600
# from .alpha.auto_alpha_20251204_111607.strategy import AutoAlpha20251204111607
# from .alpha.auto_alpha_20251204_111614.strategy import AutoAlpha20251204111614
# from .alpha.auto_alpha_20251204_111621.strategy import AutoAlpha20251204111621
# from .alpha.auto_alpha_20251204_111628.strategy import AutoAlpha20251204111628
# from .alpha.auto_alpha_20251204_111635.strategy import AutoAlpha20251204111635


__all__ = [
    # 基础
    'HighFrequencyScalpingStrategy',
    'IntradayScalpingStrategy',
    'IntradayTrendRRStrategy',
    'IntradayMeanReversionStrategy',
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

    # RSI 2-Day
    'RSI2DayStrategy',
    'AdaptiveRSI2DayStrategy',

    # 形态/突破
    'NR7BreakoutStrategy',
    'FalseBreakoutStrategy',
    'CandlestickPatternStrategy',

    # Regime
    'BearTrendRegimeStrategy',

    # 南瓜汤
    'PumpkinSoupStrategy',
    
    # 套利
    'FundingArbitrageStrategy',
    
    # 彩票式
    'LotteryScalpingStrategy',
    'VwapMeanReversionStrategy',
]

# 统一策略注册表（回测 / 实盘通过名字调用）
# 统一策略注册表（回测 / 实盘通过名字调用）
STRATEGY_REGISTRY = {
    # 高频与动量
    # 'high_frequency': HighFrequencyScalpingStrategy,
    # 'intraday_scalping': IntradayScalpingStrategy,
    # 'intraday_trend_rr': IntradayTrendRRStrategy,
    # 'intraday_mean_reversion': IntradayMeanReversionStrategy,
    # 'trend_momentum': TrendMomentumStrategy,

    # 趋势
    # 'trend_following': TrendFollowingStrategy,
    # 'trend_breakout': TrendBreakoutStrategy,

    # 均线&波动
    # 'ema_crossover': EMACrossoverStrategy,
    # 'ema144_trend': EMA144TrendStrategy,
    # 'bollinger_bands': BollingerBandsStrategy,
    # 'ema_rsi_volume': EMARSIVolumeStrategy,
    # 'compression_expansion': CompressionExpansionStrategy,
    # 'triple_ma': TripleMAStrategy,
    # 'williams_volatility_breakout': WilliamsVolatilityBreakoutStrategy,

    # 网格&概率
    # 'grid_trading': GridTradingStrategy,
    # 'probability_profit': ProbabilityProfitStrategy,

    # EMA Simple Trend 系列
    # 'ema_simple_trend': EMASimpleTrendStrategy,
    # 'ema_simple_trend_multiframe': EMASimpleTrendMultiframeStrategy,

    # RSI 2-Day 系列
    # 'rsi_2day': RSI2DayStrategy,
    # 'rsi_2day_adaptive': AdaptiveRSI2DayStrategy,

    # 形态/突破
    # 'nr7_breakout': NR7BreakoutStrategy,
    # 'false_breakout': FalseBreakoutStrategy,
    # 'candlestick_pattern': CandlestickPatternStrategy,

    # 熊市/Regime
    # 'bear_trend_regime': BearTrendRegimeStrategy,
    
    # 南瓜汤
    'pumpkin_soup': PumpkinSoupStrategy,

    # 套利
    # 'funding_arbitrage': FundingArbitrageStrategy,
    
    # 彩票式
    # 'lottery_scalping': LotteryScalpingStrategy,

    # Alpha Mining
    # ... (already commented out)
    
    # AI Gambler
    'ai_gambler': AiGamblerStrategy,
    'vwap_mean_reversion': VwapMeanReversionStrategy,
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
