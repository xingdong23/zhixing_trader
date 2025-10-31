"""
EMA简单趋势策略 (EMA Simple Trend Strategy)
使用 EMA9/21/55，价格站上EMA21做多，跌破做空
"""

from .strategy import EMASimpleTrendStrategy

__all__ = ['EMASimpleTrendStrategy']



